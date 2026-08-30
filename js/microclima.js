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

   CAMBIOS DE ESTA REVISIÓN (a petición):
   - La leyenda se mueve a la esquina INFERIOR DERECHA (antes
     izquierda), para no tapar la barra de horarios/ruta.
   - La leyenda ahora tiene un botón "×" para CERRARLA sin apagar
     la capa: el microclima sigue activo en el mapa, solo se oculta
     la cajita. Queda un botón circular pequeño para reabrirla.
<<<<<<< HEAD
=======

   CAMBIOS v3 (a petición):
   - La leyenda nace OCULTA: solo se ve el botón 🌡. Se abre solo
     si el usuario quiere verla, y su elección se recuerda.
   - RELOJ SOLAR: la capa solo se calcula con el reloj en PASADO
     o PRESENTE (datos reales). Si el reloj marca futuro, la capa
     se oculta sola y el botón cambia a ⏳: la estimación futura
     aún no está disponible.
>>>>>>> b1d1cb9df495f81015692af3fd5c9a5aa3eecca0
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
<<<<<<< HEAD
=======
    if (esFuturo) return; // reloj solar en el futuro: no hay datos reales — no calcular
>>>>>>> b1d1cb9df495f81015692af3fd5c9a5aa3eecca0
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

  /* ---- leyenda: esquina inferior DERECHA, con botón de cerrar ---- */

  let notaVisible = false;
<<<<<<< HEAD
  let leyendaCerrada = false;      // el usuario la cerró con la "×"
=======
  // v3: la leyenda nace OCULTA — solo se ve si el usuario pulsa
  // el botón 🌡 (él decide cuándo verla; su elección se recuerda).
  let leyendaCerrada = true;
  try { leyendaCerrada = localStorage.getItem('manolito_microclima_leyenda') !== '1'; } catch (e) { /* sin almacenamiento */ }
>>>>>>> b1d1cb9df495f81015692af3fd5c9a5aa3eecca0
  let ultimoRango = null;          // último {tMin, tMax} para redibujar al reabrir

  function pintarLeyendaAbierta(tMin, tMax) {
    const leyenda = document.getElementById('microclima-leyenda');
    if (!leyenda) return;
    leyenda.style.pointerEvents = 'auto';
    leyenda.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-weight:600;">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span>Microclima</span>' +
          '<button id="microclima-info-btn" aria-expanded="false" title="Qué es esta capa" ' +
          'style="pointer-events:auto;cursor:pointer;border:1px solid rgba(255,255,255,0.4);background:transparent;' +
          'color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;line-height:1;padding:0;">i</button>' +
        '</div>' +
        '<button id="microclima-cerrar-btn" title="Ocultar (la capa sigue activa en el mapa)" ' +
        'style="pointer-events:auto;cursor:pointer;border:none;background:transparent;color:#fff;' +
        'opacity:0.75;font-size:15px;line-height:1;padding:0 2px;">×</button>' +
      '</div>' +
      '<div style="height:7px;border-radius:4px;margin-top:4px;background:linear-gradient(90deg,hsl(220,85%,55%),hsl(120,85%,55%),hsl(60,85%,55%),hsl(0,85%,55%));"></div>' +
      `<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px;"><span>${tMin.toFixed(0)}°C</span><span>${tMax.toFixed(0)}°C</span></div>` +
      '<div id="microclima-nota" style="display:' + (notaVisible ? 'block' : 'none') + ';font-size:9px;opacity:0.75;margin-top:3px;line-height:1.25;">' +
<<<<<<< HEAD
        'Estimación por modelo (tipo de superficie + sombra + nubosidad), no medición por satélite.' +
      '</div>';
=======
        'Estimación por modelo (tipo de superficie + sombra + nubosidad), no medición por satélite. Solo con el reloj solar en pasado o presente.' +
      '</div>' +
      (esFuturo
        ? '<div style="color:#ffd27a;font-size:9px;margin-top:3px;line-height:1.25;">⏳ Reloj solar en el futuro: estimación no disponible. La capa se ha ocultado hasta volver al pasado o al presente.</div>'
        : '');
>>>>>>> b1d1cb9df495f81015692af3fd5c9a5aa3eecca0

    const btnInfo = document.getElementById('microclima-info-btn');
    if (btnInfo) {
      btnInfo.addEventListener('click', (ev) => {
        ev.stopPropagation();
        notaVisible = !notaVisible;
        const nota = document.getElementById('microclima-nota');
        if (nota) nota.style.display = notaVisible ? 'block' : 'none';
        btnInfo.setAttribute('aria-expanded', notaVisible ? 'true' : 'false');
      });
    }
    const btnCerrar = document.getElementById('microclima-cerrar-btn');
    if (btnCerrar) {
      btnCerrar.addEventListener('click', (ev) => {
        ev.stopPropagation();
        leyendaCerrada = true;
<<<<<<< HEAD
=======
        try { localStorage.setItem('manolito_microclima_leyenda', '0'); } catch (e) {}
>>>>>>> b1d1cb9df495f81015692af3fd5c9a5aa3eecca0
        pintarLeyendaCerrada();
      });
    }
  }

  function pintarLeyendaCerrada() {
    const leyenda = document.getElementById('microclima-leyenda');
    if (!leyenda) return;
    leyenda.style.width = 'auto';
    leyenda.style.padding = '0';
    leyenda.style.background = 'transparent';
    leyenda.style.backdropFilter = 'none';
    leyenda.style.pointerEvents = 'auto';
    leyenda.innerHTML =
      '<button id="microclima-reabrir-btn" title="Mostrar leyenda de microclima" ' +
      'style="pointer-events:auto;cursor:pointer;border:1px solid rgba(255,255,255,0.4);' +
      'background:rgba(10,15,25,0.82);color:#fff;border-radius:50%;width:28px;height:28px;' +
      'font-size:14px;line-height:1;backdrop-filter:blur(4px);">🌡</button>';
    const btn = document.getElementById('microclima-reabrir-btn');
    if (btn) {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        leyendaCerrada = false;
<<<<<<< HEAD
=======
        try { localStorage.setItem('manolito_microclima_leyenda', '1'); } catch (e) {}
>>>>>>> b1d1cb9df495f81015692af3fd5c9a5aa3eecca0
        leyenda.style.width = '150px';
        leyenda.style.padding = '7px 9px';
        leyenda.style.background = 'rgba(10,15,25,0.82)';
        leyenda.style.backdropFilter = 'blur(4px)';
        if (ultimoRango) pintarLeyendaAbierta(ultimoRango.tMin, ultimoRango.tMax);
      });
    }
  }

  function actualizarLeyenda(tMin, tMax) {
    const leyenda = document.getElementById('microclima-leyenda');
    if (!leyenda) return;
    leyenda.style.display = 'block';
    ultimoRango = { tMin, tMax };
    if (leyendaCerrada) {
      pintarLeyendaCerrada();
    } else {
      pintarLeyendaAbierta(tMin, tMax);
    }
  }

  function crearLeyenda() {
    if (document.getElementById('microclima-leyenda')) return;
    const wrap = document.querySelector('.map-wrap') || document.body;
    const div = document.createElement('div');
    div.id = 'microclima-leyenda';
    // Esquina inferior DERECHA (antes izquierda: tapaba la barra de horarios/ruta)
    div.style.cssText = 'display:none;position:absolute;right:10px;bottom:10px;z-index:5;width:150px;' +
      'background:rgba(10,15,25,0.82);color:#fff;padding:7px 9px;border-radius:10px;' +
      'font-family:inherit;font-size:11px;pointer-events:auto;backdrop-filter:blur(4px);';
    wrap.appendChild(div);
    if (!document.getElementById('microclima-canvas')) {
      const lienzo = document.createElement('canvas');
      lienzo.id = 'microclima-canvas';
      lienzo.style.display = 'none';
      document.body.appendChild(lienzo);
    }
  }

<<<<<<< HEAD
  function encender() {
    activo = true;
    leyendaCerrada = false; // al activar, que se vea; el usuario ya sabe cómo cerrarla
    crearLeyenda();
=======
  /* ---- sincronización con el reloj solar: SOLO pasado y presente ----
     La capa se calcula con la meteorología ACTUAL y las sombras del
     momento que marca el reloj solar. Si el usuario mueve el reloj
     al FUTURO todavía no existen datos reales: la capa se oculta y
     el botón 🌡 cambia a ⏳ para explicarlo. Al volver al pasado o
     al presente, la capa reaparece y se recalcula sola. */
  let esFuturo = false;
  let temporizadorReloj = null;

  function horaEsFutura() {
    try {
      if (typeof window.manolitAireHoraEfectiva !== 'function') return false;
      const h = window.manolitAireHoraEfectiva();
      const ms = (h instanceof Date) ? h.getTime() : new Date(h).getTime();
      if (!isFinite(ms)) return false;
      return ms > Date.now() + 5 * 60 * 1000; // margen de 5 minutos
    } catch (e) { return false; }
  }

  function aplicarVisibilidadPorReloj() {
    try {
      if (mapa && mapa.getLayer('microclima-capa')) {
        mapa.setLayoutProperty('microclima-capa', 'visibility', esFuturo ? 'none' : 'visible');
      }
    } catch (e) { /* la capa aún no existe */ }
    const chip = document.getElementById('microclima-reabrir-btn');
    if (chip) {
      chip.textContent = esFuturo ? '⏳' : '🌡';
      chip.title = esFuturo
        ? 'Microclima: estimación futura no disponible (solo pasado y presente)'
        : 'Mostrar leyenda de microclima';
    }
    if (!leyendaCerrada && ultimoRango) pintarLeyendaAbierta(ultimoRango.tMin, ultimoRango.tMax);
  }

  function sincronizarConRelojSolar() {
    const futuro = horaEsFutura();
    if (futuro === esFuturo) return;
    esFuturo = futuro;
    aplicarVisibilidadPorReloj();
    if (!esFuturo && activo) recalcular(); // al volver del futuro, refrescar con datos reales
  }

  function encender() {
    activo = true;
    // v3: NO se fuerza la leyenda abierta — queda como la dejara
    // el usuario la última vez (por defecto, oculta: solo el 🌡).
    crearLeyenda();
    esFuturo = horaEsFutura();
    aplicarVisibilidadPorReloj();
    clearInterval(temporizadorReloj);
    temporizadorReloj = setInterval(sincronizarConRelojSolar, 2000);
>>>>>>> b1d1cb9df495f81015692af3fd5c9a5aa3eecca0
    recalcular();
  }

  function apagar() {
    activo = false;
    versionCalculo++; // aborta cualquier cálculo en curso
    clearTimeout(temporizador);
<<<<<<< HEAD
=======
    clearInterval(temporizadorReloj);
    esFuturo = false;
>>>>>>> b1d1cb9df495f81015692af3fd5c9a5aa3eecca0
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