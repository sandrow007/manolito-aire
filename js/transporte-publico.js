/*
 * Capa de transporte público (Transitous) de Manolit∞ Aire.
 *
 * - ADITIVO: no modifica nada de lo existente. Se engancha al mapa por el
 *   hook público window.manolitAireMap, igual que fuentes-agua.js.
 * - Dos "capas" para la persona (España y Global) que, por debajo, usan la
 *   MISMA API pública de Transitous (https://transitous.org/api/): la región
 *   se decide sola por el centro del mapa, sin selector manual. No hay
 *   GTFS propio de España porque el NAP y los operadores exigen registro
 *   para la descarga; Transitous ya agrega los feeds GTFS abiertos.
 * - Muestra las paradas del área visible y, al tocarlas, sus próximas
 *   salidas. No se hace enrutado entre dos puntos (se deja para el módulo
 *   de viaje existente) para no superar el límite amable de /plan.
 * - Política de uso de Transitous: Referer (origin) en cada petición,
 *   caché de 15 min para paradas y 60 s para salidas, debounce al mover el
 *   mapa, y atribución/contacto visibles (en el popup y en el control de
 *   atribución de MapLibre).
 * - Regiones: se decide por el CENTRO del mapa (point-in-polygon) con
 *   histéresis para que no parpadee cerca de una frontera. Fuera de
 *   España siempre Global.
 */
(function () {
  'use strict';

  if (window.__manolitoTransportePublico) return; // doble carga: jamás
  window.__manolitoTransportePublico = true;

  var API_BASE = 'https://api.transitous.org/api';
  var SOURCE_ID = 'transporte-publico-source';
  var HALO_ID = 'transporte-publico-halo';
  var SYMBOL_ID = 'transporte-publico-symbols';
  var IMAGE_ID = 'transporte-publico-icon';
  var MIN_ZOOM = 11;
  var MOVE_DEBOUNCE_MS = 500;
  var STOPS_TTL_MS = 15 * 60 * 1000;
  var DEPARTURES_TTL_MS = 60 * 1000;
  var MAX_STOPS = 400;
  var REGIONS_URL = 'transit-regions.json';

  var ATRIBUCION_GLOBAL =
    'Transporte público vía <a href="https://transitous.org/sources/" target="_blank" rel="noopener">Transitous</a> · ' +
    'Cartografía © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Colaboradores de OpenStreetMap</a> · ' +
    'Contacto: manolitoaire.com';

  var ICONO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">' +
    '<circle cx="13" cy="13" r="12" fill="#35C4D4" stroke="#0E3B47" stroke-width="1.6"/>' +
    '<rect x="6" y="7" width="14" height="9" rx="2.5" fill="none" stroke="#0E3B47" stroke-width="1.5"/>' +
    '<path d="M8 10h7M8 12.5h9" stroke="#0E3B47" stroke-width="1.3" stroke-linecap="round"/>' +
    '<circle cx="9.5" cy="17.5" r="1.3" fill="#ffffff"/>' +
    '<circle cx="16.5" cy="17.5" r="1.3" fill="#ffffff"/>' +
    '</svg>';

  var map = null;
  var toggle = null;
  var enabled = false;
  var mapReady = false;
  var moveTimer = 0;
  var requestRunning = false;
  var refreshQueued = false;
  var generation = 0;
  var svgImagePromise = null;
  var popup = null;
  var regions = [];
  var defaultRegion = 'global';
  var currentRegion = 'global';
  var pendingRegion = null;
  var regionVotes = 0;
  var renderedFeatures = new Map();
  var areaCache = { key: '', bounds: null, features: [], touched: 0 };
  var departuresCache = new Map(); // stopId -> { items, touched }
  var activeControllers = new Set();
  var resolverListo = null;
  var listo = new Promise(function (resolve) { resolverListo = resolve; });

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
      console.debug('[transporte-publico] i18n no disponible, uso fallback:', e);
    }
    return fallback != null ? fallback : clave;
  }

  /* ---------------- Carga de regiones ---------------------------------- */
  function loadRegions() {
    return fetch(REGIONS_URL, { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.regions)) {
          regions = data.regions;
          if (data.defaultRegion) defaultRegion = data.defaultRegion;
        }
        return regions;
      })
      .catch(function () {
        return regions; // sin archivo: todo Global
      });
  }

  /* ---------------- Point-in-polygon (centro del mapa) ------------------ */
  function pointInPolygon(lon, lat, polygon) {
    var inside = false;
    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      var xi = polygon[i][0], yi = polygon[i][1];
      var xj = polygon[j][0], yj = polygon[j][1];
      var intersect = ((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function regionAt(lon, lat) {
    for (var i = 0; i < regions.length; i++) {
      var region = regions[i];
      if (!region.polygons || !region.polygons.length) continue;
      for (var p = 0; p < region.polygons.length; p++) {
        if (pointInPolygon(lon, lat, region.polygons[p])) return region.id;
      }
    }
    return defaultRegion;
  }

  // Las tres regiones de España se presentan como una sola "España" ante la
  // persona, pero el JSON las separa para que los polígonos sean reales.
  function esRegionEspanola(id) {
    return id === 'es-peninsula-baleares' || id === 'es-canarias' || id === 'es-ceuta-melilla';
  }

  function evaluarRegion() {
    var center = map.getCenter();
    var detectada = regionAt(center.lng, center.lat);

    // Automático con histéresis: para cambiar de región hace falta que el
    // centro caiga en la misma región distinta dos evaluaciones seguidas,
    // así no parpadea cerca de una frontera. No hay selector manual.
    var objetivo = detectada;
    if (currentRegion === 'global' || currentRegion === null) {
      currentRegion = objetivo;
      pendingRegion = null;
      regionVotes = 0;
    } else if (objetivo !== currentRegion) {
      if (pendingRegion === objetivo) {
        regionVotes++;
      } else {
        pendingRegion = objetivo;
        regionVotes = 1;
      }
      if (regionVotes >= 2) {
        currentRegion = objetivo;
        pendingRegion = null;
        regionVotes = 0;
      }
    } else {
      pendingRegion = null;
      regionVotes = 0;
    }
  }

  function nombreRegionVisible() {
    var id = esRegionEspanola(currentRegion) ? 'es' : currentRegion;
    if (id === 'es') return t('transportRegionEs', 'España');
    return t('transportRegionGlobal', 'Global');
  }

  /* ---------------- Red -------------------------------------------------- */
  function fetchTransitous(path) {
    var controller = new AbortController();
    activeControllers.add(controller);
    // Transitous pide una cabecera Referer en las peticiones de navegador.
    // `Referer` es una cabecera prohibida en fetch; con referrerPolicy
    // 'origin' el navegador envía automáticamente el origen de la página.
    return fetch(API_BASE + path, {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'origin',
      headers: { 'Accept': 'application/json' }
    }).then(function (response) {
      if (!response.ok) {
        var error = new Error('HTTP ' + response.status);
        error.status = response.status;
        throw error;
      }
      return response.json();
    }).finally(function () {
      activeControllers.delete(controller);
    });
  }

  /* ---------------- Paradas --------------------------------------------- */
  function boundsOfMap() {
    var bounds = map.getBounds();
    return {
      west: Math.max(-180, bounds.getWest()),
      south: Math.max(-85, bounds.getSouth()),
      east: Math.min(180, bounds.getEast()),
      north: Math.min(85, bounds.getNorth())
    };
  }

  function areaKey(bounds) {
    var z = Math.floor(map.getZoom());
    return [
      Math.round(bounds.west * 100),
      Math.round(bounds.south * 100),
      Math.round(bounds.east * 100),
      Math.round(bounds.north * 100),
      z
    ].join(':');
  }

  function placeToFeature(place) {
    if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return null;
    var id = place.stopId != null ? String(place.stopId) : ('stop:' + place.lat + ':' + place.lon);
    return {
      type: 'Feature',
      id: id,
      properties: {
        stopId: place.stopId,
        name: place.name || t('transportStop', 'Parada')
      },
      geometry: { type: 'Point', coordinates: [place.lon, place.lat] }
    };
  }

  function loadStops(bounds) {
    var key = areaKey(bounds);
    var cached = areaCache;
    if (cached.key === key && Date.now() - cached.touched < STOPS_TTL_MS) {
      return Promise.resolve(cached.features);
    }
    // min = sur,este · max = norte,oeste (convención de MOTIS)
    var min = bounds.south.toFixed(6) + ',' + bounds.east.toFixed(6);
    var max = bounds.north.toFixed(6) + ',' + bounds.west.toFixed(6);
    return fetchTransitous('/v6/map/stops?min=' + encodeURIComponent(min) + '&max=' + encodeURIComponent(max))
      .then(function (data) {
        var features = (Array.isArray(data) ? data : [])
          .map(placeToFeature)
          .filter(Boolean)
          .slice(0, MAX_STOPS);
        areaCache = { key: key, bounds: bounds, features: features, touched: Date.now() };
        return features;
      });
  }

  /* ---------------- Salidas --------------------------------------------- */
  function loadDepartures(stopId) {
    var cached = departuresCache.get(stopId);
    if (cached && Date.now() - cached.touched < DEPARTURES_TTL_MS) {
      return Promise.resolve(cached.items);
    }
    return fetchTransitous('/v6/stoptimes?stopId=' + encodeURIComponent(stopId) + '&n=8')
      .then(function (data) {
        var items = (data && Array.isArray(data.stopTimes) ? data.stopTimes : [])
          .map(function (st) {
            var departure = st.place && (st.place.departure || st.place.scheduledDeparture);
            return {
              displayName: st.displayName || st.routeShortName || t('transportLine', 'Línea'),
              headsign: st.headsign || '',
              mode: st.mode || '',
              realTime: !!st.realTime,
              departure: departure || ''
            };
          });
        departuresCache.set(stopId, { items: items, touched: Date.now() });
        while (departuresCache.size > 80) departuresCache.delete(departuresCache.keys().next().value);
        return items;
      });
  }

  function formatDeparture(iso) {
    if (!iso) return '';
    try {
      var date = new Date(iso);
      if (isNaN(date.getTime())) return String(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(iso);
    }
  }

  /* ---------------- Capa gráfica ---------------------------------------- */
  function cargarIcono() {
    if (!svgImagePromise) {
      svgImagePromise = new Promise(function (resolve, reject) {
        var image = new Image();
        image.onload = function () { resolve(image); };
        image.onerror = reject;
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONO_SVG);
      });
      svgImagePromise.catch(function () { svgImagePromise = null; });
    }
    return svgImagePromise;
  }

  function ensureGraphicLayer() {
    if (!enabled || !mapReady || !map.isStyleLoaded()) return Promise.resolve();
    return cargarIcono().then(function (iconImage) {
      if (iconImage && !map.hasImage(IMAGE_ID)) map.addImage(IMAGE_ID, iconImage, { pixelRatio: 1 });
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          attribution: ATRIBUCION_GLOBAL
        });
        renderedFeatures = new Map();
      }
      if (!map.getLayer(HALO_ID)) {
        map.addLayer({
          id: HALO_ID,
          type: 'circle',
          source: SOURCE_ID,
          minzoom: MIN_ZOOM,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 8],
            'circle-color': '#35C4D4',
            'circle-opacity': 0.18
          }
        });
      }
      if (map.hasImage(IMAGE_ID) && !map.getLayer(SYMBOL_ID)) {
        map.addLayer({
          id: SYMBOL_ID,
          type: 'symbol',
          source: SOURCE_ID,
          minzoom: MIN_ZOOM,
          layout: {
            'icon-image': IMAGE_ID,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.55, 17, 0.85],
            'icon-anchor': 'bottom',
            'icon-offset': [0, -2],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });
      }
    });
  }

  function destroyGraphicLayer() {
    try {
      [SYMBOL_ID, HALO_ID].forEach(function (id) { if (map.getLayer(id)) map.removeLayer(id); });
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      if (map.hasImage(IMAGE_ID)) map.removeImage(IMAGE_ID);
    } catch (e) { /* ya liberado */ }
    renderedFeatures = new Map();
    if (popup) { try { popup.remove(); } catch (e) { /* sin popup */ } popup = null; }
  }

  function aplicarFeatures(features) {
    var source = map.getSource(SOURCE_ID);
    if (!source) return;
    var next = new Map(features.map(function (f) { return [String(f.id), f]; }));
    var igual = next.size === renderedFeatures.size;
    if (igual) {
      for (var k of next.keys()) { // eslint-disable-line no-unused-vars
        if (!renderedFeatures.has(k)) { igual = false; break; }
      }
    }
    if (igual) return;
    renderedFeatures = next;
    source.setData({ type: 'FeatureCollection', features: Array.from(next.values()) });
  }

  function mostrarEstado(texto) {
    var status = document.getElementById('rsStatus');
    if (status) status.textContent = texto;
  }

  /* ---------------- Refresco -------------------------------------------- */
  function cancelarPeticiones() {
    generation++;
    requestRunning = false;
    refreshQueued = false;
    activeControllers.forEach(function (c) { c.abort(); });
    activeControllers.clear();
  }

  function refreshCurrentView() {
    if (!enabled || !mapReady) return;
    if (!map.getSource(SOURCE_ID)) {
      ensureGraphicLayer().then(function () {
        if (enabled && map.getSource(SOURCE_ID)) refreshCurrentView();
      });
      return;
    }
    if (map.getZoom() < MIN_ZOOM) {
      if (requestRunning) cancelarPeticiones();
      return;
    }

    evaluarRegion();
    var bounds = boundsOfMap();
    var requestGeneration = generation;
    requestRunning = true;

    loadStops(bounds).then(function (features) {
      if (!enabled || requestGeneration !== generation) return;
      aplicarFeatures(features);
      if (!features.length) {
        mostrarEstado(t('transportNoData', 'Sin datos de transporte público en esta zona.'));
      } else {
        mostrarEstado(t('transportStatus', 'Transporte público: ') + nombreRegionVisible() + ' · ' +
          t('transportStopsCount', '{n} paradas').replace('{n}', String(features.length)));
      }
    }).catch(function (error) {
      if (!enabled || requestGeneration !== generation) return;
      if (error && error.name === 'AbortError') return;
      console.debug('[transporte-publico] La API de Transitous no está disponible:', error);
      mostrarEstado(t('transportError', 'No se pudo consultar el transporte público.'));
    }).finally(function () {
      if (requestGeneration !== generation) return;
      requestRunning = false;
      if (enabled && refreshQueued) {
        refreshQueued = false;
        refreshCurrentView();
      }
    });
  }

  function scheduleRefresh() {
    if (!enabled) return;
    window.clearTimeout(moveTimer);
    moveTimer = window.setTimeout(refreshCurrentView, MOVE_DEBOUNCE_MS);
  }

  /* ---------------- Popup de salidas ------------------------------------ */
  function onMapClick(event) {
    if (!enabled || typeof maplibregl === 'undefined') return;
    var capas = [SYMBOL_ID, HALO_ID].filter(function (id) { return map.getLayer(id); });
    if (!capas.length) return;
    var encontradas = map.queryRenderedFeatures(event.point, { layers: capas });
    if (!encontradas.length) return;
    var feature = encontradas[0];
    var props = feature.properties || {};
    var coords = feature.geometry && feature.geometry.coordinates;
    if (!coords || coords.length < 2 || props.stopId == null) return;

    var caja = document.createElement('div');
    caja.style.cssText = 'font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0D1F26;max-width:260px;';
    var titulo = document.createElement('strong');
    titulo.textContent = props.name || t('transportStop', 'Parada');
    caja.appendChild(titulo);

    var cuerpo = document.createElement('div');
    cuerpo.style.cssText = 'margin-top:6px;';
    cuerpo.textContent = t('transportLoading', 'Cargando salidas…');
    caja.appendChild(cuerpo);

    var fuente = document.createElement('small');
    fuente.style.cssText = 'display:block;margin-top:8px;opacity:0.72;';
    fuente.innerHTML = ATRIBUCION_GLOBAL;
    caja.appendChild(fuente);

    if (popup) { try { popup.remove(); } catch (e) { /* sin popup */ } }
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '280px', offset: 10 })
      .setLngLat([coords[0], coords[1]])
      .setDOMContent(caja)
      .addTo(map);

    loadDepartures(String(props.stopId)).then(function (items) {
      cuerpo.textContent = '';
      if (!items.length) {
        cuerpo.textContent = t('transportNoDepartures', 'Sin salidas próximas.');
        return;
      }
      var lista = document.createElement('ul');
      lista.style.cssText = 'margin:6px 0 0;padding:0;list-style:none;';
      items.forEach(function (item) {
        var li = document.createElement('li');
        li.style.cssText = 'display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(14,59,71,0.12);';
        var nombre = document.createElement('span');
        nombre.textContent = (item.displayName || '') + (item.headsign ? ' → ' + item.headsign : '');
        var hora = document.createElement('span');
        hora.style.cssText = 'font-variant-numeric:tabular-nums;white-space:nowrap;';
        hora.textContent = item.realTime ? '● ' + formatDeparture(item.departure) : formatDeparture(item.departure);
        li.appendChild(nombre);
        li.appendChild(hora);
        lista.appendChild(li);
      });
      cuerpo.appendChild(lista);
    }).catch(function (error) {
      if (error && error.name === 'AbortError') return;
      cuerpo.textContent = t('transportError', 'No se pudo consultar el transporte público.');
    });
  }

  /* ---------------- Ciclo de vida --------------------------------------- */
  function activate() {
    if (enabled) return;
    enabled = true;
    generation++;
    if (!mapReady && map.isStyleLoaded()) mapReady = true;
    map.on('move', scheduleRefresh);
    map.on('moveend', scheduleRefresh);
    map.on('click', onMapClick);
    if (mapReady) ensureGraphicLayer().then(refreshCurrentView);
  }

  function deactivate() {
    enabled = false;
    cancelarPeticiones();
    window.clearTimeout(moveTimer);
    map.off('move', scheduleRefresh);
    map.off('moveend', scheduleRefresh);
    map.off('click', onMapClick);
    destroyGraphicLayer();
    mostrarEstado('');
  }

  function iniciar(mapa, interruptor) {
    map = mapa;
    toggle = interruptor;

    toggle.addEventListener('change', function () {
      if (toggle.checked) activate();
      else deactivate();
    });

    map.on('load', function () {
      mapReady = true;
      if (enabled) ensureGraphicLayer().then(refreshCurrentView);
    });
    map.on('style.load', function () {
      if (!enabled) return;
      renderedFeatures = new Map();
      ensureGraphicLayer().then(refreshCurrentView);
    });

    loadRegions();

    if (map.isStyleLoaded()) mapReady = true;
    if (toggle.checked) activate();
    if (resolverListo) resolverListo();
  }

  (function esperarMapa(intentos) {
    try {
      var mapa = window.manolitAireMap;
      var interruptor = document.getElementById('rsToggleTransporte');
      if (mapa && interruptor) {
        iniciar(mapa, interruptor);
        return;
      }
    } catch (error) {
      console.debug('[transporte-publico] Error al enganchar el mapa:', error);
    }
    if (intentos < 240) window.setTimeout(function () { esperarMapa(intentos + 1); }, 500);
  })(0);
})();
