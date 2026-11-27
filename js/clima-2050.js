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
      consejo: consejo
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
