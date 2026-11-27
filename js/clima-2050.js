/* ==========================================================================
   CLIMA 2050 — js/clima-2050.js (módulo aditivo e independiente)
   --------------------------------------------------------------------------
   Mapa de coropletas (choropleth) del riesgo térmico proyectado a 2050.

   Geometría REAL en UN SOLO archivo maestro:
   data/andalucia_clima_2050.geojson (una única petición HTTP), con 536
   polígonos de 3 municipios:
   - Sevilla: 521 secciones censales (INE/IGN, vía ctafur/sevillaGeojson,
     GPL-3.0).
   - Mairena del Aljarafe: 9 áreas estadísticas del PMVS 2024-2029 (32
     secciones INE 41059 agrupadas según el Plan de Movilidad).
   - Bollullos de la Mitación: 6 secciones censales INE (41016), sin
     división oficial de barrios (urbanizaciones vía OSM/Nominatim).
   Cada feature lleva EXACTAMENTE tres propiedades:
   municipio (string), area (string) y risk_level (int 0-3). El riesgo es
   EMULADO (inspirado en Sola-Caraballo et al.; NO son datos reales): el
   nivel de texto y los días >40 °C se derivan aquí, en el cliente, de
   risk_level con la fórmula documentada
   (dias40 = 30 + risk*5 + hash(area)%7), para no duplicar datos.

   Piezas (todas nacen APAGADAS y se encienden juntas con la casilla):
   1) Relleno (fill) coloreado por risk_level con opacidad baja (máx. 0,35):
      el callejero sigue siendo perfectamente legible. Idéntico para los
      tres municipios: la pintura solo mira risk_level.
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
  var DATOS_URL = 'data/andalucia_clima_2050.geojson'; // master: Sevilla + Mairena + Bollullos

  // Paleta por risk_level (0=Bajo … 3=Crítico). Relleno con opacidad baja
  // (máx. 0,35) para no tapar el callejero; borde del mismo tono al 0,8.
  // Misma pintura para TODOS los municipios: solo se lee risk_level.
  var RELLENO_POR_NIVEL = [
    'match', ['get', 'risk_level'],
    0, 'rgba(102, 170, 85, 0.20)',   // Bajo: verde suave
    1, 'rgba(255, 209, 102, 0.25)',  // Medio: amarillo suave
    2, 'rgba(247, 148, 30, 0.30)',   // Alto: naranja
    3, 'rgba(215, 25, 28, 0.35)',    // Crítico: rojo
    'rgba(140, 140, 140, 0.15)'
  ];
  var BORDE_POR_NIVEL = [
    'match', ['get', 'risk_level'],
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

  /* ---------------- informe divulgativo de Clima 2050 ---------------- */
  var jsPdfPromise = null;
  var estadisticasInformePromise = null;
  var estadisticasInformeCache = null;
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

  // El gráfico describe el número de polígonos; no pondera áreas ni población.
  function cargarEstadisticasInforme() {
    if (estadisticasInformeCache) return Promise.resolve(estadisticasInformeCache);
    if (estadisticasInformePromise) return estadisticasInformePromise;
    estadisticasInformePromise = fetch(DATOS_URL).then(function (respuesta) {
      if (!respuesta.ok) throw new Error('No se pudo cargar el GeoJSON de Clima 2050');
      return respuesta.json();
    }).then(function (coleccion) {
      var porMunicipio = {};
      var total = { n: 0, niveles: [0, 0, 0, 0] };
      (coleccion.features || []).forEach(function (feature) {
        var propiedades = feature.properties || {};
        var nivel = Number(propiedades.risk_level);
        if (!isFinite(nivel) || nivel < 0 || nivel > 3 || Math.floor(nivel) !== nivel) return;
        var municipio = String(propiedades.municipio || 'Municipio sin identificar');
        if (!porMunicipio[municipio]) porMunicipio[municipio] = { municipio: municipio, n: 0, niveles: [0, 0, 0, 0] };
        porMunicipio[municipio].n++;
        porMunicipio[municipio].niveles[nivel]++;
        total.n++;
        total.niveles[nivel]++;
      });
      estadisticasInformeCache = {
        total: total,
        municipios: Object.keys(porMunicipio).sort().map(function (nombre) { return porMunicipio[nombre]; })
      };
      if (!total.n) throw new Error('GeoJSON sin polígonos válidos para el resumen estadístico');
      return estadisticasInformeCache;
    }).catch(function () {
      estadisticasInformePromise = null;
      return null;
    });
    return estadisticasInformePromise;
  }

  function porcentajeInforme(n, total) { return total ? Math.round(n * 1000 / total) / 10 : 0; }

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

  function dibujarGraficoPdf(doc, estadisticas, z) {
    var M = 16, ancho = 178, total = estadisticas && estadisticas.total ? estadisticas.total : { n: 0, niveles: [0, 0, 0, 0] };
    var x = M, y = 71, alto = 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(22, 24, 29);
    doc.text('Distribución del GeoJSON por categoría emulada', M, 56);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Unidad de conteo: un polígono (N = ' + total.n + ').', M, 63);
    for (var i = 0; i < COLORES_INFORME.length; i++) {
      var cantidad = total.niveles[i] || 0;
      var anchoSegmento = total.n ? ancho * cantidad / total.n : 0;
      if (anchoSegmento > 0) {
        doc.setFillColor.apply(doc, COLORES_INFORME[i].rgb);
        doc.rect(x, y, anchoSegmento, alto, 'F');
        x += anchoSegmento;
      }
    }
    y += 23;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (var k = 0; k < COLORES_INFORME.length; k++) {
      var nivel = COLORES_INFORME[k];
      var cuenta = total.niveles[k] || 0;
      doc.setFillColor.apply(doc, nivel.rgb);
      doc.rect(M, y - 3, 4, 4, 'F');
      doc.setTextColor(22, 24, 29);
      doc.text(nivel.nombre + ': ' + cuenta + ' polígonos (' + porcentajeInforme(cuenta, total.n) + '%)', M + 8, y);
      y += 8;
    }
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Desglose por municipio', M, y);
    y += 9;
    doc.setFontSize(8);
    doc.text('Municipio', M, y);
    doc.text('N', 103, y, { align: 'right' });
    doc.text('Bajo', 124, y, { align: 'right' });
    doc.text('Medio', 145, y, { align: 'right' });
    doc.text('Alto', 166, y, { align: 'right' });
    doc.text('Crítico', 194, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(220, 223, 228);
    doc.line(M, y, 194, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    var filas = estadisticas && estadisticas.municipios ? estadisticas.municipios : [];
    for (var r = 0; r < filas.length; r++) {
      doc.text(doc.splitTextToSize(filas[r].municipio, 70)[0], M, y);
      doc.text(String(filas[r].n), 103, y, { align: 'right' });
      for (var c = 0; c < 4; c++) doc.text(String(filas[r].niveles[c]), 124 + c * 21, y, { align: 'right' });
      y += 8;
    }
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Lectura de la selección', M, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    var diasZona = z.dias == null ? 'indicador de días no disponible' : z.dias + ' días/año >40 °C (emulado; regla determinista, no predicción)';
    var codigoRiesgo = z.risk == null ? 'sin código' : 'código emulado ' + z.risk + ' de 3';
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
    doc.text('Manolit∞ Aire · estadística descriptiva de datos emulados', M, 286);
    doc.text('Página 2 de 3', 194, 286, { align: 'right' });
  }

  function pintarInformePdf(doc, z, logoPng, estadisticas) {
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
    doc.text('Prototipo cartográfico · indicadores térmicos emulados', 105, 148, { align: 'center' });
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

    doc.addPage('a4', 'portrait');
    doc.setFillColor.apply(doc, tinta);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Resumen estadístico del mapa', margen, 19);
    dibujarGraficoPdf(doc, estadisticas, z);

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
    var diasTxt = z.dias == null ? 'Indicador de días >40 °C: no disponible.' : String(z.dias) + ' días/año >40 °C · EMULADO';
    var lineasDias3 = doc.splitTextToSize(diasTxt, ancho);
    doc.text(lineasDias3, margen, y);
    y += lineasDias3.length * 4.4 + 2;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor.apply(doc, gris);
    var detalle = z.dias == null ? 'No se ha calculado indicador para esta selección; la categoría sigue siendo emulada.' : 'Fórmula del indicador en el cliente: días = 30 + risk_level × 5 + hash(area) mod 7. El hash determinista hace variar el ejemplo según el nombre del área; no representa medición ni variabilidad climática.';
    var lineasDetalle3 = doc.splitTextToSize(detalle, ancho);
    doc.text(lineasDetalle3, margen, y);
    y += lineasDetalle3.length * 3.6 + 3;
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
      ['Unidad espacial y procedencia', 'El GeoJSON reúne 521 secciones censales de Sevilla, 9 áreas estadísticas de Mairena del Aljarafe agrupadas según PMVS 2024–2029 y 6 secciones censales de Bollullos de la Mitación. La unidad cartográfica difiere entre municipios. Geometrías INE/IGN; Sevilla vía ctafur/sevillaGeojson (GPL-3.0); nombres de urbanización en Bollullos vía OpenStreetMap.'],
      ['Método que sí ejecuta el prototipo', 'Cada polígono tiene un risk_level entero de 0 a 3, tratado como clase ordinal emulada. El indicador auxiliar es 30 + nivel × 5 + hash determinista del texto del área mod 7. La referencia a Sola-Caraballo et al. es inspiración; no implica que se haya reproducido, calibrado o validado ese estudio.'],
      ['Estadística presentada', 'La página 2 cuenta polígonos por clase y municipio y calcula porcentajes sobre el total de polígonos válidos cargados. Cada polígono pesa uno, con independencia de su superficie. No equivale a porcentaje de terreno, habitantes expuestos, episodios de calor o riesgo sanitario.'],
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

  function generarHtmlInforme(z, estadisticas) {
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
    var total = estadisticas && estadisticas.total ? estadisticas.total : { n: 0, niveles: [0, 0, 0, 0] };
    var barra = '<div class="barra">';
    var leyenda = '<div class="leyenda">';
    for (var i = 0; i < COLORES_INFORME.length; i++) {
      var cuenta = total.niveles[i] || 0;
      var porcentaje = porcentajeInforme(cuenta, total.n);
      var color = 'rgb(' + COLORES_INFORME[i].rgb.join(',') + ')';
      barra += '<i style="width:' + porcentaje + '%;background:' + color + '"></i>';
      leyenda += '<span><i style="background:' + color + '"></i>' + COLORES_INFORME[i].nombre + ': ' + cuenta + ' (' + porcentaje + '%)</span>';
    }
    barra += '</div>';
    leyenda += '</div>';
    var filas = (estadisticas && estadisticas.municipios ? estadisticas.municipios : []).map(function (fila) {
      return '<tr><td>' + escaparHtml(fila.municipio) + '</td><td>' + fila.n + '</td>' + fila.niveles.map(function (n) { return '<td>' + n + '</td>'; }).join('') + '</tr>';
    }).join('');
    var fecha = escaparHtml(fechaInforme());
    var dias = z.dias == null ? 'No disponible' : z.dias + ' días/año >40 °C (emulado)';
    var tabla = '<table><thead><tr><th>Municipio</th><th>N</th><th>Bajo</th><th>Medio</th><th>Alto</th><th>Crítico</th></tr></thead><tbody>' + filas + '</tbody></table>';
    var lectura = '<p>La gráfica representa la proporción de polígonos por clase, no porcentaje de superficie ni de población expuesta. Cada polígono cuenta una vez, sin ponderación.</p>' + linkSeleccion + '<h2>Desglose territorial</h2>' + tabla + '<div class="ficha"><h2>Área seleccionada</h2><p><b>' + escaparHtml(z.municipio) + ' · ' + escaparHtml(z.area) + '</b></p><p>Clase ordinal: <b>' + escaparHtml(z.nivel) + '</b> · código emulado ' + (z.risk == null ? 'no disponible' : z.risk + ' de 3') + '</p><p>Indicador auxiliar: ' + dias + '. Fórmula: 30 + risk_level × 5 + hash determinista del nombre del área mod 7; no procede de observaciones ni de una proyección climática calibrada.</p></div>';
    var metodologia = '<h1>Metodología, alcance y limitaciones</h1>' +
      '<h2>Unidad espacial y fuentes</h2><p>El archivo maestro reúne 521 secciones censales de Sevilla, 9 áreas estadísticas de Mairena del Aljarafe agrupadas según PMVS 2024–2029 y 6 secciones censales de Bollullos de la Mitación. Las unidades no son idénticas entre municipios. Geometrías INE/IGN; Sevilla vía ctafur/sevillaGeojson (GPL-3.0); nombres de urbanización en Bollullos vía OpenStreetMap.</p>' +
      '<h2>Método implementado</h2><p>El GeoJSON contiene un risk_level de 0 a 3, interpretado como categoría ordinal emulada. Los días auxiliares se calculan con 30 + nivel × 5 + hash determinista del texto del área mod 7. La mención de Sola-Caraballo et al. es inspiración general; este módulo no reproduce ni calibra ese estudio.</p>' +
      '<h2>Límites de inferencia</h2><p>No se aportan aquí observaciones meteorológicas, periodo base, series temporales, escenarios regionalizados, resolución temporal, modelo de temperatura urbana, validación independiente, calibración, errores ni intervalos de incertidumbre. Los días no son una predicción para 2050. La clase no representa °C ni probabilidad, y no incorpora población, salud, sombra real o vulnerabilidad.</p>' +
      '<h2>Uso para entidades públicas</h2><p>Material de divulgación y exploración preliminar para ayuntamientos, entidades públicas y equipos técnicos; puede ayudar a formular preguntas y planificar mediciones. No debe ser base única de inversiones, alertas o diagnóstico. Contrastar con observaciones y evaluación profesional.</p>' +
      '<h2>Requisitos de evaluación científica</h2><p>Definir variable y periodo; recopilar mediciones con control de calidad; documentar escenarios climáticos regionalizados y periodo de referencia; calibrar y validar con datos independientes; comunicar incertidumbre y error; incorporar exposición y vulnerabilidad con protección de privacidad; publicar método y versión reproducibles.</p>' +
      '<p class="aviso"><b>Conclusión:</b> prototipo educativo. Geometría territorial identificada; indicadores térmicos emulados. No es proyección climática, alerta oficial ni estudio técnico de riesgo.</p>';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe Clima 2050</title><style>' +
      'html{background:#f2f4f7}body{margin:0;color:#16181d;font:14px/1.5 system-ui,sans-serif}.barra-acciones{position:sticky;top:0;z-index:2;display:flex;justify-content:center;gap:10px;padding:10px;background:#16181d}.barra-acciones button{min-height:44px;padding:10px 18px;border:1px solid #647080;border-radius:8px;background:#202631;color:white;font:600 14px system-ui,sans-serif;cursor:pointer}.pagina{box-sizing:border-box;width:min(210mm,100%);min-height:297mm;padding:15mm 16mm;margin:12px auto;background:#fff;box-shadow:0 3px 18px #0002;break-after:page}.portada{background:#16181d;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.portada .logo-manolit{display:block;width:min(145mm,100%);height:auto;aspect-ratio:650/370;max-height:90mm}.portada h1{font-size:28px;margin:14px 0 5px}.sub,.meta{color:#c4cfdb}.ficha{border:1px solid #d5dae0;border-radius:8px;padding:14px;margin-top:16px}.badge{display:inline-block;color:white;background:' + escaparHtml(z.acento) + ';padding:4px 10px;border-radius:5px;font-weight:700}.barra{height:18px;display:flex;margin:14px 0 10px;border-radius:4px;overflow:hidden}.barra i{height:100%}.leyenda{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:14px}.leyenda i{display:inline-block;width:10px;height:10px;margin-right:6px}table{width:100%;border-collapse:collapse;margin:10px 0 14px;font-size:12px}td,th{text-align:right;border-bottom:1px solid #d9dee4;padding:6px 4px}td:first-child,th:first-child{text-align:left;overflow-wrap:anywhere}h1{font-size:22px}h2{font-size:15px;margin:15px 0 6px}.aviso{border:1px solid #707b86;padding:10px;border-radius:6px;margin-top:14px}.pie{margin-top:18px;border-top:1px solid #d9dee4;padding-top:8px;color:#69717b;font-size:11px}@media(max-width:600px){.barra-acciones{position:static}.pagina{width:100%;min-height:0;padding:22px 18px;margin:0 auto 12px;box-shadow:none}.portada{min-height:calc(100svh - 64px)}.portada .logo-manolit{width:min(100%,480px);height:auto;max-height:34svh}.portada h1{font-size:clamp(23px,7vw,30px)}.leyenda{grid-template-columns:1fr 1fr}table{font-size:10.5px}td,th{padding:6px 2px}h1{font-size:21px}h2{font-size:15px}}@page{size:A4;margin:0}@media print{html,body{background:#fff}.barra-acciones{display:none!important}.pagina{width:210mm;min-height:297mm;margin:0;padding:16mm;background:#fff;box-shadow:none;break-after:page}.portada{background:#16181d!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.badge,.barra i{ -webkit-print-color-adjust:exact;print-color-adjust:exact}.pagina:last-child{break-after:auto}}</style></head><body>' +
      '<nav class="barra-acciones" aria-label="Acciones del informe"><button type="button" id="imprimirInformeClima2050">Imprimir / Guardar como PDF</button><button type="button" id="cerrarInformeClima2050">Cerrar</button></nav>' +
      '<section class="pagina portada">' + logo + '<h1>Informe Clima 2050</h1><p>Prototipo cartográfico · indicadores térmicos emulados</p><div class="ficha"><p>' + escaparHtml(z.municipio) + '</p><h2>' + escaparHtml(z.area) + '</h2><span class="badge">CLASE ' + escaparHtml(z.nivel.toUpperCase()) + '</span></div><p class="meta">' + fecha + '</p><p class="meta">No es una proyección climática validada ni una alerta oficial.</p></section>' +
      '<section class="pagina"><h1>Resumen estadístico del mapa</h1><p>N=' + total.n + ' polígonos. Distribución por clase ordinal emulada.</p>' + barra + leyenda + lectura + '<p class="pie">Los recuentos no equivalen a porcentaje de superficie, habitantes expuestos ni probabilidad.</p></section>' +
      '<section class="pagina"><h1>Ficha de zona y metodología</h1><p><b>' + escaparHtml(z.municipio) + ' · ' + escaparHtml(z.area) + '</b></p><p>Clase ordinal emulada: ' + escaparHtml(z.nivel) + ' (' + (z.risk == null ? 'código no disponible' : z.risk + ' de 3') + ').</p><p>' + dias + '</p><p>Indicador determinista: 30 + nivel × 5 + hash(área) mod 7; no procede de registros meteorológicos ni de predicción validada.</p><h2>Leyenda cualitativa</h2><p>Bajo (0) · Medio (1) · Alto (2) · Crítico (3). El nivel es ordinal, no grados Celsius.</p>' + (linkSeleccion || '') + metodologia + '<p class="pie">Generado por Manolit∞ Aire · ' + fecha + '</p></section></body></html>';
  }

  function imprimirRespaldoInforme(zona, ventana) {
    cargarEstadisticasInforme().then(function (estadisticas) {
      if (!estadisticas) throw new Error('No se pudieron obtener los recuentos del GeoJSON');
      ventana.document.open();
      ventana.document.write(generarHtmlInforme(zona, estadisticas));
      ventana.document.close();
      ventana.focus();
      var botonImprimir = ventana.document.getElementById('imprimirInformeClima2050');
      var botonCerrar = ventana.document.getElementById('cerrarInformeClima2050');
      if (botonImprimir) botonImprimir.addEventListener('click', function () { try { ventana.focus(); ventana.print(); } catch (error) { } });
      if (botonCerrar) botonCerrar.addEventListener('click', function () { try { ventana.close(); } catch (error) { } });
    }).catch(function () {
      try { ventana.close(); } catch (error) { }
      try { window.alert('No se pudo construir el informe: comprueba la conexión con el archivo de Clima 2050 e inténtalo de nuevo.'); } catch (error) { }
    });
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
    var datosPromise = cargarEstadisticasInforme();
    Promise.all([cargarJsPdf(), svgMarcaComoPng(obtenerSvgMarca()), datosPromise]).then(function (recursos) {
      if (!recursos[2]) throw new Error('No se pudieron obtener los recuentos del GeoJSON');
      var Ctor = recursos[0];
      var doc = new Ctor({ unit: 'mm', format: 'a4' });
      pintarInformePdf(doc, zona, recursos[1], recursos[2]);
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
      : 'Municipio sin identificar';
    var area = (p.area != null && String(p.area).length)
      ? String(p.area)
      : 'Zona sin identificar';
    // Una selección nueva invalida cualquier área anterior.
    ultimaZona = null;
    // El master solo lleva risk_level: nivel y días se derivan aquí, con
    // lectura robusta (nunca sale vacío). risk fuera de 0-3 cae en '—'.
    var risk = (p.risk_level != null && isFinite(Number(p.risk_level))) ? Number(p.risk_level) : null;
    var nivelInfo = (risk != null && risk >= 0 && risk <= 3) ? NIVELES[risk] : null;
    var nivel = nivelInfo ? nivelInfo.texto : '—';
    var diasNum = nivelInfo ? 30 + risk * 5 + (hashTexto(area) % 7) : null;
    var acento = nivelInfo ? nivelInfo.acento : '#888';
    // Título unificado: "Municipio - Area" (formato del Paso 3).
    var titulo = municipio + ' - ' + area;
    // Línea de días: número + lectura ciudadana, en una sola línea.
    var dias = (diasNum != null)
      ? '<strong>' + diasNum + '</strong> días al año a más de 40 °C: ' +
        nivelInfo.interpretacion
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
      centro: e.lngLat ? [Number(e.lngLat.lng), Number(e.lngLat.lat)] : null
    };
    // Color de texto EXPLÍCITO y oscuro (#16181d): el popup de MapLibre es
    // blanco y, sin esto, heredaba el color claro del tema oscuro de FUERA
    // del mapa y el texto quedaba invisible. Mapa y página son independientes.
    var html = '<div style="font:13px/1.55 system-ui,sans-serif;min-width:200px;max-width:280px;color:#16181d">' +
      '<strong>' + titulo + '</strong><br>' +
      'Nivel de riesgo: <strong style="color:' + acento + '">' + nivel + '</strong><br>' +
      dias + '<br>' +
      '<span style="display:block;margin-top:3px;color:#5a6068;font-size:11px">' +
        consejo + (consejo ? ' · ' : '') + 'Riesgo 2050 (emulado)' +
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
        // Archivo maestro: UNA petición HTTP para los 3 municipios.
        mapa.addSource(FUENTE_ID, {
          type: 'geojson',
          data: DATOS_URL,
          attribution: 'Secciones censales INE/IGN · PMVS Mairena 2024-2029 · riesgo 2050 emulado',
        });
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
      //    Mairena y Bollullos: la pintura solo mira risk_level.
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

    // Las dos capas nacen con la casilla apagada (visibility 'none').
    instalarCapas();
    // Cambio de mapa base: el estilo se sustituye entero y hay que
    // reinstalar fuente y capas (mismo enganche que usa lluvia).
    mapa.on('styledata', function () {
      try {
        if (mapa.isStyleLoaded() && !mapa.getSource(FUENTE_ID)) instalarCapas();
      } catch (e) { }
    });

    // Evento change de la casilla: encendida = coropletas; apagada = todo
    // oculto y el mapa vuelve exactamente a la normalidad.
    var el = toggle();
    if (el) el.addEventListener('change', function () {
      instalarCapas(); // por si el estilo aún no estaba listo al marcar
      aplicarVisibilidad();
      // avoidHeat: al encender, las zonas de riesgo se cargan en segundo
      // plano para que la PRIMERA ruta ya esquive el calor.
      if (encendida()) prepararZonasCalor();
    });

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
    // UNA sola descarga: el propio archivo maestro que pinta el mapa.
    cargaZonasPromesa = fetch(DATOS_URL).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (col) {
      zonasCalor = [];
      if (col && col.features) {
        col.features.forEach(function (f) {
          var risk = Number(f.properties && f.properties.risk_level);
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
