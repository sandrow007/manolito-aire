/* ==========================================================================
   CONFORT EN RUTA — js/confort-ruta.js (módulo aditivo e independiente)
   --------------------------------------------------------------------------
   Integra el UTCI estimado (js/utci-confort.js) con el routing existente
   de js/shadows-route.js, SIN reescribir su lógica:

   1) window.__manolitUtciPreparar(lat, lon, fecha): se llama justo antes de
      cada Dijkstra. Trae la meteo cacheada (/prevision, worker propio) y
      deja listo el confort del momento: Tmrt estimada sol/sombra y UTCI.
      Con timeout propio: si tarda o falla, el Dijkstra sigue con el coste
      clásico (fracción de sombra), como siempre.
   2) window.__manolitUtciPesoArista(longitudM, enSombra): coste de arista
      = TIEMPO x nivel de estrés UTCI. Sin confort listo devuelve false y
      shadows-route usa su coste de siempre (longitud x penalización).
   3) window.__manolitUtciEstadisticasRuta(fresca, rapida, indiceSombras):
      UTCI medio y minutos al sol de las dos rutas (la fresca del Dijkstra
      térmico y la rápida del Dijkstra puro), para la comparativa.
   4) Panel bajo el estado de la ruta: comparativa fresca/rápida, índice de
      confianza de los datos (edificios con altura real, árboles con
      especie, cubiertas ligeras mapeadas, frescura meteo) y avisos de
      confort para colectivos sensibles. Todo con etiqueta "UTCI estimado",
      tono informativo y sin consejo médico.

   Todo el cálculo ocurre en el navegador; no se envía ubicación ni rutas a
   ningún servidor (la meteo llega por /prevision, proxy del propio worker
   con caché edge, solo con lat/lon redondeados a 3 decimales, como el
   resto de capas). Sin emojis. Si este archivo falta, nada cambia.
   ========================================================================== */
(function () {
  'use strict';
  if (window.ManolitConfortRuta) return;

  // Velocidad peatonal del routing (CONFIG.velocidadCaminandoKmh de
  // shadows-route.js). Solo afecta a la MAGNITUD del coste, no al camino
  // elegido ni a los tiempos mostrados (esos salen de la distancia real).
  var VEL_MS = 4.8 / 3.6;
  var CADUCIDAD_CONFORT_MS = 15 * 60 * 1000; // el confort preparado caduca
  var TIMEOUT_PREPARAR_MS = 5000;            // el Dijkstra nunca espera más
  var CACHE_TOLDOS_MS = 12 * 3600 * 1000;    // toldos: igual que el proxy

  var snapshot = { listo: false, ts: 0 };
  var toldos = { estado: 'pendiente', total: 0, ts: 0, clave: '' };
  var ultimaRuta = null;
  var dom = { panel: null, fresca: null, rapida: null, confianza: null, aviso: null };
  var observadorEstado = null;
  var temporizadorOcultar = null;

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

  function utciListo() {
    return !!(snapshot.listo && Date.now() - snapshot.ts < CADUCIDAD_CONFORT_MS);
  }

  function haversineM(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ---------------- 1) preparación del confort (antes del Dijkstra) ---------------- */

  function preparar(lat, lon, fecha) {
    if (!window.ManolitUTCI) return Promise.resolve(false);
    var horaMs = (fecha instanceof Date) ? fecha.getTime() : new Date(fecha).getTime();
    if (!isFinite(horaMs)) horaMs = Date.now();
    var trabajo = window.ManolitUTCI.obtenerMeteo(lat, lon).then(function (datos) {
      if (!datos) { snapshot.listo = false; return false; }
      var m = window.ManolitUTCI.meteoParaHora(datos, horaMs);
      if (!m || !isFinite(m.t)) { snapshot.listo = false; return false; }
      var alt = 0;
      try {
        if (window.SunCalc && typeof SunCalc.getPosition === 'function') {
          var pos = SunCalc.getPosition(new Date(horaMs), lat, lon);
          if (pos && isFinite(pos.altitude)) alt = pos.altitude;
        }
      } catch (e) { /* altitud 0: sol bajo el horizonte */ }
      var nubes01 = isFinite(m.n) ? Math.max(0, Math.min(1, m.n / 100)) : 0;
      // Para el momento actual, la nubosidad unificada de la app (OWM vía
      // /clima), la misma que usan sombras y microclima: un solo cielo.
      try {
        if (Math.abs(horaMs - Date.now()) < 30 * 60 * 1000 && typeof window.manolitAireNubosidad === 'function') {
          var nu = Number(window.manolitAireNubosidad());
          if (isFinite(nu)) nubes01 = Math.max(0, Math.min(1, nu));
        }
      } catch (e) { /* con la nubosidad horaria basta */ }
      var vPed = window.ManolitUTCI.ajustarVientoPeaton(m.v);
      var tmrtSol = window.ManolitUTCI.tmrtEstimada(m.t, false, alt, nubes01, m.g);
      var tmrtSombra = window.ManolitUTCI.tmrtEstimada(m.t, true, alt, nubes01, m.g);
      var rh = isFinite(m.h) ? m.h : 50;
      var utciSol = window.ManolitUTCI.calcularUTCI(m.t, tmrtSol, vPed, rh);
      var utciSombra = window.ManolitUTCI.calcularUTCI(m.t, tmrtSombra, vPed, rh);
      if (utciSol == null || utciSombra == null) { snapshot.listo = false; return false; }
      snapshot = {
        listo: true, ts: Date.now(), lat: lat, lon: lon, horaMs: horaMs,
        ta: m.t, rh: rh, v10: m.v, vPed: vPed, nubes01: nubes01, ghi: m.g,
        uv: m.uv, altitudSol: alt, tmrtSol: tmrtSol, tmrtSombra: tmrtSombra,
        utciSol: utciSol, utciSombra: utciSombra, meteoTs: m.ts || 0
      };
      return true;
    }).catch(function () { snapshot.listo = false; return false; });
    // Timeout duro: el routing no se queda nunca esperando a la meteo.
    var temporizador = new Promise(function (resolve) {
      setTimeout(function () { resolve(false); }, TIMEOUT_PREPARAR_MS);
    });
    return Promise.race([trabajo, temporizador]);
  }

  /* ---------------- 2) coste de arista para el Dijkstra ---------------- */

  function pesoArista(longitudM, enSombra) {
    if (!utciListo()) return false;
    if (!isFinite(longitudM) || longitudM <= 0) return false;
    var utci = enSombra ? snapshot.utciSombra : snapshot.utciSol;
    var estres = window.ManolitUTCI ? window.ManolitUTCI.estresUTCI(utci) : 0;
    return (longitudM / VEL_MS) * (1 + estres);
  }

  /* ---------------- 3) estadísticas de una geometría ---------------- */

  function statsCamino(camino, indiceSombras) {
    if (!camino || camino.length < 2) return null;
    var consultar = (indiceSombras && typeof indiceSombras.consultar === 'function')
      ? indiceSombras.consultar : null;
    var minSol = 0, minTot = 0, sumaUtciT = 0;
    for (var i = 0; i < camino.length - 1; i++) {
      var a = camino[i], b = camino[i + 1];
      if (!a || !b) continue;
      var lenM = haversineM(a[1], a[0], b[1], b[0]);
      if (!isFinite(lenM) || lenM <= 0) continue;
      var tMin = lenM / VEL_MS / 60;
      var sombra = false;
      try { sombra = consultar ? !!consultar((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5) : false; } catch (e) { }
      minTot += tMin;
      sumaUtciT += (sombra ? snapshot.utciSombra : snapshot.utciSol) * tMin;
      if (!sombra) minSol += tMin;
    }
    if (minTot <= 0) return null;
    return { minTotal: minTot, minSol: minSol, utciMedio: sumaUtciT / minTot };
  }

  function caminosIguales(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (Math.abs(a[i][0] - b[i][0]) > 1e-7 || Math.abs(a[i][1] - b[i][1]) > 1e-7) return false;
    }
    return true;
  }

  function estadisticasRuta(caminoFresca, caminoRapida, indiceSombras) {
    if (!utciListo()) return null;
    var statsF = statsCamino(caminoFresca, indiceSombras);
    if (!statsF) return null;
    var statsR = statsCamino(caminoRapida, indiceSombras);
    var coinciden = caminosIguales(caminoFresca, caminoRapida);
    return {
      disponible: true,
      utciSol: snapshot.utciSol,
      utciSombra: snapshot.utciSombra,
      ta: snapshot.ta,
      nivel: window.ManolitUTCI.nivelUTCI(snapshot.utciSol),
      fresca: statsF,
      rapida: statsR,
      deltaMin: statsR ? Math.max(0, statsF.minTotal - statsR.minTotal) : 0,
      coinciden: coinciden
    };
  }

  /* ---------------- 4) confianza de los datos ---------------- */

  function calcularConfianza() {
    var componentes = [];
    // Edificios con altura real (contador que rellena shadows-route.js en
    // actualizarCacheEdificios, altura OSM/plantas vs. el fallback fijo).
    try {
      var ed = window.__manolitConfianzaEdificios;
      if (ed && ed.total > 0) {
        var pct = Math.round((ed.conAlturaReal / ed.total) * 100);
        componentes.push({ peso: 0.45, valor: pct / 100, texto: pct + '% ' + t('confortEdAltura', 'edificios con altura medida') });
      }
    } catch (e) { }
    // Árboles con especie conocida (clasificación propia de shadows-route).
    try {
      if (typeof window.manolitAireArbolesTodos === 'function') {
        var arr = window.manolitAireArbolesTodos() || [];
        if (arr.length > 0) {
          var conEspecie = 0;
          for (var i = 0; i < arr.length; i++) {
            if (arr[i] && arr[i].tipo && arr[i].tipo !== 'generico') conEspecie++;
          }
          var pctA = Math.round((conEspecie / arr.length) * 100);
          componentes.push({ peso: 0.2, valor: pctA / 100, texto: pctA + '% ' + t('confortArbolEspecie', 'arbolado con especie conocida') });
        }
      }
    } catch (e) { }
    // Cubiertas ligeras mapeadas en la zona (toldos, soportales, marquesinas).
    if (toldos.estado === 'ok') {
      componentes.push({
        peso: 0.15, valor: 1,
        texto: toldos.total > 0
          ? toldos.total + ' ' + t('confortToldos', 'cubiertas ligeras mapeadas')
          : t('confortToldosNo', 'sin cubiertas ligeras mapeadas en la zona')
      });
    }
    // Frescura de la meteo que alimenta el UTCI.
    if (utciListo()) {
      var minutos = snapshot.meteoTs ? Math.max(0, Math.round((Date.now() - snapshot.meteoTs) / 60000)) : null;
      var valorM = minutos == null ? 0.7 : (minutos <= 15 ? 1 : (minutos <= 60 ? 0.7 : 0.4));
      var textoM = minutos == null
        ? t('confortMeteoFresca', 'meteo actualizada')
        : t('confortMeteo', 'meteo actualizada (hace {m} min)').replace('{m}', String(minutos));
      componentes.push({ peso: 0.2, valor: valorM, texto: textoM });
    }
    if (!componentes.length) return null;
    var sumaP = 0, sumaV = 0;
    for (var j = 0; j < componentes.length; j++) {
      sumaP += componentes[j].peso;
      sumaV += componentes[j].peso * componentes[j].valor;
    }
    var nota = sumaP > 0 ? sumaV / sumaP : 0;
    var banda = nota >= 0.7 ? 'alta' : (nota >= 0.45 ? 'media' : 'baja');
    var textos = [];
    for (var k = 0; k < componentes.length; k++) textos.push(componentes[k].texto);
    return { banda: banda, nota: nota, textos: textos };
  }

  /* ---------------- 5) toldos: consulta Overpass por el proxy /arboles ----------------
     Solo CUENTA cubiertas ligeras (building=roof, tunnel=building_passage,
     amenity=shelter) en un entorno de ~700 m alrededor del centro de la
     ruta. Alimenta el índice de confianza; el sombreado de toldos llega en
     una fase posterior. Fallo silencioso: se excluye del índice. */

  function contarToldos(lat, lon) {
    var clave = lat.toFixed(2) + ',' + lon.toFixed(2);
    if (toldos.clave === clave && Date.now() - toldos.ts < CACHE_TOLDOS_MS) {
      if (toldos.estado !== 'pendiente') return;
    }
    var dLat = 0.0063;
    var dLon = 0.0063 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
    var bbox = (lat - dLat).toFixed(4) + ',' + (lon - dLon).toFixed(4) + ',' +
      (lat + dLat).toFixed(4) + ',' + (lon + dLon).toFixed(4);
    var consulta = '[out:json][timeout:8];(' +
      'nwr["building"="roof"](' + bbox + ');' +
      'nwr["tunnel"="building_passage"](' + bbox + ');' +
      'nwr["amenity"="shelter"](' + bbox + ');' +
      ');out count;';
    toldos.clave = clave;
    toldos.ts = Date.now();
    fetch('/arboles', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'data=' + encodeURIComponent(consulta)
    })
      .then(function (r) { if (!r.ok) throw new Error('toldos ' + r.status); return r.json(); })
      .then(function (d) {
        var total = NaN;
        try {
          var el = d && d.elements && d.elements[0];
          if (el && el.tags) total = Number(el.tags.total);
        } catch (e) { }
        if (isFinite(total)) {
          toldos = { estado: 'ok', total: total, ts: Date.now(), clave: clave };
        } else {
          toldos = { estado: 'sinDato', total: 0, ts: Date.now(), clave: clave };
        }
        // Si el panel sigue visible, refresca la línea de confianza.
        if (ultimaRuta && dom.panel && !dom.panel.hidden) pintar(ultimaRuta);
      })
      .catch(function () {
        toldos = { estado: 'sinDato', total: 0, ts: Date.now(), clave: clave };
      });
  }

  /* ---------------- 6) panel (comparativa + confianza + aviso) ---------------- */

  function asegurarDom() {
    if (dom.panel) return true;
    var contenedor = document.getElementById('rsRouteInfo');
    if (!contenedor) return false;
    var panel = document.createElement('div');
    panel.id = 'rsConfortRuta';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="rs-confort-lineas">' +
      '<p class="rs-confort-linea rs-confort-fresca"></p>' +
      '<p class="rs-confort-linea rs-confort-rapida"></p>' +
      '</div>' +
      '<p class="rs-confort-confianza"><span class="rs-conf-punto" aria-hidden="true"></span><span class="rs-conf-texto"></span></p>' +
      '<p class="rs-confort-aviso"></p>';
    contenedor.appendChild(panel);
    dom.panel = panel;
    dom.fresca = panel.querySelector('.rs-confort-fresca');
    dom.rapida = panel.querySelector('.rs-confort-rapida');
    dom.confianza = panel.querySelector('.rs-confort-confianza');
    dom.aviso = panel.querySelector('.rs-confort-aviso');
    return true;
  }

  function redondearMin(min) {
    return String(Math.max(0, Math.round(min)));
  }

  function reanclar() {
    var contenedor = document.getElementById('rsRouteInfo');
    if (contenedor && dom.panel.parentElement !== contenedor) {
      contenedor.appendChild(dom.panel);
    }
  }

  function pintar(ruta) {
    if (!asegurarDom()) return;
    var c = ruta && ruta.confort;
    if (!c || !c.disponible) { ocultar(); return; }
    ultimaRuta = ruta;
    reanclar();

    var min = t('minWalk', 'min a pie');
    var utciMed = t('confortUtciMedio', 'UTCI estimado medio');
    var minSol = t('confortMinSol', 'min al sol');

    dom.fresca.textContent = t('confortFresca', 'Ruta fresca') + ': ' +
      redondearMin(c.fresca.minTotal) + ' ' + min + ' · ' +
      utciMed + ' ' + Math.round(c.fresca.utciMedio) + ' °C · ' +
      redondearMin(c.fresca.minSol) + ' ' + minSol + '.';

    if (c.coinciden || !c.rapida) {
      dom.rapida.textContent = t('confortCoinciden', 'La ruta fresca coincide con la más rápida.');
    } else {
      var delta = Math.max(0, Math.round(c.deltaMin));
      var cola = delta > 0
        ? ' · ' + t('confortDelta', 'la fresca tarda {d} min más').replace('{d}', String(delta))
        : '';
      dom.rapida.textContent = t('confortRapida', 'Ruta rápida') + ': ' +
        redondearMin(c.rapida.minTotal) + ' ' + min + ' · ' +
        utciMed + ' ' + Math.round(c.rapida.utciMedio) + ' °C · ' +
        redondearMin(c.rapida.minSol) + ' ' + minSol + cola + '.';
    }

    var conf = calcularConfianza();
    if (conf) {
      var bandaTxt = t('confianza' + conf.banda.charAt(0).toUpperCase() + conf.banda.slice(1), conf.banda);
      dom.confianza.querySelector('.rs-conf-texto').textContent =
        t('confortConfianza', 'Confianza de los datos') + ': ' + bandaTxt + ' — ' + conf.textos.join(' · ') + '.';
      dom.confianza.classList.remove('rs-conf-alta', 'rs-conf-media', 'rs-conf-baja');
      dom.confianza.classList.add('rs-conf-' + conf.banda);
      dom.confianza.style.display = '';
    } else {
      dom.confianza.style.display = 'none';
    }

    if (c.nivel === 'muyFuerte' || c.nivel === 'extremo') {
      dom.aviso.textContent = t('confortAvisoMuyFuerte',
        'Aviso de confort: estrés térmico muy fuerte al sol (UTCI estimado {u} °C). Las personas mayores, los niños y quienes toman medicación fotosensibilizante lo notan antes: valora salir en otra franja, sigue la ruta fresca y haz pausas en sombra.')
        .replace('{u}', String(Math.round(c.utciSol)));
      dom.aviso.className = 'rs-confort-aviso rs-aviso-muy-fuerte';
      dom.aviso.style.display = '';
    } else if (c.nivel === 'fuerte') {
      dom.aviso.textContent = t('confortAvisoFuerte',
        'Aviso de confort: estrés térmico fuerte al sol (UTCI estimado {u} °C). Si acompañas a personas mayores, niños o personas sensibles al calor, la ruta fresca y las pausas en sombra ayudan.')
        .replace('{u}', String(Math.round(c.utciSol)));
      dom.aviso.className = 'rs-confort-aviso rs-aviso-fuerte';
      dom.aviso.style.display = '';
    } else {
      dom.aviso.style.display = 'none';
    }

    dom.panel.hidden = false;
  }

  function mostrar(ruta) {
    try {
      if (!ruta || !ruta.confort || !ruta.confort.disponible) { ocultar(); return; }
      pintar(ruta);
    } catch (e) { /* el panel nunca rompe la ruta */ }
  }

  function ocultar() {
    if (dom.panel) dom.panel.hidden = true;
  }

  /* ---------------- 7) vida del panel ----------------
     shadows-route marca el estado de la ruta con la clase rs-status-ruta
     y la quita con cualquier otro mensaje (reset, errores, recálculos).
     El panel sigue esa misma vida sin tocar una línea del motor: si la
     clase desaparece, se oculta (con una pequeña demora para no parpadear
     en los recálculos, donde la clase vuelve enseguida). */

  function vigilarEstado() {
    var estado = document.getElementById('rsStatus');
    if (!estado || observadorEstado || !window.MutationObserver) return;
    observadorEstado = new MutationObserver(function () {
      var conRuta = estado.classList.contains('rs-status-ruta');
      if (temporizadorOcultar) { clearTimeout(temporizadorOcultar); temporizadorOcultar = null; }
      if (!conRuta) {
        temporizadorOcultar = setTimeout(function () {
          if (!estado.classList.contains('rs-status-ruta')) { ultimaRuta = null; ocultar(); }
        }, 700);
      }
    });
    try { observadorEstado.observe(estado, { attributes: true, attributeFilter: ['class'] }); } catch (e) { }
  }

  /* ---------------- hooks públicos + arranque ---------------- */

  window.__manolitUtciPreparar = function (lat, lon, fecha) {
    var p = preparar(lat, lon, fecha);
    // La confianza de toldos se dispara en paralelo (no bloquea la ruta).
    try { contarToldos(lat, lon); } catch (e) { }
    return p;
  };
  window.__manolitUtciPesoArista = pesoArista;
  window.__manolitUtciListo = utciListo;
  window.__manolitUtciEstadisticasRuta = estadisticasRuta;

  window.ManolitConfortRuta = { mostrar: mostrar, ocultar: ocultar };

  function arrancar() {
    asegurarDom();
    vigilarEstado();
    try {
      document.addEventListener('langChanged', function () {
        if (ultimaRuta && dom.panel && !dom.panel.hidden) pintar(ultimaRuta);
      });
    } catch (e) { }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
