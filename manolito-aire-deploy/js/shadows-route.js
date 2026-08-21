/* ============================================================
   MANOLIT AIRE — Ruta real + Sombras 3D reales + AQI (origen)
   Stack: MapLibre GL JS (edificios 3D + capas) + SunCalc (sol)
   + Turf.js (geometría de sombra) + OSRM (ruta por calles)

   v2 añade: slider de tiempo (hoy / solsticios), vuelo de
   entrada cinemática, botón de captura de imagen, sombras por
   volumen de barrido real (no aproximación por envolvente
   convexa), halo de "feather" en el borde de la sombra, aviso
   de hora dorada/azul, caché de edificios (el slider no vuelve
   a consultar el mapa en cada movimiento) y navegación por
   teclado en las sugerencias de direccion.

   FIX: Eliminado preserveDrawingBuffer. Captura de vista por
   evento 'render'. Integrado motor 3D FreeCameraOptions para
   paseo virtual libre sin error de maxPitch o intersección 2D.

   v3 (esta revisión) — arreglo del paseo virtual 3D:
   - Se guarda y se restaura correctamente el estado de cámara
     (centro/zoom/pitch/bearing/maxPitch) al entrar y salir del
     paseo, en vez de dejar el mapa "roto" pegado al suelo.
   - El paseo y la "caminata GPS" ahora se excluyen mutuamente
     (antes podían chocar: easeTo() de la caminata peleaba cada
     frame contra setFreeCameraOptions() del paseo).
   - Durante el paseo se refresca periódicamente la caché de
     edificios y se recalculan las sombras según la posición
     virtual del jugador, así que las sombras 3D también se ven
     mientras caminas (antes solo se actualizaban con moveend,
     evento que no se dispara en modo cámara libre).
   - Corregido el id de la fuente de precisión de ubicación:
     estaba duplicado como 'precision-ubicación' (con tilde) al
     crearlo y 'precision-ubicacion' (sin tilde) al usarlo, así
     que el círculo de precisión nunca se pintaba ni se borraba.
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
    // ----- Modo peatón virtual (cámara libre, sin GPS real) -----
    paseoAlturaOjoM: 1.7,
    paseoVelocidadMs: 3.5,
    paseoVelocidadGiro: 2.2,
    paseoLookAheadM: 25,
    paseoMaxPitch: 85, // Límite estricto de MapLibre
    paseoSincroMs: 450, // Cada cuánto se refrescan edificios/sombras mientras caminas
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
    map.addLayer({
      id: 'capa-ruta',
      type: 'line',
      source: 'ruta',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': leerVar('--accent') || '#00f2ff', 'line-width': 5, 'line-opacity': 0.9 },
    });

    map.addSource('ruta-sombra', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer({
      id: 'capa-ruta-sombra',
      type: 'line',
      source: 'ruta-sombra',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#0e5439', 'line-width': 5, 'line-opacity': 0.95 },
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
        'circle-stroke-color': '#1b2029',
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
        background:rgba(10,10,12,0.88); backdrop-filter:blur(8px);
        border:1px solid rgba(255,255,255,0.12); border-radius:999px;
        padding:6px 10px 6px 14px; font-size:11.5px; color:#e9e4d8;
        box-shadow:0 8px 18px rgba(0,0,0,.28); max-width:calc(100vw - 24px);
        white-space:nowrap;
      }
      #rsShadowBadge.rs-visible{ display:inline-flex; }
      #rsShadowBadgeCerrar{
        background:transparent; border:none; color:#999; font-size:15px;
        cursor:pointer; line-height:1; padding:0 2px;
      }
      #rsShadowBadgeCerrar:hover{ color:#fff; }
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
  }

  function inyectarEstilosPanel() {
    if (document.getElementById('rsPanelEstilos')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rsPanelEstilos';
    estilo.textContent = `
      #rsTimeControls{
        --rs-metal-1:#1b2029; --rs-metal-2:#262c38; --rs-latón:#c98a4b;
        --rs-latón-vivo:#e7b06a; --rs-verdigris:#6f9c8b; --rs-hueso:#e9e4d8;
        position:absolute; left:12px; bottom:12px; z-index:5; width:246px;
        background:linear-gradient(160deg,var(--rs-metal-2),var(--rs-metal-1) 70%);
        border-radius:3px 16px 3px 16px;
        border:1px solid #00000055; border-left:2px solid var(--rs-latón);
        box-shadow:0 12px 28px rgba(0,0,0,.32), inset 0 1px 0 #ffffff0c;
        padding:13px 15px; font-family:inherit; color:var(--rs-hueso);
        transition:opacity .18s ease, transform .18s ease;
      }
      #rsTimeControls.rs-cerrado{ padding-bottom:13px; }
      #rsTimeControls .rs-cuerpo{ overflow:hidden; }
      #rsTimeControls.rs-cerrado .rs-cuerpo{ display:none; }
      #rsTimeControls .rs-fila{ display:flex; align-items:center; gap:10px; }
      #rsTimeControls .rs-cabecera{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
      #rsTimeControls.rs-cerrado .rs-cabecera{ margin-bottom:0; }
      #rsTimeControls:not(.rs-cerrado) .rs-cabecera{ margin-bottom:10px; }
      #rsTimeControls .rs-eyebrow{
        font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--rs-latón);
        font-weight:700; opacity:.9;
      }
      #rsPlegarBtn{
        appearance:none; border:none; background:transparent; color:var(--rs-hueso);
        cursor:pointer; padding:2px 4px; opacity:.75; line-height:0;
      }
      #rsPlegarBtn:hover{ opacity:1; }
      #rsPlegarBtn svg{ display:block; transition:transform .2s ease; }
      #rsTimeControls.rs-cerrado #rsPlegarBtn svg{ transform:rotate(180deg); }
      #rsTimeLabel{
        font-family:'Space Mono',ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;
        font-size:15px; letter-spacing:.03em; color:var(--rs-hueso); white-space:nowrap;
      }
      #rsGoldenBadge{
        font-size:10px; font-weight:700; letter-spacing:.04em; padding:3px 8px 3px 6px;
        border-radius:3px; border:1px solid transparent; white-space:nowrap;
        display:inline-flex; align-items:center; gap:5px;
      }
      #rsGoldenBadge::before{ content:''; width:6px; height:6px; border-radius:50%; background:currentColor; }
      #rsTimeControls .rs-divisor{
        height:1px; margin:10px 0; background:repeating-linear-gradient(90deg,#c98a4b55 0 4px,transparent 4px 8px);
      }
      #rsTimeSlider{
        -webkit-appearance:none; appearance:none; width:100%; height:16px; background:transparent; cursor:pointer; margin:6px 0 2px;
      }
      #rsTimeSlider::-webkit-slider-runnable-track{
        height:3px; background:linear-gradient(90deg,var(--rs-latón),#00000000),#3a4150; border-radius:2px;
      }
      #rsTimeSlider::-webkit-slider-thumb{
        -webkit-appearance:none; margin-top:-6px; width:15px; height:15px; border-radius:50%;
        background:var(--rs-latón-vivo); border:2px solid #1b2029; box-shadow:0 0 0 3px #e7b06a2e;
      }
      #rsTimeSlider::-moz-range-track{ height:3px; background:#3a4150; border-radius:2px; }
      #rsTimeSlider::-moz-range-progress{ height:3px; background:var(--rs-latón); border-radius:2px; }
      #rsTimeSlider::-moz-range-thumb{
        width:15px; height:15px; border-radius:50%; background:var(--rs-latón-vivo); border:2px solid #1b2029;
      }
      #rsTimeControls .rs-botones{ display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
      #rsTimeControls button{
        flex:1; min-width:0; font-size:10.5px; letter-spacing:.05em; text-transform:uppercase;
        padding:7px 6px; border-radius:2px; border:1px solid #ffffff1f; background:#00000026;
        color:var(--rs-hueso); cursor:pointer; font-weight:700; transition:background .15s,border-color .15s;
      }
      #rsTimeControls button:hover{ background:#c98a4b22; border-color:#c98a4b66; }
      #rsTimeControls button:active{ background:#c98a4b3a; }
      #rsTimeControls button.rs-btn-capturar{ flex-basis:100%; color:var(--rs-latón-vivo); border-color:#c98a4b44; }
      @media (max-width:480px){ #rsTimeControls{ width:calc(100vw - 24px); max-width:250px; } }
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
        position:absolute; left:12px; top:12px; z-index:5; display:flex; gap:6px; flex-wrap:wrap;
      }
      #rsMapControls button{
        font-family:inherit; font-size:10.5px; letter-spacing:.05em; text-transform:uppercase;
        font-weight:700; padding:8px 11px; border-radius:3px 12px 3px 12px;
        border:1px solid #ffffff1f; border-left:2px solid #c98a4b;
        background:linear-gradient(160deg,#262c38,#1b2029 70%); color:#e9e4d8;
        cursor:pointer; box-shadow:0 8px 18px rgba(0,0,0,.28); transition:background .15s,border-color .15s;
      }
      #rsMapControls button:hover{ background:#c98a4b22; }
      #rsMapControls button.rs-activo{ border-left-color:#e7b06a; color:#e7b06a; }
      @media (max-width:480px){ #rsMapControls button{ padding:7px 8px; font-size:9.5px; } }

      /* Joystick virtual para paseo 3D */
      #rsJoystick{
        position:absolute; right:24px; bottom:24px; width:96px; height:96px;
        border-radius:50%; background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.15); touch-action:none;
        z-index:6; display:none; pointer-events:auto;
      }
      #rsJoystickKnob{
        position:absolute; left:50%; top:50%; width:38px; height:38px;
        transform:translate(-50%,-50%); border-radius:50%;
        background:rgba(201,138,75,0.85); border:2px solid #e9e4d8;
        box-shadow:0 4px 12px rgba(0,0,0,.35); touch-action:none;
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
    }

    function loopPaseo(now) {
      if (!paseoActivo) return;
      const dt = Math.min(0.05, (now - paseoUltimoFrame) / 1000);
      paseoUltimoFrame = now;

      let avance = 0;
      let giro = 0;

      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) avance += 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) avance -= 1;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) giro -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) giro += 1;

      if (paseoJoystick.active) {
        avance = -paseoJoystick.dy;
        giro = paseoJoystick.dx * 0.6;
      }

      if (giro !== 0) {
        paseoJugador.bearing += giro * 100 * dt;
      }

      if (avance !== 0) {
        const step = avance * CONFIG.paseoVelocidadMs * dt;
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
        font-family:inherit; font-size:10.5px; letter-spacing:.05em; text-transform:uppercase;
        font-weight:700; padding:8px 12px; border-radius:12px 3px 12px 3px;
        border:1px solid #ffffff1f; border-right:2px solid #c98a4b;
        background:linear-gradient(160deg,#262c38,#1b2029 70%); color:#e9e4d8;
        cursor:pointer; box-shadow:0 8px 18px rgba(0,0,0,.28);
      }
      #rsMapStyleToggle button:hover{ background:#c98a4b22; }
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
    tSombras?.addEventListener('change', () => { asegurarActivacionSolar(); recalcularSombrasVisibles(); });
    tRuta?.addEventListener('change', () => {
      map.setLayoutProperty('capa-ruta', 'visibility', tRuta.checked ? 'visible' : 'none');
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

  document.getElementById('themeToggle')?.addEventListener('click', () => setTimeout(() => {
    if (map.getLayer('capa-ruta')) map.setPaintProperty('capa-ruta', 'line-color', leerVar('--accent'));
  }, 50));

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
