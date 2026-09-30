/* ============================================================
   MANOLIT AIRE · js/co2.js (27-sep-2026)
   Licencia: AGPL-3.0, igual que el resto del proyecto.
   ------------------------------------------------------------
   CO2 evitado por elegir la ruta fresca a pie.

   Cuando shadows-route.js enseña una ruta con su distancia, este
   módulo pregunta (tipo encuesta, un toque) con qué medio se
   habría hecho ese trayecto y muestra el CO2 que se ha evitado
   emitir yendo andando.

   PRIVACIDAD (mismo criterio que el resto del sitio):
   la respuesta es puntual, se usa para el cálculo en el momento
   y se olvida. NADA se guarda: sin localStorage, sin cookies,
   sin fetch, sin identificadores de sesión, IP ni historial.
   Al calcular una ruta nueva la encuesta se reinicia sola.

   FACTORES DE EMISIÓN (g de CO2e por km), fuentes públicas:
   - A pie y bicicleta: 0 (no hay combustión).
   - Coche medio: 170. BEIS/DEFRA, "average car",
     0.17067 kg CO2e/km (GHG Conversion Factors).
   - Moto media: 114. BEIS/DEFRA 2024, "motorbike (average)",
     0.11367 kg CO2e/km.
   - Autobús urbano: 97 por pasajero. BEIS/DEFRA,
     "average local bus", 0.0965 kg CO2e por pasajero-km.

   Textos en los 6 idiomas del sitio desde el 28-sep (js/i18n.js),
   con el mismo enganche que shadows-route.js (window.getMessages)
   y retraduccion en caliente al cambiar de idioma (langChanged).
   ============================================================ */
window.ManolitCO2 = (function () {
  'use strict';

  /* Traduccion: enganche directo al diccionario de js/i18n.js,
     igual que hace shadows-route.js, con el español de respaldo. */
  function t(clave, fallback) {
    try {
      var fn = window.getMessages;
      if (typeof fn === 'function') {
        var msg = fn();
        if (msg && msg[clave] != null) return msg[clave];
      }
    } catch (e) { /* seguimos con el respaldo */ }
    return fallback;
  }

  var FACTORES_G_KM = {
    pie: 0,
    bici: 0,
    coche: 170,
    moto: 114,
    autobus: 97
  };

  var OPCIONES = [
    { id: 'pie', clave: 'co2OpPie', texto: 'A pie (sin Manolito)' },
    { id: 'bici', clave: 'co2OpBici', texto: 'Bicicleta' },
    { id: 'coche', clave: 'co2OpCoche', texto: 'Coche' },
    { id: 'moto', clave: 'co2OpMoto', texto: 'Moto' },
    { id: 'autobus', clave: 'co2OpAutobus', texto: 'Autobús' }
  ];

  var MEDIO_CLAVE = {
    coche: 'co2MedioCoche',
    moto: 'co2MedioMoto',
    autobus: 'co2MedioAutobus'
  };

  var MEDIO_DEFECTO = {
    coche: 'en coche',
    moto: 'en moto',
    autobus: 'en autobús'
  };

  var distanciaMetrosActual = 0;
  var caja = null;
  var medioSeleccionado = null;

  function calcularGramos(distanciaMetros, medio) {
    var factor = FACTORES_G_KM[medio];
    if (typeof factor !== 'number' || !isFinite(distanciaMetros) || distanciaMetros <= 0) return 0;
    return Math.round((distanciaMetros / 1000) * factor);
  }

  function formatear(gramos) {
    if (gramos >= 1000) return (gramos / 1000).toFixed(1).replace('.', ',') + ' kg';
    return gramos + ' g';
  }

  function inyectarEstilos() {
    if (document.getElementById('co2-estilos')) return;
    var css = ''
      + '.co2-caja{margin:0 0 14px;padding:10px 12px;border:1px solid rgba(230,161,0,.25);'
      + 'border-radius:12px;background:rgba(15,23,42,.92);color:#e2e8f0;'
      + 'font-family:\'Segoe UI\',system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.45}'
      + '.co2-pregunta{margin:0 0 8px;color:#fff;font-weight:600}'
      + '.co2-opciones{display:flex;flex-wrap:wrap;gap:6px}'
      + '.co2-opcion{border:1px solid rgba(148,163,184,.3);background:#0b1526;color:#cbd5e1;'
      + 'border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:600;cursor:pointer}'
      + '.co2-opcion:hover{border-color:#E6A100;color:#E6A100}'
      + '.co2-opcion.activa{background:#E6A100;border-color:#E6A100;color:#1a1005}'
      + '.co2-resultado{margin:8px 0 0;color:#7ee2a8;font-weight:600}'
      + '.co2-nota{margin:6px 0 0;font-size:11px;color:#94a3b8}';
    var style = document.createElement('style');
    style.id = 'co2-estilos';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function textoResultado(medio) {
    var gramos = calcularGramos(distanciaMetrosActual, medio);
    if (medio === 'pie') {
      return t('co2ResPie', 'Andando habrías emitido lo mismo, 0 g de CO2. La diferencia es que con Manolito vas por la fresca.');
    }
    if (medio === 'bici') {
      return t('co2ResBici', 'En bici habrías emitido lo mismo, 0 g de CO2. La diferencia es la fresca del camino.');
    }
    var plantilla = t('co2ResTpl', 'Con esta ruta a pie has evitado emitir aproximadamente {c} de CO2 frente a ir {m}.');
    return plantilla
      .split('{c}').join(formatear(gramos))
      .split('{m}').join(t(MEDIO_CLAVE[medio], MEDIO_DEFECTO[medio]));
  }

  function pintar() {
    if (!caja) return;
    caja.innerHTML = '';

    var pregunta = document.createElement('p');
    pregunta.className = 'co2-pregunta';
    pregunta.textContent = t('co2Pregunta', 'Si no hubieras usado esta ruta fresca a pie, ¿cómo habrías hecho el trayecto?');
    caja.appendChild(pregunta);

    var grupo = document.createElement('div');
    grupo.className = 'co2-opciones';
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-label', 'Medio de transporte que habrías usado');

    var resultado = document.createElement('p');
    resultado.className = 'co2-resultado';
    resultado.setAttribute('role', 'status');
    resultado.hidden = true;

    OPCIONES.forEach(function (op) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'co2-opcion';
      boton.textContent = t(op.clave, op.texto);
      boton.setAttribute('aria-pressed', String(medioSeleccionado === op.id));
      if (medioSeleccionado === op.id) boton.classList.add('activa');
      boton.addEventListener('click', function () {
        medioSeleccionado = op.id;
        grupo.querySelectorAll('.co2-opcion').forEach(function (b) {
          b.classList.remove('activa');
          b.setAttribute('aria-pressed', 'false');
        });
        boton.classList.add('activa');
        boton.setAttribute('aria-pressed', 'true');
        resultado.textContent = textoResultado(op.id);
        resultado.hidden = false;
      });
      grupo.appendChild(boton);
    });

    if (medioSeleccionado) {
      resultado.textContent = textoResultado(medioSeleccionado);
      resultado.hidden = false;
    }

    caja.appendChild(grupo);
    caja.appendChild(resultado);

    var nota = document.createElement('p');
    nota.className = 'co2-nota';
    nota.textContent = t('co2Nota', 'Esta pregunta es solo para ti. Tu respuesta no se guarda ni sale de tu navegador.');
    caja.appendChild(nota);
  }

  /* distanciaKm llega como texto ("1.23") desde el resumen de la ruta */
  function mostrar(distanciaKm) {
    var km = parseFloat(distanciaKm);
    if (!isFinite(km) || km <= 0) { ocultar(); return; }
    distanciaMetrosActual = km * 1000;
    medioSeleccionado = null; // ruta nueva, encuesta nueva: nada queda guardado
    inyectarEstilos();
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'co2Box';
      caja.className = 'co2-caja';
      var status = document.getElementById('rsStatus');
      if (status && status.parentNode) {
        status.insertAdjacentElement('afterend', caja);
      } else {
        return;
      }
    }
    pintar();
  }

  function ocultar() {
    if (caja) {
      caja.remove();
      caja = null;
    }
    distanciaMetrosActual = 0;
    medioSeleccionado = null;
  }

  /* Al cambiar de idioma la encuesta se retraduce en caliente,
     conservando la opcion pulsada (solo vive en esta pantalla). */
  document.addEventListener('langChanged', function () {
    if (caja) pintar();
  });

  return {
    mostrar: mostrar,
    ocultar: ocultar,
    calcularGramos: calcularGramos
  };
})();
