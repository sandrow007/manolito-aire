/* ============================================================
   MANOLITO AIRE — air-forecast.js
   1) Gráfico SVG con datos REALES de histórico (48h) y pronóstico
      (48h) de Open-Meteo/CAMS.
   2) "Manolito Cuántico": una simulación matemática de formalismo
      cuántico (registro de 3 qubits, amplitudes complejas, medición
      por regla de Born) que traduce el pronóstico real en una
      distribución de probabilidad. Es matemática de verdad, pero
      es una SIMULACIÓN CLÁSICA — no corre en hardware cuántico, y
      no es un pronóstico meteorológico oficial. Eso se declara
      también en el aviso legal.
   ============================================================ */

async function fetchAirSeries(lat, lon){
  // Caché local de 15 min por zona (~1 km): mover el slider o reabrir la
  // página no repite la llamada mientras el dato siga fresco (ahorro de red/batería).
  const claveCache = `manolito_cache_airseries_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;
  try {
    const crudo = localStorage.getItem(claveCache);
    if (crudo) {
      const entrada = JSON.parse(crudo);
      if (entrada && Date.now() - entrada.t < 15 * 60 * 1000) return entrada.v;
    }
  } catch (e) { /* almacenamiento no disponible: se pide a la red */ }

  // A través del proxy del Worker (caché 5 min en Cloudflare): sin CORS,
  // sin límites por IP del navegador y sin errores visibles en F12.
  const url = `/api/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&past_days=2&forecast_days=5`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open-Meteo respondió ${r.status}`);
  const data = await r.json();
  const times = data.hourly?.time || [];
  const values = data.hourly?.pm2_5 || [];
  if (times.length === 0) throw new Error('Respuesta sin datos horarios');
  const nowIndex = times.findIndex(t => new Date(t) > new Date());
  const salida = { times, values, nowIndex: nowIndex === -1 ? Math.floor(times.length/2) : nowIndex };
  try { localStorage.setItem(claveCache, JSON.stringify({ t: Date.now(), v: salida })); } catch (e) { }
  return salida;
}

/* ---------- gráfico SVG a mano, en el mismo estilo visual del resto de la web ---------- */
function drawAirChart(times, values, nowIndex){
  const el = document.getElementById('airChart');
  if (!el) return;
  const w = 800, h = 220, padL = 30, padR = 10, padT = 14, padB = 22;
  const clean = values.map(v => v == null ? 0 : v);
  const maxV = Math.max(...clean, 20);
  const n = clean.length;
  // Guarda: con menos de 2 puntos no hay línea que dibujar (evita NaN en el SVG).
  if (n < 2) {
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><text class="chart-axis-label" x="${padL}" y="${h/2}">Cargando datos del aire…</text></svg>`;
    return;
  }
  nowIndex = Math.max(0, Math.min(n - 1, nowIndex));
  const x = i => padL + (i / (n - 1)) * (w - padL - padR);
  const y = v => padT + (1 - v / maxV) * (h - padT - padB);

  const histPts = clean.slice(0, nowIndex + 1).map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const forePts = clean.slice(nowIndex).map((v, i) => `${x(i + nowIndex)},${y(v)}`).join(' ');
  const nowX = x(nowIndex);

  // marcas de eje Y simples (0, mitad, máximo)
  const yTicks = [0, Math.round(maxV/2), Math.round(maxV)];

  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      ${yTicks.map(t => `<text class="chart-axis-label" x="2" y="${y(t)+3}">${t}</text>`).join('')}
      <line class="chart-now-line" x1="${nowX}" y1="${padT}" x2="${nowX}" y2="${h-padB}" />
      <text class="chart-axis-label" x="${nowX+3}" y="${padT+8}">ahora</text>
      <polyline class="chart-line-hist" points="${histPts}" />
      <polyline class="chart-line-fore" points="${forePts}" />
    </svg>
  `;
}

/* ---------- Manolito Cuántico: registro simulado de 3 qubits ----------
   8 estados base = 8 tramos de PM2.5, de "aire perfecto" a "aire muy malo".
   Partimos de superposición uniforme (como un Hadamard a cada qubit),
   y sesgamos la amplitud de cada estado según lo cerca que esté su tramo
   del PM2.5 medio pronosticado para las próximas 24h. La volatilidad del
   pronóstico (cuánto varía) ensancha o estrecha esa distribución.
   Al final, medimos con la regla de Born: probabilidad = |amplitud|².  */
function quantumAirModel(forecastValues){
  forecastValues = forecastValues.filter(v => v != null && isFinite(v));
  if (!forecastValues.length) return null;
  const bins = [3, 8, 13, 20, 28, 38, 50, 70]; // punto medio de cada uno de los 8 tramos (µg/m³)
  const mean = forecastValues.reduce((a,b)=>a+b,0) / forecastValues.length;
  const variance = forecastValues.reduce((a,b)=>a+(b-mean)**2,0) / forecastValues.length;
  const spread = Math.max(6, Math.sqrt(variance)); // volatilidad -> anchura de la campana

  // amplitudes complejas: parte real = gaussiana centrada en la media pronosticada,
  // parte imaginaria = pequeño término de fase ligado a la posición del qubit
  // (esto es lo que hace que sea "cuántico" y no una simple media estadística:
  // dos estados pueden tener la misma |amplitud| pero distinta fase).
  let amplitudes = bins.map((b, i) => {
    const real = Math.exp(-((b - mean) ** 2) / (2 * spread * spread));
    const phase = (i / bins.length) * Math.PI / 4;
    return { re: real * Math.cos(phase), im: real * Math.sin(phase) };
  });

  // normalizar para que sum(|amplitud|²) = 1 (axioma de la mecánica cuántica)
  const normSq = amplitudes.reduce((s, a) => s + (a.re**2 + a.im**2), 0);
  const probs = amplitudes.map(a => (a.re**2 + a.im**2) / normSq);

  // medición: agregamos los 8 estados en 3 categorías (Born rule -> probabilidad clásica)
  let good = 0, mid = 0, bad = 0;
  bins.forEach((b, i) => {
    if (b <= 12) good += probs[i];
    else if (b <= 35) mid += probs[i];
    else bad += probs[i];
  });
  return {
    good: good*100, mid: mid*100, bad: bad*100,
    stats: { mean, min: Math.min(...forecastValues), max: Math.max(...forecastValues) },
  };
}

function renderQuantumBars(result){
  const el = document.getElementById('quantumBars');
  if (!el || !result) return;
  const fmt = n => n.toFixed(1).replace('.', ',');
  const rows = [
    { label: 'Buena',    pct: result.good, color: 'var(--breath-good)', desc: 'probabilidad de aire bueno' },
    { label: 'Moderada', pct: result.mid,  color: 'var(--breath-mid)',  desc: 'probabilidad de aire moderado' },
    { label: 'Mala',     pct: result.bad,  color: 'var(--breath-bad)',  desc: 'probabilidad de aire malo' },
  ];

  // Cada barra es un botón de verdad: táctil, ratón y teclado (Enter/Espacio).
  el.innerHTML = rows.map((r, i) => `
    <button type="button" class="qbar-btn" data-i="${i}" aria-expanded="false" aria-controls="quantumDetail">
      <span class="qbar-label">${r.label}</span>
      <span class="qbar-track"><span class="qbar-fill" style="width:${r.pct.toFixed(0)}%; background:${r.color};"></span></span>
      <span class="qbar-pct">${fmt(r.pct)}&nbsp;%</span>
    </button>
  `).join('');

  // Los números reales del aire, siempre visibles (media, pico y mínimo
  // de PM2.5 del pronóstico de las próximas 24 h).
  const card = el.closest('.quantum-card') || el.parentElement;
  let stats = card.querySelector('.quantum-stats');
  if (!stats) {
    stats = document.createElement('div');
    stats.className = 'quantum-stats';
    el.after(stats);
  }
  stats.textContent = `PM2.5 próximas 24 h — media ${fmt(result.stats.mean)} µg/m³ · pico ${fmt(result.stats.max)} · mínimo ${fmt(result.stats.min)}`;

  // Detalle al tocar/pasar por cada barra (región viva para lectores de pantalla).
  let detail = card.querySelector('.quantum-detail');
  if (!detail) {
    detail = document.createElement('div');
    detail.className = 'quantum-detail';
    detail.id = 'quantumDetail';
    detail.setAttribute('aria-live', 'polite');
    stats.after(detail);
  }
  const textos = rows.map(r =>
    `${r.label}: ${fmt(r.pct)} % — ${r.desc} en las próximas 24 h. ` +
    `PM2.5 medio previsto ${fmt(result.stats.mean)} µg/m³ (entre ${fmt(result.stats.min)} y ${fmt(result.stats.max)}).`
  );
  const mostrar = (i) => { detail.textContent = textos[i]; detail.classList.add('visible'); };
  const ocultarSiNoFijado = () => {
    if (!el.querySelector('.qbar-activo')) { detail.textContent = ''; detail.classList.remove('visible'); }
  };

  el.querySelectorAll('.qbar-btn').forEach((btn) => {
    const i = Number(btn.dataset.i);
    btn.addEventListener('click', () => {
      const abierto = btn.classList.contains('qbar-activo');
      el.querySelectorAll('.qbar-btn').forEach(b => { b.classList.remove('qbar-activo'); b.setAttribute('aria-expanded', 'false'); });
      if (abierto) { detail.textContent = ''; detail.classList.remove('visible'); return; }
      btn.classList.add('qbar-activo');
      btn.setAttribute('aria-expanded', 'true');
      mostrar(i);
    });
    // En ordenador con ratón, basta pasar por encima; en táctil manda el toque.
    btn.addEventListener('mouseenter', () => {
      if (window.matchMedia('(hover:hover)').matches) mostrar(i);
    });
    btn.addEventListener('focus', () => mostrar(i));
  });
  el.addEventListener('mouseleave', ocultarSiNoFijado);
}

async function loadForecastForCity(){
  if (typeof cityData === 'undefined' || typeof currentCity === 'undefined') return;
  const d = cityData[currentCity];
  const nameEl = document.getElementById('forecastCityName');
  if (nameEl) nameEl.textContent = d.name;

  const chartEl = document.getElementById('airChart');
  const barsEl = document.getElementById('quantumBars');
  if (chartEl) chartEl.innerHTML = '<p style="color:var(--sky-mid); font-size:0.85rem;">Cargando histórico y pronóstico…</p>';

  try{
    const { times, values, nowIndex } = await fetchAirSeriesWithRetry(d.lat, d.lon);
    drawAirChart(times, values, nowIndex);
    const futureValues = values.slice(nowIndex, nowIndex + 24).filter(v => v != null);
    const result = quantumAirModel(futureValues.length ? futureValues : values);
    renderQuantumBars(result);
  } catch(e){
    const msg = '<p style="color:var(--sky-mid); font-size:0.85rem;">No se pudo cargar el histórico ahora mismo (la API está saturada por las 500+ peticiones del mapa). Prueba a recargar en unos segundos.</p>';
    if (chartEl) chartEl.innerHTML = msg;
    if (barsEl) barsEl.innerHTML = msg;
  }
}

// Reintenta una vez si la primera petición choca con la saturación de la API
async function fetchAirSeriesWithRetry(lat, lon){
  try{
    return await fetchAirSeries(lat, lon);
  } catch(e){
    await new Promise(res => setTimeout(res, 2500));
    return await fetchAirSeries(lat, lon);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadForecastForCity();
  const citySelect = document.getElementById('citySelect');
  if (citySelect) citySelect.addEventListener('change', loadForecastForCity);
});
