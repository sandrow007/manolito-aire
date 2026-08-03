/* ============================================================ MANOLITO AIRE — i18n Castellano, català, euskera, galego. Uso: pon data-i18n="clave" en cualquier elemento de texto, o data-i18n-placeholder para inputs. ============================================================ *

pasted


Diagnosed translation conflicts and reconciled competing system architectures
Diagnosed translation conflicts and reconciled competing system architectures
Ahí está el lío — parece que Copilot (lo vi abierto en tu VS Code en la captura anterior) ha tocado este mismo archivo y se ha cargado las claves que yo había añadido (orb_good, orb_mid, orb_bad, quick_pm25, region_peninsula...) para meter un sistema nuevo (hero_title_good, función t()) que no está conectado con nada — tu app.js sigue usando getMessages() y dict[orb_...], que ya no existen en este archivo. Por eso se rompió.

Aviso importante: si tienes a Copilot y a mí editando los mismos archivos a la vez, nos vamos a pisar constantemente — mejor usa uno de los dos para este proyecto, si no vamos a perseguirnos la cola.

Te dejo el i18n.js reparado, con lo tuyo de hero_title_good quitado (no lo usa nada, así que solo estorbaba) y las claves que sí necesita app.js recuperadas:


Ver mi versión de referencia que sí tiene todas las claves correctas
Ver mi versión de referencia que sí tiene todas las claves correctas

Ver mi versión de referencia que sí tiene todas las claves correctas
bash

cat /home/claude/manolito-aire/js/i18n.js
Salida

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
    orb_good: "bien", orb_mid: "regular", orb_bad: "malo",
    quick_pm25: "¿Qué es el PM2.5?", quick_color: "¿Por qué cambia el color?", quick_bebe: "¿Es seguro salir con mi bebé?",
    region_peninsula: "Península", region_canarias: "Canarias", region_baleares: "Baleares", region_ceutamelilla: "Ceuta / Melilla",
    statusLoading: "Cargando datos en vivo…",
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
    orb_good: "bé", orb_mid: "regular", orb_bad: "dolent",
    quick_pm25: "Què és el PM2.5?", quick_color: "Per què canvia el color?", quick_bebe: "És segur sortir amb el meu nadó?",
    region_peninsula: "Península", region_canarias: "Canàries", region_baleares: "Balears", region_ceutamelilla: "Ceuta / Melilla",
    statusLoading: "Carregant dades en directe…",
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
    orb_good: "ondo", orb_mid: "erdi", orb_bad: "gaizki",
    quick_pm25: "Zer da PM2.5?", quick_color: "Zergatik aldatzen da kolorea?", quick_bebe: "Seguru al dago haurrarekin irtetea?",
    region_peninsula: "Penintsula", region_canarias: "Kanariar Uharteak", region_baleares: "Balear Uharteak", region_ceutamelilla: "Ceuta / Melilla",
    statusLoading: "Zuzeneko datuak kargatzen…",
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
    orb_good: "ben", orb_mid: "regular", orb_bad: "mal",
    quick_pm25: "Que é o PM2.5?", quick_color: "Por que cambia a cor?", quick_bebe: "É seguro saír co meu bebé?",
    region_peninsula: "Península", region_canarias: "Canarias", region_baleares: "Baleares", region_ceutamelilla: "Ceuta / Melilla",
    statusLoading: "Cargando datos en vivo…",
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
    orb_good: "good", orb_mid: "moderate", orb_bad: "bad",
    quick_pm25: "What is PM2.5?", quick_color: "Why does the colour change?", quick_bebe: "Is it safe to go out with my baby?",
    region_peninsula: "Mainland", region_canarias: "Canary Islands", region_baleares: "Balearic Islands", region_ceutamelilla: "Ceuta / Melilla",
    statusLoading: "Loading live data…",
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
  if (typeof renderHero === 'function') renderHero();
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
