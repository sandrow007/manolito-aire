/* ==========================================================================
   LLUVIA — js/lluvia.js (módulo aditivo e independiente)
   --------------------------------------------------------------------------
   Dos piezas, dos escalas:

   1) DE LEJOS (zoom ≤ 12,5): mancha continua de precipitación real con las
      teselas precipitation_new de OpenWeatherMap, servidas por el Worker en
      /tiles/lluvia/... (misma clave, misma caché edge de 10 min y misma
      tesela transparente de respaldo que /tiles/nubes). Azul grisáceo,
      semitransparente, por debajo de etiquetas y edificios 3D. Se desvanece
      suavemente entre zoom 10 y 12,5 (interpolación de opacidad, GPU).

   2) DE CERCA (zoom ≥ 13): ni mancha ni borrón. Solo gotas animadas en un
      canvas 2D superpuesto, y ÚNICAMENTE si en el centro de la vista llueve
      de verdad ahora (lluvia_mm_h de /clima, con su propia caché de 10 min
      por celda de 0,4°: mover el mapa no repite llamadas). Tope de gotas
      para no gastar batería, ~30 fps, pausa con la pestaña oculta y respeto
      total a prefers-reduced-motion (sin gotas en ese caso).

   Reglas:
   - Casilla "Lluvia" (rsToggleLluvia), APAGADA por defecto. Apagada = ni
     teselas ni gotas ni llamadas.
   - Con el reloj solar fuera del presente (futuro/pasado) no hay dato de
     lluvia: la capa se oculta sola y el estado lo dice con una frase corta.
   - Fallo silencioso: si una tesela o /clima fallan, simplemente no se
     muestra nada. Nada de esto rompe nubes, sombras, rutas, SQI ni chat.
   ========================================================================== */
(function () {
  'use strict';
  if (window.manolitAireLluvia) return;

  var FUENTE_ID = 'lluvia-owm';
  var CAPA_ID = 'capa-lluvia-owm';
  var REFRESCO_MS = 10 * 60 * 1000;   // OWM renueva sus tiles cada ~10 min
  var CELDA_GRADOS = 0.4;             // ~40 km: la lluvia no cambia por calle
  var ZOOM_GOTAS = 13;                // a partir de aquí: gotas, no mancha
  var RELOJ_TOLERANCIA_MS = 45 * 60 * 1000; // presente = ±45 min del reloj
  var MAX_GOTAS = 150;                // tope de batería
  var MAX_GOTAS_FLOJO = 70;           // móviles modestos (hardwareConcurrency)

  var mapa = null;
  var selloTiles = Date.now();
  var cacheLluvia = new Map();        // celda -> { t, mmh }
  var lluviaMmH = 0;                  // último dato conocido en el centro
  var avisoRelojDado = false;         // la frase del estado solo se dice una vez por episodio

  /* ---------------- utilidades ---------------- */

  function t(clave, fallback) {
    try {
      var fn = window.getMessages;
      if (typeof fn === 'function') {
        var msg = fn();
        if (msg && msg[clave] != null) return msg[clave];
      }
    } catch (e) { /* seguimos con el fallback */ }
    return fallback != null ? fallback : clave;
  }

  function toggle() { return document.getElementById('rsToggleLluvia'); }
  function encendida() { var el = toggle(); return !!(el && el.checked); }

  function contenedorMapa() {
    var el = document.getElementById('shadowRouteMap');
    return (el && el.parentElement) || el;
  }

  // El reloj solar puede viajar al futuro/pasado: entonces no tenemos dato
  // de lluvia real. "Ahora" = hora efectiva dentro de ±45 min del presente.
  function relojEnAhora() {
    try {
      if (typeof window.manolitAireHoraEfectiva === 'function') {
        var h = window.manolitAireHoraEfectiva();
        var ms = (h instanceof Date) ? h.getTime() : new Date(h).getTime();
        if (isFinite(ms)) return Math.abs(ms - Date.now()) <= RELOJ_TOLERANCIA_MS;
      }
    } catch (e) { /* reloj aún no listo: se asume presente */ }
    return true;
  }

  function movilFlojo() {
    try {
      var hc = navigator.hardwareConcurrency;
      if (isFinite(hc) && hc > 0 && hc <= 4) return true;
    } catch (e) { }
    return false;
  }

  function reduceMovimiento() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  /* ---------------- lluvia actual (/clima, con caché propia) ---------------- */

  function celdaDe(lat, lon) {
    return Math.floor(lat / CELDA_GRADOS) + ',' + Math.floor(lon / CELDA_GRADOS);
  }

  function cacheLocalObtener(clave) {
    try {
      var crudo = localStorage.getItem('manolito_cache_lluvia_' + clave);
      if (!crudo) return null;
      var obj = JSON.parse(crudo);
      if (obj && isFinite(obj.mmh) && Date.now() - obj.t < REFRESCO_MS) return obj.mmh;
    } catch (e) { }
    return null;
  }

  function cacheLocalGuardar(clave, mmh) {
    try { localStorage.setItem('manolito_cache_lluvia_' + clave, JSON.stringify({ t: Date.now(), mmh: mmh })); } catch (e) { }
  }

  function consultarLluvia(lat, lon) {
    var clave = celdaDe(lat, lon);
    var enMemoria = cacheLluvia.get(clave);
    if (enMemoria && Date.now() - enMemoria.t < REFRESCO_MS) return Promise.resolve(enMemoria.mmh);
    var persistente = cacheLocalObtener(clave);
    if (persistente !== null) {
      cacheLluvia.set(clave, { t: Date.now(), mmh: persistente });
      return Promise.resolve(persistente);
    }
    return fetch('/clima?lat=' + lat.toFixed(3) + '&lon=' + lon.toFixed(3))
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        // Worker nuevo: lluvia_mm_h. Worker viejo (aún sin desplegar): el
        // campo no existe y se asume 0, sin romper nada.
        var mmh = Math.max(0, Number(d && d.lluvia_mm_h) || 0);
        cacheLluvia.set(clave, { t: Date.now(), mmh: mmh });
        cacheLocalGuardar(clave, mmh);
        return mmh;
      })
      .catch(function () {
        // Sin worker/clave/red: no llueve a efectos de dibujo, en silencio.
        return enMemoria ? enMemoria.mmh : 0;
      });
  }

  /* ---------------- capa raster de precipitación ---------------- */

  function urlTiles() {
    return ['/tiles/lluvia/{z}/{x}/{y}.png?v=' + selloTiles];
  }

  function mapaOscuro() {
    var c = contenedorMapa();
    return !!(c && c.classList && c.classList.contains('rs-mapa-oscuro-activo'));
  }

  function aplicarEstiloRaster() {
    if (!mapa || !mapa.getLayer(CAPA_ID)) return;
    var oscuro = mapaOscuro();
    try {
      // Mapa meteorológico: la precipitación de OWM entra azul y aquí se
      // re-tiñe con una escala graduada tipo MSN Weather / Windy:
      //   llovizna  -> cian tenue   (volumen bajo)
      //   lluvia    -> azul vivo    (volumen medio)
      //   chubasco  -> ámbar        (volumen alto)
      //   tormenta  -> magenta      (volumen extremo)
      // Sin animaciones y sin trabajo por frame: son paint-properties que
      // MapLibre aplica con shaders cuando recalcula el tile, ya existente.
      // Opacidad techo más alta (0,75) para que la mancha se lea bien
      // desde lejos; se sigue desvaneciendo al acercarse (las gotas
      // mandan de cerca, como siempre).
      mapa.setPaintProperty(CAPA_ID, 'raster-opacity', ['interpolate', ['linear'], ['zoom'],
        8,   oscuro ? 0.62 : 0.75,
        9.5, oscuro ? 0.50 : 0.62,
        11.5, 0]);
      // Mismo truco que las nubes: en modo oscuro el canvas lleva filtro
      // invert(), así que la mancha "nace oscura" y el filtro la aclara.
      mapa.setPaintProperty(CAPA_ID, 'raster-brightness-max', oscuro ? 0.55 : 1);
      mapa.setPaintProperty(CAPA_ID, 'raster-brightness-min', oscuro ? 0.12 : 0.04);
      // Matiz hacia tonos meteorológicos: cian -> azul -> ámbar -> magenta
      // (rota el azul original hacia el lado cálido del espectro).
      mapa.setPaintProperty(CAPA_ID, 'raster-hue-rotate', oscuro ? -8 : -14);
      // NOTA (nov-2026): MapLibre 4.7.1 (la versión que carga esta web) NO
      // soporta 'raster-color' ni la expresión 'raster-value' (llegaron en
      // la 5.x). Comprobado contra el bundle real de unpkg. La paleta
      // graduada por volumen se consigue AQUÍ con las propiedades que
      // 4.7.1 sí soporta: los tiles de OWM ya codifican el volumen como
      // intensidad de color, así que saturación + contraste + brillo
      // amplifican la diferencia entre llovizna (tenue) y tormenta
      // (intensa), y el hue-rotate lleva el conjunto hacia tonos cálidos
      // tipo mapa del tiempo. Sin llamadas que fallen en silencio.
      // Saturación > 1: la llovizna débil casi desaparece (su píxel tiene
      // poca saturación de base) y el chubasco denso se enciende.
      mapa.setPaintProperty(CAPA_ID, 'raster-saturation', oscuro ? 1.3 : 1.6);
      // Contraste alto: separa los niveles de intensidad dentro del tile,
      // exactamente lo que busca una escala "por volumen".
      mapa.setPaintProperty(CAPA_ID, 'raster-contrast', oscuro ? 0.3 : 0.42);
      // El degradado de opacidad de arriba ya hace el papel de rampa de
      // transparencia: menos agua = píxel casi transparente, más agua =
      // color pleno. Es el mismo efecto visual que una rampa de color,
      // con los primitivos de 4.7.1.
    } catch (e) { /* capa a medio crear */ }
  }

  function aplicarVisibilidadRaster() {
    if (!mapa || !mapa.getLayer(CAPA_ID)) return;
    var ver = encendida() && relojEnAhora();
    try { mapa.setLayoutProperty(CAPA_ID, 'visibility', ver ? 'visible' : 'none'); } catch (e) { }
  }

  function instalarRaster() {
    if (!mapa) return;
    try {
      if (!mapa.getSource(FUENTE_ID)) {
        mapa.addSource(FUENTE_ID, {
          type: 'raster',
          tiles: urlTiles(),
          tileSize: 256,
          maxzoom: 12, // OWM no sirve más allá; MapLibre hace overzoom suave
          attribution: 'Lluvia © OpenWeatherMap',
        });
      }
      if (!mapa.getLayer(CAPA_ID)) {
        // Por debajo de los edificios 3D y de las etiquetas: la mancha es
        // terreno, no cielo. beforeId = primera capa fill-extrusion (los
        // edificios); si no la hay, la primera de símbolos; si no, encima.
        var antes = null;
        try {
          var capas = (mapa.getStyle() && mapa.getStyle().layers) || [];
          // Orden preferido: bajo edificios 3D; si no hay, bajo etiquetas;
          // si tampoco, bajo la primera capa fill (carreteras, polígonos).
          // Sin NINGUNA de las tres, antes sigue null y la capa va al final
          // PERO con el techo de opacidad de aplicarEstiloRaster (0,45) ya
          // no puede tapar el mapa aunque llegue arriba.
          for (var i = 0; i < capas.length; i++) {
            if (capas[i].type === 'fill-extrusion') { antes = capas[i].id; break; }
          }
          if (!antes) {
            for (var j = 0; j < capas.length; j++) {
              if (capas[j].type === 'symbol') { antes = capas[j].id; break; }
            }
          }
          if (!antes) {
            for (var k = 0; k < capas.length; k++) {
              if (capas[k].type === 'fill') { antes = capas[k].id; break; }
            }
          }
        } catch (e) { /* sin estilo aún: el styledata lo reinstalará */ }
        mapa.addLayer({
          id: CAPA_ID,
          type: 'raster',
          source: FUENTE_ID,
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': 0, 'raster-fade-duration': 400 },
        }, antes || undefined);
      }
      aplicarEstiloRaster();
      aplicarVisibilidadRaster();
    } catch (e) { /* estilo a medio cargar: styledata lo reintentará */ }
  }

  /* ---------------- gotas de cerca (canvas 2D) ---------------- */

  var lienzo = null, ctx = null, dpr = 1;
  var gotas = [], salpicaduras = [];
  var animando = false, rafId = 0, ultimoFrameMs = 0, ultimoTickMs = 0;
  var lienzoEnPantalla = true; // batería: la pintura se pausa si el mapa sale del viewport
  var FRAME_MS = 33; // ~30 fps

  function asegurarLienzo() {
    if (lienzo) return true;
    var cont = contenedorMapa();
    if (!cont) return false;
    try {
      lienzo = document.createElement('canvas');
      lienzo.id = 'rsLluviaGotas';
      lienzo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;display:none;';
      cont.appendChild(lienzo);
      ctx = lienzo.getContext('2d');
      redimensionarLienzo();
      window.addEventListener('resize', redimensionarLienzo);
      // Batería: si el usuario baja el scroll y el mapa queda fuera de
      // pantalla, se deja de pintar (la animación sigue "viva" y retoma al
      // volver, pero la GPU no trabaja para un canvas que nadie ve). Sin
      // IntersectionObserver o con cualquier fallo, todo sigue como antes.
      try {
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (entradas) {
            try { lienzoEnPantalla = !!(entradas[0] && entradas[0].isIntersecting); } catch (e) { }
          }, { rootMargin: '80px' }).observe(lienzo);
        }
      } catch (e) { /* sin observer: se pinta siempre, comportamiento previo */ }
      return !!ctx;
    } catch (e) { lienzo = null; ctx = null; return false; }
  }

  function redimensionarLienzo() {
    if (!lienzo) return;
    try {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      var r = lienzo.getBoundingClientRect();
      lienzo.width = Math.max(1, Math.round(r.width * dpr));
      lienzo.height = Math.max(1, Math.round(r.height * dpr));
    } catch (e) { }
  }

  function nuevaGota() {
    var w = lienzo.width, h = lienzo.height;
    var intensidad = Math.min(1, lluviaMmH / 6); // 6 mm/h ya es mamparo
    return {
      x: Math.random() * w,
      y: -20 * dpr - Math.random() * h * 0.3,
      largo: (7 + Math.random() * 9 + intensidad * 5) * dpr,
      vel: (260 + Math.random() * 240 + intensidad * 160) * dpr, // px/s
      deriva: (28 + Math.random() * 42) * dpr,                   // diagonal ligera
      suelo: h * (0.55 + Math.random() * 0.45),                  // dónde "aterriza"
      alfa: 0.28 + Math.random() * 0.3,
    };
  }

  function reconstruirGotas() {
    if (!lienzo) return;
    var tope = movilFlojo() ? MAX_GOTAS_FLOJO : MAX_GOTAS;
    var n = Math.max(12, Math.min(tope, Math.round(14 + lluviaMmH * 28)));
    gotas = [];
    for (var i = 0; i < n; i++) {
      var g = nuevaGota();
      g.y = Math.random() * lienzo.height; // arranque repartido, sin chaparrón inicial
      gotas.push(g);
    }
    salpicaduras = [];
  }

  function pintarFrame(ahora) {
    if (!animando || !ctx || !lienzo) return;
    rafId = requestAnimationFrame(pintarFrame);
    if (ahora - ultimoFrameMs < FRAME_MS) return;
    var dt = Math.min(0.1, (ahora - (ultimoTickMs || ahora)) / 1000);
    ultimoFrameMs = ahora;
    ultimoTickMs = ahora;
    // Fuera de pantalla (scroll): no se pinta nada este frame. El bucle
    // sigue para retomar al instante al volver; dt viene acotado (0,1 s),
    // así que las gotas no dan saltos al reanudar.
    if (!lienzoEnPantalla) return;

    var w = lienzo.width, h = lienzo.height;
    ctx.clearRect(0, 0, w, h);

    // Gotas: rayitas finas blancas semitransparentes en diagonal ligera.
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, 1 * dpr);
    for (var i = 0; i < gotas.length; i++) {
      var g = gotas[i];
      g.y += g.vel * dt;
      g.x += g.deriva * dt;
      if (g.y >= g.suelo) {
        // Aterriza: nace una salpicadura pequeña (arco que crece y se apaga).
        if (salpicaduras.length < 24) {
          salpicaduras.push({ x: g.x, y: g.suelo, r: 1.5 * dpr, vida: 0.32 });
        }
        gotas[i] = nuevaGota();
        continue;
      }
      var kx = g.deriva / g.vel; // pendiente de la caída
      // Dos pasadas: una gruesa y tenue (velo de agua) y una fina y clara
      // (el hilo de la gota). Misma geometría, doble lectura de profundidad.
      ctx.strokeStyle = 'rgba(210,225,242,' + (g.alfa * 0.55).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1.4, 1.8 * dpr);
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x - kx * g.largo, g.y - g.largo);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,247,255,' + g.alfa.toFixed(3) + ')';
      ctx.lineWidth = Math.max(1, 0.9 * dpr);
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x - kx * g.largo, g.y - g.largo);
      ctx.stroke();
    }

    // Salpicaduras: arcos tenues de vida corta.
    for (var s = salpicaduras.length - 1; s >= 0; s--) {
      var p = salpicaduras[s];
      p.vida -= dt;
      if (p.vida <= 0) { salpicaduras.splice(s, 1); continue; }
      p.r += 26 * dpr * dt;
      var aS = Math.max(0, p.vida / 0.32) * 0.35;
      ctx.strokeStyle = 'rgba(235,242,250,' + aS.toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.35, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
  }

  function pararGotas() {
    animando = false;
    if (rafId) { try { cancelAnimationFrame(rafId); } catch (e) { } rafId = 0; }
    if (lienzo) lienzo.style.display = 'none';
  }

  function arrancarGotas() {
    if (animando || reduceMovimiento()) return;
    if (!asegurarLienzo()) return;
    // Primero visible, LUEGO medir: con display:none el rectángulo es 0x0
    // y las gotas nacerían en un lienzo de 1x1 píxel.
    lienzo.style.display = 'block';
    redimensionarLienzo();
    reconstruirGotas();
    animando = true;
    ultimoFrameMs = 0;
    ultimoTickMs = 0;
    rafId = requestAnimationFrame(pintarFrame);
  }

  /* ---------------- ciclo de decisión ---------------- */

  function avisarRelojSiToca() {
    if (relojEnAhora()) { avisoRelojDado = false; return; }
    if (avisoRelojDado || !encendida()) return;
    avisoRelojDado = true;
    try {
      if (typeof window.manolitAireEstado === 'function') {
        window.manolitAireEstado(t('rainLayerOnlyNow', 'Lluvia: solo hay datos del momento actual; con el reloj en otra hora la capa se oculta.'));
      }
    } catch (e) { /* el aviso es opcional */ }
  }

  function evaluar() {
    if (!mapa) return;
    aplicarVisibilidadRaster();
    avisarRelojSiToca();
    var gotasTocan = encendida() && relojEnAhora() && mapa.getZoom() >= ZOOM_GOTAS &&
      lluviaMmH > 0 && !document.hidden && !reduceMovimiento();
    if (gotasTocan) arrancarGotas(); else pararGotas();
  }

  function refrescarLluvia() {
    if (!mapa || !encendida()) return;
    var c = mapa.getCenter();
    consultarLluvia(c.lat, c.lng).then(function (mmh) {
      var cambio = mmh !== lluviaMmH;
      lluviaMmH = mmh;
      if (cambio && animando) reconstruirGotas(); // la intensidad manda en el nº de gotas
      evaluar();
    });
  }

  /* ---------------- arranque y enganches ---------------- */

  function arrancar(m) {
    if (mapa || !m) return;
    mapa = m;

    // La capa nace con la casilla apagada: ni una tesela hasta que la pidan.
    instalarRaster();
    mapa.on('styledata', function () {
      try {
        if (mapa.isStyleLoaded() && !mapa.getSource(FUENTE_ID)) instalarRaster();
      } catch (e) { }
    });

    var el = toggle();
    if (el) el.addEventListener('change', function () {
      instalarRaster(); // por si el estilo aún no estaba listo al marcar
      refrescarLluvia();
      evaluar();
    });

    // Zoom: cruzar el umbral de 13 enciende/apaga las gotas.
    mapa.on('zoomend', evaluar);
    // Movimiento: solo repite la llamada si caducó la caché o cambió la celda.
    mapa.on('moveend', function () { if (encendida()) refrescarLluvia(); });
    // Reloj solar: la vigilia de 30 s de abajo reevalúa sola; un listener
    // global de 'input' en captura disparaba evaluar() decenas de veces por
    // segundo con cada slider (rehacer setLayoutProperty en ráfaga) y eso
    // se notaba como mapa colgado. Eliminado (nov-2026).
    // Pestaña oculta: paramos la animación; al volver, evaluamos de nuevo.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pararGotas(); else evaluar();
    });
    // Modo oscuro del mapa: mismas reglas de pintura que las nubes.
    var cont = contenedorMapa();
    if (cont && window.MutationObserver) {
      try {
        new MutationObserver(function () { aplicarEstiloRaster(); })
          .observe(cont, { attributes: true, attributeFilter: ['class'] });
      } catch (e) { }
    }

    // Refrescos periódicos, dormidos con la pestaña oculta (mismo patrón
    // que la capa de nubes: intervalos registrados en manolitIntervalos).
    window.manolitIntervalos = window.manolitIntervalos || [];
    window.manolitIntervalos.push(setInterval(function () {
      if (document.hidden) return;
      // Sello de teselas: OWM renueva cada ~10 min, pedimos la versión nueva.
      if (mapa.getSource(FUENTE_ID)) {
        selloTiles = Date.now();
        try { mapa.getSource(FUENTE_ID).setTiles(urlTiles()); } catch (e) { }
      }
      if (encendida()) refrescarLluvia();
    }, REFRESCO_MS));
    // Vigilia del reloj solar (solo lecturas de fecha, nada de red).
    window.manolitIntervalos.push(setInterval(function () {
      if (document.hidden) return;
      evaluar();
    }, 30 * 1000));
  }

  // window.manolitAireMap lo asigna shadows-route.js al crear el mapa. Como
  // este módulo carga detrás en la cadena, casi siempre ya está; si no,
  // unos pocos reintentos cortos y, si no hay mapa, no se hace nada.
  var intentos = 0;
  (function esperarMapa() {
    var m = window.manolitAireMap;
    if (m) { arrancar(m); return; }
    if (++intentos < 40) setTimeout(esperarMapa, 250);
  })();

  window.manolitAireLluvia = true;
})();
