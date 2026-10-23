/*
 * Capa independiente de fuentes públicas de agua.
 *
 * - No modifica ni llama a la lógica de árboles.
 * - Solicita datos solo cuando el switch está activado y zoom >= 12.5,
 *   igual que la capa de aparcamientos.
 * - Se pinta como el parking: una capa de círculos (que jamás se oculta por
 *   colisión con etiquetas u otros iconos) y encima el icono de gota, con
 *   allow-overlap. Una vez cargada, la fuente SIGUE ahí al hacer zoom.
 * - La cobertura OSM se cachea por celdas en memoria. Las consultas a
 *   Overpass van primero por el proxy same-origin /aparcamientos del worker
 *   (caché KV y carrera de espejos) y, si falla, directas a los espejos.
 *   En Valencia y Málaga se combina con conjuntos municipales oficiales
 *   catalogados en datos.gob.es. No se persisten consultas ni coordenadas.
 *
 * ARREGLOS (20-oct-2026, «las fuentes no salen y deben salir sí o sí»):
 *   1. El módulo ya no se rinde si window.manolitAireMap aún no existe al
 *      cargar el script: espera al mapa como hace aparcamientos-viaje.js.
 *   2. Se elimina el atajo de las teselas vectoriales: marcaba TODAS las
 *      celdas visibles como "ya cubiertas" con un recorte parcial y Overpass
 *      no se llamaba nunca más. Ahora las teselas solo suman puntos.
 *   3. Se elimina la consulta pesada area["name"="Sevilla"], que se repetía
 *      en cada petición (en cualquier ciudad) y provocaba timeouts.
 *   4. Las celdas cubiertas se calculan por índices enteros. Antes, el
 *      redondeo de decimales marcaba a veces una fila/columna vecina como
 *      cubierta sin haberla pedido, y sus fuentes no salían jamás.
 *   5. Si Overpass falla se reintenta solo, sin esperar a que se mueva el
 *      mapa, y un fallo nunca se guarda como "zona sin fuentes".
 *   6. Capa de símbolos con allow-overlap + círculos de respaldo + icono más
 *      grande (antes ~11 px y ocultable por colisión).
 *   7. Se buscan nodos, vías y relaciones (nwr) y las etiquetas habituales
 *      de fuentes de agua potable, no solo amenity=drinking_water en nodos.
 *   8. Clic en una fuente: popup sencillo (nombre y origen del dato).
 */
(function () {
  'use strict';

  if (window.__manolitoFuentesAgua) return; // doble carga: jamás
  window.__manolitoFuentesAgua = true;

  let map = null;
  let toggle = null;

  const SOURCE_ID = 'fuentes-agua-source';
  const HALO_ID = 'fuentes-agua-halo';
  const DOT_ID = 'fuentes-agua-puntos';
  const LAYER_ID = 'fuentes-agua-symbols';
  const IMAGE_ID = 'fuentes-agua-svg';
  const MIN_ZOOM = 12.5;
  const MOVE_DEBOUNCE_MS = 500;
  const MOVEEND_DEBOUNCE_MS = 120;
  const GRID_DEGREES = 0.02;
  const MAX_CACHED_CELLS = 400;
  const MAX_CELLS_PER_REQUEST = 256;
  const MAX_CELLS_PER_QUERY = 36;
  const MAX_BATCHES = 4;
  const MAX_AUTO_STEPS = 12;
  const PROXY_TIMEOUT_MS = 25000;
  const DIRECT_TIMEOUT_MS = 16000;
  const OVERPASS_SERVICE = 'overpass-fuentes';
  const NATURAL_SERVICE = 'overpass-natural-water';
  const PROXY_URL = window.location.protocol === 'file:'
    ? 'https://manolitoaire.com/aparcamientos'
    : '/aparcamientos';
  const OVERPASS_ENDPOINTS = [
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
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

  const ORIGEN_DATO = {
    osm: 'OpenStreetMap',
    valencia: 'Ayuntamiento de València',
    malaga: 'Ayuntamiento de Málaga'
  };

  const ATRIBUCION =
    'Datos de fuentes de agua por © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Colaboradores de OpenStreetMap (Licencia ODbL)</a> y el <a href="https://datos.gob.es/es/catalogo" target="_blank" rel="noopener">Portal de Datos Abiertos del Gobierno de España</a>. Datos municipales: Valencia (CC BY 4.0) y Málaga (CC BY-SA 4.0).';

  const ICONO_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    '<path d="M16 3.5C13.2 8.1 7.8 13.8 7.8 19a8.2 8.2 0 0 0 16.4 0C24.2 13.8 18.8 8.1 16 3.5Z" fill="#35C4D4" stroke="#12343D" stroke-width="1.6"/>' +
    '<path d="M12.5 20.2a3.6 3.6 0 0 0 3.5 2.7" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>' +
    '</svg>';

  const osmCells = new Map(); // cell key -> { features: Map, touched }
  const valenciaCells = new Map();
  const malagaFeatures = new Map();
  const naturalSearchCache = new Map(); // consultas del chat en memoria, con TTL
  const cooldownUntil = new Map();
  const failuresByService = new Map();
  const activeControllers = new Set();
  let malagaLoaded = false;
  let enabled = false;
  let mapReady = false;
  let moveTimer = 0;
  let retryTimer = 0;
  let requestRunning = false;
  let refreshQueued = false;
  let generation = 0;
  let autoSteps = 0;
  let renderedFeatures = new Map();
  let svgImagePromise = null;
  let popup = null;
  let resolverListo = null;
  const listo = new Promise(resolve => { resolverListo = resolve; });

  function abortException() {
    return new DOMException('La consulta de fuentes se ha cancelado.', 'AbortError');
  }

  function esAbort(error) {
    return !!error && error.name === 'AbortError';
  }

  function t(clave, fallback) {
    try {
      const fn = window.getMessages;
      if (typeof fn === 'function') {
        const msg = fn();
        if (msg && msg[clave] != null) return msg[clave];
      }
    } catch (e) { /* seguimos con el fallback */ }
    return fallback != null ? fallback : clave;
  }

  /* ---------------- Geometría y celdas ---------------------------------- */
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

  function cellFromIndex(x, y) {
    return {
      key: x + ':' + y,
      x,
      y,
      west: Math.max(-180, x * GRID_DEGREES),
      south: Math.max(-85, y * GRID_DEGREES),
      east: Math.min(180, (x + 1) * GRID_DEGREES),
      north: Math.min(85, (y + 1) * GRID_DEGREES)
    };
  }

  // Celdas que TOCAN el BBox (para leer). Pasarse por una celda de más aquí
  // es inocuo: solo se leen datos de la caché.
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
      for (let y = minY; y <= maxY; y++) cells.push(cellFromIndex(x, y));
    }
    return cells;
  }

  // Rango de índices enteros que ocupa un lote de celdas. Marcar celdas como
  // cubiertas SIEMPRE se hace desde este rango, nunca desde decimales.
  function rangeOf(cells) {
    return cells.reduce((r, c) => ({
      minX: Math.min(r.minX, c.x), maxX: Math.max(r.maxX, c.x),
      minY: Math.min(r.minY, c.y), maxY: Math.max(r.maxY, c.y)
    }), { minX: cells[0].x, maxX: cells[0].x, minY: cells[0].y, maxY: cells[0].y });
  }

  function cellsInRange(range) {
    const cells = [];
    for (let x = range.minX; x <= range.maxX; x++) {
      for (let y = range.minY; y <= range.maxY; y++) cells.push(cellFromIndex(x, y));
    }
    return cells;
  }

  function boundsOfRange(range) {
    return {
      west: Math.max(-180, range.minX * GRID_DEGREES),
      south: Math.max(-85, range.minY * GRID_DEGREES),
      east: Math.min(180, (range.maxX + 1) * GRID_DEGREES),
      north: Math.min(85, (range.maxY + 1) * GRID_DEGREES)
    };
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

  /* ---------------- Normalización de datos ------------------------------ */
  function featureFromOverpass(element) {
    if (!element || !element.type) return null;
    const position = element.type === 'node'
      ? { lat: element.lat, lon: element.lon }
      : element.center;
    if (!position || !Number.isFinite(position.lon) || !Number.isFinite(position.lat)) return null;
    const tags = element.tags || {};
    if (tags.drinking_water === 'no') return null;
    const id = 'osm:' + element.type + ':' + element.id;
    const name = tags.name || tags['name:es'];
    return {
      type: 'Feature',
      id,
      properties: {
        cacheId: id,
        source: 'osm',
        name: name || t('fountainName', 'Fuente pública de agua'),
        category: 'Fuente pública de agua',
        potable: true
      },
      geometry: { type: 'Point', coordinates: [position.lon, position.lat] }
    };
  }

  // Las teselas vectoriales solo SUMAN puntos a lo ya cargado. Jamás sirven
  // para dar una celda por cubierta: traen un recorte parcial por tesela.
  function fuentesAguaDesdeTiles(bounds) {
    try {
      if (!map.getSource('openmaptiles')) return [];
      const poIs = map.querySourceFeatures('openmaptiles', { sourceLayer: 'poi' });
      const features = new Map();
      for (const poi of poIs) {
        const properties = poi.properties || {};
        if (properties.class !== 'drinking_water' && properties.subclass !== 'drinking_water') continue;
        if (!poi.geometry || poi.geometry.type !== 'Point') continue;
        const coordinates = poi.geometry.coordinates;
        const lon = coordinates[0];
        const lat = coordinates[1];
        if (!Number.isFinite(lon) || !Number.isFinite(lat) ||
            lon < bounds.west || lon > bounds.east || lat < bounds.south || lat > bounds.north) continue;
        const id = poi.id == null ? coordinateKey({ geometry: { coordinates } }) : poi.id;
        const feature = featureFromOverpass({
          type: 'node', id, lon, lat,
          tags: { amenity: 'drinking_water', name: properties.name || properties.name_int || '' }
        });
        if (feature) features.set(coordinateKey(feature), feature);
      }
      return Array.from(features.values());
    } catch (error) {
      return [];
    }
  }

  function normalizeOfficialFeature(feature, sourceId) {
    if (!feature || !feature.geometry || feature.geometry.type !== 'Point') return null;
    const coordinates = feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) return null;
    const properties = feature.properties || {};
    const name = properties.name || properties.nombre || properties.Nombre ||
      properties.NOMBRE || t('fountainName', 'Fuente pública de agua');
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

  /* ---------------- Red -------------------------------------------------- */
  function getRetryDelay(error, attempt) {
    const exponential = Math.min(8000, 1000 * (2 ** attempt));
    return Math.max(exponential, Math.min(error.retryAfterMs || 0, 10000));
  }

  function retryable(error) {
    if (!error || error.name === 'AbortError') return false;
    if (!error.status) return true; // error de red o CORS transitorio
    return error.status === 429 || error.status === 502 || error.status === 503 || error.status === 504;
  }

  function msHastaFinDePausa(service) {
    return Math.max(0, (cooldownUntil.get(service) || 0) - Date.now());
  }

  function registrarFallo(service, maxMs) {
    const failures = (failuresByService.get(service) || 0) + 1;
    failuresByService.set(service, failures);
    cooldownUntil.set(service, Date.now() + Math.min(maxMs, 5000 * (2 ** (failures - 1))));
  }

  function registrarExito(service) {
    failuresByService.delete(service);
    cooldownUntil.delete(service);
  }

  // Una sola petición con timeout. El controller se apunta en `grupo` (si lo
  // hay) y en activeControllers, para poder cancelarla desde fuera.
  function fetchJson(url, init, timeoutMs, grupo) {
    const controller = new AbortController();
    activeControllers.add(controller);
    if (grupo) grupo.push(controller);
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    }).then(async response => {
      if (!response.ok) {
        const error = new Error('HTTP ' + response.status);
        error.status = response.status;
        throw error;
      }
      const aviso = response.headers.get('X-Proxy-Aviso');
      const json = await response.json();
      return { json, aviso };
    }).finally(() => {
      window.clearTimeout(timer);
      activeControllers.delete(controller);
    });
  }

  // Overpass en dos escalones: 1) proxy del worker (caché KV + carrera de
  // espejos en servidor) y 2) carrera de espejos directa desde el navegador.
  // El aviso 'sin-datos' del proxy significa "todos los espejos fallaron", no
  // "zona vacía": se trata como fallo y jamás se cachea como cobertura.
  async function overpassPost(service, query) {
    if (msHastaFinDePausa(service) > 0) throw new Error('Servicio en pausa temporal: ' + service);
    const requestGeneration = generation;
    const abortado = () => !enabled || requestGeneration !== generation;
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ data: query }).toString()
    };
    const valido = json => !!json && Array.isArray(json.elements);
    let ultimoError = null;

    try {
      const r = await fetchJson(PROXY_URL, init, PROXY_TIMEOUT_MS, null);
      if (abortado()) throw abortException();
      if (r.aviso !== 'sin-datos' && valido(r.json)) {
        registrarExito(service);
        return r.json;
      }
      ultimoError = new Error('El proxy no tenía datos');
    } catch (error) {
      if (abortado()) throw abortException();
      ultimoError = error;
    }

    const grupo = [];
    try {
      const json = await Promise.any(OVERPASS_ENDPOINTS.map(endpoint =>
        fetchJson(endpoint, init, DIRECT_TIMEOUT_MS, grupo).then(r => {
          if (!valido(r.json)) throw new Error('Respuesta Overpass no válida');
          return r.json;
        })
      ));
      grupo.forEach(controller => { try { controller.abort(); } catch (e) { /* ya terminada */ } });
      if (abortado()) throw abortException();
      registrarExito(service);
      return json;
    } catch (error) {
      grupo.forEach(controller => { try { controller.abort(); } catch (e) { /* ya terminada */ } });
      if (abortado()) throw abortException();
      registrarFallo(service, 60000);
      throw ultimoError || error;
    }
  }

  // Para las fuentes oficiales (GET con reintentos y pausa por servicio).
  async function fetchJsonWithBackoff(service, urlForAttempt, initForAttempt, timeoutMs) {
    if (msHastaFinDePausa(service) > 0) throw new Error('Servicio en pausa temporal: ' + service);
    const requestGeneration = generation;
    const maxRetries = 3;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (!enabled || requestGeneration !== generation) throw abortException();
      try {
        const r = await fetchJson(urlForAttempt(attempt), initForAttempt(attempt), timeoutMs, null);
        registrarExito(service);
        return r.json;
      } catch (error) {
        lastError = error;
        if (!enabled || requestGeneration !== generation) throw abortException();
        if (!retryable(error) && !esAbort(error)) throw error;
      }
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => window.setTimeout(resolve, getRetryDelay(lastError, attempt)));
      }
    }

    registrarFallo(service, 90000);
    throw lastError || new Error(service + ' no disponible');
  }

  /* ---------------- Caché por celdas ------------------------------------- */
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

  /* ---------------- Carga de datos -------------------------------------- */
  function consultaFuentes(range) {
    const b = boundsOfRange(range);
    const bbox = [b.south, b.west, b.north, b.east].map(v => v.toFixed(6)).join(',');
    return '[out:json][timeout:15];(' +
      'nwr["amenity"="drinking_water"](' + bbox + ');' +
      'nwr["man_made"="water_tap"]["drinking_water"="yes"](' + bbox + ');' +
      'nwr["natural"="spring"]["drinking_water"="yes"](' + bbox + ');' +
      'nwr["amenity"="fountain"]["drinking_water"="yes"](' + bbox + ');' +
      ');out center qt;';
  }

  // Devuelve cuántas celdas visibles quedan por pedir (0 = todo cubierto).
  async function loadOverpass(bounds, visibleCells) {
    for (const cell of visibleCells) {
      const entry = osmCells.get(cell.key);
      if (entry) entry.touched = Date.now();
    }
    const cx = (bounds.west + bounds.east) / 2;
    const cy = (bounds.south + bounds.north) / 2;

    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const missing = cellsMissing(osmCells, visibleCells);
      if (!missing.length) break;
      const distancia = c => Math.hypot((c.west + c.east) / 2 - cx, (c.south + c.north) / 2 - cy);
      missing.sort((a, b) => distancia(a) - distancia(b));

      let lote = missing.slice(0, MAX_CELLS_PER_QUERY);
      let range = rangeOf(lote);
      let queryCells = cellsInRange(range);
      if (queryCells.length > MAX_CELLS_PER_REQUEST) {
        lote = [missing[0]];
        range = rangeOf(lote);
        queryCells = cellsInRange(range);
      }

      const data = await overpassPost(OVERPASS_SERVICE, consultaFuentes(range));
      const features = data.elements.map(featureFromOverpass).filter(Boolean);
      cacheFeaturesByCell(osmCells, queryCells, features);
      trimCellCache(osmCells, visibleCells);
    }
    return cellsMissing(osmCells, visibleCells).length;
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
    const range = rangeOf(missing);
    const queryCells = cellsInRange(range);
    if (queryCells.length > MAX_CELLS_PER_REQUEST) return;
    const queryBounds = intersectBounds(boundsOfRange(range), source.bounds);
    if (!queryBounds) return;
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
    for (const feature of fuentesAguaDesdeTiles(bounds)) osm.set(String(feature.id), feature);

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

  /* ---------------- Búsqueda de la fuente más cercana (chat) ------------- */
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
    const data = await overpassPost(NATURAL_SERVICE, query);
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
    while (requestRunning && waitedMs < PROXY_TIMEOUT_MS + 2000) {
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
      const fallo = results.find(result => result.status === 'rejected');
      throw fallo.reason || new Error('Los servicios de fuentes de agua no están disponibles.');
    }
    if (!candidates.length) return null;

    const nearest = candidates[0];
    const [lon, lat] = nearest.feature.geometry.coordinates;
    return {
      lat,
      lon,
      nombre: nearest.feature.properties.name || t('fountainName', 'Fuente pública de agua'),
      tipo: nearest.feature.properties.category || 'Fuente pública de agua',
      potable: nearest.feature.properties.potable === true,
      fuenteDatos: nearest.feature.properties.source,
      distanciaMetros: Math.round(nearest.distanceMeters)
    };
  }

  // Definida desde el primer momento: si el chat la llama antes de que el
  // mapa esté listo, espera (máx. 60 s) en vez de encontrarse con nada.
  window.manolitAireBuscarFuenteAguaCercana = function (origen) {
    return Promise.race([
      listo,
      new Promise((_, rechazar) => window.setTimeout(
        () => rechazar(new Error('El mapa todavía no está listo para buscar fuentes.')), 60000))
    ]).then(() => buscarFuenteCercana(origen));
  };

  /* ---------------- Pintado ---------------------------------------------- */
  function aplicarFeatures(features) {
    const source = map.getSource(SOURCE_ID);
    if (!source) return;
    const next = new Map(features.map(feature => [String(feature.id), feature]));
    let igual = next.size === renderedFeatures.size;
    if (igual) {
      for (const id of next.keys()) {
        if (!renderedFeatures.has(id)) { igual = false; break; }
      }
    }
    if (igual) return;
    renderedFeatures = next;
    source.setData({ type: 'FeatureCollection', features: Array.from(next.values()) });
  }

  function pintarVista(bounds, cells) {
    aplicarFeatures(featuresForView(bounds, cells));
  }

  function cargarIcono() {
    if (!svgImagePromise) {
      svgImagePromise = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONO_SVG);
      });
      svgImagePromise.catch(() => { svgImagePromise = null; });
    }
    return svgImagePromise;
  }

  function capaCompleta() {
    return !!(map.getSource(SOURCE_ID) && map.getLayer(HALO_ID) && map.getLayer(DOT_ID) &&
      map.getLayer(LAYER_ID) && map.hasImage(IMAGE_ID));
  }

  async function ensureGraphicLayer() {
    if (!enabled || !mapReady) return;
    if (capaCompleta()) return;
    try {
      let iconImage = null;
      try { iconImage = await cargarIcono(); } catch (error) { iconImage = null; }
      if (!enabled || !map.isStyleLoaded()) return;

      if (iconImage && !map.hasImage(IMAGE_ID)) map.addImage(IMAGE_ID, iconImage, { pixelRatio: 1 });
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          attribution: ATRIBUCION
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
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 7, 16, 13],
            'circle-color': '#12343D',
            'circle-opacity': 0.22
          }
        });
      }
      if (!map.getLayer(DOT_ID)) {
        map.addLayer({
          id: DOT_ID,
          type: 'circle',
          source: SOURCE_ID,
          minzoom: MIN_ZOOM,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 7],
            'circle-color': '#35C4D4',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      }
      if (map.hasImage(IMAGE_ID) && !map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          minzoom: MIN_ZOOM,
          layout: {
            'icon-image': IMAGE_ID,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 12.5, 0.8, 17, 1.1],
            'icon-anchor': 'bottom',
            'icon-offset': [0, -4],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });
      }
      [HALO_ID, DOT_ID, LAYER_ID].forEach(id => { if (map.getLayer(id)) map.moveLayer(id); });

      if (!renderedFeatures.size && map.getZoom() >= MIN_ZOOM) {
        const bounds = boundsOfMap();
        if (bounds) {
          const cells = cellsForBounds(bounds);
          if (cells.length) pintarVista(bounds, cells);
        }
      }
    } catch (error) {
      console.debug('[fuentes-agua] No se pudo preparar la capa:', error);
    }
  }

  function destroyGraphicLayer() {
    try {
      [LAYER_ID, DOT_ID, HALO_ID].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      if (map.hasImage(IMAGE_ID)) map.removeImage(IMAGE_ID);
    } catch (error) {
      console.debug('[fuentes-agua] No se pudo liberar la capa:', error);
    }
    renderedFeatures = new Map();
    if (popup) { try { popup.remove(); } catch (e) { /* sin popup */ } popup = null; }
  }

  /* ---------------- Popup al tocar una fuente ---------------------------- */
  function crearBotonDireccion(nombreFuente, coords) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.setAttribute('aria-label', t('fountainGetDirections', 'Obtener dirección'));
    boton.title = t('fountainGetDirections', 'Obtener dirección');
    boton.style.cssText =
      'display:inline-flex;align-items:center;justify-content:center;gap:7px;' +
      'margin-top:9px;padding:7px 13px;border:1px solid rgba(18,52,61,0.16);' +
      'border-radius:999px;background:linear-gradient(135deg,#12343D,#0E3B47);color:#fff;' +
      'font:600 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;transition:transform .15s ease,box-shadow .15s ease';
    boton.innerHTML =
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>' +
      '<span>' + t('fountainDirections', 'Dirección') + '</span>';
    boton.addEventListener('mouseenter', () => { boton.style.transform = 'translateY(-1px)'; });
    boton.addEventListener('mouseleave', () => { boton.style.transform = 'translateY(0)'; });
    boton.addEventListener('focus', () => { boton.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.35)'; });
    boton.addEventListener('blur', () => { boton.style.boxShadow = 'none'; });
    boton.addEventListener('click', (evento) => {
      evento.stopPropagation();
      obtenerRutaHaciaFuente(coords, nombreFuente);
    });
    return boton;
  }

  function obtenerRutaHaciaFuente(coords, nombre) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const origen = {
          lat: posicion.coords.latitude,
          lon: posicion.coords.longitude,
          nombre: t('myLocation', 'Mi ubicación')
        };
        const destino = {
          lat: coords[1],
          lon: coords[0],
          nombre: nombre
        };
        const inputOrigen = document.getElementById('rsOrigen');
        const inputDestino = document.getElementById('rsDestino');
        if (inputOrigen) inputOrigen.value = origen.nombre;
        if (inputDestino) inputDestino.value = destino.nombre;
        if (typeof window.manolitAireCalcularRutaAgua === 'function') {
          try {
            await window.manolitAireCalcularRutaAgua(origen, destino);
          } catch (error) {
            console.debug('No se pudo calcular la ruta hacia la fuente:', error);
          }
        }
      },
      (error) => {
        console.debug('Permiso de ubicación no disponible para la ruta:', error);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  function onMapClick(event) {
    if (!enabled || typeof maplibregl === 'undefined') return;
    const capas = [LAYER_ID, DOT_ID].filter(id => map.getLayer(id));
    if (!capas.length) return;
    const encontradas = map.queryRenderedFeatures(event.point, { layers: capas });
    if (!encontradas.length) return;
    const feature = encontradas[0];
    const props = feature.properties || {};
    const coords = feature.geometry && feature.geometry.coordinates;
    if (!coords || coords.length < 2) return;

    const nombre = String(props.name || t('fountainName', 'Fuente pública de agua'));
    const caja = document.createElement('div');
    caja.style.cssText = 'font:13px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#12343D;max-width:220px';
    const titulo = document.createElement('strong');
    titulo.textContent = nombre;
    caja.appendChild(titulo);
    caja.appendChild(crearBotonDireccion(nombre, coords));

    if (popup) { try { popup.remove(); } catch (e) { /* sin popup */ } }
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '240px', offset: 10 })
      .setLngLat([coords[0], coords[1]])
      .setDOMContent(caja)
      .addTo(map);
  }

  /* ---------------- Ciclo de refresco ------------------------------------ */
  function cancelarPeticiones() {
    generation++;
    requestRunning = false;
    refreshQueued = false;
    for (const controller of activeControllers) controller.abort();
    activeControllers.clear();
  }

  function programarSiguientePaso(ms) {
    if (!enabled || autoSteps >= MAX_AUTO_STEPS) return;
    autoSteps++;
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(refreshCurrentView, ms);
  }

  function refreshCurrentView() {
    if (!enabled || !mapReady) return;
    if (!map.getSource(SOURCE_ID)) {
      ensureGraphicLayer().then(() => {
        if (enabled && map.getSource(SOURCE_ID)) refreshCurrentView();
      });
      return;
    }
    if (map.getZoom() < MIN_ZOOM) {
      // Las capas llevan minzoom: los datos se quedan cargados y reaparecen
      // al acercarse. Solo se cancela lo que esté en vuelo.
      if (requestRunning) cancelarPeticiones();
      return;
    }
    const bounds = boundsOfMap();
    if (!bounds) return;
    const cells = cellsForBounds(bounds);
    if (!cells.length) return;
    pintarVista(bounds, cells);

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
    ]).then(resultados => {
      if (!enabled || requestGeneration !== generation) return;
      const vista = boundsOfMap();
      if (vista && map.getZoom() >= MIN_ZOOM) {
        const celdasVista = cellsForBounds(vista);
        if (celdasVista.length) pintarVista(vista, celdasVista);
      }
      const osm = resultados[0];
      if (osm.status === 'fulfilled') {
        if (osm.value > 0) programarSiguientePaso(250); // quedan celdas por pedir
        else autoSteps = 0;
      } else if (!esAbort(osm.reason)) {
        // Overpass ha fallado: reintento automático al acabar la pausa,
        // sin esperar a que la persona mueva el mapa.
        programarSiguientePaso(Math.max(4000, msHastaFinDePausa(OVERPASS_SERVICE)) + 500);
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
    autoSteps = 0;
    window.clearTimeout(moveTimer);
    moveTimer = window.setTimeout(refreshCurrentView, MOVE_DEBOUNCE_MS);
  }

  function onMoveEnd() {
    if (!enabled) return;
    autoSteps = 0;
    window.clearTimeout(moveTimer);
    moveTimer = window.setTimeout(refreshCurrentView, MOVEEND_DEBOUNCE_MS);
  }

  function onMapReady() {
    mapReady = true;
    if (enabled) ensureGraphicLayer().then(refreshCurrentView);
  }

  function asegurarCapaCuandoElMapaQuedeInactivo() {
    if (!toggle.checked) return;
    if (!enabled) activate();
    if (!mapReady) mapReady = true;
    ensureGraphicLayer().then(refreshCurrentView);
  }

  function activate() {
    if (enabled) return;
    enabled = true;
    generation++;
    autoSteps = 0;
    if (!mapReady && map.isStyleLoaded()) mapReady = true;
    map.on('move', scheduleRefresh);
    map.on('moveend', onMoveEnd);
    map.on('click', onMapClick);
    if (mapReady) ensureGraphicLayer().then(refreshCurrentView);
  }

  function deactivate() {
    enabled = false;
    cancelarPeticiones();
    window.clearTimeout(moveTimer);
    window.clearTimeout(retryTimer);
    map.off('move', scheduleRefresh);
    map.off('moveend', onMoveEnd);
    map.off('click', onMapClick);
    destroyGraphicLayer();
  }

  function iniciar(mapa, interruptor) {
    map = mapa;
    toggle = interruptor;

    toggle.addEventListener('change', () => {
      if (toggle.checked) activate();
      else deactivate();
    });

    map.on('load', onMapReady);
    map.on('idle', asegurarCapaCuandoElMapaQuedeInactivo);
    map.on('style.load', () => {
      if (!enabled) return;
      renderedFeatures = new Map();
      ensureGraphicLayer().then(refreshCurrentView);
    });

    if (map.isStyleLoaded()) mapReady = true;
    if (toggle.checked) activate();
    if (resolverListo) resolverListo();
  }

  // El mapa y el interruptor pueden no existir aún cuando carga este script:
  // se espera (hasta 2 min), igual que aparcamientos-viaje.js.
  (function esperarMapa(intentos) {
    try {
      const mapa = window.manolitAireMap;
      const interruptor = document.getElementById('rsToggleFuentesAgua');
      if (mapa && interruptor) {
        iniciar(mapa, interruptor);
        return;
      }
    } catch (error) {
      console.debug('[fuentes-agua] Error al enganchar el mapa:', error);
    }
    if (intentos < 240) window.setTimeout(() => esperarMapa(intentos + 1), 500);
  })(0);
})();
