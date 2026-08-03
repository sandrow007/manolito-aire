/* ============================================================
   MANOLITO AIRE — i18n
   Castellano, català, euskera, galego.
   Uso: pon data-i18n="clave" en cualquier elemento de texto,
   o data-i18n-placeholder para inputs.
   ============================================================ */

const translations = {
  es: {
    tagline: "MAPA NACIONAL · DATOS EN VIVO",
    modesLabel: "¿Cómo quieres que te lo cuente?",
    mode_ciudadano_title: "Ciudadano",
    mode_ciudadano_sub: "Claro y directo",
    mode_cientifico_title: "Científico",
    mode_cientifico_sub: "Con los datos",
    mode_yayo_title: "Abuela / Abuelo",
    mode_yayo_sub: "Letra grande, sin prisa",
    mode_peque_title: "Peque (5 años)",
    mode_peque_sub: "Con dibujitos",
    imLost: "No lo entiendo, explícamelo",
    mapTitle: "El aire de España, ahora mismo",
    legendGood: "Buena",
    legendMid: "Moderada",
    legendBad: "Mala",
    legendNote: "Los puntos son estaciones reales. El color entre ciudades es estimado, no medido.",
    aboutLink: "¿Por qué existe esto?",
    chatOpen: "Pregúntale a Manolito",
    chatTitle: "Manolito te lo explica",
    chatWelcome: "Tranquilo/a, vamos con calma. Dime qué no entiendes, o elige una pregunta.",
    chatPlaceholder: "Escribe tu pregunta aquí...",
    chatSend: "Enviar",
    footerFamily: "Manolit∞ Forestal · Islas de Calor Sevilla · Manolito Aire",
  },
  ca: {
    tagline: "MAPA NACIONAL · DADES EN VIU",
    modesLabel: "Com vols que t'ho expliqui?",
    mode_ciudadano_title: "Ciutadà",
    mode_ciudadano_sub: "Clar i directe",
    mode_cientifico_title: "Científic",
    mode_cientifico_sub: "Amb les dades",
    mode_yayo_title: "Àvia / Avi",
    mode_yayo_sub: "Lletra gran, sense pressa",
    mode_peque_title: "Petit (5 anys)",
    mode_peque_sub: "Amb dibuixos",
    imLost: "No ho entenc, explica-m'ho",
    mapTitle: "L'aire d'Espanya, ara mateix",
    legendGood: "Bona",
    legendMid: "Moderada",
    legendBad: "Dolenta",
    legendNote: "Els punts són estacions reals. El color entre ciutats és estimat, no mesurat.",
    aboutLink: "Per què existeix això?",
    chatOpen: "Pregunta-li a Manolito",
    chatTitle: "Manolito t'ho explica",
    chatWelcome: "Tranquil·litat, anem a poc a poc. Digue'm què no entens, o tria una pregunta.",
    chatPlaceholder: "Escriu la teva pregunta aquí...",
    chatSend: "Enviar",
    footerFamily: "Manolit∞ Forestal · Illes de Calor Sevilla · Manolito Aire",
  },
  eu: {
    tagline: "ESTATU MAPA · ZUZENEKO DATUAK",
    modesLabel: "Nola nahi duzu azaltzea?",
    mode_ciudadano_title: "Herritarra",
    mode_ciudadano_sub: "Argi eta zuzen",
    mode_cientifico_title: "Zientifikoa",
    mode_cientifico_sub: "Datuekin",
    mode_yayo_title: "Amona / Aitona",
    mode_yayo_sub: "Letra handia, lasai",
    mode_peque_title: "Txikia (5 urte)",
    mode_peque_sub: "Marrazkiekin",
    imLost: "Ez dut ulertzen, azaldu",
    mapTitle: "Espainiako airea, orain",
    legendGood: "Ona",
    legendMid: "Ertaina",
    legendBad: "Txarra",
    legendNote: "Puntuak benetako estazioak dira. Hirien arteko kolorea estimatua da, ez neurtua.",
    aboutLink: "Zergatik dago hau?",
    chatOpen: "Galdetu Manolitori",
    chatTitle: "Manolitok azalduko dizu",
    chatWelcome: "Lasai, poliki-poliki goaz. Esan zer ez duzun ulertzen, edo aukeratu galdera bat.",
    chatPlaceholder: "Idatzi zure galdera hemen...",
    chatSend: "Bidali",
    footerFamily: "Manolit∞ Forestal · Sevillako Bero Uharteak · Manolito Aire",
  },
  gl: {
    tagline: "MAPA NACIONAL · DATOS EN VIVO",
    modesLabel: "Como queres que cho conte?",
    mode_ciudadano_title: "Cidadán",
    mode_ciudadano_sub: "Claro e directo",
    mode_cientifico_title: "Científico",
    mode_cientifico_sub: "Cos datos",
    mode_yayo_title: "Avoa / Avó",
    mode_yayo_sub: "Letra grande, sen présa",
    mode_peque_title: "Peque (5 anos)",
    mode_peque_sub: "Con debuxos",
    imLost: "Non o entendo, explícamo",
    mapTitle: "O aire de España, agora mesmo",
    legendGood: "Boa",
    legendMid: "Moderada",
    legendBad: "Mala",
    legendNote: "Os puntos son estacións reais. A cor entre cidades é estimada, non medida.",
    aboutLink: "Por que existe isto?",
    chatOpen: "Pregúntalle a Manolito",
    chatTitle: "Manolito cho explica",
    chatWelcome: "Tranquilo/a, imos con calma. Dime que non entendes, ou escolle unha pregunta.",
    chatPlaceholder: "Escribe a túa pregunta aquí...",
    chatSend: "Enviar",
    footerFamily: "Manolit∞ Forestal · Illas de Calor Sevilla · Manolito Aire",
  },
  en: {
    tagline: "NATIONAL MAP · LIVE DATA",
    modesLabel: "How do you want it explained?",
    mode_ciudadano_title: "Everyday",
    mode_ciudadano_sub: "Clear and direct",
    mode_cientifico_title: "Scientific",
    mode_cientifico_sub: "With the data",
    mode_yayo_title: "Grandparent",
    mode_yayo_sub: "Big text, no rush",
    mode_peque_title: "Kid (age 5)",
    mode_peque_sub: "With little drawings",
    imLost: "I don't get it, explain please",
    mapTitle: "Spain's air, right now",
    legendGood: "Good",
    legendMid: "Moderate",
    legendBad: "Bad",
    legendNote: "Dots are real stations. The colour between cities is estimated, not measured.",
    aboutLink: "Why does this exist?",
    chatOpen: "Ask Manolito",
    chatTitle: "Manolito explains it",
    chatWelcome: "No worries, let's take it slow. Tell me what you don't understand, or pick a question.",
    chatPlaceholder: "Type your question here...",
    chatSend: "Send",
    footerFamily: "Manolit∞ Forestal · Sevilla Heat Islands · Manolito Aire",
  }
};

let currentLang = localStorage.getItem('manolito_lang') || 'es';

function applyTranslations(){
  const dict = translations[currentLang] || translations.es;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });
  document.querySelectorAll('#langToggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === currentLang);
  });
  document.documentElement.setAttribute('lang', currentLang);
}

function setLang(lang){
  currentLang = lang;
  localStorage.setItem('manolito_lang', lang);
  applyTranslations();
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  const toggle = document.getElementById('langToggle');
  if (toggle){
    toggle.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') setLang(e.target.dataset.lang);
    });
  }
});
