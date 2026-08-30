/* ============================================================
   MICROCLIMA GLOBAL — capa opcional de temperatura de superficie
   v2 RENDIMIENTO: nunca congela la página.
   ------------------------------------------------------------
   Qué pinta: un mapa de calor (azul = fresco, rojo = caliente)
   sobre el mapa de sombras 3D, estimando la temperatura del suelo
   con tres fuentes GRATIS y honestas:

     1) Open-Meteo  -> temperatura base del aire (1 llamada / 15 min)
     2) El propio mapa -> tipo de superficie leído de los tiles
        vectoriales YA CARGADOS (cero llamadas extra a Overpass)
     3) El motor de sombras existente -> si el punto está en sombra,
        se atenúa el calentamiento solar

   HONESTIDAD: esto es una ESTIMACIÓN por modelo (literatura de isla
   de calor urbana), NO una medición por satélite. La leyenda lo dice.

   POR QUÉ ESTA V2 NO SE CUELGA (la v1 sí):
   - La v1 llamaba a queryRenderedFeatures POR CADA CELDA (miles de
     llamadas, cada una escanea todo lo renderizado -> minutos de
     bloqueo y diálogo de "página no responde").
   - La v2 hace UNA ÚNICA consulta por todo el viewport, indexa los
     polígonos por su caja (bbox) y luego cada celda solo comprueba
     los 1-5 polígonos candidatos. Además procesa POR TANDAS con
     pausas (cede el hilo al navegador) y ABORTA si el mapa se mueve
     antes de terminar. Resultado: fluido incluso en móvil.
   ============================================================ */

(function () {
  'use strict';

  /* ---- CONSTANTES AJUSTABLES (literatura UHI) ---- */
  const OFFSET_SUPERFICIE = {
    asfalto: 16,          // punto medio +12 a +20 °C en sol directo
    edificio: 14,         // punto medio +10 a +18
    suelo_desnudo: 7,     // punto medio +5 a +10
    vegetacion_baja: 1.5, // punto medio 0 a +3
    bosque: -6,           // enfriamiento por copa arbórea
    agua: -3.5,           // efecto moderador del agua
    urbano_generico: 10   // fallback si el punto no clasifica
  };
  const FACTOR_SOMBRA = 0.21;        // atenuación media en sombra (inercia 5-30 min)
  const REJILLA_PX = 30;             // celda del mapa de calor (más grande = más rápido)
  const CACHE_TEMP_MS = 15 * 60000;  // temperatura base: máximo 1 llamada / 15 min
  const DEBOUNCE_MS = 400;
  const FILAS_POR_TANDA = 6;         // filas de rejilla por tanda antes de ceder el hilo

  let mapa = null;
  let tempBaseCache = { valor: null, ts: 0, lat: null, lon: null };
  let temporizador = null;
  let activo = false;
  let versionCalculo = 0;            // para abortar cálculos viejos

  /* ---- índice espacial simple: cajas (bbox) por tipo ---- */

  function construirIndiceSuperficie() {
    // UNA sola consulta para todo el viewport (esto es lo que la v1
    // hacía miles de veces). Clasificamos cada polígono UNA vez.
    const idx = { agua: [], bosque: [], vegetacion_baja: [], edificio: [], asfalto: [], suelo_desnudo: [] };
    let feats = [];
    try { feats = mapa.queryRenderedFeatures() || []; } catch (e) { return idx; }

    const vistos = new Set();
    for (const f of feats) {
      if (!f.geometry || (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon')) continue;
      const sl = (f.sourceLayer || '').toLowerCase();
      const cls = ((f.properties && (f.properties.class || f.properties.subclass)) || '').toLowerCase();
      const lay = ((f.layer && f.layer.id) || '').toLowerCase();

      let tipo = null;
      if (sl === 'water' || lay.includes('water')) tipo = 'agua';
      else if (cls === 'wood' || cls === 'forest') tipo = 'bosque';
      else if (['park', 'grass', 'garden', 'meadow', 'cemetery', 'pitch', 'playground', 'village_green', 'recreation_ground'].includes(cls)) tipo = 'vegetacion_baja';
      else if (sl === 'building' || lay.includes('building')) tipo = 'edificio';
      else if (sl === 'transportation' || lay.includes('road')) tipo = 'asfalto';
      else if (cls === 'bare_rock' || cls === 'sand' || cls === 'bare_soil') tipo = 'suelo_desnudo';
      if (!tipo) continue;

      // la misma geometría puede salir duplicada por tiles: deduplicar
      let clave;
      try { clave = tipo + JSON.stringify(f.geometry.coordinates).slice(0, 120); } catch (e) { continue; }
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      try { idx[tipo].push({ bbox: turf.bbox(f), geo: f }); } catch (e) { /* geometría rara: fuera */ }
    }

    // Copas de árboles del propio motor = microclima de bosque urbano
    try {
      const copas = mapa.querySourceFeatures('arboles-globales-copas') || [];
      for (const f of copas) {
        if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
          try { idx.bosque.push({ bbox: turf.bbox(f), geo: f }); } catch (e) {}
        }
      }
    } catch (e) { /* fuente de árboles aún no existe */ }

    return idx;
  }

  function construirIndiceSombras() {
    const lista = [];
    for (const src of ['sombras', 'arboles-globales-sombra']) {
      try {
        const feats = mapa.querySourceFeatures(src) || [];
        for (const f of feats) {
          if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
            try { lista.push({ bbox: turf.bbox(f), geo: f }); } catch (e) {}
          }
        }
      } catch (e) { /* fuente no lista */ }
    }
    return lista;
  }

  function enPoligono(lista, lng, lat) {
    // solo comprueba polígonos cuya caja contiene el punto (casi ninguno)
    for (const p of lista) {
      const b = p.bbox;
      if (lng < b[0] || lat < b[1] || lng > b[2] || lat > b[3]) continue;
      try {
        if (turf.booleanPointInPolygon(turf.point([lng, lat]), p.geo)) return true;
      } catch (e) {}
    }
    return false;
  }

  function clasificarPunto(idx, lng, lat) {
    if (enPoligono(idx.agua, lng, lat)) return 'agua';
    if (enPoligono(idx.bosque, lng, lat)) return 'bosque';
    if (enPoligono(idx.vegetacion_baja, lng, lat)) return 'vegetacion_baja';
    if (enPoligono(idx.edificio, lng, lat)) return 'edificio';
    if (enPoligono(idx.asfalto, lng, lat)) return 'asfalto';
    if (enPoligono(idx.suelo_desnudo, lng, lat)) return 'suelo_desnudo';
    return 'urbano_generico';
  }

  async function obtenerTempBase() {
    const c = mapa.getCenter();
    const ahora = Date.now();
    const mismaZona = tempBaseCache.lat !== null &&
      Math.abs(tempBaseCache.lat - c.lat) < 0.25 && Math.abs(tempBaseCache.lon - c.lng) < 0.25;
    if (tempBaseCache.valor !== null && mismaZona && ahora - tempBaseCache.ts < CACHE_TEMP_MS) {
      return tempBaseCache.valor;
    }
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat.toFixed(3)}&longitude=${c.lng.toFixed(3)}&current=temperature_2m`;
      const r = await fetch(url);
      if (!r.ok) throw new Error('Open-Meteo ' + r.status);
      const d = await r.json();
      const t = Number(d && d.current && d.current.temperature_2m);
      if (!isFinite(t)) throw new Error('sin temperatura');
      tempBaseCache = { valor: t, ts: ahora, lat: c.lat, lon: c.lng };
      return t;
    } catch (e) {
      return tempBaseCache.valor; // null si nunca hubo: no pintamos
    }
  }

  function colorPara(t, tMin, tMax) {
    const x = Math.max(0, Math.min(1, (t - tMin) / (tMax - tMin || 1)));
    const h = 220 - 220 * x; // 220° azul (fresco) -> 0° rojo (caliente)
    return `hsl(${h.toFixed(0)}, 85%, 55%)`;
  }

  const ceder = () => new Promise(r => setTimeout(r, 0));

  /* ---- ciclo principal: POR TANDAS y con aborto ---- */

  async function recalcular() {
    if (!activo || !mapa) return;
    const miVersion = ++versionCalculo;

    const tBase = await obtenerTempBase();
    if (!activo || miVersion !== versionCalculo || tBase === null) return;

    const idx = construirIndiceSuperficie();
    const sombras = construirIndiceSombras();
    if (miVersion !== versionCalculo) return;

    let nubes = 0;
    try { nubes = (typeof window.manolitAireNubosidad === 'function') ? window.manolitAireNubosidad() : 0; } catch (e) {}
    const factorSol = 1 - Math.max(0, Math.min(100, nubes)) / 100 * 0.6;

    const canvas = document.getElementById('microclima-canvas');
    if (!canvas) return;
    const w = mapa.getCanvas().width, h = mapa.getCanvas().height;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    // Pasada 1 (por tandas): temperatura por celda + rango para normalizar
    const celdas = [];
    let tMin = Infinity, tMax = -Infinity, fila = 0;
    for (let y = REJILLA_PX / 2; y < h; y += REJILLA_PX) {
      for (let x = REJILLA_PX / 2; x < w; x += REJILLA_PX) {
        const lngLat = mapa.unproject([x, y]);
        const tipo = clasificarPunto(idx, lngLat.lng, lngLat.lat);
        let t = tBase + OFFSET_SUPERFICIE[tipo] * factorSol;
        if (enPoligono(sombras, lngLat.lng, lngLat.lat)) t = t * (1 - FACTOR_SOMBRA);
        celdas.push({ x, y, t });
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
      }
      fila++;
      if (fila % FILAS_POR_TANDA === 0) {
        await ceder();                       // cede el hilo: la página respira
        if (miVersion !== versionCalculo) return; // el mapa se movió: aborta
      }
    }

    // Pasada 2: pintar (rápida, solo dibujo)
    const radio = REJILLA_PX * 0.72;
    for (const c of celdas) {
      ctx.fillStyle = colorPara(c.t, tMin, tMax);
      ctx.beginPath();
      ctx.arc(c.x, c.y, radio, 0, Math.PI * 2);
      ctx.fill();
    }
    if (miVersion !== versionCalculo) return;

    const coords = [
      mapa.unproject([0, 0]).toArray(),
      mapa.unproject([w, 0]).toArray(),
      mapa.unproject([w, h]).toArray(),
      mapa.unproject([0, h]).toArray()
    ];
    const url = canvas.toDataURL('image/png');
    const src = mapa.getSource('microclima');
    if (src) {
      src.updateImage({ url, coordinates: coords });
    } else {
      mapa.addSource('microclima', { type: 'image', url, coordinates: coords });
      let antesDe = null;
      try {
        const capas = mapa.getStyle().layers;
        const capaRef = capas.find(l => l.id === 'sombras-relleno' || l.id === 'edificios-3d' || l.id === 'building-3d');
        if (capaRef) antesDe = capaRef.id;
      } catch (e) {}
      mapa.addLayer({
        id: 'microclima-capa',
        type: 'raster',
        source: 'microclima',
        paint: { 'raster-opacity': 0.45, 'raster-fade-duration': 0 }
      }, antesDe || undefined);
    }
    actualizarLeyenda(tMin, tMax);
  }

  /* ---- leyenda PLEGABLE: solo el icono ⓘ despliega la nota ---- */

  let notaVisible = false;

  function actualizarLeyenda(tMin, tMax) {
    const leyenda = document.getElementById('microclima-leyenda');
    if (!leyenda) return;
    leyenda.style.display = 'block';
    leyenda.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;font-weight:600;">' +
        '<span>Microclima</span>' +
        '<button id="microclima-info-btn" aria-expanded="false" title="Qué es esta capa" ' +
        'style="pointer-events:auto;cursor:pointer;border:1px solid rgba(255,255,255,0.4);background:transparent;' +
        'color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;line-height:1;padding:0;">i</button>' +
      '</div>' +
      '<div style="height:7px;border-radius:4px;margin-top:4px;background:linear-gradient(90deg,hsl(220,85%,55%),hsl(120,85%,55%),hsl(60,85%,55%),hsl(0,85%,55%));"></div>' +
      `<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px;"><span>${tMin.toFixed(0)}°C</span><span>${tMax.toFixed(0)}°C</span></div>` +
      '<div id="microclima-nota" style="display:' + (notaVisible ? 'block' : 'none') + ';font-size:9px;opacity:0.75;margin-top:3px;line-height:1.25;">' +
        'Estimación por modelo (tipo de superficie + sombra + nubosidad), no medición por satélite.' +
      '</div>';

    const btn = document.getElementById('microclima-info-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        notaVisible = !notaVisible;
        const nota = document.getElementById('microclima-nota');
        if (nota) nota.style.display = notaVisible ? 'block' : 'none';
        btn.setAttribute('aria-expanded', notaVisible ? 'true' : 'false');
      });
    }
  }

  function crearLeyenda() {
    if (document.getElementById('microclima-leyenda')) return;
    const wrap = document.querySelector('.map-wrap') || document.body;
    const div = document.createElement('div');
    div.id = 'microclima-leyenda';
    div.style.cssText = 'display:none;position:absolute;left:10px;bottom:10px;z-index:5;width:150px;' +
      'background:rgba(10,15,25,0.82);color:#fff;padding:7px 9px;border-radius:10px;' +
      'font-family:inherit;font-size:11px;pointer-events:none;backdrop-filter:blur(4px);';
    wrap.appendChild(div);
    if (!document.getElementById('microclima-canvas')) {
      const lienzo = document.createElement('canvas');
      lienzo.id = 'microclima-canvas';
      lienzo.style.display = 'none';
      document.body.appendChild(lienzo);
    }
  }

  function encender() {
    activo = true;
    crearLeyenda();
    recalcular();
  }

  function apagar() {
    activo = false;
    versionCalculo++; // aborta cualquier cálculo en curso
    clearTimeout(temporizador);
    try { if (mapa.getLayer('microclima-capa')) mapa.removeLayer('microclima-capa'); } catch (e) {}
    try { if (mapa.getSource('microclima')) mapa.removeSource('microclima'); } catch (e) {}
    const leyenda = document.getElementById('microclima-leyenda');
    if (leyenda) leyenda.style.display = 'none';
  }

  function alMoverse() {
    if (!activo) return;
    versionCalculo++; // el cálculo anterior muere aquí
    clearTimeout(temporizador);
    temporizador = setTimeout(recalcular, DEBOUNCE_MS);
  }

  /* ---- arranque: espera a que el mapa de sombras exista ---- */
  function iniciar() {
    mapa = window.manolitAireMap;
    if (!mapa || typeof turf === 'undefined') { setTimeout(iniciar, 500); return; }
    const toggle = document.getElementById('rsToggleMicroclima');
    if (!toggle) { setTimeout(iniciar, 500); return; }

    toggle.addEventListener('change', () => (toggle.checked ? encender() : apagar()));
    mapa.on('moveend', alMoverse);
    const slider = document.getElementById('rsHoraSlider') || document.querySelector('input[type="range"]');
    if (slider) slider.addEventListener('input', alMoverse);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();