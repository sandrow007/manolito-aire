/* Planetario: mini sistema solar vivo (Tierra + Sol + Luna) para Manolito Aire.
   - La hora es SIEMPRE la hora efectiva de la app (slider o reloj real).
   - Sin emojis. Sin colores ajenos al diseño existente.
   - Fase lunar realista: el terminador (línea luz/sombra) se orienta según
     el ángulo real sol→luna calculado por SunCalc (.angle), igual que en
     los diagramas astronómicos reales. Rota con cada cambio de hora.
   - Satélites orbitando + estrellas fugaces y cometas finos y aleatorios. */
(function () {
  'use strict';

  if (window.__planetarioCargado) return;
  window.__planetarioCargado = true;

  var SEVILLA = { lat: 37.3891, lon: -5.9845 };
  var CX = 80, CY = 80;
  var RADIO_SOL  = 46;
  var RADIO_LUNA = 60;
  var GRACIA_INTERACCION_MS = 4000;

  var fechaMostrada    = new Date();
  var ultimaInteraccion = 0;
  var coords           = null;

  // elementos SVG de fase lunar (creados una sola vez)
  var lunaClipCirc  = null;   // el <circle> dentro del <clipPath>
  var lunaSombraEl  = null;   // el <path> de la zona oscura

  // satélites y fenómenos
  var SATELITES = [
    { radio: 34, velocidadGrad:  14, faseInicial:  40 },
    { radio: 29, velocidadGrad: -10, faseInicial: 200 }
  ];
  var svgRaiz      = null;
  var satelitesEls = [];
  var capaEventos  = null;
  var tSatelites   = 0;

  function $(id) { return document.getElementById(id); }

  function tt(clave, fallback) {
    try { return typeof t === 'function' ? t(clave, fallback) : fallback; } catch (e) { return fallback; }
  }

  function obtenerCoords() {
    if (coords) return coords;
    try {
      var map = window.manolitAireMap;
      if (map && map.getCenter) {
        var c = map.getCenter();
        if (c && isFinite(c.lat)) return { lat: c.lat, lon: c.lng != null ? c.lng : c.lon };
      }
    } catch (e) {}
    return SEVILLA;
  }

  function horaEfectivaApp() {
    try {
      if (typeof window.manolitAireHoraEfectiva === 'function') {
        var f = window.manolitAireHoraEfectiva();
        if (f instanceof Date && !isNaN(f)) return f;
      }
    } catch (e) {}
    return null;
  }

  function posicionOrbe(azimutRad, alturaRad, radioBase) {
    var alt      = (alturaRad * 180) / Math.PI;
    var azimutDeg = ((azimutRad * 180) / Math.PI + 180) % 360;
    var rad      = (azimutDeg * Math.PI) / 180;
    return {
      x: CX + radioBase * Math.sin(rad),
      y: CY - radioBase * Math.cos(rad),
      alturaDeg: alt,
      azimutDeg: azimutDeg
    };
  }

  // ---------------------------------------------------------------------------
  // FASE LUNAR REALISTA
  //
  // El terminador (frontera luz/sombra) no es siempre vertical: su ángulo
  // depende de dónde está el sol respecto a la luna en ese instante.
  // SunCalc.getMoonIllumination() devuelve exactamente ese ángulo en .angle
  // (radianes, desde el norte celeste). Lo usamos para rotar el path SVG.
  //
  // El path en coordenadas locales (cx=0, cy=0):
  //   - Semicírculo del limbo (borde exterior del lado iluminado)
  //   - Elipse del terminador (la frontera, que se achata según la fase)
  // Luego se rota todo según ilumInfo.angle.
  // ---------------------------------------------------------------------------

  function trazadoTerminador(r, fraccion, creciente) {
    // rx: semieje horizontal del terminador.
    //   fraccion=0   → luna nueva  → rx=r  (semicírculo, toda en sombra)
    //   fraccion=0.5 → cuarto      → rx=0  (línea recta)
    //   fraccion=1   → luna llena  → rx=r  (semicírculo, sin sombra)
    var rx = r * Math.abs(1 - fraccion * 2);

    // El path traza la zona OSCURA:
    // - Limbo oscuro: el semicírculo del lado NO iluminado
    // - Terminador: la elipse que une los polos
    //
    // creciente=true  → lado iluminado a la derecha → sombra a la izquierda
    //   limbo oscuro: semicírculo izquierdo (sweep=0, anti-horario)
    //   terminador:   si fraccion<0.5, barre hacia afuera (sweep=1)
    //                 si fraccion>0.5, barre hacia adentro (sweep=0)
    var sweepLimbo       = creciente ? 0 : 1;
    var sweepTerminador;
    if (fraccion <= 0.5) {
      sweepTerminador = creciente ? 1 : 0;
    } else {
      sweepTerminador = creciente ? 0 : 1;
    }

    // El path empieza en el polo norte del círculo (0, -r) y termina en el polo sur (0, r)
    return (
      'M 0,' + (-r) +
      ' A ' + r  + ',' + r + ' 0 0,' + sweepLimbo       + ' 0,' + r +
      ' A ' + rx + ',' + r + ' 0 0,' + sweepTerminador  + ' 0,' + (-r) +
      ' Z'
    );
  }

  function iniciarElementosFaseLunar(lunaOrbe) {
    if (lunaSombraEl) return; // ya creados
    var ns  = 'http://www.w3.org/2000/svg';
    var cid = 'rsLunaClip';

    // clipPath para recortar la sombra al círculo lunar
    var clip = document.createElementNS(ns, 'clipPath');
    clip.setAttribute('id', cid);
    lunaClipCirc = document.createElementNS(ns, 'circle');
    clip.appendChild(lunaClipCirc);
    lunaOrbe.insertBefore(clip, lunaOrbe.firstChild);

    // path de la zona oscura
    lunaSombraEl = document.createElementNS(ns, 'path');
    lunaSombraEl.setAttribute('fill',        'rgba(0,0,0,0.86)');
    lunaSombraEl.setAttribute('clip-path',   'url(#' + cid + ')');
    lunaOrbe.appendChild(lunaSombraEl);
  }

  function actualizarFaseLunar(lunaOrbe, fraccion, creciente, anguloRad) {
    var lunaCircle = lunaOrbe.querySelector('circle:not([clip-path])');
    if (!lunaCircle) return;

    var r  = parseFloat(lunaCircle.getAttribute('r'))  || 6;
    var cx = parseFloat(lunaCircle.getAttribute('cx')) || 0;
    var cy = parseFloat(lunaCircle.getAttribute('cy')) || 0;

    iniciarElementosFaseLunar(lunaOrbe);

    // actualizar clip al radio actual de la luna
    lunaClipCirc.setAttribute('cx', cx);
    lunaClipCirc.setAttribute('cy', cy);
    lunaClipCirc.setAttribute('r',  r);

    // dibujar el terminador en coordenadas locales centradas en (cx,cy)
    lunaSombraEl.setAttribute('d', trazadoTerminador(r, fraccion, creciente));

    // rotar según el ángulo real sol→luna (en grados, desde norte celeste)
    // + 90 para pasar de coordenadas celestes a SVG (eje Y invertido)
    var anguloDeg = anguloRad * 180 / Math.PI + 90;
    lunaSombraEl.setAttribute('transform',
      'translate(' + cx + ',' + cy + ') rotate(' + anguloDeg.toFixed(2) + ')');
  }

  // ---------------------------------------------------------------------------

  function pintar() {
    var widget = $('rsPlanetario');
    if (!widget || !window.SunCalc) return;
    var solOrbe  = $('rsSolOrbe');
    var lunaOrbe = $('rsLunaOrbe');
    if (!solOrbe || !lunaOrbe) return;

    var p       = obtenerCoords();
    var posSol  = SunCalc.getPosition(fechaMostrada, p.lat, p.lon);
    var posLuna = SunCalc.getMoonPosition(fechaMostrada, p.lat, p.lon);

    // Fase lunar: fraccion, phase y ángulo del terminador
    var ilumFraccion = 0, faseLuna = 0, anguloTerminador = 0;
    try {
      var ilumInfo     = SunCalc.getMoonIllumination(fechaMostrada);
      ilumFraccion     = ilumInfo.fraction; // 0..1
      faseLuna         = ilumInfo.phase;    // 0..1: <0.5 creciente
      anguloTerminador = ilumInfo.angle;    // radianes: ángulo real sol→luna
    } catch (e) {}

    var s = posicionOrbe(posSol.azimuth,  posSol.altitude,  RADIO_SOL);
    var l = posicionOrbe(posLuna.azimuth, posLuna.altitude, RADIO_LUNA);

    solOrbe.style.transform  = 'translate(' + s.x.toFixed(1) + 'px, ' + s.y.toFixed(1) + 'px)';
    lunaOrbe.style.transform = 'translate(' + l.x.toFixed(1) + 'px, ' + l.y.toFixed(1) + 'px)';

    // Sol: brillo según altura
    var solCircle = solOrbe.querySelector('circle');
    if (solCircle) {
      if (s.alturaDeg <= 0) {
        solOrbe.style.opacity = '0.22';
        solCircle.setAttribute('r', '6');
      } else {
        solOrbe.style.opacity = String(0.65 + Math.min(s.alturaDeg, 90) / 90 * 0.35);
        solCircle.setAttribute('r', String(6.5 + Math.min(s.alturaDeg, 90) / 90 * 2.5));
      }
    }

    // Luna: opacidad según momento del día
    lunaOrbe.style.opacity = l.alturaDeg <= 0 ? '0.12' : (s.alturaDeg > 0 ? '0.55' : '0.95');

    // Fase lunar con ángulo real del terminador
    actualizarFaseLunar(lunaOrbe, ilumFraccion, faseLuna < 0.5, anguloTerminador);

    // Cielo de la cúpula
    var cielo = s.alturaDeg > 15 ? 'dia' : s.alturaDeg > -6 ? 'tarde' : 'noche';
    if (widget.getAttribute('data-cielo') !== cielo) widget.setAttribute('data-cielo', cielo);

    // Texto informativo
    var info = $('rsPlanetarioInfo');
    if (info) {
      var ilum    = Math.round(ilumFraccion * 100);
      var horaTxt = fechaMostrada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      info.textContent =
        horaTxt + ' · ' + tt('sun', 'Sol') + ': alt ' + s.alturaDeg.toFixed(1) +
        '° az ' + Math.round(s.azimutDeg) +
        '° · ' + tt('moon', 'Luna') + ': ' + ilum + '%';
    }
  }

  // ---------------------------------------------------------------------------
  // SATÉLITES Y FENÓMENOS ALEATORIOS
  // ---------------------------------------------------------------------------

  function crearCapaEspacio() {
    var widget = $('rsPlanetario');
    svgRaiz = widget ? widget.querySelector('svg') : null;
    if (!svgRaiz) return;
    var ns = 'http://www.w3.org/2000/svg';

    SATELITES.forEach(function (cfg) {
      var el = document.createElementNS(ns, 'circle');
      el.setAttribute('r',       '0.9');
      el.setAttribute('fill',    '#d0dce8');
      el.setAttribute('opacity', '0.6');
      svgRaiz.appendChild(el);
      satelitesEls.push({ el: el, cfg: cfg });
    });

    capaEventos = document.createElementNS(ns, 'g');
    capaEventos.setAttribute('id', 'rsEspacioEventos');
    svgRaiz.appendChild(capaEventos);

    requestAnimationFrame(animarEspacio);
    programarProximoFenomeno();
  }

  function animarEspacio() {
    tSatelites++;
    satelitesEls.forEach(function (sat) {
      var ang = (sat.cfg.faseInicial + tSatelites * sat.cfg.velocidadGrad / 60) * Math.PI / 180;
      sat.el.setAttribute('cx', (CX + sat.cfg.radio * Math.cos(ang)).toFixed(1));
      sat.el.setAttribute('cy', (CY + sat.cfg.radio * Math.sin(ang)).toFixed(1));
    });
    requestAnimationFrame(animarEspacio);
  }

  function puntoBorde() {
    var ang = Math.random() * Math.PI * 2;
    return { x: CX + 76 * Math.cos(ang), y: CY + 76 * Math.sin(ang) };
  }

  function programarProximoFenomeno() {
    var espera = 12000 + Math.random() * 18000;
    setTimeout(function () {
      if (Math.random() < 0.2) lanzarCometa(); else lanzarEstrellaFugaz();
      programarProximoFenomeno();
    }, espera);
  }

  function crearTrazo(color, grosor, opMax) {
    var ns    = 'http://www.w3.org/2000/svg';
    var linea = document.createElementNS(ns, 'line');
    linea.setAttribute('stroke',         color);
    linea.setAttribute('stroke-width',   grosor);
    linea.setAttribute('stroke-linecap', 'round');
    linea.setAttribute('opacity',        '0');
    linea._opMax = opMax;
    capaEventos.appendChild(linea);
    return linea;
  }

  function lanzarEstrellaFugaz() {
    if (!capaEventos) return;
    animarTrazo(crearTrazo('rgba(220,235,255,0.9)', '0.4', 0.5), puntoBorde(), puntoBorde(), 500);
  }

  function lanzarCometa() {
    if (!capaEventos) return;
    animarTrazo(crearTrazo('rgba(230,195,110,0.85)', '0.7', 0.4), puntoBorde(), puntoBorde(), 2000);
  }

  function animarTrazo(linea, a, b, duracionMs) {
    var opMax  = linea._opMax || 0.5;
    var inicio = null;
    function paso(marca) {
      if (inicio === null) inicio = marca;
      var progreso = Math.min((marca - inicio) / duracionMs, 1);
      var cola     = Math.max(0, progreso - 0.2);
      linea.setAttribute('x1', (a.x + (b.x - a.x) * cola    ).toFixed(1));
      linea.setAttribute('y1', (a.y + (b.y - a.y) * cola    ).toFixed(1));
      linea.setAttribute('x2', (a.x + (b.x - a.x) * progreso).toFixed(1));
      linea.setAttribute('y2', (a.y + (b.y - a.y) * progreso).toFixed(1));
      var op = progreso < 0.15
        ? (progreso / 0.15)
        : (progreso > 0.75 ? (1 - progreso) / 0.25 : 1);
      linea.setAttribute('opacity', String(Math.max(0, op) * opMax));
      if (progreso < 1) requestAnimationFrame(paso); else linea.remove();
    }
    requestAnimationFrame(paso);
  }

  // ---------------------------------------------------------------------------

  window.planetarioNotificarHora = function (fecha, lat, lon) {
    if (fecha instanceof Date && !isNaN(fecha)) fechaMostrada = new Date(fecha);
    if (isFinite(lat) && isFinite(lon)) coords = { lat: lat, lon: lon };
    ultimaInteraccion = Date.now();
    pintar();
  };

  function tick() {
    var f = horaEfectivaApp();
    if (f) {
      fechaMostrada = f;
    } else if (Date.now() - ultimaInteraccion > GRACIA_INTERACCION_MS) {
      fechaMostrada = new Date();
    }
    pintar();
  }

  function iniciar() {
    if (!$('rsPlanetario')) return;
    var f0 = horaEfectivaApp();
    if (f0) fechaMostrada = f0;
    pintar();
    crearCapaEspacio();
    setInterval(tick, 1000);
    window.addEventListener('langChanged', pintar);
  }

  function cargarSunCalcYLuego(fn) {
    if (window.SunCalc) { fn(); return; }
    var existente = document.querySelector('script[src*="suncalc"]');
    if (existente) {
      var espera = setInterval(function () {
        if (window.SunCalc) { clearInterval(espera); fn(); }
      }, 150);
      setTimeout(function () { clearInterval(espera); }, 15000);
      return;
    }
    var sc    = document.createElement('script');
    sc.src    = 'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.min.js';
    sc.onload = fn;
    document.head.appendChild(sc);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { cargarSunCalcYLuego(iniciar); });
  } else {
    cargarSunCalcYLuego(iniciar);
  }

})();