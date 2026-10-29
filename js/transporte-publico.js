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
  const MIN_ZOOM = 11;
  const CACHE_MS = 15 * 60 * 1000;
  const MAX_BBOX_SPAN = 0.35;
  const ATTRIBUTION = '© OpenStreetMap contributors';
  const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="#35C4D4" stroke="#0E3B47" stroke-width="1.6"/><rect x="6" y="7" width="14" height="9" rx="2.5" fill="none" stroke="#0E3B47" stroke-width="1.5"/><path d="M8 10h7M8 12.5h9" stroke="#0E3B47" stroke-width="1.3" stroke-linecap="round"/><circle cx="9.5" cy="17.5" r="1.3" fill="#fff"/><circle cx="16.5" cy="17.5" r="1.3" fill="#fff"/></svg>';

  let map = null;
  let toggle = null;
  let enabled = false;
  let ready = false;
  let generation = 0;
  let moveTimer = 0;
  let imagePromise = null;
  let popup = null;
  let areaCache = { key: '', features: [], touched: 0 };
  const controllers = new Set();
  let regions = [];
  let currentRegion = 'global';
  let requestRunning = false;
  let refreshQueued = false;
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
    return [b.west, b.south, b.east, b.north].map(v => Math.round(v * 100)).join(':') + ':' + Math.floor(map.getZoom());
  }

  function toFeature(place) {
    if (!place) return null;
    // Overpass devuelve las coordenadas OSM como latitud y longitud numéricas.
    const latRaw = place.lat != null ? place.lat : place.latitude;
    const lonRaw = place.lon != null ? place.lon : place.longitude;
    const lat = Number(typeof latRaw === 'string' ? latRaw.replace(',', '.') : latRaw);
    const lon = Number(typeof lonRaw === 'string' ? lonRaw.replace(',', '.') : lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    const stopId = place.stopId != null ? place.stopId : (place.id != null ? place.id : null);
    return {
      type: 'Feature',
      id: stopId != null ? String(stopId) : 'stop:' + lat + ':' + lon,
      properties: { stopId: stopId, name: place.name || t('transportStop', 'Parada'), source: 'osm' },
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
    return fetchJson(path, 'same-origin', 15000);
  }

  async function loadStops(bounds) {
    // Limita cada consulta a una tesela manejable: los límites visibles a zoom
    // bajo exceden la cuota/tamaño de Overpass y la capa acababa sin paradas.
    const centerLat = (bounds.south + bounds.north) / 2;
    const centerLon = (bounds.west + bounds.east) / 2;
    const halfLat = Math.min((bounds.north - bounds.south) / 2, MAX_BBOX_SPAN);
    const halfLon = Math.min((bounds.east - bounds.west) / 2, MAX_BBOX_SPAN);
    bounds = {
      west: Math.max(-180, centerLon - halfLon), east: Math.min(180, centerLon + halfLon),
      south: Math.max(-85, centerLat - halfLat), north: Math.min(85, centerLat + halfLat)
    };
    const key = cacheKey(bounds);
    if (areaCache.key === key && Date.now() - areaCache.touched < CACHE_MS) return areaCache.features;
    // El Worker recibe min/max como latitud,longitud y consulta OpenStreetMap vía Overpass.
    // Un bbox que cruza el antimeridiano se divide para no pedir longitudes invertidas.
    const west = ((bounds.west + 180) % 360 + 360) % 360 - 180;
    const east = ((bounds.east + 180) % 360 + 360) % 360 - 180;
    const segmentos = west <= east
      ? [{ west: west, east: east }]
      : [{ west: west, east: 180 }, { west: -180, east: east }];
    const coleccion = [];
    for (const segmento of segmentos) {
      if (segmento.west >= segmento.east) continue;
      const min = bounds.south.toFixed(6) + ',' + segmento.west.toFixed(6);
      const max = bounds.north.toFixed(6) + ',' + segmento.east.toFixed(6);
      const query = '?min=' + encodeURIComponent(min) + '&max=' + encodeURIComponent(max);
      const raw = await fetchApi('/transporte-paradas' + query);
      const data = Array.isArray(raw) ? raw
        : Array.isArray(raw && raw.stops) ? raw.stops
        : Array.isArray(raw && raw.features) ? raw.features
        : null;
      if (!data) throw new Error('OpenStreetMap devolvió una respuesta de paradas inválida');
      coleccion.push(...data);
    }
    const features = coleccion.map(toFeature).filter(Boolean).slice(0, 400);
    areaCache = { key, features, touched: Date.now() };
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
  // arrancar (o justo tras un style.load), isStyleLoaded() aún es false y
  // antes se devolvía false en silencio: la capa no se creaba nunca y no
  // aparecía ningún punto. Ahora esperamos al siguiente 'idle' (con tope).
  function esperarEstilo() {
    if (!map) return Promise.resolve(false);
    if (map.isStyleLoaded()) return Promise.resolve(true);
    return new Promise(resolve => {
      let hecho = false;
      let temporizador = 0;
      const fin = () => {
        if (hecho) return;
        hecho = true;
        clearTimeout(temporizador);
        map.off('idle', fin);
        resolve(!!map && map.isStyleLoaded());
      };
      temporizador = setTimeout(fin, 4000);
      map.once('idle', fin);
    });
  }

  async function ensureLayers() {
    if (!await esperarEstilo()) return false;
    if (map.getSource(SOURCE) && map.getLayer(SYMBOL) && map.getLayer(HALO)) return true;
    const targetMap = map;
    const icon = await loadIcon();
    if (map !== targetMap || !targetMap.isStyleLoaded()) return false;
    if (!targetMap.hasImage(IMAGE)) targetMap.addImage(IMAGE, icon, { pixelRatio: 1 });
    if (!targetMap.getSource(SOURCE)) targetMap.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: ATTRIBUTION });
    if (!targetMap.getLayer(HALO)) targetMap.addLayer({ id: HALO, type: 'circle', source: SOURCE, minzoom: MIN_ZOOM, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 8], 'circle-color': '#35C4D4', 'circle-opacity': 0.18 } });
    if (!targetMap.getLayer(SYMBOL)) targetMap.addLayer({ id: SYMBOL, type: 'symbol', source: SOURCE, minzoom: MIN_ZOOM, layout: { 'icon-image': IMAGE, 'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.55, 17, 0.85], 'icon-anchor': 'bottom', 'icon-offset': [0, -2], 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
    return true;
  }

  function showStatus(text) { const el = document.getElementById('rsStatus'); if (el) el.textContent = text; }

  async function refresh() {
    if (!enabled || !ready) return;
    if (map.getZoom() < MIN_ZOOM) { showStatus(t('transportZoom', 'Acércate para ver las paradas de transporte público.')); return; }
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
        showStatus(t('transportError', 'No se pudo consultar el transporte público.'));
      } else {
        const features = await loadStops(boundsOfMap());
        if (!enabled || currentGeneration !== generation) return;
        const source = map.getSource(SOURCE);
        if (source) source.setData({ type: 'FeatureCollection', features });
        showStatus(features.length ? t('transportStatus', 'Transporte público: ') + (currentRegion.indexOf('es-') === 0 ? 'España' : 'Global') + ' · ' + features.length + ' paradas (OSM)' : t('transportNoData', 'Sin datos de transporte público en esta zona.'));
      }
    } catch (error) {
      if (enabled && currentGeneration === generation && error.name !== 'AbortError') {
        console.debug('[transporte-publico] No se pudieron cargar paradas:', error);
        showStatus(t('transportError', 'No se pudo consultar el transporte público.'));
      }
    }
    if (currentGeneration === generation) {
      requestRunning = false;
      if (enabled && refreshQueued) {
        refreshQueued = false;
        window.setTimeout(refresh, 0);
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
    directions.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 21 12l-9 9.2-2-2 5.7-5.8H4v-2.8h11.7L10 4.8z" fill="currentColor"/></svg><span>' + t('transportDirections', 'Cómo llegar') + '</span>';
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
    const esOsmId = /^(node|way|relation):\d+$/.test(String(props.stopId || ''));
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
    body.textContent = t('transportNoSchedules', 'Parada de OpenStreetMap. No hay horarios GTFS disponibles.');
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
    map.on('moveend', scheduleRefresh);
    map.on('click', onMapClick);
    if (ready) ensureLayers().then(refresh).catch(error => console.debug('[transporte-publico] Capa no disponible:', error));
  }
  function deactivate() {
    enabled = false; generation++; refreshQueued = false; requestRunning = false; searchToken++;
    controllers.forEach(controller => controller.abort()); controllers.clear();
    clearTimeout(moveTimer);
    map.off('moveend', scheduleRefresh); map.off('click', onMapClick);
    [SYMBOL, HALO].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
    if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    if (map.hasImage(IMAGE)) map.removeImage(IMAGE);
    if (popup) { popup.remove(); popup = null; }
    showStatus('');
  }
  function scheduleRefresh() { if (!enabled) return; clearTimeout(moveTimer); moveTimer = setTimeout(refresh, 500); }

  function start(m, tgl) {
    map = m; toggle = tgl;
    toggle.addEventListener('change', () => toggle.checked ? activate() : deactivate());
    map.on('load', () => { ready = true; if (enabled) ensureLayers().then(refresh).catch(error => console.debug('[transporte-publico] Capa no disponible:', error)); });
    map.on('style.load', () => { ready = true; if (enabled) ensureLayers().then(refresh).catch(error => console.debug('[transporte-publico] Capa no disponible:', error)); });
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

  // ---- Estilo de la tarjeta: lenguaje visual oscuro/semitransparente, igual
  // que el widget de sombra (rgba(8,12,20,.94) + blur), responsive en web y
  // móvil. Reemplaza el fondo claro anterior.
  if (!document.getElementById('tp-stop-card-styles')) {
    const style = document.createElement('style');
    style.id = 'tp-stop-card-styles';
    style.textContent = `
      .tp-map-popup .maplibregl-popup-content { padding:0; overflow:hidden; border-radius:24px; background:transparent; box-shadow:0 18px 54px rgba(0,0,0,.45); }
      .tp-map-popup .maplibregl-popup-tip { display:none; }
      .tp-map-popup .maplibregl-popup-close-button { z-index:3; top:12px; right:12px; width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,.08); color:#e8e4dc; font-size:20px; }
      .tp-map-popup .maplibregl-popup-close-button:hover { background:rgba(255,255,255,.16); }
      .tp-stop-card { box-sizing:border-box; width:min(320px, calc(100vw - 28px)); max-height:min(70vh, 520px); overflow:auto; padding:20px; border:1px solid rgba(255,255,255,.08); border-radius:24px; background:rgba(8,12,20,.94); color:#e8e4dc; box-shadow:inset 0 1px rgba(255,255,255,.04); backdrop-filter:blur(28px) saturate(1.4); -webkit-backdrop-filter:blur(28px) saturate(1.4); font:14px/1.45 Inter,Montserrat,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
      .tp-sheet-handle { display:none; }
      .tp-stop-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-right:28px; }
      .tp-eyebrow { display:block; margin-bottom:4px; color:rgba(232,228,220,.55); font-size:10px; font-weight:750; letter-spacing:.15em; }
      .tp-stop-title { display:block; color:#e8e4dc; font-size:19px; font-weight:700; letter-spacing:-.035em; line-height:1.2; }
      .tp-directions { display:inline-flex; flex:none; align-items:center; gap:7px; min-height:38px; padding:0 13px; border:0; border-radius:13px; background:#35C4D4; color:#0e1420; font:650 12px/1 Inter,Montserrat,ui-sans-serif,system-ui,sans-serif; cursor:pointer; box-shadow:0 5px 13px rgba(53,196,212,.25); }
      .tp-directions svg { width:14px; height:14px; transform:rotate(-45deg); }
      .tp-directions:hover { background:#4dd8e8; }
      .tp-departures { margin-top:17px; }
      .tp-departure-list { display:grid; gap:2px; margin:0; padding:0; list-style:none; }
      .tp-departure { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:36px; border-top:1px solid rgba(255,255,255,.08); }
      .tp-line-name { overflow:hidden; color:rgba(232,228,220,.68); font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
      .tp-time { flex:none; padding:5px 9px; border-radius:999px; background:rgba(53,196,212,.16); color:#8fe0ea; font-size:12px; font-weight:750; font-variant-numeric:tabular-nums; }
      .tp-time.is-realtime { background:rgba(43,152,115,.18); color:#7ad9ae; }
      .tp-departure.is-past { opacity:.28; }
      @media (max-width:600px) {
        .tp-map-popup { position:fixed !important; left:0 !important; right:0 !important; top:auto !important; bottom:0 !important; width:100vw; max-width:none !important; transform:none !important; pointer-events:none; }
        .tp-map-popup .maplibregl-popup-content { width:100%; max-width:none; border-radius:26px 26px 0 0; box-shadow:0 -12px 40px rgba(0,0,0,.35); pointer-events:auto; }
        .tp-map-popup .maplibregl-popup-content > div { max-width:none; }
        .tp-map-popup-anchor-bottom, .tp-map-popup-anchor-top, .tp-map-popup-anchor-left, .tp-map-popup-anchor-right, .tp-map-popup-anchor-top-left, .tp-map-popup-anchor-top-right, .tp-map-popup-anchor-bottom-left, .tp-map-popup-anchor-bottom-right { transform:none !important; }
        .tp-map-popup .maplibregl-popup-close-button { top:14px; right:18px; }
        .tp-stop-card { width:100%; max-width:none; max-height:min(48vh, 420px); padding:10px 20px calc(18px + env(safe-area-inset-bottom)); border-width:1px 0 0; border-radius:26px 26px 0 0; pointer-events:auto; }
        .tp-sheet-handle { display:block; width:38px; height:4px; margin:0 auto 14px; border-radius:9px; background:rgba(255,255,255,.22); }
        .tp-stop-header { padding-right:34px; }
      }
      @media (prefers-reduced-motion:no-preference) { .tp-map-popup .maplibregl-popup-content { animation:tp-sheet-in .28s cubic-bezier(.2,.8,.2,1) both; } @keyframes tp-sheet-in { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } } }
    `;
    document.head.appendChild(style);
  }
})();

