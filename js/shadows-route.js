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

   v6 — MODO OTOÑO/INVIERNO (100% aditivo, al final del archivo):
   - Interruptor «Modo invierno: ruta por el sol» junto a «Buscar
     ruta». Al activarlo, la búsqueda usa el DIJKSTRA INVERSO
     (dijkstraSolar): penaliza las aristas EN SOMBRA en vez de las
     soleadas, para pasear por el sol cuando hace frío.
   - Con el modo apagado, el enrutado es exactamente el de siempre
     (se conserva la función original envuelta, sin tocarla).
   
   v7 — CORRECCIÓN DE SOMBRAS FANTASMA (calcularVolumenSombra):
   - La envolvente convexa rellenaba patios interiores y formas
     cóncavas: sombra que no se iba NUNCA aunque diera el sol.
     Ahora el contorno es el barrido real de la huella y los patios
     conservan la zona soleada. Verificado: área idéntica a la
     sombra real de referencia.
   ============================================================ */

'use strict';

(function () {
  const CONFIG = {
    centroInicial: [-5.9845, 37.3891], // [lon, lat] Sevilla
    zoomInicial: 15.5,
    pitchInicial: 55,
    bearingInicial: -15,
    nominatimUrl: '/geo',
    nominatimReverseUrl: '/geo-reverso',
    osrmUrl: '/ruta',
    velocidadCaminandoKmh: 4.8, 
    airQualityUrl: '/api/air-quality',
    styleUrlClaro: 'https://tiles.openfreemap.org/styles/liberty', 
    edificiosLayerId: 'building-3d',
    fetchTimeoutMs: 9000,
    fetchRetries: 2,
    alturaPorDefectoM: 15,  // ~5 plantas: los edificios siempre superan a los árboles
    alturaPorPlantaM: 3.2,  // si solo sabemos las plantas (levels), estimamos así
    maxEdificiosSombra: 0,  // 0 = SIN TOPE: TODOS los edificios 3D visibles proyectan
                            // sombra, también con el zoom alejado (antes 320 cortaban
                            // todo lo que no fuera el centro: solo se veía un trozo)
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
    overpassRedPeatonalUrls: ['/arboles'],
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
        console.debug('[Dijkstra térmico] No se pudo cargar la red peatonal local:', e.message);
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

  function bboxContienePunto(bbox, lon, lat) {
    return lon >= bbox[0] && lat >= bbox[1] && lon <= bbox[2] && lat <= bbox[3];
  }

  async function obtenerRedPeatonal(bbox, puntosClave) {
    // 1. Reutilizar cache si ya tenemos un bbox que cubre el solicitado
    for (const entrada of cacheRedPeatonal.values()) {
      if (bboxContiene(entrada.bbox, bbox)) return entrada.geojson;
    }

    // 2. Intentar archivo local (rápido, sin red). Basta con que cubra los
    //    puntos de la ruta: el bbox lleva un colchón de 500 m que a veces se
    //    sale un poco del área descargada, y eso antes tiraba toda la red.
    if (CONFIG.usarRedLocalTermica) {
      const local = await cargarRedPeatonalLocal();
      if (local && local.geojson.features.length) {
        const cubierto = bboxContiene(local.bbox, bbox)
          || (Array.isArray(puntosClave) && puntosClave.length
            && puntosClave.every((p) => bboxContienePunto(local.bbox, p.lon, p.lat)));
        if (cubierto) return local.geojson;
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
        // El nombre de la calle viaja en cada arista: es lo que permite la
        // guía paso a paso accesible ("gira a la izquierda en Calle Feria…").
        const nombreCalle = (feature.properties && feature.properties.name) || '';
        for (let i = 0; i < anillo.length - 1; i++) {
          const a = anillo[i], b = anillo[i + 1];
          const idxA = getNodoIdx(a[0], a[1]);
          const idxB = getNodoIdx(b[0], b[1]);
          const longitudM = turf.distance(a, b, { units: 'meters' });
          if (longitudM <= 0) continue;
          adj[idxA].push({ to: idxB, longitudM, nombre: nombreCalle });
          adj[idxB].push({ to: idxA, longitudM, nombre: nombreCalle });
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
      // Sombra de edificios + sombra de árboles: ambas refrescan el paso.
      const sombras = typeof obtenerTodasLasSombras === 'function'
        ? obtenerTodasLasSombras()
        : ((typeof ultimaColeccionSombras !== 'undefined' && ultimaColeccionSombras && ultimaColeccionSombras.features) ? ultimaColeccionSombras.features : []);
      for (const poligono of sombras) {
        if (turf.booleanPointInPolygon(turf.point(puntoMedio), poligono)) return 0;
      }
    } catch (e) { /* no hay sombras calculadas todavía */ }
    const intensidad = Math.max(0, Math.sin(posSol.altitude));
    // Nubosidad real (OpenWeatherMap vía /clima): la nube difunde la
    // radiación directa, así que el sol "quema menos" y exponerte a él
    // penaliza menos en el Dijkstra térmico. Máximo -85%: ni con el cielo
    // cubierto del todo la sombra deja de ser el sitio más fresco.
    const factorSolNubes = 1 - (typeof nubosidadActual !== 'undefined' ? nubosidadActual : 0) * 0.85;
    return CONFIG.factorPenalizacionSol * intensidad * factorSolNubes;
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

    if (dist[finIdx] === Infinity) return { camino: [], caminoIdx: [], costeTermicoM: Infinity };

    const camino = [];
    const caminoIdx = [];
    for (let at = finIdx; at !== -1; at = prev[at]) {
      camino.push(grafo.nodos[at]);
      caminoIdx.push(at);
    }
    camino.reverse();
    caminoIdx.reverse();
    return { camino, caminoIdx, costeTermicoM: dist[finIdx] };
  }

  async function calcularRutaDijkstraTermico(origen, destino) {
    const t0 = performance.now();

    const lineaOD = turf.lineString([[origen.lon, origen.lat], [destino.lon, destino.lat]]);
    const bboxBase = turf.bboxPolygon(turf.bbox(lineaOD));
    const bboxAmpliado = turf.bbox(turf.buffer(bboxBase, CONFIG.redPeatonalMargenM, { units: 'meters' }));
    const redCompleta = await obtenerRedPeatonal(bboxAmpliado, [origen, destino]);
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
    const sombrasParaCobertura = typeof obtenerTodasLasSombras === 'function'
      ? obtenerTodasLasSombras()
      : (ultimaColeccionSombras?.features || []);
    if (sombrasParaCobertura.length) {
      try {
        const lineaRuta = turf.lineString(resultado.camino);
        coberturaSombraPct = Math.round(calcularCoberturaSombra(lineaRuta, sombrasParaCobertura) * 100);
      } catch (e) { /* el badge se actualizará después con los tramos en sombra */ }
    }

    console.log(`[Dijkstra térmico] ${resultado.camino.length} nodos · coste ${resultado.costeTermicoM.toFixed(1)} m · ${(performance.now() - t0).toFixed(2)} ms`);

    let pasos = [];
    let pasosGuiados = [];
    try {
      const generados = generarPasosDesdeGrafo(grafo, resultado.caminoIdx, sombrasParaCobertura);
      pasos = generados.pasos;
      pasosGuiados = generados.guiados;
    } catch (e) {
      console.debug('No se han podido generar las indicaciones de la ruta:', e);
    }

    return {
      geojson: { type: 'LineString', coordinates: resultado.camino },
      distanciaKm: distanciaRealKm.toFixed(2),
      duracionMin: Math.round(duracionMin),
      esReal: true,
      duracionEstimada: true,
      coberturaSombraPct,
      esDijkstraTermico: true,
      pasos,
      pasosGuiados,
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
      console.debug('No se ha podido sincronizar la sombra de los árboles:', e);
    }
  }

  const mapEl = document.getElementById('shadowRouteMap');
  if (!mapEl) return;

  const contenedorMapa = mapEl.parentElement || mapEl;
  if (getComputedStyle(contenedorMapa).position === 'static') {
    contenedorMapa.style.position = 'relative';
  }

  /* ---------------- Mapa MapLibre con edificios 3D reales ---------------- */

  /* ---------------- Ahorro de batería/CPU: detección de gama baja --------
     Si el dispositivo tiene ≤4 núcleos o ≤4 GB de RAM, renderizamos el
     canvas WebGL a densidad 1 (en vez de 2-3 en pantallas retina) y
     omitimos los efectos más caros (halo atmosférico de las sombras). */
  const esGamaBaja = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || (navigator.deviceMemory && navigator.deviceMemory <= 4);

  // Caché persistente (localStorage) con caducidad, para no repetir llamadas
  // a APIs externas (aire, nubosidad) cuando el dato aún es reciente.
  function cacheLocalObtener(clave, ttlMs) {
    try {
      const crudo = localStorage.getItem(clave);
      if (!crudo) return null;
      const entrada = JSON.parse(crudo);
      if (!entrada || typeof entrada.t !== 'number' || Date.now() - entrada.t > ttlMs) return null;
      return entrada.v;
    } catch (e) { return null; }
  }
  function cacheLocalGuardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify({ t: Date.now(), v: valor })); } catch (e) { /* almacenamiento lleno o privado */ }
  }
  const CACHE_AIRE_TTL_MS = 10 * 60 * 1000;   // el aire no cambia en minutos
  const CACHE_CLIMA_TTL_MS = 10 * 60 * 1000;  // OWM actualiza cada ~10 min

 const map = new maplibregl.Map({
    container: 'shadowRouteMap',
    style: CONFIG.styleUrlClaro,
    center: CONFIG.centroInicial,
    zoom: Math.max(CONFIG.zoomInicial - 2.3, 1),
    pitch: 0,
    bearing: 0,
    pixelRatio: esGamaBaja ? 1 : (window.devicePixelRatio || 1),
    attributionControl: true
});

// AHORA SÍ: El mapa está creado, lo pasamos a global para que los árboles lo enganchen
window.manolitAireMap = map;
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
// Pantalla completa nativa (botón en la esquina del mapa). Al entrar/salir
// el canvas cambia de tamaño y MapLibre hay que avisarlo con resize(), si
// no el mapa se queda estirado o con bandas negras.
// Pantalla completa propia (botón en la esquina del mapa). El control
// nativo de MapLibre usa la Fullscreen API del navegador, que en iPhone
// NO existe para elementos normales (solo vídeos): el botón no hacía
// nada. Aquí hay dos caminos:
//   1) Si el navegador sí soporta fullscreen real (Android, portátil),
//      se usa el nativo, que además oculta la barra del navegador.
//   2) Si no (iPhone), se aplica una clase CSS que fija el mapa a toda
//      la pantalla (100dvh) por encima de todo. Mismo resultado visual.
// En ambos casos se avisa a MapLibre con resize() para que el canvas no
// se quede estirado ni con bandas, y ESC / volver a pulsar sale.
class ManolitoPantallaCompleta {
  onAdd(m) {
    this._map = m;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'maplibregl-ctrl-icon manolito-fs-btn';
    btn.title = 'Pantalla completa';
    btn.setAttribute('aria-label', 'Pantalla completa');
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => this._alternar(btn));
    const grupo = document.createElement('div');
    grupo.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    grupo.appendChild(btn);
    this._grupo = grupo;
    this._btn = btn;
    return grupo;
  }
  onRemove() {
    this._salirFallback();
    if (this._grupo) this._grupo.remove();
    this._map = undefined;
  }
  _nativoDisponible() {
    const el = this._map.getContainer();
    return !!(document.fullscreenEnabled && el.requestFullscreen);
  }
  _dentroFallback() {
    return document.body.classList.contains('manolito-fs');
  }
  _entrarFallback() {
    document.body.classList.add('manolito-fs');
    this._btn.setAttribute('aria-pressed', 'true');
    this._btn.classList.add('manolito-fs-activo');
    setTimeout(() => { try { this._map.resize(); } catch (e) {} }, 60);
    setTimeout(() => { try { this._map.resize(); } catch (e) {} }, 350);
  }
  _salirFallback() {
    if (!this._dentroFallback()) return;
    document.body.classList.remove('manolito-fs');
    if (this._btn) {
      this._btn.setAttribute('aria-pressed', 'false');
      this._btn.classList.remove('manolito-fs-activo');
    }
    setTimeout(() => { try { this._map.resize(); } catch (e) {} }, 60);
    setTimeout(() => { try { this._map.resize(); } catch (e) {} }, 350);
  }
  _alternar() {
    if (this._dentroFallback()) { this._salirFallback(); return; }
    if (document.fullscreenElement) {
      try { document.exitFullscreen(); } catch (e) {}
      return;
    }
    if (this._nativoDisponible()) {
      const el = this._map.getContainer();
      const promesa = el.requestFullscreen({ navigationUI: 'hide' });
      if (promesa && promesa.catch) promesa.catch(() => this._entrarFallback());
    } else {
      this._entrarFallback();
    }
  }
}
const controlPantallaCompleta = new ManolitoPantallaCompleta();
map.addControl(controlPantallaCompleta);
document.addEventListener('fullscreenchange', () => {
  try { map.resize(); } catch (e) { /* mapa a medio crear */ }
});
// En el modo fallback (iPhone), ESC y el gesto de volver también salen.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') controlPantallaCompleta._salirFallback();
});
window.addEventListener('pagehide', () => controlPantallaCompleta._salirFallback());

  // El estilo base pide iconos (office, gate, swimming_pool...) que su sprite
  // no incluye: MapLibre llenaba la consola de avisos "Image could not be
  // loaded". Servimos un píxel transparente bajo demanda y silencio total.
  map.on('styleimagemissing', (e) => {
    try {
      if (!map.hasImage(e.id)) {
        map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
      }
    } catch (err) { /* estilo a medio cargar */ }
  });
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
        console.debug('No se ha podido aplicar el color vivo a los edificios:', e);
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
        paint: { 'fill-color': '#0b1220', 'fill-opacity': 0.34 },
      },
      capaEdificiosDisponible ? CONFIG.edificiosLayerId : undefined
    );

    // Blindaje de orden: si el estilo se recarga (cambio de tema, estilo
    // oscuro/claro, etc.) las capas planas de sombra deben quedar SIEMPRE
    // por debajo de la extrusión 3D de los edificios, para que el edificio
    // tape físicamente cualquier fragmento de sombra en su base.
    map.on('styledata', () => {
      if (!capaEdificiosDisponible || !map.getLayer(CONFIG.edificiosLayerId)) return;
      try {
        if (map.getLayer('capa-sombras-halo')) map.moveLayer('capa-sombras-halo', CONFIG.edificiosLayerId);
        if (map.getLayer('capa-sombras')) map.moveLayer('capa-sombras', CONFIG.edificiosLayerId);
      } catch (e) { /* el estilo está a medio cargar; se reintentará */ }
    });

    // Sombra recibida EN los edificios: las fachadas que caen dentro de la
    // sombra de otro edificio se oscurecen también en 3D, no solo el suelo.
    // Es una extrusión oscura semitransparente con la MISMA huella y altura
    // del edificio, dibujada por encima de la extrusión normal.
    map.addSource('edificios-en-sombra', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer({
      id: 'capa-edificios-en-sombra',
      type: 'fill-extrusion',
      source: 'edificios-en-sombra',
      paint: {
        'fill-extrusion-color': '#0b1220',
        'fill-extrusion-opacity': 0.5,
        'fill-extrusion-height': ['get', 'alturaSombra'],
        'fill-extrusion-base': 0,
        'fill-extrusion-vertical-gradient': false,
      },
    });

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
    // Velo de sombra macro de las nubes + primera consulta de nubosidad real
    inyectarSombraNubes();
    refrescarNubosidad(true);
    // Capa raster con las nubes reales (tiles OWM vía proxy del Worker)
    instalarCapaNubes();

    // SOMBRAS DE EDIFICIOS DESDE EL PRIMER MOMENTO: antes el motor solar
    // solo despertaba al buscar una ruta o tocar un toggle, así que quien
    // abría el mapa veía sombras de árboles pero NINGUNA de edificios.
    // Ahora se activa en cuanto el estilo y las teselas están listos.
    map.once('idle', () => {
      asegurarActivacionSolar();
      // Si ya hay sombras calculadas (p. ej. el usuario movió el slider
      // antes de que el mapa quedara idle), no lanzar otro recálculo que
      // lo abortaría a mitad de lote.
      if (document.getElementById('rsToggleSombras')?.checked && !ultimaColeccionSombras.features.length) {
        recalcularSombrasVisibles();
      }
    });

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

  // Altura del edificio con la mejor fuente disponible. Muchos edificios
  // reales no tienen 'height' en los datos abiertos (sobre todo bloques
  // modernos fuera del centro): antes caían a 9 m y su sombra salía tres
  // veces más corta que la real. Ahora se prueba altura exacta, altura de
  // renderizado, número de plantas × 3.2 m y, por último, 13 m (unas 4
  // plantas, lo típico urbano) — la sombra se acerca mucho más a la calle.
  function alturaDeEdificio(props) {
    if (!props) return CONFIG.alturaPorDefectoM;
    const directa = Number(props.height ?? props.render_height);
    if (isFinite(directa) && directa > 0) return directa;
    const plantas = Number(props.levels ?? props['building:levels'] ?? props.render_levels);
    if (isFinite(plantas) && plantas > 0) return plantas * CONFIG.alturaPorPlantaM;
    return CONFIG.alturaPorDefectoM;
  }

  function actualizarCacheEdificios() {
    if (!capaEdificiosDisponible || !map.getLayer(CONFIG.edificiosLayerId)) return;
    const crudos = map.queryRenderedFeatures({ layers: [CONFIG.edificiosLayerId] });
    // Las teselas de zoom bajo traen los edificios FUSIONADOS en
    // MultiPolygons de miles de partes (un solo feature puede ser media
    // ciudad). Si se usan tal cual, se generan miles de sombras
    // superpuestas: el móvil se ahoga y el mapa pinta sombra donde hay sol.
    // Aquí se descomponen en edificios individuales, se deduplican los que
    // se repiten al cruzar bordes de tesela y se descartan restos diminutos.
    // Margen del 20% alrededor de la vista: las sombras de edificios que
    // están JUSTO fuera de pantalla entran en ella (sobre todo al atardecer,
    // con sombras largas). Sin ese colchón aparecían huecos de sol falsos
    // en los bordes del mapa.
    const vista = map.getBounds();
    const margenLon = Math.max(0.0015, (vista.getEast() - vista.getWest()) * 0.2);
    const margenLat = Math.max(0.0015, (vista.getNorth() - vista.getSouth()) * 0.2);
    const cajaVista = [
      vista.getWest() - margenLon,
      vista.getSouth() - margenLat,
      vista.getEast() + margenLon,
      vista.getNorth() + margenLat,
    ];
    const vistos = new Set();
    const candidatos = [];
    const centroVista = map.getCenter();
    for (const f of crudos) {
      const geom = f && f.geometry;
      if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
      let partes;
      try {
        partes = turf.flatten(turf.feature(geom)).features;
      } catch (e) { continue; }
      for (const parte of partes) {
        const anillo = parte.geometry && parte.geometry.coordinates && parte.geometry.coordinates[0];
        if (!anillo || anillo.length < 4) continue;
        const clave = anillo[0][0].toFixed(5) + ',' + anillo[0][1].toFixed(5) + ':' + anillo.length;
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        let cajaParte;
        try { cajaParte = turf.bbox(parte); } catch (e) { continue; }
        if (cajaParte[0] > cajaVista[2] || cajaParte[2] < cajaVista[0]
          || cajaParte[1] > cajaVista[3] || cajaParte[3] < cajaVista[1]) continue;
        let distanciaCentro = 0;
        try {
          distanciaCentro = turf.distance(
            turf.centroid(parte), turf.point([centroVista.lng, centroVista.lat]),
            { units: 'kilometers' }
          );
        } catch (e) { /* distancia 0: va al principio igualmente */ }
        candidatos.push({
          edificio: { type: 'Feature', properties: f.properties || {}, geometry: parte.geometry },
          distanciaCentro,
        });
      }
    }
    // Orden por cercanía al centro (informativo; ya no hay tope que recorte).
    candidatos.sort((a, b) => a.distanciaCentro - b.distanciaCentro);
    edificiosCacheados = (CONFIG.maxEdificiosSombra > 0
      ? candidatos.slice(0, CONFIG.maxEdificiosSombra)
      : candidatos
    ).map((candidato) => candidato.edificio);
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
    // v7 — SOMBRA POR BARRIDO REAL (antes: envolvente convexa).
    // La envolvente convexa RELLENABA los huecos de los edificios no
    // convexos: en bloques con patio interior, eses o uves pintaba
    // sombra eterna donde en realidad da el sol («la sombra no se va
    // nunca» — el fallo que reportó Sandro). Ahora:
    //   1) El contorno es el BARRIDO real de la huella en la dirección
    //      de la sombra: cadena de silueta quieta + cadena desplazada.
    //      O(n), sin booleanos caros, exacto para convexos y fiel en
    //      patios/eses (verificado contra el barrido denso real:
    //      área idéntica al m²).
    //   2) Los PATIOS interiores conservan su sol: se descuenta la zona
    //      del patio a la que llega el sol (patio ∩ patio retrocorrido
    //      una sombra — exacto para patios convexos).
    //   Respaldo ante geometrías raras: envolvente convexa (el método
    //   viejo) y, si ni eso, la huella sin desplazar.
    try {
      const anillos = poligonoSimple.geometry && poligonoSimple.geometry.coordinates;
      const anillo = anillos && anillos[0];
      if (!anillo || anillo.length < 4) return poligonoSimple;

      // Vector de barrido en grados (aproximación local: sombras < 1 km)
      const rad = (bearingSombra * Math.PI) / 180;
      const cosLat = Math.max(0.087, Math.cos((anillo[0][1] * Math.PI) / 180));
      const dLon = (distanciaKm * Math.sin(rad)) / (111.32 * cosLat);
      const dLat = (distanciaKm * Math.cos(rad)) / 110.574;

      // Sol casi a pico: la sombra es prácticamente la huella del edificio.
      if (Math.abs(dLon) + Math.abs(dLat) < 1e-9) return poligonoSimple;

      const n = anillo.length - 1; // el último vértice repite al primero
      if (n < 3) return poligonoSimple;

      // Vértices tangentes: extremos laterales respecto a la sombra
      const perpX = -dLat, perpY = dLon;
      let iMin = 0, iMax = 0, wMin = Infinity, wMax = -Infinity;
      for (let i = 0; i < n; i++) {
        const w = anillo[i][0] * perpX + anillo[i][1] * perpY;
        if (w < wMin) { wMin = w; iMin = i; }
        if (w > wMax) { wMax = w; iMax = i; }
      }

      // Las dos cadenas entre los tangentes: una queda quieta (lado
      // contrario a la sombra) y la otra se desplaza con la sombra.
      const cadenaA = [];
      for (let i = iMin; ; i = (i + 1) % n) { cadenaA.push(anillo[i]); if (i === iMax) break; }
      const cadenaB = [];
      for (let i = iMax; ; i = (i + 1) % n) { cadenaB.push(anillo[i]); if (i === iMin) break; }
      const proy = (p) => p[0] * dLon + p[1] * dLat;
      const mediaA = cadenaA.reduce((s, p) => s + proy(p), 0) / cadenaA.length;
      const mediaB = cadenaB.reduce((s, p) => s + proy(p), 0) / cadenaB.length;
      const quieta = mediaA <= mediaB ? cadenaA : cadenaB;
      const movida = mediaA <= mediaB ? cadenaB : cadenaA;

      const contorno = quieta.concat(movida.map((p) => [p[0] + dLon, p[1] + dLat]));
      contorno.push(contorno[0]); // cerrar el anillo
      const anillosSombra = [contorno];

      // PATIOS: el sol entra en el trozo de patio que «ve» el cielo en
      // la dirección del sol (patio ∩ patio retrocorrido una sombra).
      for (let h = 1; h < anillos.length; h++) {
        const patio = anillos[h];
        if (!patio || patio.length < 4) continue;
        const patioRetraido = patio.map((p) => [p[0] - dLon, p[1] - dLat]);
        try {
          const soleado = turf.intersect(turf.polygon([patio]), turf.polygon([patioRetraido]));
          if (soleado && soleado.geometry) {
            const huecos = soleado.geometry.type === 'Polygon'
              ? [soleado.geometry.coordinates[0]]
              : soleado.geometry.coordinates.map((g) => g[0]);
            for (const hueco of huecos) anillosSombra.push(hueco);
          }
        } catch (e2) { /* patio raro: se queda sombreado entero */ }
      }

      return turf.polygon(anillosSombra, poligonoSimple.properties || {});
    } catch (e) {
      // Geometría rara: envolvente convexa (el método viejo) y, si ni
      // eso funciona, la huella sin desplazar.
      try {
        const anillo = poligonoSimple.geometry.coordinates[0];
        const puntos = [];
        for (let i = 0; i < anillo.length; i++) {
          puntos.push(turf.point(anillo[i]));
          puntos.push(turf.transformTranslate(turf.point(anillo[i]), distanciaKm, bearingSombra, { units: 'kilometers' }));
        }
        const envolvente = turf.convex(turf.featureCollection(puntos));
        if (envolvente) return envolvente;
      } catch (e2) { /* seguimos al respaldo final */ }
      return poligonoSimple;
    }
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
    const c = centroSolarEfectivo();
    return { lat: c.lat, lon: c.lon ?? c.lng };
  };

  let versionCalculoSombras = 0;
  let ultimaColeccionSombras = turf.featureCollection([]);
  let reintentoIdlePendiente = false;

  function limpiarCapaEdificiosEnSombra() {
    try { map.getSource('edificios-en-sombra')?.setData(turf.featureCollection([])); } catch (e) { /* sin fuente */ }
  }

  // Oscurece en 3D los edificios cuya huella cae dentro de la sombra de OTRO
  // edificio (cada sombra lleva properties.d = índice del edificio que la
  // proyecta, para no oscurecer a un edificio con su propia sombra).
  function actualizarEdificiosEnSombra(coleccionSombras) {
    const fuente = map.getSource('edificios-en-sombra');
    if (!fuente) return;
    try {
      const poligonos = (coleccionSombras && coleccionSombras.features) || [];
      if (!poligonos.length || !edificiosCacheados.length) {
        limpiarCapaEdificiosEnSombra();
        return;
      }
      // Prefiltro por bbox: sin esto serían ~100.000 point-in-polygon a ciegas.
      const cajas = poligonos.map((p) => { try { return turf.bbox(p); } catch (e) { return null; } });
      const enSombra = [];
      for (let idx = 0; idx < edificiosCacheados.length; idx++) {
        const edificio = edificiosCacheados[idx];
        try {
          const centroide = turf.centroid(edificio).geometry.coordinates;
          const lng = centroide[0], lat = centroide[1];
          let tapado = false;
          for (let k = 0; k < poligonos.length; k++) {
            if (poligonos[k].properties && poligonos[k].properties.d === idx) continue; // su propia sombra no cuenta
            const caja = cajas[k];
            if (!caja) continue;
            if (lng < caja[0] || lat < caja[1] || lng > caja[2] || lat > caja[3]) continue;
            if (turf.booleanPointInPolygon(turf.point(centroide), poligonos[k])) { tapado = true; break; }
          }
          if (tapado) {
            enSombra.push({
              type: 'Feature',
              properties: { alturaSombra: alturaDeEdificio(edificio.properties) + 0.4 },
              geometry: edificio.geometry,
            });
          }
        } catch (e) { continue; }
      }
      fuente.setData(turf.featureCollection(enSombra));
    } catch (e) {
      limpiarCapaEdificiosEnSombra();
    }
  }

  async function recalcularSombrasVisibles(horaOverride) {
    if (!map.getSource('sombras')) return;
    const miVersion = ++versionCalculoSombras;

    const ahora = horaOverride || obtenerHoraEfectiva();
    const centro = centroSolarEfectivo();
    const lat = centro.lat, lon = centro.lon ?? centro.lng;
    const posSol = SunCalc.getPosition(ahora, lat, lon);
    actualizarBadgeHoraDorada(ahora, lat, lon);

    if (!document.getElementById('rsToggleSombras')?.checked) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      limpiarCapaEdificiosEnSombra();
      ultimaColeccionSombras = turf.featureCollection([]);
      return;
    }

    if (posSol.altitude <= 0) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      limpiarCapaEdificiosEnSombra();
      ultimaColeccionSombras = turf.featureCollection([]);
      mostrarAvisoSol(t('sunBelow', 'El sol está bajo el horizonte a esa hora — no hay sombras que proyectar.'));
      return;
    }
    mostrarAvisoSol('');

    if (!capaEdificiosDisponible) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      limpiarCapaEdificiosEnSombra();
      ultimaColeccionSombras = turf.featureCollection([]);
      return;
    }

    // Antes: si la caché estaba vacía (teselas cargadas DESPUÉS del último
    // moveend, o el usuario solo tocó el slider sin mover el mapa) se
    // vaciaban las sombras en silencio y el mapa se quedaba "al revés":
    // calles al sol que en la realidad tienen sombra. Ahora la caché se
    // rellena aquí mismo, y si las teselas aún no han llegado se reintenta
    // solo cuando el mapa termine de cargarlas (evento idle).
    if (!edificiosCacheados.length) {
      actualizarCacheEdificios();
      if (!edificiosCacheados.length) {
        if (!reintentoIdlePendiente) {
          reintentoIdlePendiente = true;
          let reintentoHecho = false;
          const reintentar = () => {
            if (reintentoHecho) return;
            reintentoHecho = true;
            reintentoIdlePendiente = false;
            if (document.getElementById('rsToggleSombras')?.checked) {
              actualizarCacheEdificios();
              recalcularSombrasVisibles(horaOverride);
            }
          };
          map.once('idle', reintentar);
          // Red lenta o teselas que no acaban de llegar: el evento idle podría
          // no dispararse nunca, así que hay un reintento por temporizador.
          setTimeout(reintentar, 2500);
        }
        return;
      }
    }

    const azimutGrados = (posSol.azimuth * 180) / Math.PI + 180;
    const bearingSombra = (azimutGrados + 180) % 360;

    // CÁLCULO SÍNCRONO Y DE GOLPE (como la versión rápida de antes):
    // proyectar la sombra de un edificio es solo una envolvente convexa
    // (calcularVolumenSombra), así que 320 edificios se calculan en
    // milisegundos. Ni lotes con pausa ni abortos a mitad: si el cálculo
    // se pudiera interrumpir (versión anterior), cualquier movimiento del
    // mapa lo cancelaba a mitad y las sombras nunca llegaban a formarse
    // completas — por eso se veían solo unas pocas y tardaban minutos.
    const poligonosSombra = [];
    for (let i = 0; i < edificiosCacheados.length; i++) {
      const edificio = edificiosCacheados[i];
      const indiceDueno = i; // para no oscurecer un edificio con su propia sombra
      try {
        const altura = alturaDeEdificio(edificio.properties);
        const longitudSombraM = altura / Math.tan(posSol.altitude);
        if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;

        const geom = edificio.geometry;
        if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

        const distanciaKm = longitudSombraM / 1000;
        const partes = turf.flatten(turf.feature(geom)).features;
        for (const parte of partes) {
          const volumen = calcularVolumenSombra(parte, distanciaKm, bearingSombra);
          if (volumen) {
            volumen.properties = Object.assign({}, volumen.properties, { d: indiceDueno });
            poligonosSombra.push(volumen);
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (miVersion !== versionCalculoSombras) return;
    const coleccionSombras = turf.featureCollection(poligonosSombra);
    map.getSource('sombras')?.setData(coleccionSombras);
    ultimaColeccionSombras = coleccionSombras;

    // Y ahora el paso que faltaba: la sombra también se REFLEJA EN LOS
    // EDIFICIOS — las fachadas tapadas por la sombra de otro edificio se
    // oscurecen en 3D, no solo el suelo.
    actualizarEdificiosEnSombra(coleccionSombras);

    // El halo atmosférico es el efecto más caro (buffer de toda la escena):
    // en gama baja se omite — las sombras planas ya comunican lo mismo.
    if (!esGamaBaja && poligonosSombra.length <= 160) {
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
    if (document.hidden) return; // pestaña oculta: cero gasto de CPU/batería
    if (!solarActivado || modoManual || paseoActivo) return;
    if (map.loaded()) recalcularSombrasVisibles();
    actualizarIluminacionSolar();
    sincronizarArboles();
  }, 60 * 1000);

  /* ============================================================
     ÓPTICA ATMOSFÉRICA EN TIEMPO REAL — nubes de OpenWeatherMap
     ------------------------------------------------------------
     Física aplicada:
     1) LUZ DIFUSA: bajo la nube la radiación directa se dispersa y las
        sombras NO desaparecen, pierden contraste:
            opacidad_efectiva = opacidad_base × (1 − nubosidad × 0.6)
        (nubosidad ∈ [0,1], de clouds.all de OpenWeatherMap vía /clima).
     2) SOMBRA MACRO DE NUBE: un velo suave (mix-blend multiply) envuelve
        la escena y unifica la iluminación de edificios y árboles.
     3) MOTOR DE ZOOM: la densidad atmosférica crece al alejarse
        (0.3 cerca → 0.8 lejos) y la luz difusa en el suelo es la
        protagonista a nivel de calle (zoom ≥ 12).
     4) La clave de OpenWeatherMap NUNCA toca el navegador: vive como
        secret del Worker (ruta same-origin /clima). Si no hay clave o
        la red falla, la escena asume cielo despejado (nubosidad 0).
     ============================================================ */

  let nubosidadActual = 0; // 0 (despejado) .. 1 (cubierto)
  const NUBES = {
    refrescoMs: 10 * 60 * 1000,      // OpenWeatherMap actualiza cada ~10 min
    celdaGrados: 0.4,                // ~40 km: la nubosidad no cambia por calle
    atenuacionMaxSombra: 0.6,        // la sombra nunca desaparece: -60% máx.
    cache: new Map(),                // celda -> { t, valor }
  };
  let ultimaConsultaNubesMs = 0;

  function celdaNubes(lat, lon) {
    return `${Math.floor(lat / NUBES.celdaGrados)},${Math.floor(lon / NUBES.celdaGrados)}`;
  }

  async function consultarNubosidad(lat, lon) {
    const clave = celdaNubes(lat, lon);
    const cacheada = NUBES.cache.get(clave);
    if (cacheada && Date.now() - cacheada.t < NUBES.refrescoMs) return cacheada.valor;
    // Segunda capa: localStorage, para no repetir la llamada aunque el
    // usuario recargue la página o vuelva unos minutos después.
    const persistente = cacheLocalObtener(`manolito_cache_clima_${clave}`, CACHE_CLIMA_TTL_MS);
    if (persistente != null) {
      NUBES.cache.set(clave, { t: Date.now(), valor: persistente });
      return persistente;
    }
    try {
      const resp = await fetch(`/clima?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const datos = await resp.json();
      const valor = Math.max(0, Math.min(1, Number(datos.nubes ?? 0) / 100));
      NUBES.cache.set(clave, { t: Date.now(), valor });
      cacheLocalGuardar(`manolito_cache_clima_${clave}`, valor);
      return valor;
    } catch (e) {
      // Sin Worker/clave/red: cielo despejado por defecto, sin romper nada.
      return cacheada ? cacheada.valor : 0;
    }
  }

  // Densidad atmosférica según zoom: 0.3 a nivel de calle, 0.8 de lejos.
  function densidadAtmosfericaZoom() {
    const z = map.getZoom();
    const p = Math.max(0, Math.min(1, (13.5 - z) / (13.5 - 9)));
    return 0.3 + (0.8 - 0.3) * p;
  }

  // A nivel de calle (zoom ≥ 12) la luz difusa en el suelo es protagonista;
  // al alejarte el efecto local se diluye y manda la sombra macro de la nube.
  function factorCalleDifusa() {
    const z = map.getZoom();
    return z >= 12 ? 1 : Math.max(0.3, (z - 8) / 4);
  }

  function mezclarHex(hexA, hexB, p) {
    const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
    const r = Math.round(((a >> 16) & 255) * (1 - p) + ((b >> 16) & 255) * p);
    const g = Math.round(((a >> 8) & 255) * (1 - p) + ((b >> 8) & 255) * p);
    const bl = Math.round((a & 255) * (1 - p) + (b & 255) * p);
    return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
  }

  function aplicarOpticaNubes() {
    // 1) Micro-sombras (edificios + árboles): más tenues bajo la nube.
    //    La densidad atmosférica modula suavemente el efecto en torno a un
    //    núcleo: en calle (0.3) atenúa un poco menos (la luz difusa local
    //    rebota entre fachadas) y lejos (0.8) la escena se unifica más.
    const densidad = densidadAtmosfericaZoom();
    const f = 1 - nubosidadActual * NUBES.atenuacionMaxSombra * (0.55 + 0.45 * densidad) * factorCalleDifusa();
    const colorSombra = mezclarHex('#0b1220', '#46586c', nubosidadActual * 0.8);
    try {
      if (map.getLayer('capa-sombras')) {
        map.setPaintProperty('capa-sombras', 'fill-opacity', 0.34 * f);
        map.setPaintProperty('capa-sombras', 'fill-color', colorSombra);
      }
      if (map.getLayer('capa-sombras-halo')) {
        map.setPaintProperty('capa-sombras-halo', 'fill-opacity', 0.10 * f);
        map.setPaintProperty('capa-sombras-halo', 'fill-color', colorSombra);
      }
      // La capa de sombra de los árboles la crea arboles-globales.js; si ya
      // existe, se atenúa con el mismo factor (comunicación sin romper nada).
      if (map.getLayer('capa-sombra-arboles-globales')) {
        map.setPaintProperty('capa-sombra-arboles-globales', 'fill-opacity', 0.26 * f);
        map.setPaintProperty('capa-sombra-arboles-globales', 'fill-color', colorSombra);
      }
    } catch (e) { /* alguna capa aún no existe: se aplicará en la próxima pasada */ }

    // 2) Sombra macro de la masa de nubes sobre el suelo.
    const velo = document.getElementById('rsNubesSombra');
    if (velo) {
      velo.style.opacity = String(Math.min(0.85, nubosidadActual * densidadAtmosfericaZoom() * 0.9));
    }
  }

  // Velo CSS: manchas suaves y enormes con blend multiply que se desplazan
  // muy despacio, como haría la sombra real de una nube arrastrada por el viento.
  function inyectarSombraNubes() {
    if (document.getElementById('rsNubesSombra')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rsNubesSombraEstilos';
    estilo.textContent = `
      #rsNubesSombra{
        position:absolute; inset:-15%; z-index:2; pointer-events:none;
        opacity:0; transition:opacity 1.2s ease;
        mix-blend-mode:multiply;
        background:
          radial-gradient(38% 30% at 22% 30%, rgba(30,42,60,0.55) 0%, rgba(30,42,60,0) 70%),
          radial-gradient(46% 36% at 68% 22%, rgba(30,42,60,0.45) 0%, rgba(30,42,60,0) 72%),
          radial-gradient(42% 34% at 45% 70%, rgba(30,42,60,0.50) 0%, rgba(30,42,60,0) 70%),
          radial-gradient(30% 26% at 84% 62%, rgba(30,42,60,0.40) 0%, rgba(30,42,60,0) 70%);
        animation:rsDerivaNubes 90s linear infinite alternate;
      }
      @keyframes rsDerivaNubes{
        0%{ transform:translate3d(0,0,0) scale(1); }
        100%{ transform:translate3d(6%,3%,0) scale(1.06); }
      }
      @media (prefers-reduced-motion: reduce){
        #rsNubesSombra{ animation:none; }
      }
    `;
    document.head.appendChild(estilo);
    const velo = document.createElement('div');
    velo.id = 'rsNubesSombra';
    contenedorMapa.appendChild(velo);
  }

  async function refrescarNubosidad(forzar) {
    const centro = centroSolarEfectivo();
    const lat = centro.lat, lon = centro.lon ?? centro.lng;
    if (!forzar && Date.now() - ultimaConsultaNubesMs < NUBES.refrescoMs) return;
    ultimaConsultaNubesMs = Date.now();
    const valor = await consultarNubosidad(lat, lon);
    if (valor !== nubosidadActual) {
      const salto = Math.abs(valor - nubosidadActual);
      nubosidadActual = valor;
      aplicarOpticaNubes();
      actualizarIluminacionSolar();
      // Si la nubosidad cambia MUCHO (frente nuboso entrando o saliendo) y
      // hay una ruta activa, se recalcula sola: el Dijkstra térmico pondera
      // la penalización solar con la nubosidad real, así que el camino más
      // fresco con sol puede dejar de serlo con el cielo cubierto.
      if (salto >= 0.25) recalcularRutaPorTiempo();
    }
  }

  let recalculandoRutaPorNubes = false;
  async function recalcularRutaPorTiempo() {
    if (recalculandoRutaPorNubes || !rutaActual) return;
    const o = seleccionPorInput.get(inputOrigen);
    const d = seleccionPorInput.get(inputDestino);
    if (!o || !d || o.lat == null || d.lat == null) return;
    recalculandoRutaPorNubes = true;
    try {
      mostrarEstado(t('routeRecalcWeather', 'Ha cambiado la nubosidad — recalculando la ruta más fresca…'));
      await ejecutarBusquedaConPuntos(o, d);
    } catch (e) { /* si falla, se queda la ruta que había */ }
    finally { recalculandoRutaPorNubes = false; }
  }

  // Hooks de depuración/integración: otros scripts pueden leer la nubosidad
  // y las pruebas pueden simular una nube sin tocar OpenWeatherMap.
  window.manolitAireNubosidad = () => nubosidadActual;
  // Diagnóstico: cuántos edificios alimentan las sombras y cuántas hay.
  window.manolitAireDebugSombras = () => {
    let enFuente = -1;
    try {
      const src = map.getSource('sombras');
      const datos = src && (src._data || (src.serialize && src.serialize().data));
      enFuente = datos && datos.features ? datos.features.length : -1;
    } catch (e) { /* sin acceso a la fuente */ }
    let altSol = null;
    try {
      const c = centroSolarEfectivo();
      altSol = +(SunCalc.getPosition(obtenerHoraEfectiva(), c.lat, c.lon ?? c.lng).altitude * 180 / Math.PI).toFixed(1);
    } catch (e) { /* sin sol */ }
    return {
      edificios: edificiosCacheados.length,
      sombras: (ultimaColeccionSombras && ultimaColeccionSombras.features.length) || 0,
      enFuente,
      capaEdificios: capaEdificiosDisponible,
      altitudSol: altSol,
    };
  };
  window.manolitAireSimularNubes = (v) => {
    nubosidadActual = Math.max(0, Math.min(1, Number(v) || 0));
    aplicarOpticaNubes();
    actualizarIluminacionSolar();
  };

  // Coexistencia con el motor de zoom: cada zoomend re-equilibra la
  // densidad atmosférica y el peso de la luz difusa a nivel de calle.
  map.on('zoomend', () => aplicarOpticaNubes());
  // Y al mover el mapa, la nubosidad se reconsulta solo si toca (celda/tiempo).
  map.on('moveend', () => { refrescarNubosidad(false); });
  setInterval(() => { if (!document.hidden) refrescarNubosidad(false); }, NUBES.refrescoMs);

  /* --------- Capa raster de nubes REALES sobre el mapa (OpenWeatherMap) ---------
     Las teselas llegan proxiedas por el Worker (/tiles/nubes/...): la API key
     vive en el servidor y el edge de Cloudflare cachea cada tesela 10 min.
     La capa va por ENCIMA de todo (edificios, copas, sombras): las nubes
     están en el cielo, es lo físicamente correcto, y con opacidad suave
     iluminan la escena sin taparla. Además convive con el módulo de óptica:
     los datos de /clima atenúan las sombras mientras estas teselas las
     muestran visualmente. */
  const CAPA_NUBES_ID = 'capa-nubes-owm';
  let selloTilesNubes = Date.now();

  function urlTilesNubes() {
    return [`/tiles/nubes/{z}/{x}/{y}.png?v=${selloTilesNubes}`];
  }

  function aplicarVisibilidadNubes() {
    if (!map.getLayer(CAPA_NUBES_ID)) return;
    const visible = document.getElementById('rsToggleNubes')?.checked !== false;
    map.setLayoutProperty(CAPA_NUBES_ID, 'visibility', visible ? 'visible' : 'none');
  }

  // Visibilidad de las nubes según ZOOM y modo claro/oscuro:
  // - De cerca (calle): sutiles, para no tapar edificios ni sombras.
  // - De lejos (país): bien visibles, se leen como nubes de verdad.
  // - Mapa oscuro: el canvas lleva un filtro CSS invert(), así que las nubes
  //   blancas se vuelven negras y desaparecen. Bajando el brillo del raster
  //   las nubes "naceen oscuras" y el filtro las devuelve claras: visibles.
  //   Es solo pintura: el algoritmo de sombras ni se entera.
  function mapaEfectivamenteOscuro() {
    const webOscura = document.documentElement.getAttribute('data-theme') === 'dark';
    return webOscura ? !mapaOscuro : mapaOscuro;
  }

  function aplicarEstiloNubes() {
    if (!map.getLayer(CAPA_NUBES_ID)) return;
    const oscuro = mapaEfectivamenteOscuro();
    try {
      map.setPaintProperty(CAPA_NUBES_ID, 'raster-opacity', oscuro
        ? ['interpolate', ['linear'], ['zoom'], 3, 0.92, 8, 0.78, 11, 0.55, 13, 0.42]
        : ['interpolate', ['linear'], ['zoom'], 3, 0.85, 8, 0.62, 11, 0.42, 13, 0.32]);
      // En oscuro: nubes oscuras antes del filtro = claras después del invert()
      map.setPaintProperty(CAPA_NUBES_ID, 'raster-brightness-max', oscuro ? 0.16 : 1);
      map.setPaintProperty(CAPA_NUBES_ID, 'raster-brightness-min', 0);
      // Un poco más de contraste de lejos: las masas de nubes se distinguen mejor
      map.setPaintProperty(CAPA_NUBES_ID, 'raster-contrast', ['interpolate', ['linear'], ['zoom'], 3, 0.28, 10, 0.12, 13, 0.05]);
      map.setPaintProperty(CAPA_NUBES_ID, 'raster-saturation', -0.35);
    } catch (e) { /* capa a medio crear */ }
  }

  function instalarCapaNubes() {
    if (!map.getSource('nubes-owm')) {
      map.addSource('nubes-owm', {
        type: 'raster',
        tiles: urlTilesNubes(),
        tileSize: 256,
        maxzoom: 12, // OWM no sirve más allá; MapLibre hace overzoom suave
        attribution: 'Nubes © OpenWeatherMap',
      });
    }
    if (!map.getLayer(CAPA_NUBES_ID)) {
      map.addLayer({
        id: CAPA_NUBES_ID,
        type: 'raster',
        source: 'nubes-owm',
        paint: { 'raster-opacity': 0.55, 'raster-fade-duration': 400 },
      });
    }
    aplicarEstiloNubes();
    aplicarVisibilidadNubes();
  }

  // OWM renueva sus tiles cada ~10 min: cambiamos el sello para que el mapa
  // pida la versión nueva (las teselas viejas las sirve la caché edge).
  setInterval(() => {
    if (document.hidden) return; // pestaña oculta: no pedir tiles nuevas
    if (!map.getSource('nubes-owm')) return;
    selloTilesNubes = Date.now();
    try { map.getSource('nubes-owm').setTiles(urlTilesNubes()); } catch (e) { /* fuente a medio cargar */ }
  }, NUBES.refrescoMs);

  // Si el estilo se recargara por cualquier motivo, la capa se reinstala sola.
  map.on('styledata', () => {
    if (map.isStyleLoaded() && !map.getSource('nubes-owm')) {
      try { instalarCapaNubes(); } catch (e) { /* estilo a medio cargar */ }
    }
  });

  /* ---------------- Widget de posición del sol ---------------- */

  let puntoReferenciaSol = null;
  let rutaActual = null;

  // Las sombras deben corresponderse con lo que el usuario ESTÁ VIENDO,
  // esté donde esté (Sevilla, Madrid, México DF…). Si el punto de
  // referencia guardado (tu GPS, el origen de la última ruta) está lejos
  // del centro actual del mapa, se usa el centro de la pantalla: el sol de
  // otra ciudad no sirve para la calle que tienes delante.
  function centroSolarEfectivo() {
    const c = map.getCenter();
    if (puntoReferenciaSol) {
      const lonRef = puntoReferenciaSol.lon ?? puntoReferenciaSol.lng;
      if (Math.abs(puntoReferenciaSol.lat - c.lat) < 0.6 && Math.abs(lonRef - c.lng) < 0.6) {
        return puntoReferenciaSol;
      }
    }
    return c;
  }

  // TODAS las sombras que hay en escena ahora mismo: las de los edificios
  // (ultimaColeccionSombras, calculadas en este archivo) MÁS las de los
  // árboles (fuente 'arboles-globales-sombra', que rellena
  // arboles-globales.js). Sin esto, pasar bajo la sombra de un árbol no
  // contaba como sombra ni en el % ni en el pintado cian de la ruta.
  function obtenerSombrasDeArboles() {
    try {
      const fuente = map.getSource('arboles-globales-sombra');
      if (!fuente) return [];
      const datos = fuente._data || (fuente.serialize && fuente.serialize().data);
      if (!datos || !datos.features) return [];
      return datos.features.filter(
        (f) => f && f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
    } catch (e) { /* la capa de árboles no está cargada o activada */ }
    return [];
  }

  function obtenerTodasLasSombras() {
    const edificios = (ultimaColeccionSombras && ultimaColeccionSombras.features) || [];
    const arboles = obtenerSombrasDeArboles();
    return arboles.length ? edificios.concat(arboles) : edificios;
  }

  function puntoEnSombra(punto) {
    const sombras = obtenerTodasLasSombras();
    for (const poligono of sombras) {
      try {
        if (turf.booleanPointInPolygon(punto, poligono)) return true;
      } catch (e) { /* geometría rara: la ignoramos */ }
    }
    return false;
  }

  // ¿Un tramo de ruta TOCA la sombra de algún árbol? La sombra de un tronco
  // de palmera mide ~1 m de ancha y los tramos son de 10 m: mirar solo el
  // punto medio la perdía casi siempre. Aquí se comprueba la INTERSECCIÓN
  // real línea-polígono, así cualquier cruce cuenta, por fina que sea.
  function tramoTocaSombraDeArbol(tramo, sombrasArboles) {
    for (const poligono of sombrasArboles) {
      try {
        if (turf.booleanIntersects(tramo, poligono)) return true;
      } catch (e) { /* geometría rara: probamos por puntos */
        try {
          for (const c of tramo.geometry.coordinates) {
            if (turf.booleanPointInPolygon(turf.point(c), poligono)) return true;
          }
        } catch (e2) { /* la ignoramos */ }
      }
    }
    return false;
  }

  async function actualizarTramosSombraRuta() {
    const fuente = map.getSource('ruta-sombra');
    if (!fuente) return;
    const haySombras = (ultimaColeccionSombras?.features?.length || 0) + obtenerSombrasDeArboles().length;
    if (!rutaActual || !haySombras) {
      fuente.setData(turf.featureCollection([]));
      // El badge de % de sombra ya no se queda con el valor viejo cuando
      // deja de haber ruta o sombras que mostrar.
      mostrarBadgeSombra(null);
      return;
    }
    try {
      const tramos = turf.lineChunk(rutaActual, 0.01, { units: 'kilometers' });
      const sombrasEdificios = (ultimaColeccionSombras && ultimaColeccionSombras.features) || [];
      const sombrasArboles = obtenerSombrasDeArboles();
      const tramosEnSombra = tramos.features.filter((tramo) => {
        const coords = tramo.geometry.coordinates;
        const medio = turf.point(coords[Math.floor(coords.length / 2)] || coords[0]);
        // Edificios: sombra grande, basta el punto medio (rápido).
        for (const poligono of sombrasEdificios) {
          try {
            if (turf.booleanPointInPolygon(medio, poligono)) return true;
          } catch (e) { /* geometría rara: la ignoramos */ }
        }
        // Árboles: sombra fina, hace falta intersección real con el tramo.
        return tramoTocaSombraDeArbol(tramo, sombrasArboles);
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
      console.debug('No se ha podido calcular qué tramos de la ruta están en sombra:', e);
      fuente.setData(turf.featureCollection([]));
    }
  }

  // El módulo de árboles (integrado al final de este archivo) avisa por aquí
  // cada vez que recalcula sus sombras: la ruta se repinta y el badge se
  // actualiza SOLO, sin esperar a que toques el slider. Si no, los tramos
  // cian de los árboles llegaban tarde o no llegaban.
  window.manolitAireActualizarSombraRuta = () => {
    try { actualizarTramosSombraRuta(); } catch (e) { /* la ruta aún no existe */ }
  };
  function calcularAnguloSol(horaOverride) {
    const centro = centroSolarEfectivo();
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

    // Luz difusa por nubosidad real: la nube dispersa la luz directa del
    // sol, así que la iluminación direccional baja y el cielo se apaga
    // hacia gris sin llegar a apagarse del todo (luz ambiental difusa).
    const factorNubLuz = 1 - nubosidadActual * 0.5;
    const grisNube = mezclarHex('#199EF3', '#8fa0b3', nubosidadActual * 0.85);

    map.setLight({
      anchor: 'map',
      color: bajoHorizonte ? '#3a4a63' : '#fff6e6',
      intensity: bajoHorizonte ? 0.15 : Math.min(1, (0.35 + alturaDeg / 90) * factorNubLuz),
      position: [1.5, azimutDeg, polar],
    });

    map.setSky({
      'sky-color': bajoHorizonte ? '#0a1220' : grisNube,
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
        border:1px solid var(--line, rgba(14,59,71,0.14)); border-radius:999px;
        padding:5px 10px 5px 13px; font-size:10.5px; color:var(--sky-deep, #0E3B47);
        box-shadow:0 6px 16px rgba(22,35,46,0.16); max-width:calc(100% - 24px);
        white-space:nowrap;
      }
      #rsShadowBadge.rs-visible{ display:inline-flex; }
      #rsShadowBadgeCerrar{
        background:transparent; border:none; color:var(--sky-mid, #17788A); font-size:14px;
        cursor:pointer; line-height:1; padding:0 2px;
      }
      #rsShadowBadgeCerrar:hover{ color:var(--ink, #0D1F26); }
      @media (max-width:480px){ #rsShadowBadge{ font-size:10.5px; bottom:8px; padding:5px 8px 5px 12px; } }
    `;
    document.head.appendChild(estilo);

    const badge = document.createElement('div');
    badge.id = 'rsShadowBadge';
    // El badge vive SIEMPRE en el DOM (solo se muestra/oculta con la clase)
    // y anuncia el % de sombra al cambiar: aria-live polite + atomic.
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.setAttribute('aria-atomic', 'true');
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
  let anunciadorHora = null;
  let temporizadorAnuncio = null;
  let resumenRutaAccesible = '';

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
    // El slider anuncia la hora en formato legible, no los minutos crudos.
    if (sliderTiempo) sliderTiempo.setAttribute('aria-valuetext', formatoHora(fecha));
    // Anuncio por lector de pantalla con debounce (~400 ms): mientras se
    // arrastra no se machaca al usuario; al soltar, escucha la hora final.
    clearTimeout(temporizadorAnuncio);
    temporizadorAnuncio = setTimeout(() => {
      if (anunciadorHora) {
        const badge = document.getElementById('rsShadowBadgeTexto');
        const sombraTxt = badge && badge.textContent ? ` · ${badge.textContent}` : '';
        anunciadorHora.textContent = etiquetaTiempo.textContent + sombraTxt;
      }
      actualizarResumenAccesible();
    }, 400);
  }

  // El mapa es un canvas: invisible para lectores de pantalla. Esta región
  // role="status" (oculta visualmente, en index.html) repite en texto lo
  // que el mapa enseña: resumen de la ruta (distancia, duración, % sombra)
  // y la posición del sol, con los mismos datos del cálculo.
  function actualizarResumenAccesible() {
    const el = document.getElementById('rsLiveSummary');
    if (!el) return;
    let texto = resumenRutaAccesible ? resumenRutaAccesible + ' ' : '';
    try {
      const { azimutDeg, alturaDeg } = calcularAnguloSol();
      texto += alturaDeg > 0
        ? `${t('sunSummaryAbove', 'Sol a')} ${Math.round(alturaDeg)} ${t('sunSummaryDeg', 'grados de altura')}, ${t('sunSummaryAzimuth', 'azimut')} ${Math.round(azimutDeg)}°.`
        : t('sunSummaryBelow', 'De noche: el sol está bajo el horizonte.');
    } catch (e) { /* sin mapa o sin SunCalc todavía: queda solo el resumen */ }
    el.textContent = texto;
  }

  async function aplicarCambioDeHora(contexto) {
    actualizarEtiquetaTiempo(contexto);
    // Avisar al planetario: el sol y la luna siguen la hora elegida a mano.
    try {
      const centroPlan = centroSolarEfectivo();
      window.planetarioNotificarHora?.(
        obtenerFechaDelSlider(),
        centroPlan.lat,
        centroPlan.lon ?? centroPlan.lng
      );
    } catch (e) { /* el planetario es opcional */ }
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
        background:linear-gradient(160deg, rgba(251,250,247,0.96) 0%, rgba(255,107,26,0.16) 100%);
        backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
        border:1px solid rgba(255,107,26,0.4); border-radius:14px;
        box-shadow:0 8px 22px rgba(22,35,46,0.16);
        padding:10px 13px; font-family:inherit; color:var(--ink, #0D1F26);
        transition:opacity .18s ease, transform .18s ease;
      }
      #rsTimeControls .rs-cuerpo{ overflow:visible; }
      #rsTimeControls.rs-cerrado .rs-cuerpo{ display:none; }
      #rsTimeControls .rs-fila{ display:flex; align-items:center; gap:8px; }
      #rsTimeControls .rs-cabecera{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
      #rsTimeControls.rs-cerrado .rs-cabecera{ margin-bottom:0; }
      #rsTimeControls:not(.rs-cerrado) .rs-cabecera{ margin-bottom:7px; }
      #rsTimeControls .rs-eyebrow{
        font-size:8.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--sky-mid, #17788A);
        font-weight:700;
      }
      #rsPlegarBtn{
        appearance:none; border:none; background:transparent; color:var(--sky-mid, #17788A);
        cursor:pointer; padding:2px 4px; opacity:.75; line-height:0;
      }
      #rsPlegarBtn:hover{ opacity:1; }
      #rsPlegarBtn svg{ display:block; transition:transform .2s ease; }
      #rsTimeControls.rs-cerrado #rsPlegarBtn svg{ transform:rotate(180deg); }
      #rsTimeLabel{
        font-family:var(--font-mono, 'IBM Plex Mono', monospace);
        font-size:12px; letter-spacing:.02em; color:#C24500; font-weight:700;
      }
      #rsGoldenBadge{
        font-size:8.5px; font-weight:700; letter-spacing:.04em; padding:2px 7px 2px 5px;
        border-radius:999px; border:1px solid rgba(255,107,26,0.5); white-space:nowrap;
        background:rgba(255,107,26,0.14);
        display:inline-flex; align-items:center; gap:4px; color:#C24500;
      }
      #rsGoldenBadge::before{ content:''; width:5px; height:5px; border-radius:50%; background:currentColor; }
      #rsTimeControls .rs-divisor{
        height:1px; margin:8px 0; background:var(--line, rgba(14,59,71,0.14));
      }
      #rsTimeSlider{
        -webkit-appearance:none; appearance:none; width:100%; height:16px; background:transparent; cursor:pointer; margin:4px 0 1px;
      }
      #rsTimeSlider::-webkit-slider-runnable-track{
        height:3px; background:var(--line, rgba(14,59,71,0.18)); border-radius:2px;
      }
      #rsTimeSlider::-webkit-slider-thumb{
        -webkit-appearance:none; margin-top:-6px; width:14px; height:14px; border-radius:50%;
        background:var(--accent, #FF6B1A); border:2px solid var(--paper, #FBFAF7); box-shadow:0 1px 4px rgba(22,35,46,0.25);
      }
      #rsTimeSlider::-moz-range-track{ height:3px; background:var(--line, rgba(14,59,71,0.18)); border-radius:2px; }
      #rsTimeSlider::-moz-range-thumb{
        width:12px; height:12px; border-radius:50%; background:var(--accent, #FF6B1A); border:2px solid var(--paper, #FBFAF7);
      }
      #rsTimeControls .rs-botones{ display:flex; gap:5px; flex-wrap:wrap; margin-top:8px; }
      #rsTimeControls button{
        flex:1; min-width:0; font-size:9px; letter-spacing:.04em; text-transform:uppercase;
        padding:6px 6px; border-radius:9px; border:1px solid var(--line, rgba(14,59,71,0.14));
        background:var(--mist, #EDF1F0); color:var(--sky-deep, #0E3B47);
        cursor:pointer; font-weight:700; transition:background .15s,border-color .15s;
      }
      #rsTimeControls button:hover{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent, #FF6B1A); }
      #rsTimeControls button:active{ background:var(--accent-soft, rgba(255,107,26,0.3)); }
      #rsTimeControls button.rs-btn-capturar{ flex-basis:100%; color:var(--sky-mid, #17788A); }
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
        border:1px solid var(--line, rgba(14,59,71,0.14));
        background:rgba(251,250,247,0.92); color:var(--sky-deep, #0E3B47);
        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        cursor:pointer; box-shadow:0 3px 10px rgba(22,35,46,0.12); transition:background .15s,border-color .15s,color .15s;
      }
      #rsMapControls button:hover{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent, #FF6B1A); }
      #rsMapControls button.rs-activo{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent, #FF6B1A); color:var(--sky-deep, #0E3B47); }
      @media (max-width:480px){ #rsMapControls button{ padding:5px 9px; font-size:8.5px; } }

      /* Botonera plegable: plegada solo queda el botón ≡ flotando */
      #rsBtnPlegarControles{
        font-family:inherit; font-size:12px; font-weight:700; line-height:1;
        padding:7px 11px; border-radius:999px;
        border:1px solid var(--line, rgba(14,59,71,0.14));
        background:rgba(251,250,247,0.95); color:var(--sky-deep, #0E3B47);
        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        cursor:pointer; box-shadow:0 3px 10px rgba(22,35,46,0.12);
      }
      #rsMapControls.rs-plegado{ right:auto; }
      #rsMapControls.rs-plegado > button:not(#rsBtnPlegarControles){ display:none; }

      /* Joystick virtual para paseo 3D */
      #rsJoystick{
        position:absolute; right:24px; bottom:24px; width:96px; height:96px;
        border-radius:50%; background:rgba(251,250,247,0.5);
        border:1px solid var(--line, rgba(14,59,71,0.2)); touch-action:none;
        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        z-index:6; display:none; pointer-events:auto;
      }
      #rsJoystickKnob{
        position:absolute; left:50%; top:50%; width:38px; height:38px;
        transform:translate(-50%,-50%); border-radius:50%;
        background:var(--accent, #FF6B1A); border:2px solid var(--paper, #FBFAF7);
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
      // Si hay una ruta calculada con indicaciones, arranca la guía por voz:
      // anuncia el primer paso ya y los siguientes al acercarte a cada punto.
      iniciarGuiaCaminata();

      const el = document.createElement('div');
      el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${leerVar('--sky-deep') || '#0E3B47'};border:3px solid var(--paper);box-shadow:0 0 0 6px ${(leerVar('--sky-deep') || '#0E3B47')}33;`;
      marcadorCaminando = new maplibregl.Marker({ element: el });

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude, lon = pos.coords.longitude;
          marcadorCaminando.setLngLat([lon, lat]); // primero la posición: un Marker sin LngLat rompe al añadirse
          if (!marcadorCaminando._map) marcadorCaminando.addTo(map);
          map.easeTo({ center: [lon, lat], duration: 600 });
          puntoReferenciaSol = { lat, lon };
          avanzarGuiaCaminata(lat, lon); // anuncia el siguiente paso si ya toca
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
        console.debug('[paseo virtual] Esta versión de MapLibre GL JS no soporta cámara libre (getFreeCameraOptions). Revisa la versión cargada en el HTML.');
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

    /* ---- Botones FIJOS de Árboles e Irradiación Solar ----
       Antes los creaban sus módulos (arboles-globales.js / irradiacion-solar.js)
       cuando conseguían cargar y encontrar este panel; si no, el botón no
       aparecía NUNCA (de ahí lo de "unas veces sale y otras no").
       Ahora los crea el propio mapa y son fijos: si el módulo aún no está,
       el primer clic lo carga y lo activa; si ya está, manda el módulo. */
    function cargarScriptLocal(src) {
      if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }
    function botonCapaFijo(id, texto, src) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = id;
      b.textContent = texto;
      b.addEventListener('click', () => {
        if (b.dataset.listo === '1') return; // el módulo ya gestiona este botón
        if (b.dataset.cargando === '1') return;
        b.dataset.cargando = '1';
        b.dataset.autoActivar = '1';
        const textoPrev = b.textContent;
        b.textContent = '…';
        cargarScriptLocal(src).catch(() => {
          delete b.dataset.cargando;
          delete b.dataset.autoActivar;
          b.textContent = textoPrev;
          mostrarEstado(t('layerLoadError', 'No se ha podido cargar la capa. Inténtalo de nuevo.'), 'error');
        });
      });
      return b;
    }
    // Árboles: el módulo ya vive INTEGRADO al final de este mismo archivo,
    // así que el botón es un botón normal (lo "adopta" el módulo en cuanto
    // arranca). Nada de carga perezosa: cero puntos de fallo.
    const btnArboles = document.createElement('button');
    btnArboles.type = 'button';
    btnArboles.id = 'rsBtnArboles';
    btnArboles.textContent = t('treesBtn', 'Árboles');
    // Irradiación Solar: sigue siendo un módulo aparte con carga perezosa.
    const btnIrradiacion = botonCapaFijo('rsBtnIrradiacion', t('irrLayerBtn', 'Irradiación Solar'), 'js/irradiacion-solar.js');

    // Botón ≡ para plegar/desplegar TODA la botonera: cuando el usuario
    // quiere el mapa completamente limpio (capturas, enseñar la sombra a
    // alguien, pantallas pequeñas) no hay nada tapando la vista.
    const btnPlegarControles = document.createElement('button');
    btnPlegarControles.type = 'button';
    btnPlegarControles.id = 'rsBtnPlegarControles';
    btnPlegarControles.textContent = '≡';
    btnPlegarControles.setAttribute('aria-label', 'Mostrar u ocultar los botones del mapa');
    btnPlegarControles.setAttribute('aria-expanded', 'true');
    btnPlegarControles.addEventListener('click', () => {
      const plegado = panelMapa.classList.toggle('rs-plegado');
      btnPlegarControles.textContent = plegado ? '☰' : '≡';
      btnPlegarControles.setAttribute('aria-expanded', plegado ? 'false' : 'true');
    });

    panelMapa.append(btnPlegarControles, btnModoClick, btnUbicacion, btnCaminar, btnPaseo, btnReiniciar, btnArboles, btnIrradiacion);
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
    sliderTiempo.setAttribute('aria-label', t('timeSlider', 'Hora del día'));

    // Región aria-live separada para anunciar la hora mientras se arrastra
    // el slider, con debounce de ~400 ms para no saturar al lector de
    // pantalla (solo anuncia cuando el usuario se detiene un momento).
    anunciadorHora = document.createElement('div');
    anunciadorHora.id = 'rsTimeAnnouncer';
    anunciadorHora.className = 'visually-hidden';
    anunciadorHora.setAttribute('aria-live', 'polite');
    anunciadorHora.setAttribute('aria-atomic', 'true');

    sliderTiempo.addEventListener('input', () => {
      modoManual = true;
      fechaBaseManual = esFechaSolsticioActiva ? fechaBaseManual : new Date();
      // Debounce de 250 ms: arrastrar el slider NO recalcula la geometría 3D
      // en cada evento; solo al detenerse un momento (ahorro enorme de CPU).
      clearTimeout(temporizadorSlider);
      temporizadorSlider = setTimeout(() => aplicarCambioDeHora(esFechaSolsticioActiva), 250);
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
    // "Ahora / Verano / Invierno" forman un grupo lógico de preajustes;
    // display:contents mantiene el layout exacto sin cambiar el HTML visual.
    const grupoPreajustes = document.createElement('div');
    grupoPreajustes.setAttribute('role', 'group');
    grupoPreajustes.setAttribute('aria-label', t('timePresets', 'Preajustes de hora'));
    grupoPreajustes.style.display = 'contents';
    filaBotones.insertBefore(grupoPreajustes, filaBotones.firstChild);
    grupoPreajustes.append(btnAhora, btnVerano, btnInvierno);
    cuerpo.append(filaEtiqueta, sliderTiempo, divisor, filaBotones, anunciadorHora);
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
        /* subido 60px para no tapar el botón de atribución de MapLibre
           (WCAG 2.5.8: los objetivos táctiles no pueden quedar parcialmente ocultos) */
        position:absolute; right:12px; bottom:72px; z-index:5;
      }
      #rsMapStyleToggle button{
        font-family:inherit; font-size:9.5px; letter-spacing:.04em; text-transform:uppercase;
        font-weight:700; padding:6px 11px; border-radius:999px;
        border:1px solid var(--line, rgba(14,59,71,0.14));
        background:rgba(251,250,247,0.92); color:var(--sky-deep, #0E3B47);
        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        cursor:pointer; box-shadow:0 3px 10px rgba(22,35,46,0.12); transition:background .15s,border-color .15s;
      }
      #rsMapStyleToggle button:hover{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent, #FF6B1A); }
      .rs-mapa-oscuro-activo #shadowRouteMap .maplibregl-canvas{
        filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.85);
      }
      /* Cuando TODA la web está en modo oscuro, el mapa se oscurece solo:
         si no, queda como un foco blanco en medio de la página */
      [data-theme="dark"] #shadowRouteMap .maplibregl-canvas{
        filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.85);
      }
      /* Web oscura + botón pulsado a mano = el usuario pide el mapa claro */
      [data-theme="dark"] .rs-mapa-oscuro-activo #shadowRouteMap .maplibregl-canvas{
        filter: none;
      }
    `;
    document.head.appendChild(estilo);

    const wrap = document.createElement('div');
    wrap.id = 'rsMapStyleToggle';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'rsBtnMapaOscuro';
    btn.textContent = t('darkMapOn', 'Mapa oscuro');
    // La etiqueta del botón refleja el estado EFECTIVO del mapa: con la web
    // en modo oscuro el mapa ya nace oscuro y el botón pasa a "Mapa claro".
    const sincronizarEtiquetaMapa = () => {
      const webOscura = document.documentElement.getAttribute('data-theme') === 'dark';
      const efectivoOscuro = webOscura ? !mapaOscuro : mapaOscuro;
      btn.textContent = efectivoOscuro ? t('darkMapOff', 'Mapa claro') : t('darkMapOn', 'Mapa oscuro');
      btn.setAttribute('aria-pressed', efectivoOscuro ? 'true' : 'false');
    };
    new MutationObserver(() => { sincronizarEtiquetaMapa(); aplicarEstiloNubes(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    btn.addEventListener('click', () => {
      mapaOscuro = !mapaOscuro;
      contenedorMapa.classList.toggle('rs-mapa-oscuro-activo', mapaOscuro);
      sincronizarEtiquetaMapa();
      aplicarEstiloNubes(); // las nubes cambian de brillo para seguir viéndose
    });
    sincronizarEtiquetaMapa();
    wrap.appendChild(btn);

    /* --- Capa base IGN (WMS público del Instituto Geográfico Nacional) ---
       Teselas WMS gratuitas y reutilizables (CC BY 4.0 scne.es). Se pintan
       ENCIMA del mapa vectorial pero DEBAJO de los edificios 3D y las
       sombras, como cartografía de fondo alternativa. */
    const IGN_SRC = 'ign-wms-base';
    const IGN_CAPA = 'ign-wms-base-capa';
    let ignActivo = false;
    const asegurarCapaIGN = () => {
      try {
        if (!map.getSource(IGN_SRC)) {
          map.addSource(IGN_SRC, {
            type: 'raster',
            tiles: ['/ign-wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=IGNBaseTodo&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX={bbox-epsg-3857}'],
            tileSize: 256,
            attribution: 'Mapa base © <a href="https://www.scne.es/" target="_blank" rel="noopener">IGN / SCNE</a> CC BY 4.0',
          });
        }
        if (!map.getLayer(IGN_CAPA)) {
          // Debajo de los edificios 3D si la capa existe; si no, encima de todo el fondo
          const antes = map.getLayer(CONFIG.edificiosLayerId) ? CONFIG.edificiosLayerId : undefined;
          map.addLayer({ id: IGN_CAPA, type: 'raster', source: IGN_SRC,
            paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 300 },
            layout: { visibility: 'none' } }, antes);
        }
      } catch (e) {
        // Estilo aún cargando: reintentar cuando termine
        map.once('idle', () => { if (ignActivo) asegurarCapaIGN(), map.setLayoutProperty(IGN_CAPA, 'visibility', 'visible'); });
      }
    };
    const btnIGN = document.createElement('button');
    btnIGN.type = 'button';
    btnIGN.id = 'rsBtnMapaIGN';
    btnIGN.textContent = 'Mapa IGN';
    btnIGN.setAttribute('aria-pressed', 'false');
    btnIGN.title = 'Cartografía del Instituto Geográfico Nacional (CC BY 4.0 scne.es)';
    btnIGN.addEventListener('click', () => {
      ignActivo = !ignActivo;
      if (ignActivo) {
        asegurarCapaIGN();
        try { if (map.getLayer(IGN_CAPA)) map.setLayoutProperty(IGN_CAPA, 'visibility', 'visible'); } catch (e) {}
      } else {
        try { if (map.getLayer(IGN_CAPA)) map.setLayoutProperty(IGN_CAPA, 'visibility', 'none'); } catch (e) {}
      }
      btnIGN.setAttribute('aria-pressed', ignActivo ? 'true' : 'false');
      btnIGN.style.background = ignActivo ? 'var(--accent-soft, rgba(255,107,26,0.16))' : '';
      btnIGN.style.borderColor = ignActivo ? 'var(--accent, #FF6B1A)' : '';
    });
    wrap.appendChild(btnIGN);

    /* --- Catastro de España: densidad de alturas (fucsia/verde) ---
       100% gratis y sin API key: raster WMS oficial INSPIRE de la Sede
       Electrónica del Catastro (edificios BU.Building) proxiedado por el
       Worker (/catastro-wms, igual que /ign-wms) MÁS las extrusiones 3D
       recoloreadas por altura (verde = bajo → fucsia = alto), el estilo de
       densidad de edificación del Catastro. Las sombras NO se tocan: el
       motor lee geometría y alturas, no colores, así que siguen calculando
       igual sobre los mismos volúmenes. */
    const CAT_SRC = 'catastro-wms-base';
    const CAT_CAPA = 'catastro-wms-capa';
    let catastroActivo = false;
    const COLOR_EDIFICIOS_NORMAL = [
      'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], ['get', 'height'], 8],
      0, '#8fb3e8',
      30, '#5f8fd6',
      70, '#3f6bc0',
      140, '#274a96'
    ];
    // Gradiente de densidad del Catastro: verde (bajos) → amarillo →
    // naranja → fucsia (torres). Se lee de un vistazo dónde se concentra
    // la altura de la ciudad.
    const COLOR_EDIFICIOS_CATASTRO = [
      'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], ['get', 'height'], 8],
      0, '#2f9e44',
      12, '#8ac926',
      25, '#ffca3a',
      45, '#f3722c',
      80, '#d6006d',
      140, '#9d0060'
    ];
    const asegurarCapaCatastro = () => {
      try {
        if (!map.getSource(CAT_SRC)) {
          map.addSource(CAT_SRC, {
            type: 'raster',
            tiles: ['/catastro-wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=TRUE&LAYERS=PARCELA&STYLES=Default&WIDTH=256&HEIGHT=256&SRS=EPSG:3857&BBOX={bbox-epsg-3857}'],
            tileSize: 256,
            attribution: '© <a href="https://www.sedecatastro.gob.es/" target="_blank" rel="noopener">Dirección General del Catastro</a>',
          });
        }
        if (!map.getLayer(CAT_CAPA)) {
          const antes = map.getLayer(CONFIG.edificiosLayerId) ? CONFIG.edificiosLayerId : undefined;
          map.addLayer({ id: CAT_CAPA, type: 'raster', source: CAT_SRC,
            paint: { 'raster-opacity': 0.75, 'raster-fade-duration': 300 },
            layout: { visibility: 'none' } }, antes);
        }
      } catch (e) {
        map.once('idle', () => { if (catastroActivo) { asegurarCapaCatastro(); try { map.setLayoutProperty(CAT_CAPA, 'visibility', 'visible'); } catch (e2) {} } });
      }
    };
    const btnCatastro = document.createElement('button');
    btnCatastro.type = 'button';
    btnCatastro.id = 'rsBtnCatastro';
    btnCatastro.textContent = 'Catastro 3D';
    btnCatastro.setAttribute('aria-pressed', 'false');
    btnCatastro.title = 'Densidad de alturas oficial del Catastro de España (gratis, sin registro)';
    btnCatastro.addEventListener('click', () => {
      catastroActivo = !catastroActivo;
      if (catastroActivo) {
        asegurarCapaCatastro();
        try { if (map.getLayer(CAT_CAPA)) map.setLayoutProperty(CAT_CAPA, 'visibility', 'visible'); } catch (e) {}
        if (capaEdificiosDisponible && map.getLayer(CONFIG.edificiosLayerId)) {
          try { map.setPaintProperty(CONFIG.edificiosLayerId, 'fill-extrusion-color', COLOR_EDIFICIOS_CATASTRO); } catch (e) {}
        }
      } else {
        try { if (map.getLayer(CAT_CAPA)) map.setLayoutProperty(CAT_CAPA, 'visibility', 'none'); } catch (e) {}
        if (capaEdificiosDisponible && map.getLayer(CONFIG.edificiosLayerId)) {
          try { map.setPaintProperty(CONFIG.edificiosLayerId, 'fill-extrusion-color', COLOR_EDIFICIOS_NORMAL); } catch (e) {}
        }
      }
      btnCatastro.setAttribute('aria-pressed', catastroActivo ? 'true' : 'false');
      btnCatastro.style.background = catastroActivo ? 'var(--accent-soft, rgba(255,107,26,0.16))' : '';
      btnCatastro.style.borderColor = catastroActivo ? 'var(--accent, #FF6B1A)' : '';
    });
    wrap.appendChild(btnCatastro);
    // El wrap pasa a apilar los dos botones en vertical
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '6px';
    wrap.style.alignItems = 'flex-end';
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
          console.debug('No se ha podido exportar la vista como imagen:', errInterno);
          mostrarEstado(t('captureError', 'No se ha podido generar la imagen (limitación del servidor de mapas). Prueba a hacer una captura de pantalla normal.'), 'error');
        }
      });
      map.triggerRepaint();
    } catch (e) {
      console.debug('No se ha podido exportar la vista como imagen:', e);
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
      const vis = tEdificios.checked ? 'visible' : 'none';
      if (capaEdificiosDisponible) {
        map.setLayoutProperty(CONFIG.edificiosLayerId, 'visibility', vis);
      }
      // Las fachadas en sombra son una extrusión aparte: si se ocultan los
      // edificios, sus sombras recibidas también deben desaparecer.
      if (map.getLayer('capa-edificios-en-sombra')) {
        map.setLayoutProperty('capa-edificios-en-sombra', 'visibility', vis);
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
    const tNubes = document.getElementById('rsToggleNubes');
    tNubes?.addEventListener('change', aplicarVisibilidadNubes);

    // Fila de capas plegable (botón "▾ Capas" en index.html): limpia la
    // vista sin perder el estado de los checkboxes.
    const btnPlegarCapas = document.getElementById('rsBtnPlegarCapas');
    btnPlegarCapas?.addEventListener('click', () => {
      const cont = btnPlegarCapas.closest('.rs-layer-toggles');
      if (!cont) return;
      const plegado = cont.classList.toggle('rs-plegado');
      btnPlegarCapas.textContent = plegado ? '▸ Capas' : '▾ Capas';
      btnPlegarCapas.setAttribute('aria-expanded', plegado ? 'false' : 'true');
    });
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
    const url = new URL(CONFIG.nominatimUrl, window.location.origin);
    url.searchParams.set('q', consulta);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    // Nominatim es UN motor mundial (no hay "motor de España" aparte), pero
    // hay que decirle el país: sin este filtro una calle típica podía salir
    // en Latinoamérica o no encontrarse. Las sugerencias del desplegable ya
    // llevaban countrycodes=es; faltaba aquí, en la búsqueda directa.
    url.searchParams.set('countrycodes', 'es');
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
      const url = new URL(CONFIG.nominatimReverseUrl, window.location.origin);
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
    const url = `${CONFIG.osrmUrl}/foot/${coords}?overview=full&geometries=geojson&steps=true`;

    try {
      const datos = await fetchConReintentos(url);
      if (datos?.code === 'Ok' && datos.routes?.[0]) {
        let pasos = [];
        let pasosGuiados = [];
        try {
          const sombras = typeof obtenerTodasLasSombras === 'function' ? obtenerTodasLasSombras() : [];
          const generados = generarPasosDesdeOSRM(datos.routes[0], sombras);
          pasos = generados.pasos;
          pasosGuiados = generados.guiados;
        } catch (ePasos) { /* las indicaciones son un extra: nunca rompen la ruta */ }
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
          pasos,
          pasosGuiados,
        };
      }
      throw new Error('OSRM no ha devuelto una ruta válida.');
    } catch (err) {
      console.debug('Routing real no disponible, usando línea directa:', err);
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

  /* ---------------- Guía paso a paso accesible (calle a calle, sombra a sombra) ----------------
     Para personas ciegas o con baja visión: la ruta calculada se convierte en
     una lista de indicaciones en texto plano ("Gira a la izquierda en Calle
     Feria y sigue 120 m — tramo en sombra"), que un lector de pantalla lee
     directamente o el botón "Escuchar indicaciones" lee en voz alta con la
     voz del propio navegador (speechSynthesis, 100% local). */

  // Interpola {tokens} en las plantillas de i18n: t() + reemplazo simple.
  function tp(clave, fallback, vars) {
    let texto = t(clave, fallback);
    for (const k in vars) texto = texto.split('{' + k + '}').join(vars[k]);
    return texto;
  }

  function direccionCardinalTexto(bearing) {
    // 8 rumbos; el bearing 0 es norte y crece en sentido horario.
    const claves = ['dirN', 'dirNE', 'dirE', 'dirSE', 'dirS', 'dirSW', 'dirW', 'dirNW'];
    const idx = ((Math.round(bearing / 45) % 8) + 8) % 8;
    return t(claves[idx], ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'][idx]);
  }

  function normalizarGiro(bearingPrevio, bearingNuevo) {
    // Diferencia de rumbo en [-180, 180]: negativo = izquierda, positivo = derecha.
    let d = ((bearingNuevo - bearingPrevio + 540) % 360) - 180;
    return d;
  }

  function fraccionSombraTramo(coords, sombras) {
    // null = no hay sombras calculadas (de noche, capa apagada…): no se dice nada.
    if (!sombras || !sombras.length || !coords || coords.length < 2) return null;
    try {
      const linea = turf.lineString(coords);
      const tramos = turf.lineChunk(linea, 0.02, { units: 'kilometers' }).features;
      if (!tramos.length) return null;
      let enSombra = 0;
      for (const tramo of tramos) {
        const c = tramo.geometry.coordinates;
        const medio = turf.point(c[Math.floor(c.length / 2)] || c[0]);
        for (const poligono of sombras) {
          try { if (turf.booleanPointInPolygon(medio, poligono)) { enSombra++; break; } } catch (e) { }
        }
      }
      return enSombra / tramos.length;
    } catch (e) { return null; }
  }

  function textoSombra(fraccion, metros) {
    if (fraccion == null) return { frase: '', consejo: '' };
    let frase;
    if (fraccion >= 0.6) frase = t('shadeShade', 'tramo en sombra');
    else if (fraccion <= 0.25) frase = t('shadeSun', 'tramo al sol');
    else frase = t('shadeMixed', 'tramo con sol y sombra');
    // Consejo de calor solo donde de verdad duele: tramo largo y casi sin sombra.
    const consejo = (fraccion <= 0.25 && metros >= 120)
      ? t('shadeTip', 'Consejo: es un tramo largo al sol — ve despacio, camina por el lado con edificios y lleva agua.')
      : '';
    return { frase, consejo };
  }

  function redondearMetros(m) {
    return Math.max(10, Math.round(m / 5) * 5);
  }

  function nombreCalleBonito(nombre) {
    return nombre && nombre.trim() ? nombre.trim() : t('stepUnnamed', 'la calle sin nombre');
  }

  // Construye los pasos a partir del camino del Dijkstra térmico (grafo propio).
  // Devuelve { pasos: [texto...], guiados: [{ texto, punto }] }: cada paso
  // lleva el punto del mapa donde empieza, para que la caminata con GPS
  // pueda anunciarlo justo al llegar.
  function generarPasosDesdeGrafo(grafo, caminoIdx, sombras) {
    const pasos = [];
    const guiados = [];
    if (!grafo || !caminoIdx || caminoIdx.length < 2) return { pasos, guiados };

    // 1. Agrupar aristas consecutivas de la misma calle.
    const grupos = [];
    for (let i = 0; i < caminoIdx.length - 1; i++) {
      const u = caminoIdx[i], v = caminoIdx[i + 1];
      const arista = (grafo.adj[u] || []).find(a => a.to === v && a.nombre) || (grafo.adj[u] || []).find(a => a.to === v);
      if (!arista) continue;
      const nombre = arista.nombre || '';
      const a = grafo.nodos[u], b = grafo.nodos[v];
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.nombre === nombre) {
        ultimo.metros += arista.longitudM;
        ultimo.coords.push(b);
      } else {
        grupos.push({ nombre, metros: arista.longitudM, coords: [a, b] });
      }
    }
    if (!grupos.length) return { pasos, guiados };

    // 2. Convertir cada grupo en una frase con su giro y su sombra.
    let bearingAnterior = null;
    grupos.forEach((g, i) => {
      const metros = redondearMetros(g.metros);
      const calle = nombreCalleBonito(g.nombre);
      const bearingIni = turf.bearing(g.coords[0], g.coords[1]);
      const bearingFin = turf.bearing(g.coords[g.coords.length - 2], g.coords[g.coords.length - 1]);
      const { frase, consejo } = textoSombra(fraccionSombraTramo(g.coords, sombras), metros);
      const colaSombra = frase ? ' — ' + frase : '';

      let texto;
      if (i === 0) {
        texto = tp('stepDepart', 'Sal por {calle} hacia el {dir}, {metros} metros', {
          calle, dir: direccionCardinalTexto(bearingIni), metros,
        }) + colaSombra + '.';
      } else {
        const giro = normalizarGiro(bearingAnterior, bearingIni);
        const abs = Math.abs(giro);
        if (abs < 25) {
          texto = tp('stepContinue', 'Sigue por {calle} durante {metros} metros', { calle, metros }) + colaSombra + '.';
        } else if (abs > 135) {
          texto = tp('stepUturn', 'Da la vuelta y toma {calle}, {metros} metros', { calle, metros }) + colaSombra + '.';
        } else {
          const leve = abs < 60;
          const clave = giro < 0 ? (leve ? 'stepSlightLeft' : 'stepTurnLeft') : (leve ? 'stepSlightRight' : 'stepTurnRight');
          const fallback = giro < 0
            ? (leve ? 'Gira levemente a la izquierda en {calle} y sigue {metros} metros' : 'Gira a la izquierda en {calle} y sigue {metros} metros')
            : (leve ? 'Gira levemente a la derecha en {calle} y sigue {metros} metros' : 'Gira a la derecha en {calle} y sigue {metros} metros');
          texto = tp(clave, fallback, { calle, metros }) + colaSombra + '.';
        }
      }
      if (consejo) texto += ' ' + consejo;
      pasos.push(texto);
      guiados.push({ texto, punto: g.coords[0] });
      bearingAnterior = bearingFin;
    });

    const textoLlegada = t('stepArrive', 'Has llegado a tu destino.');
    pasos.push(textoLlegada);
    const ultimoGrupo = grupos[grupos.length - 1];
    guiados.push({ texto: textoLlegada, punto: ultimoGrupo.coords[ultimoGrupo.coords.length - 1], esLlegada: true });
    return { pasos, guiados };
  }

  // Lo mismo pero para las rutas OSRM (respaldo y alternativas): la respuesta
  // con steps=true ya trae maniobras, nombres de calle y distancias.
  function generarPasosDesdeOSRM(rutaOsrm, sombras) {
    const pasos = [];
    const guiados = [];
    const pasosOsrm = (rutaOsrm.legs || []).flatMap(l => l.steps || []);
    if (!pasosOsrm.length) return { pasos, guiados };

    for (const s of pasosOsrm) {
      const calle = nombreCalleBonito(s.name);
      const metros = redondearMetros(s.distance || 0);
      const coords = s.geometry?.coordinates || [];
      const { frase, consejo } = textoSombra(fraccionSombraTramo(coords, sombras), metros);
      const colaSombra = frase ? ' — ' + frase : '';
      const maniobra = s.maneuver || {};
      const tipo = maniobra.type || '';
      const mod = maniobra.modifier || '';

      let texto = null;
      if (tipo === 'depart') {
        const dir = coords.length >= 2 ? direccionCardinalTexto(turf.bearing(coords[0], coords[1])) : '';
        texto = tp('stepDepart', 'Sal por {calle} hacia el {dir}, {metros} metros', { calle, dir, metros }) + colaSombra + '.';
      } else if (tipo === 'arrive') {
        texto = t('stepArrive', 'Has llegado a tu destino.');
      } else if (tipo === 'roundabout' || tipo === 'rotary') {
        texto = tp('stepRoundabout', 'En la rotonda, toma la salida hacia {calle} y sigue {metros} metros', { calle, metros }) + colaSombra + '.';
      } else if (mod === 'uturn') {
        texto = tp('stepUturn', 'Da la vuelta y toma {calle}, {metros} metros', { calle, metros }) + colaSombra + '.';
      } else if (mod.includes('left') || mod.includes('right')) {
        const izq = mod.includes('left');
        const leve = mod.includes('slight');
        const clave = izq ? (leve ? 'stepSlightLeft' : 'stepTurnLeft') : (leve ? 'stepSlightRight' : 'stepTurnRight');
        const fallback = izq
          ? (leve ? 'Gira levemente a la izquierda en {calle} y sigue {metros} metros' : 'Gira a la izquierda en {calle} y sigue {metros} metros')
          : (leve ? 'Gira levemente a la derecha en {calle} y sigue {metros} metros' : 'Gira a la derecha en {calle} y sigue {metros} metros');
        texto = tp(clave, fallback, { calle, metros }) + colaSombra + '.';
      } else if (metros > 0) {
        texto = tp('stepContinue', 'Sigue por {calle} durante {metros} metros', { calle, metros }) + colaSombra + '.';
      }
      if (texto) {
        if (consejo && tipo !== 'arrive') texto += ' ' + consejo;
        pasos.push(texto);
        // Punto de la maniobra: donde empieza este paso, para la guía GPS.
        const puntoManiobra = Array.isArray(maniobra.location) ? maniobra.location
          : (coords.length ? coords[0] : null);
        if (puntoManiobra) guiados.push({ texto, punto: puntoManiobra, esLlegada: tipo === 'arrive' });
      }
    }
    // Si OSRM no cerró con "arrive", lo añadimos nosotros.
    const ultimo = pasos[pasos.length - 1] || '';
    if (!ultimo.startsWith(t('stepArrive', 'Has llegado').slice(0, 10))) {
      const textoLlegada = t('stepArrive', 'Has llegado a tu destino.');
      pasos.push(textoLlegada);
      const ultCoords = pasosOsrm[pasosOsrm.length - 1]?.geometry?.coordinates;
      const puntoFin = ultCoords?.length ? ultCoords[ultCoords.length - 1] : null;
      if (puntoFin) guiados.push({ texto: textoLlegada, punto: puntoFin, esLlegada: true });
    }
    return { pasos, guiados };
  }

  // Genera los polígonos de sombra proyectados por una lista de edificios.
  async function generarPoligonosSombraPara(listaEdificios, posSolActual) {
    if (!posSolActual || posSolActual.altitude <= 0) return [];
    const azimutGrados = (posSolActual.azimuth * 180) / Math.PI + 180;
    const bearingSombra = (azimutGrados + 180) % 360;
    const poligonos = [];
    for (const edificio of listaEdificios) {
      try {
        const altura = alturaDeEdificio(edificio.properties);
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
        console.debug('[Routing] Dijkstra térmico local no disponible, se recurre a OSRM:', e.message);
      }
    }

    try {
      const coords = `${origen.lon},${origen.lat};${destino.lon},${destino.lat}`;
      const url = `${CONFIG.osrmUrl}/foot/${coords}?overview=full&geometries=geojson&alternatives=true&steps=true`;
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
        pasos: (() => {
          try { return generarPasosDesdeOSRM(mejor.ruta, poligonosSombra).pasos; }
          catch (ePasos) { return []; }
        })(),
        pasosGuiados: (() => {
          try { return generarPasosDesdeOSRM(mejor.ruta, poligonosSombra).guiados; }
          catch (ePasos) { return []; }
        })(),
      };
    } catch (err) {
      console.debug('Routing con prioridad de sombra no disponible, usando ruta normal:', err);
      return calcularRutaReal(origen, destino);
    }
  }

  /* ---------------- Calidad del aire (Open-Meteo) ---------------- */

  async function obtenerCalidadAire(lat, lon) {
    // Caché de 10 min por zona (~1 km): la calidad del aire no cambia en
    // minutos y así mover el slider o recalcular la ruta no repite la llamada.
    const claveCache = `manolito_cache_aire_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cacheado = cacheLocalObtener(claveCache, CACHE_AIRE_TTL_MS);
    if (cacheado) return cacheado;

    const url = new URL(CONFIG.airQualityUrl, window.location.origin);
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('current', ['us_aqi', 'pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide'].join(','));
    url.searchParams.set('timezone', 'auto');

    const datos = await fetchConReintentos(url.toString());
    if (!datos || !datos.current) throw new Error('La API de calidad del aire no ha devuelto datos.');
    cacheLocalGuardar(claveCache, datos.current);
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

    marcadorDestino = new maplibregl.Marker({ element: pin(leerVar('--sky-deep') || '#0E3B47') })
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
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        return;
      }

      temporizador = setTimeout(async () => {
        if (controladorActual) controladorActual.abort();
        controladorActual = new AbortController();

        try {
          const url = new URL(CONFIG.nominatimUrl, window.location.origin);
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
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function resaltarActivo() {
      const items = contenedor.querySelectorAll('li[data-idx]');
      items.forEach((li, i) => {
        li.style.background = i === indiceActivo ? (leerVar('--accent') || '#09ffbd') + '22' : '';
        li.setAttribute('aria-selected', i === indiceActivo ? 'true' : 'false');
      });
      // Patrón combobox: el foco queda en el input y el lector de pantalla
      // sabe qué opción está activa por aria-activedescendant.
      if (indiceActivo >= 0 && items[indiceActivo]) {
        items[indiceActivo].scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', items[indiceActivo].id);
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function pintarSugerencias(resultados, textoOriginal) {
      ultimosResultados = [];
      if (!resultados || resultados.length === 0) {
        contenedor.innerHTML = `<li class="rs-sug-empty" role="option" aria-disabled="true">${t('noResults', 'Sin resultados')}</li>`;
        contenedor.style.display = 'block';
        input.setAttribute('aria-expanded', 'true');
        return;
      }

      resultados = reordenarPorCiudadEscrita(resultados, textoOriginal);
      ultimosResultados = resultados;
      indiceActivo = -1;

      contenedor.innerHTML = resultados
        .map((r, i) => {
          const ciudad = r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || '';
          const resto = r.display_name.split(',')[0];
          return `<li data-idx="${i}" id="${contenedorSugerenciasId}-opt-${i}" role="option" aria-selected="false">
            <span class="rs-sug-linea1">${resto}</span>
            <span class="rs-sug-linea2">${ciudad ? ciudad + ' — ' : ''}${r.address?.state || ''}</span>
          </li>`;
        })
        .join('');
      contenedor.style.display = 'block';
      input.setAttribute('aria-expanded', 'true');
      input.removeAttribute('aria-activedescendant');

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
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target !== input && !contenedor.contains(e.target)) {
        contenedor.style.display = 'none';
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
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
      console.debug(err);
      mostrarEstado(err.message || t('errorSearch', 'Error al buscar la ruta. Inténtalo de nuevo.'), 'error');
      ponerCargando(false);
    }
  }

  /* ---------------- Indicaciones paso a paso accesibles ---------------- */

  let pasosActuales = [];
  let pasosGuiadosActuales = []; // [{ texto, punto:[lon,lat], esLlegada? }]
  let lecturaEnCurso = false;

  /* ---- Guía por voz durante la caminata real (GPS) ----
     Al pulsar "Iniciar caminata" con una ruta calculada, la app va
     anunciando cada indicación en voz alta justo al acercarse al punto
     donde toca (giro, calle, sombra…), y avisa al llegar al destino.
     Pensado para quien camina sin poder mirar la pantalla. */
  let guiaCaminataActiva = false;
  let indicePasoGuiado = 0;

  function hablarPasoGuia(texto) {
    // Siempre se refleja en la región viva (los lectores de pantalla la
    // anuncian solos) y además suena en voz alta con la voz del dispositivo.
    const resumen = document.getElementById('rsLiveSummary');
    if (resumen) resumen.textContent = texto;
    if (!vozNavegadorDisponible()) return;
    try {
      const frase = new SpeechSynthesisUtterance(texto);
      frase.lang = (document.documentElement.lang || 'es').slice(0, 5);
      frase.rate = 1;
      window.speechSynthesis.speak(frase);
    } catch (e) { /* voz no disponible: queda el anuncio escrito */ }
  }

  function iniciarGuiaCaminata() {
    indicePasoGuiado = 0;
    guiaCaminataActiva = pasosGuiadosActuales.length > 0;
    if (!guiaCaminataActiva) return;
    hablarPasoGuia(t('walkGuidanceStart', 'Guía de caminata activada. Te iré diciendo cada paso en voz alta.') + ' ' + pasosGuiadosActuales[0].texto);
    indicePasoGuiado = 1;
  }

  function avanzarGuiaCaminata(lat, lon) {
    if (!guiaCaminataActiva || indicePasoGuiado >= pasosGuiadosActuales.length) return;
    try {
      const aqui = turf.point([lon, lat]);
      // Se busca el paso MÁS AVANZADO cuyo punto ya está al alcance: si el GPS
      // da un salto (o el usuario se adelanta), no se queda la guía atrás.
      let alcanzado = -1;
      for (let i = indicePasoGuiado; i < pasosGuiadosActuales.length; i++) {
        const paso = pasosGuiadosActuales[i];
        if (!paso || !paso.punto) continue;
        const umbral = paso.esLlegada ? 20 : 30;
        if (turf.distance(aqui, turf.point(paso.punto), { units: 'meters' }) <= umbral) alcanzado = i;
      }
      if (alcanzado < 0) return;
      const paso = pasosGuiadosActuales[alcanzado];
      hablarPasoGuia(paso.texto);
      indicePasoGuiado = alcanzado + 1;
      if (paso.esLlegada) guiaCaminataActiva = false;
    } catch (e) { /* geometría rara: se reintenta en la próxima lectura GPS */ }
  }

  function detenerGuiaCaminata() {
    guiaCaminataActiva = false;
    indicePasoGuiado = 0;
    if (vozNavegadorDisponible()) {
      try { window.speechSynthesis.cancel(); } catch (e) { }
    }
  }

  function vozNavegadorDisponible() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  function detenerLecturaPasos() {
    if (vozNavegadorDisponible()) {
      try { window.speechSynthesis.cancel(); } catch (e) { }
    }
    lecturaEnCurso = false;
    const btn = document.getElementById('rsBtnEscucharPasos');
    if (btn) {
      btn.textContent = t('stepsListen', 'Escuchar indicaciones');
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  function alternarLecturaPasos() {
    if (!vozNavegadorDisponible() || !pasosActuales.length) return;
    if (lecturaEnCurso) { detenerLecturaPasos(); return; }
    const btn = document.getElementById('rsBtnEscucharPasos');
    lecturaEnCurso = true;
    if (btn) {
      btn.textContent = t('stepsStop', 'Detener lectura');
      btn.setAttribute('aria-pressed', 'true');
    }
    const idioma = (document.documentElement.lang || 'es').slice(0, 5);
    const textos = [];
    if (resumenRutaAccesible) textos.push(resumenRutaAccesible);
    textos.push(...pasosActuales);
    let restantes = textos.length;
    for (const texto of textos) {
      const frase = new SpeechSynthesisUtterance(texto);
      frase.lang = idioma;
      frase.rate = 0.95;
      frase.onend = () => {
        restantes -= 1;
        if (restantes <= 0) detenerLecturaPasos();
      };
      frase.onerror = frase.onend;
      window.speechSynthesis.speak(frase);
    }
  }

  function renderizarPasosAccesibles(pasos, guiados) {
    pasosActuales = Array.isArray(pasos) ? pasos : [];
    pasosGuiadosActuales = Array.isArray(guiados) ? guiados : [];
    detenerGuiaCaminata();
    detenerLecturaPasos();
    const seccion = document.getElementById('rsPasosSection');
    const lista = document.getElementById('rsListaPasos');
    if (!seccion || !lista) return;
    lista.innerHTML = '';
    if (!pasosActuales.length) {
      seccion.hidden = true;
      return;
    }
    for (const texto of pasosActuales) {
      const li = document.createElement('li');
      li.textContent = texto;
      lista.appendChild(li);
    }
    const btn = document.getElementById('rsBtnEscucharPasos');
    if (btn) btn.hidden = !vozNavegadorDisponible();
    seccion.hidden = false;

    // Las indicaciones son OPCIONALES: la sección aparece plegada y quien
    // quiera leerla o escucharla la despliega con el botón. Solo se abre
    // sola con el modo accesible activado (ahí es información esencial).
    const cabecera = seccion.querySelector('.rs-pasos-cabecera');
    let btnPlegar = document.getElementById('rsBtnPlegarPasos');
    if (!btnPlegar && cabecera) {
      btnPlegar = document.createElement('button');
      btnPlegar.type = 'button';
      btnPlegar.id = 'rsBtnPlegarPasos';
      btnPlegar.className = 'rs-btn-escuchar';
      cabecera.insertBefore(btnPlegar, cabecera.firstChild);
      btnPlegar.addEventListener('click', () => {
        fijarPasosPlegados(lista.style.display === 'none');
      });
    }
    const fijarPasosPlegados = (abierto) => {
      lista.style.display = abierto ? '' : 'none';
      if (btn) btn.style.display = abierto ? '' : 'none';
      if (btnPlegar) {
        btnPlegar.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        btnPlegar.textContent = abierto
          ? ('▾ ' + t('stepsHide', 'Ocultar indicaciones'))
          : ('▸ ' + t('stepsShow', 'Ver indicaciones'));
      }
    };
    fijarPasosPlegados(document.body.classList.contains('modo-accesible'));
  }

  function ocultarPasosAccesibles() {
    pasosActuales = [];
    pasosGuiadosActuales = [];
    detenerGuiaCaminata();
    detenerLecturaPasos();
    const seccion = document.getElementById('rsPasosSection');
    if (seccion) seccion.hidden = true;
  }

  document.addEventListener('langChanged', () => {
    const btn = document.getElementById('rsBtnEscucharPasos');
    if (btn) btn.textContent = lecturaEnCurso ? t('stepsStop', 'Detener lectura') : t('stepsListen', 'Escuchar indicaciones');
    const titulo = document.getElementById('rsPasosTitulo');
    if (titulo) titulo.textContent = t('stepsTitle', 'Indicaciones paso a paso');
  });

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
        const resumenRuta = `${t('routeReal', 'Ruta real')}: ${ruta.distanciaKm} km · ${ruta.duracionMin} ${t('minWalk', 'min a pie')}${nota}${notaSombra}.`;
        mostrarEstado(resumenRuta, 'ok');
        resumenRutaAccesible = resumenRuta;
        actualizarResumenAccesible();
        mostrarBadgeSombra(ruta.coberturaSombraPct);
        renderizarPasosAccesibles(ruta.pasos || [], ruta.pasosGuiados || []);
      } else {
        mostrarEstado(t('routeFallback', 'No se pudo calcular la ruta por calles (servidor de rutas ocupado) — mostrando línea directa.'), 'error');
        mostrarBadgeSombra(null);
        ocultarPasosAccesibles();
      }

      try {
        const aire = await obtenerCalidadAire(origen.lat, origen.lon);
        pintarPanelAQI(aire);
      } catch (errAire) {
        console.debug(errAire);
        mostrarEstado(t('airDataUnavailable', 'No se ha podido cargar la calidad del aire ahora mismo (demasiadas peticiones). Prueba de nuevo en unos segundos.'), 'error');
      }
    } catch (err) {
      console.debug(err);
      ocultarPasosAccesibles();
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
  const btnEscucharPasos = document.getElementById('rsBtnEscucharPasos');
  if (btnEscucharPasos) btnEscucharPasos.addEventListener('click', alternarLecturaPasos);
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
    if (btnDark){
      const webOscura = document.documentElement.getAttribute('data-theme') === 'dark';
      const efectivoOscuro = webOscura ? !mapaOscuro : mapaOscuro;
      btnDark.textContent = efectivoOscuro ? t('darkMapOff', 'Mapa claro') : t('darkMapOn', 'Mapa oscuro');
    }
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

  /* ============================================================
     v6 — MODO OTOÑO/INVIERNO: «RUTA DE SOL» (Dijkstra inverso)
     ------------------------------------------------------------
     En verano el motor térmico de más arriba penaliza las aristas
     EXPUESTAS AL SOL para darte el camino más fresco. Este bloque
     hace exactamente lo contrario: penaliza las aristas EN SOMBRA,
     para que en otoño/invierno la ruta busque el sol (luz y calor
     radiante cuando apetece).

     100% ADITIVO — no se ha tocado ni una línea del código de
     siempre:
     - Los cálculos de aquí son la VERSIÓN INVERSA de los
       originales (misma red peatonal, mismo grafo, mismo MinHeap).
     - Al final se ENVUELVE calcularRutaConPrioridadSombra
       guardando antes la referencia original: con el modo
       apagado, TODO funciona exactamente igual que antes.
     - Si el Dijkstra solar no puede (sin red local, de noche...),
       se recurre a la ruta real normal (la corta de siempre).
     ============================================================ */

  // Penalización INVERSA: lo que cuesta es la SOMBRA.
  // Misma magnitud que la penalización solar del verano (así el
  // algoritmo es igual de estable en ambos modos) y mismo efecto
  // de la nubosidad: con el cielo cubierto la sombra importa menos.
  function calcularPenalizacionSombra(puntoMedio, posSol) {
    if (!posSol || posSol.altitude <= 0) return 0; // de noche no hay sol que buscar
    let enSombra = false;
    try {
      const sombras = typeof obtenerTodasLasSombras === 'function'
        ? obtenerTodasLasSombras()
        : ((typeof ultimaColeccionSombras !== 'undefined' && ultimaColeccionSombras && ultimaColeccionSombras.features) ? ultimaColeccionSombras.features : []);
      for (const poligono of sombras) {
        if (turf.booleanPointInPolygon(turf.point(puntoMedio), poligono)) { enSombra = true; break; }
      }
    } catch (e) { /* sin sombras calculadas todavía: todo cuenta como soleado */ }
    if (!enSombra) return 0; // al sol, la arista no penaliza
    const intensidad = Math.max(0, Math.sin(posSol.altitude));
    const factorSolNubes = 1 - (typeof nubosidadActual !== 'undefined' ? nubosidadActual : 0) * 0.85;
    return CONFIG.factorPenalizacionSol * intensidad * factorSolNubes;
  }

  // Dijkstra inverso: idéntico al térmico, pero pesando con la
  // penalización por SOMBRA de arriba.
  function dijkstraSolar(grafo, inicioIdx, finIdx, posSol) {
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
        const penalizacion = calcularPenalizacionSombra(puntoMedio, posSol);
        const peso = arista.longitudM * (1 + penalizacion);

        const nuevaDist = dist[u] + peso;
        if (nuevaDist < dist[v]) {
          dist[v] = nuevaDist;
          prev[v] = u;
          heap.push({ nodo: v, dist: nuevaDist });
        }
      }
    }

    if (dist[finIdx] === Infinity) return { camino: [], caminoIdx: [], costeSolarM: Infinity };

    const camino = [];
    const caminoIdx = [];
    for (let at = finIdx; at !== -1; at = prev[at]) {
      camino.push(grafo.nodos[at]);
      caminoIdx.push(at);
    }
    camino.reverse();
    caminoIdx.reverse();
    return { camino, caminoIdx, costeSolarM: dist[finIdx] };
  }

  async function calcularRutaDijkstraSolar(origen, destino) {
    const t0 = performance.now();

    const lineaOD = turf.lineString([[origen.lon, origen.lat], [destino.lon, destino.lat]]);
    const bboxBase = turf.bboxPolygon(turf.bbox(lineaOD));
    const bboxAmpliado = turf.bbox(turf.buffer(bboxBase, CONFIG.redPeatonalMargenM, { units: 'meters' }));
    const redCompleta = await obtenerRedPeatonal(bboxAmpliado, [origen, destino]);
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

    const resultado = dijkstraSolar(grafo, inicioIdx, finIdx, posSol);
    if (resultado.camino.length < 2) throw new Error('Dijkstra solar no ha encontrado camino');

    const distanciaRealKm = turf.length(turf.lineString(resultado.camino), { units: 'kilometers' });
    const duracionMin = (distanciaRealKm / CONFIG.velocidadCaminandoKmh) * 60;

    let coberturaSombraPct = null;
    const sombrasParaCobertura = typeof obtenerTodasLasSombras === 'function'
      ? obtenerTodasLasSombras()
      : (ultimaColeccionSombras?.features || []);
    if (sombrasParaCobertura.length) {
      try {
        const lineaRuta = turf.lineString(resultado.camino);
        coberturaSombraPct = Math.round(calcularCoberturaSombra(lineaRuta, sombrasParaCobertura) * 100);
      } catch (e) { /* el badge se actualizará después con los tramos en sombra */ }
    }

    console.log(`[Dijkstra solar] ${resultado.camino.length} nodos · coste ${resultado.costeSolarM.toFixed(1)} m · ${(performance.now() - t0).toFixed(2)} ms`);

    let pasos = [];
    let pasosGuiados = [];
    try {
      const generados = generarPasosDesdeGrafo(grafo, resultado.caminoIdx, sombrasParaCobertura);
      pasos = generados.pasos;
      pasosGuiados = generados.guiados;
    } catch (e) {
      console.debug('No se han podido generar las indicaciones de la ruta de sol:', e);
    }

    return {
      geojson: { type: 'LineString', coordinates: resultado.camino },
      distanciaKm: distanciaRealKm.toFixed(2),
      duracionMin: Math.round(duracionMin),
      esReal: true,
      duracionEstimada: true,
      // OJO: en modo invierno este % debe salir BAJO — es la parte
      // del paseo que queda a la sombra (el panel ya lo muestra).
      coberturaSombraPct,
      esDijkstraSolar: true,
      esRutaSolar: true,
      pasos,
      pasosGuiados,
    };
  }

  // ---- Interruptor «Modo invierno: ruta por el sol» ----
  // Se inyecta al final del formulario de ruta (junto a «Buscar
  // ruta») sin tocar el HTML ni el código de búsqueda existente.
  let modoInviernoRuta = false;

  function inyectarToggleRutaSol() {
    const form = document.querySelector('.rs-form');
    if (!form || document.getElementById('rsToggleRutaSol')) return;

    if (!document.getElementById('rsToggleRutaSolEstilos')) {
      const estilo = document.createElement('style');
      estilo.id = 'rsToggleRutaSolEstilos';
      estilo.textContent = [
        '.rs-toggle-invierno{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:0.92em;cursor:pointer;user-select:none;}',
        '.rs-toggle-invierno.rs-invierno-activo{color:#d98a00;font-weight:600;}'
      ].join('\n');
      document.head.appendChild(estilo);
    }

    const etiqueta = document.createElement('label');
    etiqueta.className = 'rs-toggle-invierno';
    const caja = document.createElement('input');
    caja.type = 'checkbox';
    caja.id = 'rsToggleRutaSol';
    const texto = document.createElement('span');
    texto.textContent = t('winterSunRoute', '☀️ Modo invierno: ruta por el sol');
    etiqueta.append(caja, texto);
    form.appendChild(etiqueta);

    caja.addEventListener('change', () => {
      modoInviernoRuta = caja.checked;
      etiqueta.classList.toggle('rs-invierno-activo', modoInviernoRuta);
      mostrarEstado(modoInviernoRuta
        ? t('winterModeOn', '☀️ Modo invierno activado: la próxima ruta buscará el sol (los tramos en sombra pesan más).')
        : t('winterModeOff', 'Modo invierno desactivado: las rutas vuelven a buscar la sombra.'), 'ok');
    });

    document.addEventListener('langChanged', () => {
      texto.textContent = t('winterSunRoute', '☀️ Modo invierno: ruta por el sol');
    });
  }
  inyectarToggleRutaSol();

  // Puente ADITIVO: envolvemos la función de enrutado de siempre.
  // Con el modo apagado delega tal cual; con el modo encendido
  // intenta primero el Dijkstra solar y, si no es posible, cae a
  // la ruta real normal (NUNCA a la de sombra: no tendría sentido
  // en invierno).
  const calcularRutaConPrioridadSombraOriginal = calcularRutaConPrioridadSombra;
  calcularRutaConPrioridadSombra = async function (origen, destino) {
    if (!modoInviernoRuta) return calcularRutaConPrioridadSombraOriginal(origen, destino);
    try {
      return await calcularRutaDijkstraSolar(origen, destino);
    } catch (e) {
      console.debug('[Modo invierno] Dijkstra solar no disponible; se usa la ruta real normal:', e && e.message);
      return calcularRutaReal(origen, destino);
    }
  };


  /* ============================================================
     ALTURAS OFICIALES DEL CATASTRO — sombras con la altura real
     ------------------------------------------------------------
     El ~90% de los edificios de OSM no trae altura ni plantas
     (comprobado en Carretera de Carmona: 232 de 249 sin dato),
     así que caían a la altura por defecto y su sombra salía
     demasiado corta: calles que a media tarde están tapadas por
     los bloques aparecían al sol. El Catastro publica GRATIS y
     SIN CLAVE las plantas reales de cada edificio (WFS INSPIRE
     bu:BuildingPart → numberOfFloorsAboveGround) con CORS
     abierto, así que el navegador lo consulta directo, sin
     proxy y sin tocar el Worker.

     Cómo encaja: cuando una parte de edificio del Catastro
     contiene el centroide de un edificio del mapa, se escribe
     su altura oficial (plantas × alturaPorPlantaM) en
     properties.height, que es lo PRIMERO que mira
     alturaDeEdificio: todo el motor (sombras de suelo y
     fachadas oscurecidas) pasa a usar el dato real del Estado
     sin tocar una sola línea anterior. Si el Catastro no cubre
     la zona o la red falla, no cambia nada: sigue la cadena de
     siempre (altura OSM → plantas OSM → altura por defecto).
     ============================================================ */
  if (!window.__manolitoCatastroAlturas) {
    window.__manolitoCatastroAlturas = true;

    const CATASTRO = {
      celdaGrados: 0.006,       // ~600 m: la zona que se pide de una vez
      maxCeldasPorPasada: 3,    // no saturar: como mucho 3 celdas nuevas por parada
      zoomMinimo: 14,           // de lejos la sombra apenas se aprecia: no gastar datos
      ttlLocalMs: 30 * 24 * 60 * 60 * 1000, // el Catastro cambia muy despacio
      ttlErrorMs: 10 * 60 * 1000,           // si una celda falla, se reintenta a los 10 min
      plantaM: CONFIG.alturaPorPlantaM,     // 3.2 m por planta, como el resto del motor
      celdaRejilla: 0.001,      // rejilla fina (~110 m) para casar edificio ↔ parte
    };
    const celdasCatastro = new Map();  // clave -> { t, estado: 'ok'|'vacia'|'error'|'cargando' }
    const partesCatastro = [];         // { ring: [[lon,lat],...], alturaM }
    const rejillaCatastro = new Map(); // "cx:cy" (0.001°) -> array de índices de partesCatastro

    function claveCeldaCatastro(lat, lon) {
      return Math.floor(lat / CATASTRO.celdaGrados) + 'x' + Math.floor(lon / CATASTRO.celdaGrados);
    }
    function claveRejillaCatastro(lat, lon) {
      return Math.floor(lat / CATASTRO.celdaRejilla) + ':' + Math.floor(lon / CATASTRO.celdaRejilla);
    }

    function registrarParteCatastro(ring, alturaM) {
      if (!ring || ring.length < 4 || !(alturaM > 0)) return;
      const indice = partesCatastro.length;
      partesCatastro.push({ ring, alturaM });
      let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const p of ring) {
        if (p[0] < minLon) minLon = p[0]; if (p[0] > maxLon) maxLon = p[0];
        if (p[1] < minLat) minLat = p[1]; if (p[1] > maxLat) maxLat = p[1];
      }
      for (let cy = Math.floor(minLat / CATASTRO.celdaRejilla); cy <= Math.floor(maxLat / CATASTRO.celdaRejilla); cy++) {
        for (let cx = Math.floor(minLon / CATASTRO.celdaRejilla); cx <= Math.floor(maxLon / CATASTRO.celdaRejilla); cx++) {
          const clave = cy + ':' + cx;
          let lista = rejillaCatastro.get(clave);
          if (!lista) { lista = []; rejillaCatastro.set(clave, lista); }
          lista.push(indice);
        }
      }
    }

    // Ray casting clásico: ¿está el punto dentro del anillo?
    function puntoEnAnilloCatastro(lon, lat, ring) {
      let dentro = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
        if (((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) dentro = !dentro;
      }
      return dentro;
    }

    // Altura oficial (m) en un punto: la parte del Catastro con más
    // plantas que contiene el punto. 0 = sin dato oficial aquí.
    function alturaOficialEn(lon, lat) {
      const lista = rejillaCatastro.get(claveRejillaCatastro(lat, lon));
      if (!lista) return 0;
      let mejor = 0;
      for (const indice of lista) {
        const parte = partesCatastro[indice];
        if (parte.alturaM > mejor && puntoEnAnilloCatastro(lon, lat, parte.ring)) mejor = parte.alturaM;
      }
      return mejor;
    }

    // Escribe la altura oficial en properties.height de cada edificio
    // cacheado cuyo centro cae dentro de una parte del Catastro. Como
    // alturaDeEdificio mira props.height antes que nada, el motor
    // entero (sombra de suelo + fachadas) usa el dato real al instante.
    function aplicarAlturasCatastroACache(recalcular) {
      if (!partesCatastro.length || !edificiosCacheados.length) return 0;
      let cambiados = 0;
      for (const edificio of edificiosCacheados) {
        try {
          const props = edificio.properties || (edificio.properties = {});
          if (props._alturaCatastroOK) continue;
          const anillo = edificio.geometry && edificio.geometry.coordinates && edificio.geometry.coordinates[0];
          if (!anillo || anillo.length < 4) continue;
          let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
          for (const p of anillo) {
            if (p[0] < minLon) minLon = p[0]; if (p[0] > maxLon) maxLon = p[0];
            if (p[1] < minLat) minLat = p[1]; if (p[1] > maxLat) maxLat = p[1];
          }
          const alturaM = alturaOficialEn((minLon + maxLon) / 2, (minLat + maxLat) / 2);
          if (alturaM > 0) {
            props.height = alturaM;      // el Catastro manda: es el dato oficial del Estado
            props._alturaCatastroOK = 1; // no volver a procesar este edificio
            cambiados++;
          }
        } catch (e) { continue; }
      }
      if (cambiados > 0 && recalcular && document.getElementById('rsToggleSombras')?.checked) {
        recalcularSombrasVisibles();
      }
      return cambiados;
    }

    // El GML del Catastro es muy regular: cada <bu-ext2d:BuildingPart>
    // trae sus anillos exteriores (posList "lat lon lat lon ...") y sus
    // plantas. Se extrae con expresiones regulares acotadas, sin parser
    // XML pesado; si un trozo no encaja, simplemente se salta.
    function parsearGmlCatastro(texto) {
      let registradas = 0;
      if (!texto || texto.indexOf('BuildingPart') === -1) return 0;
      const trozos = texto.split('<bu-ext2d:BuildingPart');
      for (let i = 1; i < trozos.length; i++) {
        try {
          const trozo = trozos[i];
          const mPlantas = trozo.match(/numberOfFloorsAboveGround[^>]*>\s*(\d+)/);
          if (!mPlantas) continue;
          const plantas = parseInt(mPlantas[1], 10);
          if (!(plantas > 0)) continue;
          const alturaM = plantas * CATASTRO.plantaM;
          const reAnillos = /<gml:exterior>[\s\S]*?<gml:posList[^>]*>([^<]+)<\/gml:posList>/g;
          let mAnillo;
          while ((mAnillo = reAnillos.exec(trozo)) !== null) {
            const numeros = mAnillo[1].trim().split(/\s+/).map(Number);
            const ring = [];
            for (let k = 0; k + 1 < numeros.length; k += 2) {
              if (isFinite(numeros[k]) && isFinite(numeros[k + 1])) ring.push([numeros[k + 1], numeros[k]]); // [lon, lat]
            }
            if (ring.length >= 4) { registrarParteCatastro(ring, alturaM); registradas++; }
          }
        } catch (e) { continue; }
      }
      return registradas;
    }

    function guardarCeldaCatastro(clave, alturasYRings) {
      try {
        localStorage.setItem('manolito_catastro_v1_' + clave,
          JSON.stringify({ t: Date.now(), p: alturasYRings }));
      } catch (e) { /* cuota llena: se vuelve a pedir otra vez, sin drama */ }
    }

    function cargarCeldaCatastroLocal(clave) {
      try {
        const crudo = localStorage.getItem('manolito_catastro_v1_' + clave);
        if (!crudo) return false;
        const datos = JSON.parse(crudo);
        if (!datos || !datos.t || Date.now() - datos.t > CATASTRO.ttlLocalMs) return false;
        let n = 0;
        for (const par of datos.p || []) {
          if (par && par[1] && par[1].length >= 4) { registrarParteCatastro(par[1], par[0]); n++; }
        }
        celdasCatastro.set(clave, { t: Date.now(), estado: n ? 'ok' : 'vacia' });
        return true;
      } catch (e) { return false; }
    }

    async function descargarCeldaCatastro(clave, s, w, n, e) {
      const previa = celdasCatastro.get(clave);
      if (previa && (previa.estado === 'ok' || previa.estado === 'vacia' || previa.estado === 'cargando')) return false;
      if (previa && previa.estado === 'error' && Date.now() - previa.t < CATASTRO.ttlErrorMs) return false;
      if (cargarCeldaCatastroLocal(clave)) return true;
      celdasCatastro.set(clave, { t: Date.now(), estado: 'cargando' });
      try {
        const url = 'https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=wfs&version=2&request=getfeature'
          + '&typenames=bu:BuildingPart&srsname=EPSG:4326'
          + '&BBOX=' + s.toFixed(6) + ',' + w.toFixed(6) + ',' + n.toFixed(6) + ',' + e.toFixed(6);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const texto = await resp.text();
        const antes = partesCatastro.length;
        parsearGmlCatastro(texto);
        const nuevas = partesCatastro.length - antes;
        // Guardado local compacto (solo altura + anillos), para no repetir
        // la descarga al volver a la misma zona otro día.
        const compacto = [];
        for (let i = antes; i < partesCatastro.length; i++) {
          compacto.push([partesCatastro[i].alturaM, partesCatastro[i].ring]);
        }
        guardarCeldaCatastro(clave, compacto);
        celdasCatastro.set(clave, { t: Date.now(), estado: nuevas ? 'ok' : 'vacia' });
        return nuevas > 0;
      } catch (e) {
        celdasCatastro.set(clave, { t: Date.now(), estado: 'error' });
        return false;
      }
    }

    let catastroTemporizador = null;
    function programarCatastro() {
      clearTimeout(catastroTemporizador);
      catastroTemporizador = setTimeout(async () => {
        try {
          if (!map || !map.getBounds || map.getZoom() < CATASTRO.zoomMinimo) return;
          const vista = map.getBounds();
          const filas = [];
          for (let cy = Math.floor(vista.getSouth() / CATASTRO.celdaGrados); cy <= Math.floor(vista.getNorth() / CATASTRO.celdaGrados); cy++) {
            for (let cx = Math.floor(vista.getWest() / CATASTRO.celdaGrados); cx <= Math.floor(vista.getEast() / CATASTRO.celdaGrados); cx++) {
              filas.push([cy, cx]);
            }
          }
          if (filas.length > 9) return; // vista enorme: no gastar datos
          let pedidas = 0, llegaronDatos = false;
          for (const [cy, cx] of filas) {
            if (pedidas >= CATASTRO.maxCeldasPorPasada) break;
            const clave = cy + 'x' + cx;
            const previa = celdasCatastro.get(clave);
            if (previa && previa.estado !== 'error') continue;
            pedidas++;
            const s = cy * CATASTRO.celdaGrados, n = s + CATASTRO.celdaGrados;
            const w = cx * CATASTRO.celdaGrados, e = w + CATASTRO.celdaGrados;
            if (await descargarCeldaCatastro(clave, s, w, n, e)) llegaronDatos = true;
          }
          // Siempre que haya partes disponibles (nuevas o ya en memoria)
          // se repasa la caché: los edificios recién entrados en pantalla
          // también reciben su altura oficial.
          if (partesCatastro.length) aplicarAlturasCatastroACache(true);
          void llegaronDatos;
        } catch (e) { /* nunca ensuciar la consola: a la próxima parada se reintenta */ }
      }, 700);
    }

    // Puente aditivo: cada vez que el motor refresca su caché de
    // edificios, se les aplican las alturas oficiales ya descargadas
    // (instantáneo, sin red). Si aún no hay partes de la zona, no pasa
    // nada y quedan con la altura de siempre hasta que lleguen.
    const actualizarCacheEdificiosBase = actualizarCacheEdificios;
    actualizarCacheEdificios = function () {
      actualizarCacheEdificiosBase();
      try { aplicarAlturasCatastroACache(false); } catch (e) { /* sin Catastro: como antes */ }
    };

    map.on('moveend', programarCatastro);
    map.once('idle', programarCatastro);
    programarCatastro();
  }



  // Helper reutilizable para esperar a que los elementos del DOM aparezcan y
  // poder inyectar controles adicionales (footer, botones del mapa, etc.) sin
  // depender de una carga concreta en un bloque concreto del archivo.
  function cuandoExista(selector, cb, intentos = 0) {
    const el = document.querySelector(selector);
    if (el) { cb(el); return; }
    if (intentos < 40) setTimeout(() => cuandoExista(selector, cb, intentos + 1), 250);
  }

  /* ============================================================
     LA FLECHA MANOLIT — puntero caminante que avanza contigo
     ------------------------------------------------------------
     La figura del logo (cabeza dorada, ojos teal, corazón vino)
     con piernas y brazos articulados. Aparece en el mapa cuando:
       · pulsas MI UBICACIÓN (se planta donde estás),
       · pulsas INICIAR CAMINATA (camina contigo por GPS en vivo),
       · pulsas PASEO VIRTUAL 3D (camina con tu avatar virtual).
     El paso se anima por DISTANCIA recorrida, no por tiempo:
     si te paras, las piernas se paran. 100% aditivo: escucha los
     botones que ya existen y NO toca la lógica anterior. El punto
     azul de precisión de siempre sigue ahí debajo, intacto.
     Detalle técnico: pitchAlignment 'viewport' (no 'map') para que
     la figura se vea de pie en pantalla aunque el mapa esté muy
     inclinado; el rumbo sí sigue al mapa (rotationAlignment 'map').
     ============================================================ */
  if (!window.__manolitWalkerIntegrado) {
    window.__manolitWalkerIntegrado = true;

    class ManolitWalker {
      // Manolit va SIEMPRE derecho (como un muñeco de pie), nunca tumbado.
      // Para mirar a izquierda/derecha se usa un espejo scaleX, no una
      // rotación en el plano: así la figura no se "dobla" nunca.
      constructor(opts = {}) {
        this.size = opts.size ?? 48;
        this.strideMeters = opts.strideMeters ?? 1.4;
        this.maxLegSwing = opts.maxLegSwing ?? 24;
        this.maxArmSwing = opts.maxArmSwing ?? 14;
        this.colors = {
          gold: opts.gold ?? '#E6A100',
          teal: opts.teal ?? '#007A87',
          wine: opts.wine ?? '#7A0016',
        };
        this._reduced = false;
        try {
          this._reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) { this._reduced = false; }
        this._distanceAccum = 0;
        this._frasesAndaluz = [
'¡Ojú, compare, con esta flama esto no tira ni empujando!',
  '¡Qué sofocón, miarma, a estas horas no rinde ni el apuntador!',
  '¡Mira qué aplastamiento, esto no hay cuerpo que lo aguante!',
  '¡Anda ya, que con esta solana lo que pega es una cerveza y no estar aquí pringando!',
  '¡Qué mal se mueve esto, chiquillo, está aplatanao perdío con la calor!',
  '¡Vaya, esto va a pedales, no hay aire acondicionado que lo salve!'
        ];
        this._lastLngLat = null;
        this._moving = false;
        this._ultimoMovMs = Date.now();
        this._idleTimer = null;
        this._onda = { x: 0, y: 0 };
        this._ondaRaf = null;
        this._mirando = 1; // 1 = derecha, -1 = izquierda (espejo)
        this._sentado = false;
        this._saludando = false;
        this._explorando = false;
        this._caprichoTimer = null;
        ManolitWalker._inyectarEstilos();
        this._buildElement();
        this._tick();
      }
      get element() { return this._el; }
      update(lngLat, dxPantalla) {
        if (this._lastLngLat) {
          const dist = ManolitWalker._haversine(this._lastLngLat, lngLat);
          if (dist > 0.05) this._distanceAccum += dist;
        }
        if (typeof dxPantalla === 'number' && Math.abs(dxPantalla) > 0.5) {
          this._mirando = dxPantalla > 0 ? 1 : -1;
        }
        this._lastLngLat = lngLat;
        this._markMoving();
      }
      setIdle() { this._distanceAccum = 0; }
      stopWalkingRoute() {
        if (this._ondaRaf) { cancelAnimationFrame(this._ondaRaf); this._ondaRaf = null; }
      }
      destroy() {
        this.stopWalkingRoute();
        if (this._idleTimer) clearTimeout(this._idleTimer);
        if (this._caprichoTimer) clearTimeout(this._caprichoTimer);
        this._explorando = false;
        this._el.remove();
      }
      _markMoving() {
        this._moving = true;
        this._ultimoMovMs = Date.now();
        clearTimeout(this._idleTimer);
        this._idleTimer = setTimeout(() => { this._moving = false; }, 900);
        // Si estaba de capricho por el mapa, vuelve corriendo a tu punto y saluda.
        if (this._explorando) this._volverATuPunto();
      }
      _decirFraseAndaluza() {
        try {
          if (!('speechSynthesis' in window)) return;
          const frase = new SpeechSynthesisUtterance(
            this._frasesAndaluz[Math.floor(Math.random() * this._frasesAndaluz.length)]
          );
          frase.lang = 'es-ES';
          frase.rate = 0.96;
          frase.pitch = 1.08;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(frase);
        } catch (e) { /* si no hay voz disponible, no rompe la app */ }
      }
      _bindClickSpeech() {
        if (!this._el || this._el.dataset.manolitClickBound) return;
        this._el.dataset.manolitClickBound = '1';
        this._el.style.cursor = 'pointer';
        this._el.style.userSelect = 'none';
        this._el.style.pointerEvents = 'auto';
        this._el.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this._decirFraseAndaluza();
        });
      }
      _bindClickSpeechToMarker(marker) {
        if (!marker || !marker.getElement) return;
        const root = marker.getElement();
        if (!root || root.dataset.manolitMarkerBound) return;
        root.dataset.manolitMarkerBound = '1';
        root.style.cursor = 'pointer';
        root.style.pointerEvents = 'auto';
        root.style.zIndex = '999';
        root.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this._decirFraseAndaluza();
        });
      }
      _tick() {
        const paso = () => {
          const now = Date.now();
          if (this._moving) this._ultimoMovMs = now;
          else if (!this._reduced && !this._explorando && now - this._ultimoMovMs > 10000) {
            // Llevas 10 s parado: Manolit se aburre y empieza su vida.
            this._explorando = true;
            this._capricho();
          }
          this._applyPose();
          this._tickTimer = setTimeout(paso, 66);
        };
        paso();
      }
      _capricho() {
        if (!this._explorando || this._moving) return;
        const r = Math.random();
        if (r < 0.55) {
          // Paseíto por los alrededores de tu punto (sin salirse de cerca).
          const tx = (Math.random() * 60 - 30);
          const ty = (Math.random() * 32 - 16);
          this._irCaminandoPx(tx, ty, () => {
            if (Math.random() < 0.4) this._saluda();
            if (this._explorando && !this._moving) {
              this._caprichoTimer = setTimeout(() => this._capricho(), 1800 + Math.random() * 2200);
            }
          });
        } else if (r < 0.8) {
          // Se sienta un rato a descansar.
          this._sentado = true;
          this._caprichoTimer = setTimeout(() => {
            this._sentado = false;
            if (this._explorando && !this._moving) {
              this._caprichoTimer = setTimeout(() => this._capricho(), 1800 + Math.random() * 2200);
            }
          }, 3200 + Math.random() * 2200);
        } else {
          this._saluda();
          this._caprichoTimer = setTimeout(() => this._capricho(), 2600 + Math.random() * 2000);
        }
      }
      _volverATuPunto() {
        this._explorando = false;
        if (this._caprichoTimer) { clearTimeout(this._caprichoTimer); this._caprichoTimer = null; }
        this._sentado = false;
        this._irCaminandoPx(0, 0, () => { this._saluda(); }, true);
      }
      // Caminata suavizada hasta un desplazamiento en píxeles respecto a tu punto.
      _irCaminandoPx(tx, ty, alLlegar, rapido) {
        this.stopWalkingRoute();
        if (this._reduced) {
          this._onda = { x: tx, y: ty };
          if (alLlegar) alLlegar();
          return;
        }
        const sx = this._onda.x, sy = this._onda.y;
        const dx = tx - sx, dy = ty - sy;
        const distancia = Math.hypot(dx, dy);
        if (distancia < 1) { if (alLlegar) alLlegar(); return; }
        this._mirando = dx >= 0 ? 1 : -1;
        const velocidad = rapido ? 90 : 42; // px por segundo
        const duracion = (distancia / velocidad) * 1000;
        const t0 = performance.now();
        const frame = (t) => {
          if (!this._explorando && !rapido) return; // interrumpido: manda _volverATuPunto
          let p = (t - t0) / duracion;
          if (p >= 1) p = 1;
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease in-out
          this._onda = { x: sx + dx * e, y: sy + dy * e };
          // Las piernas también avanzan con este paseíto.
          this._distanceAccum += (distancia * (e - (frame._e || 0))) * (this.strideMeters / 26);
          frame._e = e;
          if (p < 1) this._ondaRaf = requestAnimationFrame(frame);
          else {
            this._ondaRaf = null;
            frame._e = 0;
            if (alLlegar) alLlegar();
          }
        };
        frame._e = 0;
        this._ondaRaf = requestAnimationFrame(frame);
      }
      _saluda() {
        if (this._reduced || this._saludando || !this._armWave) return;
        this._saludando = true;
        this._armWave.classList.add('waving');
        const fin = () => {
          this._armWave.classList.remove('waving');
          this._saludando = false;
          this._armWave.removeEventListener('animationend', fin);
        };
        this._armWave.addEventListener('animationend', fin);
      }
      _applyPose() {
        const phase = (this._distanceAccum / this.strideMeters) * Math.PI * 2;
        const legPhase = Math.sin(phase);
        if (this._sentado) {
          // Pose de sentado: piernas recogidas y cuerpo bajado.
          this._legL.style.transform = 'rotate(70deg)';
          this._legR.style.transform = 'rotate(-70deg)';
          this._body.style.transform = 'translateY(5px)';
          this._armR.style.transform = 'rotate(-12deg)';
          if (!this._saludando) this._armWave.style.transform = 'rotate(12deg)';
        } else {
          const legAngle = legPhase * this.maxLegSwing;
          const armAngle = legPhase * this.maxArmSwing;
          this._legL.style.transform = `rotate(${legAngle}deg)`;
          this._legR.style.transform = `rotate(${-legAngle}deg)`;
          this._armR.style.transform = `rotate(${-armAngle}deg)`;
          if (!this._saludando) this._armWave.style.transform = `rotate(${armAngle}deg)`;
          const bob = Math.abs(legPhase) * 2.2;
          this._body.style.transform = `translateY(${-bob}px)`;
        }
        // OJO: el transform del elemento raíz lo ESCRIBE MapLibre para
        // colocar el marcador en el mapa. Jamás se toca desde aquí.
        // Espejo para mirar a izquierda/derecha SIN tumbear la figura.
        this._flipEl.style.transform = `scaleX(${this._mirando})`;
        this._ondaEl.style.transform = `translate(${this._onda.x}px, ${this._onda.y}px)`;
      }
      static _inyectarEstilos() {
        if (document.getElementById('manolit-walker-estilos')) return;
        const st = document.createElement('style');
        st.id = 'manolit-walker-estilos';
        st.textContent = `
          .manolit-walker .mw-body { animation: mwBreathe 3.4s ease-in-out infinite; }
          .manolit-walker .mw-eyes { animation: mwBlink 4.6s linear infinite; transform-origin: 60px 63px; }
          .manolit-walker .mw-heart { animation: mwPulse 1.6s ease-in-out infinite; transform-origin: 60px 58px; }
          .manolit-walker .mw-armwave.waving { animation: mwWave 1.15s ease-in-out 1; }
          @keyframes mwBreathe {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(1.2px); }
          }
          @keyframes mwBlink {
            0%, 92%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.08); }
          }
          @keyframes mwPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.12); }
          }
          @keyframes mwWave {
            0% { transform: rotate(0deg); }
            12% { transform: rotate(-150deg); }
            24% { transform: rotate(-168deg); }
            36% { transform: rotate(-150deg); }
            48% { transform: rotate(-168deg); }
            60% { transform: rotate(-152deg); }
            82% { transform: rotate(-30deg); }
            100% { transform: rotate(0deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .manolit-walker .mw-body,
            .manolit-walker .mw-eyes,
            .manolit-walker .mw-heart,
            .manolit-walker .mw-armwave.waving { animation: none !important; }
          }
        `;
        document.head.appendChild(st);
      }
      _buildElement() {
        const { colors } = this;
        // El SVG es 120×170: el contenedor respeta esa proporción para
        // que la figura no se aplaste.
        const w = this.size, h = Math.round(this.size * 170 / 120);
        const wrap = document.createElement('div');
        wrap.className = 'manolit-walker';
        wrap.style.cssText = `
          position:relative;
          width:${w}px;height:${h}px;
          overflow:visible;
          pointer-events:auto;
          cursor:pointer;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45));
        `;
        wrap.innerHTML = `
          <div class="mw-onda" style="position:absolute;inset:0;overflow:visible;">
          <div class="mw-flip" style="width:100%;height:100%;transform-origin:50% 50%;">
          <svg viewBox="0 0 120 170" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
            <g class="mw-body" style="transform-origin:60px 90px;">
              <g class="leg leg-l" style="transform-origin:60px 118px;">
                <line x1="60" y1="118" x2="45" y2="155" stroke="${colors.wine}" stroke-width="6" stroke-linecap="round"/>
                <ellipse cx="42" cy="158" rx="7" ry="4" fill="${colors.wine}"/>
              </g>
              <g class="leg leg-r" style="transform-origin:60px 118px;">
                <line x1="60" y1="118" x2="75" y2="155" stroke="${colors.wine}" stroke-width="6" stroke-linecap="round"/>
                <ellipse cx="78" cy="158" rx="7" ry="4" fill="${colors.wine}"/>
              </g>
              <g class="arm arm-r" style="transform-origin:94px 76px;">
                <line x1="94" y1="76" x2="114" y2="104" stroke="${colors.wine}" stroke-width="5" stroke-linecap="round"/>
              </g>

              <!-- La forma del logo Manolit: dos líneas internas + bucle infinito + corazón.
                   Coincide con la versión del HTML pegado: no es un muñeco de pie, es la marca del proyecto. -->
              <path d="M 60,18 C 22,58 22,108 60,132 C 98,108 98,58 60,18 Z"
                    fill="rgba(2,4,6,0.35)" stroke="${colors.wine}" stroke-width="5" stroke-linejoin="round"/>
              <circle cx="60" cy="63" r="26" fill="${colors.gold}"/>
              <path d="M 40,68 Q 50,61 60,68 T 80,68" fill="none" stroke="${colors.teal}" stroke-width="3" stroke-linecap="round"/>
              <path d="M 43,75 Q 51.5,69.5 60,75 T 77,75" fill="none" stroke="${colors.teal}" stroke-width="2.4" stroke-linecap="round"/>
              <path class="mw-heart" d="M 60,58 C 45,42 45,72 60,58 C 75,42 75,72 60,58 Z" fill="none" stroke="${colors.wine}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
              <g class="mw-armwave" style="transform-origin:26px 76px;">
                <line x1="26" y1="76" x2="6" y2="104" stroke="${colors.wine}" stroke-width="5" stroke-linecap="round"/>
                <circle cx="5" cy="106" r="4.5" fill="${colors.gold}" stroke="${colors.wine}" stroke-width="2.5"/>
              </g>
            </g>
          </svg>
          </div>
          </div>
        `;
        this._el = wrap;
        this._ondaEl = wrap.querySelector('.mw-onda');
        this._flipEl = wrap.querySelector('.mw-flip');
        this._body = wrap.querySelector('.mw-body');
        this._legL = wrap.querySelector('.leg-l');
        this._legR = wrap.querySelector('.leg-r');
        this._armR = wrap.querySelector('.arm-r');
        this._armWave = wrap.querySelector('.mw-armwave');
        this._bindClickSpeech();
      }
      static _haversine([lng1, lat1], [lng2, lat2]) {
        const R = 6371000;
        const toRad = (d) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      static _angleDelta(from, to) {
        return ((to - from + 540) % 360) - 180;
      }
    }
    window.ManolitWalker = window.ManolitWalker || ManolitWalker;

    /* ----- Marcador en el mapa: uno solo, reutilizado por los 3 modos ----- */
    const manolit = { walker: null, marker: null, watchId: null, paseoTimer: null, vigilanciaCaminata: null, versionUbicacion: 0 };

    function asegurarManolitEnMapa(lngLat) {
      if (!manolit.walker) {
        manolit.walker = new ManolitWalker({ size: 46 });
        manolit.marker = new maplibregl.Marker({
          element: manolit.walker.element,
          rotationAlignment: 'viewport',
          pitchAlignment: 'viewport',
          anchor: 'bottom',
        });
        if (manolit.walker && typeof manolit.walker._bindClickSpeechToMarker === 'function') {
          manolit.walker._bindClickSpeechToMarker(manolit.marker);
        }
      } else if (manolit.marker && manolit.walker && typeof manolit.walker._bindClickSpeechToMarker === 'function') {
        manolit.walker._bindClickSpeechToMarker(manolit.marker);
      }
      manolit.marker.setLngLat(lngLat); // primero posición: un Marker sin LngLat rompe al añadirse
      if (!manolit.marker._map) manolit.marker.addTo(map);
      const root = manolit.marker && manolit.marker.getElement ? manolit.marker.getElement() : null;
      if (root) {
        root.style.pointerEvents = 'auto';
        root.style.cursor = 'pointer';
      }
      return manolit.walker;
    }
    function quitarManolitDeMapa() {
      try { if (manolit.marker) manolit.marker.remove(); } catch (e) { /* ya fuera */ }
      if (manolit.walker) { manolit.walker.destroy(); }
      manolit.walker = null;
      manolit.marker = null;
    }

    // Compat: la caminata ya no usa un watchPosition propio (seguimos el
    // punto azul de la app), pero REINICIAR aún llama a esta función.
    function detenerManolitGPS() { pararVigilanciaCaminata(); }

    /* ----- MI UBICACIÓN: la flecha se planta EXACTAMENTE donde
       la app marca tu punto (leemos la misma fuente 'puntos-manuales'
       que pinta la app, así nunca hay dos posiciones distintas) ----- */
    cuandoExista('#rsBtnMyLocation', (btn) => {
      btn.addEventListener('click', () => {
        const version = ++manolit.versionUbicacion;
        let intentos = 0;
        const buscar = () => {
          if (version !== manolit.versionUbicacion) return; // clic más reciente manda
          try {
            const src = map.getSource('puntos-manuales');
            const datos = src && (src._data || (src.serialize && src.serialize().data));
            const feat = datos && datos.features && datos.features.find(
              (f) => f && f.geometry && f.geometry.type === 'Point'
            );
            if (feat) {
              const ll = feat.geometry.coordinates;
              asegurarManolitEnMapa(ll).setIdle();
              return;
            }
          } catch (e) { /* fuente aún no lista: reintenta */ }
          if (++intentos < 30) setTimeout(buscar, 400); // hasta ~12 s (permiso GPS lento)
        };
        setTimeout(buscar, 300);
      });
    });

    /* ----- INICIAR CAMINATA: la flecha ES tu punto azul -----
       Antes lanzábamos un segundo watchPosition propio: en PC sin GPS
       la ubicación por IP salta de sitio y la flecha aparecía y
       desaparecía. Ahora NO pedimos otra ubicación: seguimos el
       marcador que la propia app ya mueve (el punto azul), leyendo
       su posición en pantalla y convirtiéndola a coordenadas con
       map.unproject. La flecha va siempre pegada a tu punto real,
       y las piernas se animan con tu movimiento real. */
    function buscarMarcadorPuntoAzul() {
      try {
        const marcadores = document.querySelectorAll('.maplibregl-marker');
        for (const m of marcadores) {
          const hijo = m.firstElementChild;
          if (hijo && /border-radius:\s*50%/.test(hijo.getAttribute('style') || '')) return m;
        }
      } catch (e) { /* DOM a medias: siguiente pasada */ }
      return null;
    }
    function pararVigilanciaCaminata() {
      if (manolit.vigilanciaCaminata) { clearInterval(manolit.vigilanciaCaminata); manolit.vigilanciaCaminata = null; }
    }
    cuandoExista('#rsBtnWalk', (btn) => {
      btn.addEventListener('click', () => {
        setTimeout(() => {
          try {
            if (!btn.classList.contains('rs-activo')) { pararVigilanciaCaminata(); return; }
            pararVigilanciaCaminata();
            manolit.vigilanciaCaminata = setInterval(() => {
              try {
                // Si la caminata se paró por otra vía (paseo, reiniciar),
                // la clase ya no está: paramos solos y la flecha se queda
                // quieta en la última posición conocida.
                if (!btn.classList.contains('rs-activo')) { pararVigilanciaCaminata(); return; }
                const m = buscarMarcadorPuntoAzul();
                if (!m || !m.isConnected) return; // aún no llegó la 1ª posición GPS
                // Sustitución de verdad: el punto azul se oculta y en su
                // sitio queda la flecha Manolit (mismo marcador, misma
                // posición exacta que mueve la app).
                const puntoAzul = m.firstElementChild;
                if (puntoAzul && !m.dataset.manolitOculto) {
                  m.dataset.manolitOculto = '1';
                  puntoAzul.style.visibility = 'hidden';
                }
                const r = m.getBoundingClientRect();
                if (!r.width && !r.height) return;
                const c = map.getCanvas().getBoundingClientRect();
                const cx = r.left + r.width / 2 - c.left;
                const ll = map.unproject([
                  cx,
                  r.top + r.height / 2 - c.top,
                ]);
                const dx = (typeof manolit._ultimoXCaminata === 'number') ? cx - manolit._ultimoXCaminata : 0;
                manolit._ultimoXCaminata = cx;
                const arr = [ll.lng, ll.lat];
                asegurarManolitEnMapa(arr).update(arr, dx);
              } catch (e) { /* un tic fallido no rompe nada */ }
            }, 150);
          } catch (e) { /* nunca romper el botón original */ }
        }, 50);
      });
    });

    /* ----- PASEO VIRTUAL 3D: la flecha sigue a tu avatar -----
       En cámara libre el "centro" del mapa no es el jugador; la
       posición real está en la cámara (getFreeCameraOptions). */
    function detenerManolitPaseo() {
      if (manolit.paseoTimer) { clearTimeout(manolit.paseoTimer); manolit.paseoTimer = null; }
    }
    cuandoExista('#rsBtnPaseo', (btn) => {
      btn.addEventListener('click', () => {
        setTimeout(() => {
          try {
            if (!btn.classList.contains('rs-activo')) { detenerManolitPaseo(); return; }
            detenerManolitPaseo();
            const paso = () => {
              manolit.paseoTimer = null;
              // Si se salió del paseo sin botón (tecla Escape), la clase
              // ya no está: paramos solos y sin ruido.
              if (!btn.classList.contains('rs-activo')) return;
              try {
                if (typeof map.getFreeCameraOptions === 'function') {
                  const mc = map.getFreeCameraOptions().position;
                  if (mc) {
                    const ll = mc.toLngLat();
                    const arr = [ll.lng, ll.lat];
                    let dx = 0;
                    if (typeof manolit._ultimoLngPaseo === 'number') {
                      dx = arr[0] - manolit._ultimoLngPaseo;
                    }
                    manolit._ultimoLngPaseo = arr[0];
                    asegurarManolitEnMapa(arr).update(arr, dx * 1e5);
                  }
                }
              } catch (e) { /* cámara a medio mover: siguiente tic */ }
              manolit.paseoTimer = setTimeout(paso, 120);
            };
            paso();
          } catch (e) { /* nunca romper el botón original */ }
        }, 50);
      });
    });

    /* ----- REINICIAR: la flecha también se retira ----- */
    cuandoExista('#rsBtnReset', (btn) => {
      btn.addEventListener('click', () => {
        detenerManolitGPS();
        detenerManolitPaseo();
        pararVigilanciaCaminata();
        quitarManolitDeMapa();
      });
    });

    /* ============================================================
       BOTÓN DE CHAT MANOLIT — el FAB de siempre con nuestra figura
       y una burbuja «¡Pregúntame!» encima. El clic sigue abriendo
       el chat de siempre (su onclick no se toca). La burbuja se
       despide en cuanto la tocas una vez.
       ============================================================ */
    function inyectarManolitChat(intentos = 0) {
      let fab;
      try { fab = document.querySelector('.chat-fab'); } catch (e) { return; }
      if (!fab) {
        if (intentos < 40) setTimeout(() => inyectarManolitChat(intentos + 1), 250);
        return;
      }
      if (fab.dataset.manolitListo) return;
      fab.dataset.manolitListo = '1';
      try {
        const estilo = document.createElement('style');
        estilo.id = 'manolit-chat-estilos';
        estilo.textContent = `
          .chat-fab{display:flex;align-items:center;justify-content:center;overflow:visible;}
          .chat-fab .manolit-walker-chat{pointer-events:none;animation:manolitSaludo 3.2s ease-in-out infinite;}
          .manolit-chat-bubble{
            position:absolute; bottom:calc(100% + 10px); right:0;
            background:rgba(2,4,6,0.92); color:#fff;
            border:1px solid rgba(230,161,0,0.55);
            padding:7px 12px; border-radius:14px 14px 4px 14px;
            font-size:13px; font-weight:600; white-space:nowrap;
            pointer-events:none;
            box-shadow:0 4px 14px rgba(0,0,0,0.35);
            animation:manolitSaludo 3.2s ease-in-out infinite;
          }
          @keyframes manolitSaludo{
            0%,100%{transform:translateY(0);}
            50%{transform:translateY(-4px);}
          }
          @media (prefers-reduced-motion: reduce){
            .chat-fab .manolit-walker-chat,
            .manolit-chat-bubble{animation:none;}
          }
        `;
        document.head.appendChild(estilo);

        // Figura estática (la misma del caminante, en pose neutra)
        const figura = document.createElement('span');
        figura.className = 'manolit-walker-chat';
        figura.innerHTML = `
          <svg viewBox="0 0 120 170" width="30" height="43" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g>
              <line x1="60" y1="118" x2="45" y2="155" stroke="#7A0016" stroke-width="6" stroke-linecap="round"/>
              <ellipse cx="42" cy="158" rx="7" ry="4" fill="#7A0016"/>
              <line x1="60" y1="118" x2="75" y2="155" stroke="#7A0016" stroke-width="6" stroke-linecap="round"/>
              <ellipse cx="78" cy="158" rx="7" ry="4" fill="#7A0016"/>
              <path d="M 60,18 C 22,58 22,108 60,132 C 98,108 98,58 60,18 Z"
                    fill="rgba(2,4,6,0.35)" stroke="#7A0016" stroke-width="5" stroke-linejoin="round"/>
              <circle cx="60" cy="63" r="26" fill="#E6A100"/>
              <path d="M 40,68 Q 50,61 60,68 T 80,68" fill="none" stroke="#007A87" stroke-width="3" stroke-linecap="round"/>
              <path d="M 43,75 Q 51.5,69.5 60,75 T 77,75" fill="none" stroke="#007A87" stroke-width="2.4" stroke-linecap="round"/>
              <path d="M 60,58 C 45,42 45,72 60,58 C 75,42 75,72 60,58 Z"
                    fill="none" stroke="#7A0016" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </svg>
        `;
        fab.innerHTML = '';
        fab.appendChild(figura);

        // Burbuja «¡Pregúntame!» (con traducción si el i18n la tiene;
        // si la clave no existe, no tocamos nada raro: texto fijo en español)
        let textoBurbuja = '¡Pregúntame!';
        try {
          const candidato = window.i18n && window.i18n.t ? window.i18n.t('askMe') : null;
          if (candidato && candidato !== 'askMe') textoBurbuja = candidato;
        } catch (e) { /* i18n aún no listo: español */ }
        const burbuja = document.createElement('span');
        burbuja.className = 'manolit-chat-bubble';
        burbuja.textContent = textoBurbuja;
        fab.appendChild(burbuja);
        fab.addEventListener('click', () => { burbuja.style.display = 'none'; }, { once: true });
      } catch (e) { /* si algo falla, el FAB original sigue funcionando */ }
    }
    inyectarManolitChat();
  }



  /* ============================================================
     LOGO DEL PANEL DE CHAT — la figura Manolit también cuando el
     chat se despliega: sustituye al círculo multicolor de la
     cabecera «Manolit∞ te lo explica». El panel y sus funciones
     no se tocan; solo cambia el icono.
       ============================================================ */
  if (!window.__manolitChatLogoListo) {
    window.__manolitChatLogoListo = true;
    (function ponerLogoManolitEnPanel(intentos) {
      let logo;
      try { logo = document.querySelector('#chatOverlay .chat-logo'); } catch (e) { return; }
      if (!logo) {
        if ((intentos || 0) < 40) setTimeout(() => ponerLogoManolitEnPanel((intentos || 0) + 1), 250);
        return;
      }
      if (logo.dataset.manolitListo) return;
      logo.dataset.manolitListo = '1';
      try {
        logo.style.cssText += ';background:none!important;box-shadow:none!important;border:none!important;padding:0;width:auto;height:auto;';
        logo.innerHTML = `
          <svg viewBox="0 0 120 170" width="20" height="28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g>
              <line x1="60" y1="118" x2="45" y2="155" stroke="#7A0016" stroke-width="6" stroke-linecap="round"/>
              <ellipse cx="42" cy="158" rx="7" ry="4" fill="#7A0016"/>
              <line x1="60" y1="118" x2="75" y2="155" stroke="#7A0016" stroke-width="6" stroke-linecap="round"/>
              <ellipse cx="78" cy="158" rx="7" ry="4" fill="#7A0016"/>
              <path d="M 60,18 C 22,58 22,108 60,132 C 98,108 98,58 60,18 Z"
                    fill="rgba(2,4,6,0.35)" stroke="#7A0016" stroke-width="5" stroke-linejoin="round"/>
              <line x1="26" y1="76" x2="6" y2="104" stroke="#7A0016" stroke-width="5" stroke-linecap="round"/>
              <line x1="94" y1="76" x2="114" y2="104" stroke="#7A0016" stroke-width="5" stroke-linecap="round"/>
              <circle cx="60" cy="63" r="26" fill="#E6A100"/>
              <path d="M 40,68 Q 50,61 60,68 T 80,68" fill="none" stroke="#007A87" stroke-width="3" stroke-linecap="round"/>
              <path d="M 43,75 Q 51.5,69.5 60,75 T 77,75" fill="none" stroke="#007A87" stroke-width="2.4" stroke-linecap="round"/>
              <path d="M 60,58 C 45,42 45,72 60,58 C 75,42 75,72 60,58 Z"
                    fill="none" stroke="#7A0016" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </svg>
        `;
      } catch (e) { /* si falla, el logo original sigue ahí */ }
    })(0);
  }



  /* ==================== SINCRONIZAR / EXPORTAR DATOS ====================
     Botón discreto en el PIE de la web (fuera del mapa), junto a
     «Aviso legal · Privacidad · Cookies». Exporta/importa en un archivo
     JSON los ajustes de la persona (tema, idioma, tamaño de letra,
     caché de alturas del Catastro...) y sus puntos guardados en el mapa.
     Todo ocurre en el dispositivo: sin servidores, sin cuentas, gratis. */
  (function inyectarSyncDatos() {
    function inyectarEstilosSync() {
      if (document.getElementById('rs-sync-estilos')) return;
      const st = document.createElement('style');
      st.id = 'rs-sync-estilos';
      st.textContent = `
        #rsLinkSync{ cursor:pointer; }
        #rsSyncOverlay{
          position:fixed; inset:0; z-index:12000; display:none;
          align-items:center; justify-content:center;
          background:rgba(14,25,32,0.45);
          backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
          padding:16px;
        }
        #rsSyncOverlay.rs-sync-abierto{ display:flex; }
        #rsSyncPanel{
          width:min(420px, 94vw);
          background:var(--paper, #FBFAF7); color:var(--sky-deep, #0E3B47);
          border:1px solid var(--line, rgba(14,59,71,0.14));
          border-radius:16px; box-shadow:0 14px 40px rgba(10,20,26,0.28);
          padding:20px 22px; font-family:inherit;
        }
        #rsSyncPanel h2{
          margin:0 0 6px; font-size:1.05rem; font-weight:800; letter-spacing:.01em;
        }
        #rsSyncPanel p{ margin:6px 0; font-size:0.86rem; line-height:1.45; opacity:0.88; }
        #rsSyncPanel .rs-sync-botones{ display:flex; flex-direction:column; gap:8px; margin-top:14px; }
        #rsSyncPanel button{
          font-family:inherit; font-size:0.9rem; font-weight:700;
          padding:10px 14px; border-radius:999px; cursor:pointer;
          border:1px solid var(--line, rgba(14,59,71,0.18));
          background:rgba(251,250,247,0.9); color:var(--sky-deep, #0E3B47);
          transition:background .15s, border-color .15s;
        }
        #rsSyncPanel button:hover{
          background:var(--accent-soft, rgba(255,107,26,0.16));
          border-color:var(--accent, #FF6B1A);
        }
        #rsSyncPanel button.rs-sync-principal{
          background:var(--accent, #FF6B1A); border-color:var(--accent, #FF6B1A);
          color:var(--paper, #FBFAF7);
        }
        #rsSyncPanel .rs-sync-nota{
          margin-top:12px; font-size:0.72rem; opacity:0.6; line-height:1.4;
        }
        #rsSyncEstado{ min-height:1.1em; font-weight:700; }
      `;
      document.head.appendChild(st);
    }

    function recogerPuntosManuales() {
      try {
        if (typeof map === 'undefined' || !map || !map.getSource) return [];
        const src = map.getSource('puntos-manuales');
        if (!src) return [];
        const data = src._data || (src.serialize && src.serialize().data);
        const feats = (data && data.features) || [];
        return feats
          .filter((f) => f && f.geometry && f.geometry.type === 'Point')
          .map((f) => ({ geometry: f.geometry, properties: f.properties || {} }));
      } catch (e) { return []; }
    }

    function recogerAjustes() {
      const ajustes = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.indexOf('manolito_') === 0 || k === 'lang')) {
            ajustes[k] = localStorage.getItem(k);
          }
        }
      } catch (e) { /* sin localStorage: se exporta solo lo demás */ }
      return ajustes;
    }

    function exportarDatos() {
      const paquete = {
        app: 'manolito-aire',
        formato: 1,
        fecha: new Date().toISOString(),
        ajustes: recogerAjustes(),
        puntos: recogerPuntosManuales(),
      };
      const blob = new Blob([JSON.stringify(paquete, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const marca = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      a.href = url;
      a.download = 'manolito-datos-' + marca + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return paquete;
    }

    function importarDatos(paquete) {
      if (!paquete || paquete.app !== 'manolito-aire' || typeof paquete !== 'object') {
        throw new Error('archivo-no-manolito');
      }
      let nAjustes = 0;
      const ajustes = paquete.ajustes || {};
      Object.keys(ajustes).forEach((k) => {
        if ((k.indexOf('manolito_') === 0 || k === 'lang') && typeof ajustes[k] === 'string') {
          try { localStorage.setItem(k, ajustes[k]); nAjustes++; } catch (e) { /* lleno o bloqueado */ }
        }
      });
      let nPuntos = 0;
      const nuevos = Array.isArray(paquete.puntos) ? paquete.puntos : [];
      try {
        if (nuevos.length && typeof map !== 'undefined' && map && map.getSource) {
          const src = map.getSource('puntos-manuales');
          if (src && src.setData) {
            const actuales = recogerPuntosManuales();
            const validos = nuevos.filter((f) =>
              f && f.geometry && f.geometry.type === 'Point' &&
              Array.isArray(f.geometry.coordinates) &&
              f.geometry.coordinates.every((c) => typeof c === 'number' && isFinite(c)));
            nPuntos = validos.length;
            const fc = (typeof turf !== 'undefined' && turf.featureCollection)
              ? turf.featureCollection(actuales.concat(validos))
              : { type: 'FeatureCollection', features: actuales.concat(validos) };
            src.setData(fc);
          }
        }
      } catch (e) { /* puntos opcionales: los ajustes ya se han llevado */ }
      return { ajustes: nAjustes, puntos: nPuntos };
    }

    function montarPanelSync() {
      if (document.getElementById('rsSyncOverlay')) return;
      inyectarEstilosSync();
      const overlay = document.createElement('div');
      overlay.id = 'rsSyncOverlay';
      overlay.innerHTML = `
        <div id="rsSyncPanel" role="dialog" aria-modal="true" aria-labelledby="rsSyncTitulo">
          <h2 id="rsSyncTitulo">Sincronizar / Exportar datos</h2>
          <p>Guarda en un archivo tus ajustes de Manolit∞ Aire (tema, idioma, tamaño de letra,
             alturas del Catastro ya descargadas) y tus puntos del mapa. Así los llevas a otro
             móvil u ordenador, o los recuperas si borras el navegador.</p>
          <div class="rs-sync-botones">
            <button type="button" class="rs-sync-principal" id="rsBtnSyncExportar">⤓ Exportar mis datos</button>
            <button type="button" id="rsBtnSyncImportar">⤒ Importar / Sincronizar</button>
            <button type="button" id="rsBtnSyncCerrar">Cerrar</button>
          </div>
          <p id="rsSyncEstado" aria-live="polite"></p>
          <p class="rs-sync-nota">Todo pasa solo en tu dispositivo. Nada se sube a ningún servidor:
             el archivo lo guardas tú y lo compartes tú si quieres.</p>
          <input type="file" id="rsSyncFichero" accept="application/json,.json" style="display:none">
        </div>
      `;
      document.body.appendChild(overlay);

      const estado = overlay.querySelector('#rsSyncEstado');
      const cerrar = () => overlay.classList.remove('rs-sync-abierto');
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) cerrar(); });
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && overlay.classList.contains('rs-sync-abierto')) cerrar();
      });
      overlay.querySelector('#rsBtnSyncCerrar').addEventListener('click', cerrar);
      overlay.querySelector('#rsBtnSyncExportar').addEventListener('click', () => {
        try {
          const p = exportarDatos();
          const nA = Object.keys(p.ajustes || {}).length;
          const nP = (p.puntos || []).length;
          estado.textContent = 'Exportado: ' + nA + ' ajustes y ' + nP + ' puntos. Revisa tu carpeta de descargas.';
        } catch (e) {
          estado.textContent = 'No se pudo exportar en este navegador.';
        }
      });
      const input = overlay.querySelector('#rsSyncFichero');
      overlay.querySelector('#rsBtnSyncImportar').addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        input.value = '';
        if (!f) return;
        const lector = new FileReader();
        lector.onload = () => {
          try {
            const paquete = JSON.parse(String(lector.result));
            const r = importarDatos(paquete);
            estado.textContent = 'Sincronizado: ' + r.ajustes + ' ajustes y ' + r.puntos +
              ' puntos. Recarga con Ctrl+Mayús+R para verlo todo aplicado.';
          } catch (e) {
            estado.textContent = 'Ese archivo no es una copia válida de Manolit∞ Aire.';
          }
        };
        lector.onerror = () => { estado.textContent = 'No se pudo leer el archivo.'; };
        lector.readAsText(f);
      });
    }

    function abrirPanelSync() {
      montarPanelSync();
      const overlay = document.getElementById('rsSyncOverlay');
      if (overlay) overlay.classList.add('rs-sync-abierto');
    }

    // El enlace va en el PIE, junto a Aviso legal · Privacidad · Cookies:
    // discreto, con el estilo de la web y fuera del mapa.
    cuandoExista('.footer a[href="aviso-legal.html"]', (enlaceLegal) => {
      if (document.getElementById('rsLinkSync')) return;
      const contenedor = enlaceLegal.parentElement;
      if (!contenedor) return;
      const separador = document.createTextNode(' · ');
      const enlace = document.createElement('a');
      enlace.id = 'rsLinkSync';
      enlace.href = '#';
      enlace.textContent = t('syncData', 'Sincronizar / Exportar datos');
      enlace.addEventListener('click', (ev) => {
        ev.preventDefault();
        try { abrirPanelSync(); } catch (e) { /* nunca romper el pie */ }
      });
      contenedor.appendChild(separador);
      contenedor.appendChild(enlace);
    });
  })();
})();

/* ============================================================
   MÓDULO DE ÁRBOLES GLOBALES (INTEGRADO)
   Antes era js/arboles-globales.js, un archivo aparte con carga
   perezosa que daba fallos ("unas veces sale y otras no"). Ahora
   vive aquí dentro: un solo motor de sombras, un solo archivo,
   cero puntos de fallo de carga. Sigue esperando a
   window.manolitAireMap, que este mismo archivo define arriba.
   ============================================================ */
/* ============================================================
   ÁRBOLES GLOBALES + SOMBRA — capa independiente, vía Overpass/OSM

   v7 — Robustez Overpass + formas por especie:
   - Cooldown exponencial ante errores 429/502/504/CORS para no saturar Overpass.
   - Timeout y área de consulta reducidos.
   - Clasificación por species/genus y sombras realistas por tipo de árbol.

   v5 — FIX CRÍTICO de unidades + Sombras Orgánicas Asimétricas
   ============================================================ */

'use strict';

(function () {
  // El botón del mapa puede cargar este script dos veces (precarga en cadena
  // + carga perezosa al pulsar). La segunda ejecución no debe hacer nada.
  if (window.__arbolesGlobalesCargado) return;
  window.__arbolesGlobalesCargado = true;

  const CONFIG = {
    overpassUrls: [
      // 1º: nuestro propio proxy en Cloudflare, same-origin (sin CORS y sin
      // depender del dominio workers.dev). Lleva caché KV de 6 h: si la zona
      // ya se pidió, responde al instante aunque Overpass esté caído.
      // Si el Worker no tiene la ruta, cae a los espejos públicos de abajo.
      '/arboles',
      // Espejos públicos de respaldo en Europa y Taiwán (nada de
      // infraestructura rusa). lz4/z.overpass-api.de son colas alternativas
      // del operador alemán, suelen ir menos saturadas que la principal.
      'https://lz4.overpass-api.de/api/interpreter',
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
      'https://overpass.nchc.org.tw/api/interpreter',
      // OJO: overpass.osm.ch está devolviendo respuestas 200 VACÍAS y
      // corruptas (timestamp_osm_base:"116617") — fuera de la lista.
    ],
    overpassTimeoutS: 15,

    alturaMinimaM: 2,
    alturaEstimadaSinDatoM: 6,
    radioCopaPorDefectoM: 2.2,

    maxArbolesEnPantalla: 1000,
    maxArbolesConSombra: 250,
    loteSombraSize: 20,
    sincroSombraMs: 60 * 1000,
    esperaMoveendMs: 500,
    maxLadoConsultaKm: 2.5,
    cacheCeldasGrados: 0.01,
    esperaMapaMs: 15000,
  };

  /* ---------------- Tipología de árboles (forma + sombra realista) ---------------- */

  const TIPOS_ARBOL = {
    palmera: {
      keywords: ['phoenix', 'washingtonia', 'palma', 'palm', 'date palm', 'datilera'],
      alturaMediaM: 10,
      radioCopaMedioM: 2.0,
      forma: 'palmera',
      color: '#7a9b4a',
    },
    pino: {
      keywords: ['pinus', 'pino', 'pine', 'cedrus', 'cedro', 'cedar', 'ciprés', 'cypress', 'cupressus', 'abeto', 'fir'],
      alturaMediaM: 14,
      radioCopaMedioM: 3.0,
      forma: 'conica',
      color: '#2d5a3d',
    },
    encina_roble: {
      keywords: ['quercus', 'encina', 'roble', 'oak', 'alcornoque', 'cork oak', 'quejigo'],
      alturaMediaM: 10,
      radioCopaMedioM: 6.0,
      forma: 'ancha_redondeada',
      color: '#4f7a35',
    },
    olivo: {
      keywords: ['olea', 'olivo', 'olive', 'acebuche'],
      alturaMediaM: 8,
      radioCopaMedioM: 4.0,
      forma: 'ancha_irregular',
      color: '#6b8c42',
    },
    citrico: {
      keywords: ['citrus', 'naranjo', 'limonero', 'orange', 'lemon', 'mandarino', 'pomelo'],
      alturaMediaM: 5,
      radioCopaMedioM: 2.8,
      forma: 'redondeada',
      color: '#5a8a3a',
    },
    platanero: {
      keywords: ['platanus', 'plátano', 'platano', 'plane', 'sicomoro'],
      alturaMediaM: 16,
      radioCopaMedioM: 5.5,
      forma: 'ancha_redondeada',
      color: '#4a8a3f',
    },
    eucalipto: {
      keywords: ['eucalyptus', 'eucalipto', 'gum'],
      alturaMediaM: 18,
      radioCopaMedioM: 3.0,
      forma: 'oval_alargada',
      color: '#3d6b4a',
    },
    olmo: {
      keywords: ['ulmus', 'olmo', 'elm'],
      alturaMediaM: 12,
      radioCopaMedioM: 5.0,
      forma: 'ancha_redondeada',
      color: '#5a8f3d',
    },
    chopo: {
      keywords: ['populus', 'chopo', 'poplar', 'álamo', 'alamo'],
      alturaMediaM: 15,
      radioCopaMedioM: 4.0,
      forma: 'oval_alargada',
      color: '#4f9a45',
    },
    generico: {
      alturaMediaM: CONFIG.alturaEstimadaSinDatoM,
      radioCopaMedioM: CONFIG.radioCopaPorDefectoM,
      forma: 'redondeada',
      color: '#7fb069',
    },
  };

  function clasificarArbol(tags) {
    const texto = [
      tags.species || '',
      tags['species:es'] || '',
      tags['species:en'] || '',
      tags.genus || '',
      tags.taxon || '',
      tags.name || '',
      tags['leaf_type'] || '',
    ].join(' ').toLowerCase();

    for (const [tipo, info] of Object.entries(TIPOS_ARBOL)) {
      if (tipo === 'generico') continue;
      for (const kw of info.keywords) {
        if (texto.includes(kw.toLowerCase())) return { tipo, ...info };
      }
    }
    return { tipo: 'generico', ...TIPOS_ARBOL.generico };
  }

  function estimarDimensionesArbol(tags, clasificacion) {
    let altura = leerNumero(tags, ['height', 'maxheight']);
    let diametroCopa = leerNumero(tags, ['diameter_crown', 'crown_diameter']);

    if (altura == null) {
      const circ = leerNumero(tags, ['circumference', 'circumference_dbh', 'dbh']);
      if (circ) {
        // Altura aproximada a partir del diámetro a la altura del pecho
        const factor = clasificacion.forma === 'conica' ? 2.8 : clasificacion.forma === 'palmera' ? 5.0 : 2.0;
        altura = Math.max(3, (circ / Math.PI) * factor);
      } else {
        altura = clasificacion.alturaMediaM;
      }
    }

    if (diametroCopa == null) {
      const circ = leerNumero(tags, ['circumference', 'circumference_dbh', 'dbh']);
      if (circ) {
        diametroCopa = circ / Math.PI;
      } else {
        const proporcion = {
          palmera: 0.22,
          conica: 0.30,
          oval_alargada: 0.32,
          ancha_redondeada: 0.75,
          ancha_irregular: 0.65,
          redondeada: 0.55,
        }[clasificacion.forma] || 0.5;
        diametroCopa = altura * proporcion;
      }
    }

    // Palmera: copa siempre pequeña y alta
    if (clasificacion.forma === 'palmera') {
      diametroCopa = Math.min(diametroCopa, 3.5);
      altura = Math.max(altura, 6);
    }

    const radioCopaM = Math.max(0.6, diametroCopa / 2);
    return { altura, radioCopaM };
  }

  function leerNumero(tags, claves) {
    for (const clave of claves) {
      const v = tags?.[clave];
      if (v == null || v === '') continue;
      const n = parseFloat(String(v).replace(',', '.'));
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return null;
  }

  function cederAlNavegador() {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 120 });
      else setTimeout(resolve, 0);
    });
  }

  function esperarMapa() {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      (function intento() {
        if (window.manolitAireMap) return resolve(window.manolitAireMap);
        if (Date.now() - t0 > CONFIG.esperaMapaMs) {
          return reject(new Error('No se ha encontrado window.manolitAireMap — añade "window.manolitAireMap = map;" justo después de crear el mapa en manolit-aire.js'));
        }
        setTimeout(intento, 200);
      })();
    });
  }

  esperarMapa().then(iniciar).catch((e) => console.debug('[arboles-globales]', e.message));

  function obtenerHoraEfectiva() {
    if (typeof window.manolitAireHoraEfectiva === 'function') {
      try {
        const h = window.manolitAireHoraEfectiva();
        if (h instanceof Date && !isNaN(h)) return h;
      } catch (e) { /* seguimos con el respaldo */ }
    }
    return new Date();
  }

  function obtenerCentroSolar(map) {
    if (typeof window.manolitAireCentroSol === 'function') {
      try {
        const c = window.manolitAireCentroSol();
        if (c && typeof c.lat === 'number' && typeof c.lon === 'number') return c;
      } catch (e) { /* seguimos con el respaldo */ }
    }
    const c = map.getCenter();
    return { lat: c.lat, lon: c.lng != null ? c.lng : c.lon };
  }

  function sombrasActivadasEnPanel() {
    const t = document.getElementById('rsToggleSombras');
    return !t || t.checked;
  }

  async function iniciar(map) {

    function primeraCapaEdificiosOSuelo() {
      const capas = map.getStyle().layers || [];
      const edificios = capas.find((l) => l.type === 'fill-extrusion' && /building/i.test(l.id));
      return edificios ? edificios.id : undefined;
    }

    // Garantiza (también tras cada recarga de estilo) que la capa plana de
    // sombra de los árboles queda SIEMPRE por debajo de la extrusión 3D de
    // los edificios: así el edificio tapa físicamente cualquier fragmento
    // de sombra que intente colarse en su base.
    function asegurarOrdenCapas() {
      try {
        const idEdificios = primeraCapaEdificiosOSuelo();
        if (!idEdificios) return;
        if (map.getLayer('capa-sombra-arboles-globales')) {
          map.moveLayer('capa-sombra-arboles-globales', idEdificios);
        }
      } catch (e) { /* el estilo aún no está listo; se reintentará */ }
    }
    map.on('styledata', asegurarOrdenCapas);

    function asegurarCapas() {
      if (!map.getSource('arboles-globales-sombra')) {
        map.addSource('arboles-globales-sombra', { type: 'geojson', data: turf.featureCollection([]) });
        map.addLayer({
          id: 'capa-sombra-arboles-globales',
          type: 'fill',
          source: 'arboles-globales-sombra',
          paint: {
            'fill-color': '#0b1220',
            'fill-opacity': 0.26,
          },
        }, primeraCapaEdificiosOSuelo());
      }
      asegurarOrdenCapas();
      if (!map.getSource('arboles-globales-copas')) {
        map.addSource('arboles-globales-copas', { type: 'geojson', data: turf.featureCollection([]) });
        map.addLayer({
          id: 'capa-arboles-globales-3d',
          type: 'fill-extrusion',
          source: 'arboles-globales-copas',
          paint: {
            'fill-extrusion-color': [
              'case',
              ['==', ['get', 'tipo'], 'tronco'], '#8b5a2b',
              ['==', ['get', 'tipo'], 'copa'], [
                'case',
                ['has', 'color'], ['get', 'color'],
                [
                  'interpolate', ['linear'], ['get', 'altura'],
                  3, '#7fb069',
                  8, '#4f8a3d',
                  15, '#2f5d2a',
                ]
              ],
              '#7fb069'
            ],
            'fill-extrusion-base': ['get', 'baseM'],
            'fill-extrusion-height': ['get', 'alturaTotalM'],
            'fill-extrusion-opacity': 0.92,
          },
        });
      }
    }

    if (map.loaded()) {
      asegurarCapas();
    } else {
      map.once('load', asegurarCapas);
    }

    let capaVisible = true;
    let overpassBackoffHasta = 0;
    let overpassErroresSeguidos = 0;

    // El botón ya lo crea SIEMPRE shadows-route.js (fijo en el mapa); aquí
    // solo lo "adoptamos": le ponemos el texto traducido y la lógica.
    function inyectarToggle() {
      const btn = document.getElementById('rsBtnArboles');
      if (!btn || btn.dataset.listo === '1') return false;
      btn.dataset.listo = '1';
      delete btn.dataset.cargando;
      btn.textContent = (typeof window.getMessages === 'function' ? (window.getMessages().treesBtn || 'Árboles') : 'Árboles');
      btn.classList.add('rs-activo');
      btn.setAttribute('aria-pressed', 'true');
      const textoBoton = () => (typeof window.getMessages === 'function' ? (window.getMessages().treesBtn || 'Árboles') : 'Árboles');
      btn.addEventListener('click', async () => {
        capaVisible = !capaVisible;
        btn.classList.toggle('rs-activo', capaVisible);
        btn.setAttribute('aria-pressed', capaVisible ? 'true' : 'false');
        ['capa-arboles-globales-3d', 'capa-sombra-arboles-globales'].forEach((id) => {
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', capaVisible ? 'visible' : 'none');
        });
        if (capaVisible) {
          // Feedback de carga: la consulta a Overpass puede tardar unos
          // segundos; sin aviso parece que el botón "no hace nada".
          btn.textContent = 'Cargando árboles…';
          try {
            await cargarArbolesDeLaVista();
            recalcularSombrasArboles();
          } finally {
            btn.textContent = textoBoton();
          }
        }
      });
      return true;
    }
    // Retraducir el botón al cambiar el idioma (evento de i18n.js)
    document.addEventListener('langChanged', () => {
      const b = document.getElementById('rsBtnArboles');
      if (b && typeof window.getMessages === 'function') b.textContent = window.getMessages().treesBtn || 'Árboles';
    });
    // Reintenta hasta que el botón fijo exista (antes, si el panel no estaba
    // en ese momento, el botón no aparecía jamás).
    (function intentarToggle(n) {
      if (inyectarToggle()) return;
      if (n > 0) setTimeout(() => intentarToggle(n - 1), 400);
    })(50);

    let arbolesGrandes = [];
    const celdasConsultadas = new Set();
    let consultaEnCurso = false;

    function celdasDeVista(bounds) {
      const paso = CONFIG.cacheCeldasGrados;
      const celdas = [];
      const minLat = Math.floor(bounds.getSouth() / paso) * paso;
      const maxLat = Math.ceil(bounds.getNorth() / paso) * paso;
      const minLon = Math.floor(bounds.getWest() / paso) * paso;
      const maxLon = Math.ceil(bounds.getEast() / paso) * paso;
      for (let lat = minLat; lat < maxLat; lat += paso) {
        for (let lon = minLon; lon < maxLon; lon += paso) {
          celdas.push(`${lat.toFixed(3)},${lon.toFixed(3)}`);
        }
      }
      return celdas;
    }

    function anchoVistaKm(bounds) {
      return turf.distance(
        turf.point([bounds.getWest(), bounds.getCenter ? bounds.getCenter().lat : (bounds.getNorth() + bounds.getSouth()) / 2]),
        turf.point([bounds.getEast(), bounds.getCenter ? bounds.getCenter().lat : (bounds.getNorth() + bounds.getSouth()) / 2]),
        { units: 'kilometers' }
      );
    }

    async function consultarOverpass(bbox) {
      const ahora = Date.now();
      if (ahora < overpassBackoffHasta) {
        throw new Error('Overpass en cooldown por errores recientes');
      }

      const query = `[out:json][timeout:${CONFIG.overpassTimeoutS}];(node["natural"="tree"](${bbox.join(',')}););out body;`;
      let ultimoError = null;
      for (let i = 0; i < CONFIG.overpassUrls.length; i++) {
        const url = CONFIG.overpassUrls[i];
        try {
          const controller = new AbortController();
          // El proxy propio (/arboles) prueba varios espejos en cadena con
          // timeout individual, así que le damos más margen (25 s); a los
          // espejos públicos directos los cortamos antes (18 s).
          const presupuestoMs = url.startsWith('/') ? 25000 : CONFIG.overpassTimeoutS * 1000 + 3000;
          const id = setTimeout(() => controller.abort(), presupuestoMs);
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: 'data=' + encodeURIComponent(query),
            signal: controller.signal,
          });
          clearTimeout(id);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const datos = await r.json();
          // Espejo corrupto: 200 con lista vacía y fecha basura (p. ej.
          // timestamp_osm_base:"116617"). Un vacío real tiene fecha válida.
          const ts = datos?.osm3s?.timestamp_osm_base;
          const corrupto =
            Array.isArray(datos?.elements) && datos.elements.length === 0 &&
            typeof ts === 'string' && ts !== '' && !ts.includes('T');
          if (corrupto) throw new Error('Espejo Overpass con datos corruptos');
          if (!datos || !Array.isArray(datos.elements)) throw new Error('Respuesta Overpass inválida');
          overpassErroresSeguidos = 0;
          return datos;
        } catch (e) {
          ultimoError = e;
          if (i < CONFIG.overpassUrls.length - 1) {
            await new Promise((res) => setTimeout(res, 700 * (i + 1)));
          }
          continue;
        }
      }

      overpassErroresSeguidos++;
      const backoffMs = Math.min(90000, 4000 * Math.pow(2, overpassErroresSeguidos - 1));
      overpassBackoffHasta = Date.now() + backoffMs;
      console.debug(`[arboles-globales] Overpass falló ${overpassErroresSeguidos} veces seguidas. Cooldown ${(backoffMs / 1000).toFixed(0)} s.`);
      throw ultimoError || new Error('Overpass no disponible');
    }

    function procesarElementoOSM(el) {
      if (el.type !== 'node' || el.lat == null || el.lon == null) return null;
      const tags = el.tags || {};
      const clasificacion = clasificarArbol(tags);
      const { altura, radioCopaM } = estimarDimensionesArbol(tags, clasificacion);
      if (altura <= CONFIG.alturaMinimaM) return null;
      const nombre = tags.species || tags['species:es'] || tags.genus || clasificacion.tipo || 'Árbol';
      return {
        punto: turf.point([el.lon, el.lat]),
        altura,
        radioCopaM,
        nombre,
        forma: clasificacion.forma,
        color: clasificacion.color,
        tipo: clasificacion.tipo,
      };
    }

    async function cargarArbolesDeLaVista() {
      if (!capaVisible || consultaEnCurso) return;
      const bounds = map.getBounds();
      if (anchoVistaKm(bounds) > CONFIG.maxLadoConsultaKm) return;

      const celdas = celdasDeVista(bounds).filter((c) => !celdasConsultadas.has(c));
      if (!celdas.length) { dibujarArbolesVisibles(); return; }

      // Si Overpass está en cooldown, no intentamos más consultas; usamos lo que haya
      if (Date.now() < overpassBackoffHasta) {
        dibujarArbolesVisibles();
        return;
      }

      celdas.forEach((c) => celdasConsultadas.add(c));

      consultaEnCurso = true;
      try {
        const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()];
        const datos = await consultarOverpass(bbox);
        const elementos = datos.elements || [];
        for (const el of elementos) {
          const arbol = procesarElementoOSM(el);
          if (arbol) arbolesGrandes.push(arbol);
          if (arbolesGrandes.length % 200 === 0) await cederAlNavegador();
        }
      } catch (e) {
        console.debug('[arboles-globales] Overpass no disponible ahora mismo:', e.message);
        celdas.forEach((c) => celdasConsultadas.delete(c));
      } finally {
        consultaEnCurso = false;
      }

      dibujarArbolesVisibles();
      programarSincroSombra(true);
    }

    function dibujarArbolesVisibles() {
      if (!map.getSource('arboles-globales-copas') || !capaVisible) return [];
      const b = map.getBounds();
      const enVista = arbolesGrandes.filter((a) => {
        const [lon, lat] = a.punto.geometry.coordinates;
        return lon >= b.getWest() && lon <= b.getEast() && lat >= b.getSouth() && lat <= b.getNorth();
      }).slice(0, CONFIG.maxArbolesEnPantalla);

      const features = [];
      for (const a of enVista) {
        const forma = a.forma || 'redondeada';
        const [lon, lat] = a.punto.geometry.coordinates;

        // Proporciones del tronco y las copas según la forma real del árbol
        let factorTronco = 0.35, factorCopaBaja = 0.40, factorCopaAlta = 0.25;
        if (forma === 'palmera') { factorTronco = 0.80; factorCopaBaja = 0.15; factorCopaAlta = 0.05; }
        else if (forma === 'conica') { factorTronco = 0.45; factorCopaBaja = 0.35; factorCopaAlta = 0.20; }
        else if (forma === 'oval_alargada') { factorTronco = 0.50; factorCopaBaja = 0.30; factorCopaAlta = 0.20; }
        else if (forma === 'ancha_redondeada') { factorTronco = 0.30; factorCopaBaja = 0.45; factorCopaAlta = 0.25; }
        else if (forma === 'ancha_irregular') { factorTronco = 0.32; factorCopaBaja = 0.43; factorCopaAlta = 0.25; }

        const alturaTroncoM = Math.max(1, a.altura * factorTronco);
        const alturaCopaInferiorM = a.altura * factorCopaBaja;
        const alturaCopaSuperiorM = Math.max(0.5, a.altura * factorCopaAlta);
        const radioTroncoM = Math.max(0.15, a.radioCopaM * (forma === 'palmera' ? 0.10 : 0.15));

        const tronco = turf.circle(a.punto, radioTroncoM / 1000, { units: 'kilometers', steps: 8 });
        tronco.properties = { altura: a.altura, baseM: 0, alturaTotalM: alturaTroncoM, nombre: a.nombre, tipo: 'tronco', forma, color: a.color };
        features.push(tronco);

        // Copa inferior: forma realista según especie
        const radioInferior = forma === 'palmera' ? a.radioCopaM * 0.90 : a.radioCopaM;
        const copaInferior = crearFormaCopa(a.punto, radioInferior / 1000, forma, lon, lat);
        copaInferior.properties = { altura: a.altura, baseM: alturaTroncoM, alturaTotalM: alturaTroncoM + alturaCopaInferiorM, nombre: a.nombre, tipo: 'copa', forma, color: a.color };
        features.push(copaInferior);

        // Copa superior: más pequeña y cerrada (salvo palmera)
        const radioSuperior = forma === 'palmera' ? a.radioCopaM * 0.80 : a.radioCopaM * 0.65;
        const formaSuperior = forma === 'palmera' ? 'palmera' : forma === 'conica' ? 'conica' : 'redondeada';
        const copaSuperior = crearFormaCopa(a.punto, radioSuperior / 1000, formaSuperior, lon, lat + 0.0001);
        copaSuperior.properties = { altura: a.altura, baseM: alturaTroncoM + alturaCopaInferiorM, alturaTotalM: a.altura, nombre: a.nombre, tipo: 'copa', forma, color: a.color };
        features.push(copaSuperior);
      }
      map.getSource('arboles-globales-copas').setData(turf.featureCollection(features));
      return enVista;
    }

    /* ---------------- Generación de Sombras Orgánicas ---------------- */

    function pseudoRandom(x, y, seed) {
      const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
      return n - Math.floor(n);
    }

    function crearFormaCopa(centro, radioKm, forma, lon, lat) {
      const pasos = {
        palmera: 28,
        conica: 14,
        oval_alargada: 18,
        ancha_redondeada: 22,
        ancha_irregular: 26,
        redondeada: 18,
      }[forma] || 18;

      const coords = [];
      for (let i = 0; i < pasos; i++) {
        const anguloDeg = (i * 360) / pasos;
        const anguloRad = (anguloDeg * Math.PI) / 180;
        let factorRadio = 1;

        switch (forma) {
          case 'ancha_redondeada':
            factorRadio = 1.0 + 0.22 * Math.cos(2 * anguloRad);
            break;
          case 'ancha_irregular':
            factorRadio = 0.92 + 0.28 * Math.cos(2 * anguloRad) + 0.18 * pseudoRandom(lon, lat, i + 50);
            break;
          case 'conica':
            factorRadio = 0.82 + 0.12 * Math.cos(2 * anguloRad);
            break;
          case 'oval_alargada':
            factorRadio = 0.88 + 0.18 * Math.cos(2 * anguloRad);
            break;
          case 'palmera':
            // Palmera: corona pequeña con palmas que sobresalen
            const esPalma = i % 4 === 0;
            factorRadio = esPalma ? 1.55 : 0.72;
            break;
        }

        // Ruido orgánico general
        factorRadio *= 0.82 + pseudoRandom(lon, lat, i) * 0.30;

        const radioEfectivo = Math.max(0.000001, radioKm * factorRadio);
        const pt = turf.transformTranslate(centro, radioEfectivo, anguloDeg, { units: 'kilometers' }).geometry.coordinates;
        coords.push(pt);
      }
      coords.push(coords[0]);
      return turf.polygon([coords]);
    }

    function crearCopaIrregular(centro, radioKm, lon, lat) {
      return crearFormaCopa(centro, radioKm, 'redondeada', lon, lat);
    }

    function unirDosPoligonos(a, b) {
      try {
        const r = turf.union(turf.featureCollection([a, b]));
        if (r) return r;
      } catch (e) { }
      try {
        const r = turf.union(a, b);
        if (r) return r;
      } catch (e) { }
      return a;
    }

    /* --------- Recorte geométrico: la sombra NUNCA entra en un edificio ---------
       Sombra_Final = Sombra_Proyectada − Planta_Edificio (turf.difference).
       Las plantas se obtienen de la propia capa 3D de edificios ya pintada
       (queryRenderedFeatures), se precalcula su bbox y solo se recorta contra
       los edificios cuya caja toca la de la sombra: O(sombras × edificios)
       en cajas baratas y difference solo cuando hay solape real. */

    function obtenerHuellasEdificios() {
      try {
        const capas = map.getStyle().layers || [];
        const capaEd = capas.find((l) => l.type === 'fill-extrusion' && /building/i.test(l.id));
        if (!capaEd || !map.getLayer(capaEd.id)) return [];
        const vistos = new Set();
        const huellas = [];
        for (const f of map.queryRenderedFeatures({ layers: [capaEd.id] })) {
          if (!f || !f.geometry) continue;
          if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') continue;
          const clave = f.id != null ? f.id : JSON.stringify(f.geometry.coordinates[0] && f.geometry.coordinates[0][0]);
          if (vistos.has(clave)) continue;
          vistos.add(clave);
          try {
            huellas.push({ feature: f, caja: turf.bbox(f) });
          } catch (e) { /* geometría rara: la ignoramos */ }
        }
        return huellas;
      } catch (e) {
        return [];
      }
    }

    function cajasSeTocan(a, b) {
      return !(b[0] > a[2] || b[2] < a[0] || b[1] > a[3] || b[3] < a[1]);
    }

    function restarEdificio(sombra, edificio) {
      // Turf v6 usa FeatureCollection de 2 polígonos; probamos también la
      // firma clásica de 2 argumentos por compatibilidad.
      try {
        const r = turf.difference(turf.featureCollection([sombra, edificio]));
        if (r) return r;
      } catch (e) { /* probamos la otra firma */ }
      try {
        const r = turf.difference(sombra, edificio);
        if (r) return r;
      } catch (e) { /* nos quedamos con la sombra sin recortar */ }
      return sombra;
    }

    function recortarContraEdificios(sombra, huellas) {
      if (!huellas.length) return sombra;
      let resultado = sombra;
      let caja;
      try { caja = turf.bbox(resultado); } catch (e) { return sombra; }
      for (const h of huellas) {
        if (!cajasSeTocan(caja, h.caja)) continue;
        const antes = resultado;
        resultado = restarEdificio(resultado, h.feature);
        if (resultado !== antes) {
          try { caja = turf.bbox(resultado); } catch (e) { return antes; }
        }
      }
      return resultado;
    }

    function calcularSombraArbol(arbol, distanciaKm, bearingSombra) {
      const forma = arbol.forma || 'redondeada';
      const perpendicular = (bearingSombra + 90) % 360;
      const radioTroncoKm = Math.max(arbol.radioCopaM * (forma === 'palmera' ? 0.08 : 0.12), 0.25) / 1000;
      const radioCopaKm = arbol.radioCopaM / 1000;
      const [lon, lat] = arbol.punto.geometry.coordinates;

      const lejano = turf.transformTranslate(arbol.punto, distanciaKm, bearingSombra, { units: 'kilometers' });

      // Copa proyectada: mantiene la silueta realista del tipo de árbol
      const radioProyectado = forma === 'palmera' ? radioCopaKm * 0.85 : radioCopaKm;
      const copaProyectada = crearFormaCopa(lejano, radioProyectado, forma, lon, lat);

      // Para palmeras la sombra es la corona proyectada + una banda fina y
      // alargada: el tronco de la palmera es estrecho pero ALTO, y proyecta
      // una línea de sombra desde la base hasta la corona (falta no tenerla).
      if (forma === 'palmera') {
        const baseRedondeada = turf.circle(arbol.punto, radioTroncoKm, { units: 'kilometers', steps: 8 });
        // Cuna del tronco: base fina (radio del tronco) ensanchándose apenas
        // un poco hacia donde cae la corona (el penacho abre un pelín el haz).
        try {
          const pBaseA = turf.transformTranslate(arbol.punto, radioTroncoKm, perpendicular, { units: 'kilometers' }).geometry.coordinates;
          const pBaseB = turf.transformTranslate(arbol.punto, radioTroncoKm, (perpendicular + 180) % 360, { units: 'kilometers' }).geometry.coordinates;
          const pLejosA = turf.transformTranslate(lejano, radioTroncoKm * 1.6, perpendicular, { units: 'kilometers' }).geometry.coordinates;
          const pLejosB = turf.transformTranslate(lejano, radioTroncoKm * 1.6, (perpendicular + 180) % 360, { units: 'kilometers' }).geometry.coordinates;
          const cunaTronco = turf.polygon([[pBaseA, pLejosA, pLejosB, pBaseB, pBaseA]]);
          return unirDosPoligonos(unirDosPoligonos(cunaTronco, copaProyectada), baseRedondeada);
        } catch (e) {
          return unirDosPoligonos(copaProyectada, baseRedondeada);
        }
      }

      // Cuerpo de la sombra entre el tronco y la copa proyectada
      const pBaseA = turf.transformTranslate(arbol.punto, radioTroncoKm, perpendicular, { units: 'kilometers' }).geometry.coordinates;
      const pBaseB = turf.transformTranslate(arbol.punto, radioTroncoKm, (perpendicular + 180) % 360, { units: 'kilometers' }).geometry.coordinates;

      // Ancho de la cuna según la forma (copas anchas proyectan más volumen lateral)
      const factorAncho = { ancha_redondeada: 0.90, ancha_irregular: 0.85, redondeada: 0.75, conica: 0.55, oval_alargada: 0.60 }[forma] || 0.75;
      const pLejosA = turf.transformTranslate(lejano, radioCopaKm * factorAncho, perpendicular, { units: 'kilometers' }).geometry.coordinates;
      const pLejosB = turf.transformTranslate(lejano, radioCopaKm * factorAncho, (perpendicular + 180) % 360, { units: 'kilometers' }).geometry.coordinates;

      let cuna;
      try {
        cuna = turf.polygon([[pBaseA, pLejosA, pLejosB, pBaseB, pBaseA]]);
      } catch (e) {
        return copaProyectada;
      }

      const baseRedondeada = turf.circle(arbol.punto, radioTroncoKm, { units: 'kilometers', steps: 8 });

      let sombraFinal = unirDosPoligonos(cuna, copaProyectada);
      return unirDosPoligonos(sombraFinal, baseRedondeada);
    }

    let versionSombra = 0;

    // Avisa a la ruta (si existe) de que las sombras de los árboles han
    // cambiado, para que repinte sus tramos cian y el % en ese momento.
    // Debounce corto: el recálculo escribe en lotes y no queremos 15 repintados.
    let avisoRutaSombra = null;
    function avisarARutaDeNuevasSombras() {
      clearTimeout(avisoRutaSombra);
      avisoRutaSombra = setTimeout(() => {
        try { window.manolitAireActualizarSombraRuta?.(); } catch (e) { /* sin ruta activa */ }
      }, 150);
    }

    async function recalcularSombrasArboles() {
      if (!map.getSource('arboles-globales-sombra') || !capaVisible) return;

      if (!sombrasActivadasEnPanel()) {
        map.getSource('arboles-globales-sombra').setData(turf.featureCollection([]));
        avisarARutaDeNuevasSombras();
        return;
      }

      const miVersion = ++versionSombra;

      const centro = obtenerCentroSolar(map);
      const posSol = SunCalc.getPosition(obtenerHoraEfectiva(), centro.lat, centro.lon);

      if (posSol.altitude <= 0) {
        map.getSource('arboles-globales-sombra').setData(turf.featureCollection([]));
        avisarARutaDeNuevasSombras();
        return;
      }

      const azimutGrados = (posSol.azimuth * 180) / Math.PI + 180;
      const bearingSombra = (azimutGrados + 180) % 360;

      const enVista = dibujarArbolesVisibles();
      const paraSombra = enVista.slice(0, CONFIG.maxArbolesConSombra);

      const tangenteSol = Math.tan(posSol.altitude);
      if (!tangenteSol) return;

      // Plantas de los edificios 3D visibles: las sombras se recortan
      // contra ellas para que jamás se dibujen "dentro" de un edificio.
      const huellasEdificios = obtenerHuellasEdificios();

      const sombras = [];
      for (let i = 0; i < paraSombra.length; i += CONFIG.loteSombraSize) {
        if (miVersion !== versionSombra) return;
        const lote = paraSombra.slice(i, i + CONFIG.loteSombraSize);
        for (const arbol of lote) {
          const longitudSombraM = arbol.altura / tangenteSol;
          if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;
          const distanciaKm = longitudSombraM / 1000;
          let volumen = calcularSombraArbol(arbol, distanciaKm, bearingSombra);
          if (volumen) volumen = recortarContraEdificios(volumen, huellasEdificios);
          if (volumen) sombras.push(volumen);
        }
        if (miVersion !== versionSombra) return;
        map.getSource('arboles-globales-sombra')?.setData(turf.featureCollection(sombras));
        avisarARutaDeNuevasSombras();
        if (i + CONFIG.loteSombraSize < paraSombra.length) await cederAlNavegador();
      }
    }

    let temporizadorSombra = null;
    function programarSincroSombra(inmediato) {
      clearInterval(temporizadorSombra);
      if (inmediato) recalcularSombrasArboles();
      temporizadorSombra = setInterval(() => {
        if (document.hidden) return; // pestaña oculta: no recalcular nada
        recalcularSombrasArboles();
      }, CONFIG.sincroSombraMs);
    }

    let esperaMoveend = null;
    map.on('moveend', () => {
      clearTimeout(esperaMoveend);
      esperaMoveend = setTimeout(() => {
        cargarArbolesDeLaVista();
        recalcularSombrasArboles();
      }, CONFIG.esperaMoveendMs);
    });

    window.manolitAireRecalcularArboles = recalcularSombrasArboles;

    await cargarArbolesDeLaVista();
    recalcularSombrasArboles();
  }
})();