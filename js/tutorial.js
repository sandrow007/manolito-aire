/* ============================================================
   MANOLIT∞ AIRE — tutorial.js (Definitivo 8 Pasos y 5 Idiomas)
   ============================================================ */

'use strict';

(function () {
  const CLAVE_LOCALSTORAGE = 'tutorial_visto';

  const TEXTOS_IDIOMAS = {
    es: {
      next: "Siguiente",
      prev: "Anterior",
      done: "Finalizar",
      pasos: [
        { title: "Elige tu ciudad", desc: "Cambia aquí la ciudad para ver su aire en tiempo real." },
        { title: "¿Cómo quieres que te lo cuente?", desc: "Elige el modo que mejor te venga — mismo dato, explicado distinto." },
        { title: "El aire de España, ahora mismo", desc: "Cada punto es una estación real. Tócalo para ver el detalle." },
        { title: "Ruta y origen", desc: "Escribe aquí tu punto de partida y destino para trazar el camino." },
        { title: "Mapa 3D y sombras", desc: "Visualiza el mapa 3D en tiempo real para calcular tu ruta evitando el sol y aprovecha las sombras completamente gratis." },
        { title: "Pregúntale a Manolito", desc: "¿Algo no te queda claro? Pregúntaselo aquí en cualquier momento." },
        { title: "Apoya la causa", desc: "Manolit∞ siempre será gratis. Si quieres colaborar con los servidores, puedes apoyar en Ko-fi aquí." },
        { title: "Los hermanos de Manolit∞", desc: "Puedes visitar los proyectos (como Manolit∞ Forestal e Islas de Calor Sevilla)." }
      ]
    },
    ca: {
      next: "Següent",
      prev: "Anterior",
      done: "Finalitzar",
      pasos: [
        { title: "Escull la teva ciutat", desc: "Canvia aquí la ciutat per veure el seu aire en temps real." },
        { title: "Com vols que t'ho expliqui?", desc: "Tria el mode que millor et vagi — mateixa dada, explicat diferent." },
        { title: "L'aire d'Espanya, ara mateix", desc: "Cada punt és una estació real. Toca'l per veure el detall." },
        { title: "Ruta i origen", desc: "Escriu aquí el teu punt de partida i destí per traçar el camí." },
        { title: "Mapa 3D i ombres", desc: "Visualitza el mapa 3D en temps real per calcular la teva ruta evitant el sol i aprofitant les ombres completament gratis." },
        { title: "Pregunta a Manolito", desc: "Alguna cosa no et queda clara? Pregunta'm-ho aquí en qualsevol moment." },
        { title: "Dona suport a la causa", desc: "Manolit∞ sempre serà gratis. Si vols col·laborar amb els servidors, pots donar suport a Ko-fi aquí." },
        { title: "Els germans de Manolit∞", desc: "Pots visitar els projectes (com ara Manolit∞ Forestal i Illes de Calor Sevilla)." }
      ]
    },
    eu: {
      next: "Hurrengoa",
      prev: "Aurrekoa",
      done: "Amaitu",
      pasos: [
        { title: "Hautu zure hiria", desc: "Aldatu hemen hiria denbora errealean bere airea ikusteko." },
        { title: "Nola kontatzea nahi duzu?", desc: "Aukeratu onenak datorkizun modua — datu bera, ezberdin azaldua." },
        { title: "Espainiako airea, orain bertan", desc: "Puntu bakoitza benetako estazio bat da. Ukitu xehetasuna ikusteko." },
        { title: "Ibilbidea eta jatorria", desc: "Idatzi hemen zure abiapuntua eta helmuga bidea marrazteko." },
        { title: "3D mapa eta itzalak", desc: "Ikusi 3D mapa denbora errealean zure ibilbidea kalkulatuz eguzkia saihestuz eta itzalak aprobetxatuz, guztiz doan." },
        { title: "Galdetu Manolitori", desc: "Zerbait ez zaizu argi geratzen? Galdetu hemen edozein unetan." },
        { title: "Babestu kausa", desc: "Manolit∞ beti doakoa izango da. Zerbitzariak lagundu nahi badituzu, Ko-fi bidez egin dezakezu." },
        { title: "Manolit∞ren anai-arrebak", desc: "Proiektuak bisitatu ditzakezu (hala nola Manolit∞ Forestal eta Sevillako Bero-Uharteak)." }
      ]
    },
    gl: {
      next: "Seguinte",
      prev: "Anterior",
      done: "Rematar",
      pasos: [
        { title: "Escolle a túa cidade", desc: "Cambia aquí a cidade para ver o seu aire en tempo real." },
        { title: "Como queres que o conte?", desc: "Escolle o modo que mellor te veña — mesmo dato, explicado distinto." },
        { title: "O aire de España, agora mesmo", desc: "Cada punto é unha estación real. Tócao para ver o detalle." },
        { title: "Ruta e orixe", desc: "Escribe aquí o teu punto de partida e destino para trazar o camiño." },
        { title: "Mapa 3D e sombras", desc: "Visualiza o mapa 3D en tempo real para calcular a túa ruta evitando o sol e aproveitando as sombras completamente gratis." },
        { title: "Pregúntalle a Manolito", desc: "Algo non che queda claro? Pregúntamo aquí en calquera momento." },
        { title: "Apoia a causa", desc: "Manolit∞ sempre será gratis. Se queres colaborar cos servidores, podes apoiar en Ko-fi aquí." },
        { title: "Os irmáns de Manolit∞", desc: "Podes visitar os proxectos (como Manolit∞ Forestal e Illas de Calor Sevilla)." }
      ]
    },
    en: {
      next: "Next",
      prev: "Previous",
      done: "Done",
      pasos: [
        { title: "Choose your city", desc: "Change the city here to see its air in real time." },
        { title: "How do you want me to tell you?", desc: "Choose the mode that suits you best — same data, explained differently." },
        { title: "Spain's air, right now", desc: "Each point is a real station. Tap it to see details." },
        { title: "Route and origin", desc: "Type your starting point and destination here to trace the path." },
        { title: "3D Map & Shadows", desc: "View the 3D map in real time to calculate your route avoiding the sun and taking advantage of shadows, completely free." },
        { title: "Ask Manolito", desc: "Something not clear? Ask here at any time." },
        { title: "Support the cause", desc: "Manolit∞ will always be free. If you want to help with servers, you can support via Ko-fi here." },
        { title: "Manolit∞'s Siblings", desc: "You can visit our projects (such as Manolit∞ Forestal and Seville Heat Islands)." }
      ]
    }
  };

  function idiomaActivo() {
    try {
      if (typeof window.getCurrentLang === 'function') {
        const lang = window.getCurrentLang();
        if (TEXTOS_IDIOMAS[lang]) return lang;
      }
      const htmlLang = document.documentElement.getAttribute('lang');
      if (htmlLang && TEXTOS_IDIOMAS[htmlLang.split('-')[0]]) {
        return htmlLang.split('-')[0];
      }
      const stored = localStorage.getItem('manolito_lang');
      if (stored && TEXTOS_IDIOMAS[stored]) return stored;
    } catch (e) {}
    return 'es';
  }

  function obtenerTraducciones() {
    const lang = idiomaActivo();
    return TEXTOS_IDIOMAS[lang] || TEXTOS_IDIOMAS.es;
  }

  function yaVioElTutorial() {
    try { return localStorage.getItem(CLAVE_LOCALSTORAGE) === 'true'; }
    catch (e) { return false; }
  }

  function marcarTutorialVisto() {
    try { localStorage.setItem(CLAVE_LOCALSTORAGE, 'true'); } catch (e) {}
  }

  function cookiesAceptadas() {
    try { return localStorage.getItem('manolito_cookies_choice') === 'accepted'; }
    catch (e) { return false; }
  }

  function construirPasos() {
    const t = obtenerTraducciones();
    return [
      { element: '#cityDropdownBtn', popover: { title: t.pasos[0].title, description: t.pasos[0].desc, side: 'bottom', align: 'start' } },
      { element: '#modeGrid', popover: { title: t.pasos[1].title, description: t.pasos[1].desc, side: 'top', align: 'start' } },
      { element: '#map', popover: { title: t.pasos[2].title, description: t.pasos[2].desc, side: 'top', align: 'center' } },
      { element: '.rs-form', popover: { title: t.pasos[3].title, description: t.pasos[3].desc, side: 'top', align: 'start' } },
      { element: '#shadowRouteMap', popover: { title: t.pasos[4].title, description: t.pasos[4].desc, side: 'top', align: 'center' } },
      { element: '.chat-fab', popover: { title: t.pasos[5].title, description: t.pasos[5].desc, side: 'left', align: 'end' } },
      { element: '.donacion-boton', popover: { title: t.pasos[6].title, description: t.pasos[6].desc, side: 'top', align: 'center' } },
      { element: '.footer-family', popover: { title: t.pasos[7].title, description: t.pasos[7].desc, side: 'top', align: 'center' } }
    ];
  }

  let driverObjActivo = null;

  function obtenerFactoriaDriver() {
    if (typeof window.driver === 'function') return window.driver;
    if (window.driver && typeof window.driver.driver === 'function') return window.driver.driver;
    if (window.driver && window.driver.js && typeof window.driver.js.driver === 'function') return window.driver.js.driver;
    return null;
  }

  function lanzarTutorial() {
    if (yaVioElTutorial()) return;
    if (document.getElementById('manolitoSplash')) return;
    if (!cookiesAceptadas()) return;

    const crearDriver = obtenerFactoriaDriver();
    if (!crearDriver) return;

    const t = obtenerTraducciones();

    try {
      driverObjActivo = crearDriver({
        allowClose: true,
        showButtons: ['next', 'previous', 'close'],
        showProgress: true,
        nextBtnText: t.next,
        prevBtnText: t.prev,
        doneBtnText: t.done,
        steps: construirPasos(),
        onDestroyed: () => { marcarTutorialVisto(); driverObjActivo = null; },
      });
      driverObjActivo.drive();
    } catch (err) {}
  }

  document.addEventListener('langChanged', () => {
    if (!driverObjActivo) return;
    const t = obtenerTraducciones();
    driverObjActivo.setConfig({
      allowClose: true,
      showProgress: true,
      nextBtnText: t.next,
      prevBtnText: t.prev,
      doneBtnText: t.done,
      steps: construirPasos(),
    });
  });

  window.iniciarTutorialManolito = function () {
    lanzarTutorial();
  };

  function verificarYArrancar() {
    if (yaVioElTutorial()) return;
    
    if (!document.getElementById('manolitoSplash') && cookiesAceptadas()) {
      setTimeout(lanzarTutorial, 500);
      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.getElementById('manolitoSplash') && cookiesAceptadas()) {
        observer.disconnect();
        setTimeout(lanzarTutorial, 500);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarYArrancar);
  } else {
    verificarYArrancar();
  }

  document.addEventListener('cookiesAceptadas', () => {
    verificarYArrancar();
  });
})();
