/*
 * Capa independiente de fuentes públicas de agua.
 *
 * - No modifica ni llama a la lógica de árboles.
 * - Solicita datos solo cuando el switch está activado y zoom >= 15.
 * - Usa un único icono SVG como imagen de MapLibre; cada fuente es un punto
 *   de una única capa symbol, sin crear marcadores HTML.
 * - La cobertura OSM se cachea por celdas únicamente en memoria. Además del
 *   BBox visible, en Sevilla se consulta explícitamente el área OSM de la
 *   ciudad. En Valencia y Málaga se combina con conjuntos municipales
 *   oficiales catalogados en datos.gob.es. No se persisten consultas ni
 *   coordenadas.
 */
(function () {
  'use strict';

  const map = window.manolitAireMap;
  const toggle = document.getElementById('rsToggleFuentesAgua');
  if (!map || !toggle) return;

  const SOURCE_ID = 'fuentes-agua-source';
  const LAYER_ID = 'fuentes-agua-symbols';
  const IMAGE_ID = 'fuentes-agua-svg';
  const MIN_ZOOM = 15;
  const MOVE_DEBOUNCE_MS = 600;
  const GRID_DEGREES = 0.02;
  const MAX_CACHED_CELLS = 180;
  const MAX_CELLS_PER_REQUEST = 64;
  const MAX_RETRIES = 3;
  const OVERPASS_TIMEOUT_MS = 18000;
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  // datos.gob.es cataloga los conjuntos municipales; no ofrece un servicio
  // nacional por BBox de fuentes públicas. Las extensiones solo evitan
  // consultar cada conjunto fuera de su cobertura geográfica publicada.
  const FUENTES_OFICIALES = [
    {
      id: 'valencia',
      kind: 'arcgis',
      bounds: { west: -0.55, south: 39.25, east: -0.20, north: 39.60 },
      endpoint: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/158/query'
    },
    {
      id: 'malaga',
      kind: 'geojson',
      bounds: { west: -4.70, south: 36.55, east: -4.31, north: 36.86 },
      endpoint: 'https://datosabiertos.malaga.eu/recursos/ambiente/fuentesaguapotable/da_medioAmbiente_fuentes-4326.geojson'
    }
  ];

  const ATRIBUCION =
    'Datos de fuentes de agua por © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Colaboradores de OpenStreetMap (Licencia ODbL)</a> y el <a href="https://datos.gob.es/es/catalogo" target="_blank" rel="noopener">Portal de Datos Abiertos del Gobierno de España</a>. Datos municipales: Valencia (CC BY 4.0) y Málaga (CC BY-SA 4.0).';

  const ICONO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    '<path d="M16 3.5C13.2 8.1 7.8 13.8 7.8 19a8.2 8.2 0 0 0 16.4 0C24.2 13.8 18.8 8.1 16 3.5Z" fill="#35C4D4" stroke="#12343D" stroke-width="1.6"/>' +
    '<path d="M12.5 20.2a3.6 3.6 0 0 0 3.5 2.7" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>' +
    '</svg>';

  const osmCells = new Map(); // cell key -> { features: Map, touched }
  const sevillaFeatures = new Map(); // cobertura OSM explícita del área de Sevilla
  const valenciaCells = new Map();
  const malagaFeatures = new Map();
  const naturalSearchCache = new Map(); // consultas del chat en memoria, con TTL
  const cooldownUntil = new Map();
  const failuresByService = new Map();
  const activeControllers = new Set();
  let malagaLoaded = false;
  let enabled = toggle.checked;
  let mapReady = false;
  let moveTimer = 0;
  let requestRunning = false;
  let refreshQueued = false;
  let generation = 0;
  let renderedFeatures = new Map();
  let svgImagePromise = null;

  function abortException() {
    return new DOMException('La consulta de fuentes se ha cancelado.', 'AbortError');
  }

  function boundsOfMap() {
    const bounds = map.getBounds();
    const west = Math.max(-180, bounds.getWest());
    const east = Math.min(180, bounds.getEast());
    const south = Math.max(-85, bounds.getSouth());
    const north = Math.min(85, bounds.getNorth());
    if (!(west < east && south < north)) return null;
    return { west, south, east, north };
  }

  function intersectBounds(a, b) {
    const result = {
      west: Math.max(a.west, b.west),
      south: Math.max(a.south, b.south),
      east: Math.min(a.east, b.east),
      north: Math.min(a.north, b.north)
    };
    return result.west < result.east && result.south < result.north ? result : null;
  }

  function cellsForBounds(bounds) {
    const west = Math.max(-180, bounds.west);
    const east = Math.min(180, bounds.east);
    const south = Math.max(-85, bounds.south);
    const north = Math.min(85, bounds.north);
    const minX = Math.floor(west / GRID_DEGREES);
    const maxX = Math.floor(east / GRID_DEGREES);
    const minY = Math.floor(south / GRID_DEGREES);
    const maxY = Math.floor(north / GRID_DEGREES);
    const count = (maxX - minX + 1) * (maxY - minY + 1);
    if (count < 1 || count > MAX_CELLS_PER_REQUEST) return [];

    const cells = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push({
          key: x + ':' + y,
          west: Math.max(-180, x * GRID_DEGREES),
          south: Math.max(-85, y * GRID_DEGREES),
          east: Math.min(180, (x + 1) * GRID_DEGREES),
          north: Math.min(85, (y + 1) * GRID_DEGREES)
        });
      }
    }
    return cells;
  }

  function unionBounds(cells) {
    if (!cells.length) return null;
    return cells.reduce((box, cell) => ({
      west: Math.min(box.west, cell.west),
      south: Math.min(box.south, cell.south),
      east: Math.max(box.east, cell.east),
      north: Math.max(box.north, cell.north)
    }), {
      west: cells[0].west, south: cells[0].south,
      east: cells[0].east, north: cells[0].north
    });
  }

  function keyForPoint(lon, lat) {
    return Math.floor(lon / GRID_DEGREES) + ':' + Math.floor(lat / GRID_DEGREES);
  }

  function pointInBounds(feature, bounds) {
    const coordinates = feature.geometry.coordinates;
    return coordinates[0] >= bounds.west && coordinates[0] <= bounds.east &&
      coordinates[1] >= bounds.south && coordinates[1] <= bounds.north;
  }

  function coordinateKey(feature) {
    const coordinates = feature.geometry.coordinates;
    return Math.round(coordinates[0] * 100000) + ':' + Math.round(coordinates[1] * 100000);
  }

  function featureFromOverpass(node) {
    if (!node || node.type !== 'node' || !Number.isFinite(node.lon) || !Number.isFinite(node.lat)) return null;
    const id = 'osm:' + node.id;
    const name = node.tags && (node.tags.name || node.tags['name:es']);
    return {
      type: 'Feature',
      id,
      properties: {
        cacheId: id,
        source: 'osm',
        name: name || 'Fuente pública de agua',
        category: 'Fuente pública de agua',
        potable: true
      },
      geometry: { type: 'Point', coordinates: [node.lon, node.lat] }
    };
  }

  function normalizeOfficialFeature(feature, sourceId) {
    if (!feature || !feature.geometry || feature.geometry.type !== 'Point') return null;
    const coordinates = feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return null;
    const properties = feature.properties || {};
    const name = properties.name || properties.nombre || properties.Nombre ||
      properties.NOMBRE || 'Fuente pública de agua';
    const sourceObjectId = feature.id ?? properties.OBJECTID ?? properties.objectid ??
      properties.ID ?? properties.id ?? properties.CODIGO ?? properties.codigo;
    const id = 'official:' + sourceId + ':' +
      (sourceObjectId == null ? coordinateKey(feature) : String(sourceObjectId));
    return {
      type: 'Feature',
      id,
      properties: {
        cacheId: id,
        source: sourceId,
        name: String(name),
        category: 'Fuente pública de agua',
        potable: true
      },
      geometry: { type: 'Point', coordinates: [coordinates[0], coordinates[1]] }
    };
  }

  function getRetryDelay(error, attempt) {
    const exponential = Math.min(8000, 1000 * (2 ** attempt));
    return Math.max(exponential, Math.min(error.retryAfterMs || 0, 10000));
  }

  function retryable(error) {
    if (!error || error.name === 'AbortError') return false;
    if (!error.status) return true; // error de red o CORS transitorio
    return error.status === 429 || error.status === 502 || error.status === 503 || error.status === 504;
  }

  async function fetchJsonWithBackoff(service, urlForAttempt, initForAttempt, timeoutMs) {
    const now = Date.now();
    const waitingUntil = cooldownUntil.get(service) || 0;
    if (now < waitingUntil) throw new Error('Servicio en pausa temporal: ' + service);
    const requestGeneration = generation;
    let lastError;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (!enabled || requestGeneration !== generation) throw abortException();
      const controller = new AbortController();
      let timedOut = false;
      const timer = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      activeControllers.add(controller);

      try {
        const response = await fetch(urlForAttempt(attempt), {
          ...initForAttempt(attempt),
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'omit',
          referrerPolicy: 'no-referrer'
        });
        if (!response.ok) {
          const error = new Error(service + ' HTTP ' + response.status);
          error.status = response.status;
          const retryAfter = Number(response.headers.get('Retry-After'));
          if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfterMs = retryAfter * 1000;
          throw error;
        }
        const json = await response.json();
        failuresByService.delete(service);
        cooldownUntil.delete(service);
        return json;
      } catch (error) {
        lastError = error;
        const timedOutError = timedOut && error.name === 'AbortError';
        if (!enabled || requestGeneration !== generation || (error.name === 'AbortError' && !timedOutError)) {
          throw abortException();
        }
        if (!retryable(error) && !timedOutError) throw error;
      } finally {
        window.clearTimeout(timer);
        activeControllers.delete(controller);
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => window.setTimeout(resolve, getRetryDelay(lastError, attempt)));
      }
    }

    const failures = (failuresByService.get(service) || 0) + 1;
    failuresByService.set(service, failures);
    cooldownUntil.set(service, Date.now() + Math.min(90000, 10000 * (2 ** (failures - 1))));
    throw lastError || new Error(service + ' no disponible');
  }

  function cellsMissing(cache, cells) {
    return cells.filter(cell => !cache.has(cell.key));
  }

  function cacheFeaturesByCell(cache, coveredCells, features) {
    const covered = new Set(coveredCells.map(cell => cell.key));
    for (const cell of coveredCells) {
      if (!cache.has(cell.key)) cache.set(cell.key, { features: new Map(), touched: Date.now() });
      cache.get(cell.key).touched = Date.now();
    }
    for (const feature of features) {
      const coordinates = feature.geometry.coordinates;
      const key = keyForPoint(coordinates[0], coordinates[1]);
      if (!covered.has(key)) continue;
      const entry = cache.get(key);
      if (entry) entry.features.set(String(feature.id), feature);
    }
  }

  function trimCellCache(cache, visibleCells) {
    if (cache.size <= MAX_CACHED_CELLS) return;
    const visible = new Set(visibleCells.map(cell => cell.key));
    const oldest = Array.from(cache.entries())
      .filter(([key]) => !visible.has(key))
      .sort((a, b) => a[1].touched - b[1].touched);
    while (cache.size > MAX_CACHED_CELLS && oldest.length) {
      cache.delete(oldest.shift()[0]);
    }
  }

  async function loadOverpass(bounds, visibleCells) {
    const missing = cellsMissing(osmCells, visibleCells);
    if (!missing.length) {
      for (const cell of visibleCells) {
        const entry = osmCells.get(cell.key);
        if (entry) entry.touched = Date.now();
      }
      return;
    }
    const queryBounds = unionBounds(missing);
    if (!queryBounds) return;
    const queryCells = cellsForBounds(queryBounds);
    const bbox = [
      queryBounds.south.toFixed(6), queryBounds.west.toFixed(6),
      queryBounds.north.toFixed(6), queryBounds.east.toFixed(6)
    ].join(',');
    // OSM por el visor + consulta explícita del área de Sevilla. La segunda
    // rama cubre fuentes cartografiadas dentro del término municipal aunque
    // el BBox visible solo roce una parte de la ciudad. La caché por celdas y
    // la deduplicación posterior evitan pintar puntos repetidos.
    const query = '[out:json][timeout:15];' +
      'area["name"="Sevilla"]->.areaSevilla;' +
      '(node["amenity"="drinking_water"](' + bbox + ');' +
      'node["amenity"="drinking_water"](area.areaSevilla);' +
      ');out body qt;';
    const form = new URLSearchParams({ data: query });
    const data = await fetchJsonWithBackoff(
      'overpass',
      attempt => OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length],
      () => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: form.toString()
      }),
      OVERPASS_TIMEOUT_MS
    );
    if (!data || !Array.isArray(data.elements)) throw new Error('Respuesta Overpass no válida');
    const features = data.elements.map(featureFromOverpass).filter(Boolean);
    const coveredCellKeys = new Set(queryCells.map(cell => cell.key));
    // La rama del área de Sevilla puede devolver puntos fuera del BBox que
    // disparó la petición. Los conservamos para cuando el visor llegue allí.
    for (const feature of features) {
      const [lon, lat] = feature.geometry.coordinates;
      if (!coveredCellKeys.has(keyForPoint(lon, lat))) {
        sevillaFeatures.set(String(feature.id), feature);
      }
    }
    cacheFeaturesByCell(osmCells, queryCells, features);
    trimCellCache(osmCells, visibleCells);
  }

  function arcGisUrl(bounds) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      geometry: [bounds.west, bounds.south, bounds.east, bounds.north].join(','),
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      outSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      f: 'geojson'
    });
    return FUENTES_OFICIALES[0].endpoint + '?' + params.toString();
  }

  async function loadValencia(bounds, visibleCells) {
    const source = FUENTES_OFICIALES[0];
    const localBounds = intersectBounds(bounds, source.bounds);
    if (!localBounds) return;
    const localCells = cellsForBounds(localBounds);
    const missing = cellsMissing(valenciaCells, localCells);
    if (!missing.length) return;
    const queryBounds = intersectBounds(unionBounds(missing), source.bounds);
    if (!queryBounds) return;
    const queryCells = cellsForBounds(queryBounds).filter(cell => intersectBounds(cell, source.bounds));
    const data = await fetchJsonWithBackoff(
      'datos-valencia',
      () => arcGisUrl(queryBounds),
      () => ({ method: 'GET' }),
      12000
    );
    if (data && data.error) throw new Error('Servicio municipal de Valencia no disponible');
    if (!data || !Array.isArray(data.features)) throw new Error('GeoJSON municipal de Valencia no válido');
    const features = data.features.map(feature =>
      normalizeOfficialFeature(feature, source.id)
    ).filter(Boolean);
    cacheFeaturesByCell(valenciaCells, queryCells, features);
    trimCellCache(valenciaCells, visibleCells);
  }

  async function loadMalaga(bounds) {
    const source = FUENTES_OFICIALES[1];
    if (malagaLoaded || !intersectBounds(bounds, source.bounds)) return;
    const data = await fetchJsonWithBackoff(
      'datos-malaga',
      () => source.endpoint,
      () => ({ method: 'GET' }),
      12000
    );
    if (!data || !Array.isArray(data.features)) throw new Error('GeoJSON municipal de Málaga no válido');
    data.features.forEach(feature => {
      const normalized = normalizeOfficialFeature(feature, source.id);
      if (normalized) malagaFeatures.set(String(normalized.id), normalized);
    });
    malagaLoaded = true;
  }

  function featuresInCellCache(cache, cells, bounds, output) {
    for (const cell of cells) {
      const entry = cache.get(cell.key);
      if (!entry) continue;
      entry.touched = Date.now();
      for (const feature of entry.features.values()) {
        if (pointInBounds(feature, bounds)) output.set(String(feature.id), feature);
      }
    }
  }

function nearbyDuplicate(feature, keySet) {
    const key = coordinateKey(feature);
    if (keySet.has(key)) return true;
    keySet.add(key);
    return false;
  }

  function featuresForView(bounds, cells) {
    const official = new Map();
    const osm = new Map();
    featuresInCellCache(valenciaCells, cells, bounds, official);
    for (const feature of malagaFeatures.values()) {
      if (pointInBounds(feature, bounds)) official.set(String(feature.id), feature);
    }
    featuresInCellCache(osmCells, cells, bounds, osm);
    for (const feature of sevillaFeatures.values()) {
      if (pointInBounds(feature, bounds)) osm.set(String(feature.id), feature);
    }

    const result = new Map();
    const coordinateKeys = new Set();
    for (const feature of official.values()) {
      if (!nearbyDuplicate(feature, coordinateKeys)) result.set(String(feature.id), feature);
    }
    for (const feature of osm.values()) {
      if (!nearbyDuplicate(feature, coordinateKeys)) result.set(String(feature.id), feature);
    }
    return Array.from(result.values());
  }

  function distanciaMetros(origen, feature) {
    const [lon, lat] = feature.geometry.coordinates;
    const rad = Math.PI / 180;
    const dLat = (lat - origen.lat) * rad;
    const dLon = (lon - origen.lon) * rad;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(origen.lat * rad) * Math.cos(lat * rad) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function featureNaturalOverpass(element) {
    if (!element || !element.tags) return null;
    const position = element.type === 'node'
      ? { lat: element.lat, lon: element.lon }
      : element.center;
    if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lon)) return null;
    const tags = element.tags;
    let category = '';
    if (tags.natural === 'spring') category = 'Manantial';
    else if (tags.waterway === 'river') category = 'Río';
    else if (tags.waterway === 'stream') category = 'Arroyo';
    else if (tags.water === 'lake') category = 'Lago';
    else if (tags.water === 'pond') category = 'Estanque';
    else if (tags.natural === 'water') category = 'Masa de agua';
    if (!category) return null;
    const id = 'osm-natural:' + element.type + ':' + element.id;
    return {
      type: 'Feature',
      id,
      properties: {
        cacheId: id,
        source: 'osm',
        name: tags.name || tags['name:es'] || category,
        category,
        potable: false
      },
      geometry: { type: 'Point', coordinates: [position.lon, position.lat] }
    };
  }

  async function cargarFuentesNaturales(bounds, origin) {
    const cacheKey = origin.lat.toFixed(4) + ':' + origin.lon.toFixed(4);
    const cached = naturalSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.touched < 10 * 60 * 1000) {
      cached.touched = Date.now();
      return cached.features;
    }

    const bbox = [bounds.south, bounds.west, bounds.north, bounds.east]
      .map(value => value.toFixed(6)).join(',');
    const query = '[out:json][timeout:15];(' +
      'node["natural"="spring"](' + bbox + ');' +
      'nwr["natural"="water"](' + bbox + ');' +
      'nwr["water"~"lake|pond"](' + bbox + ');' +
      'way["waterway"~"river|stream"](' + bbox + ');' +
      ');out center qt;';
    const form = new URLSearchParams({ data: query });
    const data = await fetchJsonWithBackoff(
      'overpass-natural-water',
      attempt => OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length],
      () => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: form.toString()
      }),
      OVERPASS_TIMEOUT_MS
    );
    if (!data || !Array.isArray(data.elements)) throw new Error('Respuesta de aguas naturales no válida');
    const features = data.elements.map(featureNaturalOverpass).filter(Boolean);
    naturalSearchCache.set(cacheKey, { features, touched: Date.now() });
    while (naturalSearchCache.size > 32) naturalSearchCache.delete(naturalSearchCache.keys().next().value);
    return features;
  }

  async function buscarFuenteCercana(origen) {
    if (!enabled) throw new Error('Activa primero la capa de fuentes de agua.');
    if (!origen || !Number.isFinite(Number(origen.lat)) || !Number.isFinite(Number(origen.lon))) {
      throw new Error('La ubicación no es válida.');
    }
    const punto = { lat: Number(origen.lat), lon: Number(origen.lon) };
    const radioMetros = 5000;
    const latDelta = radioMetros / 111320;
    const lonDelta = radioMetros / (111320 * Math.max(0.2, Math.cos(punto.lat * Math.PI / 180)));
    const bounds = {
      west: Math.max(-180, punto.lon - lonDelta),
      south: Math.max(-85, punto.lat - latDelta),
      east: Math.min(180, punto.lon + lonDelta),
      north: Math.min(85, punto.lat + latDelta)
    };
    const cells = cellsForBounds(bounds);
    if (!cells.length) throw new Error('No se puede consultar esta zona con el tamaño de búsqueda actual.');

    // Espera la descarga que haya iniciado el interruptor para no duplicar
    // una petición Overpass cuando se activa la búsqueda desde el chat.
    let waitedMs = 0;
    while (requestRunning && waitedMs < OVERPASS_TIMEOUT_MS + 2000) {
      await new Promise(resolve => window.setTimeout(resolve, 100));
      waitedMs += 100;
    }

    const tasks = [loadOverpass(bounds, cells), cargarFuentesNaturales(bounds, punto)];
    if (intersectBounds(bounds, FUENTES_OFICIALES[0].bounds)) tasks.push(loadValencia(bounds, cells));
    if (intersectBounds(bounds, FUENTES_OFICIALES[1].bounds)) tasks.push(loadMalaga(bounds));
    const results = await Promise.allSettled(tasks);
    const natural = results[1].status === 'fulfilled' ? results[1].value : [];
    const candidates = [...featuresForView(bounds, cells), ...natural]
      .map(feature => ({ feature, distanceMeters: distanciaMetros(punto, feature) }))
      .filter(item => item.distanceMeters <= radioMetros)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    if (!candidates.length && results.some(result => result.status === 'rejected')) {
      throw results[0].reason || new Error('Los servicios de fuentes de agua no están disponibles.');
    }
    if (!candidates.length) return null;

    const nearest = candidates[0];
    const [lon, lat] = nearest.feature.geometry.coordinates;
    return {
      lat,
      lon,
      nombre: nearest.feature.properties.name || 'Fuente pública de agua',
      tipo: nearest.feature.properties.category || 'Fuente pública de agua',
      potable: nearest.feature.properties.potable === true,
      fuenteDatos: nearest.feature.properties.source,
      distanciaMetros: Math.round(nearest.distanceMeters)
    };
  }

  window.manolitAireBuscarFuenteAguaCercana = buscarFuenteCercana;

  function applyVisibleFeatures(features) {
    const source = map.getSource(SOURCE_ID);
    if (!source) return;
    const next = new Map(features.map(feature => [String(feature.id), feature]));
    const remove = [];
    const add = [];
    for (const id of renderedFeatures.keys()) {
      if (!next.has(id)) remove.push(id);
    }
    for (const [id, feature] of next) {
      if (!renderedFeatures.has(id)) add.push(feature);
    }
    if (!remove.length && !add.length) return;
    renderedFeatures = next;

    if (typeof source.updateData === 'function') {
      source.updateData({ remove, add }).catch(() => {
        const currentSource = map.getSource(SOURCE_ID);
        if (currentSource && enabled) {
          currentSource.setData({ type: 'FeatureCollection', features: Array.from(renderedFeatures.values()) });
        }
      });
    } else {
      source.setData({ type: 'FeatureCollection', features: Array.from(next.values()) });
    }
  }

  async function ensureGraphicLayer() {
    if (!enabled || !mapReady || !map.isStyleLoaded()) return;
    try {
      if (!svgImagePromise) {
        svgImagePromise = new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONO_SVG);
        });
      }
      const iconImage = await svgImagePromise;
      if (!enabled || !map.isStyleLoaded()) return;
      if (!map.hasImage(IMAGE_ID)) map.addImage(IMAGE_ID, iconImage, { pixelRatio: 2 });
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          attribution: ATRIBUCION
        });
      }
      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          minzoom: MIN_ZOOM,
          layout: {
            'icon-image': IMAGE_ID,
            'icon-size': 0.7,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'icon-padding': 2
          }
        });
      }
      if (!renderedFeatures.size) {
        const bounds = boundsOfMap();
        if (bounds && map.getZoom() >= MIN_ZOOM) {
          applyVisibleFeatures(featuresForView(bounds, cellsForBounds(bounds)));
        }
      }
    } catch (error) {
      console.debug('[fuentes-agua] No se pudo preparar la capa:', error);
    }
  }

  function destroyGraphicLayer() {
    try {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      if (map.hasImage(IMAGE_ID)) map.removeImage(IMAGE_ID);
    } catch (error) {
      console.debug('[fuentes-agua] No se pudo liberar la capa:', error);
    }
    renderedFeatures.clear();
  }

  function refreshCurrentView() {
    if (!enabled || !mapReady || !map.isStyleLoaded()) return;
    if (map.getZoom() < MIN_ZOOM) {
      if (requestRunning) {
        generation++;
        requestRunning = false;
        refreshQueued = false;
        for (const controller of activeControllers) controller.abort();
        activeControllers.clear();
      }
      applyVisibleFeatures([]);
      return;
    }
    const bounds = boundsOfMap();
    if (!bounds) return;
    const cells = cellsForBounds(bounds);
    if (!cells.length) return;
    applyVisibleFeatures(featuresForView(bounds, cells));

    if (requestRunning) {
      refreshQueued = true;
      return;
    }
    requestRunning = true;
    const requestGeneration = generation;
    Promise.allSettled([
      loadOverpass(bounds, cells),
      loadValencia(bounds, cells),
      loadMalaga(bounds)
    ]).then(() => {
      if (enabled && requestGeneration === generation) {
        const currentBounds = boundsOfMap();
        if (currentBounds && map.getZoom() >= MIN_ZOOM) {
          applyVisibleFeatures(featuresForView(currentBounds, cellsForBounds(currentBounds)));
        }
      }
    }).finally(() => {
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

  function onMapReady() {
    mapReady = true;
    if (enabled) {
      ensureGraphicLayer().then(refreshCurrentView);
    }
  }

  function activate() {
    enabled = true;
    generation++;
    map.on('move', scheduleRefresh);
    if (mapReady) ensureGraphicLayer().then(refreshCurrentView);
  }

  function deactivate() {
    enabled = false;
    generation++;
    refreshQueued = false;
    requestRunning = false;
    window.clearTimeout(moveTimer);
    map.off('move', scheduleRefresh);
    for (const controller of activeControllers) controller.abort();
    activeControllers.clear();
    destroyGraphicLayer();
  }

  toggle.addEventListener('change', () => {
    if (toggle.checked) activate();
    else deactivate();
  });

  map.on('load', onMapReady);
  map.on('style.load', () => {
    if (!enabled) return;
    renderedFeatures.clear();
    ensureGraphicLayer().then(refreshCurrentView);
  });

  if (map.isStyleLoaded()) onMapReady();
  if (enabled) activate();
})();
