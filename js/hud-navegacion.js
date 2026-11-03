/* ==========================================================================
   HUD DE NAVEGACIÓN — Manolit∞ Aire (nov-2026)
   --------------------------------------------------------------------------
   Panel de navegación flotante que SOLO se ve cuando hay ruta activa y el
   usuario está en caminata GPS o paseo virtual. Componentes:

     1. Velocímetro circular (esquina inferior derecha): velocidad GPS en
        km/h, media móvil de 3 muestras, color según el límite del tramo.
     2. Señal de límite de velocidad (encima del velocímetro): solo cuando
        el tramo activo trae speed_limit o maxspeed. Si no hay dato, ocupa
        display:none y no estorba.
     3. Panel inferior: tiempo restante, distancia restante y hora de
        llegada estimada.
     4. Banner superior (estilo Vela Maps): icono de maniobra, distancia
        al giro, mini-señal de límite del tramo actual y nombre de la vía.
        Con rutas sin pasos (Dijkstra solar) se simplifica a flecha de
        seguir + distancia restante, como hace Vela.

   REGLAS DURAS DE RENDIMIENTO (móvil que no se calienta):
     - watchPosition SOLO con {enableHighAccuracy:true, maximumAge:1000,
       timeout:10000} y clearWatch total al ocultar.
     - El callback del GPS solo guarda la lectura. TODO lo demás (DOM,
       cámara, cálculos) pasa por requestAnimationFrame. Nunca se toca el
       DOM dentro del callback de watchPosition.
     - El metro del trayecto se recalcula SOLO cuando llega una lectura
       GPS nueva (~1 Hz), no en cada frame: la línea turf se cachea una
       vez por ruta y nearestPointOnLine devuelve su `location` (km a lo
       largo de la línea), sin lineSlice ni lineString por frame.
     - El velocímetro solo se repinta si la velocidad cambia más de 0,5 km/h
       respecto a la última vez que se pintó.
     - will-change: transform SOLO en el marcador del usuario (clase
       .rs-marcador-usuario, que pone shadows-route.js). Ningún elemento
       del HUD lleva will-change.
     - Cero errores de consola: cada punta externa va envuelta en try/catch.

   Todo es presentación: este módulo no calcula rutas, no mueve el marcador
   del usuario ni toca la lógica de GPS/cámara existente. Lee los datos que
   los motores dejan en window.__manolitHud{Peaton,Bici,Coche} y la posición
   la calcula por su cuenta, en lectura.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__manolitHudIntegrado) return;
  window.__manolitHudIntegrado = true;

  var S = {
    map: null,
    wrap: null,
    visible: false,
    enMarcha: false,
    modo: 'caminar',
    ruta: null,          // {coords, steps:[...], totalM, distanciaM, duracionS}
    lineaTurf: null,     // turf.lineString cacheado una vez por ruta
    metro: 0,            // último metro calculado a lo largo de la ruta
    ultTsGps: null,      // timestamp de la última lectura ya procesada
    el: {},              // referencias DOM
    gpsId: null,
    pendiente: null,     // última lectura GPS cruda {lat,lon,vel,ts}
    rafId: null,
    velPintada: null,    // última velocidad realmente pintada (null = "–")
    muestrasVel: [],     // media móvil de 3
    ultPos: null,        // última posición procesada {lat,lon}
    recorridoM: 0,
    camaraGuardada: null,
    camaraTocada: false,
    camaraMs: 0,
    sigRuta: '',
    ultBearing: null,
    pasoClave: '',
    pasoDistRed: -1,
    tiempoClave: '',
    limiteActual: undefined,
    fallosRuta: 0,
    evalTimer: null
  };

  /* ---------------------------------------------------------------------
     Iconos de maniobra (SVG en línea, heredan currentColor).
     --------------------------------------------------------------------- */
  var ICONOS = {
    recto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V5"/><path d="M6.5 10.5L12 5l5.5 5.5"/></svg>',
    derecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h11"/><path d="M11 6l5.5 6L11 18"/></svg>',
    izquierda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H8"/><path d="M13 6l-5.5 6L13 18"/></svg>',
    leveDerecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 17.5L17 7"/><path d="M17 7h-6.2M17 7v6.2"/></svg>',
    leveIzquierda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 17.5L7 7"/><path d="M7 7h6.2M7 7v6.2"/></svg>',
    mediaVuelta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 6v5.2a4 4 0 0 1-8 0V8.5"/><path d="M5.5 11l2.5-3.2L10.5 11"/></svg>',
    rotonda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.2a5.8 5.8 0 1 1-5 2.9"/><path d="M3.6 11.3l3.1-2.6-.3-4"/></svg>',
    incorporarse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19L14.5 9.5"/><path d="M14.5 9.5H9.3M14.5 9.5v5.2"/><path d="M19 5v6.5" opacity="0.55"/></svg>',
    salida: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 21V8"/><path d="M10 13.2c2.7 0 4.4-1.7 4.4-4.4"/><path d="M12.6 10.2l1.8-1.9 1.7 2.1"/></svg>',
    llegada: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V4"/><path d="M6 5.2h11l-2.4 3.4L17 12H6"/></svg>'
  };

  function iconoPara(paso) {
    try {
      var tipo = paso.type || '';
      var mod = paso.modifier || '';
      if (tipo === 'arrive') return ICONOS.llegada;
      if (tipo === 'roundabout' || tipo === 'rotary' || tipo === 'exit_roundabout') return ICONOS.rotonda;
      if (mod === 'uturn') return ICONOS.mediaVuelta;
      if (tipo === 'off_ramp' || tipo === 'exit') return ICONOS.salida;
      if (tipo === 'merge' || tipo === 'on_ramp' || tipo === 'ramp') return ICONOS.incorporarse;
      if (mod.indexOf('sharp right') !== -1 || mod === 'right') return ICONOS.derecha;
      if (mod.indexOf('slight right') !== -1) return ICONOS.leveDerecha;
      if (mod.indexOf('sharp left') !== -1 || mod === 'left') return ICONOS.izquierda;
      if (mod.indexOf('slight left') !== -1) return ICONOS.leveIzquierda;
      if (mod.indexOf('right') !== -1) return ICONOS.derecha;
      if (mod.indexOf('left') !== -1) return ICONOS.izquierda;
      return ICONOS.recto;
    } catch (e) { return ICONOS.recto; }
  }

  /* ---------------------------------------------------------------------
     Utilidades de formato (español, mismas convenciones que el resto).
     --------------------------------------------------------------------- */
  function fmtDistancia(metros) {
    if (!isFinite(metros) || metros < 0) metros = 0;
    if (metros < 1000) return Math.max(10, Math.round(metros / 10) * 10) + ' m';
    var km = metros / 1000;
    return (km >= 10 ? Math.round(km) : (Math.round(km * 10) / 10)).toString().replace('.', ',') + ' km';
  }

  function fmtDuracion(segundos) {
    if (!isFinite(segundos) || segundos < 0) segundos = 0;
    var min = Math.max(1, Math.round(segundos / 60));
    if (min >= 60) return Math.floor(min / 60) + ' h ' + (min % 60) + ' min';
    return min + ' min';
  }

  function parseLimite(valor) {
    if (valor == null) return null;
    if (typeof valor === 'number' && isFinite(valor) && valor > 0) return Math.round(valor);
    var m = String(valor).match(/(\d+)/);
    if (m) { var n = parseInt(m[1], 10); if (n > 0 && n < 200) return n; }
    return null;
  }

  /* ---------------------------------------------------------------------
     Traducción: enganche directo al diccionario de i18n.js (mismo patrón
     que shadows-route.js y aparcamientos-viaje.js).
     --------------------------------------------------------------------- */
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

  var LOCALES_HUD = { es: 'es-ES', ca: 'ca-ES', eu: 'eu-ES', gl: 'gl-ES', en: 'en-GB', ka: 'ka-GE', ar: 'ar' };
  function localeActual() {
    try {
      var lang = (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'es') || 'es';
      return LOCALES_HUD[lang] || 'es-ES';
    } catch (e) { return 'es-ES'; }
  }

  /* ---------------------------------------------------------------------
     Construcción del DOM (una sola vez, todo flotante dentro del wrap).
     --------------------------------------------------------------------- */
  function construirDom() {
    if (document.getElementById('rsHudVeloWrap')) return;

    var wrap = S.wrap;

    // 4. Banner de instrucción superior (estilo Vela: icono, distancia,
    // mini-señal de límite del tramo actual y nombre de la vía).
    var banner = document.createElement('div');
    banner.id = 'rsHudBanner';
    banner.className = 'rs-hud';
    banner.setAttribute('role', 'status');
    // La guía A11Y (ManolitA11y) ya anuncia las maniobras por voz: aquí
    // aria-live va OFF para no re-anunciar la distancia cada 10 m.
    banner.setAttribute('aria-live', 'off');
    banner.innerHTML =
      '<div class="rs-hud-maniobra" id="rsHudManiobra"></div>' +
      '<div class="rs-hud-banner-texto">' +
      '<div class="rs-hud-banner-dist" id="rsHudBannerDist"></div>' +
      '<div class="rs-hud-banner-fila">' +
      '<span class="rs-hud-banner-lim" id="rsHudBannerLim" hidden></span>' +
      '<div class="rs-hud-banner-calle" id="rsHudBannerCalle"></div>' +
      '</div>' +
      '</div>';
    wrap.appendChild(banner);

    // 3. Panel inferior: tiempo, distancia y llegada.
    var tiempo = document.createElement('div');
    tiempo.id = 'rsHudTiempo';
    tiempo.className = 'rs-hud';
    tiempo.innerHTML =
      '<div class="rs-hud-bloque"><span class="rs-hud-valor" id="rsHudTiempoRestante"></span><span class="rs-hud-etiqueta" id="rsHudLblRestante"></span></div>' +
      '<div class="rs-hud-sep" aria-hidden="true"></div>' +
      '<div class="rs-hud-bloque"><span class="rs-hud-valor" id="rsHudDistanciaRestante"></span><span class="rs-hud-etiqueta" id="rsHudLblDistancia"></span></div>' +
      '<div class="rs-hud-sep" aria-hidden="true"></div>' +
      '<div class="rs-hud-bloque"><span class="rs-hud-valor" id="rsHudLlegada"></span><span class="rs-hud-etiqueta" id="rsHudLblLlegada"></span></div>';
    wrap.appendChild(tiempo);

    // Contenedor del velocímetro + señal de límite (esquina inferior dcha).
    var veloWrap = document.createElement('div');
    veloWrap.id = 'rsHudVeloWrap';
    veloWrap.className = 'rs-hud';

    var limite = document.createElement('div');
    limite.id = 'rsHudLimite';
    limite.className = 'rs-hud-limite';
    limite.setAttribute('aria-hidden', 'true');
    veloWrap.appendChild(limite);

    var velo = document.createElement('div');
    velo.id = 'rsHudVelo';
    velo.setAttribute('role', 'status');
    velo.setAttribute('aria-live', 'off');
    velo.setAttribute('aria-label', 'Velocímetro');
    velo.innerHTML =
      '<div class="rs-hud-velo-num" id="rsHudVeloNum">–</div>' +
      '<div class="rs-hud-velo-unidad">km/h</div>' +
      '<div class="rs-hud-recorrido" id="rsHudRecorrido" hidden>0,0 km</div>';
    veloWrap.appendChild(velo);
    wrap.appendChild(veloWrap);

    // Nacen ocultos: el HUD solo aparece cuando toca.
    banner.hidden = true;
    tiempo.hidden = true;
    veloWrap.hidden = true;
    limite.hidden = true;

    S.el = {
      banner: banner,
      maniobra: document.getElementById('rsHudManiobra'),
      bannerDist: document.getElementById('rsHudBannerDist'),
      bannerCalle: document.getElementById('rsHudBannerCalle'),
      bannerLim: document.getElementById('rsHudBannerLim'),
      tiempo: tiempo,
      tiempoRestante: document.getElementById('rsHudTiempoRestante'),
      distanciaRestante: document.getElementById('rsHudDistanciaRestante'),
      llegada: document.getElementById('rsHudLlegada'),
      lblRestante: document.getElementById('rsHudLblRestante'),
      lblDistancia: document.getElementById('rsHudLblDistancia'),
      lblLlegada: document.getElementById('rsHudLblLlegada'),
      veloWrap: veloWrap,
      velo: velo,
      veloNum: document.getElementById('rsHudVeloNum'),
      limite: limite,
      recorrido: document.getElementById('rsHudRecorrido')
    };

    pintarEtiquetasEstaticas();
  }

  // Etiquetas del panel inferior, traducibles en caliente (langChanged).
  function pintarEtiquetasEstaticas() {
    try {
      if (S.el.lblRestante) S.el.lblRestante.textContent = t('hudRemaining', 'restante');
      if (S.el.lblDistancia) S.el.lblDistancia.textContent = t('hudDistance', 'distancia');
      if (S.el.lblLlegada) S.el.lblLlegada.textContent = t('hudArrival', 'llegada');
    } catch (e) { /* el HUD jamás rompe el mapa */ }
  }

  /* ---------------------------------------------------------------------
     Preparación de la ruta activa (lectura del stash del modo).
     --------------------------------------------------------------------- */
  function firmaRuta(stash) {
    try {
      if (!stash) return 'null';
      var lims = (stash.pasos || []).map(function (p) {
        if (!p) return '0';
        var l = p.speed_limit != null ? p.speed_limit : p.maxspeed;
        return l == null ? '0' : String(l);
      }).join(',');
      return Math.round(stash.distanciaM || 0) + ':' + Math.round(stash.duracionS || 0) + ':' + ((stash.pasos || []).length) + ':' + lims;
    } catch (e) { return 'x'; }
  }

  function prepararRuta() {
    var stash = null;
    if (S.modo === 'bici') {
      var b = window.__manolitHudBici;
      if (b && b.rutas && b.rutas.length) stash = b.rutas[b.activa || 0];
    } else if (S.modo === 'coche') {
      stash = window.__manolitHudCoche;
    } else {
      stash = window.__manolitHudPeaton;
    }
    if (!stash) { S.ruta = null; S.lineaTurf = null; return; }
    var coords = stash.geometry && stash.geometry.coordinates;
    if (!coords || coords.length < 2) { S.ruta = null; S.lineaTurf = null; return; }

    var pasos = (stash.pasos || []).filter(function (p) { return p && p.geometry && p.geometry.coordinates && p.geometry.coordinates.length; });
    var steps = [];
    var cum = 0;
    for (var i = 0; i < pasos.length; i++) {
      var p = pasos[i];
      var man = p.maneuver || {};
      var lim = null;
      if (p.speed_limit != null) lim = parseLimite(p.speed_limit);
      else if (p.maxspeed != null) lim = parseLimite(p.maxspeed);
      steps.push({
        name: (p.name || '').trim(),
        type: man.type || '',
        modifier: man.modifier || '',
        distance: p.distance || 0,
        cumStart: cum,
        limit: lim
      });
      cum += p.distance || 0;
    }
    S.ruta = {
      coords: coords,
      steps: steps,
      totalM: stash.distanciaM || cum,
      distanciaM: stash.distanciaM || cum,
      duracionS: stash.duracionS || 0
    };
    // Línea turf cacheada UNA vez por ruta: el metro se mide contra ella
    // con nearestPointOnLine (que devuelve `location`, km sobre la línea).
    S.metro = 0;
    S.ultTsGps = null;
    try { S.lineaTurf = window.turf ? turf.lineString(coords) : null; } catch (e) { S.lineaTurf = null; }
  }

  function metroActual(pos) {
    if (!pos || !S.ruta || !S.lineaTurf) return S.metro;
    try {
      var snapped = turf.nearestPointOnLine(S.lineaTurf, turf.point([pos.lon, pos.lat]));
      if (snapped && isFinite(snapped.properties.location)) {
        S.metro = snapped.properties.location * 1000;
      }
    } catch (e) { /* ruta rara: se conserva el último metro válido */ }
    return S.metro;
  }

  /* ---------------------------------------------------------------------
     Pintado (solo con cambios reales; nada de repintar por repintar).
     --------------------------------------------------------------------- */
  function pintarVelocidad(vel) {
    // vel = km/h suavizados o null. Regla dura: solo se repinta si cambia
    // más de 0,5 km/h respecto a lo último pintado (o si venía de "–").
    if (vel !== null && S.velPintada !== null && Math.abs(vel - S.velPintada) <= 0.5) return;
    if (vel === null && S.velPintada === null) return;
    S.velPintada = vel;

    var num = S.el.veloNum;
    var texto = (vel === null || vel < 0.5) ? '–' : String(Math.round(vel));
    if (num.textContent !== texto) num.textContent = texto;

    var color;
    if (vel === null || vel < 0.5) {
      color = 'var(--paper, #EDF4F2)'; // reposo: neutro
    } else if (S.limiteActual) {
      if (vel > S.limiteActual) color = 'var(--breath-bad)';
      else if (vel > S.limiteActual * 0.85) color = 'var(--accent)';
      else color = 'var(--breath-good)';
    } else {
      color = 'var(--paper, #EDF4F2)';
    }
    S.el.velo.style.setProperty('--rs-hud-velo-color', color);
  }

  function pintarLimite(lim) {
    if (lim === S.limiteActual) return;
    S.limiteActual = lim;
    if (lim == null) {
      S.el.limite.hidden = true;
      return;
    }
    var txt = String(lim);
    if (S.el.limite.textContent !== txt) S.el.limite.textContent = txt;
    S.el.limite.hidden = false;
  }

  // Mini-señal de límite DENTRO del banner (estilo Vela).
  function pintarLimiteBanner(lim) {
    try {
      if (lim == null) { S.el.bannerLim.hidden = true; return; }
      var txt = String(lim);
      if (S.el.bannerLim.textContent !== txt) S.el.bannerLim.textContent = txt;
      S.el.bannerLim.hidden = false;
    } catch (e) { }
  }

  function pintarBanner(metro) {
    var steps = S.ruta ? S.ruta.steps : [];
    if (!steps.length) {
      // Ruta sin pasos OSRM (p. ej. Dijkstra solar del modo invierno):
      // banner simplificado estilo Vela: flecha de seguir + lo que queda.
      if (!S.ruta) {
        if (!S.el.banner.hidden) S.el.banner.hidden = true;
        S.pasoClave = '';
        return;
      }
      pintarLimiteBanner(null);
      var resta = Math.max(0, S.ruta.totalM - metro);
      var distRed = Math.round(resta / 10) * 10;
      if (S.pasoClave !== 'simple' || distRed !== S.pasoDistRed) {
        S.pasoClave = 'simple';
        S.pasoDistRed = distRed;
        if (S.el.maniobra.innerHTML !== ICONOS.recto) S.el.maniobra.innerHTML = ICONOS.recto;
        var txtDistS = fmtDistancia(resta);
        if (S.el.bannerDist.textContent !== txtDistS) S.el.bannerDist.textContent = txtDistS;
        var txtCalleS = t('hudFollowRoute', 'Sigue la ruta');
        if (S.el.bannerCalle.textContent !== txtCalleS) S.el.bannerCalle.textContent = txtCalleS;
      }
      if (S.el.banner.hidden) S.el.banner.hidden = false;
      return;
    }
    var idx = 0;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].cumStart <= metro + 0.5) idx = i; else break;
    }
    var actual = steps[idx];
    var siguiente = steps[idx + 1];
    var quedaActual = Math.max(0, actual.cumStart + actual.distance - metro);
    var esSalidaInicial = idx === 0 && actual.type === 'depart' && quedaActual > actual.distance * 0.35;

    var clave, pasoIcono, distancia, calle;
    if (esSalidaInicial) {
      clave = 'salida';
      pasoIcono = actual;
      distancia = quedaActual;
      calle = actual.name;
    } else if (siguiente) {
      clave = siguiente.type + '|' + siguiente.modifier;
      pasoIcono = siguiente;
      distancia = quedaActual;
      calle = siguiente.name || actual.name;
    } else {
      clave = 'llegada';
      pasoIcono = { type: 'arrive', modifier: '' };
      distancia = quedaActual;
      calle = '';
    }

    // Mini-señal de límite del tramo por el que se circula (Vela la lleva
    // dentro del banner). Al llegar se apaga: la vía ya no importa.
    pintarLimiteBanner(clave === 'llegada' ? null : actual.limit);

    var distRed2 = Math.round(distancia / 10) * 10;
    if (clave !== S.pasoClave || distRed2 !== S.pasoDistRed) {
      S.pasoClave = clave;
      S.pasoDistRed = distRed2;
      var htmlIcono = iconoPara(pasoIcono);
      if (S.el.maniobra.innerHTML !== htmlIcono) S.el.maniobra.innerHTML = htmlIcono;
      var txtDist = fmtDistancia(distancia);
      if (S.el.bannerDist.textContent !== txtDist) S.el.bannerDist.textContent = txtDist;
      var txtCalle = clave === 'llegada'
        ? t('hudArrived', 'Has llegado')
        : (calle || t('hudFollowRoute', 'Sigue la ruta'));
      if (S.el.bannerCalle.textContent !== txtCalle) S.el.bannerCalle.textContent = txtCalle;
    }
    if (S.el.banner.hidden) S.el.banner.hidden = false;
  }

  function pintarTiempo(metro, vel) {
    var restM = S.ruta ? Math.max(0, S.ruta.totalM - metro) : 0;
    var restSeg;
    if (!S.gpsWatchId && !S.gpsTimerId && S.ruta && S.ruta.duracionS > 0) {
      restSeg = S.ruta.duracionS;
    } else if (vel && vel > 1) {
      restSeg = (restM / 1000) / vel * 3600;
    } else if (S.ruta && S.ruta.distanciaM > 0 && S.ruta.duracionS > 0) {
      restSeg = S.ruta.duracionS * (restM / S.ruta.distanciaM);
    } else {
      restSeg = 0;
    }
    var clave = Math.round(restM / 25) + '|' + Math.round(restSeg / 30);
    if (clave === S.tiempoClave) return;
    S.tiempoClave = clave;
    var txtTiempo = fmtDuracion(restSeg);
    var txtDist = fmtDistancia(restM);
    var eta = new Date(Date.now() + restSeg * 1000);
    var txtLlegada;
    try {
      txtLlegada = eta.toLocaleTimeString(localeActual(), { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      txtLlegada = ('0' + eta.getHours()).slice(-2) + ':' + ('0' + eta.getMinutes()).slice(-2);
    }
    if (S.el.tiempoRestante.textContent !== txtTiempo) S.el.tiempoRestante.textContent = txtTiempo;
    if (S.el.distanciaRestante.textContent !== txtDist) S.el.distanciaRestante.textContent = txtDist;
    if (S.el.llegada.textContent !== txtLlegada) S.el.llegada.textContent = txtLlegada;
  }

  function pintarRecorrido() {
    var km = S.recorridoM / 1000;
    var txt = (km >= 10 ? Math.round(km) : (Math.round(km * 10) / 10)).toString().replace('.', ',') + ' km';
    if (S.el.recorrido.textContent !== txt) S.el.recorrido.textContent = txt;
  }

  /* ---------------------------------------------------------------------
     Cámara 3D en modo coche (solo presentación, solo con velocidad real).
     --------------------------------------------------------------------- */
  function camaraCoche(pos, vel) {
    if (S.modo !== 'coche' || !S.map || !window.turf) return;
    var rapido = vel && vel > 25;
    if (!rapido) return;
    if (!S.camaraGuardada) {
      try {
        S.camaraGuardada = { pitch: S.map.getPitch(), bearing: S.map.getBearing() };
      } catch (e) { S.camaraGuardada = { pitch: 0, bearing: 0 }; }
    }
    if (!S.ultPos || (S.ultPos.lat === pos.lat && S.ultPos.lon === pos.lon)) return;
    var ahora = Date.now();
    if (ahora - S.camaraMs < 2000) return;
    try {
      var brg = turf.bearing(turf.point([S.ultPos.lon, S.ultPos.lat]), turf.point([pos.lon, pos.lat]));
      if (S.ultBearing == null || Math.abs(brg - S.ultBearing) >= 3) {
        S.ultBearing = brg;
        S.camaraMs = ahora;
        S.camaraTocada = true;
        S.map.easeTo({ pitch: 60, bearing: brg, duration: 900 });
      }
    } catch (e) { /* la cámara es un extra: nunca rompe */ }
  }

  function restaurarCamara() {
    if (!S.camaraTocada || !S.map || !S.camaraGuardada) return;
    try { S.map.jumpTo({ pitch: S.camaraGuardada.pitch, bearing: S.camaraGuardada.bearing }); } catch (e) { }
    S.camaraTocada = false;
    S.camaraGuardada = null;
    S.ultBearing = null;
  }

  /* ---------------------------------------------------------------------
     Bucle rAF: TODO lo que toca DOM o cámara pasa por aquí. El callback
     del GPS solo guarda la lectura en S.pendiente, y el metro del trayecto
     solo se recalcula cuando llega una lectura nueva (~1 Hz), no por frame.
     --------------------------------------------------------------------- */
  function tick() {
    if (!S.visible) { S.rafId = null; return; }
    try {
      var p = S.pendiente;
      var vel = p ? p.vel : null;
      var pos = p ? { lat: p.lat, lon: p.lon } : null;

      if (pos && S.ultPos && vel && vel > 1 && window.turf) {
        try {
          var d = turf.distance(
            turf.point([S.ultPos.lon, S.ultPos.lat]),
            turf.point([pos.lon, pos.lat]),
            { units: 'kilometers' }
          ) * 1000;
          if (d > 0 && d < 500) S.recorridoM += d; // saltos GPS absurdos, fuera
        } catch (e) { }
      }

      // Metro a lo largo de la ruta: SOLO con lecturas GPS nuevas. Entre
      // lectura y lectura se reutiliza el último valor (cero turf por frame).
      var metro = S.metro;
      if (pos && p.ts !== S.ultTsGps) {
        S.ultTsGps = p.ts;
        metro = metroActual(pos);
      }

      // Paso actual y su límite (para la señal y el color del velocímetro).
      var lim = null;
      if (S.ruta && S.ruta.steps.length) {
        var idx = 0;
        for (var i = 0; i < S.ruta.steps.length; i++) {
          if (S.ruta.steps[i].cumStart <= metro + 0.5) idx = i; else break;
        }
        lim = S.ruta.steps[idx].limit;
      }
      pintarLimite(lim);
      pintarVelocidad(vel);
      pintarBanner(metro);
      pintarTiempo(metro, vel);
      if (S.modo === 'bici' && !S.el.recorrido.hidden) pintarRecorrido();
      camaraCoche(pos, vel);

      if (pos) S.ultPos = pos;
    } catch (e) { /* el HUD jamás rompe el mapa */ }
    S.rafId = S.enMarcha ? requestAnimationFrame(tick) : null;
  }

  /* ---------------------------------------------------------------------
     GPS del HUD: opciones EXACTAS del spec, clearWatch total al apagar y
     el callback no toca nada más que guardar la lectura.
     --------------------------------------------------------------------- */
  function alGps(pos) {
    try {
      var v = null;
      if (pos && pos.coords && typeof pos.coords.speed === 'number' && isFinite(pos.coords.speed) && pos.coords.speed > 0) {
        v = pos.coords.speed * 3.6; // m/s → km/h
      }
      // Media móvil de 3 muestras contra el tembleque del GPS.
      S.muestrasVel.push(v);
      if (S.muestrasVel.length > 3) S.muestrasVel.shift();
      var validas = [];
      for (var i = 0; i < S.muestrasVel.length; i++) if (S.muestrasVel[i] != null) validas.push(S.muestrasVel[i]);
      var suave = validas.length ? validas.reduce(function (a, b) { return a + b; }, 0) / validas.length : null;
      S.pendiente = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        vel: suave,
        ts: pos.timestamp || Date.now()
      };
    } catch (e) { }
  }

  function encenderGps() {
    if (S.gpsId != null || !('geolocation' in navigator)) return;
    try {
      S.gpsId = navigator.geolocation.watchPosition(alGps, function () {
        // Sin permiso o sin señal: el HUD sigue mostrando "–". Cero ruido.
      }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
    } catch (e) { S.gpsId = null; }
  }

  function apagarGps() {
    if (S.gpsId != null) {
      try { navigator.geolocation.clearWatch(S.gpsId); } catch (e) { }
      S.gpsId = null;
    }
    S.pendiente = null;
    S.muestrasVel = [];
    S.ultPos = null;
  }

  /* ---------------------------------------------------------------------
     Visibilidad: aparece solo con ruta activa del modo + caminata o paseo.
     Se oculta al pulsar Reiniciar (la ruta desaparece del mapa y del
     stash) o al detener la caminata/salir del paseo.
     --------------------------------------------------------------------- */
  function hayRutaEnMapa(fuente) {
    try {
      var src = S.map.getSource(fuente);
      var d = src && (src._data || (src.serialize && src.serialize().data));
      return !!(d && d.features && d.features.length);
    } catch (e) { return false; }
  }

  function evaluar() {
    try {
      var btnWalk = document.getElementById('rsBtnWalk');
      var btnPaseo = document.getElementById('rsBtnPaseo');
      var caminando = !!(btnWalk && btnWalk.classList.contains('rs-activo'));
      var paseando = !!(btnPaseo && btnPaseo.classList.contains('rs-activo'));
      var modo = window.__manolitoModoRuta || 'caminar';
      var fuente = modo === 'bici' ? 'bici-rutas' : (modo === 'coche' ? 'viaje-largo' : 'ruta');
      // El tiempo y la distancia deben estar visibles desde que se dibuja la
      // ruta. GPS, banner de maniobras y velocímetro siguen siendo solo al iniciar.
      var hayRuta = hayRutaEnMapa(fuente);

      if (hayRuta) S.fallosRuta = 0;
      else if (S.visible) {
        // Tolerancia de 3 evaluaciones para que un recambio de estilo del
        // mapa no apague y encienda el HUD en un parpadeo.
        S.fallosRuta++;
        if (S.fallosRuta < 3 && enMarcha) return;
      }

      if (hayRuta && !S.visible) {
        S.modo = modo;
        prepararRuta();
        if (!S.ruta) return;
        var stashIni = (modo === 'bici')
          ? (window.__manolitHudBici && window.__manolitHudBici.rutas ? window.__manolitHudBici.rutas[window.__manolitHudBici.activa || 0] : null)
          : (modo === 'coche' ? window.__manolitHudCoche : window.__manolitHudPeaton);
        S.sigRuta = firmaRuta(stashIni);
        mostrar(caminando);
      } else if (!hayRuta && S.visible) {
        ocultar();
      } else if (hayRuta && S.visible && modo === S.modo) {
        if (caminando !== S.enMarcha) {
          S.enMarcha = caminando;
          S.el.banner.hidden = !caminando;
          S.el.veloWrap.hidden = !caminando;
          if (caminando) {
            encenderGps();
            if (S.rafId == null) S.rafId = requestAnimationFrame(tick);
          } else {
            apagarGps();
            if (S.rafId != null) { cancelAnimationFrame(S.rafId); S.rafId = null; }
            pintarLimite(null);
            pintarVelocidad(null);
          }
        }
        var stashAhora = (S.modo === 'bici')
          ? (window.__manolitHudBici && window.__manolitHudBici.rutas ? window.__manolitHudBici.rutas[window.__manolitHudBici.activa || 0] : null)
          : (S.modo === 'coche' ? window.__manolitHudCoche : window.__manolitHudPeaton);
        var sig = firmaRuta(stashAhora);
        if (sig !== S.sigRuta) {
          // Ruta recalculada en marcha: se repinta con los datos nuevos.
          prepararRuta();
          S.sigRuta = sig;
          resetPintado();
        }
      } else if (hayRuta && S.visible && modo !== S.modo) {
        // Cambio de modo con todo en marcha: se repinta para el modo nuevo.
        restaurarCamara();
        S.modo = modo;
        prepararRuta();
        S.sigRuta = firmaRuta(S.modo === 'bici' ? (window.__manolitHudBici && window.__manolitHudBici.rutas ? window.__manolitHudBici.rutas[window.__manolitHudBici.activa || 0] : null) : (S.modo === 'coche' ? window.__manolitHudCoche : window.__manolitHudPeaton));
        aplicarModo();
        resetPintado();
      }
    } catch (e) { }
  }

  function aplicarModo() {
    var w = S.el.veloWrap;
    w.classList.toggle('rs-hud-modo-peaton', S.modo === 'caminar');
    w.classList.toggle('rs-hud-modo-bici', S.modo === 'bici');
    w.classList.toggle('rs-hud-modo-coche', S.modo === 'coche');
    S.el.recorrido.hidden = S.modo !== 'bici';
  }

  function resetPintado() {
    S.velPintada = undefined;
    S.limiteActual = undefined;
    S.pasoClave = '';
    S.pasoDistRed = -1;
    S.tiempoClave = '';
    S.recorridoM = 0;
  }

  function mostrar(conGps) {
    S.visible = true;
    S.enMarcha = !!conGps;
    S.fallosRuta = 0;
    aplicarModo();
    resetPintado();
    S.el.banner.hidden = !conGps;
    S.el.tiempo.hidden = false;
    S.el.veloWrap.hidden = !conGps;
    if (conGps) encenderGps();
    else apagarGps();
    if (S.evalTimer == null) S.evalTimer = setInterval(function () { if (!document.hidden) evaluar(); }, 1500);
    if (conGps && S.rafId == null) S.rafId = requestAnimationFrame(tick);
    if (!conGps) {
      pintarLimite(null);
      pintarVelocidad(null);
      pintarBanner(0);
      pintarTiempo(0, null);
    }
  }

  function ocultar() {
    S.visible = false;
    S.enMarcha = false;
    S.fallosRuta = 0;
    S.el.banner.hidden = true;
    S.el.tiempo.hidden = true;
    S.el.veloWrap.hidden = true;
    S.el.limite.hidden = true;
    apagarGps();
    if (S.evalTimer != null) { clearInterval(S.evalTimer); S.evalTimer = null; }
    restaurarCamara();
    if (S.rafId != null) { cancelAnimationFrame(S.rafId); S.rafId = null; }
  }

  /* ---------------------------------------------------------------------
     Arranque: espera al mapa con reintentos suaves (nunca un solo timeout,
     el patrón de arboles-3d.js) y se engancha a los estados por observación.
     --------------------------------------------------------------------- */
  function arrancar(intentos) {
    try {
      if (window.manolitAireMap) {
        S.map = window.manolitAireMap;
        S.wrap = S.map.getContainer() ? S.map.getContainer().parentElement : null;
        if (!S.wrap || !S.wrap.classList.contains('map-wrap')) S.wrap = document.querySelector('#main-content .map-wrap');
        if (!S.wrap) { setTimeout(function () { arrancar(intentos + 1); }, 500); return; }
        construirDom();

        // Las etiquetas estáticas siguen al idioma activo.
        try { document.addEventListener('langChanged', pintarEtiquetasEstaticas); } catch (e) { }

        // Cambios de clase (caminata/paseo activo, plegados): reevalúa.
        var programada = false;
        var pedirEval = function () {
          if (programada) return;
          programada = true;
          setTimeout(function () { programada = false; evaluar(); }, 250);
        };
        try {
          var obs = new MutationObserver(pedirEval);
          obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
        } catch (e) { }

        // Las fuentes del mapa no emiten DOM: sondeo barato de 1 s.
        S.evalTimer = setInterval(function () { if (!document.hidden) evaluar(); }, 1500);

        // Batería: con la pestaña oculta el GPS del HUD duerme del todo.
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) {
            apagarGps();
            if (S.evalTimer != null) { clearInterval(S.evalTimer); S.evalTimer = null; }
          }
          else if (S.visible) {
            var btnWalk = document.getElementById('rsBtnWalk');
            if (btnWalk && btnWalk.classList.contains('rs-activo')) encenderGps();
            if (S.evalTimer == null) S.evalTimer = setInterval(function () { if (!document.hidden) evaluar(); }, 1500);
            evaluar();
          }
        });
        window.addEventListener('pagehide', function () {
          apagarGps();
          if (S.evalTimer != null) { clearInterval(S.evalTimer); S.evalTimer = null; }
          if (S.rafId != null) { cancelAnimationFrame(S.rafId); S.rafId = null; }
        }, { passive: true });
        window.addEventListener('pageshow', function () {
          if (!document.hidden && S.visible) {
            if (S.evalTimer == null) S.evalTimer = setInterval(function () { if (!document.hidden) evaluar(); }, 1500);
            evaluar();
          }
        }, { passive: true });

        evaluar();
      } else if (intentos < 120) {
        setTimeout(function () { arrancar(intentos + 1); }, 500);
      }
    } catch (e) { /* el HUD jamás rompe el mapa */ }
  }

  arrancar(0);
})();
