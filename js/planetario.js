/* Planetario: mini sistema solar vivo (Tierra + Sol + Luna) para Manolito Aire.
   - Si el usuario mueve el slider de horas, el sol y la luna siguen esa hora.
   - Si nadie toca nada, los astros derivan solos (1 minuto simulado por segundo real).
   - Sin emojis: todo son esferas SVG con gradientes. */
(function () {
  'use strict';

  if (window.__planetarioCargado) return;
  window.__planetarioCargado = true;

  var SEVILLA = { lat: 37.3891, lon: -5.9845 };
  var CX = 80, CY = 80;
  var RADIO_SOL = 46;
  var RADIO_LUNA = 60;
  var DERIVA_MS_POR_TICK = 60000; // 1 minuto simulado por segundo real
  var GRACIA_INTERACCION_MS = 4000;

  var fechaMostrada = new Date();
  var ultimaInteraccion = 0;
  var coords = null;

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
    var az = azimutRad; // SunCalc: 0 = sur, oeste positivo
    var alt = (alturaRad * 180) / Math.PI;
    // Azimut en grados desde el norte, sentido horario:
    var azimutDeg = ((az * 180) / Math.PI + 180) % 360;
    var rad = (azimutDeg * Math.PI) / 180;
    // La altura acerca el astro al centro (cenit = sobre la Tierra);
    // bajo el horizonte se aleja un poco más allá de su anillo.
    var factor;
    if (alt >= 0) factor = 1 - Math.min(alt, 90) / 90 * 0.82;
    else factor = 1 + Math.min(-alt, 90) / 90 * 0.28;
    var r = radioBase * factor;
    return {
      x: CX + r * Math.sin(rad),
      y: CY - r * Math.cos(rad),
      alturaDeg: alt,
      azimutDeg: azimutDeg
    };
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

    // Cielo de la cúpula: día / tarde / noche según la altura del sol.
    var cielo = s.alturaDeg > 15 ? 'dia' : s.alturaDeg > -6 ? 'tarde' : 'noche';
    if (widget.getAttribute('data-cielo') !== cielo) widget.setAttribute('data-cielo', cielo);

    // Línea de información (sin emojis, solo texto).
    var info = $('rsPlanetarioInfo');
    if (info) {
      var ilum = 0;
      try { ilum = Math.round(SunCalc.getMoonIllumination(fechaMostrada).fraction * 100); } catch (e) { /* opcional */ }
      var horaTxt = fechaMostrada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      info.textContent =
        horaTxt + ' · ' + tt('sun', 'Sol') + ': alt ' + s.alturaDeg.toFixed(1) + '° az ' + Math.round(s.azimutDeg) +
        '° · ' + tt('moon', 'Luna') + ': ' + ilum + '%';
    }
  }

  // Llamado por shadows-route.js cada vez que el usuario toca las horas.
  window.planetarioNotificarHora = function (fecha, lat, lon) {
    if (fecha instanceof Date && !isNaN(fecha)) fechaMostrada = new Date(fecha);
    if (isFinite(lat) && isFinite(lon)) coords = { lat: lat, lon: lon };
    ultimaInteraccion = Date.now();
    pintar();
  };

  function tick() {
    var ahora = Date.now();
    var enDeriva = ahora - ultimaInteraccion > GRACIA_INTERACCION_MS;
    if (enDeriva) {
      // Si la app tiene hora efectiva reciente y nunca se ha interactuado con
      // el planetario, arrancamos la deriva desde esa hora una sola vez.
      fechaMostrada = new Date(fechaMostrada.getTime() + DERIVA_MS_POR_TICK);
    }
    pintar();
  }

  function iniciar() {
    if (!$('rsPlanetario')) return;
    // Primera pintura: si la app ya tiene hora efectiva, la usamos de base.
    var f0 = horaEfectivaApp();
    if (f0) fechaMostrada = f0;
    pintar();
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