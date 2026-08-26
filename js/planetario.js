/* Planetario: mini sistema solar vivo (Tierra + Sol + Luna) para Manolito Aire.
   - La hora es SIEMPRE la hora efectiva de la app (slider o reloj real).
   - Sin emojis. Sin colores ajenos al diseño existente.
   - Fase lunar realista: terminador orientado por ángulo real sol→luna (SunCalc.angle).
     Sin clipPath (incompatible con CSS transform en Safari/Chrome) — el path
     de sombra es autocontenido y siempre queda dentro del disco lunar.
     La luna muestra su % de iluminación real, actualizado cada segundo con
     la hora efectiva de la app, y se dibuja tal y como se ve desde tu zona.
   - Satélites orbitando la Tierra (la simulación que ya tenía la web).
   - Estrellas como luces cuánticas: puntos con halo que titilan suavemente
     (cada una con su frecuencia y fase), visibles sobre todo de noche.
     Nada de puntitos blancos fijos pintados a mano en el SVG.
   - Estrellas fugaces y cometas finos aleatorios cruzando la cúpula. */
(function () {
  'use strict';

  if (window.__planetarioCargado) return;
  window.__planetarioCargado = true;

  var SEVILLA = { lat: 37.3891, lon: -5.9845 };
  var CX = 80, CY = 80;
  var RADIO_SOL  = 46;
  var RADIO_LUNA = 60;
  var GRACIA_INTERACCION_MS = 4000;

  var fechaMostrada     = new Date();
  var ultimaInteraccion = 0;
  var coords            = null;
  var lunaSombraEl      = null; // <path> de la zona oscura, creado una sola vez

  /* Satélites: los mismos que ya orbitaban en la web (radio, velocidad y
     fase inicial), ni más ni menos. */
  var SATELITES = [
    { radio: 34, velocidadGrad:  14, faseInicial:  40 },
    { radio: 29, velocidadGrad: -10, faseInicial: 200 }
  ];
  var svgRaiz      = null;
  var satelitesEls = [];
  var capaEventos  = null;
  var tSatelites   = 0;

  /* Estrellas cuánticas: se generan por código (no van pintadas en el HTML)
     y titilan como luz real — cada una con su brillo base, su halo, su
     frecuencia de parpadeo y su fase. Posiciones fijas para que la cúpula
     sea reconocible noche tras noche. */
  var ESTRELLAS = [
    { x:  38, y:  42, r: 1.1, tono: '#dfe9f5', vel: 1.9, fase: 0.0 },
    { x: 118, y:  38, r: 0.9, tono: '#cfe0ff', vel: 1.3, fase: 1.1 },
    { x: 128, y:  95, r: 1.2, tono: '#e8f0ff', vel: 2.4, fase: 2.3 },
    { x:  45, y: 120, r: 0.8, tono: '#d5e2f2', vel: 1.6, fase: 3.4 },
    { x:  95, y: 125, r: 1.0, tono: '#f4e9d0', vel: 2.1, fase: 0.7 },
    { x:  30, y:  85, r: 0.9, tono: '#dce8fa', vel: 1.2, fase: 4.2 },
    { x: 105, y:  70, r: 0.7, tono: '#cfe0ff', vel: 2.8, fase: 5.0 },
    { x:  66, y:  30, r: 0.8, tono: '#e8f0ff', vel: 1.7, fase: 2.9 },
    { x:  52, y:  62, r: 0.6, tono: '#d5e2f2', vel: 3.1, fase: 1.8 },
    { x: 135, y:  60, r: 0.7, tono: '#dfe9f5', vel: 2.2, fase: 3.9 },
    { x:  25, y: 105, r: 0.7, tono: '#f4e9d0', vel: 1.4, fase: 0.4 },
    { x:  80, y:  22, r: 0.9, tono: '#e8f0ff', vel: 1.8, fase: 5.6 }
  ];
  var estrellasEls = [];
  var reducirMovimiento = false;
  try {
    reducirMovimiento = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { /* si no se puede saber, se anima igual */ }

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

  // El shadows-route expone la hora efectiva del slider si existe.
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
    // El astro orbita siempre sobre su anillo (como un reloj):
    // azimut fija la posición; la altura solo cambia brillo y tamaño.
    var alt       = (alturaRad * 180) / Math.PI;
    var azimutDeg = ((azimutRad * 180) / Math.PI + 180) % 360;
    var rad       = (azimutDeg * Math.PI) / 180;
    return {
      x: CX + radioBase * Math.sin(rad),
      y: CY - radioBase * Math.cos(rad),
      alturaDeg: alt,
      azimutDeg: azimutDeg
    };
  }

  // ---------------------------------------------------------------------------
  // FASE LUNAR — path autocontenido, sin clipPath
  //
  // Dibuja la zona oscura de la luna como un path SVG que nunca sale del disco.
  // Dos arcos comparten los polos norte/sur del círculo:
  //   1. Arco del limbo oscuro (semicírculo exterior)
  //   2. Arco del terminador  (elipse que se aplana según la fase)
  // El path se genera en coordenadas locales (centro en 0,0) y luego se
  // traslada+rota al centro real del círculo lunar y al ángulo sol→luna.
  // ---------------------------------------------------------------------------

  function pathSombraLocal(r, fraccion, creciente) {
    // rx: semieje horizontal del terminador
    //   fraccion=0   → luna nueva  → rx=r (sombra total)
    //   fraccion=0.5 → cuarto      → rx=0 (línea recta)
    //   fraccion=1   → luna llena  → rx=r (sin sombra, pero no se llama)
    var rx = r * Math.abs(1 - fraccion * 2);

    // sweeps para que la zona oscura quede siempre del lado correcto.
    // OJO: el terminador debe abombarse HACIA el lado oscuro en gibosa
    // (sombra = huso fino) y HACIA el lado iluminado en creciente/menguante
    // (sombra = más de medio disco). sweep=1 abomba a la izquierda,
    // sweep=0 a la derecha (en el arco de vuelta, de abajo a arriba).
    var sweepLimbo, sweepTerm;
    if (creciente) {
      // iluminado a la derecha → sombra a la izquierda
      sweepLimbo = 0; // arco izquierdo
      sweepTerm  = fraccion < 0.5 ? 0 : 1;
    } else {
      // iluminado a la izquierda → sombra a la derecha
      sweepLimbo = 1; // arco derecho
      sweepTerm  = fraccion < 0.5 ? 1 : 0;
    }

    return (
      'M 0 ' + (-r) +
      ' A ' + r  + ' ' + r + ' 0 0 ' + sweepLimbo + ' 0 ' + r +
      ' A ' + rx + ' ' + r + ' 0 0 ' + sweepTerm  + ' 0 ' + (-r) +
      ' Z'
    );
  }

  function actualizarFaseLunar(lunaOrbe, fraccion, creciente, anguloRad) {
    // Si la luna está casi llena (>98%) o nueva (<2%), la sombra es mínima
    // o total — igual se dibuja pero no se nota o es el disco entero.
    var lunaCircle = lunaOrbe.querySelector('circle');
    if (!lunaCircle) return;

    var r  = parseFloat(lunaCircle.getAttribute('r'))  || 6;
    var cx = parseFloat(lunaCircle.getAttribute('cx')) || 0;
    var cy = parseFloat(lunaCircle.getAttribute('cy')) || 0;

    // Crear el elemento de sombra la primera vez
    if (!lunaSombraEl) {
      var ns       = 'http://www.w3.org/2000/svg';
      lunaSombraEl = document.createElementNS(ns, 'path');
      lunaSombraEl.setAttribute('fill', 'rgba(0,0,0,0.88)');
      lunaOrbe.appendChild(lunaSombraEl);
    }

    // path en coordenadas locales (0,0) luego transformado
    lunaSombraEl.setAttribute('d', pathSombraLocal(r, fraccion, creciente));

    // translate al centro del círculo + rotate según ángulo real sol→luna
    // +90° para convertir de coordenadas celestes (norte arriba) a SVG (Y invertido)
    var angDeg = anguloRad * 180 / Math.PI + 90;
    lunaSombraEl.setAttribute(
      'transform',
      'translate(' + cx + ',' + cy + ') rotate(' + angDeg.toFixed(2) + ')'
    );
  }

  // Nombre legible de la fase, para que la línea de info diga no solo el %
  // sino cómo se ve la luna esta noche ("luna creciente", "gibosa menguante"…).
  function nombreFaseLunar(fase) {
    if (fase < 0.03 || fase > 0.97) return tt('moonNew', 'luna nueva');
    if (fase < 0.22)  return tt('moonWaxCres', 'luna creciente');
    if (fase < 0.28)  return tt('moonFirstQ', 'cuarto creciente');
    if (fase < 0.47)  return tt('moonWaxGib', 'gibosa creciente');
    if (fase < 0.53)  return tt('moonFull', 'luna llena');
    if (fase < 0.72)  return tt('moonWanGib', 'gibosa menguante');
    if (fase < 0.78)  return tt('moonLastQ', 'cuarto menguante');
    return tt('moonWanCres', 'luna menguante');
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

    var ilumFraccion = 0, faseLuna = 0, anguloTerminador = 0;
    try {
      var ilumInfo     = SunCalc.getMoonIllumination(fechaMostrada);
      ilumFraccion     = ilumInfo.fraction;
      faseLuna         = ilumInfo.phase;
      anguloTerminador = ilumInfo.angle; // radianes: ángulo real sol→luna
    } catch (e) {}

    var s = posicionOrbe(posSol.azimuth,  posSol.altitude,  RADIO_SOL);
    var l = posicionOrbe(posLuna.azimuth, posLuna.altitude, RADIO_LUNA);

    solOrbe.style.transform  = 'translate(' + s.x.toFixed(1) + 'px, ' + s.y.toFixed(1) + 'px)';
    lunaOrbe.style.transform = 'translate(' + l.x.toFixed(1) + 'px, ' + l.y.toFixed(1) + 'px)';

    // Sol: brilla según altura; bajo el horizonte se apaga pero sigue visible.
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

    // Luna: discreta de día, protagonista de noche; bajo el horizonte se desvanece.
    lunaOrbe.style.opacity = l.alturaDeg <= 0 ? '0.12' : (s.alturaDeg > 0 ? '0.55' : '0.95');

    // Fase lunar con ángulo real: la luna se dibuja tal y como se ve.
    actualizarFaseLunar(lunaOrbe, ilumFraccion, faseLuna < 0.5, anguloTerminador);

    // Cielo de la cúpula: día / tarde / noche según la altura del sol.
    var cielo = s.alturaDeg > 15 ? 'dia' : s.alturaDeg > -6 ? 'tarde' : 'noche';
    if (widget.getAttribute('data-cielo') !== cielo) widget.setAttribute('data-cielo', cielo);

    // Línea de información en tiempo real (cada segundo): hora efectiva,
    // sol (altura y azimut) y luna con su % de iluminación y su fase.
    var info = $('rsPlanetarioInfo');
    if (info) {
      var ilum    = Math.round(ilumFraccion * 100);
      var horaTxt = fechaMostrada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      info.textContent =
        horaTxt + ' · ' + tt('sun', 'Sol') + ': alt ' + s.alturaDeg.toFixed(1) +
        '° az ' + Math.round(s.azimutDeg) +
        '° · ' + tt('moon', 'Luna') + ': ' + ilum + '% ' + nombreFaseLunar(faseLuna);
    }
  }

  // ---------------------------------------------------------------------------
  // ESTRELLAS CUÁNTICAS, SATÉLITES Y FENÓMENOS ALEATORIOS
  // ---------------------------------------------------------------------------

  // Cada estrella es dos círculos: el halo (desenfoque suave, como la luz
  // temblando al cruzar la atmósfera) y el núcleo puntual. El titileo se
  // anima en animarEspacio con una sinusoide por estrella.
  function crearEstrellasCuanticas() {
    if (!svgRaiz) return;
    var ns = 'http://www.w3.org/2000/svg';

    // Filtro de desenfoque para los halos (se crea una sola vez en <defs>).
    var defs = svgRaiz.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(ns, 'defs');
      svgRaiz.insertBefore(defs, svgRaiz.firstChild);
    }
    if (!defs.querySelector('#rsGlowEstrella')) {
      var filtro = document.createElementNS(ns, 'filter');
      filtro.setAttribute('id', 'rsGlowEstrella');
      filtro.setAttribute('x', '-120%');
      filtro.setAttribute('y', '-120%');
      filtro.setAttribute('width', '340%');
      filtro.setAttribute('height', '340%');
      var blur = document.createElementNS(ns, 'feGaussianBlur');
      blur.setAttribute('stdDeviation', '0.9');
      filtro.appendChild(blur);
      defs.appendChild(filtro);
    }

    var grupo = document.createElementNS(ns, 'g');
    grupo.setAttribute('id', 'rsEstrellasCuanticas');
    // Va justo encima del fondo del cielo, debajo de anillos y astros.
    var cieloEl = svgRaiz.querySelector('.rs-planetario-cielo');
    if (cieloEl && cieloEl.nextSibling) {
      svgRaiz.insertBefore(grupo, cieloEl.nextSibling);
    } else {
      svgRaiz.appendChild(grupo);
    }

    ESTRELLAS.forEach(function (cfg) {
      var halo = document.createElementNS(ns, 'circle');
      halo.setAttribute('cx', String(cfg.x));
      halo.setAttribute('cy', String(cfg.y));
      halo.setAttribute('r', (cfg.r * 2.6).toFixed(2));
      halo.setAttribute('fill', cfg.tono);
      halo.setAttribute('filter', 'url(#rsGlowEstrella)');
      halo.setAttribute('opacity', '0');
      grupo.appendChild(halo);

      var nucleo = document.createElementNS(ns, 'circle');
      nucleo.setAttribute('cx', String(cfg.x));
      nucleo.setAttribute('cy', String(cfg.y));
      nucleo.setAttribute('r', String(cfg.r));
      nucleo.setAttribute('fill', cfg.tono);
      nucleo.setAttribute('opacity', '0');
      grupo.appendChild(nucleo);

      estrellasEls.push({ nucleo: nucleo, halo: halo, cfg: cfg });
    });
  }

  // Brillo de las estrellas según el cielo: protagonistas de noche, tímidas
  // al atardecer, invisibles de día (el sol las apaga, como en la realidad).
  function brilloBaseEstrellas() {
    var widget = $('rsPlanetario');
    var cielo = widget ? widget.getAttribute('data-cielo') : 'dia';
    if (cielo === 'noche') return 1;
    if (cielo === 'tarde') return 0.35;
    return 0;
  }

  function animarEstrellas() {
    var base = brilloBaseEstrellas();
    var t = tSatelites / 60; // segundos de animación
    for (var i = 0; i < estrellasEls.length; i++) {
      var est = estrellasEls[i];
      var titilacion = reducirMovimiento
        ? 0.75
        : 0.55 + 0.45 * Math.sin(t * est.cfg.vel + est.cfg.fase);
      var opNucleo = base * (0.55 + 0.45 * titilacion);
      var opHalo   = base * 0.35 * titilacion;
      est.nucleo.setAttribute('opacity', opNucleo.toFixed(3));
      est.halo.setAttribute('opacity', opHalo.toFixed(3));
    }
  }

  function crearCapaEspacio() {
    var widget = $('rsPlanetario');
    svgRaiz = widget ? widget.querySelector('svg') : null;
    if (!svgRaiz) return;
    var ns = 'http://www.w3.org/2000/svg';

    // Si quedara en el HTML alguna estrella fija antigua (los "puntitos
    // blancos"), se retira: ahora las estrellas son luces cuánticas vivas.
    var viejas = svgRaiz.querySelector('.rs-estrellas');
    if (viejas) viejas.remove();

    crearEstrellasCuanticas();

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
    if (document.hidden) {
      // Pestaña oculta: no gastar batería; al volver, rAF se reanuda solo.
      requestAnimationFrame(animarEspacio);
      return;
    }
    tSatelites++;
    satelitesEls.forEach(function (sat) {
      var ang = (sat.cfg.faseInicial + tSatelites * sat.cfg.velocidadGrad / 60) * Math.PI / 180;
      sat.el.setAttribute('cx', (CX + sat.cfg.radio * Math.cos(ang)).toFixed(1));
      sat.el.setAttribute('cy', (CY + sat.cfg.radio * Math.sin(ang)).toFixed(1));
    });
    animarEstrellas();
    requestAnimationFrame(animarEspacio);
  }

  function puntoBorde() {
    var ang = Math.random() * Math.PI * 2;
    return { x: CX + 76 * Math.cos(ang), y: CY + 76 * Math.sin(ang) };
  }

  function programarProximoFenomeno() {
    var espera = 12000 + Math.random() * 18000;
    setTimeout(function () {
      if (document.hidden) { programarProximoFenomeno(); return; }
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

  // El cometa: trazo dorado más grueso y lento, como una cabellera que
  // cruza la cúpula en un par de segundos.
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

  // Llamado por shadows-route.js cada vez que el usuario toca las horas.
  window.planetarioNotificarHora = function (fecha, lat, lon) {
    if (fecha instanceof Date && !isNaN(fecha)) fechaMostrada = new Date(fecha);
    if (isFinite(lat) && isFinite(lon)) coords = { lat: lat, lon: lon };
    ultimaInteraccion = Date.now();
    pintar();
  };

  function tick() {
    if (document.hidden) return; // pestaña oculta: no repintar (ahorro batería)
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