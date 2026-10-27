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
  const DEPARTURES_MS = 60 * 1000;
  const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="#35C4D4" stroke="#0E3B47" stroke-width="1.6"/><rect x="6" y="7" width="14" height="9" rx="2.5" fill="none" stroke="#0E3B47" stroke-width="1.5"/><path d="M8 10h7M8 12.5h9" stroke="#0E3B47" stroke-width="1.3" stroke-linecap="round"/><circle cx="9.5" cy="17.5" r="1.3" fill="#fff"/><circle cx="16.5" cy="17.5" r="1.3" fill="#fff"/></svg>';
  const ATTRIBUTION = 'Transitous';

  let map = null;
  let toggle = null;
  let enabled = false;
  let ready = false;
  let generation = 0;
  let moveTimer = 0;
  let imagePromise = null;
  let popup = null;
  let areaCache = { key: '', features: [], touched: 0, pending: null };
  const departuresCache = new Map();
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

  // Conversión de paradas (MOTIS y GeoJSON) delegada a js/transporte-paradas.js.
  function datosParadas() {
    const api = window.ManolitoTransporteParadas;
    if (!api) throw new Error('Módulo de paradas no disponible');
    return api;
  }

  async function detalleError(response) {
    try {
      const body = await response.json();
      return (body && (body.detail || body.error)) || '';
    } catch (error) {
      console.debug('[transporte-publico] La respuesta de error no era JSON:', error && error.message);
      return '';
    }
  }

  async function fetchJson(url, credentials, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    controllers.add(controller);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store', credentials: credentials, headers: { Accept: 'application/json' } });
      if (!response.ok) {
        const detail = await detalleError(response);
        throw new Error('HTTP ' + response.status + (detail ? ': ' + detail : ''));
      }
      return await response.json();
    } finally { clearTimeout(timer); controllers.delete(controller); }
  }

  async function fetchApi(path) {
    return fetchJson(path, 'same-origin', 15000);
  }

  function segmentosConsulta(bounds) {
    // Un bbox que cruza el antimeridiano se divide para no pedir longitudes invertidas.
    const west = ((bounds.west + 180) % 360 + 360) % 360 - 180;
    const east = ((bounds.east + 180) % 360 + 360) % 360 - 180;
    return west <= east
      ? [{ west: west, east: east }]
      : [{ west: west, east: 180 }, { west: -180, east: east }];
  }

  async function loadStops(bounds) {
    const key = cacheKey(bounds);
    if (areaCache.key === key && Date.now() - areaCache.touched < CACHE_MS) return areaCache.features;
    if (areaCache.key === key && areaCache.pending) return areaCache.pending;
    // El Worker recibe min/max como latitud,longitud y consulta MOTIS de forma segura.
    const paradas = datosParadas();
    const peticion = (async () => {
      const coleccion = [];
      for (const segmento of segmentosConsulta(bounds)) {
        if (segmento.west >= segmento.east) continue;
        const min = bounds.south.toFixed(6) + ',' + segmento.west.toFixed(6);
        const max = bounds.north.toFixed(6) + ',' + segmento.east.toFixed(6);
        const raw = await fetchApi('/transporte-paradas?min=' + encodeURIComponent(min) + '&max=' + encodeURIComponent(max));
        const data = paradas.listaDeParadas(raw);
        if (!data) throw new Error('Transitous devolvió una respuesta de paradas inválida');
        coleccion.push(...data);
      }
      return paradas.featuresDeParadas(coleccion, t('transportStop', 'Parada'));
    })();
    areaCache = { key, features: [], touched: 0, pending: peticion };
    try {
      const features = await peticion;
      if (areaCache.key === key && areaCache.pending === peticion) {
        areaCache = { key, features, touched: Date.now(), pending: null };
      }
      return features;
    } catch (error) {
      if (areaCache.key === key && areaCache.pending === peticion) areaCache = { key: '', features: [], touched: 0, pending: null };
      throw error;
    }
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

  async function ensureLayers() {
    if (!map || !map.isStyleLoaded()) return false;
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

  function textoEstado(cantidad) {
    if (!cantidad) return t('transportNoData', 'Sin datos de transporte público en esta zona.');
    const zona = currentRegion.indexOf('es-') === 0 ? 'España' : 'Global';
    return t('transportStatus', 'Transporte público: ') + zona + ' · ' + cantidad + ' paradas';
  }

  async function asegurarRegiones() {
    if (regions.length) return;
    // Espera a que se cargue el JSON de regiones antes de consultar la zona;
    // la carga inicial es asíncrona y puede coincidir con el primer refresh.
    try {
      const response = await fetch('transit-regions.json', { cache: 'no-store', credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.regions)) regions = data.regions;
      }
    } catch (error) { console.debug('[transporte-publico] No se pudieron cargar las regiones:', error); }
  }

  async function descargarParadas(currentGeneration) {
    await asegurarRegiones();
    evaluateRegion();
    const features = await loadStops(boundsOfMap());
    if (!enabled || currentGeneration !== generation) return;
    await ensureLayers();
    const source = map.getSource(SOURCE);
    if (source) source.setData({ type: 'FeatureCollection', features });
    showStatus(textoEstado(features.length));
  }

  function informarFallo(currentGeneration, error) {
    if (!enabled || currentGeneration !== generation || error.name === 'AbortError') return;
    console.debug('[transporte-publico] No se pudieron cargar paradas:', error);
    showStatus(t('transportError', 'No se pudo consultar el transporte público.'));
  }

  function liberarPeticion() {
    requestRunning = false;
    if (!enabled || !refreshQueued) return;
    refreshQueued = false;
    window.setTimeout(refresh, 0);
  }

  async function refresh() {
    if (!enabled || !ready) return;
    if (map.getZoom() < MIN_ZOOM) { showStatus(t('transportZoom', 'Acércate para ver las paradas de transporte público.')); return; }
    if (requestRunning) { refreshQueued = true; return; }
    requestRunning = true;
    const currentGeneration = generation;
    try {
      await descargarParadas(currentGeneration);
    } catch (error) {
      informarFallo(currentGeneration, error);
    }
    if (currentGeneration === generation) liberarPeticion();
  }

  function salidaNormalizada(st) {
    const place = st.place || {};
    return {
      name: st.displayName || st.routeShortName || 'Línea',
      headsign: st.headsign || '',
      departure: place.departure || place.scheduledDeparture || '',
      realTime: !!st.realTime
    };
  }

  async function departures(stopId) {
    const cached = departuresCache.get(stopId);
    if (cached && Date.now() - cached.touched < DEPARTURES_MS) return cached.items;
    const data = await fetchApi('/transporte-salidas?stopId=' + encodeURIComponent(stopId) + '&n=8');
    const lista = data && Array.isArray(data.stopTimes) ? data.stopTimes : [];
    const items = lista.map(salidaNormalizada);
    departuresCache.set(stopId, { items, touched: Date.now() });
    while (departuresCache.size > 80) departuresCache.delete(departuresCache.keys().next().value);
    return items;
  }

  function comoLlegar(coords, name) {
    const destination = { lon: Number(coords[0]), lat: Number(coords[1]), nombre: name || 'Parada' };
    const routeToggle = document.getElementById('rsToggleRuta');
    const destinationInput = document.getElementById('rsDestino');
    if (routeToggle && !routeToggle.checked) routeToggle.click();
    if (destinationInput) destinationInput.value = destination.nombre;
    if (typeof window.manolitAireCalcularRutaParada === 'function') {
      Promise.resolve(window.manolitAireCalcularRutaParada(destination)).catch(error => console.debug('[transporte-publico] No se pudo calcular la ruta:', error));
    } else {
      map.easeTo({ center: coords, zoom: Math.max(15, map.getZoom()), duration: 700 });
    }
  }

  function paradaBajoElPunto(point) {
    if (!enabled || typeof maplibregl === 'undefined') return null;
    const layers = [SYMBOL, HALO].filter(id => map.getLayer(id));
    if (!layers.length) return null;
    const matches = map.queryRenderedFeatures(point, { layers });
    return matches.find(item => item.properties && item.properties.stopId != null) || null;
  }

  function mostrarSalidas(body, stopId) {
    const tarjeta = window.ManolitoTransporteTarjeta;
    if (!tarjeta) { body.textContent = 'No se pudieron consultar las salidas.'; return; }
    departures(stopId).then(items => tarjeta.pintarSalidas(body, items)).catch(error => {
      if (error.name !== 'AbortError') body.textContent = 'No se pudieron consultar las salidas.';
    });
  }

  function onMapClick(event) {
    const feature = paradaBajoElPunto(event.point);
    if (!feature) return;
    const tarjeta = window.ManolitoTransporteTarjeta;
    if (!tarjeta) return;
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    const card = tarjeta.crearTarjetaParada(props, () => comoLlegar(coords, props.name));
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '320px', offset: 12, className: 'tp-map-popup' }).setLngLat(coords).setDOMContent(card.box).addTo(map);
    mostrarSalidas(card.body, String(props.stopId));
  }

  function centroBusqueda(origin) {
    const valido = origin && Number.isFinite(Number(origin.lon)) && Number.isFinite(Number(origin.lat));
    const rawCenter = valido ? { lon: Number(origin.lon), lat: Number(origin.lat) } : map.getCenter();
    const center = { lon: Number(rawCenter.lon), lat: Number(rawCenter.lat) };
    const dentro = Number.isFinite(center.lon) && Number.isFinite(center.lat) && center.lon >= -180 && center.lon <= 180 && center.lat >= -85 && center.lat <= 85;
    return dentro ? center : null;
  }

  function distanciaA(center) {
    return f => {
      const c = f.geometry.coordinates;
      const dx = (c[0] - center.lon) * Math.cos(center.lat * Math.PI / 180);
      const dy = c[1] - center.lat;
      return dx * dx + dy * dy;
    };
  }

  async function abrirParada(selected, token) {
    const coords = selected.geometry.coordinates;
    await ensureLayers();
    const source = map.getSource(SOURCE);
    if (source) source.setData({ type: 'FeatureCollection', features: areaCache.features });
    map.easeTo({ center: coords, zoom: Math.max(15, map.getZoom()), duration: 700 });
    window.setTimeout(() => {
      if (token === searchToken && map) onMapClick({ point: map.project(coords) });
    }, 800);
    return { name: selected.properties.name || 'Parada', lon: coords[0], lat: coords[1] };
  }

  async function searchStop(query, origin) {
    const needle = String(query || '').trim().toLocaleLowerCase();
    if (!needle || !map || !ready) return null;
    const token = ++searchToken;
    const center = centroBusqueda(origin);
    if (!center) return null;
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
      named.sort((a, b) => distanciaA(center)(a) - distanciaA(center)(b));
      return await abrirParada(named[0], token);
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

  function traerCapa() {
    if (!ready) return;
    ensureLayers().then(refresh).catch(error => console.debug('[transporte-publico] Capa no disponible:', error));
  }

  function activate() {
    if (enabled) { refresh(); return; }
    enabled = true; generation++;
    map.on('moveend', scheduleRefresh);
    map.on('click', onMapClick);
    traerCapa();
  }

  function deactivate() {
    enabled = false; generation++; refreshQueued = false; requestRunning = false; searchToken++;
    areaCache = { key: '', features: [], touched: 0, pending: null };
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

  function cargarRegiones() {
    fetch('transit-regions.json', { cache: 'no-store', credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).then(data => {
      if (data && Array.isArray(data.regions)) regions = data.regions;
    }).catch(error => console.debug('[transporte-publico] No se pudieron cargar las regiones:', error));
  }

  function start(m, tgl) {
    map = m; toggle = tgl;
    toggle.addEventListener('change', () => toggle.checked ? activate() : deactivate());
    map.on('load', () => { ready = true; if (enabled) traerCapa(); });
    map.on('style.load', () => { ready = true; if (enabled) traerCapa(); });
    cargarRegiones();
    ready = map.isStyleLoaded();
    if (toggle.checked) activate();
  }

  let intentos = 0;
  function waitForMap() {
    const m = window.manolitAireMap;
    const tgl = document.getElementById('rsToggleTransporte');
    if (m && tgl) { start(m, tgl); return; }
    if (intentos < 240) { intentos++; setTimeout(waitForMap, 500); }
  }
  waitForMap();
})();
