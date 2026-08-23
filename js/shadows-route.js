/* ============================================================
   MANOLIT AIRE — Ruta real + Sombras 3D reales + AQI (origen)
   Stack: MapLibre GL JS (edificios 3D + capas) + SunCalc (sol)
   + Turf.js (geometría de sombra) + OSRM (ruta por calles)
   + Dijkstra térmico client-side (red peatonal local)

   v5 — FASE 1: motor Dijkstra térmico (Univ. Sevilla, "Mapas y rutas de sombra"):
   - Grafo peatonal cargado desde GeoJSON estático local y filtrado por BBox +500 m.
   - Peso térmico por arista: w(e) = Longitud(m) × (1 + penalización solar).
   - Cola de prioridad binaria manual en Vanilla JS; objetivo < 15 ms.
   - Fallback automático a OSRM si no hay red local disponible.

   v4 (revisión anterior) — sincronización con la capa de árboles:
   - Se expone window.manolitAireHoraEfectiva() para que CUALQUIER
     otro script (como arboles-globales.js) use la MISMA hora que
     el slider de tiempo, en vez de tirar de su propio new Date().
   - Se expone window.manolitAireCentroSol() para que los árboles
     calculen el sol respecto al mismo punto de referencia que los
     edificios (puntoReferenciaSol), no un centro de mapa distinto.
   - Cada vez que cambia la hora (slider, "Ahora", solsticios,
     toggle de sombras, paseo virtual, o el refresco automático
     cada 60s) se llama a window.manolitAireRecalcularArboles(),
     si existe, para que las sombras de los árboles se recalculen
     exactamente en el mismo momento que las de los edificios.
   - Corregido un error de sintaxis en calcularRutaConPrioridadSombra
     ("generarPoligonosSombra= await generarPoligonosSombraPara(...)")
     que rompía todo el script en cuanto se ejecutaba esa función.
   - El badge de "% del trayecto en sombra" ya no se congela: se
     recalcula cada vez que se recalculan los tramos en sombra de
     la ruta (slider, paseo virtual, caminata...), y se oculta si
     deja de haber ruta o sombras.
   ============================================================ */

'use strict';

(function () {
  const CONFIG = {
    centroInicial: [-5.9845, 37.3891], // [lon, lat] Sevilla
    zoomInicial: 15.5,
    pitchInicial: 55,
    bearingInicial: -15,
    nominatimUrl: 'https://nominatim.openstreetmap.org/search',
    nominatimReverseUrl: 'https://nominatim.openstreetmap.org/reverse',
    osrmUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1',
    velocidadCaminandoKmh: 4.8, 
    airQualityUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    styleUrlClaro: 'https://tiles.openfreemap.org/styles/liberty', 
    edificiosLayerId: 'building-3d',
    fetchTimeoutMs: 9000,
    fetchRetries: 2,
    alturaPorDefectoM: 9, 
    maxEdificiosSombra: 220, 
    loteSombraSize: 30, 
    duracionVueloInicialMs: 2000,
    priorizarSombra: true,
    maxDetourSombra: 1.5,
    maxAlternativasSombra: 3,
    // ----- Motor Dijkstra térmico (red peatonal local + global bajo demanda) -----
    usarRedLocalTermica: true,
    usarOverpassTermica: true,
    redPeatonalUrl: 'data/red-peatonal.geojson',
    redPeatonalMargenM: 500,
    factorPenalizacionSol: 0.7,
    maxNodosRedPeatonal: 80000,
    overpassRedPeatonalUrls: [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
    ],
    overpassTimeoutS: 15,
    // ----- Modo peatón virtual (cámara libre, sin GPS real) -----
    paseoAlturaOjoM: 1.65,
    paseoVelocidadMs: 2.0,
    paseoVelocidadGiro: 1.6,
    paseoLookAheadM: 25,
    paseoMaxPitch: 72, // Más suave y "virtual", sin pegarse al suelo
    paseoSincroMs: 600, // Menos frecuente, más ligero
    paseoSuavizado: 0.12, // Inercia en el movimiento
  };

  /* ---------------- Traducción: enganche directo al diccionario de i18n.js ---------------- */
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

  function leerVar(nombre) {
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  }

  function cederAlNavegador() {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 120 });
      else setTimeout(resolve, 0);
    });
  }

  function crearDebounce(fn, esperaMs) {
    let temporizador = null;
    return (...args) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => fn(...args), esperaMs);
    };
  }

  /* ============================================================
     MOTOR DIJKSTRA TÉRMICO CLIENT-SIDE — FASE 1
     Basado en el rigor de la Universidad de Sevilla
     ("Mapas y rutas de sombra"). Grafo peatonal local filtrado
     por BBox +500 m; peso térmico w(e) = L(m) × (1 + penalización
     solar). Cola de prioridad binaria manual en Vanilla JS.
     ============================================================ */

  class MinHeap {
    constructor() { this.heap = []; }
    isEmpty() { return this.heap.length === 0; }
    push(item) {
      this.heap.push(item);
      this._bubbleUp(this.heap.length - 1);
    }
    pop() {
      const h = this.heap;
      if (h.length === 0) return null;
      const top = h[0];
      const end = h.pop();
      if (h.length > 0) {
        h[0] = end;
        this._sinkDown(0);
      }
      return top;
    }
    _bubbleUp(idx) {
      const h = this.heap;
      const item = h[idx];
      while (idx > 0) {
        const parentIdx = (idx - 1) >> 1;
        if (h[parentIdx].dist <= item.dist) break;
        h[idx] = h[parentIdx];
        idx = parentIdx;
      }
      h[idx] = item;
    }
    _sinkDown(idx) {
      const h = this.heap;
      const len = h.length;
      const item = h[idx];
      while (true) {
        let swap = idx;
        const left = (idx << 1) + 1;
        const right = left + 1;
        if (left < len && h[left].dist < h[swap].dist) swap = left;
        if (right < len && h[right].dist < h[swap].dist) swap = right;
        if (swap === idx) break;
        h[idx] = h[swap];
        idx = swap;
      }
      h[idx] = item;
    }
  }

  const cacheRedPeatonal = new Map(); // clave bbox -> {bbox, geojson}
  let promesaCargaRedLocal = null;

  function bboxClave(bbox) {
    return bbox.map((v) => v.toFixed(5)).join(',');
  }

  function bboxContiene(bboxGrande, bboxPeque) {
    return (
      bboxPeque[0] >= bboxGrande[0] &&
      bboxPeque[1] >= bboxGrande[1] &&
      bboxPeque[2] <= bboxGrande[2] &&
      bboxPeque[3] <= bboxGrande[3]
    );
  }

  async function cargarRedPeatonalLocal() {
    if (promesaCargaRedLocal) return promesaCargaRedLocal;
    promesaCargaRedLocal = (async () => {
      try {
        const resp = await fetch(CONFIG.redPeatonalUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const geojson = await resp.json();
        if (!geojson || !Array.isArray(geojson.features)) throw new Error('GeoJSON inválido');
        const bbox = turf.bbox(geojson);
        cacheRedPeatonal.set(bboxClave(bbox), { bbox, geojson });
        return { bbox, geojson };
      } catch (e) {
        console.warn('[Dijkstra térmico] No se pudo cargar la red peatonal local:', e.message);
        return null;
      } finally {
        promesaCargaRedLocal = null;
      }
    })();
    return promesaCargaRedLocal;
  }

  function overpassJsonAGeojson(datos) {
    const nodes = {};
    const ways = [];
    for (const el of datos.elements || []) {
      if (el.type === 'node') nodes[el.id] = [el.lon, el.lat];
      else if (el.type === 'way') ways.push(el);
    }

    const features = [];
    for (const way of ways) {
      const coords = [];
      for (const ref of way.nodes || []) {
        if (nodes[ref]) coords.push(nodes[ref]);
      }
      if (coords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: way.tags || {},
        });
      }
    }
    return turf.featureCollection(features);
  }

  async function descargarRedPeatonalOverpass(bbox) {
    const query = `[out:json][timeout:${CONFIG.overpassTimeoutS}]; way["highway"~"footway|pedestrian|path|living_street|steps|residential|tertiary|secondary|primary"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}); out body; >; out skel qt;`;
    let ultimoError = null;
    for (const url of CONFIG.overpassRedPeatonalUrls) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), CONFIG.overpassTimeoutS * 1000 + 3000);
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: 'data=' + encodeURIComponent(query),
          signal: controller.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const datos = await resp.json();
        return overpassJsonAGeojson(datos);
      } catch (e) {
        ultimoError = e;
        continue;
      } finally {
        clearTimeout(id);
      }
    }
    throw ultimoError || new Error('Overpass no disponible');
  }

  async function obtenerRedPeatonal(bbox) {
    // 1. Reutilizar cache si ya tenemos un bbox que cubre el solicitado
    for (const entrada of cacheRedPeatonal.values()) {
      if (bboxContiene(entrada.bbox, bbox)) return entrada.geojson;
    }

    // 2. Intentar archivo local (rápido, sin red)
    if (CONFIG.usarRedLocalTermica) {
      const local = await cargarRedPeatonalLocal();
      if (local && local.geojson.features.length && bboxContiene(local.bbox, bbox)) {
        return local.geojson;
      }
    }

    // 3. Descargar el BBox concreto desde Overpass (global, bajo demanda)
    if (CONFIG.usarOverpassTermica) {
      const geojson = await descargarRedPeatonalOverpass(bbox);
      if (geojson.features.length) {
        cacheRedPeatonal.set(bboxClave(bbox), { bbox, geojson });
        return geojson;
      }
    }

    return null;
  }

  function coordKey(lon, lat) {
    return `${lon.toFixed(8)},${lat.toFixed(8)}`;
  }

  function construirGrafoDesdeGeojson(geojson) {
    const nodos = []; // [[lon, lat], ...]
    const adj = [];   // [{to, longitudM}, ...]
    const idxPorKey = new Map();

    function getNodoIdx(lon, lat) {
      const key = coordKey(lon, lat);
      let idx = idxPorKey.get(key);
      if (idx == null) {
        idx = nodos.length;
        nodos.push([lon, lat]);
        adj.push([]);
        idxPorKey.set(key, idx);
      }
      return idx;
    }

    turf.featureEach(geojson, (feature) => {
      const geom = feature.geometry;
      if (!geom) return;
      let coordenadas;
      if (geom.type === 'LineString') coordenadas = [geom.coordinates];
      else if (geom.type === 'MultiLineString') coordenadas = geom.coordinates;
      else return;

      for (const anillo of coordenadas) {
        if (!anillo || anillo.length < 2) continue;
        for (let i = 0; i < anillo.length - 1; i++) {
          const a = anillo[i], b = anillo[i + 1];
          const idxA = getNodoIdx(a[0], a[1]);
          const idxB = getNodoIdx(b[0], b[1]);
          const longitudM = turf.distance(a, b, { units: 'meters' });
          if (longitudM <= 0) continue;
          adj[idxA].push({ to: idxB, longitudM });
          adj[idxB].push({ to: idxA, longitudM });
        }
      }
    });

    return { nodos, adj, idxPorKey };
  }

  function filtrarRedPorBBox(geojson, bbox) {
    try {
      const poly = turf.bboxPolygon(bbox);
      return turf.featureCollection(geojson.features.filter((f) => {
        try { return turf.booleanIntersects(f, poly); } catch (e) { return false; }
      }));
    } catch (e) {
      return turf.featureCollection([]);
    }
  }

  function encontrarNodoCercano(grafo, lon, lat) {
    let mejorIdx = -1;
    let mejorDist = Infinity;
    for (let i = 0; i < grafo.nodos.length; i++) {
      const n = grafo.nodos[i];
      const d = (n[0] - lon) * (n[0] - lon) + (n[1] - lat) * (n[1] - lat);
      if (d < mejorDist) {
        mejorDist = d;
        mejorIdx = i;
      }
    }
    return mejorIdx;
  }

  function calcularPenalizacionSolar(puntoMedio, posSol) {
    if (!posSol || posSol.altitude <= 0) return 0;
    try {
      const sombras = (typeof ultimaColeccionSombras !== 'undefined' && ultimaColeccionSombras && ultimaColeccionSombras.features) ? ultimaColeccionSombras.features : [];
      for (const poligono of sombras) {
        if (turf.booleanPointInPolygon(turf.point(puntoMedio), poligono)) return 0;
      }
    } catch (e) { /* no hay sombras calculadas todavía */ }
    const intensidad = Math.max(0, Math.sin(posSol.altitude));
    return CONFIG.factorPenalizacionSol * intensidad;
  }

  function dijkstraTermico(grafo, inicioIdx, finIdx, posSol) {
    const n = grafo.nodos.length;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const visitado = new Uint8Array(n);

    dist[inicioIdx] = 0;
    const heap = new MinHeap();
    heap.push({ nodo: inicioIdx, dist: 0 });

    while (!heap.isEmpty()) {
      const actual = heap.pop();
      if (!actual) break;
      const u = actual.nodo;
      if (visitado[u]) continue;
      visitado[u] = 1;
      if (u === finIdx) break;

      const ux = grafo.nodos[u][0], uy = grafo.nodos[u][1];
      for (let i = 0; i < grafo.adj[u].length; i++) {
        const arista = grafo.adj[u][i];
        const v = arista.to;
        if (visitado[v]) continue;

        const vx = grafo.nodos[v][0], vy = grafo.nodos[v][1];
        const puntoMedio = [(ux + vx) * 0.5, (uy + vy) * 0.5];
        const penalizacion = calcularPenalizacionSolar(puntoMedio, posSol);
        const peso = arista.longitudM * (1 + penalizacion);

        const nuevaDist = dist[u] + peso;
        if (nuevaDist < dist[v]) {
          dist[v] = nuevaDist;
          prev[v] = u;
          heap.push({ nodo: v, dist: nuevaDist });
        }
      }
    }

    if (dist[finIdx] === Infinity) return { camino: [], costeTermicoM: Infinity };

    const camino = [];
    for (let at = finIdx; at !== -1; at = prev[at]) {
      camino.push(grafo.nodos[at]);
    }
    camino.reverse();
    return { camino, costeTermicoM: dist[finIdx] };
  }

  async function calcularRutaDijkstraTermico(origen, destino) {
    const t0 = performance.now();

    const lineaOD = turf.lineString([[origen.lon, origen.lat], [destino.lon, destino.lat]]);
    const bboxBase = turf.bboxPolygon(turf.bbox(lineaOD));
    const bboxAmpliado = turf.bbox(turf.buffer(bboxBase, CONFIG.redPeatonalMargenM, { units: 'meters' }));
    const redCompleta = await obtenerRedPeatonal(bboxAmpliado);
    if (!redCompleta) throw new Error('Red peatonal no disponible (ni local ni Overpass)');

    const redFiltrada = filtrarRedPorBBox(redCompleta, bboxAmpliado);
    if (!redFiltrada.features.length) throw new Error('La red peatonal no cubre el área de la ruta');

    const grafo = construirGrafoDesdeGeojson(redFiltrada);
    if (grafo.nodos.length > CONFIG.maxNodosRedPeatonal) {
      throw new Error('La red peatonal filtrada es demasiado densa para este cálculo');
    }

    const inicioIdx = encontrarNodoCercano(grafo, origen.lon, origen.lat);
    const finIdx = encontrarNodoCercano(grafo, destino.lon, destino.lat);
    if (inicioIdx === -1 || finIdx === -1) throw new Error('No se ha podido enganchar origen/destino a la red peatonal');

    const centro = { lat: (origen.lat + destino.lat) * 0.5, lon: (origen.lon + destino.lon) * 0.5 };
    const posSol = SunCalc.getPosition(obtenerHoraEfectiva(), centro.lat, centro.lon);

    const resultado = dijkstraTermico(grafo, inicioIdx, finIdx, posSol);
    if (resultado.camino.length < 2) throw new Error('Dijkstra térmico no ha encontrado camino');

    const distanciaRealKm = turf.length(turf.lineString(resultado.camino), { units: 'kilometers' });
    const duracionMin = (distanciaRealKm / CONFIG.velocidadCaminandoKmh) * 60;

    let coberturaSombraPct = null;
    if (ultimaColeccionSombras && ultimaColeccionSombras.features && ultimaColeccionSombras.features.length) {
      try {
        const lineaRuta = turf.lineString(resultado.camino);
        coberturaSombraPct = Math.round(calcularCoberturaSombra(lineaRuta, ultimaColeccionSombras.features) * 100);
      } catch (e) { /* el badge se actualizará después con los tramos en sombra */ }
    }

    console.log(`[Dijkstra térmico] ${resultado.camino.length} nodos · coste ${resultado.costeTermicoM.toFixed(1)} m · ${(performance.now() - t0).toFixed(2)} ms`);

    return {
      geojson: { type: 'LineString', coordinates: resultado.camino },
      distanciaKm: distanciaRealKm.toFixed(2),
      duracionMin: Math.round(duracionMin),
      esReal: true,
      duracionEstimada: true,
      coberturaSombraPct,
      esDijkstraTermico: true,
    };
  }

  // Avisa (si existe) a la capa de árboles de que recalcule sus sombras
  // con la hora actual. Se centraliza aquí para no olvidar ningún sitio.
  function sincronizarArboles() {
    try {
      if (typeof window.manolitAireRecalcularArboles === 'function') {
        window.manolitAireRecalcularArboles();
      }
    } catch (e) {
      console.warn('No se ha podido sincronizar la sombra de los árboles:', e);
    }
  }

  const mapEl = document.getElementById('shadowRouteMap');
  if (!mapEl) return;

  const contenedorMapa = mapEl.parentElement || mapEl;
  if (getComputedStyle(contenedorMapa).position === 'static') {
    contenedorMapa.style.position = 'relative';
  }

  /* ---------------- Mapa MapLibre con edificios 3D reales ---------------- */

 const map = new maplibregl.Map({
    container: 'shadowRouteMap',
    style: CONFIG.styleUrlClaro,
    center: CONFIG.centroInicial,
    zoom: Math.max(CONFIG.zoomInicial - 2.3, 1),
    pitch: 0,
    bearing: 0,
    attributionControl: true
});

// AHORA SÍ: El mapa está creado, lo pasamos a global para que los árboles lo enganchen
window.manolitAireMap = map;
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
  let capaEdificiosDisponible = false;
  let edificiosCacheados = [];
  let cieloSolActivo = false;

  /* ----- Estado: modo peatón virtual (cámara libre) ----- */
  let paseoActivo = false;
  let paseoRafId = null;
  let paseoUltimoFrame = 0;
  let paseoOrigenMercator = null;
  let paseoMetrosAU = 0; // metros a unidades mercator
  let paseoJugador = { x: 0, y: 0, bearing: 0 };
  let paseoVelocidadSuavizada = 0; // inercia lineal
  let paseoGiroSuavizado = 0;     // inercia angular
  let paseoToques = new Map(); // pointerId -> {x,y}
  let paseoJoystick = { active:false, startX:0, startY:0, dx:0, dy:0, pointerId:null };
  let paseoEstadoPrevio = null; // snapshot del mapa antes de entrar, para restaurarlo al salir
  let paseoUltimaSincroMs = 0;

  // Registro global de teclas para el paseo 3D
  const keysDown = new Set();
  addEventListener('keydown', e => keysDown.add(e.code));
  addEventListener('keyup', e => keysDown.delete(e.code));

  map.on('load', () => {
    const capas = map.getStyle().layers || [];
    const capaEdificios = capas.find(
      (l) => l.type === 'fill-extrusion' && /building/i.test(l.id)
    );
    if (capaEdificios) {
      CONFIG.edificiosLayerId = capaEdificios.id;
      capaEdificiosDisponible = true;
      try {
        map.setPaintProperty(CONFIG.edificiosLayerId, 'fill-extrusion-color', [
          'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], ['get', 'height'], 8],
          0, '#8fb3e8',
          30, '#5f8fd6',
          70, '#3f6bc0',
          140, '#274a96'
        ]);
        map.setPaintProperty(CONFIG.edificiosLayerId, 'fill-extrusion-opacity', 0.93);
        map.setPaintProperty(CONFIG.edificiosLayerId, 'fill-extrusion-vertical-gradient', true);
      } catch (e) {
        console.warn('No se ha podido aplicar el color vivo a los edificios:', e);
      }
    }

    map.addSource('sombras-halo', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer(
      {
        id: 'capa-sombras-halo',
        type: 'fill',
        source: 'sombras-halo',
        paint: { 'fill-color': '#0b1220', 'fill-opacity': 0.10 },
      },
      capaEdificiosDisponible ? CONFIG.edificiosLayerId : undefined
    );

    map.addSource('sombras', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer(
      {
        id: 'capa-sombras',
        type: 'fill',
        source: 'sombras',
        paint: { 'fill-color': '#0b1220', 'fill-opacity': 0.28 },
      },
      capaEdificiosDisponible ? CONFIG.edificiosLayerId : undefined
    );

    map.addSource('ruta', { type: 'geojson', data: turf.featureCollection([]) });
    // Outline para que la ruta no se confunda con calles del mapa
    map.addLayer({
      id: 'capa-ruta-outline',
      type: 'line',
      source: 'ruta',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#1a0d00', 'line-width': 9, 'line-opacity': 0.85 },
    });
    map.addLayer({
      id: 'capa-ruta-glow',
      type: 'line',
      source: 'ruta',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ff9500', 'line-width': 11, 'line-opacity': 0.35, 'line-blur': 8 },
    });
    map.addLayer({
      id: 'capa-ruta',
      type: 'line',
      source: 'ruta',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ff7b00', 'line-width': 5, 'line-opacity': 1 },
    });

    map.addSource('ruta-sombra', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer({
      id: 'capa-ruta-sombra-outline',
      type: 'line',
      source: 'ruta-sombra',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#00151a', 'line-width': 9, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: 'capa-ruta-sombra',
      type: 'line',
      source: 'ruta-sombra',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#00d4ff', 'line-width': 5, 'line-opacity': 0.95 },
    });

    map.addSource('puntos-manuales', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer({
      id: 'capa-puntos-manuales',
      type: 'circle',
      source: 'puntos-manuales',
      paint: {
        'circle-radius': 7,
        'circle-color': leerVar('--accent') || '#0eedc0',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FBFAF7',
      },
    });

    map.addSource('precision-ubicacion', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer(
      {
        id: 'capa-precision-ubicacion',
        type: 'fill',
        source: 'precision-ubicacion',
        paint: { 'fill-color': leerVar('--accent') || '#00f2ff', 'fill-opacity': 0.12 },
      },
      'capa-puntos-manuales'
    );
    map.addLayer(
      {
        id: 'capa-precision-ubicacion-borde',
        type: 'line',
        source: 'precision-ubicacion',
        paint: { 'line-color': leerVar('--accent') || '#00f2ff', 'line-width': 1, 'line-opacity': 0.4 },
      },
      'capa-puntos-manuales'
    );

    inyectarControlesTiempo();
    inyectarControlesMapa();
    inyectarSolVisual();
    inyectarBadgeSombra();
    conectarTogglesDeCapas();

    setTimeout(() => {
      map.easeTo({
        pitch: CONFIG.pitchInicial,
        bearing: CONFIG.bearingInicial,
        zoom: CONFIG.zoomInicial,
        duration: CONFIG.duracionVueloInicialMs,
        essential: true,
      });
    }, 150);
  });

  const alTerminarMovimiento = crearDebounce(() => {
    if (!solarActivado || paseoActivo) return;
    actualizarCacheEdificios();
    if (document.getElementById('rsToggleSombras')?.checked) recalcularSombrasVisibles();
    sincronizarArboles();
  }, 220);
  map.on('moveend', alTerminarMovimiento);

  map.on('move', () => actualizarSolVisualEnMapa());

  let solarActivado = false;
  function asegurarActivacionSolar() {
    if (solarActivado) return;
    solarActivado = true;
    actualizarCacheEdificios();
  }

  function actualizarCacheEdificios() {
    if (!capaEdificiosDisponible || !map.getLayer(CONFIG.edificiosLayerId)) return;
    edificiosCacheados = map
      .queryRenderedFeatures({ layers: [CONFIG.edificiosLayerId] })
      .slice(0, CONFIG.maxEdificiosSombra);
  }

  /* ---------------- Sombras reales: sol + altura de edificios ---------------- */

  function unirDosPoligonos(a, b) {
    try {
      const r = turf.union(turf.featureCollection([a, b]));
      if (r) return r;
    } catch (e) { /* probamos la otra firma */ }
    try {
      const r = turf.union(a, b);
      if (r) return r;
    } catch (e) { /* nos quedamos con lo que había */ }
    return a;
  }

  function calcularVolumenSombra(poligonoSimple, distanciaKm, bearingSombra) {
    const anillo = poligonoSimple.geometry.coordinates[0];
    let resultado = poligonoSimple;
    for (let i = 0; i < anillo.length - 1; i++) {
      const p1 = anillo[i];
      const p2 = anillo[i + 1];
      const p1t = turf.transformTranslate(turf.point(p1), distanciaKm, bearingSombra, { units: 'kilometers' }).geometry.coordinates;
      const p2t = turf.transformTranslate(turf.point(p2), distanciaKm, bearingSombra, { units: 'kilometers' }).geometry.coordinates;
      try {
        const cuadrilatero = turf.polygon([[p1, p2, p2t, p1t, p1]]);
        resultado = unirDosPoligonos(resultado, cuadrilatero);
      } catch (e) {
        continue;
      }
    }
    return resultado;
  }

  function obtenerHoraEfectiva() {
    return modoManual ? obtenerFechaDelSlider() : new Date();
  }

  // Expuesto para que cualquier otro script (árboles, etc.) use SIEMPRE
  // la misma hora "efectiva" que el slider de tiempo, en vez de tirar de
  // su propio new Date(). Esto es lo que faltaba para que las sombras de
  // los árboles se movieran igual que las de los edificios.
  window.manolitAireHoraEfectiva = () => obtenerHoraEfectiva();

  // Mismo punto de referencia solar que usan los edificios (el origen de
  // la ruta, tu posición al caminar, etc.), en vez de un centro de mapa
  // potencialmente distinto.
  window.manolitAireCentroSol = () => {
    const c = puntoReferenciaSol || map.getCenter();
    return { lat: c.lat, lon: c.lon ?? c.lng };
  };

  let versionCalculoSombras = 0;
  let ultimaColeccionSombras = turf.featureCollection([]);

  async function recalcularSombrasVisibles(horaOverride) {
    if (!map.getSource('sombras')) return;
    const miVersion = ++versionCalculoSombras;

    const ahora = horaOverride || obtenerHoraEfectiva();
    const centro = puntoReferenciaSol || map.getCenter();
    const lat = centro.lat, lon = centro.lon ?? centro.lng;
    const posSol = SunCalc.getPosition(ahora, lat, lon);
    actualizarBadgeHoraDorada(ahora, lat, lon);

    if (!document.getElementById('rsToggleSombras')?.checked) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      ultimaColeccionSombras = turf.featureCollection([]);
      return;
    }

    if (posSol.altitude <= 0) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      ultimaColeccionSombras = turf.featureCollection([]);
      mostrarAvisoSol(t('sunBelow', 'El sol está bajo el horizonte a esa hora — no hay sombras que proyectar.'));
      return;
    }
    mostrarAvisoSol('');

    if (!capaEdificiosDisponible || !edificiosCacheados.length) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      ultimaColeccionSombras = turf.featureCollection([]);
      return;
    }

    const azimutGrados = (posSol.azimuth * 180) / Math.PI + 180;
    const bearingSombra = (azimutGrados + 180) % 360;

    const poligonosSombra = [];
    for (let i = 0; i < edificiosCacheados.length; i += CONFIG.loteSombraSize) {
      if (miVersion !== versionCalculoSombras) return;

      const lote = edificiosCacheados.slice(i, i + CONFIG.loteSombraSize);
      for (const edificio of lote) {
        try {
          const altura = Number(edificio.properties.height ?? edificio.properties.render_height) || CONFIG.alturaPorDefectoM;
          const longitudSombraM = altura / Math.tan(posSol.altitude);
          if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;

          const geom = edificio.geometry;
          if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

          const distanciaKm = longitudSombraM / 1000;
          const partes = turf.flatten(turf.feature(geom)).features;
          for (const parte of partes) {
            const volumen = calcularVolumenSombra(parte, distanciaKm, bearingSombra);
            if (volumen) poligonosSombra.push(volumen);
          }
        } catch (e) {
          continue;
        }
      }

      if (miVersion !== versionCalculoSombras) return;
      map.getSource('sombras')?.setData(turf.featureCollection(poligonosSombra));
      if (i + CONFIG.loteSombraSize < edificiosCacheados.length) await cederAlNavegador();
    }

    if (miVersion !== versionCalculoSombras) return;
    const coleccionSombras = turf.featureCollection(poligonosSombra);
    map.getSource('sombras')?.setData(coleccionSombras);
    ultimaColeccionSombras = coleccionSombras;

    if (poligonosSombra.length <= 160) {
      try {
        const halo = turf.buffer(coleccionSombras, 3.5, { units: 'meters', steps: 4 });
        if (miVersion === versionCalculoSombras) map.getSource('sombras-halo')?.setData(halo || turf.featureCollection([]));
      } catch (e) {
        map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      }
    } else {
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
    }
  }

  function mostrarAvisoSol(texto) {
    const el = document.getElementById('rsSunNote');
    if (el) el.textContent = texto;
  }

  setInterval(() => {
    if (!solarActivado || modoManual || paseoActivo) return;
    if (map.loaded()) recalcularSombrasVisibles();
    actualizarIluminacionSolar();
    sincronizarArboles();
  }, 60 * 1000);

  /* ---------------- Widget de posición del sol ---------------- */

  let puntoReferenciaSol = null;
  let rutaActual = null;

  function puntoEnSombra(punto) {
    for (const poligono of ultimaColeccionSombras.features) {
      try {
        if (turf.booleanPointInPolygon(punto, poligono)) return true;
      } catch (e) { /* geometría rara: la ignoramos */ }
    }
    return false;
  }

  async function actualizarTramosSombraRuta() {
    const fuente = map.getSource('ruta-sombra');
    if (!fuente) return;
    if (!rutaActual || !ultimaColeccionSombras.features.length) {
      fuente.setData(turf.featureCollection([]));
      // El badge de % de sombra ya no se queda con el valor viejo cuando
      // deja de haber ruta o sombras que mostrar.
      mostrarBadgeSombra(null);
      return;
    }
    try {
      const tramos = turf.lineChunk(rutaActual, 0.01, { units: 'kilometers' });
      const tramosEnSombra = tramos.features.filter((tramo) => {
        const coords = tramo.geometry.coordinates;
        const medio = turf.point(coords[Math.floor(coords.length / 2)] || coords[0]);
        return puntoEnSombra(medio);
      });
      fuente.setData(turf.featureCollection(tramosEnSombra));
      // Antes el badge de "% del trayecto en sombra" solo se calculaba una
      // vez, al buscar la ruta, y se quedaba congelado aunque cambiaras la
      // hora con el slider. Ahora se recalcula cada vez que se recalculan
      // los tramos en sombra (que ya se llama desde el slider, el paseo
      // virtual, la caminata, etc.), así que el badge siempre va en vivo.
      if (tramos.features.length) {
        mostrarBadgeSombra(Math.round((tramosEnSombra.length / tramos.features.length) * 100));
      } else {
        mostrarBadgeSombra(null);
      }
    } catch (e) {
      console.warn('No se ha podido calcular qué tramos de la ruta están en sombra:', e);
      fuente.setData(turf.featureCollection([]));
    }
  }
  function calcularAnguloSol(horaOverride) {
    const centro = puntoReferenciaSol || map.getCenter();
    const lat = centro.lat;
    const lon = centro.lon ?? centro.lng;
    const pos = SunCalc.getPosition(horaOverride || obtenerHoraEfectiva(), lat, lon);
    const azimutDeg = ((pos.azimuth * 180) / Math.PI + 180) % 360;
    const alturaDeg = (pos.altitude * 180) / Math.PI;
    return { azimutDeg, alturaDeg };
  }

  function actualizarIluminacionSolar(horaOverride) {
    const tSol = document.getElementById('rsToggleSol');
    if (!tSol) return;

    if (!tSol.checked) {
      map.setSky(undefined);
      cieloSolActivo = false;
      map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.35, position: [1.5, 0, 40] });
      actualizarSolVisualEnMapa();
      return;
    }

    const { azimutDeg, alturaDeg } = calcularAnguloSol(horaOverride);
    const bajoHorizonte = alturaDeg <= 0;
    const polar = Math.max(0, 90 - Math.max(alturaDeg, 0));

    map.setLight({
      anchor: 'map',
      color: bajoHorizonte ? '#3a4a63' : '#fff6e6',
      intensity: bajoHorizonte ? 0.15 : Math.min(1, 0.35 + alturaDeg / 90),
      position: [1.5, azimutDeg, polar],
    });

    map.setSky({
      'sky-color': bajoHorizonte ? '#0a1220' : '#199EF3',
      'sky-horizon-blend': 0.5,
      'horizon-color': bajoHorizonte ? '#2a3a55' : '#ffffff',
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0.3]
    });
    cieloSolActivo = true;

    actualizarSolVisualEnMapa();
  }

  function inyectarSolVisual() {
    if (document.getElementById('rsSolVisual')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rsSolVisualEstilos';
    estilo.textContent = `
      #rsSolVisual{
        position:absolute; width:34px; height:34px; border-radius:50%;
        background:radial-gradient(circle, #fff6d8 0%, #ffcf7a 45%, rgba(255,207,122,0) 75%);
        box-shadow:0 0 22px 10px rgba(255,207,122,0.55);
        transform:translate(-50%,-50%);
        pointer-events:none; z-index:4; display:none;
        transition:left .25s linear, top .25s linear, opacity .25s ease;
      }
    `;
    document.head.appendChild(estilo);
    const sol = document.createElement('div');
    sol.id = 'rsSolVisual';
    contenedorMapa.appendChild(sol);
  }

  function actualizarSolVisualEnMapa() {
    const el = document.getElementById('rsSolVisual');
    const tSol = document.getElementById('rsToggleSol');
    if (!el) return;
    if (!tSol || !tSol.checked) { el.style.display = 'none'; return; }

    const { azimutDeg, alturaDeg } = calcularAnguloSol();
    if (alturaDeg <= 0) { el.style.display = 'none'; return; }

    const rect = contenedorMapa.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const anguloRelativo = ((azimutDeg - map.getBearing()) * Math.PI) / 180;
    const cx = rect.width / 2;
    const cy = rect.height * 0.55;
    const radioOrbita = Math.min(rect.width, rect.height) * 0.44;
    const factorAltura = Math.min(alturaDeg, 90) / 90;

    const x = cx + radioOrbita * Math.sin(anguloRelativo);
    const y = cy - radioOrbita * factorAltura * 0.9 - rect.height * 0.04;

    el.style.left = `${Math.max(16, Math.min(rect.width - 16, x))}px`;
    el.style.top = `${Math.max(16, Math.min(rect.height - 16, y))}px`;
    el.style.opacity = String(0.55 + factorAltura * 0.45);
    el.style.display = 'block';
  }

  function actualizarBadgeHoraDorada(fechaEfectiva, lat, lon) {
    const badge = document.getElementById('rsGoldenBadge');
    const posSol = SunCalc.getPosition(fechaEfectiva, lat, lon);
    const altitudeDeg = (posSol.altitude * 180) / Math.PI;

    let solarNoonMs = null;
    let estado = null;

    try {
      const tiempos = SunCalc.getTimes(fechaEfectiva, lat, lon);
      solarNoonMs = tiempos.solarNoon.getTime();
      const t2 = fechaEfectiva.getTime();
      const enDorada =
        (t2 >= tiempos.sunrise.getTime() && t2 <= tiempos.goldenHourEnd.getTime()) ||
        (t2 >= tiempos.goldenHour.getTime() && t2 <= tiempos.sunset.getTime());
      const enAzul =
        (t2 >= tiempos.dawn.getTime() && t2 <= tiempos.sunrise.getTime()) ||
        (t2 >= tiempos.sunset.getTime() && t2 <= tiempos.dusk.getTime());
      estado = enDorada ? 'dorada' : enAzul ? 'azul' : null;
    } catch (e) { /* sin datos de horario fiables, seguimos sin badge */ }

    if (badge) {
      if (estado === 'dorada') {
        badge.textContent = t('goldenHour', 'Hora dorada');
        badge.style.visibility = 'visible';
        badge.style.color = '#e7b06a';
        badge.style.background = '#e7b06a22';
        badge.style.borderColor = '#e7b06a55';
      } else if (estado === 'azul') {
        badge.textContent = t('blueHour', 'Hora azul');
        badge.style.visibility = 'visible';
        badge.style.color = '#7fb3c9';
        badge.style.background = '#7fb3c922';
        badge.style.borderColor = '#7fb3c955';
      } else {
        badge.style.visibility = 'hidden';
      }
    }

    actualizarIndicadorSolar(altitudeDeg, solarNoonMs != null ? fechaEfectiva.getTime() <= solarNoonMs : true);
  }

  function actualizarIndicadorSolar(altitudeDeg, esManana) {
    const punto = document.getElementById('rsSolPunto');
    const grupo = document.getElementById('rsSolGrupo');
    if (!punto || !grupo) return;

    if (altitudeDeg == null || altitudeDeg <= 0) {
      grupo.style.opacity = '0.25';
      return;
    }
    grupo.style.opacity = '1';

    const cx = 30, cy = 30, r = 26;
    const altura = Math.max(0, Math.min(90, altitudeDeg));
    const theta = esManana ? 180 - altura : altura;
    const rad = (theta * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy - r * Math.sin(rad);
    punto.setAttribute('cx', x.toFixed(1));
    punto.setAttribute('cy', y.toFixed(1));
  }

  /* ---------------- Badge discreto de % de sombra (desplegable, no ocupa toda la pantalla) ---------------- */

  function inyectarBadgeSombra() {
    if (document.getElementById('rsShadowBadge')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rsShadowBadgeEstilos';
    estilo.textContent = `
      #rsShadowBadge{
        position:absolute; left:50%; transform:translateX(-50%); bottom:12px;
        z-index:6; display:none; align-items:center; gap:8px;
        background:rgba(251,250,247,0.94); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
        border:1px solid var(--line, rgba(28,49,68,0.14)); border-radius:999px;
        padding:5px 10px 5px 13px; font-size:10.5px; color:var(--sky-deep, #1C3144);
        box-shadow:0 6px 16px rgba(22,35,46,0.16); max-width:calc(100% - 24px);
        white-space:nowrap;
      }
      #rsShadowBadge.rs-visible{ display:inline-flex; }
      #rsShadowBadgeCerrar{
        background:transparent; border:none; color:var(--sky-mid, #2B4A63); font-size:14px;
        cursor:pointer; line-height:1; padding:0 2px;
      }
      #rsShadowBadgeCerrar:hover{ color:var(--ink, #16232E); }
      @media (max-width:480px){ #rsShadowBadge{ font-size:10.5px; bottom:8px; padding:5px 8px 5px 12px; } }
    `;
    document.head.appendChild(estilo);

    const badge = document.createElement('div');
    badge.id = 'rsShadowBadge';
    const texto = document.createElement('span');
    texto.id = 'rsShadowBadgeTexto';
    const cerrar = document.createElement('button');
    cerrar.id = 'rsShadowBadgeCerrar';
    cerrar.type = 'button';
    cerrar.textContent = '×';
    cerrar.setAttribute('aria-label', 'Cerrar');
    cerrar.addEventListener('click', () => badge.classList.remove('rs-visible'));
    badge.append(texto, cerrar);
    contenedorMapa.appendChild(badge);
  }

  function mostrarBadgeSombra(pct) {
    const badge = document.getElementById('rsShadowBadge');
    const texto = document.getElementById('rsShadowBadgeTexto');
    if (!badge || !texto || pct == null) { badge?.classList.remove('rs-visible'); return; }
    texto.textContent = `${pct}% ${t('shadeCoverage', 'del trayecto en sombra')}`;
    badge.classList.add('rs-visible');
  }

  /* ---------------- Slider de tiempo ---------------- */

  let modoManual = false;
  let fechaBaseManual = new Date();
  let sliderTiempo = null;
  let etiquetaTiempo = null;
  let temporizadorSlider = null;

  function fechaSolsticio(tipo) {
    const anio = new Date().getFullYear();
    return tipo === 'verano' ? new Date(anio, 5, 21, 12, 0, 0) : new Date(anio, 11, 21, 12, 0, 0);
  }

  function minutosDesdeFecha(fecha) {
    return fecha.getHours() * 60 + fecha.getMinutes();
  }

  function obtenerFechaDelSlider() {
    const d = new Date(fechaBaseManual);
    const minutos = Number(sliderTiempo?.value ?? minutosDesdeFecha(new Date()));
    d.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
    return d;
  }

  function formatoHora(fecha) {
    return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function actualizarEtiquetaTiempo(contexto) {
    if (!etiquetaTiempo) return;
    const fecha = obtenerFechaDelSlider();
    const prefijo =
      contexto === 'verano' ? t('summerSolstice', 'Solsticio de verano') + ' — ' :
      contexto === 'invierno' ? t('winterSolstice', 'Solsticio de invierno') + ' — ' :
      modoManual ? t('simulating', 'Simulando') + ' — ' :
      t('now', 'Ahora') + ' — ';
    etiquetaTiempo.textContent = prefijo + formatoHora(fecha);
  }

  async function aplicarCambioDeHora(contexto) {
    actualizarEtiquetaTiempo(contexto);
    await recalcularSombrasVisibles();
    actualizarIluminacionSolar();
    await actualizarTramosSombraRuta();
    // Punto clave: cada cambio de hora (slider, "Ahora", solsticios) debe
    // avisar también a los árboles, o si no se quedan con la hora vieja.
    sincronizarArboles();
  }

  function inyectarEstilosPanel() {
    if (document.getElementById('rsPanelEstilos')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rsPanelEstilos';
    estilo.textContent = `
      #rsTimeControls{
        position:absolute; left:12px; bottom:12px; z-index:5;
        width:max-content; min-width:190px; max-width:calc(100% - 24px);
        background:rgba(251,250,247,0.94);
        backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
        border:1px solid var(--line, rgba(28,49,68,0.14)); border-radius:14px;
        box-shadow:0 8px 22px rgba(22,35,46,0.16);
        padding:10px 13px; font-family:inherit; color:var(--ink, #16232E);
        transition:opacity .18s ease, transform .18s ease;
      }
      #rsTimeControls .rs-cuerpo{ overflow:visible; }
      #rsTimeControls.rs-cerrado .rs-cuerpo{ display:none; }
      #rsTimeControls .rs-fila{ display:flex; align-items:center; gap:8px; }
      #rsTimeControls .rs-cabecera{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
      #rsTimeControls.rs-cerrado .rs-cabecera{ margin-bottom:0; }
      #rsTimeControls:not(.rs-cerrado) .rs-cabecera{ margin-bottom:7px; }
      #rsTimeControls .rs-eyebrow{
        font-size:8.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--sky-mid, #2B4A63);
        font-weight:700;
      }
      #rsPlegarBtn{
        appearance:none; border:none; background:transparent; color:var(--sky-mid, #2B4A63);
        cursor:pointer; padding:2px 4px; opacity:.75; line-height:0;
      }
      #rsPlegarBtn:hover{ opacity:1; }
      #rsPlegarBtn svg{ display:block; transition:transform .2s ease; }
      #rsTimeControls.rs-cerrado #rsPlegarBtn svg{ transform:rotate(180deg); }
      #rsTimeLabel{
        font-family:var(--font-mono, 'IBM Plex Mono', monospace);
        font-size:12px; letter-spacing:.02em; color:var(--sky-deep, #1C3144);
      }
      #rsGoldenBadge{
        font-size:8.5px; font-weight:700; letter-spacing:.04em; padding:2px 7px 2px 5px;
        border-radius:999px; border:1px solid var(--line, rgba(28,49,68,0.14)); white-space:nowrap;
        display:inline-flex; align-items:center; gap:4px; color:var(--sky-mid, #2B4A63);
      }
      #rsGoldenBadge::before{ content:''; width:5px; height:5px; border-radius:50%; background:currentColor; }
      #rsTimeControls .rs-divisor{
        height:1px; margin:8px 0; background:var(--line, rgba(28,49,68,0.14));
      }
      #rsTimeSlider{
        -webkit-appearance:none; appearance:none; width:100%; height:16px; background:transparent; cursor:pointer; margin:4px 0 1px;
      }
      #rsTimeSlider::-webkit-slider-runnable-track{
        height:3px; background:var(--line, rgba(28,49,68,0.18)); border-radius:2px;
      }
      #rsTimeSlider::-webkit-slider-thumb{
        -webkit-appearance:none; margin-top:-6px; width:14px; height:14px; border-radius:50%;
        background:var(--accent, #F4A66B); border:2px solid var(--paper, #FBFAF7); box-shadow:0 1px 4px rgba(22,35,46,0.25);
      }
      #rsTimeSlider::-moz-range-track{ height:3px; background:var(--line, rgba(28,49,68,0.18)); border-radius:2px; }
      #rsTimeSlider::-moz-range-thumb{
        width:12px; height:12px; border-radius:50%; background:var(--accent, #F4A66B); border:2px solid var(--paper, #FBFAF7);
      }
      #rsTimeControls .rs-botones{ display:flex; gap:5px; flex-wrap:wrap; margin-top:8px; }
      #rsTimeControls button{
        flex:1; min-width:0; font-size:9px; letter-spacing:.04em; text-transform:uppercase;
        padding:6px 6px; border-radius:9px; border:1px solid var(--line, rgba(28,49,68,0.14));
        background:var(--mist, #EDF1F0); color:var(--sky-deep, #1C3144);
        cursor:pointer; font-weight:700; transition:background .15s,border-color .15s;
      }
      #rsTimeControls button:hover{ background:var(--accent-soft, rgba(244,166,107,0.16)); border-color:var(--accent, #F4A66B); }
      #rsTimeControls button:active{ background:var(--accent-soft, rgba(244,166,107,0.3)); }
      #rsTimeControls button.rs-btn-capturar{ flex-basis:100%; color:var(--sky-mid, #2B4A63); }
      @media (max-width:480px){ #rsTimeControls{ min-width:170px; } } }
    `;
    document.head.appendChild(estilo);
  }

  /* ---------------- Elegir puntos directamente en el mapa + geolocalización ---------------- */

  let modoClickMapa = false;
  let puntoOrigenPendiente = null;
  let btnModoClickRef = null;

  function inyectarEstilosMapaControles() {
    if (document.getElementById('rsMapaEstilos')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rsMapaEstilos';
    estilo.textContent = `
      #rsMapControls{
        position:absolute; left:12px; top:12px; right:12px; z-index:5; display:flex; gap:5px; flex-wrap:wrap;
      }
      #rsMapControls button{
        font-family:inherit; font-size:9.5px; letter-spacing:.04em; text-transform:uppercase;
        font-weight:700; padding:6px 11px; border-radius:999px;
        border:1px solid var(--line, rgba(28,49,68,0.14));
        background:rgba(251,250,247,0.92); color:var(--sky-deep, #1C3144);
        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        cursor:pointer; box-shadow:0 3px 10px rgba(22,35,46,0.12); transition:background .15s,border-color .15s,color .15s;
      }
      #rsMapControls button:hover{ background:var(--accent-soft, rgba(244,166,107,0.16)); border-color:var(--accent, #F4A66B); }
      #rsMapControls button.rs-activo{ background:var(--accent-soft, rgba(244,166,107,0.16)); border-color:var(--accent, #F4A66B); color:var(--sky-deep, #1C3144); }
      @media (max-width:480px){ #rsMapControls button{ padding:5px 9px; font-size:8.5px; } }

      /* Joystick virtual para paseo 3D */
      #rsJoystick{
        position:absolute; right:24px; bottom:24px; width:96px; height:96px;
        border-radius:50%; background:rgba(251,250,247,0.5);
        border:1px solid var(--line, rgba(28,49,68,0.2)); touch-action:none;
        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        z-index:6; display:none; pointer-events:auto;
      }
      #rsJoystickKnob{
        position:absolute; left:50%; top:50%; width:38px; height:38px;
        transform:translate(-50%,-50%); border-radius:50%;
        background:var(--accent, #F4A66B); border:2px solid var(--paper, #FBFAF7);
        box-shadow:0 3px 10px rgba(22,35,46,0.3); touch-action:none;
      }
      #rsJoystick.rs-visible{ display:block; }
      @media (max-width:480px){
        #rsJoystick{ width:78px; height:78px; right:16px; bottom:16px; }
        #rsJoystickKnob{ width:32px; height:32px; }
      }
    `;
    document.head.appendChild(estilo);
  }

  function inyectarControlesMapa() {
    if (document.getElementById('rsMapControls')) return;
    inyectarEstilosMapaControles();

    const panelMapa = document.createElement('div');
    panelMapa.id = 'rsMapControls';

    const btnModoClick = document.createElement('button');
    btnModoClick.type = 'button';
    btnModoClick.id = 'rsBtnPickMap';
    btnModoClick.textContent = t('pickMap', 'Elegir en el mapa');
    btnModoClickRef = btnModoClick;

    const btnUbicacion = document.createElement('button');
    btnUbicacion.type = 'button';
    btnUbicacion.id = 'rsBtnMyLocation';
    btnUbicacion.textContent = t('myLocation', 'Mi ubicación');

    const btnCaminar = document.createElement('button');
    btnCaminar.type = 'button';
    btnCaminar.id = 'rsBtnWalk';
    btnCaminar.textContent = t('walkModeStart', 'Iniciar caminata');

    const btnPaseo = document.createElement('button');
    btnPaseo.type = 'button';
    btnPaseo.id = 'rsBtnPaseo';
    btnPaseo.textContent = t('virtualWalkStart', 'Paseo virtual 3D');

    const btnReiniciar = document.createElement('button');
    btnReiniciar.type = 'button';
    btnReiniciar.id = 'rsBtnReset';
    btnReiniciar.textContent = t('resetBtn', 'Reiniciar');

    function reiniciarTodo() {
      detenerPaseoVirtual();
      salirDeModoClick();
      detenerCaminata();
      inputOrigen.value = '';
      inputDestino.value = '';
      seleccionPorInput.delete(inputOrigen);
      seleccionPorInput.delete(inputDestino);
      map.getSource('ruta')?.setData(turf.featureCollection([]));
      map.getSource('ruta-sombra')?.setData(turf.featureCollection([]));
      map.getSource('puntos-manuales')?.setData(turf.featureCollection([]));
      map.getSource('precision-ubicacion')?.setData(turf.featureCollection([]));
      if (marcadorOrigen) { marcadorOrigen.remove(); marcadorOrigen = null; }
      if (marcadorDestino) { marcadorDestino.remove(); marcadorDestino = null; }
      rutaActual = null;
      mostrarEstado('');
      mostrarBadgeSombra(null);
    }

    btnReiniciar.addEventListener('click', reiniciarTodo);

    function salirDeModoClick() {
      modoClickMapa = false;
      puntoOrigenPendiente = null;
      esperandoSoloDestino = false;
      btnModoClick.classList.remove('rs-activo');
      map.getSource('puntos-manuales')?.setData(turf.featureCollection([]));
    }

    btnModoClick.addEventListener('click', () => {
      if (modoClickMapa) {
        salirDeModoClick();
        mostrarEstado('');
        return;
      }
      modoClickMapa = true;
      puntoOrigenPendiente = null;
      esperandoSoloDestino = false;
      btnModoClick.classList.add('rs-activo');
      mostrarEstado(t('clickOrigin', 'Haz clic en el mapa para marcar el origen.'));
    });

    let esperandoSoloDestino = false;
    let origenParaAutoRuta = null;

    btnUbicacion.addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        mostrarEstado(t('errorGeolocation', 'Este navegador no permite compartir tu ubicación.'), 'error');
        return;
      }
      mostrarEstado(t('locationAsking', 'Pidiendo permiso de ubicación…'));
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude, lon = pos.coords.longitude;
          const precisionM = Math.round(pos.coords.accuracy || 0);

          seleccionPorInput.set(inputOrigen, { lat, lon, nombre: t('myLocation', 'Mi ubicación'), texto: t('myLocation', 'Mi ubicación') });
          inputOrigen.value = t('myLocation', 'Mi ubicación');

          const puntoUbicacion = turf.point([lon, lat]);
          map.getSource('puntos-manuales')?.setData(turf.featureCollection([puntoUbicacion]));
          if (precisionM > 0) {
            const circuloPrecision = turf.circle([lon, lat], precisionM / 1000, { units: 'kilometers', steps: 48 });
            map.getSource('precision-ubicacion')?.setData(turf.featureCollection([circuloPrecision]));
          } else {
            map.getSource('precision-ubicacion')?.setData(turf.featureCollection([]));
          }

          const notaPrecision = precisionM > 0
            ? ` (${t('locationPrecision', 'precisión reportada por el navegador')}: ±${precisionM} m — ${t('locationNote', 'sin GPS real puede ser orientativa')})`
            : '';
          mostrarEstado(`${t('locationMarked', 'Ubicación marcada como origen')}${notaPrecision} — ${t('chooseDestination', 'toca un punto del mapa para poner el destino.')}`, 'ok');
          map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 15), duration: 900 });

          origenParaAutoRuta = { lat, lon, nombre: t('myLocation', 'Mi ubicación') };
          esperandoSoloDestino = true;
          modoClickMapa = true;
          puntoOrigenPendiente = null;
          btnModoClick.classList.add('rs-activo');
        },
        () => mostrarEstado(t('locationDenied', 'No se ha podido obtener tu ubicación (¿has denegado el permiso?).'), 'error'),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

    /* ---- Modo caminar: sigue tu posición en vivo mientras te mueves ---- */
    let watchId = null;
    let marcadorCaminando = null;

    function detenerCaminata() {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      watchId = null;
      if (marcadorCaminando) { marcadorCaminando.remove(); marcadorCaminando = null; }
      btnCaminar.classList.remove('rs-activo');
      btnCaminar.textContent = t('walkModeStart', 'Iniciar caminata');
    }

    btnCaminar.addEventListener('click', () => {
      if (watchId != null) { detenerCaminata(); mostrarEstado(''); return; }
      if (paseoActivo) detenerPaseoVirtual(); // los dos modos de caminar no pueden convivir
      if (!('geolocation' in navigator)) {
        mostrarEstado(t('errorGeolocation', 'Este navegador no permite compartir tu ubicación.'), 'error');
        return;
      }
      btnCaminar.classList.add('rs-activo');
      btnCaminar.textContent = t('walkModeStop', 'Detener caminata');
      mostrarEstado(t('walkModeTracking', 'Siguiendo tu ubicación…'));

      const el = document.createElement('div');
      el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${leerVar('--sky-deep') || '#1C3144'};border:3px solid var(--paper);box-shadow:0 0 0 6px ${(leerVar('--sky-deep') || '#1C3144')}33;`;
      marcadorCaminando = new maplibregl.Marker({ element: el });

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude, lon = pos.coords.longitude;
          if (!marcadorCaminando._map) marcadorCaminando.addTo(map);
          marcadorCaminando.setLngLat([lon, lat]);
          map.easeTo({ center: [lon, lat], duration: 600 });
          puntoReferenciaSol = { lat, lon };
          if (rutaActual) actualizarTramosSombraRuta();
          sincronizarArboles();
        },
        () => mostrarEstado(t('locationDenied', 'No se ha podido obtener tu ubicación (¿has denegado el permiso?).'), 'error'),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 }
      );
    });

    /* ---- Paseo virtual 3D: cámara libre, sin GPS real ----
       Arreglado: se guarda el estado del mapa antes de entrar y se
       restaura tal cual al salir; la cámara libre y la caminata GPS
       se excluyen mutuamente; y las sombras/edificios se refrescan
       según la posición del jugador mientras camina. */
    function entrarPaseoVirtual() {
      if (paseoActivo) return;
      if (watchId != null) detenerCaminata(); // no convivir con la caminata GPS real

      // Guardamos el estado real del mapa para poder volver a él tal cual al salir
      paseoEstadoPrevio = {
        center: map.getCenter(),
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        maxPitch: map.getMaxPitch(),
      };

      const centro = map.getCenter();
      paseoOrigenMercator = maplibregl.MercatorCoordinate.fromLngLat(centro);
      paseoMetrosAU = paseoOrigenMercator.meterInMercatorCoordinateUnits();

      paseoJugador.x = 0;
      paseoJugador.y = 0;
      paseoJugador.bearing = map.getBearing() || 0;
      paseoVelocidadSuavizada = 0;
      paseoGiroSuavizado = 0;

      map.dragPan.disable();
      map.scrollZoom.disable();
      map.dragRotate.disable();
      map.touchZoomRotate.disable();
      map.doubleClickZoom.disable();
      map.keyboard.disable();

      map.setMaxPitch(CONFIG.paseoMaxPitch);
      paseoActivo = true;
      paseoUltimoFrame = performance.now();
      paseoUltimaSincroMs = 0; // fuerza una sincronización de sombras nada más entrar

      asegurarActivacionSolar();
      map.getSource('sombras-halo')?.setData(turf.featureCollection([])); // el halo es caro; se omite durante el paseo

      if (btnPaseo) {
        btnPaseo.classList.add('rs-activo');
        btnPaseo.textContent = t('virtualWalkStop', 'Salir del paseo');
      }
      mostrarEstado(t('virtualWalkHint', 'Arrastra para mirar • Joystick para moverte • Esc para salir'));

      const joy = document.getElementById('rsJoystick');
      if (joy && 'ontouchstart' in window) joy.classList.add('rs-visible');

      paseoRafId = requestAnimationFrame(loopPaseo);
    }

    function detenerPaseoVirtual() {
      if (!paseoActivo) return;
      paseoActivo = false;
      if (paseoRafId) cancelAnimationFrame(paseoRafId);
      paseoRafId = null;

      map.dragPan.enable();
      map.scrollZoom.enable();
      map.dragRotate.enable();
      map.touchZoomRotate.enable();
      map.doubleClickZoom.enable();
      map.keyboard.enable();

      // Devolvemos el mapa exactamente a como estaba antes de entrar
      // (si no, se queda "roto": cámara libre pegada al suelo, sin salir de FreeCameraOptions)
      if (paseoEstadoPrevio) {
        map.setMaxPitch(paseoEstadoPrevio.maxPitch);
        map.jumpTo({
          center: paseoEstadoPrevio.center,
          zoom: paseoEstadoPrevio.zoom,
          pitch: paseoEstadoPrevio.pitch,
          bearing: paseoEstadoPrevio.bearing,
        });
        puntoReferenciaSol = { lat: paseoEstadoPrevio.center.lat, lon: paseoEstadoPrevio.center.lng };
        paseoEstadoPrevio = null;
      } else {
        map.setMaxPitch(60);
      }

      btnPaseo.classList.remove('rs-activo');
      btnPaseo.textContent = t('virtualWalkStart', 'Paseo virtual 3D');
      mostrarEstado('');

      const joy = document.getElementById('rsJoystick');
      if (joy) { joy.style.display = 'none'; joy.classList.remove('rs-visible'); }
      paseoJoystick.active = false;

      actualizarCacheEdificios();
      if (document.getElementById('rsToggleSombras')?.checked) recalcularSombrasVisibles();
      sincronizarArboles();
    }

    function paseoToLngLat(x, y) {
      return new maplibregl.MercatorCoordinate(
        paseoOrigenMercator.x + x * paseoMetrosAU,
        paseoOrigenMercator.y + y * paseoMetrosAU,
        0
      ).toLngLat();
    }

    function actualizarCamaraPaseo(eye) {
      if (typeof map.getFreeCameraOptions !== 'function' || typeof map.setFreeCameraOptions !== 'function') {
        // Esta versión de MapLibre GL JS no trae la API de cámara libre (FreeCameraOptions,
        // disponible desde MapLibre GL JS 3+). En vez de reventar con un error en cadena,
        // avisamos una sola vez y salimos limpiamente del paseo.
        console.warn('[paseo virtual] Esta versión de MapLibre GL JS no soporta cámara libre (getFreeCameraOptions). Revisa la versión cargada en el HTML.');
        mostrarEstado(t('virtualWalkUnsupported', 'Tu navegador o la versión del mapa cargada no soporta el paseo virtual 3D ahora mismo.'), 'error');
        detenerPaseoVirtual();
        return;
      }
      const camera = map.getFreeCameraOptions();
      camera.position = maplibregl.MercatorCoordinate.fromLngLat(eye, CONFIG.paseoAlturaOjoM);
      camera.setPitchBearing(CONFIG.paseoMaxPitch, paseoJugador.bearing);
      map.setFreeCameraOptions(camera);
    }

    // Mientras caminas: refresca periódicamente qué edificios hay alrededor
    // y recalcula sus sombras con la posición virtual real del jugador
    // (antes esto solo pasaba con el evento 'moveend', que no salta en
    // modo cámara libre, así que las sombras se quedaban congeladas).
    function sincronizarSombrasPaseo(eye, now) {
      if (now - paseoUltimaSincroMs < CONFIG.paseoSincroMs) return;
      paseoUltimaSincroMs = now;
      puntoReferenciaSol = { lat: eye.lat, lon: eye.lng };
      actualizarCacheEdificios();
      if (document.getElementById('rsToggleSombras')?.checked) recalcularSombrasVisibles();
      if (rutaActual) actualizarTramosSombraRuta();
      sincronizarArboles();
    }

    function loopPaseo(now) {
      if (!paseoActivo) return;
      const dt = Math.min(0.05, (now - paseoUltimoFrame) / 1000);
      paseoUltimoFrame = now;

      let avanceObjetivo = 0;
      let giroObjetivo = 0;

      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) avanceObjetivo += 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) avanceObjetivo -= 1;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) giroObjetivo -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) giroObjetivo += 1;

      if (paseoJoystick.active) {
        avanceObjetivo = -paseoJoystick.dy;
        giroObjetivo = paseoJoystick.dx * 0.6;
      }

      // Suavizado tipo inercia para que el movimiento sea más "virtual" y menos brusco
      const suavizado = Math.min(1, CONFIG.paseoSuavizado + dt * 2);
      paseoGiroSuavizado += (giroObjetivo - paseoGiroSuavizado) * suavizado;
      paseoVelocidadSuavizada += (avanceObjetivo - paseoVelocidadSuavizada) * suavizado;

      if (Math.abs(paseoGiroSuavizado) > 0.01) {
        paseoJugador.bearing += paseoGiroSuavizado * 90 * dt;
      }

      if (Math.abs(paseoVelocidadSuavizada) > 0.01) {
        const step = paseoVelocidadSuavizada * CONFIG.paseoVelocidadMs * dt;
        const rad = paseoJugador.bearing * Math.PI / 180;
        // En proyecciones Mercator, -Y es el Norte absoluto
        paseoJugador.x += Math.sin(rad) * step;
        paseoJugador.y -= Math.cos(rad) * step;
      }

      const eye = paseoToLngLat(paseoJugador.x, paseoJugador.y);
      actualizarCamaraPaseo(eye);
      sincronizarSombrasPaseo(eye, now);

      paseoRafId = requestAnimationFrame(loopPaseo);
    }

    // Eventos globales de teclado para salir rápido
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && paseoActivo) detenerPaseoVirtual();
    });

    btnPaseo.addEventListener('click', () => {
      if (paseoActivo) detenerPaseoVirtual();
      else entrarPaseoVirtual();
    });

    // Se exponen para poder usarlas desde fuera de esta función (reiniciarTodo, etc.)
    window.__rsDetenerPaseoVirtual = detenerPaseoVirtual;

    panelMapa.append(btnModoClick, btnUbicacion, btnCaminar, btnPaseo, btnReiniciar);
    contenedorMapa.appendChild(panelMapa);

    map.on('click', (e) => {
      if (!modoClickMapa) return;
      const { lat, lng } = e.lngLat;

      if (esperandoSoloDestino && origenParaAutoRuta) {
        const origenFijado = origenParaAutoRuta;
        const destinoFijado = { lat, lon: lng };
        map.getSource('puntos-manuales')?.setData(turf.featureCollection([
          turf.point([origenFijado.lon, origenFijado.lat]),
          turf.point([lng, lat]),
        ]));
        inputDestino.value = t('pointMap', 'Punto marcado en el mapa');
        salirDeModoClick();
        manejarBusqueda(
          { ...origenFijado },
          { ...destinoFijado, nombre: t('pointMap', 'Punto marcado en el mapa') }
        );
        geocodificarInverso(lat, lng).then((nombre) => { inputDestino.value = nombre; });
        return;
      }

      if (!puntoOrigenPendiente) {
        puntoOrigenPendiente = { lat, lon: lng };
        map.getSource('puntos-manuales')?.setData(turf.featureCollection([turf.point([lng, lat])]));
        inputOrigen.value = t('pointMap', 'Punto marcado en el mapa');
        mostrarEstado(t('clickDestiny', 'Origen marcado — haz clic en el destino.'));
        geocodificarInverso(lat, lng).then((nombre) => { inputOrigen.value = nombre; });
        return;
      }

      const origenFijado = puntoOrigenPendiente;
      const destinoFijado = { lat, lon: lng };
      map.getSource('puntos-manuales')?.setData(turf.featureCollection([
        turf.point([origenFijado.lon, origenFijado.lat]),
        turf.point([lng, lat]),
      ]));
      inputDestino.value = t('pointMap', 'Punto marcado en el mapa');
      salirDeModoClick();
      manejarBusqueda(
        { ...origenFijado, nombre: t('pointMap', 'Punto marcado en el mapa') },
        { ...destinoFijado, nombre: t('pointMap', 'Punto marcado en el mapa') }
      );
      geocodificarInverso(origenFijado.lat, origenFijado.lon).then((nombre) => { inputOrigen.value = nombre; });
      geocodificarInverso(lat, lng).then((nombre) => { inputDestino.value = nombre; });
    });
  }

  function inyectarControlesTiempo() {
    if (document.getElementById('rsTimeControls')) return;
    inyectarEstilosPanel();

    const panel = document.createElement('div');
    panel.id = 'rsTimeControls';

    const cabecera = document.createElement('div');
    cabecera.className = 'rs-cabecera';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'rs-eyebrow';
    eyebrow.id = 'rsEyebrowSol';
    eyebrow.textContent = t('sunPosition', 'Posición solar');

    const svgSol = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgSol.setAttribute('viewBox', '0 0 60 34');
    svgSol.setAttribute('width', '48');
    svgSol.setAttribute('height', '28');
    svgSol.innerHTML = `
      <g id="rsSolGrupo" style="transition:opacity .3s;">
        <path d="M 4 30 A 26 26 0 0 1 56 30" fill="none" stroke="#c98a4b" stroke-width="1" stroke-dasharray="1.5 3" opacity="0.55"/>
        <line x1="4" y1="30" x2="56" y2="30" stroke="#ffffff22" stroke-width="1"/>
        <circle id="rsSolPunto" cx="30" cy="4" r="3.4" fill="#e7b06a"/>
      </g>`;

    const btnPlegar = document.createElement('button');
    btnPlegar.id = 'rsPlegarBtn';
    btnPlegar.type = 'button';
    btnPlegar.setAttribute('aria-label', 'Mostrar u ocultar el panel de posición solar');
    btnPlegar.innerHTML = '<svg width="11" height="7" viewBox="0 0 11 7"><path d="M1 1l4.5 4.5L10 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btnPlegar.addEventListener('click', async () => {
      const estabaCerrado = panel.classList.contains('rs-cerrado');
      panel.classList.toggle('rs-cerrado');
      if (estabaCerrado) {
        asegurarActivacionSolar();
        await recalcularSombrasVisibles();
        actualizarIluminacionSolar();
        await actualizarTramosSombraRuta();
        sincronizarArboles();
      }
    });

    panel.classList.add('rs-cerrado');

    cabecera.append(eyebrow, svgSol, btnPlegar);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'rs-cuerpo';

    const filaEtiqueta = document.createElement('div');
    filaEtiqueta.className = 'rs-fila';
    filaEtiqueta.style.justifyContent = 'space-between';
    etiquetaTiempo = document.createElement('span');
    etiquetaTiempo.id = 'rsTimeLabel';
    const badgeDorada = document.createElement('span');
    badgeDorada.id = 'rsGoldenBadge';
    badgeDorada.style.visibility = 'hidden';
    badgeDorada.textContent = t('goldenHour', 'Hora dorada');
    filaEtiqueta.append(etiquetaTiempo, badgeDorada);

    sliderTiempo = document.createElement('input');
    sliderTiempo.type = 'range';
    sliderTiempo.id = 'rsTimeSlider';
    sliderTiempo.min = '0';
    sliderTiempo.max = '1439';
    sliderTiempo.step = '5';
    sliderTiempo.value = String(minutosDesdeFecha(new Date()));

    sliderTiempo.addEventListener('input', () => {
      modoManual = true;
      fechaBaseManual = esFechaSolsticioActiva ? fechaBaseManual : new Date();
      clearTimeout(temporizadorSlider);
      temporizadorSlider = setTimeout(() => aplicarCambioDeHora(esFechaSolsticioActiva), 90);
      actualizarEtiquetaTiempo(esFechaSolsticioActiva);
    });

    let esFechaSolsticioActiva = false;

    const divisor = document.createElement('div');
    divisor.className = 'rs-divisor';

    const filaBotones = document.createElement('div');
    filaBotones.className = 'rs-botones';

    function crearBoton(texto, id) {
      const b = document.createElement('button');
      b.type = 'button';
      if (id) b.id = id;
      b.textContent = texto;
      return b;
    }

    const btnAhora = crearBoton(t('now', 'Ahora'), 'rsBtnAhora');
    const btnVerano = crearBoton(t('btnSummer', 'Verano'), 'rsBtnVerano');
    const btnInvierno = crearBoton(t('btnWinter', 'Invierno'), 'rsBtnInvierno');
    const btnCapturar = crearBoton(t('captureView', 'Capturar vista'), 'rsBtnCapturar');
    btnCapturar.className = 'rs-btn-capturar';

    btnAhora.addEventListener('click', () => {
      modoManual = false;
      esFechaSolsticioActiva = false;
      fechaBaseManual = new Date();
      sliderTiempo.value = String(minutosDesdeFecha(new Date()));
      aplicarCambioDeHora(false);
    });

    btnVerano.addEventListener('click', () => {
      modoManual = true;
      esFechaSolsticioActiva = 'verano';
      fechaBaseManual = fechaSolsticio('verano');
      sliderTiempo.value = '780';
      aplicarCambioDeHora('verano');
    });

    btnInvierno.addEventListener('click', () => {
      modoManual = true;
      esFechaSolsticioActiva = 'invierno';
      fechaBaseManual = fechaSolsticio('invierno');
      sliderTiempo.value = '780';
      aplicarCambioDeHora('invierno');
    });

    btnCapturar.addEventListener('click', capturarVista);

    filaBotones.append(btnAhora, btnVerano, btnInvierno, btnCapturar);
    cuerpo.append(filaEtiqueta, sliderTiempo, divisor, filaBotones);
    panel.append(cabecera, cuerpo);
    contenedorMapa.appendChild(panel);

    actualizarEtiquetaTiempo(false);
  }

  /* ---------------- Capa de mapa oscura ---------------- */

  let mapaOscuro = false;
  function inyectarControlToggleMapaOscuro() {
    if (document.getElementById('rsMapStyleToggle')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rsMapStyleToggleEstilos';
    estilo.textContent = `
      #rsMapStyleToggle{
        position:absolute; right:12px; bottom:12px; z-index:5;
      }
      #rsMapStyleToggle button{
        font-family:inherit; font-size:9.5px; letter-spacing:.04em; text-transform:uppercase;
        font-weight:700; padding:6px 11px; border-radius:999px;
        border:1px solid var(--line, rgba(28,49,68,0.14));
        background:rgba(251,250,247,0.92); color:var(--sky-deep, #1C3144);
        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        cursor:pointer; box-shadow:0 3px 10px rgba(22,35,46,0.12); transition:background .15s,border-color .15s;
      }
      #rsMapStyleToggle button:hover{ background:var(--accent-soft, rgba(244,166,107,0.16)); border-color:var(--accent, #F4A66B); }
      .rs-mapa-oscuro-activo #shadowRouteMap .maplibregl-canvas{
        filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.85);
      }
    `;
    document.head.appendChild(estilo);

    const wrap = document.createElement('div');
    wrap.id = 'rsMapStyleToggle';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'rsBtnMapaOscuro';
    btn.textContent = t('darkMapOn', 'Mapa oscuro');
    btn.addEventListener('click', () => {
      mapaOscuro = !mapaOscuro;
      contenedorMapa.classList.toggle('rs-mapa-oscuro-activo', mapaOscuro);
      btn.textContent = mapaOscuro ? t('darkMapOff', 'Mapa claro') : t('darkMapOn', 'Mapa oscuro');
    });
    wrap.appendChild(btn);
    contenedorMapa.appendChild(wrap);
  }

  function capturarVista() {
    try {
      map.once('render', () => {
        try {
          const canvas = map.getCanvas();
          const url = canvas.toDataURL('image/png');
          const enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = `manolito-aire-${Date.now()}.png`;
          document.body.appendChild(enlace);
          enlace.click();
          enlace.remove();
        } catch (errInterno) {
          console.error('No se ha podido exportar la vista como imagen:', errInterno);
          mostrarEstado(t('captureError', 'No se ha podido generar la imagen (limitación del servidor de mapas). Prueba a hacer una captura de pantalla normal.'), 'error');
        }
      });
      map.triggerRepaint();
    } catch (e) {
      console.error('No se ha podido exportar la vista como imagen:', e);
      mostrarEstado(t('captureError', 'No se ha podido generar la imagen (limitación del servidor de mapas). Prueba a hacer una captura de pantalla normal.'), 'error');
    }
  }

  /* ---------------- Toggles de capas ---------------- */

  function conectarTogglesDeCapas() {
    inyectarControlToggleMapaOscuro();

    const tEdificios = document.getElementById('rsToggleEdificios');
    const tSombras = document.getElementById('rsToggleSombras');
    const tRuta = document.getElementById('rsToggleRuta');
    const tSol = document.getElementById('rsToggleSol');

    tEdificios?.addEventListener('change', () => {
      if (capaEdificiosDisponible) {
        map.setLayoutProperty(CONFIG.edificiosLayerId, 'visibility', tEdificios.checked ? 'visible' : 'none');
      }
    });
    tSombras?.addEventListener('change', () => {
      asegurarActivacionSolar();
      recalcularSombrasVisibles();
      sincronizarArboles();
    });
    tRuta?.addEventListener('change', () => {
      const vis = tRuta.checked ? 'visible' : 'none';
      map.setLayoutProperty('capa-ruta', 'visibility', vis);
      map.setLayoutProperty('capa-ruta-outline', 'visibility', vis);
      map.setLayoutProperty('capa-ruta-glow', 'visibility', vis);
      map.setLayoutProperty('capa-ruta-sombra', 'visibility', vis);
      map.setLayoutProperty('capa-ruta-sombra-outline', 'visibility', vis);
    });
    tSol?.addEventListener('change', () => { asegurarActivacionSolar(); actualizarIluminacionSolar(); });
  }

  /* ---------------- Red: fetch con timeout + reintentos ---------------- */

  async function fetchConReintentos(url, options = {}, intentos = CONFIG.fetchRetries) {
    for (let intento = 0; intento <= intentos; intento++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.fetchTimeoutMs);
      try {
        const respuesta = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        return await respuesta.json();
      } catch (err) {
        clearTimeout(timeoutId);
        if (intento === intentos) throw err;
        await new Promise((r) => setTimeout(r, 600 * (intento + 1)));
      }
    }
  }

  /* ---------------- Geocodificación (Nominatim) ---------------- */

  async function consultarNominatim(consulta) {
    const url = new URL(CONFIG.nominatimUrl);
    url.searchParams.set('q', consulta);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    return fetchConReintentos(url.toString(), { headers: { 'Accept-Language': 'es' } });
  }

  async function geocodificar(direccionTexto) {
    const variantes = [
      direccionTexto,
      `${direccionTexto}, España`,
      direccionTexto.replace(/\s*\d+\s*$/, '').trim(),
      `${direccionTexto.replace(/\s*\d+\s*$/, '').trim()}, España`,
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);

    for (const intento of variantes) {
      try {
        const datos = await consultarNominatim(intento);
        if (datos && datos.length > 0) {
          return { lat: parseFloat(datos[0].lat), lon: parseFloat(datos[0].lon), nombre: datos[0].display_name };
        }
      } catch (e) {
      }
      await new Promise((r) => setTimeout(r, 350));
    }

    throw new Error(`${t('notFound', 'No se ha encontrado')}: "${direccionTexto}". ${t('tryFormat', 'Prueba a escribirla como calle, número, ciudad')}.`);
  }

  async function geocodificarInverso(lat, lon) {
    try {
      const url = new URL(CONFIG.nominatimReverseUrl);
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lon);
      url.searchParams.set('format', 'json');
      const datos = await fetchConReintentos(url.toString(), { headers: { 'Accept-Language': 'es' } }, 1);
      return datos?.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch (e) {
      return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }
  }

  /* ---------------- Ruta real por calles (OSRM) ---------------- */

  async function calcularRutaReal(origen, destino) {
    const coords = `${origen.lon},${origen.lat};${destino.lon},${destino.lat}`;
    const url = `${CONFIG.osrmUrl}/foot/${coords}?overview=full&geometries=geojson`;

    try {
      const datos = await fetchConReintentos(url);
      if (datos?.code === 'Ok' && datos.routes?.[0]) {
        const distanciaKmNum = datos.routes[0].distance / 1000;
        let duracionMinNum = datos.routes[0].duration / 60;

        const velocidadKmh = duracionMinNum > 0 ? distanciaKmNum / (duracionMinNum / 60) : 0;
        let duracionEstimada = false;
        if (velocidadKmh > 9 || duracionMinNum <= 0) {
          duracionMinNum = (distanciaKmNum / CONFIG.velocidadCaminandoKmh) * 60;
          duracionEstimada = true;
        }

        return {
          geojson: datos.routes[0].geometry,
          distanciaKm: distanciaKmNum.toFixed(2),
          duracionMin: Math.round(duracionMinNum),
          esReal: true,
          duracionEstimada,
        };
      }
      throw new Error('OSRM no ha devuelto una ruta válida.');
    } catch (err) {
      console.warn('Routing real no disponible, usando línea directa:', err);
      return {
        geojson: { type: 'LineString', coordinates: [[origen.lon, origen.lat], [destino.lon, destino.lat]] },
        distanciaKm: null,
        duracionMin: null,
        esReal: false,
      };
    }
  }

  /* ---------------- Ruta con prioridad de sombra (entre alternativas reales) ---------------- */

  function calcularCoberturaSombra(geojsonLinea, poligonosSombra) {
    if (!poligonosSombra.length) return 0;
    try {
      const linea = geojsonLinea.type === 'Feature' ? geojsonLinea : turf.feature(geojsonLinea);
      const tramos = turf.lineChunk(linea, 0.015, { units: 'kilometers' }).features;
      if (!tramos.length) return 0;
      let enSombra = 0;
      for (const tramo of tramos) {
        const coords = tramo.geometry.coordinates;
        const medio = turf.point(coords[Math.floor(coords.length / 2)] || coords[0]);
        for (const poligono of poligonosSombra) {
          try {
            if (turf.booleanPointInPolygon(medio, poligono)) { enSombra++; break; }
          } catch (e) { }
        }
      }
      return enSombra / tramos.length;
    } catch (e) {
      return 0;
    }
  }

  async function generarPoligonosSombraPara(listaEdificios, posSolActual) {
    if (!posSolActual || posSolActual.altitude <= 0) return [];
    const azimutGrados = (posSolActual.azimuth * 180) / Math.PI + 180;
    const bearingSombra = (azimutGrados + 180) % 360;
    const poligonos = [];
    for (const edificio of listaEdificios) {
      try {
        const altura = Number(edificio.properties.height ?? edificio.properties.render_height) || CONFIG.alturaPorDefectoM;
        const longitudSombraM = altura / Math.tan(posSolActual.altitude);
        if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;
        const geom = edificio.geometry;
        if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
        const distanciaKm = longitudSombraM / 1000;
        const partes = turf.flatten(turf.feature(geom)).features;
        for (const parte of partes) {
          const volumen = calcularVolumenSombra(parte, distanciaKm, bearingSombra);
          if (volumen) poligonos.push(volumen);
        }
      } catch (e) {
        continue;
      }
    }
    return poligonos;
  }

  function esperarMapaListo(timeoutMs = 4000) {
    return new Promise((resolve) => {
      let resuelto = false;
      const terminar = () => { if (!resuelto) { resuelto = true; resolve(); } };
      map.once('idle', terminar);
      setTimeout(terminar, timeoutMs);
    });
  }

  async function calcularRutaConPrioridadSombra(origen, destino) {
    if (!CONFIG.priorizarSombra) return calcularRutaReal(origen, destino);

    if (CONFIG.usarRedLocalTermica) {
      try {
        return await calcularRutaDijkstraTermico(origen, destino);
      } catch (e) {
        console.warn('[Routing] Dijkstra térmico local no disponible, se recurre a OSRM:', e.message);
      }
    }

    try {
      const coords = `${origen.lon},${origen.lat};${destino.lon},${destino.lat}`;
      const url = `${CONFIG.osrmUrl}/foot/${coords}?overview=full&geometries=geojson&alternatives=true`;
      const datos = await fetchConReintentos(url);

      if (datos?.code !== 'Ok' || !datos.routes?.length) {
        return calcularRutaReal(origen, destino);
      }

      const candidatas = datos.routes.slice(0, CONFIG.maxAlternativasSombra);
      if (candidatas.length === 1) {
        return calcularRutaReal(origen, destino);
      }

      const todasLasCoords = candidatas.flatMap((r) => r.geometry.coordinates);
      if (todasLasCoords.length < 2) return calcularRutaReal(origen, destino);

      const bboxCombinado = turf.bbox(turf.lineString(todasLasCoords));
      map.jumpTo({
        center: [(bboxCombinado[0] + bboxCombinado[2]) / 2, (bboxCombinado[1] + bboxCombinado[3]) / 2],
        zoom: Math.max(map.getZoom(), 16),
      });
      await esperarMapaListo();
      actualizarCacheEdificios();

      const centro = { lat: (origen.lat + destino.lat) / 2, lon: (origen.lon + destino.lon) / 2 };
      const posSolActual = SunCalc.getPosition(obtenerHoraEfectiva(), centro.lat, centro.lon);

      let poligonosSombra = [];
      if (posSolActual.altitude > 0 && capaEdificiosDisponible && edificiosCacheados.length) {
        poligonosSombra = await generarPoligonosSombraPara(edificiosCacheados, posSolActual);
      }

      const distanciaMinimaKm = Math.min(...candidatas.map((r) => r.distance / 1000));

      let mejor = null;
      for (const ruta of candidatas) {
        const distanciaKm = ruta.distance / 1000;
        const cobertura = poligonosSombra.length ? calcularCoberturaSombra(ruta.geometry, poligonosSombra) : 0;
        const dentroDeMargen = distanciaKm <= distanciaMinimaKm * CONFIG.maxDetourSombra;
        const candidato = { ruta, distanciaKm, cobertura, dentroDeMargen };
        if (!mejor) { mejor = candidato; continue; }
        if (dentroDeMargen && !mejor.dentroDeMargen) { mejor = candidato; continue; }
        if (dentroDeMargen === mejor.dentroDeMargen) {
          if (cobertura > mejor.cobertura + 0.02) mejor = candidato;
          else if (Math.abs(cobertura - mejor.cobertura) <= 0.02 && distanciaKm < mejor.distanciaKm) mejor = candidato;
        }
      }

      const distanciaKmNum = mejor.distanciaKm;
      let duracionMinNum = mejor.ruta.duration / 60;
      const velocidadKmh = duracionMinNum > 0 ? distanciaKmNum / (duracionMinNum / 60) : 0;
      let duracionEstimada = false;
      if (velocidadKmh > 9 || duracionMinNum <= 0) {
        duracionMinNum = (distanciaKmNum / CONFIG.velocidadCaminandoKmh) * 60;
        duracionEstimada = true;
      }

      return {
        geojson: mejor.ruta.geometry,
        distanciaKm: distanciaKmNum.toFixed(2),
        duracionMin: Math.round(duracionMinNum),
        esReal: true,
        duracionEstimada,
        coberturaSombraPct: poligonosSombra.length ? Math.round(mejor.cobertura * 100) : null,
      };
    } catch (err) {
      console.warn('Routing con prioridad de sombra no disponible, usando ruta normal:', err);
      return calcularRutaReal(origen, destino);
    }
  }

  /* ---------------- Calidad del aire (Open-Meteo) ---------------- */

  async function obtenerCalidadAire(lat, lon) {
    const url = new URL(CONFIG.airQualityUrl);
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('current', ['us_aqi', 'pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide'].join(','));
    url.searchParams.set('timezone', 'auto');

    const datos = await fetchConReintentos(url.toString());
    if (!datos || !datos.current) throw new Error('La API de calidad del aire no ha devuelto datos.');
    return datos.current;
  }

  function clasificarAQI(valor) {
    if (valor == null || Number.isNaN(valor)) return { etiqueta: t('aqiNoData', 'Sin datos'), color: leerVar('--sky-mid') };
    if (valor <= 50) return { etiqueta: t('aqiGood', 'Buena'), color: leerVar('--breath-good') };
    if (valor <= 100) return { etiqueta: t('aqiModerate', 'Moderada'), color: leerVar('--breath-mid') };
    return { etiqueta: t('aqiBad', 'Mala'), color: leerVar('--breath-bad') };
  }

  function pintarPanelAQI(current) {
    if (!current) return;
    const placeholder = document.getElementById('rsAqiPlaceholder');
    const contenido = document.getElementById('rsAqiContent');
    const categoriaElChk = document.getElementById('rsAqiCategory');
    if (!placeholder || !contenido || !categoriaElChk) return;
    const aqi = current.us_aqi;
    const clasificacion = clasificarAQI(aqi);

    document.getElementById('rsAqiValue').textContent = aqi != null ? Math.round(aqi) : '--';
    const categoriaEl = document.getElementById('rsAqiCategory');
    categoriaEl.textContent = clasificacion.etiqueta;
    categoriaEl.style.color = clasificacion.color;
    categoriaEl.style.background = clasificacion.color + '26';

    document.getElementById('rsPm25').textContent = current.pm2_5 != null ? `${current.pm2_5} µg/m³` : '--';
    document.getElementById('rsPm10').textContent = current.pm10 != null ? `${current.pm10} µg/m³` : '--';
    document.getElementById('rsO3').textContent = current.ozone != null ? `${current.ozone} µg/m³` : '--';
    document.getElementById('rsNo2').textContent = current.nitrogen_dioxide != null ? `${current.nitrogen_dioxide} µg/m³` : '--';

    placeholder.style.display = 'none';
    contenido.style.display = 'block';
  }

  /* ---------------- Marcadores ---------------- */

  let marcadorOrigen = null, marcadorDestino = null;

  function pintarMarcadores(origen, destino) {
    if (marcadorOrigen) marcadorOrigen.remove();
    if (marcadorDestino) marcadorDestino.remove();

    const pin = (color) => {
      const el = document.createElement('div');
      el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:3px solid var(--paper);box-shadow:0 0 0 2px ${color}66;`;
      return el;
    };

    marcadorOrigen = new maplibregl.Marker({ element: pin(leerVar('--accent') || '#00f2ff') })
      .setLngLat([origen.lon, origen.lat])
      .setPopup(new maplibregl.Popup().setHTML(`<b>${t('origin', 'Origen')}</b><br>${origen.nombre}`))
      .addTo(map);

    marcadorDestino = new maplibregl.Marker({ element: pin(leerVar('--sky-deep') || '#1C3144') })
      .setLngLat([destino.lon, destino.lat])
      .setPopup(new maplibregl.Popup().setHTML(`<b>${t('destiny', 'Destino')}</b><br>${destino.nombre}`))
      .addTo(map);
  }

  /* ---------------- UI principal ---------------- */

  const inputOrigen = document.getElementById('rsOrigen');
  const inputDestino = document.getElementById('rsDestino');
  const btnBuscar = document.getElementById('rsBuscarBtn');
  const statusEl = document.getElementById('rsStatus');

  function mostrarEstado(texto, tipo) {
    statusEl.textContent = texto;
    statusEl.style.color = tipo === 'error' ? leerVar('--breath-bad') : tipo === 'ok' ? leerVar('--breath-good') : leerVar('--sky-mid');
  }

  function ponerCargando(cargando) {
    btnBuscar.disabled = cargando;
    btnBuscar.textContent = cargando ? t('searching', 'Buscando…') : t('searchBtn', 'Buscar ruta');
  }

  /* ---------------- Autocompletado tipo Google (Nominatim) ---------------- */

  const seleccionPorInput = new Map();

  function crearAutocompletado(input, contenedorSugerenciasId) {
    const contenedor = document.getElementById(contenedorSugerenciasId);
    if (!contenedor) return;

    let temporizador = null;
    let controladorActual = null;
    let indiceActivo = -1;
    let ultimosResultados = [];

    input.addEventListener('input', () => {
      seleccionPorInput.delete(input);
      indiceActivo = -1;
      const texto = input.value.trim();

      clearTimeout(temporizador);
      if (texto.length < 3) {
        contenedor.innerHTML = '';
        contenedor.style.display = 'none';
        return;
      }

      temporizador = setTimeout(async () => {
        if (controladorActual) controladorActual.abort();
        controladorActual = new AbortController();

        try {
          const url = new URL(CONFIG.nominatimUrl);
          url.searchParams.set('q', texto);
          url.searchParams.set('format', 'json');
          url.searchParams.set('limit', '6');
          url.searchParams.set('addressdetails', '1');
          url.searchParams.set('countrycodes', 'es');

          const resp = await fetch(url.toString(), {
            headers: { 'Accept-Language': 'es' },
            signal: controladorActual.signal,
          });
          const resultados = await resp.json();
          pintarSugerencias(resultados, texto);
        } catch (e) {
          if (e.name !== 'AbortError') contenedor.innerHTML = '';
        }
      }, 350);
    });

    function reordenarPorCiudadEscrita(resultados, textoOriginal) {
      const textoLower = textoOriginal.toLowerCase();
      return [...resultados].sort((a, b) => {
        const ciudadA = (a.address?.city || a.address?.town || a.address?.village || '').toLowerCase();
        const ciudadB = (b.address?.city || b.address?.town || b.address?.village || '').toLowerCase();
        const coincideA = ciudadA && textoLower.includes(ciudadA) ? 1 : 0;
        const coincideB = ciudadB && textoLower.includes(ciudadB) ? 1 : 0;
        return coincideB - coincideA;
      });
    }

    function seleccionarSugerencia(r) {
      input.value = r.display_name;
      seleccionPorInput.set(input, {
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        nombre: r.display_name,
        texto: r.display_name,
      });
      contenedor.innerHTML = '';
      contenedor.style.display = 'none';
      indiceActivo = -1;
    }

    function resaltarActivo() {
      const items = contenedor.querySelectorAll('li[data-idx]');
      items.forEach((li, i) => {
        li.style.background = i === indiceActivo ? (leerVar('--accent') || '#09ffbd') + '22' : '';
      });
      if (indiceActivo >= 0 && items[indiceActivo]) {
        items[indiceActivo].scrollIntoView({ block: 'nearest' });
      }
    }

    function pintarSugerencias(resultados, textoOriginal) {
      ultimosResultados = [];
      if (!resultados || resultados.length === 0) {
        contenedor.innerHTML = `<li class="rs-sug-empty">${t('noResults', 'Sin resultados')}</li>`;
        contenedor.style.display = 'block';
        return;
      }

      resultados = reordenarPorCiudadEscrita(resultados, textoOriginal);
      ultimosResultados = resultados;
      indiceActivo = -1;

      contenedor.innerHTML = resultados
        .map((r, i) => {
          const ciudad = r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || '';
          const resto = r.display_name.split(',')[0];
          return `<li data-idx="${i}">
            <span class="rs-sug-linea1">${resto}</span>
            <span class="rs-sug-linea2">${ciudad ? ciudad + ' — ' : ''}${r.address?.state || ''}</span>
          </li>`;
        })
        .join('');
      contenedor.style.display = 'block';

      contenedor.querySelectorAll('li[data-idx]').forEach((li) => {
        li.addEventListener('click', () => seleccionarSugerencia(resultados[Number(li.dataset.idx)]));
      });
    }

    input.addEventListener('keydown', (e) => {
      const visible = contenedor.style.display !== 'none' && ultimosResultados.length > 0;
      if (!visible) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        indiceActivo = (indiceActivo + 1) % ultimosResultados.length;
        resaltarActivo();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        indiceActivo = (indiceActivo - 1 + ultimosResultados.length) % ultimosResultados.length;
        resaltarActivo();
      } else if (e.key === 'Enter' && indiceActivo >= 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        seleccionarSugerencia(ultimosResultados[indiceActivo]);
      } else if (e.key === 'Escape') {
        contenedor.style.display = 'none';
        indiceActivo = -1;
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target !== input && !contenedor.contains(e.target)) {
        contenedor.style.display = 'none';
      }
    });
  }

  crearAutocompletado(inputOrigen, 'rsSugerenciasOrigen');
  crearAutocompletado(inputDestino, 'rsSugerenciasDestino');

  async function resolverPunto(input) {
    const seleccionado = seleccionPorInput.get(input);
    const texto = input.value.trim();
    if (seleccionado && seleccionado.texto === texto) return seleccionado;
    return geocodificar(texto);
  }

  async function manejarBusqueda(origenDirecto, destinoDirecto) {
    if (origenDirecto && destinoDirecto) {
      return ejecutarBusquedaConPuntos(origenDirecto, destinoDirecto);
    }

    const textoOrigen = inputOrigen.value.trim();
    const textoDestino = inputDestino.value.trim();
    if (!textoOrigen || !textoDestino) {
      mostrarEstado(t('fillBoth', 'Introduce origen y destino.'), 'error');
      return;
    }

    ponerCargando(true);
    mostrarEstado(t('geocoding', 'Geocodificando direcciones…'));

    try {
      const [origen, destino] = await Promise.all([resolverPunto(inputOrigen), resolverPunto(inputDestino)]);
      await ejecutarBusquedaConPuntos(origen, destino);
    } catch (err) {
      console.error(err);
      mostrarEstado(err.message || t('errorSearch', 'Error al buscar la ruta. Inténtalo de nuevo.'), 'error');
      ponerCargando(false);
    }
  }

  async function ejecutarBusquedaConPuntos(origen, destino) {
    ponerCargando(true);
    mostrarEstado(t('calculating', 'Calculando ruta real por calles…'));

    try {
      const ruta = await calcularRutaConPrioridadSombra(origen, destino);

      map.getSource('ruta').setData(turf.feature(ruta.geojson));
      map.getSource('puntos-manuales')?.setData(turf.featureCollection([]));
      map.getSource('precision-ubicacion')?.setData(turf.featureCollection([]));
      pintarMarcadores(origen, destino);

      const bounds = ruta.geojson.coordinates.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(ruta.geojson.coordinates[0], ruta.geojson.coordinates[0])
      );
      map.fitBounds(bounds, { padding: 70, maxZoom: 17, duration: 800 });

      puntoReferenciaSol = { lat: origen.lat, lon: origen.lon };
      rutaActual = ruta.esReal ? turf.feature(ruta.geojson) : null;
      asegurarActivacionSolar();
      await recalcularSombrasVisibles();
      actualizarIluminacionSolar();
      await actualizarTramosSombraRuta();
      sincronizarArboles();

      if (ruta.esReal) {
        const nota = ruta.duracionEstimada ? ` (${t('routeEstimated', 'tiempo estimado a paso normal')})` : '';
        const notaSombra = ruta.coberturaSombraPct != null ? ` · ${ruta.coberturaSombraPct}% ${t('shadeCoverage', 'en sombra')}` : '';
        mostrarEstado(`${t('routeReal', 'Ruta real')}: ${ruta.distanciaKm} km · ${ruta.duracionMin} ${t('minWalk', 'min a pie')}${nota}${notaSombra}.`, 'ok');
        mostrarBadgeSombra(ruta.coberturaSombraPct);
      } else {
        mostrarEstado(t('routeFallback', 'No se pudo calcular la ruta por calles (servidor de rutas ocupado) — mostrando línea directa.'), 'error');
        mostrarBadgeSombra(null);
      }

      try {
        const aire = await obtenerCalidadAire(origen.lat, origen.lon);
        pintarPanelAQI(aire);
      } catch (errAire) {
        console.error(errAire);
        mostrarEstado(t('airDataUnavailable', 'No se ha podido cargar la calidad del aire ahora mismo (demasiadas peticiones). Prueba de nuevo en unos segundos.'), 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarEstado(err.message || t('errorSearch', 'Error al buscar la ruta. Inténtalo de nuevo.'), 'error');
    } finally {
      ponerCargando(false);
    }
  }

  ponerCargando(false);
  if (inputOrigen && !inputOrigen.value) inputOrigen.setAttribute('placeholder', t('originPlaceholder', inputOrigen.getAttribute('placeholder')));
  if (inputDestino && !inputDestino.value) inputDestino.setAttribute('placeholder', t('destinationPlaceholder', inputDestino.getAttribute('placeholder')));
  const tituloRuta = document.getElementById('rsRouteMapTitle');
  if (tituloRuta) tituloRuta.textContent = t('routeMapTitle', tituloRuta.textContent);

  btnBuscar.addEventListener('click', manejarBusqueda);
  [inputOrigen, inputDestino].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); manejarBusqueda(); }
    });
  });

  // Los colores de ruta son fijos y de alto contraste (naranja al sol, cyan en sombra)
  // para que se distingan siempre del mapa base, independientemente del tema.

  document.addEventListener('langChanged', () => {
    if (btnModoClickRef) btnModoClickRef.textContent = t('pickMap', 'Elegir en el mapa');
    const btnLoc = document.getElementById('rsBtnMyLocation');
    if (btnLoc) btnLoc.textContent = t('myLocation', 'Mi ubicación');
    const btnWalk = document.getElementById('rsBtnWalk');
    if (btnWalk && !btnWalk.classList.contains('rs-activo')) btnWalk.textContent = t('walkModeStart', 'Iniciar caminata');

    const btnPaseo = document.getElementById('rsBtnPaseo');
    if (btnPaseo) btnPaseo.textContent = paseoActivo ? t('virtualWalkStop', 'Salir del paseo') : t('virtualWalkStart', 'Paseo virtual 3D');

    const btnDark = document.getElementById('rsBtnMapaOscuro');
    if (btnDark) btnDark.textContent = mapaOscuro ? t('darkMapOff', 'Mapa claro') : t('darkMapOn', 'Mapa oscuro');
    const eyebrow = document.getElementById('rsEyebrowSol');
    if (eyebrow) eyebrow.textContent = t('sunPosition', 'Posición solar');
    const btnCapturar = document.getElementById('rsBtnCapturar');
    if (btnCapturar) btnCapturar.textContent = t('captureView', 'Capturar vista');
    const btnAhora = document.getElementById('rsBtnAhora');
    if (btnAhora) btnAhora.textContent = t('now', 'Ahora');
    const btnVerano = document.getElementById('rsBtnVerano');
    if (btnVerano) btnVerano.textContent = t('btnSummer', 'Verano');
    const btnInvierno = document.getElementById('rsBtnInvierno');
    if (btnInvierno) btnInvierno.textContent = t('btnWinter', 'Invierno');
    ponerCargando(false);
    if (etiquetaTiempo) actualizarEtiquetaTiempo(false);
    if (inputOrigen && !inputOrigen.value) inputOrigen.setAttribute('placeholder', t('originPlaceholder', inputOrigen.getAttribute('placeholder')));
    if (inputDestino && !inputDestino.value) inputDestino.setAttribute('placeholder', t('destinationPlaceholder', inputDestino.getAttribute('placeholder')));
    const tituloRuta = document.getElementById('rsRouteMapTitle');
    if (tituloRuta) tituloRuta.textContent = t('routeMapTitle', tituloRuta.textContent);
    const btnReset = document.getElementById('rsBtnReset');
    if (btnReset) btnReset.textContent = t('resetBtn', 'Reiniciar');
  });

  /* ============================================================
     JOYSTICK VIRTUAL + EVENTOS POINTER PARA PASEO 3D
     ============================================================ */
  function inyectarJoystick() {
    if (document.getElementById('rsJoystick')) return;
    const joy = document.createElement('div');
    joy.id = 'rsJoystick';
    const knob = document.createElement('div');
    knob.id = 'rsJoystickKnob';
    joy.appendChild(knob);
    contenedorMapa.appendChild(joy);

    const maxR = 28; 

    joy.addEventListener('pointerdown', (e) => {
      if (!paseoActivo) return;
      e.preventDefault();
      joy.setPointerCapture(e.pointerId);
      paseoJoystick.active = true;
      paseoJoystick.pointerId = e.pointerId;
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      paseoJoystick.startX = cx;
      paseoJoystick.startY = cy;
      paseoJoystick.dx = 0;
      paseoJoystick.dy = 0;
      knob.style.transform = `translate(-50%, -50%) translate(0px, 0px)`;
      joy.classList.add('rs-visible');
    });

    joy.addEventListener('pointermove', (e) => {
      if (!paseoActivo || !paseoJoystick.active || e.pointerId !== paseoJoystick.pointerId) return;
      const dx = e.clientX - paseoJoystick.startX;
      const dy = e.clientY - paseoJoystick.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist > maxR ? maxR / dist : 1;
      paseoJoystick.dx = (dx * scale) / maxR; 
      paseoJoystick.dy = (dy * scale) / maxR; 
      knob.style.transform = `translate(-50%, -50%) translate(${dx * scale}px, ${dy * scale}px)`;
    });

    const limpiarJoystick = () => {
      paseoJoystick.active = false;
      paseoJoystick.dx = 0;
      paseoJoystick.dy = 0;
      knob.style.transform = `translate(-50%, -50%) translate(0px, 0px)`;
    };

    joy.addEventListener('pointerup', limpiarJoystick);
    joy.addEventListener('pointercancel', limpiarJoystick);
    joy.addEventListener('lostpointercapture', limpiarJoystick);
  }

  map.on('load', () => {
    inyectarJoystick();
  });

  mapEl.addEventListener('pointerdown', (e) => {
    if (!paseoActivo) return;
    if (e.target.closest('#rsJoystick')) return;
    paseoToques.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { mapEl.setPointerCapture(e.pointerId); } catch(_){}
  });

  mapEl.addEventListener('pointermove', (e) => {
    if (!paseoActivo) return;
    const prev = paseoToques.get(e.pointerId);
    if (!prev) return;

    const dx = e.clientX - prev.x;
    const sensibilidad = 0.3; 

    paseoJugador.bearing -= dx * sensibilidad;

    prev.x = e.clientX;
    prev.y = e.clientY;
  });

  mapEl.addEventListener('pointerup', (e) => paseoToques.delete(e.pointerId));
  mapEl.addEventListener('pointercancel', (e) => paseoToques.delete(e.pointerId));

})();