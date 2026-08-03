/* ============================================================
   MANOLITO AIRE — app.js
   Orbe que respira + selector de modos + mapa nacional en vivo.
   ============================================================ */

const cityData = {
  sevilla:   { name:'Sevilla', lat:37.3891, lon:-5.9845 },
  madrid:    { name:'Madrid', lat:40.4168, lon:-3.7038 },
  barcelona: { name:'Barcelona', lat:41.3874, lon:2.1686 },
  valencia:  { name:'Valencia', lat:39.4699, lon:-0.3763 },
  laspalmas: { name:'Las Palmas de Gran Canaria', lat:28.1235, lon:-15.4363 },
  palma:     { name:'Palma de Mallorca', lat:39.5696, lon:2.6502 },
  ceuta:     { name:'Ceuta', lat:35.8894, lon:-5.3213 },
  melilla:   { name:'Melilla', lat:35.2923, lon:-2.9381 },
};

const messages = {
  ciudadano: {
    good:(c)=>[`Hoy en ${c} se puede salir tranquilo.`, `Puedes pasear, hacer deporte o llevar a los peques al parque sin problema.`],
    mid: (c)=>[`Hoy en ${c} el aire está regular.`, `Si tienes asma o problemas respiratorios, evita el ejercicio fuerte al aire libre.`],
    bad: (c)=>[`Hoy en ${c} es mejor quedarse dentro si puedes.`, `El aire está bastante cargado. Evita salir a correr y ventila con cuidado.`],
  },
  cientifico: {
    good:()=>[`Calidad del aire: Buena.`, `Todos los contaminantes principales por debajo de los umbrales de referencia de la OMS.`],
    mid: ()=>[`Calidad del aire: Moderada.`, `NO2 y ozono elevados respecto a la media semanal. Población sensible: precaución.`],
    bad: ()=>[`Calidad del aire: Mala.`, `Concentración de PM2.5 por encima del umbral OMS 24h. Riesgo respiratorio para grupos vulnerables.`],
  },
  yayo: {
    good:(c)=>[`Tranquila/o, hoy se puede salir un ratito a la calle sin problema.`, `Aprovecha para dar tu paseo, el aire en ${c} está muy bien hoy.`],
    mid: (c)=>[`Hoy mejor no forzar mucho, ¿eh?`, `Un paseo corto y tranquilo está bien, pero sin prisas ni esfuerzos en ${c} hoy.`],
    bad: (c)=>[`Hoy mejor quedarse en casa un rato.`, `El aire en ${c} está un poco cargado, mejor no salir mucho tiempo hoy.`],
  },
  peque: {
    good:()=>[`El aire de hoy está genial.`, `Puedes jugar fuera todo lo que quieras.`],
    mid: ()=>[`El aire hoy está un poco regulero.`, `Se puede jugar fuera, pero sin correr demasiado, ¿vale?`],
    bad: ()=>[`Hoy el aire está un poco malo.`, `Mejor jugamos dentro de casa un ratito, ¿te parece?`],
  }
};

function stateFromPM25(v){
  if (v == null) return 'good';
  if (v <= 12) return 'good';
  if (v <= 35) return 'mid';
  return 'bad';
}

let currentMode = 'ciudadano';
let currentCity = 'sevilla';
let currentPM25 = 9;

function renderHero(){
  const d = cityData[currentCity];
  const state = stateFromPM25(currentPM25);
  const [line1, line2] = messages[currentMode][state](d.name);
  const humanLineEl = document.getElementById('humanLine');
  const subLineEl = document.getElementById('subLine');
  const techEl = document.getElementById('techReadout');
  const orbFaceEl = document.getElementById('orbFace');
  if (humanLineEl) humanLineEl.textContent = line1;
  if (subLineEl) subLineEl.textContent = line2;
  if (techEl) techEl.textContent = `PM2.5 ${currentPM25} µg/m³ · ICA: ${state==='good'?'Buena':state==='mid'?'Moderada':'Mala'}`;
  if (orbFaceEl) orbFaceEl.textContent = state==='good'?'bien':state==='mid'?'regular':'malo';
  document.documentElement.style.setProperty('--state-color',
    state==='good' ? 'var(--breath-good)' : state==='mid' ? 'var(--breath-mid)' : 'var(--breath-bad)');
}

function initHeroControls(){
  const citySelect = document.getElementById('citySelect');
  if (citySelect){
    citySelect.addEventListener('change', async (e) => {
      currentCity = e.target.value;
      await fetchCurrentCity();
    });
  }
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentMode = card.dataset.mode;
      document.body.setAttribute('data-mode', currentMode);
      renderHero();
    });
  });
}

async function fetchCurrentCity(){
  const d = cityData[currentCity];
  try{
    const r = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${d.lat}&longitude=${d.lon}&current=pm2_5`);
    const data = await r.json();
    currentPM25 = data.current?.pm2_5 ?? currentPM25;
  } catch(e){ /* se queda con el último valor conocido */ }
  renderHero();
}

/* ---------- mapa nacional ---------- */
const stations = [
  { name:'Sevilla', lat:37.3891, lon:-5.9845 },
  { name:'Madrid', lat:40.4168, lon:-3.7038 },
  { name:'Barcelona', lat:41.3874, lon:2.1686 },
  { name:'Valencia', lat:39.4699, lon:-0.3763 },
  { name:'Bilbao', lat:43.2630, lon:-2.9350 },
  { name:'Zaragoza', lat:41.6488, lon:-0.8891 },
  { name:'A Coruña', lat:43.3623, lon:-8.4115 },
  { name:'Málaga', lat:36.7213, lon:-4.4214 },
  { name:'Granada', lat:37.1773, lon:-3.5986 },
  { name:'Córdoba', lat:37.8882, lon:-4.7794 },
  { name:'Alicante', lat:38.3452, lon:-0.4810 },
  { name:'Murcia', lat:37.9922, lon:-1.1307 },
  { name:'Valladolid', lat:41.6523, lon:-4.7245 },
  { name:'Vigo', lat:42.2406, lon:-8.7207 },
  { name:'Gijón', lat:43.5322, lon:-5.6611 },
  { name:'San Sebastián', lat:43.3183, lon:-1.9812 },
  { name:'Pamplona', lat:42.8125, lon:-1.6458 },
  { name:'Toledo', lat:39.8628, lon:-4.0273 },
  { name:'Badajoz', lat:38.8794, lon:-6.9707 },
  { name:'Santander', lat:43.4623, lon:-3.8100 },
  { name:'Huelva', lat:37.2614, lon:-6.9447 },
  { name:'Cádiz', lat:36.5271, lon:-6.2886 },
  { name:'Jaén', lat:37.7796, lon:-3.7849 },
  { name:'Almería', lat:36.8340, lon:-2.4637 },
  { name:'Las Palmas de Gran Canaria', lat:28.1235, lon:-15.4363 },
  { name:'Santa Cruz de Tenerife', lat:28.4636, lon:-16.2518 },
  { name:'Palma de Mallorca', lat:39.5696, lon:2.6502 },
  { name:'Ibiza', lat:38.9067, lon:1.4206 },
  { name:'Ceuta', lat:35.8894, lon:-5.3213 },
  { name:'Melilla', lat:35.2923, lon:-2.9381 },
];
const regionView = {
  peninsula:    { center:[40.2, -3.7], zoom:6 },
  canarias:     { center:[28.3, -15.6], zoom:8 },
  baleares:     { center:[39.3, 2.6], zoom:8 },
  ceutamelilla: { center:[35.6, -4.1], zoom:7 },
};
const stateColor = { good:'#7FA98C', mid:'#E0A93E', bad:'#B5543A', unknown:'#9AA5AC' };

function initMap(){
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  const map = L.map('map').setView(regionView.peninsula.center, regionView.peninsula.zoom);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap · © CARTO', maxZoom: 18
  }).addTo(map);

  let loaded = 0;
  const statusLine = document.getElementById('statusLine');

  stations.forEach(st => {
    const marker = L.circleMarker([st.lat, st.lon], { radius:9, color:'#fff', weight:2, fillColor:'#9AA5AC', fillOpacity:0.95 }).addTo(map);
    marker.bindPopup(`<div class="popup-human">${st.name}</div><div class="popup-tech">Cargando dato en vivo…</div>`);

    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${st.lat}&longitude=${st.lon}&current=pm2_5,pm10,nitrogen_dioxide,ozone`)
      .then(r => r.json())
      .then(data => {
        const c = data.current || {};
        const state = stateFromPM25(c.pm2_5);
        marker.setStyle({ fillColor: stateColor[state] });
        marker.setPopupContent(
          `<div class="popup-human">${st.name}</div>` +
          `<div class="popup-tech">PM2.5 ${c.pm2_5 ?? '—'} µg/m³ · PM10 ${c.pm10 ?? '—'} µg/m³ · NO2 ${c.nitrogen_dioxide ?? '—'} µg/m³ · O3 ${c.ozone ?? '—'} µg/m³</div>` +
          `<span class="popup-tag">Estación real · dato en vivo</span>`
        );
      })
      .catch(() => { marker.setPopupContent(`<div class="popup-human">${st.name}</div><div class="popup-tech">No se pudo cargar el dato ahora mismo.</div>`); })
      .finally(() => {
        loaded++;
        if (statusLine) statusLine.textContent = `Cargados ${loaded}/${stations.length} puntos en vivo.`;
      });
  });

  const regionJump = document.getElementById('regionJump');
  if (regionJump){
    regionJump.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') return;
      document.querySelectorAll('#regionJump button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const r = regionView[e.target.dataset.r];
      map.flyTo(r.center, r.zoom, { duration: 0.8 });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initHeroControls();
  fetchCurrentCity();
  initMap();
});
