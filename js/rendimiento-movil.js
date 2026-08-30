/* ============================================================
   MANOLIT AIRE — rendimiento-movil.js
   Licencia: AGPL-3.0, igual que el resto del proyecto.
   ------------------------------------------------------------
   Capa de RENDIMIENTO 100% ADITIVA (Android e iOS).
   No modifica ningún archivo existente: se carga DESPUÉS de
   todos y solo «escucha y suaviza». Si este archivo faltara,
   la web funcionaría exactamente igual.

   Contenido:
   1) Throttle del slider de tiempo: máximo 1 evento de entrada
      cada 150 ms (ventana con requestAnimationFrame).
   2) GPU: el marcador del sol (#rsSolVisual) deja de moverse con
      left/top (que provoca re-layout) y pasa a moverse con
      transform: translate3d() (que va por GPU), sin tocar su JS.
   3) Registro del Service Worker /sw.js (caché de tiles y
      estáticos; ver sw.js para la política exacta).
   4) Andamio del Web Worker de sombras (APAGADO por defecto).

   Sobre IndexedDB (evaluado y descartado A PROPÓSITO):
   localStorage solo guarda claves diminutas (idioma, cookies,
   variante de logo, microcachés JSON de aire/nubes < 1 KB cada
   una). Eso no justifica IndexedDB. Los datos GRANDES (tiles del
   mapa) los guarda la Cache API dentro de sw.js, que es lo
   correcto. Si algún día se guardan GeoJSON grandes en local,
   se reevalúa aquí.
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     1) THROTTLE DEL SLIDER DE TIEMPO (#rsTimeSlider) — 150 ms
     ------------------------------------------------------------
     El slider se crea dinámicamente en shadows-route.js, así que
     escuchamos EN CAPTURA sobre document (delegación): da igual
     cuándo aparezca el slider.

     POR QUÉ ES SEGURO (verificado leyendo shadows-route.js):
     - El listener original del slider ya lleva un debounce de
       250 ms y, cuando salta, lee el valor VIVO del slider
       (sliderTiempo.value). Si soltamos un evento intermedio, el
       cálculo final usa igualmente la posición más reciente.
     - Como 150 ms < 250 ms, SIEMPRE hay un temporizador pendiente
       que recoge la posición final aunque el último evento se
       descarte. La hora efectiva NUNCA queda desfasada.
     - window.manolitAireHoraEfectiva() y window.manolitAireCentroSol()
       siguen intactos: este archivo no los toca. */
  const VENTANA_SLIDER_MS = 150;
  let ultimoPaseSlider = 0;

  document.addEventListener('input', function (ev) {
    try {
      const objetivo = ev.target;
      if (!objetivo || objetivo.id !== 'rsTimeSlider') return;
      const ahora = performance.now();
      if (ahora - ultimoPaseSlider < VENTANA_SLIDER_MS) {
        // Demasiado pronto: este evento se descarta. El debounce
        // de 250 ms del listener original recogerá el valor final.
        ev.stopImmediatePropagation();
        return;
      }
      ultimoPaseSlider = ahora;
    } catch (e) { /* nunca estorbar: cualquier fallo deja pasar todo */ }
  }, true); // ← fase de CAPTURA: se ejecuta antes que los listeners del slider

  /* ------------------------------------------------------------
     2) GPU: marcador del sol con transform en vez de left/top
     ------------------------------------------------------------
     #rsSolVisual se mueve con style.left/style.top (eso fuerza
     re-layout en cada movimiento, y encima tiene una transición
     CSS de left/top, que es lo peor para el hilo principal).

     Sin tocar shadows-route.js, hacemos dos cosas:
     a) CSS con prioridad: transición sobre transform (GPU) y
        will-change/contain para aislar el elemento.
     b) Un conversor: cuando el código original escribe left/top,
        lo traducimos al instante a translate3d() y devolvemos
        left/top a 0. El elemento acaba en el mismo píxel, pero
        movido por composición (GPU) en vez de por layout. */
  function inyectarCssGpu() {
    if (document.getElementById('rsGpuEstilos')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rsGpuEstilos';
    estilo.textContent = [
      /* Gana al CSS original aunque se inyecte después (important) */
      '#rsSolVisual{transition:transform .25s linear,opacity .25s ease !important;',
      'will-change:transform;contain:layout paint;}',
    ].join('\n');
    document.head.appendChild(estilo);
  }

  function activarConversorGpu(marcador) {
    let convirtiendo = false; // guarda contra re-entrada del observer
    const convertir = function () {
      if (convirtiendo) return;
      convirtiendo = true;
      try {
        const izq = marcador.style.left;
        const arr = marcador.style.top;
        const hayDesplazamiento = (izq && izq !== '0px') || (arr && arr !== '0px');
        if (hayDesplazamiento) {
          marcador.style.transform =
            'translate3d(' + (izq || '0px') + ', ' + (arr || '0px') + ', 0) translate(-50%, -50%)';
          marcador.style.left = '0px';
          marcador.style.top = '0px';
        }
      } catch (e) { /* si algo falla, el marcador sigue funcionando como antes */ }
      convirtiendo = false;
    };
    try {
      const observador = new MutationObserver(convertir);
      observador.observe(marcador, { attributes: true, attributeFilter: ['style'] });
      convertir(); // por si ya tenía posición al llegar nosotros
    } catch (e) { /* MutationObserver no disponible: no pasa nada */ }
  }

  // El marcador lo crea shadows-route.js cuando hace falta; lo
  // esperamos con un sondeo suave (1 vez/segundo, máximo 60 s).
  function esperarMarcadorSolar(intentos) {
    const marcador = document.getElementById('rsSolVisual');
    if (marcador) { activarConversorGpu(marcador); return; }
    if (intentos <= 0) return;
    setTimeout(function () { esperarMarcadorSolar(intentos - 1); }, 1000);
  }

  /* ------------------------------------------------------------
     3) SERVICE WORKER (caché de tiles y estáticos)
     ------------------------------------------------------------
     /sw.js — política: cache-first para tiles/estáticos,
     network-first para datos dinámicos. Compatible con el
     despliegue gratuito en Cloudflare (Workers/Pages): es un
     archivo estático más en la raíz.
     Cualquier fallo se traga en silencio: la web funciona igual
     sin service worker. */
  function registrarServiceWorker() {
    try {
      if (!('serviceWorker' in navigator)) return;
      const esSeguro = location.protocol === 'https:'
        || location.hostname === 'localhost'
        || location.hostname === '127.0.0.1';
      if (!esSeguro) return;
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {
          /* sin SW (modo incógnito, política del navegador…): seguir igual */
        });
      });
    } catch (e) { /* silencio total: prohibido ensuciar la consola */ }
  }

  /* ------------------------------------------------------------
     4) ANDAMIO DEL WEB WORKER DE SOMBRAS (APAGADO por defecto)
     ------------------------------------------------------------
     shadow-worker.js ya sabe responder y calcular la posición
     solar sin dependencias. Cuando quieras mover cálculos pesados
     de verdad (conos de árboles, Turf, islas de calor — ver los
     «TODO Worker» de shadow-worker.js), cambia esto a true y usa
     window.manolitAireWorkerSombras.pedir(tipo, payload).
     Con false, este archivo NO crea ningún worker y nada cambia. */
  const USAR_WORKER_SOMBRAS = false;

  function crearPuenteWorker() {
    if (!USAR_WORKER_SOMBRAS) return;
    try {
      const worker = new Worker('/js/shadow-worker.js');
      let contador = 0;
      const pendientes = new Map();
      worker.onmessage = function (ev) {
        const msg = ev.data || {};
        const entrada = pendientes.get(msg.id);
        if (!entrada) return;
        pendientes.delete(msg.id);
        if (msg.ok) entrada.resolver(msg.resultado);
        else entrada.rechazar(new Error(msg.error || 'error en el worker'));
      };
      worker.onerror = function () {
        pendientes.forEach(function (e) { e.rechazar(new Error('worker caído')); });
        pendientes.clear();
      };
      window.manolitAireWorkerSombras = {
        pedir: function (tipo, payload) {
          return new Promise(function (resolver, rechazar) {
            contador += 1;
            pendientes.set(contador, { resolver, rechazar });
            worker.postMessage({ id: contador, tipo: tipo, payload: payload || {} });
          });
        },
      };
    } catch (e) { /* sin worker: la web sigue calculando en el hilo principal */ }
  }

  /* ---------------------- Arranque ---------------------- */
  function arrancar() {
    inyectarCssGpu();
    esperarMarcadorSolar(60);
    registrarServiceWorker();
    crearPuenteWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
