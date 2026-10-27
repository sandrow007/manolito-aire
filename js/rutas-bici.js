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
 *   panel. Carriles bici: Overpass vía el proxy /carriles-bici (ruta propia,
 *   separada de /aparcamientos y de /arboles: cada capa tiene su propio
 *   espacio de caché en el Worker para que nunca se devuelvan unos datos
 *   por otros en el mismo bbox — 24-oct-2026, arreglo del carril que no
 *   aparecía).
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
  // Ruta PROPIA para los carriles bici (ver nota de cabecera): antes
  // reutilizaba '/aparcamientos' y, si esa misma zona ya tenía la caché de
  // aparcamiento guardada en el Worker, el carril bici recibía esos mismos
  // datos (nodos de parking, sin geometría de vía) y no dibujaba nada.
  var OVERPASS_URL = window.location.protocol === 'file:'
    ? 'https://manolitoaire.com/carriles-bici'
    : '/carriles-bici';

  // Fallback directo desde el navegador: el Worker no alcanza Overpass
  // desde Cloudflare, pero el navegador sí (CORS abierto). Solo se usa
  // cuando el proxy propio devuelve vacío.
  var OVERPASS_DIRECTO = 'https://overpass-api.de/api/interpreter';
  var OVERPASS_DIRECTO_2 = 'https://overpass.kumi.systems/api/interpreter';

  var RUTA_TTL_MS = 60 * 1000;
  var MIN_GAP_MS = 1000;             // BRouter: 1 petición/segundo
  var MAX_ALTERNATIVAS = 3;
  var MAX_KM_OVERBRIDGE = 20;      // carriles bici: bbox máximo ~20 km (barrio/ciudad)
  var CARRIL_TTL_MS = 15 * 60 * 1000;
  var CARRIL_MIN_ZOOM = 10;

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
    return {
      origen: origen,
      destino: destino,
      alternativas: rutas.length,
      distanciaM: rutas[0].distanciaM,
      duracionS: rutas[0].duracionS
    };
  }

  // API pública acotada para que el chat use la misma geocodificación y
  // el mismo motor/pintado que el panel, sin duplicar rutas ni acceder al DOM.
  window.manolitAirePlanificarRutaBici = async function (origenTexto, destinoTexto) {
    if (!map || !String(destinoTexto || '').trim()) return null;
    if (panel && panel.hasAttribute('hidden')) panel.removeAttribute('hidden');
    if (inputOrigen) inputOrigen.value = String(origenTexto || '');
    if (inputDestino) inputDestino.value = String(destinoTexto || '');
    try {
      var resultado = await planificar();
      return resultado || null;
    } catch (error) {
      console.debug('[rutas-bici] No se pudo planificar desde el chat:', error);
      return null;
    }
  };

  /* ---------------- Capa de carriles bici (roja con bandas blancas) -------- */
  var CARRIL_SOURCE = 'carriles-bici-source';
  var CARRIL_ROJO = 'carriles-bici-rojo';
  var CARRIL_BORDE_IZQ = 'carriles-bici-borde-izq';
  var CARRIL_BORDE_DER = 'carriles-bici-borde-der';
  var CARRIL_SIMBOLO = 'carriles-bici-simbolo';
  var CARRIL_IMAGEN = 'carriles-bici-icono';
  var carrilCapaLista = false; // Flag para saber si la capa está completamente inicializada
  var carrilInicializando = false; // Flag para evitar múltiples inicializaciones
  var carrilRequestId = 0;
  var carrilStyleHandler = null;
  
  // SVG del símbolo de bicicleta para carriles bici
  var BICI_ICONO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    '<g fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="9" cy="21" r="5"/>' +
    '<circle cx="23" cy="21" r="5"/>' +
    '<path d="M9 21 L16 11 L20 11"/>' +
    '<path d="M16 11 L14 7 L11 7"/>' +
    '<path d="M20 11 L18 7 L21 7"/>' +
    '</g>' +
    '</svg>';

  function bboxVisible() {
    var b = map.getBounds();
    return {
      west: Math.max(-180, b.getWest()), south: Math.max(-85, b.getSouth()),
      east: Math.min(180, b.getEast()), north: Math.min(85, b.getNorth())
    };
  }

  function consultaCarriles(bbox) {
    var s = bbox.south.toFixed(6), w = bbox.west.toFixed(6),
        n = bbox.north.toFixed(6), e = bbox.east.toFixed(6);
    var b = s + ',' + w + ',' + n + ',' + e;
    // Tags OSM más usados para carriles bici. 'out geom' es más ligero que
    // 'out body geom' porque no incluye tags (sólo geometría + id).
    return '[out:json][timeout:30];(' +
      'way["highway"="cycleway"](' + b + ');' +
      'way["cycleway"~"lane|track|opposite_lane|opposite_track|shared_lane|share_busway"](' + b + ');' +
      'way["cycleway:left"~"lane|track"](' + b + ');' +
      'way["cycleway:right"~"lane|track"](' + b + ');' +
      'way["cycleway:both"~"lane|track"](' + b + ');' +
      'way["bicycle"="designated"]["highway"~"path|footway|service"](' + b + ');' +
      ');out geom;';
  }

  function wayToLineString(element) {
    if (!element || !Array.isArray(element.geometry) || element.geometry.length < 2) return null;
    var coords = element.geometry.map(function (p) { return [p.lon, p.lat]; });
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
  }

  // Genera puntos espaciados a lo largo de las líneas para los símbolos de bici
  function generarPuntosSimbolos(features, espaciadoMetros) {
    if (!espaciadoMetros) espaciadoMetros = 50; // cada 50 metros por defecto
    var puntos = [];
    var RADIO_TIERRA = 6371000; // metros
    
    function distanciaMetros(lon1, lat1, lon2, lat2) {
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return RADIO_TIERRA * c;
    }
    
    features.forEach(function(feature) {
      var coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) return;
      
      var distanciaAcumulada = 0;
      var siguientePunto = espaciadoMetros; // primer punto a los X metros
      
      for (var i = 1; i < coords.length; i++) {
        var p1 = coords[i-1];
        var p2 = coords[i];
        var distSegmento = distanciaMetros(p1[0], p1[1], p2[0], p2[1]);
        
        // Añadir puntos dentro de este segmento
        while (distanciaAcumulada + distSegmento >= siguientePunto) {
          var distanciaRestante = siguientePunto - distanciaAcumulada;
          var fraccion = distanciaRestante / distSegmento;
          
          var lon = p1[0] + (p2[0] - p1[0]) * fraccion;
          var lat = p1[1] + (p2[1] - p1[1]) * fraccion;
          
          puntos.push({
            type: 'Feature',
            properties: { tipo: 'simbolo-bici' },
            geometry: { type: 'Point', coordinates: [lon, lat] }
          });
          
          siguientePunto += espaciadoMetros;
        }
        
        distanciaAcumulada += distSegmento;
      }
    });
    
    return puntos;
  }

  async function pedirCarriles(url, bbox, timeoutMs) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, timeoutMs);
    try {
      var resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: consultaCarriles(bbox) }).toString(),
        credentials: 'omit',
        signal: controller.signal
      });
      if (!resp.ok) return [];
      var datos = await resp.json();
      return (Array.isArray(datos.elements) ? datos.elements : [])
        .map(wayToLineString)
        .filter(Boolean);
    } catch (e) {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function cargarCarriles() {
    if (!carrilEnabled || !map) return;
    var requestId = ++carrilRequestId;
    var bbox = bboxVisible();
    var zoom = map.getZoom();
    if (bbox.east <= bbox.west || bbox.north <= bbox.south) return;
    var ladoKm = Math.max(
      (bbox.east - bbox.west) * 111.32 * Math.cos((bbox.south + bbox.north) / 2 * Math.PI / 180),
      (bbox.north - bbox.south) * 111.32
    );

    // Crear la capa aunque se haga zoom hacia fuera, para evitar que una
    // consulta anterior deje datos en pantalla fuera del área/zoom válido.
    var capaLista = await asegurarCapaCarril();
    if (!capaLista || !carrilEnabled || requestId !== carrilRequestId) return;
    if (zoom < CARRIL_MIN_ZOOM || ladoKm > MAX_KM_OVERBRIDGE) {
      await pintarCarriles([]);
      return;
    }

    var clave = [bbox.west.toFixed(3), bbox.south.toFixed(3), bbox.east.toFixed(3), bbox.north.toFixed(3)].join(':');
    var cached = carrilCache.get(clave);
    if (cached && Date.now() - cached.touched < CARRIL_TTL_MS) {
      await pintarCarriles(cached.features);
      return;
    }

    var falta = 1000 - (Date.now() - carrilUltima);
    if (falta > 0) await esperar(falta);
    if (!carrilEnabled || requestId !== carrilRequestId) return;
    carrilUltima = Date.now();

    try {
      // 1) Proxy propio (caché del Worker). No bloquear la capa más de 3 s.
      var features = await pedirCarriles(OVERPASS_URL, bbox, 3000);
      // 2) Fallback directo del navegador a Overpass.
      if (!features.length) features = await pedirCarriles(OVERPASS_DIRECTO, bbox, 15000);
      if (!features.length) features = await pedirCarriles(OVERPASS_DIRECTO_2, bbox, 15000);
      if (!carrilEnabled || requestId !== carrilRequestId) return;
      // No cachear vacío: un fallo temporal no debe ocultar el carril 15 min.
      if (features.length) {
        carrilCache.set(clave, { features: features, touched: Date.now() });
        while (carrilCache.size > 200) carrilCache.delete(carrilCache.keys().next().value);
      }
      await pintarCarriles(features);
    } catch (e) {
      if (carrilEnabled && requestId === carrilRequestId) {
        console.warn('[rutas-bici] No se pudieron cargar carriles bici:', e);
      }
    }
  }

  var carrilIconoPromise = null;
  function cargarIconoBici() {
    if (!carrilIconoPromise) {
      carrilIconoPromise = new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = reject;
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BICI_ICONO_SVG);
      }).catch(function (error) { carrilIconoPromise = null; throw error; });
    }
    return carrilIconoPromise;
  }

  async function asegurarCapaCarril() {
    if (!map || !map.isStyleLoaded()) return false;
    if (carrilCapaLista && map.getSource(CARRIL_SOURCE) && map.getLayer(CARRIL_ROJO)) return true;
    if (carrilInicializando) {
      for (var intento = 0; intento < 40 && carrilInicializando; intento++) await esperar(50);
      return !!(map && map.isStyleLoaded() && map.getSource(CARRIL_SOURCE) && map.getLayer(CARRIL_ROJO));
    }

    carrilInicializando = true;
    var mapaInicial = map;
    var estiloInicial = map.getStyle();
    
    try {
      // Cargar el icono de bicicleta. El carril rojo no depende del icono.
      try {
        var iconImage = await cargarIconoBici();
        if (map !== mapaInicial || !mapaInicial.isStyleLoaded()) return false;
        if (iconImage && !mapaInicial.hasImage(CARRIL_IMAGEN)) {
          mapaInicial.addImage(CARRIL_IMAGEN, iconImage, { pixelRatio: 1 });
        }
      } catch (iconError) {
        console.warn('[rutas-bici] El icono de bici no cargó; se dibujarán las líneas igualmente.', iconError);
      }
      if (map !== mapaInicial || !mapaInicial.isStyleLoaded()) return false;
      
      // Crear la fuente de datos si no existe
      if (!map.getSource(CARRIL_SOURCE)) {
        map.addSource(CARRIL_SOURCE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          attribution: 'Carriles bici © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Colaboradores de OpenStreetMap</a> (ODbL)'
        });
      }

      // 1. CAPA ROJA DE FONDO (el carril bici rojo)
      if (!map.getLayer(CARRIL_ROJO)) {
        map.addLayer({
          id: CARRIL_ROJO,
          type: 'line',
          source: CARRIL_SOURCE,
          minzoom: CARRIL_MIN_ZOOM,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#E31837', // Rojo carril bici oficial
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 
              10, 2,     // A zoom 10, línea fina
              12, 4,     // A zoom 12
              14, 7,     // A zoom 14, ancho medio
              16, 10,    // A zoom 16
              18, 14,    // A zoom 18, muy ancho
              20, 20     // A zoom 20, máximo ancho
            ],
            'line-opacity': 0.9
          }
        });
      }

      // 2. BORDE BLANCO IZQUIERDO (bandas blancas)
      if (!map.getLayer(CARRIL_BORDE_IZQ)) {
        map.addLayer({
          id: CARRIL_BORDE_IZQ,
          type: 'line',
          source: CARRIL_SOURCE,
          minzoom: CARRIL_MIN_ZOOM,
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 
              10, 0.8,
              12, 1.5,
              14, 2.5,
              16, 3.5,
              18, 5,
              20, 7
            ],
            'line-opacity': 0.95,
            'line-offset': ['interpolate', ['exponential', 1.5], ['zoom'], 
              10, -1.5,
              12, -2.5,
              14, -4,
              16, -5.5,
              18, -8,
              20, -11
            ]
          }
        });
      }

      // 3. BORDE BLANCO DERECHO (bandas blancas)
      if (!map.getLayer(CARRIL_BORDE_DER)) {
        map.addLayer({
          id: CARRIL_BORDE_DER,
          type: 'line',
          source: CARRIL_SOURCE,
          minzoom: CARRIL_MIN_ZOOM,
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 
              10, 0.8,
              12, 1.5,
              14, 2.5,
              16, 3.5,
              18, 5,
              20, 7
            ],
            'line-opacity': 0.95,
            'line-offset': ['interpolate', ['exponential', 1.5], ['zoom'], 
              10, 1.5,
              12, 2.5,
              14, 4,
              16, 5.5,
              18, 8,
              20, 11
            ]
          }
        });
      }

      // 4. CAPA DE SÍMBOLOS DE BICICLETA (cada X metros)
      if (map.hasImage(CARRIL_IMAGEN) && !map.getLayer(CARRIL_SIMBOLO)) {
        map.addLayer({
          id: CARRIL_SIMBOLO,
          type: 'symbol',
          source: CARRIL_SOURCE,
          minzoom: 13, // Los símbolos aparecen desde zoom 13
          layout: {
            'icon-image': CARRIL_IMAGEN,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 
              13, 0.6,   // Pequeño a zoom 13
              15, 0.9,   // Medio a zoom 15
              17, 1.2,   // Grande a zoom 17
              19, 1.5    // Muy grande a zoom 19
            ],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-rotate': 0
          },
          paint: {
            'icon-opacity': 0.95
          }
        });
      }
      
      carrilCapaLista = true;
      return true;
      
    } catch (e) {
      console.error('[rutas-bici] Error inicializando capa de carriles:', e);
      return false;
    } finally {
      carrilInicializando = false;
    }
  }

  async function pintarCarriles(features) {
    if (!carrilEnabled || !map || !map.isStyleLoaded()) return;
    var capaLista = await asegurarCapaCarril();
    if (!capaLista || !carrilEnabled || !map || !map.getSource(CARRIL_SOURCE)) return;
    var lineas = features.filter(function(f) { return f.geometry && f.geometry.type === 'LineString'; });
    var puntosSimbolo = generarPuntosSimbolos(lineas, 100); // cada 100 metros
    map.getSource(CARRIL_SOURCE).setData({ type: 'FeatureCollection', features: lineas.concat(puntosSimbolo) });
  }

  function destroyCarril() {
    carrilRequestId++;
    try {
      [CARRIL_SIMBOLO, CARRIL_BORDE_DER, CARRIL_BORDE_IZQ, CARRIL_ROJO].forEach(function(id) {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(CARRIL_SOURCE)) map.removeSource(CARRIL_SOURCE);
      if (map.hasImage(CARRIL_IMAGEN)) map.removeImage(CARRIL_IMAGEN);
    } catch (e) { /* estilo reemplazado */ }
    carrilCapaLista = false;
    carrilInicializando = false;
  }

  function onCarrilToggle() {
    carrilEnabled = !!(carrilToggle && carrilToggle.checked);
    clearTimeout(carrilTimer);
    if (carrilEnabled) {
      map.off('moveend', scheduleCarril);
      map.on('moveend', scheduleCarril);
      map.off('zoomend', scheduleCarril);
      map.on('zoomend', scheduleCarril);
      cargarCarriles();
    } else {
      map.off('moveend', scheduleCarril);
      map.off('zoomend', scheduleCarril);
      destroyCarril();
    }
  }

  function scheduleCarril() {
    if (!carrilEnabled) return;
    clearTimeout(carrilTimer);
    carrilTimer = setTimeout(cargarCarriles, 350);
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
      // Si se reemplaza el estilo del mapa, MapLibre elimina las fuentes y
      // capas personalizadas: recrearlas y volver a pedir los datos.
      carrilStyleHandler = function () {
        carrilCapaLista = false;
        carrilInicializando = false;
        if (carrilEnabled) {
          clearTimeout(carrilTimer);
          carrilTimer = setTimeout(cargarCarriles, 150);
        }
      };
      map.on('style.load', carrilStyleHandler);
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
