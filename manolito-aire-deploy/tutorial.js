/* ============================================================
   MANOLIT∞ AIRE — tutorial.js (Driver.js)
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
        element: '.chat-fab', // Aquí el ID/clase de mi botón de chat "Pregúntale a Manolit∞"
        popover: {
          title: 'Pregúntale a Manolit∞',
          description: '¿Algo no te queda claro? Pregúntaselo aquí en cualquier momento.',
          side: 'left',
          align: 'end',
        },
      },
    ];
  }

  let driverObjActivo = null;

  // El CDN de driver.js@1.x expone window.driver.driver — antes probaba
  // window.driver.js.driver (con un .js de más) y eso rompía el tutorial
  // en silencio: TypeError dentro de un manejador de clic, sin ninguna
  // señal visible en la página. Se prueban las dos formas conocidas por
  // si cambia entre versiones del CDN.
  function obtenerFactoriaDriver() {
    if (typeof window.driver === 'function') return window.driver; // por si el build expone la función directamente
    if (window.driver && typeof window.driver.driver === 'function') return window.driver.driver;
    if (window.driver && window.driver.js && typeof window.driver.js.driver === 'function') return window.driver.js.driver;
    return null;
  }

  function lanzarTutorial() {
    const crearDriver = obtenerFactoriaDriver();
    if (!crearDriver) {
      console.error('[tutorial.js] Driver.js no está disponible en window.driver — revisa que el <script> del CDN cargue ANTES que tutorial.js y que la URL no esté bloqueada (extensiones/ad-blockers).');
      return;
    }

    try {
      driverObjActivo = crearDriver({
        allowClose: false,      // ¡CLAVE! Evita que se cierre al hacer clic en el fondo gris exterior.
        showButtons: ['next', 'previous', 'close'], // Muestra explícitamente los botones de control
        showProgress: true,
        nextBtnText: textoBoton('next'),
        prevBtnText: textoBoton('prev'),
        doneBtnText: textoBoton('done'),
        steps: construirPasos(),
        onDestroyed: () => { marcarTutorialVisto(); driverObjActivo = null; }, // se marca como visto tanto si lo completa como si lo cierra a mitad
      });
      driverObjActivo.drive();
    } catch (err) {
      console.error('[tutorial.js] Error al arrancar el tutorial:', err);
    }
  }

  // Si el usuario cambia de idioma A MITAD del tutorial, los botones se
  // re-traducen sin reiniciar los pasos ni la posición en la que va —
  // usando la propia API de Driver.js (setConfig), no adivinando el DOM.
  document.addEventListener('langChanged', () => {
    if (!driverObjActivo) return; // el tutorial no está abierto ahora mismo
    driverObjActivo.setConfig({
      allowClose: false,        // Mantenemos el bloqueo de cierre accidental al cambiar idioma
      showProgress: true,
      nextBtnText: textoBoton('next'),
      prevBtnText: textoBoton('prev'),
      doneBtnText: textoBoton('done'),
      steps: construirPasos(),
    });
  });

    let yaLanzadoEstaSesion = false;

  window.iniciarTutorialManolito = function () {
    try {
      if (yaVioElTutorial() || yaLanzadoEstaSesion) return;
      yaLanzadoEstaSesion = true;
      
      // Añadimos un retraso de 300ms para darle tiempo al banner de 
      // cookies a desaparecer del DOM antes de pintar el tutorial.
      setTimeout(() => {
        lanzarTutorial();
      }, 300);

    } catch (err) {
      console.error('[tutorial.js] Error inesperado al intentar iniciar el tutorial:', err);
    }
  };

  // ---------------------------------------------------------------
  // Enganche al botón de "Aceptar cookies" con detención de propagación
  // ---------------------------------------------------------------
  
  document.addEventListener('cookiesAceptadas', () => {
    window.iniciarTutorialManolito();
  });

  document.addEventListener('click', (e) => {
    // Buscamos si el clic fue en el botón de aceptar cookies
    if (e.target && (e.target.id === 'cookieAcceptBtn' || e.target.closest('#cookieAcceptBtn'))) {
      // Evitamos que el clic se propague y Driver.js lo detecte como un "clic fuera" inmediato
      e.stopPropagation(); 
      window.iniciarTutorialManolito();
    }
  });
})();
