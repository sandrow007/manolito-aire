/*
 * Rutas en bicicleta + capa de carriles bici de Manolit∞ Aire.
 *
 * - ADITIVO: no toca la lógica de coche (aparcamientos-viaje.js) ni la de
 *   sombra. Se engancha al mapa por window.manolitAireMap, como el resto.
 * - Motor global principal: BRouter (https://brouter.de/brouter, instancia
 *   pública, datos mundiales, perfil "trekking"). Se pide alternativeidx=0,
 *   1 y 2 (una petición por alternativa, máximo 1 petición/segundo) y se
 *   cachea 60 s por par origen/destino.
 * - Respaldo: OSRM de FOSSGIS con el prefijo routed-bike a través del proxy
 *   same-origin /ruta-bici (nunca devuelve coche por error). Máximo una
 *   petición, alternativas=3, uso no comercial.
 * - Atribución: "BRouter" y "© OpenStreetMap contributors" visibles en el
 *   panel. Carriles bici: Overpass vía el proxy /aparcamientos (mismo que
 *   fuentes-agua y parking), solo infraestructura ciclista de OpenStreetMap.
 * - "Más sombra" para bici NO se implementa: reutilizar el motor de sombra
 *   sobre la polilínea de bici no es trivial y se deja fuera para no tocar
 *   la lógica existente.
 */
(function () {
  'use strict';

  if (window.__manolitoRutasBici) return; // doble carga: jamás
  window.__manolitoRutasBici = true;

  var BROUTER_URL = 'https://brouter.de/brouter';
  var OSRM_BICI_URL = window.location.protocol === 'file:'
    ? 'https://manolitoaire.com/ruta-bici'
    : '/ruta-bici';
  var GEO_URL = window.location.protocol === 'file:'
    ? 'https://manolitoaire.com/geo'
    : '/geo';
  var OVERPASS_URL = window.location.protocol === 'file:'
    ? 'https://manolitoaire.com/aparcamientos'
    : '/aparcamientos';

  var RUTA_TTL_MS = 60 * 1000;
  var MIN_GAP_MS = 1000;             // BRouter: 1 petición/segundo
  var MAX_ALTERNATIVAS = 3;
  var MAX_KM_OVERBRIDGE = 20;      // carriles bici: bbox máximo ~20 km (barrio/ciudad)
  var CARRIL_TTL_MS = 15 * 60 * 1000;
  var CARRIL_MIN_ZOOM = 12;

  var map = null;
  var rutaSourceListo = false;
  var carrilEnabled = false;
  var carrilToggle = null;
  var carrilTimer = 0;
  var carrilCache = new Map();
  var carrilUltima = 0;

  var lista = { ultimaClave: '', rutas: [], touched: 0 };

  function t(clave, fallback) {
    try {
      var fn = window.getMessages;
      if (typeof fn === 'function') {
        var msg = fn();
        if (msg && msg[clave] != null) return msg[clave];
      }
    } catch (e) {
      // i18n no cargado todavía: usar el texto en español es intencional,
      // no es un error de la capa.
      console.debug('[rutas-bici] i18n no disponible, uso fallback:', e);
    }
    return fallback != null ? fallback : clave;
  }

  /* ---------------- Utilidades ------------------------------------------ */
  function geoJson(geometry) { return { type: 'Feature', geometry: geometry, properties: {} }; }

  function fmtMinutos(seg) {
    var min = Math.round(seg / 60);
    return min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min';
  }

  function fmtKm(m) {
    var km = m / 1000;
    return String(km >= 10 ? Math.round(km) : (Math.round(km * 10) / 10)).replace('.', ',');
  }

  function keyRuta(o, d) {
    return o.lon.toFixed(5) + ',' + o.lat.toFixed(5) + '|' + d.lon.toFixed(5) + ',' + d.lat.toFixed(5);
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------------- Geocodificación y ubicación ------------------------- */
  async function geocodificar(consulta) {
    try {
      var resp = await fetch(GEO_URL + '/search?q=' + encodeURIComponent(consulta) + '&format=json&limit=1', { credentials: 'omit' });
      if (!resp.ok) return null;
      var datos = await resp.json();
      if (Array.isArray(datos) && datos.length) {
        return { lat: parseFloat(datos[0].lat), lon: parseFloat(datos[0].lon), nombre: datos[0].display_name || consulta };
      }
    } catch (e) { /* devuelve null */ }
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
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, nombre: t('myLocation', 'Mi ubicación') });
      }, function () {
        if (hecho) return;
        hecho = true;
        clearTimeout(temporizador);
        porMapa();
      }, { timeout: 3500, maximumAge: 60000 });
    });
  }

  /* ---------------- BRouter --------------------------------------------- */
  var ultimaBrouter = 0;

  async function pedirBrouter(lonlats, alternativeIdx) {
    var falta = MIN_GAP_MS - (Date.now() - ultimaBrouter);
    if (falta > 0) await esperar(falta);
    ultimaBrouter = Date.now();

    var url = BROUTER_URL +
      '?lonlats=' + encodeURIComponent(lonlats) +
      '&profile=trekking&alternativeidx=' + alternativeIdx +
      '&format=geojson';

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'manolitoaire.com bike routing (contacto: manolitoaire.com)',
          'Referer': 'https://manolitoaire.com/',
          'Accept': 'application/geojson, application/json'
        }
      });
      if (!resp.ok) return null;
      var datos = await resp.json();
      return datos;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function parseBrouter(datos) {
    var features = datos && datos.features;
    if (!Array.isArray(features) || !features.length) return null;
    var f = features[0];
    var geom = f.geometry;
    if (!geom || geom.type !== 'LineString' || !geom.coordinates || !geom.coordinates.length) return null;
    var props = f.properties || {};
    var distancia = parseFloat(props['track-length']) || 0;
    var desnivel = parseFloat(props['filtered ascend']) || 0;
    var duracion = parseFloat(props['total-time']) || 0;
    return { geometry: geom, distanciaM: distancia, duracionS: duracion, desnivelM: desnivel };
  }

  /* ---------------- Respaldo OSRM bici ---------------------------------- */
  async function pedirOsrmBici(origen, destino) {
    var coords = origen.lon + ',' + origen.lat + ';' + destino.lon + ',' + destino.lat;
    var url = OSRM_BICI_URL + '/driving/' + coords + '?overview=full&geometries=geojson&steps=false&alternatives=' + (MAX_ALTERNATIVAS - 1);
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var resp = await fetch(url, { signal: controller.signal, credentials: 'omit' });
      if (!resp.ok) return [];
      var datos = await resp.json();
      if (!datos || datos.code !== 'Ok' || !Array.isArray(datos.routes)) return [];
      return datos.routes.map(function (r) {
        return { geometry: r.geometry, distanciaM: r.distance || 0, duracionS: r.duration || 0, desnivelM: null };
      }).filter(function (r) { return r.geometry && r.geometry.coordinates && r.geometry.coordinates.length; });
    } catch (e) {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------------- Cálculo de rutas ------------------------------------ */
  async function calcularRutas(origen, destino) {
    var clave = keyRuta(origen, destino);
    if (lista.ultimaClave === clave && Date.now() - lista.touched < RUTA_TTL_MS) {
      return lista.rutas;
    }

    var lonlats = origen.lon + ',' + origen.lat + '|' + destino.lon + ',' + destino.lat;
    var rutas = [];

    // BRouter: una petición por alternativa, hasta 3, parando si una falla.
    for (var i = 0; i < MAX_ALTERNATIVAS; i++) {
      var datos = await pedirBrouter(lonlats, i);
      var ruta = parseBrouter(datos);
      if (!ruta) break;
      ruta.indice = rutas.length;
      rutas.push(ruta);
    }

    // Respaldo OSRM solo si BRouter no devolvió nada.
    if (!rutas.length) {
      rutas = await pedirOsrmBici(origen, destino);
      rutas.forEach(function (r, idx) { r.indice = idx; });
    }

    lista.ultimaClave = clave;
    lista.rutas = rutas;
    lista.touched = Date.now();
    return rutas;
  }

  /* ---------------- Pintado de rutas ------------------------------------ */
  var SOURCE_ID = 'bici-rutas';
  var OUTLINE_ID = 'bici-rutas-outline';
  var LINE_ID = 'bici-rutas-line';
  var ACCENT_COLOR = '#FF6B1A';
  var SECONDARY_COLOR = '#5a6b78';

  function asegurarCapasRuta() {
    if (!map || !map.isStyleLoaded()) return false;
    if (map.getSource(SOURCE_ID)) {
      if (!map.getLayer(OUTLINE_ID)) {
        map.addLayer({
          id: OUTLINE_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 7, 15, 11],
            'line-opacity': 0.95
          }
        });
      }
      if (!map.getLayer(LINE_ID)) {
        map.addLayer({
          id: LINE_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['case', ['get', 'primaria'], ACCENT_COLOR, SECONDARY_COLOR],
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 10, 5, 15, 8],
            'line-opacity': 1
          }
        });
      }
      return true;
    }
    map.addSource(SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: OUTLINE_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 7, 15, 11],
        'line-opacity': 0.95
      }
    });
    map.addLayer({
      id: LINE_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['case', ['get', 'primaria'], ACCENT_COLOR, SECONDARY_COLOR],
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 10, 5, 15, 8],
        'line-opacity': 1
      }
    });
    return true;
  }

  function pintarRutas(rutas) {
    if (!asegurarCapasRuta()) {
      map.once('idle', function () { pintarRutas(rutas); });
      return;
    }
    var features = rutas.map(function (r, idx) {
      var f = geoJson(r.geometry);
      f.properties = { indice: idx, primaria: idx === 0 };
      return f;
    });
    map.getSource(SOURCE_ID).setData({ type: 'FeatureCollection', features: features });
    if (features.length) {
      try {
        var bounds = new maplibregl.LngLatBounds(features[0].geometry.coordinates[0], features[0].geometry.coordinates[0]);
        for (var i = 0; i < features.length; i++) {
          var coords = features[i].geometry.coordinates;
          for (var j = 1; j < coords.length; j++) bounds.extend(coords[j]);
        }
        map.fitBounds(bounds, { padding: { top: 90, bottom: 90, left: 40, right: 40 }, duration: 900 });
      } catch (e) { /* encuadre opcional */ }
    }
  }

  function limpiarRuta() {
    if (map && map.getSource(SOURCE_ID)) {
      map.getSource(SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
    }
    lista.ultimaClave = '';
    lista.rutas = [];
  }

  function seleccionarAlternativa(indice) {
    var source = map && map.getSource(SOURCE_ID);
    if (!source) return;
    var data = source._data || { type: 'FeatureCollection', features: [] };
    if (!Array.isArray(data.features)) return;
    data.features.forEach(function (f) {
      f.properties.primaria = (f.properties.indice === indice);
    });
    source.setData(data);
  }

  /* ---------------- Panel ------------------------------------------------- */
  var panel = null;
  var inputOrigen = null;
  var inputDestino = null;
  var estado = null;
  var listaAlt = null;

  function construirPanel() {
    panel = document.createElement('div');
    panel.id = 'rsPanelBici';
    panel.className = 'rs-panel-viaje';
    panel.setAttribute('hidden', '');

    var titulo = document.createElement('p');
    titulo.className = 'rs-panel-viaje-tit';
    titulo.textContent = t('bikePanelTitle', 'Ruta en bicicleta');
    panel.appendChild(titulo);

    inputOrigen = document.createElement('input');
    inputOrigen.type = 'text';
    inputOrigen.setAttribute('placeholder', t('bikeOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    inputOrigen.setAttribute('aria-label', t('bikeOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    inputOrigen.autocomplete = 'off';
    panel.appendChild(inputOrigen);

    inputDestino = document.createElement('input');
    inputDestino.type = 'text';
    inputDestino.setAttribute('placeholder', t('bikeDestPh', 'A dónde vas'));
    inputDestino.setAttribute('aria-label', t('bikeDestPh', 'A dónde vas'));
    inputDestino.autocomplete = 'off';
    panel.appendChild(inputDestino);

    var filaBotones = document.createElement('div');
    filaBotones.className = 'rs-panel-viaje-botones';
    var btnCalcular = document.createElement('button');
    btnCalcular.type = 'button';
    btnCalcular.className = 'rs-panel-viaje-calcular';
    btnCalcular.textContent = t('bikeCalcBtn', 'Trazar ruta');
    btnCalcular.addEventListener('click', function () { planificar(); });
    filaBotones.appendChild(btnCalcular);

    var btnLimpiar = document.createElement('button');
    btnLimpiar.type = 'button';
    btnLimpiar.className = 'rs-panel-viaje-limpiar';
    btnLimpiar.textContent = t('bikeClearBtn', 'Quitar ruta');
    btnLimpiar.addEventListener('click', function () { limpiarRuta(); if (estado) estado.textContent = ''; });
    filaBotones.appendChild(btnLimpiar);
    panel.appendChild(filaBotones);

    estado = document.createElement('p');
    estado.className = 'rs-panel-viaje-estado';
    estado.setAttribute('role', 'status');
    panel.appendChild(estado);

    listaAlt = document.createElement('div');
    listaAlt.className = 'rs-panel-bici-alternativas';
    panel.appendChild(listaAlt);

    var attribution = document.createElement('small');
    attribution.className = 'rs-panel-viaje-estado';
    attribution.textContent = t('bikeAttribution', 'Ruta por BRouter y © Colaboradores de OpenStreetMap · Respaldo: OSRM/FOSSGIS');
    panel.appendChild(attribution);

    var mapaWrap = document.querySelector('.map-wrap');
    if (mapaWrap && mapaWrap.parentNode) mapaWrap.parentNode.insertBefore(panel, mapaWrap.nextSibling);
    else document.getElementById('main-content')?.appendChild(panel);

    inputDestino.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); planificar(); } });
    inputOrigen.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); planificar(); } });
  }

  function pintarAlternativas(rutas) {
    if (!listaAlt) return;
    listaAlt.textContent = '';
    if (!rutas.length) return;

    var cabecera = document.createElement('p');
    cabecera.className = 'rs-panel-viaje-estado';
    cabecera.textContent = t('bikeAlternatives', 'Alternativas');
    listaAlt.appendChild(cabecera);

    rutas.forEach(function (r, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rs-panel-bici-alt' + (idx === 0 ? ' activa' : '');
      btn.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');

      var fuerte = document.createElement('strong');
      fuerte.textContent = fmtMinutos(r.duracionS) + ' · ' + fmtKm(r.distanciaM) + ' km';
      btn.appendChild(fuerte);

      if (r.desnivelM != null && r.desnivelM > 0) {
        var sub = document.createElement('span');
        sub.className = 'rs-panel-bici-sub';
        sub.textContent = ' · ' + Math.round(r.desnivelM) + ' m ' + t('bikeElevation', 'desnivel');
        btn.appendChild(sub);
      }

      btn.addEventListener('click', function () {
        seleccionarAlternativa(idx);
        var botones = listaAlt.querySelectorAll('.rs-panel-bici-alt');
        for (var i = 0; i < botones.length; i++) {
          botones[i].classList.toggle('activa', i === idx);
          botones[i].setAttribute('aria-pressed', i === idx ? 'true' : 'false');
        }
      });
      listaAlt.appendChild(btn);
    });
  }

  async function planificar() {
    if (!map) return;
    if (panel && panel.hasAttribute('hidden')) panel.removeAttribute('hidden');

    var dTxt = String(inputDestino ? inputDestino.value : '').trim();
    var oTxt = String(inputOrigen ? inputOrigen.value : '').trim();
    if (!dTxt) { if (estado) estado.textContent = t('tripNeedDest', 'Dime a dónde vas y te trazo el viaje.'); return; }

    if (estado) estado.textContent = t('bikeSearching', 'Buscando la mejor ruta en bici…');
    var destino = await geocodificar(dTxt);
    if (!destino) { if (estado) estado.textContent = t('bikeNoGeocode', 'No encuentro ese destino. Prueba con el nombre de la ciudad.'); return; }
    var origen = oTxt ? await geocodificar(oTxt) : await miPosicion();
    if (!origen) { if (estado) estado.textContent = t('bikeNoOrigin', 'No encuentro ese origen. Déjalo vacío para salir de donde estás.'); return; }

    var rutas = await calcularRutas(origen, destino);
    if (!rutas.length) { if (estado) estado.textContent = t('bikeNoRoute', 'No he podido trazar la ruta en bici. Inténtalo en un momento.'); return; }

    pintarRutas(rutas);
    pintarAlternativas(rutas);
    if (estado) estado.textContent = '';
  }

  /* ---------------- Capa de carriles bici -------------------------------- */
  function bboxVisible() {
    var b = map.getBounds();
    return { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };
  }

  function consultaCarriles(bbox) {
    var bboxTxt = [bbox.south, bbox.west, bbox.north, bbox.east].map(function (v) { return v.toFixed(6); }).join(',');
    return '[out:json][timeout:15];(' +
      'way["highway"="cycleway"](' + bboxTxt + ');' +
      'way["cycleway"](' + bboxTxt + ');' +
      'way["bicycle"="designated"](' + bboxTxt + ');' +
      ');out geom;';
  }

  function wayToLineString(element) {
    if (!element || !Array.isArray(element.geometry) || element.geometry.length < 2) return null;
    var coords = element.geometry.map(function (p) { return [p.lon, p.lat]; });
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
  }

  async function cargarCarriles() {
    if (!carrilEnabled || !map || map.getZoom() < CARRIL_MIN_ZOOM) return;
    var bbox = bboxVisible();
    var ladoKm = Math.max(
      (bbox.east - bbox.west) * 111.32 * Math.cos((bbox.south + bbox.north) / 2 * Math.PI / 180),
      (bbox.north - bbox.south) * 111.32
    );
    if (ladoKm > MAX_KM_OVERBRIDGE) return;

    var clave = [bbox.west.toFixed(3), bbox.south.toFixed(3), bbox.east.toFixed(3), bbox.north.toFixed(3)].join(':');
    var cached = carrilCache.get(clave);
    if (cached && Date.now() - cached.touched < CARRIL_TTL_MS) {
      pintarCarriles(cached.features);
      return;
    }

    var falta = 1000 - (Date.now() - carrilUltima);
    if (falta > 0) await esperar(falta);
    carrilUltima = Date.now();

    try {
      var resp = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: consultaCarriles(bbox) }).toString(),
        credentials: 'omit'
      });
      if (!resp.ok) return;
      var datos = await resp.json();
      var features = (Array.isArray(datos.elements) ? datos.elements : [])
        .map(wayToLineString)
        .filter(Boolean);
      carrilCache.set(clave, { features: features, touched: Date.now() });
      while (carrilCache.size > 200) carrilCache.delete(carrilCache.keys().next().value);
      pintarCarriles(features);
    } catch (e) { /* sin datos: no rompe nada */ }
  }

  var CARRIL_SOURCE = 'carriles-bici-source';
  var CARRIL_LAYER = 'carriles-bici-line';

  function asegurarCapaCarril() {
    if (!map || !map.isStyleLoaded()) return false;
    if (map.getSource(CARRIL_SOURCE)) return true;
    map.addSource(CARRIL_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      attribution: 'Carriles bici © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Colaboradores de OpenStreetMap</a> (ODbL)'
    });
    map.addLayer({
      id: CARRIL_LAYER,
      type: 'line',
      source: CARRIL_SOURCE,
      minzoom: CARRIL_MIN_ZOOM,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#D500F9',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 8],
        'line-opacity': 1,
        'line-dasharray': [1.2, 1.8],
        'line-blur': 0
      }
    });
    return true;
  }

  function pintarCarriles(features) {
    if (!asegurarCapaCarril()) {
      map.once('idle', function () { pintarCarriles(features); });
      return;
    }
    map.getSource(CARRIL_SOURCE).setData({ type: 'FeatureCollection', features: features });
  }

  function destroyCarril() {
    try {
      if (map.getLayer(CARRIL_LAYER)) map.removeLayer(CARRIL_LAYER);
      if (map.getSource(CARRIL_SOURCE)) map.removeSource(CARRIL_SOURCE);
    } catch (e) { /* ya liberado */ }
  }

  function onCarrilToggle() {
    carrilEnabled = carrilToggle && carrilToggle.checked;
    if (carrilEnabled) {
      map.on('moveend', scheduleCarril);
      cargarCarriles();
    } else {
      map.off('moveend', scheduleCarril);
      destroyCarril();
    }
  }

  function scheduleCarril() {
    if (!carrilEnabled) return;
    clearTimeout(carrilTimer);
    carrilTimer = setTimeout(cargarCarriles, 500);
  }

  /* ---------------- Arranque -------------------------------------------- */
  function iniciar(mapa) {
    map = mapa;
    construirPanel();

    var monteBici = document.getElementById('rsMonteBici');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'rsBtnBici';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-controls', 'rsPanelBici');
    btn.textContent = t('bikeBtn', 'Ruta en bici');
    btn.addEventListener('click', function () {
      if (!panel) return;
      var abierto = !panel.hasAttribute('hidden');
      if (!abierto) {
        panel.removeAttribute('hidden');
        void panel.offsetHeight;
        panel.classList.add('rs-panel-viaje-abierto');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        panel.classList.remove('rs-panel-viaje-abierto');
        btn.setAttribute('aria-pressed', 'false');
        setTimeout(function () {
          if (!panel.classList.contains('rs-panel-viaje-abierto')) panel.setAttribute('hidden', '');
        }, 280);
      }
    });

    if (monteBici) monteBici.appendChild(btn);
    else {
      var lista = document.getElementById('rsListaCapas');
      if (lista) {
        var fila = document.createElement('div');
        fila.className = 'rs-capa-fila rs-capa-fila-btn rs-ico-bici';
        fila.id = 'rsMonteBici';
        fila.appendChild(btn);
        lista.appendChild(fila);
      }
    }

    carrilToggle = document.getElementById('rsToggleCarrilesBici');
    if (carrilToggle) {
      carrilToggle.addEventListener('change', onCarrilToggle);
      // Si el usuario lo activó antes de que el mapa y este módulo terminaran
      // de cargar, el cambio ya no vuelve a dispararse: hay que aplicarlo.
      if (carrilToggle.checked) onCarrilToggle();
    }

    document.addEventListener('manolito:idioma-cambiado', function () {
      btn.textContent = t('bikeBtn', 'Ruta en bici');
      var tit = panel.querySelector('.rs-panel-viaje-tit');
      if (tit) tit.textContent = t('bikePanelTitle', 'Ruta en bicicleta');
      if (inputOrigen) inputOrigen.setAttribute('placeholder', t('bikeOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
      if (inputDestino) inputDestino.setAttribute('placeholder', t('bikeDestPh', 'A dónde vas'));
    });
  }

  (function esperarMapa(intentos) {
    try {
      var mapa = window.manolitAireMap;
      if (mapa) { iniciar(mapa); return; }
    } catch (e) {
      console.debug('[rutas-bici] Error al enganchar el mapa:', e);
    }
    if (intentos < 240) setTimeout(function () { esperarMapa(intentos + 1); }, 500);
  })(0);
})();
