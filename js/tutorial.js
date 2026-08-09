/* ============================================================
   MANOLITO AIRE — tutorial.js (Driver.js)
   Arranca SOLO al aceptar cookies, SOLO una vez (localStorage).
   Textos de los botones enganchados al mismo sistema de i18n
   que el resto de la web — cambia de idioma sin fallar, igual
   que shadows-route.js y app.js.
   ============================================================ */

'use strict';

(function () {
  const CLAVE_LOCALSTORAGE = 'tutorial_visto';

  // Textos de los botones por idioma. Si en tu i18n.js prefieres tenerlos
  // junto a las demás claves, mueve este objeto a `translations` en
  // i18n.js con estas mismas claves (tutorialNext/tutorialPrev/tutorialDone)
  // y borra este bloque — t() los encontrará igual, ya que primero mira
  // siempre el diccionario central antes de este de repuesto.
  const TEXTOS_REPUESTO = {
    es: { next: 'Siguiente', prev: 'Anterior', done: 'Finalizar' },
    ca: { next: 'Següent', prev: 'Anterior', done: 'Finalitzar' },
    eu: { next: 'Hurrengoa', prev: 'Aurrekoa', done: 'Amaitu' },
    gl: { next: 'Seguinte', prev: 'Anterior', done: 'Rematar' },
    en: { next: 'Next', prev: 'Previous', done: 'Done' },
  };

  // Mismo patrón defensivo que shadows-route.js y app.js: lee siempre de
  // window, nunca de una variable suelta — así da igual el orden de carga
  // o si algún otro script redeclara `getMessages`/`currentLang` por su
  // cuenta (fue justo lo que rompió las traducciones la última vez).
  function idiomaActivo() {
    try {
      return (typeof window.getCurrentLang === 'function') ? window.getCurrentLang() : 'es';
    } catch (e) { return 'es'; }
  }

  function textoBoton(clave) {
    const lang = idiomaActivo();
    try {
      if (typeof window.getMessages === 'function') {
        const msg = window.getMessages();
        const claveCompuesta = 'tutorial' + clave[0].toUpperCase() + clave.slice(1); // tutorialNext, tutorialPrev, tutorialDone
        if (msg && msg[claveCompuesta] != null) return msg[claveCompuesta];
      }
    } catch (e) { /* seguimos con el repuesto */ }
    const repuesto = TEXTOS_REPUESTO[lang] || TEXTOS_REPUESTO.es;
    return repuesto[clave];
  }

  function yaVioElTutorial() {
    try { return localStorage.getItem(CLAVE_LOCALSTORAGE) === 'true'; }
    catch (e) { return false; } // si localStorage falla (privado/incógnito estricto), mejor mostrarlo que romper
  }

  function marcarTutorialVisto() {
    try { localStorage.setItem(CLAVE_LOCALSTORAGE, 'true'); } catch (e) { /* no pasa nada si no se puede guardar */ }
  }

  function construirPasos() {
    // Cada `element` es el selector CSS del elemento real de tu página.
    // Cambia solo los selectores — el resto (popover, botones, idioma)
    // ya está enganchado.
    return [
      {
        element: '#cityDropdownBtn', // Aquí el ID de mi selector de ciudad
        popover: {
          title: 'Elige tu ciudad',
          description: 'Cambia aquí la ciudad para ver su aire en tiempo real.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#modeGrid', // Aquí el ID de mi menú de modos (Ciudadano/Científico/Yayo/Peque)
        popover: {
          title: '¿Cómo quieres que te lo cuente?',
          description: 'Elige el modo que mejor te venga — mismo dato, explicado distinto.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#map', // Aquí el ID de mi mapa nacional
        popover: {
          title: 'El aire de España, ahora mismo',
          description: 'Cada punto es una estación real. Tócalo para ver el detalle.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '.chat-fab', // Aquí el ID/clase de mi botón de chat "Pregúntale a Manolito"
        popover: {
          title: 'Pregúntale a Manolito',
          description: '¿Algo no te queda claro? Pregúntaselo aquí en cualquier momento.',
          side: 'left',
          align: 'end',
        },
      },
    ];
  }

  let driverObjActivo = null;

  function lanzarTutorial() {
    if (typeof window.driver === 'undefined' || typeof window.driver.js === 'undefined') {
      console.warn('Driver.js no está cargado — revisa que el <script> del CDN esté antes de tutorial.js.');
      return;
    }

    driverObjActivo = window.driver.js.driver({
      showProgress: true,
      nextBtnText: textoBoton('next'),
      prevBtnText: textoBoton('prev'),
      doneBtnText: textoBoton('done'),
      steps: construirPasos(),
      onDestroyed: () => { marcarTutorialVisto(); driverObjActivo = null; }, // se marca como visto tanto si lo completa como si lo cierra a mitad
    });

    driverObjActivo.drive();
  }

  // Si el usuario cambia de idioma A MITAD del tutorial, los botones se
  // re-traducen sin reiniciar los pasos ni la posición en la que va —
  // usando la propia API de Driver.js (setConfig), no adivinando el DOM.
  document.addEventListener('langChanged', () => {
    if (!driverObjActivo) return; // el tutorial no está abierto ahora mismo
    driverObjActivo.setConfig({
      showProgress: true,
      nextBtnText: textoBoton('next'),
      prevBtnText: textoBoton('prev'),
      doneBtnText: textoBoton('done'),
      steps: construirPasos(),
    });
  });

  let yaLanzadoEstaSesion = false;

  window.iniciarTutorialManolito = function () {
    if (yaVioElTutorial() || yaLanzadoEstaSesion) return;
    yaLanzadoEstaSesion = true;
    lanzarTutorial();
  };

  // ---------------------------------------------------------------
  // Enganche al botón de "Aceptar cookies". No conozco el ID exacto
  // de tu banner (cookie-banner.js no me lo has pasado), así que
  // cubro los dos casos más habituales:
  //
  // A) Si tu cookie-banner.js dispara un evento personalizado al
  //    aceptar (recomendado, no hace falta tocar ese archivo):
  document.addEventListener('cookiesAceptadas', () => {
    window.iniciarTutorialManolito();
  });

  // B) Alternativa sin tocar cookie-banner.js: delegación de eventos sobre
  //    todo el documento — funciona aunque el banner (y su botón) se creen
  //    de forma dinámica DESPUÉS de que tutorial.js ya se haya cargado,
  //    que es justo el caso de un banner hecho con createElement().
  //    Cambia 'cookieAcceptBtn' por el ID real si el tuyo es distinto.
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'cookieAcceptBtn') { // Aquí el ID de mi botón "Aceptar"
      window.iniciarTutorialManolito();
    }
  });
})();