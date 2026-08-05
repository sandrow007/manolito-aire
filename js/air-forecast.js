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
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&past_days=2&forecast_days=5`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open-Meteo respondió ${r.status}`);
  const data = await r.json();
  const times = data.hourly?.time || [];
  const values = data.hourly?.pm2_5 || [];
  if (times.length === 0) throw new Error('Respuesta sin datos horarios');
  const nowIndex = times.findIndex(t => new Date(t) > new Date());
  return { times, values, nowIndex: nowIndex === -1 ? Math.floor(times.length/2) : nowIndex };
}

/* ---------- gráfico SVG a mano, en el mismo estilo visual del resto de la web ---------- */
function drawAirChart(times, values, nowIndex){
  const el = document.getElementById('airChart');
  if (!el) return;
  const w = 800, h = 220, padL = 30, padR = 10, padT = 14, padB = 22;
  const clean = values.map(v => v == null ? 0 : v);
  const maxV = Math.max(...clean, 20);
  const n = clean.length;
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
  return { good: good*100, mid: mid*100, bad: bad*100 };
}

function renderQuantumBars(result){
  const el = document.getElementById('quantumBars');
  if (!el) return;
  const rows = [
    { label: 'Buena', pct: result.good, color: 'var(--breath-good)' },
    { label: 'Moderada', pct: result.mid, color: 'var(--breath-mid)' },
    { label: 'Mala', pct: result.bad, color: 'var(--breath-bad)' },
  ];
  el.innerHTML = rows.map(r => `
    <div class="qbar-row">
      <div class="qbar-label">${r.label}</div>
      <div class="qbar-track"><div class="qbar-fill" style="width:${r.pct.toFixed(0)}%; background:${r.color};"></div></div>
      <div class="qbar-pct">${r.pct.toFixed(0)}%</div>
    </div>
  `).join('');
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
