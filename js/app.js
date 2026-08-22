/* ============================================================
   MANOLIT∞ AIRE — app.js
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
  es: {
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
  },
  en: {
    ciudadano: {
      good:(c)=>[`You can go out without worry in ${c} today.`, `Fine for walking, exercise, or taking the kids to the park.`],
      mid: (c)=>[`Air in ${c} is so-so today.`, `If you have asthma or breathing issues, avoid intense outdoor exercise.`],
      bad: (c)=>[`Better to stay indoors in ${c} today if you can.`, `The air is fairly heavy. Avoid running outside and ventilate carefully.`],
    },
    cientifico: {
      good:()=>[`Air quality: Good.`, `All main pollutants below WHO reference thresholds.`],
      mid: ()=>[`Air quality: Moderate.`, `NO2 and ozone elevated vs. weekly average. Sensitive groups: caution advised.`],
      bad: ()=>[`Air quality: Poor.`, `PM2.5 concentration above the WHO 24h threshold. Respiratory risk for vulnerable groups.`],
    },
    yayo: {
      good:(c)=>[`No worries, you can step out for a bit today.`, `Good time for your walk, the air in ${c} is very good today.`],
      mid: (c)=>[`Better not to push too hard today.`, `A short, calm walk is fine, but take it easy in ${c} today.`],
      bad: (c)=>[`Better to stay home for a while today.`, `The air in ${c} is a bit heavy, best not to be out too long today.`],
    },
    peque: {
      good:()=>[`The air today is great.`, `You can play outside as much as you want.`],
      mid: ()=>[`The air today is a bit so-so.`, `You can play outside, just don't run too much, okay?`],
      bad: ()=>[`The air today isn't great.`, `Let's play indoors for a little while, okay?`],
    }
  },
  ca: {
    ciudadano: {
      good:(c)=>[`Avui a ${c} es pot sortir tranquil.`, `Pots passejar, fer esport o portar els nens al parc sense problema.`],
      mid: (c)=>[`Avui a ${c} l'aire està regular.`, `Si tens asma o problemes respiratoris, evita l'exercici fort a l'aire lliure.`],
      bad: (c)=>[`Avui a ${c} és millor quedar-se a dins si pots.`, `L'aire està força carregat. Evita sortir a córrer i ventila amb cura.`],
    },
    cientifico: {
      good:()=>[`Qualitat de l'aire: Bona.`, `Tots els contaminants principals per sota dels llindars de referència de l'OMS.`],
      mid: ()=>[`Qualitat de l'aire: Moderada.`, `NO2 i ozó elevats respecte a la mitjana setmanal. Població sensible: precaució.`],
      bad: ()=>[`Qualitat de l'aire: Dolenta.`, `Concentració de PM2.5 per sobre del llindar OMS 24h. Risc respiratori per a grups vulnerables.`],
    },
    yayo: {
      good:(c)=>[`Tranquil·la/tranquil, avui es pot sortir una estoneta sense problema.`, `Aprofita per fer la teva passejada, l'aire a ${c} està molt bé avui.`],
      mid: (c)=>[`Avui millor no forçar gaire, oi?`, `Una passejada curta i tranquil·la va bé, però sense presses ni esforços a ${c} avui.`],
      bad: (c)=>[`Avui millor quedar-se a casa una estona.`, `L'aire a ${c} està una mica carregat, millor no sortir gaire estona avui.`],
    },
    peque: {
      good:()=>[`L'aire d'avui està genial.`, `Pots jugar fora tant com vulguis.`],
      mid: ()=>[`L'aire avui està una mica fluixet.`, `Pots jugar fora, però sense córrer massa, val?`],
      bad: ()=>[`Avui l'aire està una mica dolent.`, `Millor juguem a dins una estoneta, et sembla?`],
    }
  },
  eu: {
    ciudadano: {
      good:(c)=>[`Gaur ${c}-n lasai atera zaitezke.`, `Paseatu, kirola egin edo umeak parkera eraman ditzakezu arazorik gabe.`],
      mid: (c)=>[`Gaur ${c}-ko airea erdipurdikoa da.`, `Asma edo arnasketa arazoak badituzu, ekidin kanpoko ariketa gogorra.`],
      bad: (c)=>[`Gaur hobe barruan geratzea ${c}-n, ahal baduzu.`, `Airea nahiko kargatuta dago. Ekidin korrika egitea kanpoan eta aireztatu kontuz.`],
    },
    cientifico: {
      good:()=>[`Airearen kalitatea: Ona.`, `Kutsatzaile nagusi guztiak OMEren erreferentzia atalaseen azpitik.`],
      mid: ()=>[`Airearen kalitatea: Ertaina.`, `NO2 eta ozonoa asteko batez bestekoaren gainetik. Talde sentikorrak: kontuz.`],
      bad: ()=>[`Airearen kalitatea: Txarra.`, `PM2.5 kontzentrazioa OMEren 24 orduko atalasearen gainetik. Arnasketa arriskua talde ahulentzat.`],
    },
    yayo: {
      good:(c)=>[`Lasai, gaur pixka batean kalera atera zaitezke arazorik gabe.`, `Baliatu zure paseoa egiteko, ${c}-ko airea oso ona dago gaur.`],
      mid: (c)=>[`Gaur hobe ez indartzea gehiegi, ezta?`, `Paseo labur eta lasai bat ondo dago, baina presarik gabe ${c}-n gaur.`],
      bad: (c)=>[`Gaur hobe etxean geratzea puska batean.`, `${c}-ko airea pixka bat kargatuta dago, hobe ez luzaroan kanpoan egotea gaur.`],
    },
    peque: {
      good:()=>[`Gaurko airea oso ona dago.`, `Kanpoan jolastu dezakezu nahi beste.`],
      mid: ()=>[`Gaurko airea erdipurdikoa dago.`, `Kanpoan jolastu dezakezu, baina ez korrika gehiegi, ados?`],
      bad: ()=>[`Gaur airea ez dago oso ona.`, `Hobe barruan jolastea pixka batean, ados?`],
    }
  },
  gl: {
    ciudadano: {
      good:(c)=>[`Hoxe en ${c} pódese saír tranquilo.`, `Podes pasear, facer deporte ou levar aos peques ao parque sen problema.`],
      mid: (c)=>[`Hoxe en ${c} o aire está regular.`, `Se tes asma ou problemas respiratorios, evita o exercicio forte ao aire libre.`],
      bad: (c)=>[`Hoxe en ${c} é mellor quedar dentro se podes.`, `O aire está bastante cargado. Evita saír a correr e ventila con coidado.`],
    },
    cientifico: {
      good:()=>[`Calidade do aire: Boa.`, `Todos os contaminantes principais por debaixo dos limiares de referencia da OMS.`],
      mid: ()=>[`Calidade do aire: Moderada.`, `NO2 e ozono elevados respecto á media semanal. Poboación sensible: precaución.`],
      bad: ()=>[`Calidade do aire: Mala.`, `Concentración de PM2.5 por riba do limiar OMS 24h. Risco respiratorio para grupos vulnerables.`],
    },
    yayo: {
      good:(c)=>[`Tranquila/o, hoxe pódese saír un ratiño á rúa sen problema.`, `Aproveita para dar o teu paseo, o aire en ${c} está moi ben hoxe.`],
      mid: (c)=>[`Hoxe mellor non forzar moito, eh?`, `Un paseo curto e tranquilo está ben, pero sen presas nin esforzos en ${c} hoxe.`],
      bad: (c)=>[`Hoxe mellor quedar na casa un rato.`, `O aire en ${c} está un pouco cargado, mellor non saír moito tempo hoxe.`],
    },
    peque: {
      good:()=>[`O aire de hoxe está xenial.`, `Podes xogar fóra todo o que queiras.`],
      mid: ()=>[`O aire hoxe está un pouco regulero.`, `Podes xogar fóra, pero sen correr demasiado, vale?`],
      bad: ()=>[`Hoxe o aire está un pouco malo.`, `Mellor xogamos dentro da casa un ratiño, parécheche?`],
    }
  }
};
// Traducciones ES/EN/CA/EU/GL completas. Las de CA/EU/GL las hice yo sin ser
// hablante nativo de esas lenguas — antes de darlo por definitivo, que las
// revise alguien que las hable de verdad, sobre todo el euskera y el gallego.
function getMessages(lang){
  return messages[lang] || messages.es;
}

function stateFromPM25(v){
  if (v == null) return 'good';
  if (v <= 12) return 'good';
  if (v <= 35) return 'mid';
  return 'bad';
}

let currentMode = 'ciudadano';
let currentCity = 'sevilla';
let currentPM25 = 9;

// *** FUNCIÓN MÁGICA PARA EL NUEVO SELECTOR DE CIUDADES ***
// El HTML la llama cuando eligen una ciudad.
window.setCurrentCity = function(city) {
  currentCity = city;
  fetchCurrentCity();
};

function renderHero(){
  const d = cityData[currentCity];
  const state = stateFromPM25(currentPM25);
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'es';
  const [line1, line2] = getMessages(lang)[currentMode][state](d.name);
  const humanLineEl = document.getElementById('humanLine');
  const subLineEl = document.getElementById('subLine');
  const techEl = document.getElementById('techReadout');
  const orbFaceEl = document.getElementById('orbFace');
  if (humanLineEl) humanLineEl.textContent = line1;
  if (subLineEl) subLineEl.textContent = line2;
  if (techEl) techEl.textContent = `PM2.5 ${currentPM25} µg/m³ · ICA: ${state==='good'?'Buena':state==='mid'?'Moderada':'Mala'}`;
  const dict = (typeof translations !== 'undefined') ? (translations[lang] || translations.es) : null;
  if (orbFaceEl) orbFaceEl.textContent = dict ? dict[`orb_${state}`] : state;
  document.documentElement.style.setProperty('--state-color',
    state==='good' ? 'var(--breath-good)' : state==='mid' ? 'var(--breath-mid)' : 'var(--breath-bad)');
    
// Traducimos el estado al español porque el modo Peque (en index.html)
  // espera 'buena'/'moderada'/'mala', no 'good'/'mid'/'bad'.
  const estadoPeque = { good: 'buena', mid: 'moderada', bad: 'mala' }[state] || 'mala';
  if (typeof window.actualizarModoPeque === 'function') {
    window.actualizarModoPeque(estadoPeque);
  }
}

function initHeroControls(){
  // El antiguo selector (select) ya no existe, pero no hace daño si se intenta.
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
  { name: 'Jerez de la Frontera', lat: 36.6850, lon: -6.1261 },
  { name: 'Marbella', lat: 36.5101, lon: -4.8824 },
  { name: 'Dos Hermanas', lat: 37.2829, lon: -5.9209 },
  { name: 'Algeciras', lat: 36.1408, lon: -5.4562 },
  { name: 'Roquetas de Mar', lat: 36.7643, lon: -2.6148 },
  { name: 'San Fernando', lat: 36.4665, lon: -6.1989 },
  { name: 'El Puerto de Santa María', lat: 36.5939, lon: -6.2330 },
  { name: 'Chiclana de la Frontera', lat: 36.4182, lon: -6.1462 },
  { name: 'Mijas', lat: 36.5956, lon: -4.6367 },
  { name: 'Vélez-Málaga', lat: 36.7828, lon: -4.1008 },
  { name: 'Fuengirola', lat: 36.5400, lon: -4.6247 },
  { name: 'Alcalá de Guadaíra', lat: 37.3396, lon: -5.8497 },
  { name: 'Motril', lat: 36.7456, lon: -3.5173 },
  { name: 'Linares', lat: 38.0934, lon: -3.6358 },
  { name: 'Estepona', lat: 36.4276, lon: -5.1459 },
  { name: 'Móstoles', lat: 40.3235, lon: -3.8647 },
  { name: 'Alcalá de Henares', lat: 40.4819, lon: -3.3644 },
  { name: 'Fuenlabrada', lat: 40.2831, lon: -3.7946 },
  { name: 'Leganés', lat: 40.3275, lon: -3.7635 },
  { name: 'Getafe', lat: 40.3083, lon: -3.7300 },
  { name: 'Alcorcón', lat: 40.3479, lon: -3.8290 },
  { name: 'Torrejón de Ardoz', lat: 40.4578, lon: -3.4795 },
  { name: 'Parla', lat: 40.2366, lon: -3.7719 },
  { name: 'Alcobendas', lat: 40.5475, lon: -3.6420 },
  { name: 'Las Rozas', lat: 40.4917, lon: -3.8741 },
  { name: 'San Sebastián de los Reyes', lat: 40.5534, lon: -3.6267 },
  { name: 'Rivas-Vaciamadrid', lat: 40.3411, lon: -3.5255 },
  { name: 'Valdemoro', lat: 40.1894, lon: -3.6778 },
  { name: 'Majadahonda', lat: 40.4735, lon: -3.8738 },
  { name: 'L\'Hospitalet de Llobregat', lat: 41.3596, lon: 2.0997 },
  { name: 'Terrassa', lat: 41.5623, lon: 2.0101 },
  { name: 'Badalona', lat: 41.4500, lon: 2.2474 },
  { name: 'Sabadell', lat: 41.5433, lon: 2.1094 },
  { name: 'Lleida', lat: 41.6168, lon: 0.6222 },
  { name: 'Tarragona', lat: 41.1189, lon: 1.2445 },
  { name: 'Mataró', lat: 41.5381, lon: 2.4445 },
  { name: 'Santa Coloma de Gramenet', lat: 41.4515, lon: 2.2081 },
  { name: 'Reus', lat: 41.1559, lon: 1.1065 },
  { name: 'Girona', lat: 41.9794, lon: 2.8214 },
  { name: 'Sant Cugat del Vallès', lat: 41.4721, lon: 2.0864 },
  { name: 'Cornellà de Llobregat', lat: 41.3574, lon: 2.0706 },
  { name: 'Rubí', lat: 41.4933, lon: 2.0326 },
  { name: 'Manresa', lat: 41.7247, lon: 1.8267 },
  { name: 'Vilanova i la Geltrú', lat: 41.2239, lon: 1.7251 },
  { name: 'Elche', lat: 38.2669, lon: -0.6984 },
  { name: 'Castellón de la Plana', lat: 39.9864, lon: -0.0513 },
  { name: 'Torrevieja', lat: 37.9787, lon: -0.6822 },
  { name: 'Torrent', lat: 39.4367, lon: -0.4659 },
  { name: 'Orihuela', lat: 38.0847, lon: -0.9442 },
  { name: 'Gandia', lat: 38.9667, lon: -0.1833 },
  { name: 'Paterna', lat: 39.5011, lon: -0.4418 },
  { name: 'Benidorm', lat: 38.5411, lon: -0.1225 },
  { name: 'Sagunto', lat: 39.6799, lon: -0.2785 },
  { name: 'Alcoy', lat: 38.6983, lon: -0.4736 },
  { name: 'Elda', lat: 38.4800, lon: -0.7951 },
  { name: 'Villarreal', lat: 39.9378, lon: -0.1017 },
  { name: 'Santiago de Compostela', lat: 42.8782, lon: -8.5448 },
  { name: 'Ourense', lat: 42.3367, lon: -7.8641 },
  { name: 'Lugo', lat: 43.0121, lon: -7.5558 },
  { name: 'Pontevedra', lat: 42.4310, lon: -8.6444 },
  { name: 'Ferrol', lat: 43.4832, lon: -8.2369 },
  { name: 'Vilagarcía de Arousa', lat: 42.5975, lon: -8.7640 },
  { name: 'Vitoria-Gasteiz', lat: 42.8467, lon: -2.6716 },
  { name: 'Barakaldo', lat: 43.2971, lon: -2.9861 },
  { name: 'Getxo', lat: 43.3444, lon: -3.0039 },
  { name: 'Irun', lat: 43.3390, lon: -1.7894 },
  { name: 'Portugalete', lat: 43.3197, lon: -3.0186 },
  { name: 'San Cristóbal de La Laguna', lat: 28.4872, lon: -16.3135 },
  { name: 'Telde', lat: 27.9942, lon: -15.4172 },
  { name: 'Arona', lat: 28.0997, lon: -16.6775 },
  { name: 'Santa Lucía de Tirajana', lat: 27.9126, lon: -15.5411 },
  { name: 'Arrecife', lat: 28.9626, lon: -13.5515 },
  { name: 'San Bartolomé de Tirajana', lat: 27.9248, lon: -15.5732 },
  { name: 'Burgos', lat: 42.3439, lon: -3.6969 },
  { name: 'Salamanca', lat: 40.9701, lon: -5.6635 },
  { name: 'León', lat: 42.5987, lon: -5.5671 },
  { name: 'Palencia', lat: 42.0095, lon: -4.5241 },
  { name: 'Ponferrada', lat: 42.5466, lon: -6.5962 },
  { name: 'Zamora', lat: 41.5034, lon: -5.7462 },
  { name: 'Segovia', lat: 40.9429, lon: -4.1088 },
  { name: 'Ávila', lat: 40.6559, lon: -4.6977 },
  { name: 'Soria', lat: 41.7640, lon: -2.4688 },
  { name: 'Albacete', lat: 38.9942, lon: -1.8585 },
  { name: 'Guadalajara', lat: 40.6333, lon: -3.1667 },
  { name: 'Ciudad Real', lat: 38.9848, lon: -3.9274 },
  { name: 'Cuenca', lat: 40.0704, lon: -2.1374 },
  { name: 'Talavera de la Reina', lat: 39.9602, lon: -3.8340 },
  { name: 'Cartagena', lat: 37.6051, lon: -0.9862 },
  { name: 'Lorca', lat: 37.6712, lon: -1.6983 },
  { name: 'Molina de Segura', lat: 38.0550, lon: -1.2132 },
  { name: 'Alcantarilla', lat: 37.9719, lon: -1.2091 },
  { name: 'Cáceres', lat: 39.4753, lon: -6.3724 },
  { name: 'Mérida', lat: 38.9161, lon: -6.3437 },
  { name: 'Plasencia', lat: 40.0294, lon: -6.0890 },
  { name: 'Oviedo', lat: 43.3619, lon: -5.8494 },
  { name: 'Avilés', lat: 43.5566, lon: -5.9248 },
  { name: 'Torrelavega', lat: 43.3516, lon: -4.0487 },
  { name: 'Huesca', lat: 42.1362, lon: -0.4087 },
  { name: 'Teruel', lat: 40.3456, lon: -1.1065 },
  { name: 'Logroño', lat: 42.4627, lon: -2.4450 },
  { name:'Madrid', lat:40.4168, lon:-3.7038 },
  { name: 'Utrera', lat: 37.1815, lon: -5.7801 },
  { name: 'Sanlúcar de Barrameda', lat: 36.7781, lon: -6.3533 },
  { name: 'Lucena', lat: 37.4079, lon: -4.4842 },
  { name: 'Antequera', lat: 37.0194, lon: -4.5612 },
  { name: 'Calatayud', lat: 41.3533, lon: -1.6432 },
  { name: 'Utebo', lat: 41.7144, lon: -0.9942 },
  { name: 'Monzón', lat: 41.9111, lon: 0.1942 },
  { name: 'Barbastro', lat: 42.0356, lon: 0.1269 },
  { name: 'Alcañiz', lat: 41.0506, lon: -0.1328 },
  { name: 'Tarazona', lat: 41.9022, lon: -1.7258 },
  { name: 'Jaca', lat: 42.5690, lon: -0.5499 },
  { name: 'Fraga', lat: 41.5218, lon: 0.3475 },
  { name: 'Ejea de los Caballeros', lat: 42.1278, lon: -1.1353 },
  { name: 'Sabiñánigo', lat: 42.5186, lon: -0.3644 },
  { name: 'Don Benito', lat: 38.9542, lon: -5.8611 },
  { name: 'Almendralejo', lat: 38.6833, lon: -6.4083 },
  { name: 'Villanueva de la Serena', lat: 38.9744, lon: -5.8000 },
  { name: 'Zafra', lat: 38.4258, lon: -6.4194 },
  { name: 'Navalmoral de la Mata', lat: 39.8917, lon: -5.5417 },
  { name: 'Coria', lat: 39.9822, lon: -6.5369 },
  { name: 'Miajadas', lat: 39.1517, lon: -5.9083 },
  { name: 'Olivenza', lat: 38.6853, lon: -7.1006 },
  { name: 'Jerez de los Caballeros', lat: 38.3194, lon: -6.7725 },
  { name: 'Trujillo', lat: 39.4589, lon: -5.8814 },
  { name: 'Andújar', lat: 38.0392, lon: -4.0506 },
  { name: 'Bailén', lat: 38.0950, lon: -3.7761 },
  { name: 'Pozoblanco', lat: 38.3789, lon: -4.8469 },
  { name: 'Peñarroya-Pueblonuevo', lat: 38.2981, lon: -5.2717 },
  { name: 'Montilla', lat: 37.5878, lon: -4.6397 },
  { name: 'Priego de Córdoba', lat: 37.4389, lon: -4.1956 },
  { name: 'Carmona', lat: 37.4725, lon: -5.6386 },
  { name: 'Lora del Río', lat: 37.6567, lon: -5.5269 },
  { name: 'Cazalla de la Sierra', lat: 37.9308, lon: -5.7611 },
  { name: 'Aracena', lat: 37.8911, lon: -6.5606 },
  { name: 'Cortegana', lat: 37.9089, lon: -6.8222 },
  { name: 'Baena', lat: 37.6158, lon: -4.3253 },
  { name: 'Alcalá la Real', lat: 37.4619, lon: -3.9231 },
  { name: 'Martos', lat: 37.7214, lon: -3.9667 },
  { name: 'Constantina', lat: 37.8744, lon: -5.6200 },
  { name: 'Tudela', lat: 42.0617, lon: -1.6044 },
  { name: 'Barañáin', lat: 42.8050, lon: -1.6781 },
  { name: 'Burlada', lat: 42.8258, lon: -1.6144 },
  { name: 'Calahorra', lat: 42.3050, lon: -1.9647 },
  { name: 'Arnedo', lat: 42.2275, lon: -2.1000 },
  { name: 'Haro', lat: 42.5769, lon: -2.8461 },
  { name: 'Astorga', lat: 42.4550, lon: -6.0536 },
  { name: 'Béjar', lat: 40.3853, lon: -5.7631 },
  { name: 'Ciudad Rodrigo', lat: 40.5978, lon: -6.5333 },
  { name: 'Tordesillas', lat: 41.5008, lon: -5.0006 },
  { name: 'Laguna de Duero', lat: 41.5833, lon: -4.7214 },
  { name: 'San Andrés del Rabanedo', lat: 42.6108, lon: -5.6186 },
  { name: 'Arenas de San Pedro', lat: 40.2081, lon: -5.0911 },
  { name: 'Cuéllar', lat: 41.4011, lon: -4.3200 },
  { name: 'Bembibre', lat: 42.6167, lon: -6.4167 },
  { name: 'Toro', lat: 41.5217, lon: -5.3942 },
  { name: 'Viveiro', lat: 43.6625, lon: -7.5956 },
  { name: 'Ribadeo', lat: 43.5358, lon: -7.0397 },
  { name: 'Laredo', lat: 43.4117, lon: -3.4144 },
  { name: 'Santoña', lat: 43.4439, lon: -3.4578 },
  { name: 'Écija', lat: 37.5401, lon: -5.0768 },
  { name: 'Ronda', lat: 36.7423, lon: -5.1611 },
  { name: 'Úbeda', lat: 38.0123, lon: -3.3713 },
  { name: 'Aranjuez', lat: 40.0306, lon: -3.6028 },
  { name: 'Aguilar de la Frontera', lat: 37.5181, lon: -4.6565 },
  { name: 'Albolote', lat: 37.2302, lon: -3.6575 },
  { name: 'Albox', lat: 37.3895, lon: -2.1481 },
  { name: 'Cártama', lat: 36.7119, lon: -4.6301 },
  { name: 'Coín', lat: 36.6593, lon: -4.7568 },
  { name: 'Huércal-Overa', lat: 37.3916, lon: -1.9442 },
  { name: 'Illescas', lat: 40.1265, lon: -3.8471 },
  { name: 'Seseña', lat: 40.1042, lon: -3.6963 },
  { name: 'Tarancón', lat: 40.0076, lon: -3.0074 },
  { name: 'Baza', lat: 37.4892, lon: -2.7745 },
  { name: 'Guadix', lat: 37.3005, lon: -3.1362 },
  { name: 'Loja', lat: 37.1661, lon: -4.1523 },
  { name: 'Almuñécar', lat: 36.7339, lon: -3.6895 },
  { name: 'Salobreña', lat: 36.7423, lon: -3.5872 },
  { name: 'Nerja', lat: 36.7493, lon: -3.8768 },
  { name: 'Torrox', lat: 36.7578, lon: -3.9526 },
  { name: 'Rincón de la Victoria', lat: 36.7157, lon: -4.2796 },
  { name: 'Alhaurín de la Torre', lat: 36.6625, lon: -4.5654 },
  { name: 'Alhaurín el Grande', lat: 36.6431, lon: -4.6892 },
  { name: 'Conil de la Frontera', lat: 36.2771, lon: -6.0888 },
  { name: 'Barbate', lat: 36.1923, lon: -5.9224 },
  { name: 'Tarifa', lat: 36.0143, lon: -5.6044 },
  { name: 'San Roque', lat: 36.2102, lon: -5.3831 },
  { name: 'La Línea de la Concepción', lat: 36.1683, lon: -5.3482 },
  { name: 'Los Barrios', lat: 36.1834, lon: -5.4921 },
  { name: 'Puerto Real', lat: 36.5295, lon: -6.1912 },
  { name: 'Rota', lat: 36.6231, lon: -6.3601 },
  { name: 'Chipiona', lat: 36.7346, lon: -6.4389 },
  { name: 'Lebrija', lat: 37.1192, lon: -6.0754 },
  { name: 'Las Cabezas de San Juan', lat: 37.2001, lon: -5.9362 },
  { name: 'Los Palacios y Villafranca', lat: 37.1604, lon: -5.9255 },
  { name: 'Mairena del Aljarafe', lat: 37.3452, lon: -6.0641 },
  { name: 'San Juan de Aznalfarache', lat: 37.3595, lon: -6.0273 },
  { name: 'Camas', lat: 37.4012, lon: -6.0334 },
  { name: 'Tomares', lat: 37.3751, lon: -6.0456 },
  { name: 'Castilleja de la Cuesta', lat: 37.3872, lon: -6.0521 },
  { name: 'Bormujos', lat: 37.3713, lon: -6.0712 },
  { name: 'Coria del Río', lat: 37.2864, lon: -6.0518 },
  { name: 'Sanlúcar la Mayor', lat: 37.3821, lon: -6.2023 },
  { name: 'Osuna', lat: 37.2375, lon: -5.1034 },
  { name: 'Marchena', lat: 37.3302, lon: -5.4168 },
  { name: 'Morón de la Frontera', lat: 37.1235, lon: -5.4521 },
  { name: 'Arahal', lat: 37.2624, lon: -5.5457 },
  { name: 'Estepa', lat: 37.2916, lon: -4.8772 },
  { name: 'Puente Genil', lat: 37.3871, lon: -4.7695 },
  { name: 'Cabra', lat: 37.4724, lon: -4.4326 },
  { name: 'Palma del Río', lat: 37.6978, lon: -5.2811 },
  { name: 'Fernán-Núñez', lat: 37.6715, lon: -4.7243 },
  { name: 'Montoro', lat: 38.0241, lon: -4.3832 },
  { name: 'Villafranca de los Barros', lat: 38.5614, lon: -6.3385 },
  { name: 'Azuaga', lat: 38.2612, lon: -5.6774 },
  { name: 'Llerena', lat: 38.2385, lon: -6.0152 },
  { name: 'Castuera', lat: 38.7201, lon: -5.5446 },
  { name: 'Herrera del Duque', lat: 39.1678, lon: -5.0503 },
  { name: 'Campanario', lat: 38.8631, lon: -5.6174 },
  { name: 'Pinto', lat: 40.2415, lon: -3.7001 },
  { name: 'Colmenar Viejo', lat: 40.6586, lon: -3.7667 },
  { name: 'Altea', lat: 38.5989, lon: -0.0514 },
  { name: 'Calp', lat: 38.6447, lon: 0.0445 },
  { name: 'Villajoyosa', lat: 38.5085, lon: -0.2333 },
  { name: 'Mutxamel', lat: 38.4194, lon: -0.4452 },
  { name: 'Novelda', lat: 38.3840, lon: -0.7663 },
  { name: 'Ibi', lat: 38.6253, lon: -0.5727 },
  { name: 'Villena', lat: 38.6341, lon: -0.8661 },
  { name: 'Petrer', lat: 38.4831, lon: -0.7719 },
  { name: 'Santa Pola', lat: 38.1917, lon: -0.5658 },
  { name: 'Almoradí', lat: 38.1102, lon: -0.7909 },
  { name: 'Callosa de Segura', lat: 38.1228, lon: -0.8797 },
  { name: 'Rojales', lat: 38.0863, lon: -0.7238 },
  { name: 'Guardamar del Segura', lat: 38.0898, lon: -0.6558 },
  { name: 'Aspe', lat: 38.3458, lon: -0.7674 },
  { name: 'Oliva', lat: 38.9192, lon: -0.1192 },
  { name: 'Cullera', lat: 39.1633, lon: -0.2526 },
  { name: 'Sueca', lat: 39.2016, lon: -0.3117 },
  { name: 'Alzira', lat: 39.1517, lon: -0.4357 },
  { name: 'Carcaixent', lat: 39.1215, lon: -0.4497 },
  { name: 'Algemesí', lat: 39.1895, lon: -0.4377 },
  { name: 'Requena', lat: 39.4883, lon: -1.1004 },
  { name: 'Utiel', lat: 39.5673, lon: -1.2045 },
  { name: 'Llíria', lat: 39.6247, lon: -0.5954 },
  { name: 'Bétera', lat: 39.5878, lon: -0.4623 },
  { name: 'Ribarroja del Turia', lat: 39.5469, lon: -0.5677 },
  { name: 'Aldaia', lat: 39.4635, lon: -0.4616 },
  { name: 'Alaquàs', lat: 39.4578, lon: -0.4577 },
  { name: 'Manises', lat: 39.4925, lon: -0.4593 },
  { name: 'Xirivella', lat: 39.4658, lon: -0.4269 },
  { name: 'Quart de Poblet', lat: 39.4828, lon: -0.4439 },
  { name: 'Mislata', lat: 39.4754, lon: -0.4172 },
  { name: 'Alboraya', lat: 39.5002, lon: -0.3503 },
  { name: 'Moncada', lat: 39.5459, lon: -0.3957 },
  { name: 'Catarroja', lat: 39.4038, lon: -0.4037 },
  { name: 'Alfafar', lat: 39.4217, lon: -0.3892 },
  { name: 'Paiporta', lat: 39.4286, lon: -0.4184 },
  { name: 'Picassent', lat: 39.3624, lon: -0.4616 },
  { name: 'Silla', lat: 39.3639, lon: -0.4121 },
  { name: 'Onda', lat: 39.9634, lon: -0.2605 },
  { name: 'Benicarló', lat: 40.4165, lon: 0.4243 },
  { name: 'Peñíscola', lat: 40.3592, lon: 0.4048 },
  { name: 'Oropesa del Mar', lat: 40.0911, lon: 0.1332 },
  { name: 'Benicàssim', lat: 40.0543, lon: 0.0637 },
  { name: 'Nules', lat: 39.8524, lon: -0.1558 },
  { name: 'Burriana', lat: 39.8893, lon: -0.0838 },
  { name: 'Almassora', lat: 39.9439, lon: -0.0628 },
  { name: 'Sant Andreu de la Barca', lat: 41.4485, lon: 1.9754 },
  { name: 'Martorell', lat: 41.4746, lon: 1.9304 },
  { name: 'Esparreguera', lat: 41.5392, lon: 1.8679 },
  { name: 'Olesa de Montserrat', lat: 41.5434, lon: 1.8943 },
  { name: 'Castellar del Vallès', lat: 41.6186, lon: 2.0886 },
  { name: 'Sant Quirze del Vallès', lat: 41.5330, lon: 2.0827 },
  { name: 'Barberà del Vallès', lat: 41.5165, lon: 2.1264 },
  { name: 'Ripollet', lat: 41.5037, lon: 2.1558 },
  { name: 'Montcada i Reixac', lat: 41.4851, lon: 2.1873 },
  { name: 'Santa Perpètua de Mogoda', lat: 41.5348, lon: 2.1818 },
  { name: 'Premià de Mar', lat: 41.4925, lon: 2.3585 },
  { name: 'Masnou', lat: 41.4812, lon: 2.3160 },
  { name: 'Vilassar de Mar', lat: 41.5042, lon: 2.3929 },
  { name: 'Pineda de Mar', lat: 41.6267, lon: 2.6897 },
  { name: 'Malgrat de Mar', lat: 41.6455, lon: 2.7423 },
  { name: 'Calella', lat: 41.6166, lon: 2.6663 },
  { name: 'Arenys de Mar', lat: 41.5815, lon: 2.5501 },
  { name: 'Sitges', lat: 41.2372, lon: 1.8115 },
  { name: 'Sant Pere de Ribes', lat: 41.2618, lon: 1.7744 },
  { name: 'Cubelles', lat: 41.2064, lon: 1.6749 },
  { name: 'Calafell', lat: 41.1996, lon: 1.5684 },
  { name: 'Cambrils', lat: 41.0673, lon: 1.0583 },
  { name: 'Salou', lat: 41.0772, lon: 1.1396 },
  { name: 'Vila-seca', lat: 41.1111, lon: 1.1472 },
  { name: 'Valls', lat: 41.2858, lon: 1.2505 },
  { name: 'Amposta', lat: 40.7107, lon: 0.5794 },
  { name: 'Sant Carles de la Ràpita', lat: 40.6181, lon: 0.5925 },
  { name: 'Banyoles', lat: 42.1186, lon: 2.7661 },
  { name: 'Palamós', lat: 41.8499, lon: 3.1292 },
  { name: 'Sant Feliu de Guíxols', lat: 41.7828, lon: 3.0272 },
  { name: 'Castelló d\'Empúries', lat: 42.2592, lon: 3.0763 },
  { name: 'Lloret de Mar', lat: 41.6999, lon: 2.8475 },
  { name: 'Blanes', lat: 41.6746, lon: 2.7904 },
  { name: 'Salt', lat: 41.9754, lon: 2.7937 },
  { name: 'Gavà', lat: 41.3075, lon: 2.0028 },
  { name: 'Viladecans', lat: 41.3168, lon: 2.0148 },
  { name: 'Sant Boi de Llobregat', lat: 41.3462, lon: 2.0401 },
  { name: 'El Prat de Llobregat', lat: 41.3323, lon: 2.0911 },
  { name: 'Sant Feliu de Llobregat', lat: 41.3831, lon: 2.0457 },
  { name: 'Sant Joan Despí', lat: 41.3686, lon: 2.0560 },
  { name: 'Sant Just Desvern', lat: 41.3813, lon: 2.0766 },
  { name: 'Esplugues de Llobregat', lat: 41.3768, lon: 2.0863 },
  { name: 'Ciempozuelos', lat: 40.1601, lon: -3.6190 },
  { name: 'Navalcarnero', lat: 40.2878, lon: -4.0142 },
  { name: 'San Lorenzo de El Escorial', lat: 40.5921, lon: -4.1481 },
  { name: 'El Escorial', lat: 40.5828, lon: -4.1278 },
  { name: 'Galapagar', lat: 40.5786, lon: -4.0041 },
  { name: 'Villanueva de la Cañada', lat: 40.4468, lon: -4.0028 },
  { name: 'Villanueva del Pardillo', lat: 40.4316, lon: -3.9622 },
  { name: 'Algete', lat: 40.5968, lon: -3.4988 },
  { name: 'Mejorada del Campo', lat: 40.3957, lon: -3.4862 },
  { name: 'San Fernando de Henares', lat: 40.4262, lon: -3.5350 },
  { name: 'Paracuellos de Jarama', lat: 40.5057, lon: -3.5329 },
  { name: 'Guadarrama', lat: 40.6724, lon: -4.0886 },
  { name: 'San Martín de la Vega', lat: 40.2078, lon: -3.5701 },
  { name: 'Humanes de Madrid', lat: 40.2505, lon: -3.8291 },
  { name: 'San Martín de Valdeiglesias', lat: 40.3601, lon: -4.3986 },
  { name: 'Pozuelo de Alarcón', lat: 40.4347, lon: -3.8139 },
  { name: 'San Javier', lat: 37.8041, lon: -0.8384 },
  { name: 'San Pedro del Pinatar', lat: 37.8360, lon: -0.7915 },
  { name: 'Mazarrón', lat: 37.5973, lon: -1.3146 },
  { name: 'Totana', lat: 37.7663, lon: -1.5002 },
  { name: 'Alhama de Murcia', lat: 37.8504, lon: -1.4246 },
  { name: 'Jumilla', lat: 38.4754, lon: -1.3255 },
  { name: 'Tres Cantos', lat: 40.6007, lon: -3.7079 },
  { name: 'Boadilla del Monte', lat: 40.4072, lon: -3.8757 },
  { name: 'Arganda del Rey', lat: 40.3001, lon: -3.4385 },
  { name: 'Collado Villalba', lat: 40.6430, lon: -4.0076 },
  { name: 'Granollers', lat: 41.6079, lon: 2.2872 },
  { name: 'Cerdanyola del Vallès', lat: 41.4924, lon: 2.1404 },
  { name: 'Mollet del Vallès', lat: 41.5392, lon: 2.2132 },
  { name: 'Vic', lat: 41.9301, lon: 2.2548 },
  { name: 'Figueres', lat: 42.2665, lon: 2.9616 },
  { name: 'Igualada', lat: 41.5787, lon: 1.6172 },
  { name: 'Vilafranca del Penedès', lat: 41.3465, lon: 1.7002 },
  { name: 'El Vendrell', lat: 41.2212, lon: 1.5350 },
  { name: 'Tortosa', lat: 40.8125, lon: 0.5216 },
  { name: 'Olot', lat: 42.1810, lon: 2.4901 },
  { name: 'Vinaròs', lat: 40.4704, lon: 0.4751 },
  { name: 'Vall d\'Uixó', lat: 39.8211, lon: -0.2370 },
  { name: 'Burjassot', lat: 39.5086, lon: -0.4131 },
  { name: 'Ontinyent', lat: 38.8225, lon: -0.6059 },
  { name: 'Xàtiva', lat: 38.9882, lon: -0.5186 },
  { name: 'Dénia', lat: 38.8408, lon: 0.1061 },
  { name: 'Jávea', lat: 38.7891, lon: 0.1661 },
  { name: 'San Vicente del Raspeig', lat: 38.3976, lon: -0.5255 },
  { name: 'Crevillent', lat: 38.2494, lon: -0.8115 },
  { name: 'El Campello', lat: 38.4283, lon: -0.3956 },
  { name: 'Narón', lat: 43.5015, lon: -8.1925 },
  { name: 'Oleiros', lat: 43.3328, lon: -8.3168 },
  { name: 'Carballo', lat: 43.2135, lon: -8.6914 },
  { name: 'Redondela', lat: 42.2831, lon: -8.6083 },
  { name: 'Marín', lat: 42.3921, lon: -8.7042 },
  { name: 'Cangas', lat: 42.2635, lon: -8.7844 },
  { name: 'Ribeira', lat: 42.5562, lon: -8.9912 },
  { name: 'Zarautz', lat: 43.2846, lon: -2.1741 },
  { name: 'Eibar', lat: 43.1843, lon: -2.4729 },
  { name: 'Mondragón', lat: 43.0640, lon: -2.4897 },
  { name: 'Tolosa', lat: 43.1362, lon: -2.0722 },
  { name: 'Basauri', lat: 43.2366, lon: -2.8906 },
  { name: 'Leioa', lat: 43.3283, lon: -2.9904 },
  { name: 'Galdakao', lat: 43.2307, lon: -2.8465 },
  { name: 'Puerto de la Cruz', lat: 28.4165, lon: -16.5492 },
  { name: 'Los Realejos', lat: 28.3831, lon: -16.5833 },
  { name: 'Arucas', lat: 28.1186, lon: -15.5218 },
  { name: 'Agüimes', lat: 27.9048, lon: -15.4462 },
  { name: 'Manacor', lat: 39.5696, lon: 3.2096 },
  { name: 'Inca', lat: 39.7214, lon: 2.9113 },
  { name: 'Ciutadella', lat: 39.9997, lon: 3.8348 },
  { name: 'Aranda de Duero', lat: 41.6702, lon: -3.6892 },
  { name: 'Miranda de Ebro', lat: 42.6865, lon: -2.9469 },
  { name: 'Medina del Campo', lat: 41.3056, lon: -4.9142 },
  { name: 'Benavente', lat: 42.0028, lon: -5.6783 },
  { name: 'Puertollano', lat: 38.6871, lon: -4.1073 },
  { name: 'Tomelloso', lat: 39.1555, lon: -3.0223 },
  { name: 'Alcázar de San Juan', lat: 39.3900, lon: -3.2104 },
  { name: 'Valdepeñas', lat: 38.7610, lon: -3.3838 },
  { name: 'Yecla', lat: 38.6146, lon: -1.1118 },
  { name: 'Águilas', lat: 37.4062, lon: -1.5818 },
  { name: 'Torre-Pacheco', lat: 37.7410, lon: -0.9542 },
  { name: 'Siero', lat: 43.3922, lon: -5.6601 },
  { name: 'Langreo', lat: 43.2965, lon: -5.6830 },
  { name: 'Castro-Urdiales', lat: 43.3828, lon: -3.2185 },
  { name: 'Camargo', lat: 43.4241, lon: -3.8566 },
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
  { name: 'Gáldar', lat: 28.1472, lon: -15.6503 },
  { name: 'Santa Brígida', lat: 28.0333, lon: -15.4998 },
  { name: 'Teror', lat: 28.0587, lon: -15.5476 },
  { name: 'Icod de los Vinos', lat: 28.3670, lon: -16.7135 },
  { name: 'Güímar', lat: 28.3146, lon: -16.4111 },
  { name: 'Candelaria', lat: 28.3547, lon: -16.3705 },
  { name: 'Tacoronte', lat: 28.4800, lon: -16.4158 },
  { name: 'Pájara', lat: 28.3512, lon: -14.1084 },
  { name: 'Tuineje', lat: 28.3228, lon: -14.0475 },
  { name: 'Yaiza', lat: 28.9542, lon: -13.7663 },
  { name: 'Teguise', lat: 29.0607, lon: -13.5594 },
  { name: 'Los Llanos de Aridane', lat: 28.6585, lon: -17.9182 },
  { name: 'Santa Cruz de la Palma', lat: 28.6835, lon: -17.7642 },
  { name: 'Valverde', lat: 27.8063, lon: -17.9158 },
  { name: 'San Sebastián de la Gomera', lat: 28.0916, lon: -17.1133 },
  { name: 'La Orotava', lat: 28.3900, lon: -16.5227 },
  { name: 'Guía de Isora', lat: 28.2114, lon: -16.7797 },
  { name: 'Carballiño', lat: 42.4307, lon: -8.0772 },
  { name: 'Verín', lat: 41.9409, lon: -7.4373 },
  { name: 'O Barco de Valdeorras', lat: 42.4170, lon: -6.9858 },
  { name: 'Xinzo de Limia', lat: 42.0629, lon: -7.7246 },
  { name: 'Sarria', lat: 42.7801, lon: -7.4143 },
  { name: 'Monforte de Lemos', lat: 42.5218, lon: -7.5146 },
  { name: 'Vilalba', lat: 43.2982, lon: -7.6806 },
  { name: 'Foz', lat: 43.5684, lon: -7.2562 },
  { name: 'Burela', lat: 43.6601, lon: -7.3571 },
  { name: 'Cedeira', lat: 43.6593, lon: -8.0543 },
  { name: 'Betanzos', lat: 43.2810, lon: -8.2113 },
  { name: 'Sada', lat: 43.3519, lon: -8.2541 },
  { name: 'Arteixo', lat: 43.3045, lon: -8.5065 },
  { name: 'Culleredo', lat: 43.2882, lon: -8.3894 },
  { name: 'Cambre', lat: 43.2926, lon: -8.3444 },
  { name: 'Tui', lat: 42.0468, lon: -8.6443 },
  { name: 'O Porriño', lat: 42.1611, lon: -8.6200 },
  { name: 'Nigrán', lat: 42.1415, lon: -8.8066 },
  { name: 'Baiona', lat: 42.1197, lon: -8.8496 },
  { name: 'Moaña', lat: 42.2797, lon: -8.7479 },
  { name: 'Sanxenxo', lat: 42.4005, lon: -8.8055 },
  { name: 'A Estrada', lat: 42.6888, lon: -8.4947 },
  { name: 'Lalín', lat: 42.6617, lon: -8.1118 },
  { name: 'Llodio', lat: 43.1412, lon: -2.9613 },
  { name: 'Amurrio', lat: 43.0531, lon: -3.0003 },
  { name: 'Hernani', lat: 43.2662, lon: -1.9760 },
  { name: 'Errenteria', lat: 43.3117, lon: -1.8988 },
  { name: 'Pasaia', lat: 43.3255, lon: -1.9281 },
  { name: 'Hondarribia', lat: 43.3629, lon: -1.7915 },
  { name: 'Andoain', lat: 43.2198, lon: -2.0198 },
  { name: 'Beasain', lat: 43.0470, lon: -2.2032 },
  { name: 'Azpeitia', lat: 43.1837, lon: -2.2651 },
  { name: 'Bergara', lat: 43.1165, lon: -2.4137 },
  { name: 'Oñati', lat: 43.0336, lon: -2.4133 },
  { name: 'Durango', lat: 43.1706, lon: -2.6322 },
  { name: 'Gernika-Lumo', lat: 43.3155, lon: -2.6780 },
  { name: 'Bermeo', lat: 43.4215, lon: -2.7214 },
  { name: 'Mungia', lat: 43.3542, lon: -2.8466 },
  { name: 'Sestao', lat: 43.3087, lon: -3.0076 },
  { name: 'Santurtzi', lat: 43.3298, lon: -3.0315 },
  { name: 'Ermua', lat: 43.1852, lon: -2.5029 },
  { name: 'Calamocha', lat: 40.9192, lon: -1.3006 },
  { name: 'Caspe', lat: 41.2338, lon: 0.0396 },
  { name: 'Tauste', lat: 41.9168, lon: -1.2541 },
  { name: 'Alagón', lat: 41.7702, lon: -1.1197 },
  { name: 'La Almunia de Doña Godina', lat: 41.4754, lon: -1.3752 },
  { name: 'Borja', lat: 41.8335, lon: -1.5332 },
  { name: 'Cariñena', lat: 41.3364, lon: -1.2269 },
  { name: 'Andorra', lat: 40.9781, lon: -0.4468 },
  { name: 'Calanda', lat: 40.9405, lon: -0.2319 },
  { name: 'Cangas del Narcea', lat: 43.1770, lon: -6.5502 },
  { name: 'Tineo', lat: 43.3387, lon: -6.4150 },
  { name: 'Grado', lat: 43.3887, lon: -6.0728 },
  { name: 'Villaviciosa', lat: 43.4816, lon: -5.4344 },
  { name: 'Llanes', lat: 43.4208, lon: -4.7533 },
  { name: 'Ribadesella', lat: 43.4616, lon: -5.0592 },
  { name: 'Potes', lat: 43.1534, lon: -4.6231 },
  { name: 'Reinosa', lat: 42.9996, lon: -4.1378 },
  { name: 'Cabezón de la Sal', lat: 43.3075, lon: -4.2323 },
  { name: 'Suances', lat: 43.4326, lon: -4.0436 },
  { name:'Badajoz', lat:38.8794, lon:-6.9707 },
  { name:'Santander', lat:43.4623, lon:-3.8100 },
  { name: 'Barcelona - Poblenou / Sant Martí', lat: 41.4036, lon: 2.2033 },
  { name: 'Barcelona - Eixample', lat: 41.3879, lon: 2.1554 },
  { name: 'Barcelona - Ciutat Vella', lat: 41.3818, lon: 2.1732 },
  { name: 'Barcelona - Gràcia', lat: 41.4038, lon: 2.1557 },
  { name: 'Barcelona - Sants', lat: 41.3762, lon: 2.1378 },
  { name: 'Barcelona - Sarrià', lat: 41.3992, lon: 2.1205 },
  { name: 'Barcelona - Les Corts', lat: 41.3833, lon: 2.1250 },
  { name: 'Barcelona - Horta-Guinardó', lat: 41.4312, lon: 2.1620 },
  { name: 'Barcelona - Nou Barris', lat: 41.4423, lon: 2.1764 },
  { name: 'Barcelona - Sant Andreu', lat: 41.4350, lon: 2.1908 },
  { name: 'Barcelona - Montjuïc', lat: 41.3648, lon: 2.1587 },
  { name: 'Barcelona - Zona Universitària', lat: 41.3831, lon: 2.1121 },
  { name: 'Barcelona - Sagrera', lat: 41.4215, lon: 2.1862 },
  { name: 'Barcelona - El Born', lat: 41.3851, lon: 2.1822 },
  { name: 'Barcelona - Pedralbes', lat: 41.3892, lon: 2.1134 },
  { name: 'Sevilla - Centro', lat: 37.3891, lon: -5.9845 },
  { name: 'Sevilla - Nervión', lat: 37.3834, lon: -5.9721 },
  { name: 'Sevilla - Triana', lat: 37.3839, lon: -6.0041 },
  { name: 'Sevilla - Los Remedios', lat: 37.3732, lon: -6.0022 },
  { name: 'Sevilla - Macarena', lat: 37.4022, lon: -5.9889 },
  { name: 'Sevilla - Sevilla Este', lat: 37.3941, lon: -5.9272 },
  { name: 'Sevilla - El Porvenir', lat: 37.3695, lon: -5.9821 },
  { name: 'Sevilla - Santa Justa / San Pablo', lat: 37.3952, lon: -5.9701 },
  { name: 'Sevilla - Cartuja', lat: 37.4091, lon: -6.0072 },
  { name: 'Sevilla - Bellavista', lat: 37.3361, lon: -5.9752 },
  { name: 'Sevilla - Alcosa', lat: 37.4121, lon: -5.9351 },
  { name: 'Sevilla - Heliópolis', lat: 37.3552, lon: -5.9812 },
  { name: 'Sevilla - El Plantinar', lat: 37.3752, lon: -5.9761 },
  { name: 'Sevilla - Pino Montano', lat: 37.4182, lon: -5.9831 },
  { name: 'Sevilla - Amate', lat: 37.3781, lon: -5.9521 },
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
  const lang0 = (typeof currentLang !== 'undefined') ? currentLang : 'es';
  const dict0 = (typeof translations !== 'undefined') ? (translations[lang0] || translations.es) : null;
  const statusLineEl0 = document.getElementById('statusLine');
  if (statusLineEl0 && dict0) statusLineEl0.textContent = dict0.statusLoading;

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const tileUrl = () => isDark()
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  let tileLayer = L.tileLayer(tileUrl(), { attribution: '© OpenStreetMap · © CARTO', maxZoom: 18 }).addTo(map);

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn){
    themeBtn.addEventListener('click', () => {
      setTimeout(() => {
        map.removeLayer(tileLayer);
        tileLayer = L.tileLayer(tileUrl(), { attribution: '© OpenStreetMap · © CARTO', maxZoom: 18 }).addTo(map);
      }, 0);
    });
  }

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
  // El mapa Leaflet pesa (tiles + 486 KB de datos) y era el elemento LCP
  // (~9,9 s en móvil). Se inicializa cuando el navegador está libre para
  // que el mayor pintado con contenido sea el texto del hero.
  const iniciarMapa = () => initMap();
  if ('requestIdleCallback' in window) requestIdleCallback(iniciarMapa, { timeout: 2500 });
  else window.addEventListener('load', () => setTimeout(iniciarMapa, 100));
});