/* ============================================================================
   aparcamientos-viaje.js. APARCAMIENTOS + PLANIFICADOR DE VIAJE de Manolit∞
   (ADITIVO, 07-oct-2026, orden directa de Sandro: TODO en UN solo archivo)
   ----------------------------------------------------------------------------
   - Nada de lo existente se toca. Este módulo se engancha al mapa por el
     hook público window.manolitAireMap (el mismo que usa arboles-3d.js) y
     los dos bloques se hablan por API pública y CustomEvents.
   - BLOQUE 1, aparcamientos: Overpass (amenity=parking) por el proxy
     same-origin /aparcamientos del worker, SIEMPRE por el bbox visible
     (lado máximo 3 km, nunca la ciudad entera). Clasificación por
     etiquetas OSM con cinco colores: parking=surface|multi-storey|
     underground, access=public|private|customers, fee=yes|no. Caché
     ligera en cliente por celda (30 min). Si el motor de sombras está
     encendido, los parkings cubiertos por un polígono de la fuente
     'sombras' llevan anillo teal (lectura solamente, jamás escritura).
   - BLOQUE 2, viaje largo: origen y destino con ciudades lejanas por el
     proxy /geo (Nominatim), tramo de carretera por OSRM perfil coche en
     el proxy /ruta-coche/ (servidor FOSSGIS), SIN cálculo de sombra en
     carretera. Primero se encuadra la ruta entera para que se vea, y a
     los pocos segundos la llegada centra el destino, enciende la capa de
     aparcamientos y, si estaba apagado, enciende el motor de sombras.
   - APIs públicas:
       window.manolitoParking .alternar() .activar() .desactivar()
                              .estaActivo() .activarEn(lat, lon)
       window.manolitoViaje   .planificar(origen, destino) .limpiar()
     Eventos aceptados: 'manolito:activar-parking' (detail {lat, lon}?),
     'manolito:planificar-viaje' (detail {origen, destino}).
     Evento emitido: 'manolito:parking-cambiado' (detail {activo}).
   - Licencia: AGPL-3.0 como el resto del proyecto.
   ========================================================================== */
(function () {
  'use strict';

  if (window.__manolitoParkingViaje) return; // doble carga: jamás
  window.__manolitoParkingViaje = true;

  var CONFIG = {
    overpassUrl: '/aparcamientos',
    osrmCocheUrl: '/ruta-coche',
    geoUrl: '/geo',
    timeoutS: 15,
    timeoutViajeMs: 20000,
    esperaMoveendMs: 700,
    esperaSombraMs: 900,
    esperaLlegadaMs: 2600,
    maxLadoConsultaKm: 3,
    cacheCeldasGrados: 0.01,
    cacheClienteMs: 30 * 60 * 1000,
    maxPuntos: 300,
    zoomLlegada: 14.5,
  };

  // Colores por combinación tipo/acceso/precio. Pensados para leerse igual
  // de bien en mapa claro, IGN y mapa oscuro.
  var COLORES = {
    superficieGratis: '#2E9E5B', // verde
    superficiePago: '#E0A32E',   // ámbar
    cubierto: '#3E7CB1',         // azul
    subterraneo: '#7C6BD6',      // violeta
    restringido: '#8A939E',      // gris (privado o solo clientes)
  };
  var COLOR_SOMBRA = '#0C7F8D'; // teal Manolit∞, el anillo de sombra

  var map = null;

  /* ---------------- Utilidades compartidas -------------------------------- */
  function t(clave, fallback) {
    try {
      var fn = window.getMessages;
      if (typeof fn === 'function') {
        var msg = fn();
        if (msg && msg[clave] != null) return msg[clave];
      }
    } catch (e) { /* seguimos con el fallback */ }
    return fallback != null ? fallback : clave;
  }

  function escaparHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function estiloListo() {
    try { return !map.isStyleLoaded || map.isStyleLoaded(); } catch (e) { return false; }
  }

  /* ==========================================================================
     BLOQUE 1. APARCAMIENTOS
     ========================================================================== */
  var parking = {
    activo: false,
    btn: null,
    cache: new Map(), // clave celda → { ts, geojson }
    peticion: null,
    temporizadorMove: null,
    temporizadorSombra: null,
    popup: null,
  };

  function clasificarParking(tags) {
    tags = tags || {};
    var tipo = 'superficie';
    if (tags.parking === 'underground') tipo = 'subterraneo';
    else if (tags.parking === 'multi-storey' || tags.parking === 'shed' || tags.parking === 'carports') tipo = 'cubierto';

    var acceso = 'publico';
    if (tags.access === 'private' || tags.access === 'no') acceso = 'privado';
    else if (tags.access === 'customers' || tags.access === 'permissive') acceso = 'clientes';

    var precio = 'desconocido';
    if (tags.fee === 'yes') precio = 'pago';
    else if (tags.fee === 'no') precio = 'gratis';

    var color;
    if (acceso !== 'publico') color = COLORES.restringido;
    else if (tipo === 'subterraneo') color = COLORES.subterraneo;
    else if (tipo === 'cubierto') color = COLORES.cubierto;
    else color = (precio === 'gratis') ? COLORES.superficieGratis : COLORES.superficiePago;

    return { tipo: tipo, acceso: acceso, precio: precio, color: color };
  }

  function textoTipo(tipo) {
    if (tipo === 'subterraneo') return t('parkingTypeUnderground', 'Subterráneo');
    if (tipo === 'cubierto') return t('parkingTypeCovered', 'Cubierto');
    return t('parkingTypeSurface', 'En la calle');
  }
  function textoAcceso(acceso) {
    if (acceso === 'privado') return t('parkingAccessPrivate', 'Privado');
    if (acceso === 'clientes') return t('parkingAccessCustomers', 'Solo clientes');
    return t('parkingAccessPublic', 'Público');
  }
  function textoPrecio(precio) {
    if (precio === 'pago') return t('parkingFeeYes', 'De pago');
    if (precio === 'gratis') return t('parkingFeeNo', 'Gratis');
    return t('parkingFeeUnknown', 'Precio sin dato');
  }

  function overpassAGeojson(datos) {
    var features = [];
    var elementos = (datos && Array.isArray(datos.elements)) ? datos.elements : [];
    for (var i = 0; i < elementos.length && features.length < CONFIG.maxPuntos; i++) {
      var el = elementos[i];
      var lat = el.lat, lon = el.lon;
      if (lat == null && el.center) { lat = el.center.lat; lon = el.center.lon; }
      if (!isFinite(lat) || !isFinite(lon)) continue;
      var c = clasificarParking(el.tags);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          osmId: el.type + '/' + el.id,
          nombre: (el.tags && el.tags.name) || t('parkingName', 'Aparcamiento'),
          tipo: c.tipo,
          acceso: c.acceso,
          precio: c.precio,
          color: c.color,
          capacidad: (el.tags && el.tags.capacity) || '',
          sombra: false,
        },
      });
    }
    return { type: 'FeatureCollection', features: features };
  }

  function bboxConsulta() {
    var b = map.getBounds();
    var sur = b.getSouth(), oeste = b.getWest(), norte = b.getNorth(), este = b.getEast();
    var centro = map.getCenter();
    var maxGradosLat = CONFIG.maxLadoConsultaKm / 111;
    var maxGradosLon = CONFIG.maxLadoConsultaKm / (111 * Math.max(0.2, Math.cos(centro.lat * Math.PI / 180)));
    if (norte - sur > maxGradosLat) { sur = centro.lat - maxGradosLat / 2; norte = centro.lat + maxGradosLat / 2; }
    if (este - oeste > maxGradosLon) { oeste = centro.lng - maxGradosLon / 2; este = centro.lng + maxGradosLon / 2; }
    return [sur, oeste, norte, este];
  }

  function claveCelda(bbox) {
    var c = CONFIG.cacheCeldasGrados;
    return bbox.map(function (n) { return (Math.round(n / c) * c).toFixed(3); }).join(',');
  }

  async function descargarAparcamientos() {
    if (!parking.activo || !map) return;
    var bbox = bboxConsulta();
    var clave = claveCelda(bbox);

    var enCache = parking.cache.get(clave);
    if (enCache && Date.now() - enCache.ts < CONFIG.cacheClienteMs) {
      pintarAparcamientos(enCache.geojson);
      return;
    }

    if (parking.peticion) { try { parking.peticion.abort(); } catch (e) { /* sin drama */ } }
    var controller = new AbortController();
    parking.peticion = controller;
    var temporizador = setTimeout(function () { controller.abort(); }, (CONFIG.timeoutS + 3) * 1000);

    var query = '[out:json][timeout:' + CONFIG.timeoutS + '];(' +
      'node["amenity"="parking"](' + bbox[0] + ',' + bbox[1] + ',' + bbox[2] + ',' + bbox[3] + ');' +
      'way["amenity"="parking"](' + bbox[0] + ',' + bbox[1] + ',' + bbox[2] + ',' + bbox[3] + ');' +
      'relation["amenity"="parking"](' + bbox[0] + ',' + bbox[1] + ',' + bbox[2] + ',' + bbox[3] + ');' +
      ');out center ' + CONFIG.maxPuntos + ';';

    try {
      var resp = await fetch(CONFIG.overpassUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var datos = await resp.json();
      var geojson = overpassAGeojson(datos);
      parking.cache.set(clave, { ts: Date.now(), geojson: geojson });
      if (parking.cache.size > 40) {
        parking.cache.delete(parking.cache.keys().next().value);
      }
      if (controller === parking.peticion) pintarAparcamientos(geojson);
    } catch (e) {
      // Silencio total: el proxy ya devuelve 200 con elements vacíos y F12
      // no se entera de nada.
    } finally {
      clearTimeout(temporizador);
      if (controller === parking.peticion) parking.peticion = null;
    }
  }

  function asegurarCapasParking() {
    if (!estiloListo() || map.getSource('aparcamientos')) return;
    map.addSource('aparcamientos', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'capa-aparcamientos-halo',
      type: 'circle',
      source: 'aparcamientos',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 16, 12],
        'circle-color': '#0b1220',
        'circle-opacity': 0.22,
      },
    });
    map.addLayer({
      id: 'capa-aparcamientos',
      type: 'circle',
      source: 'aparcamientos',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 8],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
    // Anillo teal para los que tienen sombra AHORA.
    map.addLayer({
      id: 'capa-aparcamientos-sombra',
      type: 'circle',
      source: 'aparcamientos',
      filter: ['==', ['get', 'sombra'], true],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 8, 16, 14],
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': COLOR_SOMBRA,
      },
    });

    map.on('click', 'capa-aparcamientos', function (e) {
      if (!e.features || !e.features.length) return;
      var p = e.features[0].properties;
      var lineas = [];
      lineas.push('<strong>' + escaparHtml(p.nombre) + '</strong>');
      lineas.push(textoTipo(p.tipo) + ' · ' + textoAcceso(p.acceso) + ' · ' + textoPrecio(p.precio));
      if (p.capacidad) lineas.push(p.capacidad + ' ' + t('parkingCapacity', 'plazas'));
      lineas.push(p.sombra ? t('parkingShadeNow', 'Con sombra ahora') : t('parkingNoShade', 'Al sol ahora'));
      if (parking.popup) { try { parking.popup.remove(); } catch (err) { /* ok */ } }
      parking.popup = new maplibregl.Popup({ closeButton: true, maxWidth: '260px' })
        .setLngLat(e.lngLat)
        .setHTML('<div style="font:13px/1.5 system-ui,sans-serif;color:#1A2330">' + lineas.join('<br>') + '</div>')
        .addTo(map);
    });
    map.on('mouseenter', 'capa-aparcamientos', function () { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'capa-aparcamientos', function () { map.getCanvas().style.cursor = ''; });
  }

  function pintarAparcamientos(geojson) {
    if (!map) return;
    if (!map.getSource('aparcamientos')) {
      try { asegurarCapasParking(); } catch (e) { /* abajo el plan B */ }
      if (!map.getSource('aparcamientos')) {
        map.once('idle', function () { if (parking.activo) pintarAparcamientos(geojson); });
        return;
      }
    }
    evaluarSombraEn(geojson);
    map.getSource('aparcamientos').setData(geojson);
  }

  function limpiarAparcamientos() {
    if (!map || !map.getSource('aparcamientos')) return;
    map.getSource('aparcamientos').setData({ type: 'FeatureCollection', features: [] });
    if (parking.popup) { try { parking.popup.remove(); } catch (e) { /* ok */ } parking.popup = null; }
  }

  // Sombra: SOLO lee la fuente 'sombras' que ya mantiene shadows-route.js.
  function evaluarSombraEn(geojson) {
    try {
      if (typeof turf === 'undefined' || !map.getSource('sombras')) return;
      var poligonos = map.querySourceFeatures('sombras');
      if (!poligonos || !poligonos.length) return;
      for (var i = 0; i < geojson.features.length; i++) {
        var f = geojson.features[i];
        var punto = turf.point(f.geometry.coordinates);
        var cubierto = false;
        for (var j = 0; j < poligonos.length; j++) {
          var geom = poligonos[j].geometry;
          if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
          if (turf.booleanPointInPolygon(punto, poligonos[j])) { cubierto = true; break; }
        }
        f.properties.sombra = cubierto;
      }
    } catch (e) { /* la sombra es un extra: jamás rompe la capa */ }
  }

  function reevaluarSombraActual() {
    if (!parking.activo || !map || !map.getSource('aparcamientos')) return;
    clearTimeout(parking.temporizadorSombra);
    parking.temporizadorSombra = setTimeout(function () {
      try {
        var src = map.getSource('aparcamientos');
        if (!src) return;
        var actuales = map.querySourceFeatures('aparcamientos');
        if (!actuales || !actuales.length) return;
        var geojson = {
          type: 'FeatureCollection',
          features: actuales.map(function (f) {
            return { type: 'Feature', geometry: f.geometry, properties: Object.assign({}, f.properties, { sombra: false }) };
          }),
        };
        evaluarSombraEn(geojson);
        src.setData(geojson);
      } catch (e) { /* extra, nunca rompe */ }
    }, CONFIG.esperaSombraMs);
  }

  function alMoverElMapa() {
    clearTimeout(parking.temporizadorMove);
    parking.temporizadorMove = setTimeout(function () {
      if (!parking.activo || document.hidden) return;
      descargarAparcamientos();
    }, CONFIG.esperaMoveendMs);
  }

  function alCambiarDatos(e) {
    if (!parking.activo) return;
    if (e && e.sourceId === 'sombras' && e.isSourceLoaded) reevaluarSombraActual();
  }

  function activarParking() {
    if (parking.activo || !map) return;
    parking.activo = true;
    if (parking.btn) parking.btn.setAttribute('aria-pressed', 'true');
    map.on('moveend', alMoverElMapa);
    map.on('sourcedata', alCambiarDatos);
    if (estiloListo()) {
      try { asegurarCapasParking(); } catch (e) { /* ya entra el idle */ }
      descargarAparcamientos();
    } else {
      map.once('idle', function () {
        if (!parking.activo) return;
        try { asegurarCapasParking(); } catch (e) { /* jamás rompe el mapa */ }
        descargarAparcamientos();
      });
    }
    document.dispatchEvent(new CustomEvent('manolito:parking-cambiado', { detail: { activo: true } }));
  }

  function desactivarParking() {
    if (!parking.activo || !map) return;
    parking.activo = false;
    if (parking.btn) parking.btn.setAttribute('aria-pressed', 'false');
    map.off('moveend', alMoverElMapa);
    map.off('sourcedata', alCambiarDatos);
    clearTimeout(parking.temporizadorMove);
    clearTimeout(parking.temporizadorSombra);
    if (parking.peticion) { try { parking.peticion.abort(); } catch (e) { /* ok */ } parking.peticion = null; }
    limpiarAparcamientos();
    document.dispatchEvent(new CustomEvent('manolito:parking-cambiado', { detail: { activo: false } }));
  }

  function alternarParking() { if (parking.activo) desactivarParking(); else activarParking(); }

  function activarParkingEn(lat, lon) {
    if (!map) return;
    try {
      if (isFinite(lat) && isFinite(lon)) {
        map.easeTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), CONFIG.zoomLlegada), duration: 900 });
      }
    } catch (e) { /* centrar es un gesto, no una obligación */ }
    activarParking();
  }

  /* ==========================================================================
     BLOQUE 2. VIAJE LARGO EN COCHE
     ========================================================================== */
  var viaje = {
    btn: null,
    panel: null,
    inputOrigen: null,
    inputDestino: null,
    estado: null,
    peticion: null,
    temporizadorLlegada: null,
  };

  function decirEstado(texto) {
    if (viaje.estado) viaje.estado.textContent = texto || '';
  }

  async function geocodificar(texto) {
    var consulta = String(texto || '').trim();
    if (!consulta) return null;
    try {
      var url = new URL(CONFIG.geoUrl, window.location.origin);
      url.searchParams.set('q', consulta);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      var resp = await fetch(url.toString(), { headers: { 'Accept-Language': 'es' } });
      if (!resp.ok) return null;
      var datos = await resp.json();
      if (Array.isArray(datos) && datos.length) {
        return { lat: parseFloat(datos[0].lat), lon: parseFloat(datos[0].lon), nombre: datos[0].display_name || consulta };
      }
    } catch (e) { /* silencio: null y mensaje claro */ }
    return null;
  }

  function miPosicion() {
    return new Promise(function (resolve) {
      var porMapa = function () {
        try {
          var c = map.getCenter();
          resolve({ lat: c.lat, lon: c.lng, nombre: t('tripMapCenter', 'Centro del mapa') });
        } catch (e) { resolve(null); }
      };
      if (!('geolocation' in navigator)) { porMapa(); return; }
      var hecho = false;
      var temporizador = setTimeout(function () { if (!hecho) { hecho = true; porMapa(); } }, 4000);
      navigator.geolocation.getCurrentPosition(function (pos) {
        if (hecho) return;
        hecho = true;
        clearTimeout(temporizador);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, nombre: t('tripMyLocation', 'Mi ubicación') });
      }, function () {
        if (hecho) return;
        hecho = true;
        clearTimeout(temporizador);
        porMapa();
      }, { timeout: 3500, maximumAge: 60000 });
    });
  }

  async function rutaEnCoche(origen, destino) {
    var coords = origen.lon + ',' + origen.lat + ';' + destino.lon + ',' + destino.lat;
    var url = CONFIG.osrmCocheUrl + '/driving/' + coords + '?overview=full&geometries=geojson&steps=false';
    var controller = new AbortController();
    viaje.peticion = controller;
    var temporizador = setTimeout(function () { controller.abort(); }, CONFIG.timeoutViajeMs);
    try {
      var resp = await fetch(url, { signal: controller.signal });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var datos = await resp.json();
      if (!datos || datos.code !== 'Ok' || !datos.routes || !datos.routes.length) return null;
      var r = datos.routes[0];
      if (!r.geometry || !r.geometry.coordinates || !r.geometry.coordinates.length) return null;
      return { geometry: r.geometry, distanciaM: r.distance || 0, duracionS: r.duration || 0 };
    } catch (e) {
      return null;
    } finally {
      clearTimeout(temporizador);
      if (controller === viaje.peticion) viaje.peticion = null;
    }
  }

  function asegurarCapasViaje() {
    if (!estiloListo()) return false;
    if (map.getSource('viaje-largo')) return true;
    map.addSource('viaje-largo', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'capa-viaje-outline',
      type: 'line',
      source: 'viaje-largo',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: 'capa-viaje',
      type: 'line',
      source: 'viaje-largo',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#B0512E', 'line-width': 5, 'line-opacity': 0.95 },
    });
    return true;
  }

  function pintarRuta(geometry) {
    if (!asegurarCapasViaje()) {
      map.once('idle', function () { pintarRuta(geometry); });
      return;
    }
    map.getSource('viaje-largo').setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: geometry, properties: {} }],
    });
    // Reaplicar el estilo fino sobre las capas recién creadas del viaje.
    afinarLineasRuta();
    // Que el viaje SE VEA: encuadre de la ruta completa antes de la llegada.
    try {
      var bounds = new maplibregl.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]);
      for (var i = 1; i < geometry.coordinates.length; i++) bounds.extend(geometry.coordinates[i]);
      map.fitBounds(bounds, { padding: { top: 90, bottom: 90, left: 40, right: 40 }, duration: 900 });
    } catch (e) { /* el encuadre es un gesto, no una obligación */ }
  }

  function limpiarViaje() {
    if (viaje.peticion) { try { viaje.peticion.abort(); } catch (e) { /* ok */ } viaje.peticion = null; }
    clearTimeout(viaje.temporizadorLlegada);
    if (map && map.getSource('viaje-largo')) {
      map.getSource('viaje-largo').setData({ type: 'FeatureCollection', features: [] });
    }
    decirEstado('');
  }

  // Llegada: enciende el motor de sombras SOLO si estaba apagado (es lo que
  // da el anillo teal a los parkings) y activa la capa centrada en destino.
  function prepararLlegada(destino) {
    try {
      var toggleSombras = document.getElementById('rsToggleSombras');
      if (toggleSombras && !toggleSombras.checked) toggleSombras.click();
    } catch (e) { /* la sombra es un refuerzo, no una obligación */ }
    try {
      activarParkingEn(destino.lat, destino.lon);
    } catch (e) { /* sin parking no pasa nada, el viaje ya está trazado */ }
  }

  async function planificar(origenTexto, destinoTexto) {
    if (!map) return;
    if (viaje.panel && viaje.panel.hasAttribute('hidden')) viaje.panel.removeAttribute('hidden');

    var dTxt = String(destinoTexto != null ? destinoTexto : (viaje.inputDestino ? viaje.inputDestino.value : '')).trim();
    var oTxt = String(origenTexto != null ? origenTexto : (viaje.inputOrigen ? viaje.inputOrigen.value : '')).trim();
    if (!dTxt) {
      decirEstado(t('tripNeedDest', 'Dime a dónde vas y te trazo el viaje.'));
      return;
    }

    decirEstado(t('tripSearching', 'Buscando el mejor camino…'));
    var destino = await geocodificar(dTxt);
    if (!destino) {
      decirEstado(t('tripNoGeocode', 'No encuentro ese destino. Prueba con el nombre de la ciudad.'));
      return;
    }
    var origen = oTxt ? await geocodificar(oTxt) : await miPosicion();
    if (!origen) {
      decirEstado(t('tripNoOrigin', 'No encuentro ese origen. Déjalo vacío para salir de donde estás.'));
      return;
    }

    var ruta = await rutaEnCoche(origen, destino);
    if (!ruta) {
      decirEstado(t('tripNoRoute', 'No he podido trazar el viaje en coche. Inténtalo en un momento.'));
      return;
    }

    pintarRuta(ruta.geometry);

    var km = ruta.distanciaM / 1000;
    var kmTxt = String(km >= 10 ? Math.round(km) : (Math.round(km * 10) / 10)).replace('.', ',');
    var min = Math.round(ruta.duracionS / 60);
    var tiempoTxt = min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min';
    decirEstado(t('tripSummary', 'Viaje trazado') + ' · ' + kmTxt + ' km · ' + tiempoTxt + '. ' + t('tripParkingOn', 'Abajo tienes los aparcamientos del destino, con anillo los que están a la sombra.'));

    clearTimeout(viaje.temporizadorLlegada);
    viaje.temporizadorLlegada = setTimeout(function () { prepararLlegada(destino); }, CONFIG.esperaLlegadaMs);
  }

  /* ---------------- Interfaz: dos filas-botón y el panelito ---------------- */
  function crearBotones() {
    parking.btn = document.createElement('button');
    parking.btn.type = 'button';
    parking.btn.id = 'rsBtnParking';
    parking.btn.setAttribute('aria-pressed', 'false');
    parking.btn.textContent = t('parkingBtn', 'Buscar aparcamiento');
    parking.btn.addEventListener('click', function () { alternarParking(); });

    viaje.btn = document.createElement('button');
    viaje.btn.type = 'button';
    viaje.btn.id = 'rsBtnViaje';
    viaje.btn.setAttribute('aria-pressed', 'false');
    viaje.btn.setAttribute('aria-controls', 'rsPanelViaje');
    viaje.btn.textContent = t('tripBtn', 'Planificar viaje');

    var monteParking = document.getElementById('rsMonteParking');
    var monteViaje = document.getElementById('rsMonteViaje');
    var lista = document.getElementById('rsListaCapas');
    if (monteParking) monteParking.appendChild(parking.btn);
    else if (lista) {
      var filaP = document.createElement('div');
      filaP.className = 'rs-capa-fila rs-capa-fila-btn rs-ico-parking';
      filaP.id = 'rsMonteParking';
      filaP.appendChild(parking.btn);
      lista.appendChild(filaP);
    }
    if (monteViaje) monteViaje.appendChild(viaje.btn);
    else if (lista) {
      var filaV = document.createElement('div');
      filaV.className = 'rs-capa-fila rs-capa-fila-btn rs-ico-viaje';
      filaV.id = 'rsMonteViaje';
      filaV.appendChild(viaje.btn);
      lista.appendChild(filaV);
    }
  }

  function crearPanel() {
    viaje.panel = document.createElement('div');
    viaje.panel.id = 'rsPanelViaje';
    viaje.panel.className = 'rs-panel-viaje';
    viaje.panel.setAttribute('hidden', '');

    var titulo = document.createElement('p');
    titulo.className = 'rs-panel-viaje-tit';
    titulo.textContent = t('tripPanelTitle', 'Viaje largo en coche');
    viaje.panel.appendChild(titulo);

    viaje.inputOrigen = document.createElement('input');
    viaje.inputOrigen.type = 'text';
    viaje.inputOrigen.id = 'rsViajeOrigen';
    viaje.inputOrigen.setAttribute('placeholder', t('tripOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    viaje.inputOrigen.setAttribute('aria-label', t('tripOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    viaje.inputOrigen.autocomplete = 'off';
    viaje.panel.appendChild(viaje.inputOrigen);

    viaje.inputDestino = document.createElement('input');
    viaje.inputDestino.type = 'text';
    viaje.inputDestino.id = 'rsViajeDestino';
    viaje.inputDestino.setAttribute('placeholder', t('tripDestPh', 'A dónde vas'));
    viaje.inputDestino.setAttribute('aria-label', t('tripDestPh', 'A dónde vas'));
    viaje.inputDestino.autocomplete = 'off';
    viaje.panel.appendChild(viaje.inputDestino);

    var filaBotones = document.createElement('div');
    filaBotones.className = 'rs-panel-viaje-botones';

    var btnCalcular = document.createElement('button');
    btnCalcular.type = 'button';
    btnCalcular.className = 'rs-panel-viaje-calcular';
    btnCalcular.textContent = t('tripCalcBtn', 'Trazar viaje');
    btnCalcular.addEventListener('click', function () { planificar(); });
    filaBotones.appendChild(btnCalcular);

    var btnLimpiar = document.createElement('button');
    btnLimpiar.type = 'button';
    btnLimpiar.className = 'rs-panel-viaje-limpiar';
    btnLimpiar.textContent = t('tripClearBtn', 'Quitar viaje');
    btnLimpiar.addEventListener('click', function () { limpiarViaje(); });
    filaBotones.appendChild(btnLimpiar);

    viaje.panel.appendChild(filaBotones);

    viaje.estado = document.createElement('p');
    viaje.estado.className = 'rs-panel-viaje-estado';
    viaje.estado.setAttribute('role', 'status');
    viaje.panel.appendChild(viaje.estado);

    // 08-oct-2026 (orden directa de Sandro): el panel vive junto al MAPA,
    // en la zona de mapas y viajes, nunca en medio del planetario. Así el
    // orden clásico queda intacto: mapa y sus controles arriba, el
    // planetario entero abajo del todo y el acceso LiDAR debajo de él.
    var mapaWrap = document.querySelector('.map-wrap');
    if (mapaWrap && mapaWrap.parentNode) mapaWrap.parentNode.insertBefore(viaje.panel, mapaWrap.nextSibling);
    else document.getElementById('main-content')?.appendChild(viaje.panel);

    // Apertura con animación (08-oct): en vez de hidden seco, el panel
    // baja suave con opacidad y desplazamiento (CSS .rs-panel-viaje-abierto).
    viaje.btn.addEventListener('click', function () {
      var abierto = !viaje.panel.hasAttribute('hidden');
      if (!abierto) {
        viaje.panel.removeAttribute('hidden');
        // Forzar reflow para que la transición arranque desde cerrado.
        void viaje.panel.offsetHeight;
        viaje.panel.classList.add('rs-panel-viaje-abierto');
        viaje.btn.setAttribute('aria-pressed', 'true');
      } else {
        viaje.panel.classList.remove('rs-panel-viaje-abierto');
        viaje.btn.setAttribute('aria-pressed', 'false');
        setTimeout(function () {
          if (!viaje.panel.classList.contains('rs-panel-viaje-abierto')) {
            viaje.panel.setAttribute('hidden', '');
          }
        }, 280);
      }
    });

    viaje.inputDestino.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); planificar(); }
    });
    viaje.inputOrigen.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); planificar(); }
    });
  }

  function refrescarTextos() {
    if (parking.btn) parking.btn.textContent = t('parkingBtn', 'Buscar aparcamiento');
    if (viaje.btn) viaje.btn.textContent = t('tripBtn', 'Planificar viaje');
    if (!viaje.panel) return;
    var tit = viaje.panel.querySelector('.rs-panel-viaje-tit');
    if (tit) tit.textContent = t('tripPanelTitle', 'Viaje largo en coche');
    if (viaje.inputOrigen) {
      viaje.inputOrigen.setAttribute('placeholder', t('tripOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
      viaje.inputOrigen.setAttribute('aria-label', t('tripOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    }
    if (viaje.inputDestino) {
      viaje.inputDestino.setAttribute('placeholder', t('tripDestPh', 'A dónde vas'));
      viaje.inputDestino.setAttribute('aria-label', t('tripDestPh', 'A dónde vas'));
    }
    var bc = viaje.panel.querySelector('.rs-panel-viaje-calcular');
    if (bc) bc.textContent = t('tripCalcBtn', 'Trazar viaje');
    var bl = viaje.panel.querySelector('.rs-panel-viaje-limpiar');
    if (bl) bl.textContent = t('tripClearBtn', 'Quitar viaje');
  }

  /* ---------------- APIs públicas y eventos -------------------------------- */
  window.manolitoParking = {
    alternar: alternarParking,
    activar: activarParking,
    desactivar: desactivarParking,
    estaActivo: function () { return parking.activo; },
    activarEn: activarParkingEn,
  };
  window.manolitoViaje = {
    planificar: planificar,
    limpiar: limpiarViaje,
  };

  document.addEventListener('manolito:activar-parking', function (e) {
    var d = (e && e.detail) || {};
    if (isFinite(d.lat) && isFinite(d.lon)) activarParkingEn(d.lat, d.lon);
    else activarParking();
  });
  document.addEventListener('manolito:planificar-viaje', function (e) {
    var d = (e && e.detail) || {};
    planificar(d.origen, d.destino);
  });
  document.addEventListener('manolito:idioma-cambiado', refrescarTextos);

  /* ---------------- Arranque: espera al mapa con reintentos suaves -------- */
  /* ================================================================
     BLOQUE 3 · Restyle fino de las líneas de ruta (08-oct-2026, orden
     directa de Sandro: "la visualización de los trazados es tosca").
     No se toca shadows-route.js: se ajustan los paint de las capas ya
     creadas con setPaintProperty, con guardas por si aún no existen.
     Qué cambia: grosores que ESCALAN con el zoom (antes fijos, por eso
     a zoom bajo la línea era un chorro), opacidades más suaves y un
     line-blur fino que hace de anti-aliasing en los bordes.
     ================================================================ */
  function afinarLineasRuta(intentos) {
    if (!map) return;
    if (typeof intentos !== 'number') intentos = 0;
    // Con el motor de sombras activo el estilo anda ocupado recalculando
    // justo cuando se traza el viaje: si no está listo, se reintenta en
    // el próximo idle en vez de rendirse en silencio.
    if (!estiloListo()) {
      if (intentos < 10) map.once('idle', function () { afinarLineasRuta(intentos + 1); });
      return;
    }
    var ajustes = [
      // Ruta a pie (las pinta shadows-route.js)
      ['capa-ruta-outline', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 9], 'line-opacity': 0.55 }],
      ['capa-ruta-glow', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 7, 16, 14], 'line-opacity': 0.22, 'line-blur': 6 }],
      ['capa-ruta', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 16, 5.5], 'line-opacity': 0.95, 'line-blur': 0.4 }],
      ['capa-ruta-sombra-outline', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 9], 'line-opacity': 0.6 }],
      ['capa-ruta-sombra', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 16, 5.5], 'line-opacity': 0.9, 'line-blur': 0.4 }],
      // Viaje largo en coche (las pinta este módulo, bloque 2)
      ['capa-viaje-outline', { 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 6, 15, 9], 'line-opacity': 0.55 }],
      ['capa-viaje', { 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.8, 10, 3.5, 15, 5.5], 'line-opacity': 0.95, 'line-blur': 0.4 }],
    ];
    var algunaFalta = false;
    ajustes.forEach(function (par) {
      var id = par[0], props = par[1];
      if (!map.getLayer(id)) { algunaFalta = true; return; }
      Object.keys(props).forEach(function (prop) {
        try { map.setPaintProperty(id, prop, props[prop]); } catch (e) { /* capa rehaciéndose */ }
      });
    });
    // Las capas de la ruta a pie nacen cuando arranca el motor de sombras
    // y las del viaje al trazar; si alguna falta se reintenta unas pocas
    // veces (tope 10, nunca un bucle infinito) y además se reaplica el
    // estilo cada vez que se traza un viaje nuevo.
    if (algunaFalta && intentos < 10) {
      map.once('idle', function () { afinarLineasRuta(intentos + 1); });
    }
  }

  (function arrancar(intentos) {
    try {
      if (window.manolitAireMap) {
        map = window.manolitAireMap;
        crearBotones();
        crearPanel();
        if (estiloListo()) afinarLineasRuta();
        else map.once('idle', afinarLineasRuta);
      } else if (intentos < 90) {
        setTimeout(function () { arrancar(intentos + 1); }, 500);
      }
    } catch (e) { /* este módulo jamás rompe el mapa */ }
  })(0);
})();
