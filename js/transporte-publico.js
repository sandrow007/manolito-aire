(() => {
  'use strict';
  if (window.__manolitoTransportePublico) return;
  window.__manolitoTransportePublico = true;

  // Transitous expone su API pública con CORS, sin necesidad de un proxy.
  const API = 'https://api.transitous.org/api';
  const SOURCE = 'transporte-publico-source';
  const HALO = 'transporte-publico-halo';
  const SYMBOL = 'transporte-publico-symbols';
  const IMAGE = 'transporte-publico-icon';
  const MIN_ZOOM = 11;
  const CACHE_MS = 15 * 60 * 1000;
  const DEPARTURES_MS = 60 * 1000;
  const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="12" fill="#35C4D4" stroke="#0E3B47" stroke-width="1.6"/><rect x="6" y="7" width="14" height="9" rx="2.5" fill="none" stroke="#0E3B47" stroke-width="1.5"/><path d="M8 10h7M8 12.5h9" stroke="#0E3B47" stroke-width="1.3" stroke-linecap="round"/><circle cx="9.5" cy="17.5" r="1.3" fill="#fff"/><circle cx="16.5" cy="17.5" r="1.3" fill="#fff"/></svg>';
  const ATTRIBUTION = 'Transporte público vía <a href="https://transitous.org/sources/" target="_blank" rel="noopener">Transitous</a> · Cartografía © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Colaboradores de OpenStreetMap</a> · Contacto: manolitoaire.com';

  let map = null;
  let toggle = null;
  let enabled = false;
  let ready = false;
  let generation = 0;
  let moveTimer = 0;
  let imagePromise = null;
  let popup = null;
  let areaCache = { key: '', features: [], touched: 0 };
  const departuresCache = new Map();
  const controllers = new Set();
  let regions = [];
  let defaultRegion = 'global';
  let currentRegion = 'global';
  let pendingRegion = null;
  let regionVotes = 0;
  let requestRunning = false;
  let refreshQueued = false;
  let searchToken = 0;

  function t(key, fallback) {
    try {
      const messages = typeof window.getMessages === 'function' ? window.getMessages() : null;
      if (messages && messages[key] != null) return messages[key];
    } catch (e) { /* fallback local */ }
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
      if (!Array.isArray(region.polygons)) continue;
      for (const polygon of region.polygons) if (pointInPolygon(lon, lat, polygon)) return region.id;
    }
    return defaultRegion;
  }

  function evaluateRegion() {
    const center = map.getCenter();
    const detected = regionAt(center.lng, center.lat);
    if (currentRegion === 'global' || currentRegion === null || detected === currentRegion) {
      currentRegion = detected;
      pendingRegion = null;
      regionVotes = 0;
    } else if (pendingRegion === detected) {
      if (++regionVotes >= 2) { currentRegion = detected; pendingRegion = null; regionVotes = 0; }
    } else { pendingRegion = detected; regionVotes = 1; }
  }

  function boundsOfMap() {
    const b = map.getBounds();
    return { west: Math.max(-180, b.getWest()), south: Math.max(-85, b.getSouth()), east: Math.min(180, b.getEast()), north: Math.min(85, b.getNorth()) };
  }

  function cacheKey(b) {
    return [b.west, b.south, b.east, b.north].map(v => Math.round(v * 100)).join(':') + ':' + Math.floor(map.getZoom());
  }

  function toFeature(place) {
    if (!place) return null;
    // MOTIS devuelve 'lat'/'lon'; algunas versiones usan 'latitude'/'longitude'
    const lat = Number(place.lat != null ? place.lat : place.latitude);
    const lon = Number(place.lon != null ? place.lon : place.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    // MOTIS usa 'id'; versiones antiguas usan 'stopId'
    const stopId = place.stopId != null ? place.stopId : (place.id != null ? place.id : null);
    return {
      type: 'Feature',
      id: stopId != null ? String(stopId) : 'stop:' + lat + ':' + lon,
      properties: { stopId: stopId, name: place.name || t('transportStop', 'Parada') },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    };
  }

  async function fetchApi(path, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    controllers.add(controller);
    try {
      const response = await fetch(API + path, Object.assign({ signal: controller.signal, cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/json' } }, options || {}, { signal: controller.signal }));
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally { clearTimeout(timer); controllers.delete(controller); }
  }

  async function loadStops(bounds) {
    const key = cacheKey(bounds);
    if (areaCache.key === key && Date.now() - areaCache.touched < CACHE_MS) return areaCache.features;
    // Transitous recibe min/max en formato latitud,longitud.
    const min = bounds.south.toFixed(6) + ',' + bounds.west.toFixed(6);
    const max = bounds.north.toFixed(6) + ',' + bounds.east.toFixed(6);
    const qs = '?min=' + min + '&max=' + max;

    // Consulta directa a Transitous primero. En producción el Worker de Cloudflare
    // enruta rutas desconocidas al sitio estático, por lo que /transporte-paradas
    // no es un proxy válido. El endpoint público también se intenta como respaldo.
    let data = null;
    if (!data) {
      try {
        const raw = await fetchApi('/v2/map/stops' + qs);
        data = Array.isArray(raw) ? raw
          : Array.isArray(raw && raw.stops) ? raw.stops
          : Array.isArray(raw && raw.features) ? raw.features
          : null;
      } catch (e) { /* fallback v6 */ }
    }
    if (!data) {
      try {
        const raw = await fetchApi('/v6/map/stops' + qs);
        data = Array.isArray(raw) ? raw
          : Array.isArray(raw && raw.stops) ? raw.stops
          : null;
      } catch (e) { /* nada */ }
    }

    const features = (data || []).map(toFeature).filter(Boolean).slice(0, 400);
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

  async function refresh() {
    if (!enabled || !ready) return;
    if (map.getZoom() < MIN_ZOOM) { showStatus(t('transportZoom', 'Acércate para ver las paradas de transporte público.')); return; }
    if (requestRunning) { refreshQueued = true; return; }
    requestRunning = true;
    const currentGeneration = generation;
    try {
      evaluateRegion();
      const features = await loadStops(boundsOfMap());
      if (!enabled || currentGeneration !== generation) return;
      await ensureLayers();
      const source = map.getSource(SOURCE);
      if (source) source.setData({ type: 'FeatureCollection', features });
      showStatus(features.length ? t('transportStatus', 'Transporte público: ') + (currentRegion.indexOf('es-') === 0 ? 'España' : 'Global') + ' · ' + features.length + ' paradas' : t('transportNoData', 'Sin datos de transporte público en esta zona.'));
    } catch (error) {
      if (enabled && currentGeneration === generation && error.name !== 'AbortError') {
        console.debug('[transporte-publico] No se pudieron cargar paradas:', error);
        showStatus(t('transportError', 'No se pudo consultar el transporte público.'));
      }
    } finally {
      if (currentGeneration === generation) {
        requestRunning = false;
        if (enabled && refreshQueued) { refreshQueued = false; refresh(); }
      }
    }
  }

  async function departures(stopId) {
    const cached = departuresCache.get(stopId);
    if (cached && Date.now() - cached.touched < DEPARTURES_MS) return cached.items;
    const data = await fetchApi('/v6/stoptimes?stopId=' + encodeURIComponent(stopId) + '&n=8');
    const items = (data && Array.isArray(data.stopTimes) ? data.stopTimes : []).map(st => ({ name: st.displayName || st.routeShortName || 'Línea', headsign: st.headsign || '', departure: st.place && (st.place.departure || st.place.scheduledDeparture) || '', realTime: !!st.realTime }));
    departuresCache.set(stopId, { items, touched: Date.now() });
    while (departuresCache.size > 80) departuresCache.delete(departuresCache.keys().next().value);
    return items;
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
    const box = document.createElement('div');
    box.style.cssText = 'font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0D1F26;max-width:260px;';
    const title = document.createElement('strong'); title.textContent = props.name || 'Parada'; box.appendChild(title);
    const body = document.createElement('div'); body.style.marginTop = '6px'; body.textContent = 'Cargando salidas…'; box.appendChild(body);
    const attribution = document.createElement('small'); attribution.style.cssText = 'display:block;margin-top:8px;opacity:.72'; attribution.innerHTML = ATTRIBUTION; box.appendChild(attribution);
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '280px', offset: 10 }).setLngLat(coords).setDOMContent(box).addTo(map);
    departures(String(props.stopId)).then(items => {
      body.textContent = '';
      if (!items.length) { body.textContent = 'Sin salidas próximas.'; return; }
      const list = document.createElement('ul'); list.style.cssText = 'margin:6px 0 0;padding:0;list-style:none;';
      items.forEach(item => {
        const li = document.createElement('li'); li.style.cssText = 'display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(14,59,71,.12);';
        const name = document.createElement('span'); name.textContent = item.name + (item.headsign ? ' → ' + item.headsign : '');
        const time = document.createElement('span'); time.style.whiteSpace = 'nowrap';
        const date = new Date(item.departure); time.textContent = item.departure ? (item.realTime ? '● ' : '') + (isNaN(date.getTime()) ? item.departure : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : '';
        li.append(name, time); list.appendChild(li);
      });
      body.appendChild(list);
    }).catch(error => { if (error.name !== 'AbortError') body.textContent = 'No se pudieron consultar las salidas.'; });
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
      return { name: selected.properties.name || 'Parada', lon: coords[0], lat: coords[1] };
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
    fetch('transit-regions.json', { cache: 'no-store', credentials: 'omit' }).then(r => r.ok ? r.json() : null).then(data => {
      if (data && Array.isArray(data.regions)) { regions = data.regions; defaultRegion = data.defaultRegion || 'global'; }
    }).catch(() => {});
    ready = map.isStyleLoaded();
    if (toggle.checked) activate();
  }

  (function waitForMap(tries) {
    const m = window.manolitAireMap;
    const tgl = document.getElementById('rsToggleTransporte');
    if (m && tgl) { start(m, tgl); return; }
    if (tries < 240) setTimeout(() => waitForMap(tries + 1), 500);
  })(0);
})();
