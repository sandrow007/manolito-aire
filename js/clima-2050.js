/* ==========================================================================
   CLIMA 2050 — js/clima-2050.js (módulo aditivo e independiente)
   --------------------------------------------------------------------------
   Mapa de coropletas (choropleth) del riesgo térmico proyectado a 2050.

   Geometría REAL en UN SOLO archivo maestro:
   data/andalucia_clima_2050_ligero.geojson (una única petición HTTP), con
   576 polígonos de 5 municipios:
   - Sevilla: 521 secciones censales (INE/IGN, vía ctafur/sevillaGeojson,
     GPL-3.0).
   - Mairena del Aljarafe: 9 áreas estadísticas del PMVS 2024-2029 (32
     secciones INE 41059 agrupadas según el Plan de Movilidad).
   - Bollullos de la Mitación: 6 secciones censales INE (41016), sin
     división oficial de barrios (urbanizaciones vía OSM/Nominatim).
   - Écija: 30 secciones censales INE (41039, WFS Secciones_2025); el
     "Distrito 0X" del área es el distrito CENSAL del INE (la división
     administrativa DC/D1/D2/D3 no publica límites digitales) y el barrio
     se asigna por anclas OSM/Nominatim documentadas (ver
     preprocesar_ecija_2050.py).
   - Tiflis: 10 distritos administrativos (admin_level 9, vía OSM/Overpass;
     añadidos con anadir_tbilisi.py sobre el maestro completo).
   Cada feature lleva EXACTAMENTE tres propiedades:
   municipio (string), area (string) y risk_level (int 0-3). El riesgo es
   EMULADO (inspirado en Sola-Caraballo et al.; NO son datos reales): el
   nivel de texto y los días >40 °C se derivan aquí, en el cliente, de
   risk_level con la fórmula documentada
   (dias40 = 30 + risk*5 + hash(area)%7), para no duplicar datos.

   VULNERABILIDAD OPCIONAL (nov-2026): si algún día el master trae además
   renta_media_ud (€ por unidad de consumo, Atlas de Distribución de Renta
   del INE), mayores65_pct (personas de 65 años o más por sección censal,
   INE) y pct_antes_1979 (viviendas con año de construcción anterior a
   1979, Catastro), el popup y el informe las enseñan como datos oficiales
   de la sección. Los genera scripts/preprocesar_ine_vulnerabilidad.py. Si
   no están, el popup queda EXACTAMENTE como antes: nunca se rellenan con
   ceros ni con estimaciones. No entran en risk_level ni en la ruta.

   Piezas (todas nacen APAGADAS y se encienden juntas con la casilla):
   1) Relleno (fill) coloreado por risk_level con opacidad baja (máx. 0,35):
      el callejero sigue siendo perfectamente legible. Idéntico para los
      cuatro municipios: la pintura solo mira risk_level.
   2) Borde (line) del mismo tono con opacidad 0,8 y 1,5 px.
   3) Popup al hacer clic (también con el dedo en móvil): título
      "Municipio - Area", nivel coloreado, días >40 °C con lectura
      ciudadana y consejo accionable. Los clics van delegados a la capa:
      si la capa no se ve, ni existen.

   Sin leyenda flotante: chocaba con el HUD de sombra y la escala de colores
   va en el propio popup. Sin velos ni filtros sobre el mapa base: dentro
   del mapa mandan sus propios modos y el tema claro/oscuro de fuera es
   independiente. Esta capa solo pinta encima sin tocar la base.

   Reglas (mismo patrón que js/lluvia.js):
   - Casilla "Clima 2050" (toggle-climate-layer), APAGADA por defecto.
     Apagada = capas con visibility 'none': el mapa queda exactamente como
     antes.
   - Solo añade fuente y capas (addSource/addLayer): NO toca la
     inicialización del mapa, ni el estilo base, ni capas ni controles de
     otros módulos.
   - Si el usuario cambia de mapa base (claro/IGN/oscuro) el estilo se
     sustituye entero: el evento styledata reinstala fuente y capas.
   - Fallo silencioso: si algo falla (estilo a medio cargar, GeoJSON
     ausente...), simplemente no se muestra nada. No rompe sombras, rutas,
     SQI, lluvia ni ningún módulo existente.

   window.manolitAireClima2050Activa() dice si la casilla está marcada.
   avoidHeat: window.__manolitClima2050CosteArista(puntoMedio) devuelve al
   Dijkstra térmico de shadows-route.js el sobrecoste de cruzar una zona de
   riesgo Alto (+50 %) o Crítico (+100 %); con la casilla apagada devuelve
   0 y la ruta es la de siempre.

   FUENTE OPCIONAL TARGET (nov-2026): js/clima-2050-source.js decide la
   fuente de datos (CLIMA_2050_SOURCE = auto | emulated | target; por
   defecto auto). Si existe data/clima2050/target/clima_2050_target.geojson
   y cumple el esquema mínimo, la capa pinta ESE archivo (risk_level real
   de la simulación) y los días >40 °C se leen de su propiedad dias40; si
   falta para una zona se muestra "no disponible", nunca se inventa. Si el
   archivo no existe, está corrupto o no valida, la capa sigue funcionando
   EXACTAMENTE como antes con la fórmula emulada. TARGET no se ejecuta en
   el navegador: el archivo se genera fuera (ver scripts/target/README.md).
   ========================================================================== */
(function () {
  'use strict';
  if (window.manolitAireClima2050) return;

  // Cópía literal del motivo #manolitSideArtwork de index.html (escudo, sol,
  // infinito y olas) con el mismo viewBox del logo: <defs> + <use> originales.
  // Va incrustado porque la pantalla de idioma, donde vive el SVG del HTML,
  // se retira al entrar en la app y ya no estaría disponible para el informe.
  var LOGO_HTML = '<svg class="logo" viewBox="0 140 650 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Manolit∞ Aire"><defs>' +
    '<filter id="manolitSideGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>' +
    '<filter id="manolitSideSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter>' +
    '<linearGradient id="manolitSideCyan" gradientUnits="userSpaceOnUse" x1="0" y1="290" x2="0" y2="30"><stop offset="0" stop-color="#00f3ff" stop-opacity="0.9" /><stop offset="1" stop-color="#00f3ff" stop-opacity="0" /></linearGradient>' +
    '<linearGradient id="manolitSideBlue" gradientUnits="userSpaceOnUse" x1="0" y1="290" x2="0" y2="30"><stop offset="0" stop-color="#3b82f6" stop-opacity="0.9" /><stop offset="1" stop-color="#3b82f6" stop-opacity="0" /></linearGradient>' +
    '<linearGradient id="manolitSideViolet" gradientUnits="userSpaceOnUse" x1="0" y1="290" x2="0" y2="30"><stop offset="0" stop-color="#a78bfa" stop-opacity="0.9" /><stop offset="1" stop-color="#a78bfa" stop-opacity="0" /></linearGradient>' +
    '<linearGradient id="manolitSidePink" gradientUnits="userSpaceOnUse" x1="0" y1="290" x2="0" y2="30"><stop offset="0" stop-color="#f472b6" stop-opacity="0.9" /><stop offset="1" stop-color="#f472b6" stop-opacity="0" /></linearGradient>' +
    '<g id="manolitSideShield"><path d="M100,30 C30,110 30,210 100,290 C170,210 170,110 100,30 Z" /></g>' +
    '<g id="manolitSideWire" fill="none"><circle cx="100" cy="150" r="45" /><path d="M60,165 Q80,155 100,165 T140,165" /><path d="M65,175 Q82.5,167 100,175 T135,175" /><path d="M100,146 C75,121 75,171 100,146 C125,121 125,171 100,146 Z" stroke-linejoin="round" stroke-linecap="round" /><path d="M100,30 C30,110 30,210 100,290 C170,210 170,110 100,30 Z" stroke-linejoin="round" /></g>' +
    '<symbol id="manolitSideArtwork" viewBox="0 0 600 600">' +
    '<ellipse cx="300" cy="420" rx="60" ry="15" fill="#00f3ff" opacity="0.1" filter="url(#manolitSideGlow)" />' +
    '<g transform="matrix(1 0 -0.9615 -0.1154 300 420) translate(-100,-290)" filter="url(#manolitSideSoft)" opacity="0.9"><use href="#manolitSideShield" fill="url(#manolitSidePink)" /><use href="#manolitSideWire" stroke="url(#manolitSidePink)" stroke-width="8" /></g>' +
    '<g transform="matrix(1 0 0.808 -0.1731 300 420) translate(-100,-290)" filter="url(#manolitSideSoft)" opacity="0.9"><use href="#manolitSideShield" fill="url(#manolitSideCyan)" /><use href="#manolitSideWire" stroke="url(#manolitSideCyan)" stroke-width="8" /></g>' +
    '<g transform="matrix(1 0 -0.5385 -0.2692 300 420) translate(-100,-290)" filter="url(#manolitSideSoft)" opacity="0.9"><use href="#manolitSideShield" fill="url(#manolitSideViolet)" /><use href="#manolitSideWire" stroke="url(#manolitSideViolet)" stroke-width="8" /></g>' +
    '<g transform="matrix(1 0 0 -0.2115 300 420) translate(-100,-290)" filter="url(#manolitSideSoft)" opacity="0.9"><use href="#manolitSideShield" fill="url(#manolitSideBlue)" /><use href="#manolitSideWire" stroke="url(#manolitSideBlue)" stroke-width="8" /></g>' +
    '<g fill="none" stroke-width="1.8" opacity="0.75"><use href="#manolitSideWire" stroke="#f472b6" transform="matrix(1 0 -0.9615 -0.1154 300 420) translate(-100,-290)" /><use href="#manolitSideWire" stroke="#00f3ff" transform="matrix(1 0 0.808 -0.1731 300 420) translate(-100,-290)" /><use href="#manolitSideWire" stroke="#a78bfa" transform="matrix(1 0 -0.5385 -0.2692 300 420) translate(-100,-290)" /><use href="#manolitSideWire" stroke="#3b82f6" transform="matrix(1 0 0 -0.2115 300 420) translate(-100,-290)" /></g>' +
    '<g transform="translate(200,130)" filter="url(#manolitSideGlow)"><path d="M100,30 C30,110 30,210 100,290 C170,210 170,110 100,30 Z" fill="rgba(255,42,75,0.05)" stroke="#ff2a4b" stroke-width="4" stroke-linejoin="round" /><circle cx="100" cy="150" r="45" fill="none" stroke="#ffcc00" stroke-width="3" /><path d="M100,146 C75,121 75,171 100,146 C125,121 125,171 100,146 Z" fill="none" stroke="#ff2a4b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" /><path d="M60,165 Q80,155 100,165 T140,165" fill="none" stroke="#00e5ff" stroke-width="4" stroke-linecap="round" /><path d="M65,175 Q82.5,167 100,175 T135,175" fill="none" stroke="#00e5ff" stroke-width="3" stroke-linecap="round" /></g>' +
    '</symbol></defs><use href="#manolitSideArtwork" width="600" height="600" /></svg>';

  var FUENTE_ID = 'clima-2050-riesgo';         // fuente GeoJSON maestra
  var CAPA_ID = 'capa-clima-2050';             // relleno coropleta
  var CAPA_BORDE_ID = 'capa-clima-2050-borde'; // contorno de los polígonos
  var CAPAS = [CAPA_ID, CAPA_BORDE_ID];
  var DATOS_URL = 'data/andalucia_clima_2050_ligero.geojson'; // master: Sevilla + Mairena + Bollullos + Écija + Tiflis
  // El master ligero lleva claves cortas (m, a, r, y opcionales rm, ed, a79)
  // y coordenadas a 5 decimales. Se lee con propiedad(), que acepta claves
  // cortas y largas: si mañana se regenera con el script del INE, basta
  // sustituir el archivo y dejar el preproceso añadir sus campos.

  /* ------- fuente de datos: emulada (por defecto) o TARGET precalculado -------
     El módulo js/clima-2050-source.js decide; si no está cargado o falla, la
     capa queda en emulada y el comportamiento es byte a byte el de siempre.
     fuenteDatos guarda el resultado normalizado:
       { source, url, geojson, meta, features, aviso }.
     En source 'target' geojson viene YA validado y se usa en línea (sin una
     segunda descarga); en 'emulated' todo va null y manda DATOS_URL. */
  var FUENTE_MOD = window.manolitClima2050Fuente || null;
  var fuenteDatos = null;
  var fuentePromesa = null;

  // Paleta por risk_level (0=Bajo … 3=Crítico). Relleno con opacidad baja
  // (máx. 0,35) para no tapar el callejero; borde del mismo tono al 0,8.
  // Misma pintura para TODOS los municipios: solo se lee el nivel de riesgo.
  //
  // (nov-2026) El get acepta la clave larga del GeoJSON completo Y la corta
  // 'r' del archivo ligero. Solo mirar 'risk_level' dejaba el relleno
  // transparente con el master ligero (los bordes seguían porque no leen
  // ningún dato): por eso aparecían los contornos y ningún color.
  var RELLENO_POR_NIVEL = [
    'match', ['coalesce', ['get', 'risk_level'], ['get', 'r']],
    0, 'rgba(102, 170, 85, 0.20)',   // Bajo: verde suave
    1, 'rgba(255, 209, 102, 0.25)',  // Medio: amarillo suave
    2, 'rgba(247, 148, 30, 0.30)',   // Alto: naranja
    3, 'rgba(215, 25, 28, 0.35)',    // Crítico: rojo
    'rgba(140, 140, 140, 0.15)'
  ];
  var BORDE_POR_NIVEL = [
    'match', ['coalesce', ['get', 'risk_level'], ['get', 'r']],
    0, 'rgba(102, 170, 85, 0.8)',
    1, 'rgba(212, 164, 34, 0.8)',
    2, 'rgba(230, 126, 20, 0.8)',
    3, 'rgba(215, 25, 28, 0.85)',
    'rgba(120, 120, 120, 0.6)'
  ];
  // Textos del popup según el nivel: color, lectura ciudadana del número de
  // días y un consejo accionable. El popup cabe igual en móvil y escritorio.
  var NIVELES = [
    { texto: 'Bajo', acento: '#4d8a3a', interpretacion: 'unas 5 semanas de verano', consejo: 'En ola de calor: sombra y botella a mano.' },
    { texto: 'Medio', acento: '#a8820f', interpretacion: 'casi 6 semanas de verano', consejo: 'A mediodía, cambia a la acera con sombra.' },
    { texto: 'Alto', acento: '#c96a06', interpretacion: 'más de un mes y medio de verano', consejo: 'Sombrea tu ruta y evita las 13–19 h.' },
    { texto: 'Crítico', acento: '#c2181b', interpretacion: 'casi la mitad del verano', consejo: 'Evita salir de 13 a 19 h: fuentes y sombra.' }
  ];

  var mapa = null;
  var popup = null;
  var ultimaZona = null; // datos del último polígono clicado: alimenta el informe PDF

  /* ---------------- utilidades ---------------- */

  // Lector tolerante del master: acepta las claves largas de siempre
  // (municipio, area, risk_level, renta_media_ud...) y las cortas del
  // archivo ligero (m, a, r, cu...). Así el mismo módulo sirve con el
  // GeoJSON completo o con la versión reducida, sin cambiar nada más.
  var CLAVES_CORTAS = { m: 'municipio', a: 'area', r: 'risk_level', cu: 'cusec', se: 'seccion' };
  function propiedad(f, nombre) {
    var p = (f && f.properties) || {};
    if (p[nombre] != null && p[nombre] !== '') return p[nombre];
    for (var corta in CLAVES_CORTAS) {
      if (CLAVES_CORTAS[corta] === nombre && p[corta] != null && p[corta] !== '') return p[corta];
    }
    return null;
  }

  function toggle() { return document.getElementById('toggle-climate-layer'); }
  function encendida() { var el = toggle(); return !!(el && el.checked); }

  // Hash determinista (misma fórmula que los generadores de datos): sirve
  // para derivar dias40 a partir del nombre del área, igual en los 3
  // municipios, sin que el número viaje duplicado en el GeoJSON maestro.
  function hashTexto(t) {
    var h = 0;
    for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return h;
  }

  /* ---------------- fuente de datos (emulada / TARGET) ---------------- */

  function esTarget() { return !!(fuenteDatos && fuenteDatos.source === 'target'); }

  // FÓRMULA EMULADA de días >40 °C, aislada: dias40 = 30 + risk×5 + hash(area) mod 7.
  // Vive en clima-2050-source.js para compartirla con tests y CLI; si el
  // módulo no cargó, se usa esta copia local idéntica (fallback defensivo).
  function dias40Emulados(risk, area) {
    if (FUENTE_MOD && typeof FUENTE_MOD.calcularDias40Emulados === 'function') {
      return FUENTE_MOD.calcularDias40Emulados(risk, area);
    }
    return 30 + risk * 5 + (hashTexto(area) % 7);
  }

  // Días >40 °C según la fuente activa. Con TARGET se lee dias40 del
  // GeoJSON; si falta, devuelve null ("no disponible") y NO se deriva con la
  // fórmula emulada: no se inventa ningún número.
  function dias40SegunFuente(risk, area, props) {
    if (esTarget()) return leerNumero(props.dias40);
    return dias40Emulados(risk, area);
  }

  // Etiqueta corta de la fuente para popup e informe.
  function etiquetaFuente() {
    return esTarget()
      ? 'Datos simulados TARGET'
      : 'Emulación inspirada en Sola-Caraballo et al.';
  }

  // "escenario SSP2-4.5 · año 2050 · resolución 100 m" (solo lo que el
  // archivo declare; si no declara nada, se dice y no se inventa).
  function metaTargetTexto(meta) {
    var partes = [];
    if (meta && meta.scenario) partes.push('escenario ' + meta.scenario);
    if (meta && meta.year != null) partes.push('año ' + meta.year);
    if (meta && meta.resolution_m != null) partes.push('resolución ' + meta.resolution_m + ' m');
    return partes.join(' · ') || 'escenario, año y resolución no indicados en el archivo';
  }

  // Badge discreto junto a la casilla: UNA palabra, como el "Estimado" de
  // Microclima (el texto largo se partía en dos líneas y desencuadraba la
  // píldora). En emulada se deja el "Emulado" original: la fila queda byte a
  // byte como antes. La explicación completa de la fuente va en el tooltip.
  function pintarBadgeFuente() {
    try {
      var em = document.getElementById('clima2050FuenteBadge');
      if (!em) return;
      if (esTarget()) {
        em.textContent = 'TARGET';
        em.title = 'Fuente: datos simulados TARGET precalculados fuera de la web (TARGET no se ejecuta en el navegador)';
      } else {
        em.textContent = 'Emulado';
        em.title = 'Fuente: emulada (emulación inspirada en Sola-Caraballo et al.; sin datos TARGET válidos)';
      }
    } catch (e) { }
  }

  // Resolución perezosa, una sola vez. Si el módulo de fuente no está, la
  // capa queda emulada sin más (comportamiento de siempre).
  function resolverFuenteDatos() {
    if (fuentePromesa) return fuentePromesa;
    if (!FUENTE_MOD || typeof FUENTE_MOD.resolverFuente !== 'function') {
      fuentePromesa = Promise.resolve(null);
      return fuentePromesa;
    }
    fuentePromesa = FUENTE_MOD.resolverFuente().then(function (f) {
      fuenteDatos = (f && f.source) ? f : null;
      if (fuenteDatos && fuenteDatos.aviso && typeof console !== 'undefined' && console.info) {
        console.info('[Clima 2050] TARGET no disponible (' + fuenteDatos.aviso + '); se usa la emulación actual.');
      }
      pintarBadgeFuente();
      return fuenteDatos;
    }).catch(function () {
      fuenteDatos = null;
      pintarBadgeFuente();
      return null;
    });
    return fuentePromesa;
  }

  function urlDatosEfectiva() { return (fuenteDatos && fuenteDatos.url) || DATOS_URL; }

  // Devuelve la colección GeoJSON efectiva: en TARGET ya la tenemos en
  // memoria (validada); en emulada se pide la URL maestra como siempre.
  function obtenerGeojsonClima() {
    if (fuenteDatos && fuenteDatos.geojson) return Promise.resolve(fuenteDatos.geojson);
    return fetch(urlDatosEfectiva()).then(function (r) { return r.ok ? r.json() : null; });
  }

  function atribucionSegunFuente() {
    return esTarget()
      ? 'Simulación TARGET precalculada fuera de la web · geometría INE/IGN'
      : 'Secciones censales INE/IGN · PMVS Mairena 2024-2029 · riesgo 2050 emulado';
  }

  /* ---------------- informe divulgativo de Clima 2050 ---------------- */
  var jsPdfPromise = null;
  var jsPDFInformeTimeout = null;
  var COLORES_INFORME = [
    { nombre: 'Bajo', rgb: [102, 170, 85] },
    { nombre: 'Medio', rgb: [255, 209, 102] },
    { nombre: 'Alto', rgb: [247, 148, 30] },
    { nombre: 'Crítico', rgb: [215, 25, 28] }
  ];

  function cargarJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPdfPromise) return jsPdfPromise;
    jsPdfPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      script.onload = function () {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF no está disponible'));
      };
      script.onerror = reject;
      document.body.appendChild(script);
      jsPDFInformeTimeout = setTimeout(function () {
        if (window.jspdf && window.jspdf.jsPDF) return;
        jsPdfPromise = null;
        reject(new Error('Tiempo de espera agotado al cargar jsPDF'));
      }, 7000);
    }).then(function (Ctor) {
      if (jsPDFInformeTimeout) clearTimeout(jsPDFInformeTimeout);
      jsPDFInformeTimeout = null;
      return Ctor;
    }).catch(function (error) {
      if (jsPDFInformeTimeout) clearTimeout(jsPDFInformeTimeout);
      jsPDFInformeTimeout = null;
      jsPdfPromise = null;
      throw error;
    });
    return jsPdfPromise;
  }

  function escaparHtml(valor) {
    return String(valor == null ? '' : valor).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Número opcional de una propiedad del GeoJSON. Vacío, null, texto raro o
  // NaN devuelven null: así el popup sabe que ese dato NO existe y no pinta
  // ni un cero ni un guion que parezcan una medida.
  function leerNumero(v) {
    if (v == null || v === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  // Porcentaje ya expresado 0-100. Si la fuente lo guardara como fracción
  // (0-1), se pasa a porcentaje para no enseñar «0,18 %» donde hay un 18 %.
  function formatearPct(v) {
    var p = v <= 1 ? v * 100 : v;
    return (Math.round(p * 10) / 10).toLocaleString('es-ES') + ' %';
  }

  // El informe se limita a la zona seleccionada: no carga estadísticas
  // globales del GeoJSON ni desgloses de otros municipios.

  // Piezas de marca para el respaldo HTML. Si el SVG del índice sigue en el
  // DOM se copia tal cual; si la pantalla de idioma ya se retiró, se usa la
  // copia literal LOGO_HTML de este módulo (mismo dibujo, defs y viewBox).
  function obtenerPartesMarca() {
    try {
      var vivo = document.querySelector('.idioma-inicio-logo');
      var simboloVivo = document.getElementById('manolitSideArtwork');
      if (vivo && simboloVivo && simboloVivo.ownerSVGElement && window.XMLSerializer) {
        var defsVivo = simboloVivo.ownerSVGElement.querySelector('defs');
        var useVivo = vivo.querySelector('use');
        if (defsVivo && useVivo) {
          return {
            defs: new XMLSerializer().serializeToString(defsVivo).replace(/^<defs[^>]*>/, '').replace(/<\/defs>$/, ''),
            use: new XMLSerializer().serializeToString(useVivo),
            viewBox: vivo.getAttribute('viewBox') || '0 140 650 370'
          };
        }
      }
      return {
        defs: LOGO_HTML.replace(/^[\s\S]*?<defs>/, '').replace(/<\/defs>[\s\S]*$/, ''),
        use: '<use href="#manolitSideArtwork" width="600" height="600"></use>',
        viewBox: '0 140 650 370'
      };
    } catch (error) { return null; }
  }

  // SVG completo y autónomo (para rasterizarlo a PNG dentro del PDF).
  function obtenerSvgMarca() {
    try {
      var partes = obtenerPartesMarca();
      if (!partes) return null;
      return '<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="740" viewBox="' + partes.viewBox + '">' +
        '<defs>' + partes.defs + '</defs>' + partes.use + '</svg>';
    } catch (error) { return null; }
  }

  function svgMarcaComoPng(svgTexto) {
    if (!svgTexto) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var terminado = false;
      var temporizador = setTimeout(function () { finalizar(null); }, 4000);
      function finalizar(resultado) {
        if (terminado) return;
        terminado = true;
        clearTimeout(temporizador);
        resolve(resultado);
      }
      try {
        var imagen = new Image();
        var canvas = document.createElement('canvas');
        // Misma proporción del viewBox del SVG de portada: 650 × 370.
        canvas.width = 1300;
        canvas.height = 740;
        var contexto = canvas.getContext('2d');
        if (!contexto) { finalizar(null); return; }
        var url = URL.createObjectURL(new Blob([svgTexto], { type: 'image/svg+xml;charset=utf-8' }));
        imagen.onload = function () {
          try {
            contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
            finalizar(canvas.toDataURL('image/png'));
          } catch (error) { finalizar(null); }
          URL.revokeObjectURL(url);
        };
        imagen.onerror = function () { URL.revokeObjectURL(url); finalizar(null); };
        imagen.src = url;
      } catch (error) { finalizar(null); }
    });
  }

  function fechaInforme() {
    try { return new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (error) { return new Date().toISOString().slice(0, 10); }
  }

  function dibujarGraficoPdf(doc, z) {
    var M = 16, ancho = 178, y = 45;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(22, 24, 29);
    doc.text('Lectura de la selección', M, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    var diasZona = z.dias == null
      ? (z.fuente === 'target' ? 'indicador de días no disponible en el archivo TARGET para esta zona' : 'indicador de días no disponible')
      : z.dias + ' días/año >40 °C (' + (z.fuente === 'target' ? 'simulación TARGET precalculada' : 'emulado; regla determinista, no predicción') + ')';
    var codigoRiesgo = z.risk == null ? 'sin código' : (z.fuente === 'target' ? 'código TARGET ' : 'código emulado ') + z.risk + ' de 3';
    var interpretacion = 'Área seleccionada: ' + z.municipio + ' · ' + z.area + ' · clase ordinal ' + z.nivel + ' (' + codigoRiesgo + '). Indicador: ' + diasZona + '.';
    var lineas = doc.splitTextToSize(interpretacion, ancho);
    doc.text(lineas, M, y);
    y += lineas.length * 4 + 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(90, 96, 104);
    var cautela = doc.splitTextToSize('Interpretación: porcentaje del conteo de polígonos, no de superficie, población expuesta ni probabilidad. La escala 0–3 es ordinal; la capa no publica umbrales térmicos para convertir cada clase a °C.', ancho);
    doc.text(cautela, M, y);
    if (z.centro && isFinite(z.centro[0]) && isFinite(z.centro[1])) {
      var urlMapa = 'https://www.openstreetmap.org/?mlat=' + z.centro[1].toFixed(5) + '&mlon=' + z.centro[0].toFixed(5) + '#map=15/' + z.centro[1].toFixed(5) + '/' + z.centro[0].toFixed(5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 102, 159);
      doc.textWithLink('Abrir coordenada consultada en OpenStreetMap', M, Math.min(y + cautela.length * 3.5 + 5, 270), { url: urlMapa });
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 96, 104);
    doc.text('Manolit∞ Aire · informe limitado a la zona seleccionada', M, 286);
    doc.text('Página 2 de 3', 194, 286, { align: 'right' });
  }

  function pintarInformePdf(doc, z, logoPng) {
    var tinta = [22, 24, 29], gris = [90, 96, 104], margen = 16, ancho = 178;
    doc.setFillColor.apply(doc, tinta);
    doc.rect(0, 0, 210, 297, 'F');
    if (logoPng) doc.addImage(logoPng, 'PNG', 35, 31, 140, 80);
    else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('MANOLIT∞ AIRE', 105, 73, { align: 'center' });
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MANOLIT∞ AIRE', 105, 128, { align: 'center' });
    doc.setFontSize(23);
    doc.text('Informe Clima 2050', 105, 141, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(z.fuente === 'target' ? 'Prototipo cartográfico · datos simulados TARGET' : 'Prototipo cartográfico · indicadores térmicos emulados', 105, 148, { align: 'center' });
    doc.setDrawColor(92, 104, 118);
    doc.roundedRect(27, 171, 156, 45, 4, 4, 'S');
    doc.setFontSize(10);
    doc.text(String(z.municipio), 105, 184, { align: 'center', maxWidth: 142 });
    doc.setFontSize(12);
    doc.text(String(z.area), 105, 196, { align: 'center', maxWidth: 142 });
    doc.setFillColor.apply(doc, hexARgb(z.acento));
    doc.roundedRect(74, 202, 62, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CLASE ' + String(z.nivel).toUpperCase(), 105, 208, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(196, 207, 219);
    doc.text(fechaInforme(), 105, 235, { align: 'center' });
    doc.setFontSize(8);
    doc.text('No es una proyección climática validada ni una alerta oficial.', 105, 253, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Generado por Manolit∞ Aire', 105, 262, { align: 'center' });
    // Referencias de inspiración (mismas que en metodologia.html y
    // aviso-legal.html): paper abierto, noticia de la Universidad de
    // Sevilla y visor del estudio. Enlaces clicables en el PDF.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 158, 168);
    doc.textWithLink('Paper: Sola-Caraballo et al. (2026), Urban Climate 70:103156 · doi.org/10.1016/j.uclim.2026.103156', 105, 272, { align: 'center', url: 'https://doi.org/10.1016/j.uclim.2026.103156' });
    doc.textWithLink('Noticia: Universidad de Sevilla (us.es)', 105, 276.5, { align: 'center', url: 'https://www.us.es/actualidad-de-la-us/una-novedosa-herramienta-predice-como-afectara-el-calor-extremo-cada-barrio-de' });
    doc.textWithLink('Visor del estudio: j-sola-caraballo.github.io/seville-heat-risk', 105, 281, { align: 'center', url: 'https://j-sola-caraballo.github.io/seville-heat-risk/' });

    doc.addPage('a4', 'portrait');
    doc.setFillColor.apply(doc, tinta);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Lectura de la selección', margen, 19);
    dibujarGraficoPdf(doc, z);

    // Página 3 sin bloques solapados: ficha arriba y metodología a continuación,
    // con la misma tinta y espaciado regular para no dejar saltos ni huecos.
    doc.addPage('a4', 'portrait');
    doc.setFillColor.apply(doc, tinta);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Ficha de zona y metodología', margen, 19);
    var y = 45;
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, gris);
    doc.text('MUNICIPIO', margen, y); y += 5.5;
    doc.setFontSize(11);
    doc.setTextColor.apply(doc, tinta);
    doc.text(String(z.municipio), margen, y); y += 9;
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, gris);
    doc.text('ZONA / ÁREA', margen, y); y += 5.5;
    doc.setFontSize(11);
    doc.setTextColor.apply(doc, tinta);
    var lineaArea3 = doc.splitTextToSize(String(z.area), ancho);
    doc.text(lineaArea3, margen, y);
    y += lineaArea3.length * 5 + 5;
    doc.setFillColor.apply(doc, hexARgb(z.acento));
    doc.roundedRect(margen, y - 3.6, 44, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(String(z.nivel).toUpperCase() + ' · ' + (z.risk == null ? 'sin código' : 'nivel ' + z.risk + ' de 3'), margen + 22, y + 1.6, { align: 'center' });
    y += 11;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor.apply(doc, tinta);
    doc.setFontSize(9.5);
    var diasTxt = z.dias == null
      ? 'Indicador de días >40 °C: no disponible' + (z.fuente === 'target' ? ' en el archivo TARGET para esta zona' : '') + '.'
      : String(z.dias) + ' días/año >40 °C · ' + (z.fuente === 'target' ? 'SIMULACIÓN TARGET' : 'EMULADO');
    var lineasDias3 = doc.splitTextToSize(diasTxt, ancho);
    doc.text(lineasDias3, margen, y);
    y += lineasDias3.length * 4.4 + 2;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor.apply(doc, gris);
    var detalle = z.fuente === 'target'
      ? (z.dias == null
          ? 'El archivo TARGET precalculado no incluye dias40 para esta zona; no se deriva con ninguna fórmula en el cliente. ' + metaTargetTexto(z.meta) + '.'
          : 'El indicador se lee de la propiedad dias40 del archivo TARGET precalculado fuera de la web (' + metaTargetTexto(z.meta) + '); no se deriva con ninguna fórmula en el cliente.')
      : (z.dias == null
          ? 'No se ha calculado indicador para esta selección; la categoría sigue siendo emulada.'
          : 'Fórmula del indicador en el cliente: días = 30 + risk_level × 5 + hash(area) mod 7. El hash determinista hace variar el ejemplo según el nombre del área; no representa medición ni variabilidad climática.');
    var lineasDetalle3 = doc.splitTextToSize(detalle, ancho);
    doc.text(lineasDetalle3, margen, y);
    y += lineasDetalle3.length * 3.6 + 3;
    // Datos TARGET opcionales: solo si el archivo los trae; si faltan, no se
    // pinta ni un cero ni un guion que parezcan una medida.
    if (z.fuente === 'target') {
      var filaTarget = [];
      if (z.noches != null) filaTarget.push('Noches tropicales: ' + z.noches + ' al año (TARGET).');
      if (z.hazard != null) filaTarget.push('Índice de peligrosidad (hazard_index): ' + z.hazard.toLocaleString('es-ES') + ' (TARGET).');
      if (z.vulnerabilidadIndice != null) filaTarget.push('Índice de vulnerabilidad (vulnerability_index): ' + z.vulnerabilidadIndice.toLocaleString('es-ES') + ' (TARGET).');
      if (filaTarget.length) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor.apply(doc, tinta);
        doc.setFontSize(9);
        var lineasTarget = doc.splitTextToSize(filaTarget.join(' '), ancho);
        doc.text(lineasTarget, margen, y);
        y += lineasTarget.length * 4 + 1;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.6);
        doc.setTextColor.apply(doc, gris);
        var notaTarget = doc.splitTextToSize('Valores procedentes de la simulación TARGET precalculada fuera de la web (' + metaTargetTexto(z.meta) + '). TARGET no se ejecuta en el navegador.', ancho);
        doc.text(notaTarget, margen, y);
        y += notaTarget.length * 3.4 + 3;
      }
    }
    // Vulnerabilidad real, solo cuando el GeoJSON la trae (INE y Catastro).
    var filaVuln = [];
    if (z.renta != null) filaVuln.push('Renta media: ' + Math.round(z.renta).toLocaleString('es-ES') + ' EUR por unidad de consumo (INE, Atlas de Distribución de Renta).');
    if (z.mayores != null) filaVuln.push('Personas de 65 años o más: ' + formatearPct(z.mayores) + ' (INE, padrón por sección censal).');
    if (z.antiguedad != null) filaVuln.push('Viviendas anteriores a 1979: ' + formatearPct(z.antiguedad) + ' (Catastro, año de construcción).');
    if (filaVuln.length) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor.apply(doc, tinta);
      doc.setFontSize(9);
      var lineasVuln = doc.splitTextToSize(filaVuln.join(' '), ancho);
      doc.text(lineasVuln, margen, y);
      y += lineasVuln.length * 4 + 1;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.6);
      doc.setTextColor.apply(doc, gris);
      var notaVuln = doc.splitTextToSize('Estos tres datos son medidas oficiales de la sección censal, no una estimación del mapa. No cambian el nivel de riesgo ni la penalización de ruta, que siguen siendo emulados.', ancho);
      doc.text(notaVuln, margen, y);
      y += notaVuln.length * 3.4 + 3;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, tinta);
    doc.text('Clasificación cartográfica ordinal', margen, y); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    for (var i = 0; i < COLORES_INFORME.length; i++) {
      doc.setFillColor.apply(doc, COLORES_INFORME[i].rgb);
      doc.circle(margen + 1.5, y - 1, 1.5, 'F');
      doc.setTextColor.apply(doc, tinta);
      doc.text(COLORES_INFORME[i].nombre + ' (' + i + ')', margen + 6, y);
      y += 6;
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.6);
    doc.setTextColor.apply(doc, gris);
    var notaClases = doc.splitTextToSize('Las clases son ordinales y no equivalen a °C ni a probabilidad de impacto. El GeoJSON no publica umbrales físicos por clase.', ancho);
    doc.text(notaClases, margen, y + 1);
    y += notaClases.length * 3.6 + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, tinta);
    doc.text('Metodología, alcance y limitaciones', margen, y); y += 6;
    var secciones = [
      ['Unidad espacial y procedencia', 'El GeoJSON reúne 521 secciones censales de Sevilla, 9 áreas estadísticas de Mairena del Aljarafe agrupadas según PMVS 2024–2029, 6 secciones censales de Bollullos de la Mitación y 30 secciones censales de Écija y 10 distritos administrativos de Tiflis (OpenStreetMap, admin_level 9). La unidad cartográfica difiere entre municipios. Geometrías INE/IGN; Sevilla vía ctafur/sevillaGeojson (GPL-3.0); nombres de urbanización en Bollullos vía OpenStreetMap; en Écija el "Distrito 0X" es el distrito censal del INE y el barrio se aproxima con anclas OSM/Nominatim documentadas.'],
      ['Método que sí ejecuta el prototipo', z.fuente === 'target'
        ? 'Cada polígono tiene un risk_level entero de 0 a 3 leído del archivo TARGET precalculado (' + metaTargetTexto(z.meta) + '). Los días >40 °C se leen de su propiedad dias40 cuando existe; si falta para una zona se muestra "no disponible" y no se deriva con ninguna fórmula en el cliente. TARGET no se ejecuta en el navegador: el archivo se genera fuera de la web y se copia a data/clima2050/target/.'
        : 'Cada polígono tiene un risk_level entero de 0 a 3, tratado como clase ordinal emulada. El indicador auxiliar es 30 + nivel × 5 + hash determinista del texto del área mod 7. La referencia a Sola-Caraballo et al. es inspiración; no implica que se haya reproducido, calibrado o validado ese estudio.'],
      ['Vulnerabilidad oficial (si el GeoJSON la incluye)', 'Renta media por unidad de consumo del Atlas de Distribución de Renta del INE, porcentaje de personas de 65 años o más del padrón por sección censal y porcentaje de viviendas anteriores a 1979 según el año de construcción del Catastro. Cuando aparecen, son datos oficiales de la sección censal y se muestran sin transformar. No forman parte del cálculo de risk_level ni de la penalización de ruta.'],
      ['Estadística presentada', 'Este informe se limita a la zona seleccionada: municipio, área, clase ordinal e indicador auxiliar. No incluye recuentos globales del GeoJSON ni desgloses de otros municipios. El indicador de días es un valor por zona, no un porcentaje de terreno, habitantes expuestos, episodios de calor o riesgo sanitario.'],
      ['Qué no representa', 'Esta capa no aporta observaciones meteorológicas, periodo base, series temporales, escenarios climáticos regionalizados, modelo de temperatura urbana, calibración, validación independiente, error predictivo ni intervalos de incertidumbre. Los días no son una predicción para 2050. Las categorías no incorporan población, edad, salud, arbolado real, sombra ni vulnerabilidad.'],
      ['Uso público responsable', 'Material de divulgación, exploración preliminar y apoyo para formular preguntas o planificar mediciones por ayuntamientos, entidades públicas y equipos técnicos. No debe ser base única de inversiones, alertas, diagnóstico o comunicación oficial. Contrastar con datos observados y evaluación profesional.'],
      ['Requisitos para una evaluación científica', 'Definir variable y periodo de referencia; reunir observaciones con control de calidad; documentar escenarios regionalizados; calibrar y validar con datos independientes; informar error e incertidumbre; incorporar exposición y vulnerabilidad con salvaguardas de privacidad; publicar fuentes, versión y método reproducible.']
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    for (var s = 0; s < secciones.length; s++) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor.apply(doc, tinta);
      doc.text(secciones[s][0], margen, y);
      y += 3.4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor.apply(doc, gris);
      var parrafo = doc.splitTextToSize(secciones[s][1], ancho);
      doc.text(parrafo, margen, y);
      y += parrafo.length * 3 + 2;
    }
    doc.setDrawColor.apply(doc, gris);
    doc.roundedRect(margen, 270, ancho, 12, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, tinta);
    doc.text('Prototipo educativo: indicadores térmicos emulados; no es proyección climática validada ni alerta oficial.', margen + 3, 277);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor.apply(doc, gris);
    doc.text('Generado por Manolit∞ Aire · informe divulgativo', margen, 288);
    doc.text('Página 3 de 3', 194, 288, { align: 'right' });
  }

  function generarHtmlInforme(z) {
    var partes = obtenerPartesMarca();
    var logo = '<strong>MANOLIT∞ AIRE</strong>';
    if (partes) {
      try {
        // partes.defs y partes.use ya vienen serializados como texto.
        logo = '<svg class="logo-manolit" viewBox="' + escaparHtml(partes.viewBox) + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Manolit∞ Aire"><defs>' + partes.defs + '</defs>' + partes.use + '</svg>';
      } catch (error) { }
    }
    var enlaceMapa = z.centro && isFinite(z.centro[0]) && isFinite(z.centro[1])
      ? 'https://www.openstreetmap.org/?mlat=' + z.centro[1].toFixed(5) + '&mlon=' + z.centro[0].toFixed(5) + '#map=15/' + z.centro[1].toFixed(5) + '/' + z.centro[0].toFixed(5)
      : '';
    var linkSeleccion = enlaceMapa ? '<p><a href="' + escaparHtml(enlaceMapa) + '">Abrir coordenada consultada en OpenStreetMap</a> · ' + z.centro[1].toFixed(5) + ', ' + z.centro[0].toFixed(5) + '</p>' : '';
    var fecha = escaparHtml(fechaInforme());
    var dias = z.dias == null
      ? (z.fuente === 'target' ? 'No disponible en el archivo TARGET para esta zona' : 'No disponible')
      : z.dias + ' días/año >40 °C (' + (z.fuente === 'target' ? 'simulación TARGET' : 'emulado') + ')';
    var codigoTxt = (z.fuente === 'target' ? 'código TARGET ' : 'código emulado ') + (z.risk == null ? 'no disponible' : z.risk + ' de 3');
    var explicacionDias = z.fuente === 'target'
      ? 'El indicador se lee de la propiedad dias40 del archivo TARGET precalculado (' + escaparHtml(metaTargetTexto(z.meta)) + '); si falta se muestra "no disponible" y no se deriva con ninguna fórmula en el cliente.'
      : 'Fórmula: 30 + risk_level × 5 + hash determinista del nombre del área mod 7; no procede de observaciones ni de una proyección climática calibrada.';
    // Datos TARGET opcionales: solo si el archivo los trae.
    var extraTarget = '';
    if (z.fuente === 'target') {
      if (z.noches != null) extraTarget += 'Noches tropicales: ' + z.noches + ' al año (TARGET). ';
      if (z.hazard != null) extraTarget += 'Índice de peligrosidad: ' + z.hazard.toLocaleString('es-ES') + ' (TARGET). ';
      if (z.vulnerabilidadIndice != null) extraTarget += 'Índice de vulnerabilidad: ' + z.vulnerabilidadIndice.toLocaleString('es-ES') + ' (TARGET). ';
      if (extraTarget) extraTarget = '<p>' + escaparHtml(extraTarget.trim()) + '</p>';
    }
    // Bloque de vulnerabilidad para el respaldo imprimible: solo si hay datos.
    var vuln = '';
    if (z.renta != null) vuln += 'Renta media: ' + Math.round(z.renta).toLocaleString('es-ES') + ' EUR por unidad de consumo (INE). ';
    if (z.mayores != null) vuln += 'Personas de 65 años o más: ' + formatearPct(z.mayores) + ' (INE). ';
    if (z.antiguedad != null) vuln += 'Viviendas anteriores a 1979: ' + formatearPct(z.antiguedad) + ' (Catastro). ';
    if (vuln) vuln = '<p>' + escaparHtml(vuln.trim()) + ' Son datos oficiales de la sección censal. No intervienen en la clase emulada ni en la penalización de ruta.</p>';
    var lectura = '<p>Este informe se limita a la zona seleccionada; no incluye recuentos globales del mapa ni datos de otros municipios.</p>' + linkSeleccion + '<div class="ficha"><h2>Área seleccionada</h2><p><b>' + escaparHtml(z.municipio) + ' · ' + escaparHtml(z.area) + '</b></p><p>Clase ordinal: <b>' + escaparHtml(z.nivel) + '</b> · ' + codigoTxt + '</p><p>Indicador auxiliar: ' + dias + '. ' + explicacionDias + '</p>' + extraTarget + vuln + '</div>'; 
    var metodologia = '<h1>Metodología, alcance y limitaciones</h1>' +
      '<h2>Unidad espacial y fuentes</h2><p>El archivo maestro reúne 521 secciones censales de Sevilla, 9 áreas estadísticas de Mairena del Aljarafe agrupadas según PMVS 2024–2029, 6 secciones censales de Bollullos de la Mitación y 30 secciones censales de Écija y 10 distritos administrativos de Tiflis (OpenStreetMap, admin_level 9). Las unidades no son idénticas entre municipios. Geometrías INE/IGN; Sevilla vía ctafur/sevillaGeojson (GPL-3.0); nombres de urbanización en Bollullos vía OpenStreetMap; en Écija el "Distrito 0X" es el distrito censal del INE y el barrio se aproxima con anclas OSM/Nominatim documentadas.</p>' +
      '<h2>Método implementado</h2><p>El GeoJSON contiene un risk_level de 0 a 3, interpretado como categoría ordinal emulada. Los días auxiliares se calculan con 30 + nivel × 5 + hash determinista del texto del área mod 7. La mención de Sola-Caraballo et al. es inspiración general; este módulo no reproduce ni calibra ese estudio.</p>' +
      '<h2>Límites de inferencia</h2><p>No se aportan aquí observaciones meteorológicas, periodo base, series temporales, escenarios regionalizados, resolución temporal, modelo de temperatura urbana, validación independiente, calibración, errores ni intervalos de incertidumbre. Los días no son una predicción para 2050. La clase no representa °C ni probabilidad, y no incorpora población, salud, sombra real o vulnerabilidad.</p>' +
      '<h2>Uso para entidades públicas</h2><p>Material de divulgación y exploración preliminar para ayuntamientos, entidades públicas y equipos técnicos; puede ayudar a formular preguntas y planificar mediciones. No debe ser base única de inversiones, alertas o diagnóstico. Contrastar con observaciones y evaluación profesional.</p>' +
      '<h2>Requisitos de evaluación científica</h2><p>Definir variable y periodo; recopilar mediciones con control de calidad; documentar escenarios climáticos regionalizados y periodo de referencia; calibrar y validar con datos independientes; comunicar incertidumbre y error; incorporar exposición y vulnerabilidad con protección de privacidad; publicar método y versión reproducibles.</p>' +
      '<h2>Fuentes y referencias</h2><p>Paper: Sola-Caraballo, J., López-Cabeza, V. P., Serrano-Jiménez, A., Rivera-Gómez, C. y Galán-Marín, C. (2026). <i>A predictive framework for urban climate risk</i>. Urban Climate, 70, 103156. <a href="https://doi.org/10.1016/j.uclim.2026.103156">doi.org/10.1016/j.uclim.2026.103156</a> · Noticia: <a href="https://www.us.es/actualidad-de-la-us/una-novedosa-herramienta-predice-como-afectara-el-calor-extremo-cada-barrio-de">Universidad de Sevilla (us.es)</a> · <a href="https://j-sola-caraballo.github.io/seville-heat-risk/">Visor del estudio</a>. La capa se inspira en este trabajo sin reproducirlo ni calibrarlo.</p>' +
      '<p class="aviso"><b>Conclusión:</b> prototipo educativo. Geometría territorial identificada; indicadores térmicos emulados. No es proyección climática, alerta oficial ni estudio técnico de riesgo.</p>';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe Clima 2050</title><style>' +
      'html{background:#f4f6f8}body{margin:0;color:#16181d;font:14px/1.45 system-ui,sans-serif}.barra-acciones{position:sticky;top:0;z-index:2;display:flex;justify-content:center;gap:10px;padding:10px;background:#16181d}.barra-acciones button{min-height:44px;padding:10px 18px;border:1px solid #647080;border-radius:8px;background:#202631;color:white;font:600 14px system-ui,sans-serif;cursor:pointer}.pagina{box-sizing:border-box;width:min(210mm,100%);min-height:297mm;padding:13mm 15mm;margin:12px auto;background:#f4f6f8;box-shadow:0 3px 18px #0002;break-after:page;overflow-wrap:anywhere}.portada{background:#f4f6f8;color:#16181d;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.portada .logo-manolit{display:block;width:min(145mm,100%);height:auto;aspect-ratio:650/370;max-height:90mm}.portada h1{font-size:28px;margin:14px 0 5px}.sub,.meta{color:#56616d}.ficha{border:1px solid #cbd2da;border-radius:8px;padding:12px;margin-top:12px}.badge{display:inline-block;color:white;background:' + escaparHtml(z.acento) + ';padding:4px 10px;border-radius:5px;font-weight:700}.barra{height:18px;display:flex;margin:12px 0 8px;border-radius:4px;overflow:hidden}.barra i{height:100%}.leyenda{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-bottom:10px}.leyenda i{display:inline-block;width:10px;height:10px;margin-right:6px}table{width:100%;border-collapse:collapse;margin:8px 0 10px;font-size:11px}td,th{text-align:right;border-bottom:1px solid #cbd2da;padding:5px 4px}td:first-child,th:first-child{text-align:left;overflow-wrap:anywhere}h1{font-size:22px;margin:0 0 8px}h2{font-size:15px;margin:11px 0 4px}p{margin:6px 0}.aviso{border:1px solid #707b86;padding:8px;border-radius:6px;margin-top:10px}.pie{margin-top:10px;border-top:1px solid #cbd2da;padding-top:6px;color:#56616d;font-size:10px}@media(max-width:600px){.barra-acciones{position:static}.pagina{width:100%;min-height:0;padding:22px 18px;margin:0 auto 12px;box-shadow:none}.portada{min-height:calc(100svh - 64px)}.portada .logo-manolit{width:min(100%,480px);height:auto;max-height:34svh}.portada h1{font-size:clamp(23px,7vw,30px)}.leyenda{grid-template-columns:1fr 1fr}table{font-size:10.5px}td,th{padding:6px 2px}h1{font-size:21px}h2{font-size:15px}}@page{size:A4;margin:0}@media print{html,body{width:210mm;margin:0;background:#f4f6f8!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.barra-acciones{display:none!important}.pagina{box-sizing:border-box;width:210mm;height:auto;min-height:297mm;margin:0;padding:14mm 15mm;background:#f4f6f8!important;box-shadow:none;break-after:page;page-break-after:always;overflow:visible;-webkit-box-decoration-break:clone;box-decoration-break:clone}h1,h2{break-after:avoid;page-break-after:avoid}h2,p,.ficha,.aviso,tr{break-inside:avoid;page-break-inside:avoid}.portada{justify-content:center}.portada .logo-manolit{max-height:72mm}.pagina:last-child{break-after:auto;page-break-after:auto}}</style></head><body>' +
      '<nav class="barra-acciones" aria-label="Acciones del informe"><button type="button" id="imprimirInformeClima2050">Imprimir / Guardar como PDF</button><button type="button" id="cerrarInformeClima2050">Cerrar</button></nav>' +
      '<section class="pagina portada">' + logo + '<h1>Informe Clima 2050</h1><p>' + (z.fuente === 'target' ? 'Prototipo cartográfico · datos simulados TARGET' : 'Prototipo cartográfico · indicadores térmicos emulados') + '</p><div class="ficha"><p>' + escaparHtml(z.municipio) + '</p><h2>' + escaparHtml(z.area) + '</h2><span class="badge">CLASE ' + escaparHtml(z.nivel.toUpperCase()) + '</span></div><p class="meta">' + fecha + '</p><p class="meta">No es una proyección climática validada ni una alerta oficial.</p><p class="meta"><a href="https://manolitoaire.com">manolitoaire.com</a></p></section>' +
      '<section class="pagina"><h1>Área seleccionada</h1>' + lectura + '<h2>Metodología, alcance y limitaciones</h2>' + metodologia.replace('<h1>Metodología, alcance y limitaciones</h1>', '') + '<p class="pie">Generado por Manolit∞ Aire · <a href="https://manolitoaire.com">manolitoaire.com</a> · ' + fecha + ' · El indicador no equivale a porcentaje de superficie, habitantes expuestos ni probabilidad.</p></section></body></html>';
  }

  function imprimirRespaldoInforme(zona, ventana) {
    try {
      ventana.document.open();
      ventana.document.write(generarHtmlInforme(zona));
      ventana.document.close();
      ventana.focus();
      var botonImprimir = ventana.document.getElementById('imprimirInformeClima2050');
      var botonCerrar = ventana.document.getElementById('cerrarInformeClima2050');
      if (botonImprimir) botonImprimir.addEventListener('click', function () { try { ventana.focus(); ventana.print(); } catch (error) { } });
      if (botonCerrar) botonCerrar.addEventListener('click', function () { try { ventana.close(); } catch (error) { } });
    } catch (error) {
      try { ventana.close(); } catch (errorCierre) { }
      try { window.alert('No se pudo construir el informe. Inténtalo de nuevo.'); } catch (errorAlerta) { }
    }
  }

  function descargarInforme() {
    if (!ultimaZona || !encendida()) return;
    var zona = ultimaZona;
    // Abre la ventana durante el gesto del usuario para evitar el bloqueador de
    // ventanas de Safari/iOS y prepara un respaldo visible mientras carga PDF.
    var ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) {
      try { window.alert('Permite la ventana del informe para descargar o imprimir el documento.'); } catch (error) { }
      return;
    }
    ventanaImpresion.document.open();
    ventanaImpresion.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preparando informe Clima 2050</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#16181d;color:white;font:16px/1.5 system-ui,sans-serif;text-align:center}main{padding:24px}p{color:#c4cfdb}</style></head><body><main><strong>Preparando el informe Clima 2050…</strong><p>La impresión solo se abrirá si tú pulsas «Imprimir / Guardar como PDF».</p></main></body></html>');
    ventanaImpresion.document.close();
    Promise.all([cargarJsPdf(), svgMarcaComoPng(obtenerSvgMarca())]).then(function (recursos) {
      var Ctor = recursos[0];
      var doc = new Ctor({ unit: 'mm', format: 'a4' });
      pintarInformePdf(doc, zona, recursos[1]);
      doc.save('clima-2050-' + String(zona.municipio).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf');
      ventanaImpresion.close();
    }).catch(function () {
      imprimirRespaldoInforme(zona, ventanaImpresion);
    });
  }

  window.manolitAireClima2050DescargarInforme = function () {
    if (!encendida()) return;
    if (!ultimaZona) {
      try { window.alert('Activa Clima 2050 y toca una zona coloreada para seleccionar el área del informe.'); } catch (error) { }
      return;
    }
    try { descargarInforme(); } catch (error) { /* el informe nunca debe interrumpir el mapa */ }
  };

  /* ---------------- visibilidad global: las dos capas a la vez ---------------- */

  function aplicarVisibilidad() {
    if (!mapa) return;
    var on = encendida();
    var ver = on ? 'visible' : 'none';
    for (var i = 0; i < CAPAS.length; i++) {
      if (!mapa.getLayer(CAPAS[i])) continue;
      try { mapa.setLayoutProperty(CAPAS[i], 'visibility', ver); } catch (e) { }
    }
    // Al apagar, el popup abierto se retira con la capa que lo originó.
    if (!on && popup) { try { popup.remove(); } catch (e) { }
    }
  }

  /* ---------------- popup al hacer clic en un polígono ---------------- */

  function mostrarPopup(e) {
    if (!encendida() || !mapa || !e.features || !e.features.length) return;
    var p = e.features[0].properties || {};
    var municipio = (p.municipio != null && String(p.municipio).length)
      ? String(p.municipio)
      : (p.m != null && String(p.m).length ? String(p.m) : 'Municipio sin identificar');
    var area = (p.area != null && String(p.area).length)
      ? String(p.area)
      : (p.a != null && String(p.a).length ? String(p.a) : 'Zona sin identificar');
    // Claves cortas del archivo ligero (r, y opcionales: renta_media_ud ->
    // rm, mayores65_pct -> ed, pct_antes_1979 -> a79).
    var risk = leerNumero(p.risk_level != null ? p.risk_level : p.r);
    // Una selección nueva invalida cualquier área anterior.
    ultimaZona = null;
    var nivelInfo = (risk != null && risk >= 0 && risk <= 3) ? NIVELES[risk] : null;
    var nivel = nivelInfo ? nivelInfo.texto : '—';
    // Días >40 °C según la fuente activa: con TARGET se lee dias40 del
    // GeoJSON (si falta, null = "no disponible", NUNCA la fórmula); con la
    // emulada, la fórmula de siempre aislada en dias40Emulados().
    var diasNum = nivelInfo ? dias40SegunFuente(risk, area, p) : null;
    // VULNERABILIDAD REAL (nov-2026): si el GeoJSON trae renta media por
    // unidad de gasto (INE Atlas de Distribución de Renta) y porcentaje de
    // personas de 65 años o más por sección censal, se enseñan tal cual.
    // Si no vienen (el master actual no las tiene), el popup queda
    // EXACTAMENTE como antes: no se inventa ni se rellena con un cero.
    var renta = leerNumero(p.renta_media_ud != null ? p.renta_media_ud : p.rm);
    var mayores = leerNumero(p.mayores65_pct != null ? p.mayores65_pct : p.ed);
    var antiguedad = leerNumero(p.pct_antes_1979 != null ? p.pct_antes_1979 : p.a79);
    // INDICADORES TARGET OPCIONALES: solo si la fuente activa es TARGET y el
    // archivo los trae; si faltan quedan null y no se pinta nada.
    var noches = esTarget() ? leerNumero(p.noches_tropicales) : null;
    var hazard = esTarget() ? leerNumero(p.hazard_index) : null;
    var vulnerabilidadIndice = esTarget() ? leerNumero(p.vulnerability_index) : null;
    var acento = nivelInfo ? nivelInfo.acento : '#888';
    // Título unificado: "Municipio - Area" (formato del Paso 3).
    var titulo = municipio + ' - ' + area;
    // Línea de días: número + lectura ciudadana, en una sola línea. Con
    // TARGET y sin dias40 en la zona se dice "no disponible" (no se inventa).
    var dias = (diasNum != null)
      ? '<strong>' + diasNum + '</strong> días al año a más de 40 °C: ' +
        nivelInfo.interpretacion
      : (esTarget() && nivelInfo)
        ? 'Días al año a más de 40 °C: no disponible (TARGET)'
        : 'Días al año a más de 40 °C: —';
    var consejo = nivelInfo ? nivelInfo.consejo : '';
    // Guardamos la zona para el informe PDF (botón de descarga del popup).
    ultimaZona = {
      municipio: municipio,
      area: area,
      nivel: nivel,
      acento: acento,
      dias: diasNum,
      interpretacion: nivelInfo ? nivelInfo.interpretacion : '',
      consejo: consejo,
      risk: risk,
      renta: renta,
      mayores: mayores,
      antiguedad: antiguedad,
      fuente: (fuenteDatos && fuenteDatos.source) || 'emulated',
      meta: (fuenteDatos && fuenteDatos.meta) || null,
      noches: noches,
      hazard: hazard,
      vulnerabilidadIndice: vulnerabilidadIndice,
      centro: e.lngLat ? [Number(e.lngLat.lng), Number(e.lngLat.lat)] : null
    };
    // Bloque de vulnerabilidad: solo si hay algún dato real. Cada línea es
    // una fuente distinta y se dice cuál es, sin mezclarlas con el riesgo.
    var vuln = '';
    if (renta != null) vuln += 'Renta media: <strong>' + Math.round(renta).toLocaleString('es-ES') + ' €</strong> por unidad de consumo<br>';
    if (mayores != null) vuln += 'Personas de 65 años o más: <strong>' + formatearPct(mayores) + '</strong><br>';
    if (antiguedad != null) vuln += 'Viviendas anteriores a 1979: <strong>' + formatearPct(antiguedad) + '</strong><br>';
    if (vuln) vuln = '<span style="display:block;margin-top:4px;padding-top:4px;border-top:1px solid #e2e5e9">' + vuln + '</span>';
    // Bloque TARGET: indicadores extra de la simulación, solo los que el
    // archivo declare para esta zona (mismo estilo discreto que el bloque de
    // vulnerabilidad).
    var extrasTarget = '';
    if (noches != null) extrasTarget += 'Noches tropicales: <strong>' + noches + '</strong> al año<br>';
    if (hazard != null) extrasTarget += 'Índice de peligrosidad: <strong>' + hazard.toLocaleString('es-ES') + '</strong><br>';
    if (vulnerabilidadIndice != null) extrasTarget += 'Índice de vulnerabilidad: <strong>' + vulnerabilidadIndice.toLocaleString('es-ES') + '</strong><br>';
    if (extrasTarget) extrasTarget = '<span style="display:block;margin-top:4px;padding-top:4px;border-top:1px solid #e2e5e9">' + extrasTarget + '</span>';
    // Color de texto EXPLÍCITO y oscuro (#16181d): el popup de MapLibre es
    // blanco y, sin esto, heredaba el color claro del tema oscuro de FUERA
    // del mapa y el texto quedaba invisible. Mapa y página son independientes.
    var html = '<div style="font:13px/1.55 system-ui,sans-serif;min-width:200px;max-width:280px;color:#16181d">' +
      '<strong>' + titulo + '</strong><br>' +
      'Nivel de riesgo: <strong style="color:' + acento + '">' + nivel + '</strong><br>' +
      dias + '<br>' +
      extrasTarget +
      vuln +
      '<span style="display:block;margin-top:3px;color:#5a6068;font-size:11px">' +
        consejo + (consejo ? ' · ' : '') + etiquetaFuente() +
      '</span>' +
      '<button type="button" id="rsClima2050Pdf" style="margin-top:7px;padding:6px 10px;border:1px solid #16181d;border-radius:6px;background:#fff;color:#16181d;font:600 12px system-ui,sans-serif;cursor:pointer">Descargar informe PDF</button>' +
      '</div>';
    // focusAfterOpen:false: en móvil el popup no roba el foco ni hace saltar
    // el scroll de la página al abrirse (la cruz de cierre sigue siendo
    // accesible en escritorio). El toque sobre el mapa lo cierra igual.
    if (!popup) popup = new maplibregl.Popup({
      closeButton: true, closeOnClick: true, maxWidth: '300px', offset: 8,
      focusAfterOpen: false
    });
    popup.setLngLat(e.lngLat).setHTML(html).addTo(mapa);
    // El botón del informe PDF: manejador enganchado al DOM del popup (sin
    // onclick inline). Si algo falla, el popup sigue siendo 100 % usable.
    try {
      var btnPdf = popup.getElement().querySelector('#rsClima2050Pdf');
      if (btnPdf) btnPdf.addEventListener('click', descargarInforme);
    } catch (eBtn) { }
  }

  /* ------------- fuente + capas (solo se añaden, nunca se quita nada) ------------- */

  function instalarCapas() {
    if (!mapa) return;
    try {
      if (!mapa.getSource(FUENTE_ID)) {
        // Con TARGET validado el GeoJSON ya está en memoria (se pasa en
        // línea); con la emulada se usa la URL maestra como siempre.
        mapa.addSource(FUENTE_ID, {
          type: 'geojson',
          data: (fuenteDatos && fuenteDatos.geojson) || urlDatosEfectiva(),
          attribution: atribucionSegunFuente(),
        });
        // SEGURO DE COLORES (nov-2026): si el master ligero trae solo la clave
        // corta 'r', se copia a 'risk_level' al vuelo para que la expresión de
        // relleno nunca se quede sin dato (síntoma: bordes sin relleno).
        // Es idempotente y no modifica geometrías ni la URL del archivo.
        try {
          var fuenteNueva = mapa.getSource(FUENTE_ID);
          if (fuenteNueva && typeof fuenteNueva.setData === 'function') {
            obtenerGeojsonClima().then(function (col) {
              if (!col || !col.features) return;
              var tocado = false;
              col.features.forEach(function (f) {
                var pr = f.properties || (f.properties = {});
                if (pr.risk_level == null && pr.r != null) { pr.risk_level = pr.r; tocado = true; }
                if (pr.municipio == null && pr.m != null) { pr.municipio = pr.m; tocado = true; }
                if (pr.area == null && pr.a != null) { pr.area = pr.a; tocado = true; }
              });
              if (tocado) fuenteNueva.setData(col);
            }).catch(function () { });
          }
        } catch (eSeguro) { }
      }

      // Ancla de orden: debajo de los edificios 3D y de las etiquetas (el
      // diagnóstico es terreno, no cielo). beforeId = primera capa
      // fill-extrusion; si no la hay, la primera de símbolos; si tampoco,
      // encima del todo.
      var antes = null;
      try {
        var capas = (mapa.getStyle() && mapa.getStyle().layers) || [];
        for (var i = 0; i < capas.length; i++) {
          if (capas[i].type === 'fill-extrusion') { antes = capas[i].id; break; }
        }
        if (!antes) {
          for (var j = 0; j < capas.length; j++) {
            if (capas[j].type === 'symbol') { antes = capas[j].id; break; }
          }
        }
      } catch (e) { /* sin estilo aún: el styledata lo reinstalará */ }

      // 1) Relleno coropleta por risk_level (opacidad máxima 0,35, dentro
      //    de cada rgba; por eso fill-opacity queda a 1). Igual para Sevilla,
      //    Mairena, Bollullos y Écija: la pintura solo mira risk_level.
      if (!mapa.getLayer(CAPA_ID)) {
        mapa.addLayer({
          id: CAPA_ID,
          type: 'fill',
          source: FUENTE_ID,
          layout: { visibility: 'none' },
          paint: { 'fill-color': RELLENO_POR_NIVEL, 'fill-opacity': 1 },
        }, antes || undefined);
      }

      // 2) Borde de cada polígono: mismo tono al 0,8 y 1,5 px.
      if (!mapa.getLayer(CAPA_BORDE_ID)) {
        mapa.addLayer({
          id: CAPA_BORDE_ID,
          type: 'line',
          source: FUENTE_ID,
          layout: { visibility: 'none' },
          paint: { 'line-color': BORDE_POR_NIVEL, 'line-width': 1.5, 'line-opacity': 1 },
        }, antes || undefined);
      }

      aplicarVisibilidad();
    } catch (e) { /* estilo a medio cargar: styledata lo reintentará */ }
  }

  /* ---------------- arranque y enganches ---------------- */

  function arrancar(m) {
    if (mapa || !m) return;
    mapa = m;

    // Primero se resuelve la fuente de datos (auto/emulated/target, una sola
    // vez) y DESPUÉS se instalan fuente y capas: así el addSource ya sabe si
    // pinta el GeoJSON TARGET en línea o la URL maestra de siempre.
    resolverFuenteDatos().then(function () {
      instalarCapas();
      pintarBadgeFuente();
    });
    // Cambio de mapa base: el estilo se sustituye entero y hay que
    // reinstalar fuente y capas (mismo enganche que usa lluvia).
    mapa.on('styledata', function () {
      try {
        if (mapa.isStyleLoaded() && !mapa.getSource(FUENTE_ID)) resolverFuenteDatos().then(instalarCapas);
      } catch (e) { }
    });

    // Evento change de la casilla: encendida = coropletas; apagada = todo
    // oculto y el mapa vuelve exactamente a la normalidad.
    var el = toggle();
    if (el) el.addEventListener('change', function () {
      resolverFuenteDatos().then(function () {
        instalarCapas(); // por si el estilo aún no estaba listo al marcar
        aplicarVisibilidad();
        // avoidHeat: al encender, las zonas de riesgo se cargan en segundo
        // plano para que la PRIMERA ruta ya esquive el calor.
        if (encendida()) prepararZonasCalor();
      });
    });

    // i18n re-traduce las etiquetas data-i18n al cambiar de idioma y pisaría
    // el badge de fuente: se vuelve a pintar tras cada cambio.
    document.addEventListener('langChanged', pintarBadgeFuente);

    // Clic y cursor delegados a la capa de relleno: solo se disparan cuando
    // la capa está renderizada (visible), así que con la casilla apagada el
    // mapa no recibe NINGÚN comportamiento nuevo.
    mapa.on('click', CAPA_ID, mostrarPopup);
    mapa.on('mousemove', CAPA_ID, function () {
      try { mapa.getCanvas().style.cursor = 'pointer'; } catch (e) { }
    });
    mapa.on('mouseleave', CAPA_ID, function () {
      try { mapa.getCanvas().style.cursor = ''; } catch (e) { }
    });
  }

  /* ============ enrutado que evita el calor (avoidHeat) ============
     Expone window.__manolitClima2050CosteArista(puntoMedio): factor de
     sobrecoste por unidad de longitud de arista (0 = sin cambio) que el
     Dijkstra térmico de shadows-route.js suma al peso. Solo penalizan las
     zonas de riesgo Alto (2, +50 %) y Crítico (3, +100 %); Bajo y Medio no
     cambian la ruta. Con la casilla apagada o los datos aún sin cargar
     devuelve 0: la ruta por defecto queda byte a byte como antes. */

  var PENALIZACION_POR_NIVEL = { 2: 0.5, 3: 1.0 }; // Alto +50 % · Crítico +100 %
  var zonasCalor = null;        // [{ risk, bbox:[w,s,e,n], multi }] con risk >= 2
  var cargaZonasPromesa = null; // carga perezosa, una sola vez

  // Punto-en-polígono por ray casting (anillos completos), suficiente con
  // GeoJSON planar en grados para penalizar aristas.
  function puntoEnAnillo(lon, lat, anillo) {
    var dentro = false;
    for (var i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      var xi = anillo[i][0], yi = anillo[i][1];
      var xj = anillo[j][0], yj = anillo[j][1];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }
  function puntoEnMulti(lon, lat, multi) {
    for (var p = 0; p < multi.length; p++) {
      var poli = multi[p];
      if (!puntoEnAnillo(lon, lat, poli[0])) continue;
      var enHueco = false;
      for (var k = 1; k < poli.length; k++) {
        if (puntoEnAnillo(lon, lat, poli[k])) { enHueco = true; break; }
      }
      if (!enHueco) return true;
    }
    return false;
  }
  function bboxDeCoords(coords) {
    var w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    (function pasear(c) {
      if (typeof c[0] === 'number') {
        if (c[0] < w) w = c[0]; if (c[0] > e) e = c[0];
        if (c[1] < s) s = c[1]; if (c[1] > n) n = c[1];
      } else { for (var i = 0; i < c.length; i++) pasear(c[i]); }
    })(coords);
    return [w, s, e, n];
  }

  function prepararZonasCalor() {
    if (zonasCalor) return Promise.resolve(zonasCalor);
    if (cargaZonasPromesa) return cargaZonasPromesa;
    // UNA sola descarga: el mismo GeoJSON que pinta el mapa (TARGET en línea
    // si la fuente validó; la URL maestra si sigue emulada).
    cargaZonasPromesa = resolverFuenteDatos().then(obtenerGeojsonClima).then(function (col) {
      zonasCalor = [];
      if (col && col.features) {
        col.features.forEach(function (f) {
          var risk = Number(propiedad(f, 'risk_level'));
          if (!isFinite(risk) || risk < 2 || !f.geometry) return; // solo Alto y Crítico
          var multi = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
          if (!multi || !multi.length) return;
          zonasCalor.push({ risk: risk, bbox: bboxDeCoords(multi), multi: multi });
        });
      }
      return zonasCalor;
    }).catch(function () { zonasCalor = []; return zonasCalor; });
    return cargaZonasPromesa;
  }

  // Hook que consume el Dijkstra de shadows-route.js. Devuelve el MAYOR
  // factor de las zonas que contienen el punto (una arista larga puede
  // cruzar varias; manda la peor).
  window.__manolitClima2050CosteArista = function (puntoMedio) {
    if (!encendida()) return 0;                     // casilla apagada: ruta normal
    if (!puntoMedio || puntoMedio.length < 2) return 0;
    if (!zonasCalor) { prepararZonasCalor(); return 0; } // carga perezosa: la siguiente ruta ya penaliza
    var lon = puntoMedio[0], lat = puntoMedio[1];
    var extra = 0;
    for (var i = 0; i < zonasCalor.length; i++) {
      var z = zonasCalor[i];
      if (lon < z.bbox[0] || lon > z.bbox[2] || lat < z.bbox[1] || lat > z.bbox[3]) continue;
      if (puntoEnMulti(lon, lat, z.multi)) {
        var pen = PENALIZACION_POR_NIVEL[z.risk] || 0;
        if (pen > extra) extra = pen;
      }
    }
    return extra;
  };

  // window.manolitAireMap lo asigna shadows-route.js al crear el mapa. Como
  // este módulo carga detrás en la cadena, casi siempre ya está; si no,
  // unos pocos reintentos cortos y, si no hay mapa, no se hace nada.
  var intentos = 0;
  (function esperarMapa() {
    var m = window.manolitAireMap;
    if (m) { arrancar(m); return; }
    if (++intentos < 40) setTimeout(esperarMapa, 250);
  })();

  // Puente para el enrutamiento: consultará aquí si el modo está activo.
  window.manolitAireClima2050Activa = encendida;
  window.manolitAireClima2050 = true;
})();
