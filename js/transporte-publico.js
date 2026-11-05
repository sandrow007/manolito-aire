(() => {
  'use strict';
  if (window.__manolitoTransportePublico) return;
  window.__manolitoTransportePublico = true;

  // Todas las peticiones de transporte pasan por el Worker del mismo origen.
  // Así se evita CORS y esta capa no hace peticiones externas alternativas.
  const SOURCE = 'transporte-publico-source';
  const HALO = 'transporte-publico-halo';
  const SYMBOL = 'transporte-publico-symbols';
  const IMAGE = 'transporte-publico-icon';
  const MIN_ZOOM = 12.5;
  const MAX_CELLS_PER_REFRESH = 24;
  const MAX_AUTO_STEPS = 12;
  const CACHE_MS = 15 * 60 * 1000;
  // 01-nov-2026: 0,19° por eje como máximo por petición. Con la rejilla de
  // 0,02° ninguna vista supera las 400 celdas; antes (0,35) una pantalla
  // grande a zoom bajo devolvía 0 celdas y no se pedía ninguna parada.
  const MAX_BBOX_SPAN = 0.19;
  const GRID_DEGREES = 0.02;
  const MAX_CELLS_PER_QUERY = 36;
  const ATTRIBUTION = '© <a href="https://transitous.org" target="_blank" rel="noopener">Transitous</a> · OpenStreetMap contributors';
  // Icono de parada con la identidad Manolit∞: la vesica roja-neón de
  // siempre (variante "pin direccional" del protocolo de diseño, punta
  // hacia abajo apoyada en la coordenada real), con un autobús esquemático
  // en cian donde el logo lleva el círculo y el infinito.
  const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="42" viewBox="0 0 24 42">' +
    '<defs><filter id="tpBusGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
    '<g transform="translate(-3.4,-3.6) scale(.1538)" filter="url(#tpBusGlow)">' +
    '<path d="M100,30 C30,110 30,210 100,290 C170,210 170,110 100,30 Z" fill="rgba(8,12,20,0.92)" stroke="#ff2a4b" stroke-width="11" stroke-linejoin="round"/>' +
    '<rect x="63" y="122" width="74" height="50" rx="16" fill="none" stroke="#00e5ff" stroke-width="10"/>' +
    '<circle cx="80" cy="176" r="11" fill="#00e5ff"/>' +
    '<circle cx="120" cy="176" r="11" fill="#00e5ff"/>' +
    '</g></svg>';

  let map = null;
  let toggle = null;
  let enabled = false;
  let ready = false;
  let generation = 0;
  let moveTimer = 0;
  let imagePromise = null;
  let popup = null;
  let areaCache = { key: '', features: [], touched: 0 };
  let lastFailedAt = 0;
  const stopCellCache = new Map();
  const controllers = new Set();
  let regions = [];
  let currentRegion = 'global';
  let requestRunning = false;
  let refreshQueued = false;
  let autoSteps = 0;
  let retryTimer = 0;
  let searchToken = 0;

  function t(key, fallback) {
    try {
      const messages = typeof window.getMessages === 'function' ? window.getMessages() : null;
      if (messages && messages[key] != null) return messages[key];
    } catch (error) {
      console.debug('[transporte-publico] No se pudieron cargar las traducciones:', error);
    }
    return fallback == null ? key : fallback;
  }

  function pointInPolygon(lon, lat, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      if (((yi > lat) !== (yj > lat)) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function regionAt(lon, lat) {
    for (const region of regions) {
      const polygons = Array.isArray(region.polygons) ? region.polygons : [];
      for (const polygon of polygons) {
        if (pointInPolygon(lon, lat, polygon)) return region.id;
      }
    }
    return 'global';
  }

  function evaluateRegion() {
    const center = map.getCenter();
    currentRegion = regionAt(center.lng, center.lat);
  }

  function boundsOfMap() {
    const b = map.getBounds();
    return { west: b.getWest(), south: Math.max(-85, b.getSouth()), east: b.getEast(), north: Math.min(85, b.getNorth()) };
  }

  function cacheKey(b) {
    return [b.west, b.south, b.east, b.north].map(v => Math.round(v * 10000)).join(':');
  }

  function boundsForRequest(bounds) {
    const centerLat = (bounds.south + bounds.north) / 2;
    const centerLon = (bounds.west + bounds.east) / 2;
    const halfLat = Math.min((bounds.north - bounds.south) / 2, MAX_BBOX_SPAN);
    const halfLon = Math.min((bounds.east - bounds.west) / 2, MAX_BBOX_SPAN);
    return {
      west: Math.max(-180, centerLon - halfLon), east: Math.min(180, centerLon + halfLon),
      south: Math.max(-85, centerLat - halfLat), north: Math.min(85, centerLat + halfLat)
    };
  }

  function requestCells(bounds) {
    const cellSize = GRID_DEGREES;
    const minX = Math.floor(bounds.west / cellSize);
    const maxX = Math.ceil(bounds.east / cellSize) - 1;
    const minY = Math.floor(bounds.south / cellSize);
    const maxY = Math.ceil(bounds.north / cellSize) - 1;
    const count = (maxX - minX + 1) * (maxY - minY + 1);
    if (count < 1 || count > 400) return [];
    const cells = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push({
          x, y, key: x + ':' + y,
          west: Math.max(bounds.west, x * cellSize), east: Math.min(bounds.east, (x + 1) * cellSize),
          south: Math.max(bounds.south, y * cellSize), north: Math.min(bounds.north, (y + 1) * cellSize)
        });
      }
    }
    return cells;
  }



  function toFeature(place) {
    if (!place) return null;
    // Overpass devuelve las coordenadas OSM como latitud y longitud numéricas.
    const coordinates = place.geometry && Array.isArray(place.geometry.coordinates) ? place.geometry.coordinates : null;
    const latRaw = place.lat != null ? place.lat : (place.latitude != null ? place.latitude : (coordinates ? coordinates[1] : null));
    const lonRaw = place.lon != null ? place.lon : (place.longitude != null ? place.longitude : (coordinates ? coordinates[0] : null));
    const lat = Number(typeof latRaw === 'string' ? latRaw.replace(',', '.') : latRaw);
    const lon = Number(typeof lonRaw === 'string' ? lonRaw.replace(',', '.') : lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    const stopId = place.stopId != null ? place.stopId : (place.id != null ? place.id : null);
    const props = place.properties || {};
    const name = place.name || place['name:es'] || place.tags && (place.tags.name || place.tags['name:es']) || props.name || t('transportStop', 'Parada');
    return {
      type: 'Feature',
      id: stopId != null ? String(stopId) : 'stop:' + lat + ':' + lon,
      properties: { stopId: stopId, name: name, source: 'osm' },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    };
  }

  async function fetchJson(url, credentials, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    controllers.add(controller);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store', credentials: credentials, headers: { Accept: 'application/json' } });
      if (!response.ok) {
        let detail = '';
        try { const body = await response.json(); detail = body && (body.detail || body.error) || ''; } catch (error) { /* respuesta de error no JSON */ }
        throw new Error('HTTP ' + response.status + (detail ? ': ' + detail : ''));
      }
      return await response.json();
    } finally { clearTimeout(timer); controllers.delete(controller); }
  }

  async function fetchApi(path) {
    try {
      return await fetchJson(path, 'same-origin', 15000);
    } catch (error) {
      try {
        const names = await window.caches.keys();
        for (const name of names) {
          if (name.indexOf('manolito-dinamica-') !== 0) continue;
          const cached = await (await window.caches.open(name)).match(new URL(path, window.location.href).toString());
          if (cached && cached.ok) return cached.json();
        }
      } catch (cacheError) { /* la caché SW puede no estar disponible */ }
      throw error;
    }
  }

  function withTimeout(promise, timeoutMs) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout consultando Overpass')), timeoutMs); })
    ]).finally(() => clearTimeout(timer));
  }

  // Respaldo: si el Worker falla o devuelve vacío (no desplegado, Overpass
  // bloqueando a Cloudflare...), el navegador consulta OpenStreetMap/Overpass
  // directamente con la misma consulta. Overpass admite CORS.
  const OVERPASS_DIRECTOS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  async function fetchParadasDirecto(b) {
    const bbox = [b.south, b.west, b.north, b.east].map(v => Number(v).toFixed(6)).join(',');
    const consulta = '[out:json][timeout:20];(' +
      'node["highway"="bus_stop"](' + bbox + ');' +
      'node["public_transport"="platform"](' + bbox + ');' +
      'way["public_transport"="platform"](' + bbox + ');' +
      'relation["public_transport"="platform"](' + bbox + ');' +
      'node["railway"="tram_stop"](' + bbox + ');' +
      'nwr["public_transport"="station"](' + bbox + ');' +
      'nwr["amenity"="bus_station"](' + bbox + ');' +
      'nwr["railway"="station"](' + bbox + ');' +
      ');out center qt;';
    const intentar = async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      controllers.add(controller);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: new URLSearchParams({ data: consulta }).toString(),
          credentials: 'omit',
          signal: controller.signal
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const datos = await response.json();
        if (!datos || !Array.isArray(datos.elements)) throw new Error('respuesta inválida');
        const ts = datos.osm3s && datos.osm3s.timestamp_osm_base;
        if (!datos.elements.length && typeof ts === 'string' && ts !== '' && ts.indexOf('T') === -1) throw new Error('espejo corrupto');
        return datos.elements;
      } finally { clearTimeout(timer); controllers.delete(controller); }
    };
    const elementos = await Promise.any(OVERPASS_DIRECTOS.map(intentar));
    return elementos.map(el => {
      const punto = el.type === 'node' ? el : el.center;
      if (!punto || !Number.isFinite(punto.lat) || !Number.isFinite(punto.lon)) return null;
      const tags = el.tags || {};
      return { name: tags.name || tags['name:es'] || 'Parada', lat: punto.lat, lon: punto.lon, stopId: 'osm:' + el.type + ':' + el.id };
    }).filter(Boolean);
  }

  // Núcleo de descarga (01-nov-2026). Antes era una cadena: primero el
  // Worker (hasta 25 s), luego Transitous directo, luego Overpass directo.
  // Con los espejos Overpass rechazando al proxy (406 y timeouts) la primera
  // parada podía tardar medio minuto en aparecer. Ahora el Worker y
  // Transitous directo compiten EN PARALELO (gana el primero que traiga
  // datos, el patrón de la capa de fuentes de agua) y Overpass directo
  // queda como respaldo mundial cuando ninguno de los dos tiene nada.
  async function pedirParadas(batchBounds) {
    const min = batchBounds.south.toFixed(6) + ',' + batchBounds.west.toFixed(6);
    const max = batchBounds.north.toFixed(6) + ',' + batchBounds.east.toFixed(6);
    const query = '?min=' + encodeURIComponent(min) + '&max=' + encodeURIComponent(max);
    // Transitous directo desde el navegador (CORS abierto y rápido). El
    // stopId se normaliza con prefijo "tt:" para que la tarjeta de la
    // parada sepa que esa parada tiene horarios GTFS.
    const prefijarTt = (lista) => lista.map(p => (p && p.stopId != null && String(p.stopId).indexOf('tt:') !== 0)
      ? Object.assign({}, p, { stopId: 'tt:' + p.stopId })
      : p);
    const delWorker = withTimeout(fetchApi('/transporte-paradas' + query), 20000)
      .then(d => Array.isArray(d) ? d : (d && (Array.isArray(d.stops) ? d.stops : Array.isArray(d.features) ? d.features : Array.isArray(d.elements) ? d.elements : null)) || [])
      .catch(error => { console.debug('[transporte-publico] Worker falló, compiten Transitous y Overpass:', error); return null; });
    const deTransitous = withTimeout(fetchJson('https://api.transitous.org/api/v1/map/stops' + query, 'omit', 12000), 15000)
      .then(d => Array.isArray(d) ? prefijarTt(d) : [])
      .catch(error => { console.debug('[transporte-publico] Transitous directo falló:', error); return null; });
    // Promise.any ignora los rechazos: un vacío NO gana, solo gana traer datos.
    const conDatos = (d) => (d && d.length) ? d : Promise.reject(new Error('sin datos'));
    let raw = await Promise.any([delWorker.then(conDatos), deTransitous.then(conDatos)]).catch(() => null);
    if (!enabled || !map) return [];
    if (!raw) {
      // Ni Worker ni Transitous trajeron nada: respaldo mundial OSM.
      try {
        raw = await withTimeout(fetchParadasDirecto(batchBounds), 22000);
        if (!enabled || !map) return [];
        console.debug('[transporte-publico] Overpass directo devolvió', raw.length, 'elementos para', batchBounds);
      } catch (errorDirecto) {
        console.debug('[transporte-publico] Overpass directo también falló:', errorDirecto);
        const [w, tt] = await Promise.all([delWorker, deTransitous]);
        if (Array.isArray(w) || Array.isArray(tt)) {
          // Algún servicio respondió de verdad: la zona está vacía, no caída.
          raw = (w && w.length ? w : null) || (tt && tt.length ? tt : null) || [];
        } else {
          throw errorDirecto; // todo caído a la vez: la lógica de refresh reintenta
        }
      }
    }
    return raw;
  }

  async function loadStops(bounds) {
    bounds = boundsForRequest(bounds);
    const key = cacheKey(bounds);
    const cells = requestCells(bounds);
    if (!cells.length) return areaCache.features;
    const collection = [];
    cells.forEach(cell => {
      const cached = stopCellCache.get(cell.key);
      if (cached && Date.now() - cached.touched < CACHE_MS) collection.push(...cached.places);
    });
    const pending = cells.filter(cell => {
      const cached = stopCellCache.get(cell.key);
      return !cached || Date.now() - cached.touched >= CACHE_MS;
    });
    const selected = pending.slice(0, MAX_CELLS_PER_REFRESH);
    for (let i = 0; i < selected.length; i += MAX_CELLS_PER_QUERY) {
      const batch = selected.slice(i, i + MAX_CELLS_PER_QUERY);
      const batchBounds = {
        west: Math.max(bounds.west, Math.min(...batch.map(cell => cell.west))),
        east: Math.min(bounds.east, Math.max(...batch.map(cell => cell.east))),
        south: Math.max(bounds.south, Math.min(...batch.map(cell => cell.south))),
        north: Math.min(bounds.north, Math.max(...batch.map(cell => cell.north)))
      };
      const raw = await pedirParadas(batchBounds);
      if (!enabled || !map) return [];
      const data = Array.isArray(raw) ? raw
        : Array.isArray(raw && raw.stops) ? raw.stops
        : Array.isArray(raw && raw.features) ? raw.features
        : Array.isArray(raw && raw.elements) ? raw.elements
        : null;
      if (!data) throw new Error('El servicio de paradas devolvió una respuesta inválida');
      const placesByCell = new Map(batch.map(cell => [cell.key, []]));
      data.forEach(place => {
        const feature = toFeature(place);
        if (!feature) return;
        const coordinates = feature.geometry.coordinates;
        const cellKey = Math.floor(coordinates[0] / GRID_DEGREES) + ':' + Math.floor(coordinates[1] / GRID_DEGREES);
        if (placesByCell.has(cellKey)) placesByCell.get(cellKey).push(place);
      });
      batch.forEach(cell => {
        const places = placesByCell.get(cell.key) || [];
        stopCellCache.set(cell.key, { places, touched: Date.now() });
        collection.push(...places);
      });
    }
    const unique = new Map();
    collection.map(toFeature).filter(Boolean).forEach(feature => unique.set(String(feature.id), feature));
    const features = Array.from(unique.values()).slice(0, 3000);
    areaCache = { key, features, touched: Date.now() };
    lastFailedAt = 0;
    return features;
  }

  function loadIcon() {
    if (!imagePromise) imagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICON_SVG);
    }).catch(error => { imagePromise = null; throw error; });
    return imagePromise;
  }

    // Espera a que el estilo esté listo. Si el toggle se activa nada más
  // arrancar (o justo tras un style.load), isStyleLoaded() aún es false.
  // Antes se esperaba a UN solo evento 'idle' con tope de 4 s: si ese evento
  // se perdía o el estilo tardaba más, la capa no se creaba nunca y no
  // aparecía ningún punto. 01-nov-2026: sondeo cada 250 ms + escucha de
  // 'idle' durante hasta 15 s, lo primero que confirme el estilo gana.
  function esperarEstilo() {
    if (!map) return Promise.resolve(false);
    if (map.isStyleLoaded()) return Promise.resolve(true);
    return new Promise(resolve => {
      let hecho = false;
      const t0 = Date.now();
      const fin = (ok) => {
        if (hecho) return;
        hecho = true;
        clearInterval(sondeo);
        clearTimeout(temporizador);
        try { map.off('idle', alOcio); } catch (error) { /* sin mapa */ }
        resolve(!!(ok && map && map.isStyleLoaded()));
      };
      const alOcio = () => { if (map && map.isStyleLoaded()) fin(true); };
      const sondeo = setInterval(() => {
        if (!map) return fin(false);
        if (map.isStyleLoaded()) return fin(true);
        if (Date.now() - t0 > 15000) fin(false);
      }, 250);
      const temporizador = setTimeout(() => fin(!!map && map.isStyleLoaded()), 15000);
      try { map.on('idle', alOcio); } catch (error) { /* sin mapa */ }
    });
  }

  async function ensureLayers() {
    if (!await esperarEstilo()) return false;
    if (map.getSource(SOURCE) && map.getLayer(SYMBOL) && map.getLayer(HALO)) {
      map.moveLayer(HALO);
      map.moveLayer(SYMBOL);
      return true;
    }
    const targetMap = map;
    const icon = await loadIcon();
    if (map !== targetMap || !targetMap.isStyleLoaded()) return false;
    if (!targetMap.hasImage(IMAGE)) targetMap.addImage(IMAGE, icon, { pixelRatio: 1 });
    if (!targetMap.getSource(SOURCE)) targetMap.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: ATTRIBUTION });
    if (!targetMap.getLayer(HALO)) targetMap.addLayer({ id: HALO, type: 'circle', source: SOURCE, minzoom: MIN_ZOOM, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12.5, 5, 16, 10], 'circle-color': '#35C4D4', 'circle-opacity': 0.75, 'circle-stroke-width': 2, 'circle-stroke-color': '#0E3B47' } });
    if (!targetMap.getLayer(SYMBOL)) targetMap.addLayer({ id: SYMBOL, type: 'symbol', source: SOURCE, minzoom: MIN_ZOOM, layout: { 'icon-image': IMAGE, 'icon-size': ['interpolate', ['linear'], ['zoom'], 12.5, 0.75, 17, 1.05], 'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
    targetMap.moveLayer(HALO);
    targetMap.moveLayer(SYMBOL);
    return true;
  }

  function showStatus(text) { const el = document.getElementById('rsStatus'); if (el) el.textContent = text; }

  function programarSiguientePaso(ms) {
    if (!enabled || autoSteps >= MAX_AUTO_STEPS) return;
    autoSteps++;
    clearTimeout(retryTimer);
    retryTimer = window.setTimeout(refresh, ms);
  }

  async function refresh() {
    if (!enabled || !map) return;
    if (!ready) {
      // El estilo aún cargaba al activar la capa: esperar a que termine en
      // vez de rendirse (01-nov-2026, capa que se encendía y no pintaba).
      const listo = await esperarEstilo();
      if (!enabled) return;
      // Si el estilo sigue cargando tras la espera, se reintenta solo
      // (hasta MAX_AUTO_STEPS veces) en lugar de quedarse mudo.
      if (!listo) { programarSiguientePaso(2000); return; }
      ready = true;
    }
    if (requestRunning) { refreshQueued = true; return; }
    requestRunning = true;
    const currentGeneration = generation;
    try {
      // Espera a que se cargue el JSON de regiones antes de consultar la zona;
      // la carga inicial es asíncrona y puede coincidir con el primer refresh.
      if (!regions.length) {
        try {
          const response = await fetch('transit-regions.json', { cache: 'no-store', credentials: 'same-origin' });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.regions)) regions = data.regions;
          }
        } catch (error) { console.debug('[transporte-publico] No se pudieron cargar las regiones:', error); }
      }
            evaluateRegion();
      // Aseguramos la capa ANTES de pedir datos: si el estilo aún cargaba,
      // ensureLayers ahora espera en vez de fallar y descargamos los puntos
      // directamente a la fuente ya creada.
      const capaLista = await ensureLayers();
      if (!enabled || currentGeneration !== generation) return;
      if (!capaLista) {
        showStatus(t('transportLoading', 'Cargando paradas…'));
        refreshQueued = true;
      } else if (map.getZoom() < MIN_ZOOM) {
        showStatus(t('transportZoom', 'Acércate para ver las paradas de transporte público.'));
      } else {
        const visibleBounds = boundsOfMap();
        const requestedBounds = boundsForRequest(visibleBounds);
        const features = await loadStops(visibleBounds);
        if (!enabled || currentGeneration !== generation) return;
        const source = map.getSource(SOURCE);
        if (source) source.setData({ type: 'FeatureCollection', features });
        areaCache = { key: cacheKey(requestedBounds), features, touched: Date.now() };
        const quedanCeldas = requestCells(requestedBounds).some(cell => {
          const cached = stopCellCache.get(cell.key);
          return !cached || Date.now() - cached.touched >= CACHE_MS;
        });
        const esEspana = currentRegion.indexOf('es-') === 0;
        showStatus(features.length ? t('transportStatus', 'Transporte público: ') + (esEspana ? 'España' : 'Global') + ' · ' + features.length + ' paradas (' + (esEspana ? 'Transitous + OSM' : 'OSM') + ')' : (quedanCeldas ? 'Cargando paradas cercanas…' : t('transportNoData', 'Sin datos de transporte público en esta zona.')));
        if (quedanCeldas) refreshQueued = true;
        else autoSteps = 0;
      }
    } catch (error) {
      if (enabled && currentGeneration === generation && error.name !== 'AbortError') {
        console.debug('[transporte-publico] No se pudieron cargar paradas:', error);
        showStatus(t('transportError', 'No se pudo consultar el transporte público.'));
        lastFailedAt = Date.now();
      }
    }
    if (currentGeneration === generation) {
      requestRunning = false;
      if (enabled && refreshQueued) {
        refreshQueued = false;
        if (lastFailedAt && Date.now() - lastFailedAt < 30000) {
          programarSiguientePaso(Math.max(5000, 30000 - (Date.now() - lastFailedAt)));
        } else {
          programarSiguientePaso(250);
        }
      } else if (enabled && map.getZoom() >= MIN_ZOOM && !areaCache.features.length && Date.now() - lastFailedAt >= 30000) {
        programarSiguientePaso(5000);
      }
    }
  }



  // ---- Tarjeta visual de la parada (antes vivía en js/transporte-tarjeta.js;
  // ese archivo se retiró al "unificar" y las funciones se quedaron huérfanas
  // (window.ManolitoTransporteTarjeta nunca se definía) así que el click en
  // una parada no hacía nada. Ahora van aquí dentro, sin depender de nadie.



  function crearTarjetaParada(props, alPulsarComoLlegar) {
    const box = document.createElement('div');
    box.className = 'tp-stop-card';
    const handle = document.createElement('div'); handle.className = 'tp-sheet-handle';
    const header = document.createElement('div'); header.className = 'tp-stop-header';
    const headingWrap = document.createElement('div');
    const eyebrow = document.createElement('span'); eyebrow.className = 'tp-eyebrow'; eyebrow.textContent = t('transportStopLabel', 'PARADA');
    const title = document.createElement('strong'); title.className = 'tp-stop-title'; title.textContent = props.name || t('transportStop', 'Parada');
    headingWrap.append(eyebrow, title);
    const directions = document.createElement('button'); directions.type = 'button'; directions.className = 'tp-directions';
    directions.setAttribute('aria-label', t('transportDirections', 'Cómo llegar'));
    directions.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2 2 9.5l7 2.5 2.5 7L19 2z"/></svg>' +
      '<span>' + t('transportDirections', 'Cómo llegar') + '</span>';
    directions.addEventListener('click', alPulsarComoLlegar);
    header.append(headingWrap, directions);
    const body = document.createElement('div'); body.className = 'tp-departures'; body.textContent = t('transportLoading', 'Cargando salidas…');
    box.append(handle, header, body);
    return { box, body };
  }

  function onMapClick(event) {
    if (!enabled || typeof maplibregl === 'undefined') return;
    const layers = [SYMBOL, HALO].filter(id => map.getLayer(id));
    if (!layers.length) return;
    const matches = map.queryRenderedFeatures(event.point, { layers });
    const feature = matches.find(item => item.properties && item.properties.stopId != null);
    if (!feature) return;
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    const esTransitous = /^tt:/.test(String(props.stopId || ''));
    const tarjetaParada = crearTarjetaParada(props, () => {
      const destination = { lon: Number(coords[0]), lat: Number(coords[1]), nombre: props.name || t('transportStop', 'Parada') };
      const routeToggle = document.getElementById('rsToggleRuta');
      const destinationInput = document.getElementById('rsDestino');
      if (routeToggle && !routeToggle.checked) routeToggle.click();
      if (destinationInput) destinationInput.value = destination.nombre;
      if (typeof window.manolitAireCalcularRutaParada === 'function') {
        window.manolitAireCalcularRutaParada(destination).catch(error => console.debug('[transporte-publico] No se pudo calcular la ruta:', error));
      } else {
        map.easeTo({ center: coords, zoom: Math.max(15, map.getZoom()), duration: 700 });
      }
    });
    const box = tarjetaParada.box;
    const body = tarjetaParada.body;
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '320px', offset: 12, className: 'tp-map-popup' }).setLngLat(coords).setDOMContent(box).addTo(map);
    if (!esTransitous) {
      body.textContent = t('transportNoSchedules', 'Parada de OpenStreetMap. No hay horarios GTFS disponibles.');
      return;
    }
    // Las salidas se piden por stopId (una petición pequeña), no por vista
    // del mapa: no hace falta acercarse para consultarlas.
    cargarSalidas(String(props.stopId), body);
  }

  function formatoHora(fechaIso) {
    try {
      const d = new Date(fechaIso);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (error) { return ''; }
  }

  // Cuenta atrás tipo Google Maps/iOS: "en 12 min" o "en 1 h 20 min" junto
  // a la hora exacta. Si ya ha pasado no se enseña (la fila ya se atenúa
  // con la clase is-past).
  function formatoCuentaAtras(timestamp) {
    if (!Number.isFinite(timestamp)) return '';
    const minutos = Math.round((timestamp - Date.now()) / 60000);
    if (minutos <= 0) return t('transportArrivingNow', 'Llegando ahora');
    if (minutos < 60) return t('transportInMin', 'en {min} min').replace('{min}', minutos);
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return t('transportInHours', 'en {h} h {min} min').replace('{h}', horas).replace('{min}', resto);
  }

  function pintarSalidas(body, items) {
    body.textContent = '';
    if (!items.length) { body.textContent = t('transportNoSchedules', 'No hay próximas salidas disponibles.'); return; }
    const lista = document.createElement('ul');
    lista.className = 'tp-departure-list';
    const ahora = Date.now();
    items.forEach(item => {
      const li = document.createElement('li');
      const esPasado = !!(item.timestamp && item.timestamp < ahora);
      li.className = 'tp-departure' + (esPasado ? ' is-past' : '');
      const linea = document.createElement('span'); linea.className = 'tp-line-name'; linea.textContent = item.linea || item.nombre || t('transportStop', 'Línea');
      const horaWrap = document.createElement('span'); horaWrap.className = 'tp-time-wrap';
      const hora = document.createElement('span'); hora.className = 'tp-time' + (item.tiempoReal ? ' is-realtime' : ''); hora.textContent = item.hora || '--:--';
      horaWrap.appendChild(hora);
      if (!esPasado && item.timestamp) {
        const cuenta = document.createElement('span'); cuenta.className = 'tp-countdown'; cuenta.textContent = formatoCuentaAtras(item.timestamp);
        horaWrap.appendChild(cuenta);
      }
      li.append(linea, horaWrap);
      lista.appendChild(li);
    });
    body.appendChild(lista);
  }

  async function cargarSalidas(stopId, body) {
    body.textContent = t('transportLoading', 'Cargando salidas…');
    try {
      let data = null;
      try {
        data = await withTimeout(fetchApi('/transporte-salidas?stopId=' + encodeURIComponent(stopId) + '&n=8'), 15000);
      } catch (errorProxy) {
        console.debug('[transporte-publico] El proxy de salidas falló, se prueba Transitous directo:', errorProxy);
      }
      let crudos = data && (Array.isArray(data.stopTimes) ? data.stopTimes : (Array.isArray(data) ? data : []));
      // Respaldo directo: si el proxy devolvió vacío (p. ej. un Worker
      // desplegado que aún no tiene la ruta nueva) y la parada es de
      // Transitous, el navegador pregunta a la API directo (CORS abierto).
      if ((!crudos || !crudos.length) && stopId.indexOf('tt:') === 0) {
        try {
          const directo = await withTimeout(fetchJson('https://api.transitous.org/api/v5/stoptimes?stopId=' + encodeURIComponent(stopId.slice(3)) + '&n=8', 'omit', 12000), 15000);
          if (directo && Array.isArray(directo.stopTimes) && directo.stopTimes.length) crudos = directo.stopTimes;
        } catch (errorDirecto) {
          console.debug('[transporte-publico] Transitous directo de salidas falló:', errorDirecto);
        }
      }
      const items = (crudos || []).map(s => {
        const lugar = s.place || {};
        const hora = lugar.departure || lugar.scheduledDeparture || s.departure || s.arrival || s.realtime;
        const ts = hora ? Date.parse(hora) : NaN;
        const corto = s.routeShortName || (s.trip && s.trip.routeShortName) || s.displayName || '';
        const destino = s.headsign || (s.trip && s.trip.headsign) || '';
        const nombre = corto ? (destino ? corto + ' → ' + destino : corto) : (destino || t('transportStop', 'Línea'));
        return {
          linea: nombre,
          hora: hora ? formatoHora(hora) : '',
          timestamp: Number.isFinite(ts) ? ts : null,
          tiempoReal: !!(s.realTime || s.realtime),
        };
      }).filter(item => item.hora);
      pintarSalidas(body, items);
    } catch (error) {
      console.debug('[transporte-publico] No se pudieron cargar las salidas:', error);
      body.textContent = t('transportError', 'No se pudieron cargar los horarios.');
    }
  }

  async function searchStop(query, origin) {
    const needle = String(query || '').trim().toLocaleLowerCase();
    if (!needle || !map || !ready) return null;
    const token = ++searchToken;
    const rawCenter = origin && Number.isFinite(Number(origin.lon)) && Number.isFinite(Number(origin.lat))
      ? { lon: Number(origin.lon), lat: Number(origin.lat) }
      : map.getCenter();
    const center = { lon: Number(rawCenter.lon), lat: Number(rawCenter.lat) };
    if (!Number.isFinite(center.lon) || !Number.isFinite(center.lat) || center.lon < -180 || center.lon > 180 || center.lat < -85 || center.lat > 85) return null;
    map.easeTo({ center: [center.lon, center.lat], zoom: Math.max(13, map.getZoom()), duration: 500 });
    if (toggle && !toggle.checked) toggle.click();
    if (!enabled) activate();
    if (!await ensureLayers()) return null;
    const bounds = {
      west: Math.max(-180, center.lon - 0.03), east: Math.min(180, center.lon + 0.03),
      south: Math.max(-85, center.lat - 0.025), north: Math.min(85, center.lat + 0.025)
    };
    try {
      const features = await loadStops(bounds);
      if (token !== searchToken || !map) return null;
      const named = features.filter(f => String(f.properties.name || '').toLocaleLowerCase().includes(needle));
      if (!named.length) return null;
      const distance = f => {
        const c = f.geometry.coordinates;
        const dx = (c[0] - center.lon) * Math.cos(center.lat * Math.PI / 180);
        const dy = c[1] - center.lat;
        return dx * dx + dy * dy;
      };
      named.sort((a, b) => distance(a) - distance(b));
      const selected = named[0];
      const coords = selected.geometry.coordinates;
      await ensureLayers();
      const source = map.getSource(SOURCE);
      if (source) source.setData({ type: 'FeatureCollection', features });
      map.easeTo({ center: coords, zoom: Math.max(15, map.getZoom()), duration: 700 });
      window.setTimeout(() => {
        if (token === searchToken) onMapClick({ point: map.project(coords) });
      }, 800);
      return { name: selected.properties.name || t('transportStop', 'Parada'), lon: coords[0], lat: coords[1] };
    } catch (error) {
      console.debug('[transporte-publico] Búsqueda de parada fallida:', error);
      return null;
    }
  }

  window.manolitAireBuscarParada = async function (query, origin) {
    const end = Date.now() + 15000;
    while ((!map || !ready) && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 200));
    return searchStop(query, origin);
  };

  function activate() {
    if (enabled) { refresh(); return; }
    enabled = true; generation++;
    autoSteps = 0;
    // Aviso inmediato en la barra de estado: la capa ya está trabajando
    // (01-nov-2026: antes no se decía nada hasta que algo fallaba).
    showStatus(t('transportLoadingStops', 'Cargando paradas…'));
    map.on('moveend', scheduleRefresh);
    map.on('zoomend', scheduleRefresh);
    map.on('click', onMapClick);
    // Sin la guarda "if (ready)": ensureLayers ya espera al estilo dentro
    // (esperarEstilo). Antes, activar la capa con el estilo a medias la
    // dejaba encendida pero sin pintar hasta mover el mapa.
    ensureLayers().then(refresh).catch(error => console.debug('[transporte-publico] Capa no disponible:', error));
  }
  function deactivate() {
    enabled = false; generation++; refreshQueued = false; requestRunning = false; searchToken++;
    autoSteps = 0;
    areaCache = { key: '', features: [], touched: 0 };
    lastFailedAt = 0;
    stopCellCache.clear();
    controllers.forEach(controller => controller.abort()); controllers.clear();
    clearTimeout(moveTimer);
    clearTimeout(retryTimer);
    map.off('moveend', scheduleRefresh); map.off('zoomend', scheduleRefresh); map.off('click', onMapClick);
    [SYMBOL, HALO].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
    if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    if (map.hasImage(IMAGE)) map.removeImage(IMAGE);
    if (popup) { popup.remove(); popup = null; }
    showStatus('');
  }
  function scheduleRefresh() { if (!enabled) return; autoSteps = 0; lastFailedAt = 0; clearTimeout(retryTimer); clearTimeout(moveTimer); moveTimer = setTimeout(refresh, 500); }

  function start(m, tgl) {
    map = m; toggle = tgl;
    toggle.addEventListener('change', () => toggle.checked ? activate() : deactivate());
    map.on('load', () => { ready = true; if (enabled) ensureLayers().then(refresh).catch(error => console.debug('[transporte-publico] Capa no disponible:', error)); });
    map.on('style.load', () => { ready = true; if (enabled) ensureLayers().then(refresh).catch(error => console.debug('[transporte-publico] Capa no disponible:', error)); });
    map.on('idle', () => { if (toggle && toggle.checked && !enabled) activate(); });
    fetch('transit-regions.json', { cache: 'no-store', credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).then(data => {
      if (data && Array.isArray(data.regions)) regions = data.regions;
    }).catch(error => console.debug('[transporte-publico] No se pudieron cargar las regiones:', error));
    ready = map.isStyleLoaded();
    if (toggle.checked) activate();
  }

  (function waitForMap(tries) {
    const m = window.manolitAireMap;
    const tgl = document.getElementById('rsToggleTransporte');
    if (m && tgl) { start(m, tgl); return; }
    if (tries < 240) setTimeout(() => waitForMap(tries + 1), 500);
  })(0);

  // ---- Estilo de la tarjeta: mismo lenguaje "glass" claro que el resto de
  // paneles flotantes del mapa (posición solar, irradiación): fondo papel
  // semitransparente con desenfoque y acento mandarina, nada de neón oscuro.
  // El modo oscuro lo cubre css/style.css junto al resto de widgets.
  if (!document.getElementById('tp-stop-card-styles')) {
    const style = document.createElement('style');
    style.id = 'tp-stop-card-styles';
    style.textContent = `
      .tp-map-popup { z-index:46; }
      .tp-map-popup .maplibregl-popup-content { padding:0; overflow:hidden; border-radius:18px; background:transparent; box-shadow:0 12px 32px rgba(22,35,46,.22); }
      .tp-map-popup .maplibregl-popup-tip { display:none; }
      .tp-map-popup .maplibregl-popup-close-button { z-index:3; top:10px; right:10px; width:28px; height:28px; border-radius:50%; background:rgba(13,31,38,.06); color:var(--ink, #0D1F26); font-size:18px; line-height:28px; }
      .tp-map-popup .maplibregl-popup-close-button:hover { background:rgba(13,31,38,.12); }
      .tp-stop-card {
        box-sizing:border-box; width:min(320px, calc(100vw - 28px)); max-height:min(70vh, 520px); overflow-y:auto;
        padding:18px; border:1px solid rgba(255,107,26,.35); border-radius:18px;
        background:var(--paper, #F6FAF7);
        color:var(--ink, #0D1F26); box-shadow:0 8px 22px rgba(22,35,46,.16);
        font:14px/1.45 inherit;
        scrollbar-width:none; -ms-overflow-style:none;
      }
      .tp-stop-card::-webkit-scrollbar { display:none; width:0; height:0; }
      .tp-sheet-handle { display:none; }
      .tp-stop-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-right:26px; }
      .tp-eyebrow { display:block; margin-bottom:4px; color:var(--sky-mid, #17788A); font-size:10px; font-weight:750; letter-spacing:.15em; }
      .tp-stop-title { display:block; color:var(--ink, #0D1F26); font-size:18px; font-weight:700; letter-spacing:-.03em; line-height:1.2; }
      .tp-directions { display:inline-flex; flex:none; align-items:center; gap:6px; min-height:36px; padding:0 14px; border:0; border-radius:12px; background:#35C4D4; color:#06262b; font:650 12px/1 inherit; cursor:pointer; box-shadow:0 5px 13px rgba(53,196,212,.3); transition:background .15s, transform .1s; }
      .tp-directions svg { display:block; flex:0 0 16px; width:16px; height:16px; }
      .tp-directions:hover { background:#4dd8e8; }
      .tp-directions:active { transform:scale(.96); }
      .tp-departures { margin-top:16px; }
      /* Cada fila tiene su propio espacio vertical (min-height + padding) y
         la hora ocupa un ancho mínimo propio con caja incluida: nada de
         solapes ni cortes entre filas en ningún tamaño de pantalla
         (nov-2026, bug de la lista de paradas). */
      .tp-departure-list { display:grid; grid-template-columns:minmax(0,1fr); gap:2px; margin:0; padding:0; list-style:none; }
      .tp-departure { display:flex; align-items:center; justify-content:space-between; gap:12px; box-sizing:border-box; min-height:44px; padding-block:6px; border-top:1px solid var(--line, rgba(14,59,71,.12)); }
      .tp-line-name { flex:1 1 auto; min-width:0; overflow:hidden; color:var(--ink, #0D1F26); opacity:.72; font-size:12.5px; text-overflow:ellipsis; white-space:nowrap; }
      .tp-time-wrap { flex:0 0 auto; display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
      .tp-time { box-sizing:border-box; min-width:54px; text-align:center; padding:5px 9px; border-radius:999px; background:rgba(53,196,212,.16); color:#1a7d8a; font-size:12px; font-weight:750; font-variant-numeric:tabular-nums; }
      .tp-time.is-realtime { background:rgba(0,185,138,.16); color:#00785a; }
      .tp-countdown { font-size:10.5px; font-weight:650; color:var(--sky-mid, #17788A); opacity:.85; }
      .tp-departure.is-past { opacity:.35; }
      .tp-departure.is-past .tp-countdown { display:none; }
      @media (max-width:600px) {
        .tp-map-popup { position:fixed !important; left:0 !important; right:0 !important; top:auto !important; bottom:0 !important; width:100vw; max-width:none !important; transform:none !important; pointer-events:none; }
        .tp-map-popup .maplibregl-popup-content { width:100%; max-width:none; border-radius:22px 22px 0 0; box-shadow:0 -12px 40px rgba(22,35,46,.25); pointer-events:auto; }
        .tp-map-popup .maplibregl-popup-content > div { max-width:none; }
        .tp-map-popup-anchor-bottom, .tp-map-popup-anchor-top, .tp-map-popup-anchor-left, .tp-map-popup-anchor-right, .tp-map-popup-anchor-top-left, .tp-map-popup-anchor-top-right, .tp-map-popup-anchor-bottom-left, .tp-map-popup-anchor-bottom-right { transform:none !important; }
        .tp-map-popup .maplibregl-popup-close-button { top:14px; right:18px; }
        .tp-stop-card { width:100%; max-width:none; max-height:min(48vh, 420px); padding:10px 20px calc(18px + env(safe-area-inset-bottom)); border-width:1px 0 0; border-radius:22px 22px 0 0; pointer-events:auto; }
        .tp-sheet-handle { display:block; width:38px; height:4px; margin:0 auto 14px; border-radius:9px; background:rgba(13,31,38,.18); }
        .tp-stop-header { padding-right:34px; }
      }
      @media (prefers-reduced-motion:no-preference) { .tp-map-popup .maplibregl-popup-content { animation:tp-sheet-in .28s cubic-bezier(.2,.8,.2,1) both; } @keyframes tp-sheet-in { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } } }
    `;
    document.head.appendChild(style);
  }
})();