/* Planetario: mini sistema solar vivo (Tierra + Sol + Luna) para Manolito Aire.
   - La hora mostrada es SIEMPRE la hora efectiva de la app: la del slider si
     el usuario está simulando, o el reloj real si no está tocando nada.
   - Sin emojis: todo son esferas SVG con gradientes.
   - AÑADIDO: fase lunar real (parte iluminada / oscura que se mueve con la
     hora), satélites que orbitan, y estrellas fugaces / cometas aleatorios. */
(function () {
  'use strict';

  if (window.__planetarioCargado) return;
  window.__planetarioCargado = true;

  var SEVILLA = { lat: 37.3891, lon: -5.9845 };
  var CX = 80, CY = 80;
  var RADIO_SOL = 46;
  var RADIO_LUNA = 60;
  var GRACIA_INTERACCION_MS = 4000;

  var fechaMostrada = new Date();
  var ultimaInteraccion = 0;
  var coords = null;

  // --- estado para la fase lunar (parte iluminada / oscura) ---
  var lunaSombra = null;

  // --- estado para satélites y fenómenos aleatorios (cometas, estrellas) ---
  var SATELITES = [
    { radio: 34, velocidadGrad: 14, faseInicial: 40 },
    { radio: 29, velocidadGrad: -10, faseInicial: 200 }
  ]; // añade o quita objetos aquí para más o menos satélites

  var svgRaiz = null;
  var satelitesEls = [];
  var capaEventos = null;
  var tSatelites = 0;

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
    } catch (e) { /* sin mapa todavía */ }
    return SEVILLA;
  }

  // El shadows-route expone la hora efectiva del slider si existe.
  function horaEfectivaApp() {
    try {
      if (typeof window.manolitAireHoraEfectiva === 'function') {
        var f = window.manolitAireHoraEfectiva();
        if (f instanceof Date && !isNaN(f)) return f;
      }
    } catch (e) { /* sin hora efectiva todavía */ }
    return null;
  }

  function posicionOrbe(azimutRad, alturaRad, radioBase) {
    // El astro orbita siempre sobre su anillo (como un reloj):
    // azimut fija la posición; la altura solo cambia brillo y tamaño.
    var alt = (alturaRad * 180) / Math.PI;
    var azimutDeg = ((azimutRad * 180) / Math.PI + 180) % 360;
    var rad = (azimutDeg * Math.PI) / 180;
    return {
      x: CX + radioBase * Math.sin(rad),
      y: CY - radioBase * Math.cos(rad),
      alturaDeg: alt,
      azimutDeg: azimutDeg
    };
  }

  // --- fase lunar: dibuja la silueta oscura encima del círculo de la luna ---
  function trazadoSombraLunar(cx, cy, r, fraccion, creciente) {
    // fraccion: 0 = luna nueva (toda en sombra), 1 = luna llena (sin sombra)
    var rx = r * Math.abs(1 - fraccion * 2);
    var barridoLimbo = creciente ? 1 : 0;
    var barridoTerminador = fraccion < 0.5 ? (1 - barridoLimbo) : barridoLimbo;
    return 'M ' + cx + ',' + (cy - r) +
      ' A ' + r + ',' + r + ' 0 0,' + barridoLimbo + ' ' + cx + ',' + (cy + r) +
      ' A ' + rx + ',' + r + ' 0 0,' + barridoTerminador + ' ' + cx + ',' + (cy - r) + ' Z';
  }

  function asegurarSombraLunar(lunaOrbe, lunaCircle) {
    if (lunaSombra) return lunaSombra;
    var ns = 'http://www.w3.org/2000/svg';
    var r = parseFloat(lunaCircle.getAttribute('r')) || 6;
    var cx = parseFloat(lunaCircle.getAttribute('cx')) || 0;
    var cy = parseFloat(lunaCircle.getAttribute('cy')) || 0;
    lunaSombra = document.createElementNS(ns, 'path');
    lunaSombra.setAttribute('fill', '#050b14'); // ajusta al tono de tu cúpula nocturna si hace falta
    lunaSombra.setAttribute('data-cx', cx);
    lunaSombra.setAttribute('data-cy', cy);
    lunaSombra.setAttribute('data-r', r);
    lunaOrbe.appendChild(lunaSombra); // va detrás en el DOM = se pinta encima del circle
    return lunaSombra;
  }

  function pintar() {
    var widget = $('rsPlanetario');
    if (!widget || !window.SunCalc) return;
    var solOrbe = $('rsSolOrbe');
    var lunaOrbe = $('rsLunaOrbe');
    if (!solOrbe || !lunaOrbe) return;

    var p = obtenerCoords();
    var posSol = SunCalc.getPosition(fechaMostrada, p.lat, p.lon);
    var posLuna = SunCalc.getMoonPosition(fechaMostrada, p.lat, p.lon);

    var ilumLuna = 0, faseLuna = 0;
    try {
      var ilumInfo = SunCalc.getMoonIllumination(fechaMostrada);
      ilumLuna = ilumInfo.fraction;
      faseLuna = ilumInfo.phase; // <0.5 creciente, >=0.5 menguante
    } catch (e) { /* opcional */ }

    var s = posicionOrbe(posSol.azimuth, posSol.altitude, RADIO_SOL);
    var l = posicionOrbe(posLuna.azimuth, posLuna.altitude, RADIO_LUNA);

    solOrbe.style.transform = 'translate(' + s.x.toFixed(1) + 'px, ' + s.y.toFixed(1) + 'px)';
    lunaOrbe.style.transform = 'translate(' + l.x.toFixed(1) + 'px, ' + l.y.toFixed(1) + 'px)';

    // Sol: brilla según altura; bajo el horizonte se apaga pero sigue visible.
    var solCircle = solOrbe.querySelector('circle');
    if (s.alturaDeg <= 0) {
      solOrbe.style.opacity = '0.22';
      solCircle.setAttribute('r', '6');
    } else {
      solOrbe.style.opacity = String(0.65 + Math.min(s.alturaDeg, 90) / 90 * 0.35);
      solCircle.setAttribute('r', String(6.5 + Math.min(s.alturaDeg, 90) / 90 * 2.5));
    }

    // Luna: discreta de día, protagonista de noche; bajo el horizonte se desvanece.
    lunaOrbe.style.opacity = l.alturaDeg <= 0 ? '0.12' : (s.alturaDeg > 0 ? '0.55' : '0.95');

    // Fase lunar real: parte iluminada / parte oscura, se mueve con la hora.
    var lunaCircle = lunaOrbe.querySelector('circle');
    if (lunaCircle) {
      var sombra = asegurarSombraLunar(lunaOrbe, lunaCircle);
      sombra.setAttribute('d', trazadoSombraLunar(
        parseFloat(sombra.getAttribute('data-cx')),
        parseFloat(sombra.getAttribute('data-cy')),
        parseFloat(sombra.getAttribute('data-r')),
        ilumLuna, faseLuna < 0.5
      ));
    }

    // Cielo de la cúpula: día / tarde / noche según la altura del sol.
    var cielo = s.alturaDeg > 15 ? 'dia' : s.alturaDeg > -6 ? 'tarde' : 'noche';
    if (widget.getAttribute('data-cielo') !== cielo) widget.setAttribute('data-cielo', cielo);

    // Línea de información (sin emojis, solo texto).
    var info = $('rsPlanetarioInfo');
    if (info) {
      var ilum = Math.round(ilumLuna * 100);
      var horaTxt = fechaMostrada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      info.textContent =
        horaTxt + ' · ' + tt('sun', 'Sol') + ': alt ' + s.alturaDeg.toFixed(1) + '° az ' + Math.round(s.azimutDeg) +
        '° · ' + tt('moon', 'Luna') + ': ' + ilum + '%';
    }
  }

  // --- satélites y fenómenos aleatorios (cometas / estrellas fugaces) ---

  function crearCapaEspacio() {
    var widget = $('rsPlanetario');
    svgRaiz = widget ? widget.querySelector('svg') : null;
    if (!svgRaiz) return; // si no hay svg directo, no se añade nada (no rompe lo existente)
    var ns = 'http://www.w3.org/2000/svg';

    SATELITES.forEach(function (cfg) {
      var el = document.createElementNS(ns, 'circle');
      el.setAttribute('r', '1.1');
      el.setAttribute('fill', '#c9d4e0');
      el.setAttribute('opacity', '0.75');
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
    return { x: CX + 78 * Math.cos(ang), y: CY + 78 * Math.sin(ang) };
  }

  function programarProximoFenomeno() {
    var espera = 9000 + Math.random() * 18000; // entre 9 y 27s, aleatorio, no siempre
    setTimeout(function () {
      if (Math.random() < 0.22) lanzarCometa(); else lanzarEstrellaFugaz();
      programarProximoFenomeno();
    }, espera);
  }

  function crearTrazo(color, grosor) {
    var ns = 'http://www.w3.org/2000/svg';
    var linea = document.createElementNS(ns, 'line');
    linea.setAttribute('stroke', color);
    linea.setAttribute('stroke-width', grosor);
    linea.setAttribute('stroke-linecap', 'round');
    linea.setAttribute('opacity', '0');
    capaEventos.appendChild(linea);
    return linea;
  }

  function lanzarEstrellaFugaz() {
    if (!capaEventos) return;
    animarTrazo(crearTrazo('#eef3fa', '1'), puntoBorde(), puntoBorde(), 700, 0.95);
  }

  function lanzarCometa() {
    if (!capaEventos) return;
    animarTrazo(crearTrazo('#e8b46a', '1.6'), puntoBorde(), puntoBorde(), 2200, 0.85);
  }

  function animarTrazo(linea, a, b, duracionMs, opacidadMax) {
    var inicio = null;
    function paso(marca) {
      if (inicio === null) inicio = marca;
      var progreso = Math.min((marca - inicio) / duracionMs, 1);
      var cola = Math.max(0, progreso - 0.18);
      linea.setAttribute('x1', (a.x + (b.x - a.x) * cola).toFixed(1));
      linea.setAttribute('y1', (a.y + (b.y - a.y) * cola).toFixed(1));
      linea.setAttribute('x2', (a.x + (b.x - a.x) * progreso).toFixed(1));
      linea.setAttribute('y2', (a.y + (b.y - a.y) * progreso).toFixed(1));
      var op = progreso < 0.15 ? progreso / 0.15 : (progreso > 0.8 ? (1 - progreso) / 0.2 : 1);
      linea.setAttribute('opacity', String(Math.max(0, op) * opacidadMax));
      if (progreso < 1) requestAnimationFrame(paso); else linea.remove();
    }
    requestAnimationFrame(paso);
  }

  // Llamado por shadows-route.js cada vez que el usuario toca las horas.
  window.planetarioNotificarHora = function (fecha, lat, lon) {
    if (fecha instanceof Date && !isNaN(fecha)) fechaMostrada = new Date(fecha);
    if (isFinite(lat) && isFinite(lon)) coords = { lat: lat, lon: lon };
    ultimaInteraccion = Date.now();
    pintar();
  };

  function tick() {
    // La hora del planetario es siempre la hora efectiva de la app: la del
    // slider si el usuario simula, o el reloj real en reposo.
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
    // Primera pintura: si la app ya tiene hora efectiva, la usamos de base.
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
    var sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.min.js';
    sc.onload = fn;
    document.head.appendChild(sc);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { cargarSunCalcYLuego(iniciar); });
  } else {
    cargarSunCalcYLuego(iniciar);
  }
})();