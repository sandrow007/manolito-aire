/* ============================================================================
   aparcamientos-viaje.js. APARCAMIENTOS + PLANIFICADOR DE VIAJE de Manolit∞
   (ADITIVO, 07-oct-2026, orden directa de -: TODO en UN solo archivo)
   ----------------------------------------------------------------------------
   - Nada de lo existente se toca. Este módulo se engancha al mapa por el
     hook público window.manolitAireMap (el mismo que usa arboles-3d.js) y
     los dos bloques se hablan por API pública y CustomEvents.
   - BLOQUE 1, aparcamientos: Overpass (amenity=parking) por el proxy
     same-origin /aparcamientos del worker, SIEMPRE por el bbox visible
     (lado máximo 3 km, nunca la ciudad entera). Clasificación por
     etiquetas OSM con cinco colores: parking=surface|multi-storey|
     underground, access=public|private|customers, fee=yes|no. Caché
     ligera en cliente por celda (30 min). Si el motor de sombras está
     encendido, los parkings cubiertos por un polígono de la fuente
     'sombras' llevan anillo teal (lectura solamente, jamás escritura).
   - BLOQUE 2, viaje largo: origen y destino con ciudades lejanas por el
     proxy /geo (Nominatim), tramo de carretera por OSRM perfil coche en
     el proxy /ruta-coche/ (servidor FOSSGIS), SIN cálculo de sombra en
     carretera. Primero se encuadra la ruta entera para que se vea, y a
     los pocos segundos la llegada centra el destino, enciende la capa de
     aparcamientos y, si estaba apagado, enciende el motor de sombras.
   - APIs públicas:
       window.manolitoParking .alternar() .activar() .desactivar()
                              .estaActivo() .activarEn(lat, lon)
       window.manolitoViaje   .planificar(origen, destino) .limpiar()
     Eventos aceptados: 'manolito:activar-parking' (detail {lat, lon}?),
     'manolito:planificar-viaje' (detail {origen, destino}).
     Evento emitido: 'manolito:parking-cambiado' (detail {activo}).
   - Licencia: AGPL-3.0 como el resto del proyecto.
   - ARREGLO URGENTE 08-oct-2026 (orden de -, «el parking choca con
     sombras»): querySourceFeatures fuera de TODA la lectura de datos.
     Esa llamada trocea por tiles y devolvía cero o un recorte, así que
     cada recálculo del motor de sombras vaciaba los puntos y los
     anillos teal no salían jamás. Ahora el geojson íntegro vive en
     parking.datosActuales y las sombras se leen completas con
     _data/serialize() de 'sombras' y 'arboles-globales-sombra'. Además
     las capas llevan minzoom 12,5: aparecen AL ACERCARTE, rollo
     edificios 3D, y de lejos ni se piden datos.
   ========================================================================== */
(function () {
  'use strict';

  if (window.__manolitoParkingViaje) return; // doble carga: jamás
  window.__manolitoParkingViaje = true;

  var CONFIG = {
    overpassUrl: '/aparcamientos',
    osrmCocheUrl: '/ruta-coche',
    geoUrl: '/geo',
    timeoutS: 15,
    timeoutViajeMs: 20000,
    esperaMoveendMs: 700,
    esperaSombraMs: 900,
    esperaLlegadaMs: 2600,
    maxLadoConsultaKm: 3,
    cacheCeldasGrados: 0.01,
    cacheClienteMs: 30 * 60 * 1000,
    maxPuntos: 300,
    zoomLlegada: 14.5,
    // 08-oct-2026 (orden de -, arreglo urgente): los puntos aparecen
    // AL ACERCARTE, a la distancia a la que saltan los edificios 3D del
    // estilo (minzoom ~13). Un pelo antes (12,5) para que ya te estén
    // esperando cuando el edificio se levanta.
    zoomMinParking: 12.5,
  };

  // Colores por combinación tipo/acceso/precio. Pensados para leerse igual
  // de bien en mapa claro, IGN y mapa oscuro.
  var COLORES = {
    superficieGratis: '#2E9E5B', // verde
    superficiePago: '#E0A32E',   // ámbar
    cubierto: '#3E7CB1',         // azul
    subterraneo: '#7C6BD6',      // violeta
    restringido: '#8A939E',      // gris (privado o solo clientes)
  };
  var COLOR_SOMBRA = '#0C7F8D'; // teal Manolit∞, el anillo de sombra

  var map = null;

  /* ---------------- Utilidades compartidas -------------------------------- */
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

  function escaparHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function estiloListo() {
    try { return !map.isStyleLoaded || map.isStyleLoaded(); } catch (e) { return false; }
  }

  /* ==========================================================================
     BLOQUE 1. APARCAMIENTOS
     ========================================================================== */
  var parking = {
    activo: false,
    btn: null,
    cache: new Map(), // clave celda → { ts, geojson }
    peticion: null,
    temporizadorMove: null,
    temporizadorSombra: null,
    popup: null,
    // 09-oct-2026 (orden de -): qué parking tiene el popup abierto y
    // el temporizador dormido hasta el próximo orto/ocaso (sin bucles).
    popupFeatureId: null,
    temporizadorSolPopup: null,
    // 08-oct-2026 (arreglo urgente): copia ÍNTEGRA del último geojson
    // pintado. reevaluarSombraActual trabaja sobre esta copia y jamás
    // reconstruye con querySourceFeatures, que por tiles devolvía cero o
    // solo lo visible y BORRABA los puntos en cada recálculo de sombras.
    datosActuales: null,
  };

  function clasificarParking(tags) {
    tags = tags || {};
    var tipo = 'superficie';
    if (tags.parking === 'underground') tipo = 'subterraneo';
    else if (tags.parking === 'multi-storey' || tags.parking === 'shed' || tags.parking === 'carports') tipo = 'cubierto';

    var acceso = 'publico';
    if (tags.access === 'private' || tags.access === 'no') acceso = 'privado';
    else if (tags.access === 'customers' || tags.access === 'permissive') acceso = 'clientes';

    var precio = 'desconocido';
    if (tags.fee === 'yes') precio = 'pago';
    else if (tags.fee === 'no') precio = 'gratis';

    var color;
    if (acceso !== 'publico') color = COLORES.restringido;
    else if (tipo === 'subterraneo') color = COLORES.subterraneo;
    else if (tipo === 'cubierto') color = COLORES.cubierto;
    else color = (precio === 'gratis') ? COLORES.superficieGratis : COLORES.superficiePago;

    return { tipo: tipo, acceso: acceso, precio: precio, color: color };
  }

  function textoTipo(tipo) {
    if (tipo === 'subterraneo') return t('parkingTypeUnderground', 'Subterráneo');
    if (tipo === 'cubierto') return t('parkingTypeCovered', 'Cubierto');
    return t('parkingTypeSurface', 'En la calle');
  }
  function textoAcceso(acceso) {
    if (acceso === 'privado') return t('parkingAccessPrivate', 'Privado');
    if (acceso === 'clientes') return t('parkingAccessCustomers', 'Solo clientes');
    return t('parkingAccessPublic', 'Público');
  }
  function textoPrecio(precio) {
    if (precio === 'pago') return t('parkingFeeYes', 'De pago');
    if (precio === 'gratis') return t('parkingFeeNo', 'Gratis');
    return t('parkingFeeUnknown', 'Precio sin dato');
  }

  /* ---------------- Sol o sombra en el popup: la verdad o nada -----------
     09-oct-2026 (orden directa de -, «de noche no hay sol y la app no
     inventa»): la frase de sol del popup sale SIEMPRE de esta cadena.
       1) De noche (lo decide js/sol.js con SunCalc y la hora REAL, nunca
          la del slider de simulación) → «Ahora es de noche, sin sol».
       2) Cubierto o subterráneo según las etiquetas reales de OSM → nunca
          «al sol»: tiene techo, así que «Con sombra ahora».
       3) Si el slider está simulando otra hora, las sombras pintadas no
          son las de ahora → «No se puede saber».
       4) De día y con dato real del motor de sombras → sol o sombra.
       5) Cualquier otra situación → «No se puede saber». No se adivina. */
  function lineaSolParking(p, coords) {
    var haySol = (window.manolitHaySol && coords && coords.length >= 2)
      ? window.manolitHaySol(coords[1], coords[0])
      : null;
    if (haySol === false) return t('parkingNightNow', 'Ahora es de noche, sin sol');
    if (p.tipo === 'subterraneo' || p.tipo === 'cubierto') return t('parkingShadeNow', 'Con sombra ahora');
    try {
      if (window.manolitAireSimulando && window.manolitAireSimulando()) return t('parkingSunUnknown', 'No se puede saber');
    } catch (e) { /* sigue */ }
    if (haySol === true && p.sombra === true) return t('parkingShadeNow', 'Con sombra ahora');
    if (haySol === true && p.sombra === false) return t('parkingNoShade', 'Al sol ahora');
    return t('parkingSunUnknown', 'No se puede saber');
  }

  /* Iconografía propia en SVG: no se usan emojis ni iconos tipográficos. */
  function svgIconoParking(tipo, tamano, color) {
    var size = tamano || 24;
    var tinta = color || 'currentColor';
    var dibujos = {
      garaje: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M8 21v-7h8v7M8 11.5h8"/><path d="M9 16h6"/>',
      sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77m10.6 10.6 1.77 1.77M2 12h2.5m15 0H22M4.93 19.07l1.77-1.77m10.6-10.6 1.77-1.77"/>',
      sombra: '<path d="M4 14.5a5.5 5.5 0 0 1 10.8-1.4A4.2 4.2 0 1 1 16.5 21H8a6 6 0 0 1-4-6.5Z"/><path d="M4 3v5M1.5 5.5h5M3 4l4 4"/>',
      plazas: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/>',
      precio: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-1-1.7-1.5-3-1.5-1.7 0-3 1-3 2.5S10.3 12 12 12s3 1 3 2.5S13.7 17 12 17c-1.3 0-2.3-.5-3-1.5M12 5v14"/>',
      reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
      luna: '<path d="M19.5 15.5A8 8 0 0 1 8.5 4.5 8.5 8.5 0 1 0 19.5 15.5Z"/>',
      pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>',
      flecha: '<path d="M4 12h15M13 5l7 7-7 7"/>',
    };
    return '<svg aria-hidden="true" focusable="false" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + tinta + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (dibujos[tipo] || dibujos.garaje) + '</svg>';
  }

  function instalarEstilosPopupParking() {
    if (document.getElementById('manolito-parking-results-style')) return;
    var style = document.createElement('style');
    style.id = 'manolito-parking-results-style';
    style.textContent = `
      .maplibregl-popup.mp-parking-popup{z-index:1200;max-width:calc(100vw - 20px)!important}
      .maplibregl-popup.mp-parking-popup .maplibregl-popup-content{padding:0;border:1px solid #d3e1e5;border-radius:15px;overflow:hidden;box-shadow:0 14px 38px rgba(17,42,52,.23);background:#fff;max-width:calc(100vw - 20px);}
      .maplibregl-popup.mp-parking-popup .maplibregl-popup-close-button{z-index:3;right:7px;top:7px;width:29px;height:29px;border-radius:50%;font-size:21px;line-height:27px;color:#42535b;background:#edf4f6}
      .mp-parking-results{width:620px;max-width:calc(100vw - 22px);max-height:min(78vh, 660px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;font:14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1a2830;background:#fff;box-sizing:border-box}
      .mp-parking-results *{box-sizing:border-box}
      .mp-results-title{padding:13px 42px 11px 16px;background:#f7fbfc;border-bottom:1px solid #e3ecef;font-size:14px;font-weight:750;letter-spacing:.01em;color:#263c46}
      .mp-parking-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(190px,.9fr);min-width:0}
      .mp-selected-parking{padding:14px;min-width:0}
      .mp-parking-heading{display:flex;align-items:flex-start;gap:11px;min-width:0}
      .mp-parking-symbol{display:flex;align-items:center;justify-content:center;flex:0 0 65px;width:65px;height:65px;border-radius:10px;background:#eaf2f7;color:#264f67;border:1px solid #dbe7ee}
      .mp-parking-copy{min-width:0;padding-top:1px}
      .mp-parking-name{font-size:18px;line-height:1.2;font-weight:800;overflow-wrap:anywhere;color:#142a35;margin:0 0 4px}
      .mp-parking-type{font-size:13px;color:#4a5c65;margin-bottom:2px}
      .mp-parking-meta{font-size:12px;color:#65757d}
      .mp-parking-status{display:flex;align-items:center;gap:9px;margin:13px -14px 0;padding:10px 14px;border-top:1px solid #e1ece8;border-bottom:1px solid #e1ece8;background:#eaf8f0;color:#236f50;min-height:49px}
      .mp-parking-status strong{display:block;font-size:14px;line-height:1.25}
      .mp-parking-status span{display:block;font-size:11px;opacity:.92;margin-top:2px}
      .mp-parking-status.is-sun{background:#fff7de;border-color:#f2e7bf;color:#855c06}
      .mp-parking-status.is-unknown{background:#f1f5f7;border-color:#e1e8eb;color:#566770}
      .mp-parking-data{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:13px;padding:13px 0 2px}
      .mp-parking-data-item{display:flex;align-items:flex-start;gap:8px;min-width:0;color:#36515f}
      .mp-parking-data-item strong{display:block;font-size:12px;font-weight:750;color:#344953}
      .mp-parking-data-item span{display:block;font-size:12px;color:#687a82;overflow-wrap:anywhere;margin-top:2px}
      .mp-parking-footer{border-top:1px solid #e9eff1;margin-top:12px;padding-top:10px;display:flex;align-items:flex-start;justify-content:space-between;gap:9px;font-size:11px;color:#647780}
      .mp-parking-footer strong{color:#425760}
      .mp-parking-options{padding:13px 12px;background:#fbfcfd;border-left:1px solid #e2eaed;min-width:0}
      .mp-options-title{font-size:12px;font-weight:800;color:#52636b;text-transform:uppercase;letter-spacing:.035em;margin:0 0 8px}
      .mp-parking-option{appearance:none;display:flex;width:100%;min-width:0;align-items:flex-start;gap:9px;text-align:left;padding:9px 0;border:0;border-bottom:1px solid #e3e9ec;background:transparent;color:inherit;cursor:pointer;font:inherit;border-radius:0}
      .mp-parking-option:last-child{border-bottom:0}
      .mp-parking-option:focus-visible{outline:2px solid #0c7f8d;outline-offset:2px;border-radius:6px}
      .mp-parking-option:hover .mp-option-name{color:#0c7180;text-decoration:underline}
      .mp-option-symbol{display:flex;align-items:center;justify-content:center;flex:0 0 43px;width:43px;height:43px;border-radius:8px;background:#edf4f7;border:1px solid #e1eaed;color:#36596b}
      .mp-option-copy{min-width:0;flex:1}
      .mp-option-name{display:block;font-size:13px;line-height:1.25;font-weight:750;color:#203944;overflow-wrap:anywhere}
      .mp-option-type{display:block;font-size:11px;color:#63757d;margin-top:3px}
      .mp-option-status{display:flex;align-items:center;gap:4px;font-size:11px;margin-top:4px;color:#37795a}
      .mp-option-status.is-sun{color:#966d11}.mp-option-status.is-unknown{color:#708089}
      .mp-option-distance{font-size:10px;color:#819098;white-space:nowrap;margin-top:2px}
      .mp-no-options{font-size:12px;line-height:1.5;color:#77868d;padding:8px 0}
      @media(max-width:580px){
        .mp-parking-results{width:calc(100vw - 22px);max-width:calc(100vw - 22px);max-height:min(72vh, 560px);max-height:min(72dvh, 560px)}
        .mp-results-title{padding:11px 40px 10px 12px;font-size:13px}
        .mp-parking-grid{grid-template-columns:minmax(0,1fr)}
        .mp-selected-parking{padding:12px}
        .mp-parking-symbol{flex-basis:54px;width:54px;height:54px}
        .mp-parking-name{font-size:16px}
        .mp-parking-status{margin-left:-12px;margin-right:-12px;padding:9px 12px}
        .mp-parking-data{gap:10px}
        .mp-parking-options{border-left:0;border-top:1px solid #e2eaed;padding:11px 12px}
        .mp-options-title{margin-bottom:5px}
        .mp-parking-option{padding:7px 0}
        .mp-option-symbol{flex-basis:39px;width:39px;height:39px}
      }
      @media(prefers-reduced-motion:no-preference){.mp-parking-option{transition:color .15s ease,background .15s ease}}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function distanciaParkingKm(a, b) {
    if (!a || !b || a.length < 2 || b.length < 2) return Infinity;
    var rad = Math.PI / 180;
    var dLat = (b[1] - a[1]) * rad;
    var dLon = (b[0] - a[0]) * rad;
    var lat1 = a[1] * rad, lat2 = b[1] * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  }

  function estadoVisualParking(p, coords) {
    var texto = lineaSolParking(p, coords);
    var lower = String(texto || '').toLowerCase();
    var clase = 'is-unknown', icono = 'reloj';
    if (/noche|sin sol/.test(lower)) { clase = 'is-unknown'; icono = 'luna'; }
    else if (/sombra|cubierto|subterráneo|subterraneo/.test(lower)) { clase = 'is-shade'; icono = 'sombra'; }
    else if (/al sol/.test(lower)) { clase = 'is-sun'; icono = 'sol'; }
    return { texto: texto, clase: clase, icono: icono };
  }

  function obtenerAlternativasParking(p, coords) {
    var feats = parking.datosActuales && parking.datosActuales.features || [];
    return feats.filter(function (f) {
      // El bloque «Otras opciones» solo recomienda parkings clasificados
      // como públicos y con una ubicación utilizable; no presenta los
      // privados o solo para clientes como alternativas generales.
      return f && f.properties && f.properties.osmId && f.properties.osmId !== p.osmId &&
        f.properties.acceso === 'publico' && f.geometry && f.geometry.type === 'Point' &&
        Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length >= 2 &&
        isFinite(f.geometry.coordinates[0]) && isFinite(f.geometry.coordinates[1]);
    }).map(function (f) {
      return { feature: f, distancia: distanciaParkingKm(coords, f.geometry.coordinates) };
    }).filter(function (item) {
      // Evita llamar «cercano» a un parking que queda lejos del punto elegido.
      return isFinite(item.distancia) && item.distancia <= 3;
    }).sort(function (a, b) { return a.distancia - b.distancia; }).slice(0, 3);
  }

  function htmlPopupParking(p, coords) {
    var estado = estadoVisualParking(p, coords);
    var alternativas = obtenerAlternativasParking(p, coords);
    var capacidad = p.capacidad ? escaparHtml(p.capacidad) + ' plazas registradas' : 'No indicada en el mapa';
    var tarifa = p.tarifa ? escaparHtml(p.tarifa) : (p.precio === 'pago' ? 'Tarifa no indicada' : (p.precio === 'gratis' ? 'Sin coste según los datos del mapa' : 'Sin dato'));
    var horario = p.horario ? escaparHtml(p.horario) : 'No indicado';
    var opcionesHtml = alternativas.map(function (item) {
      var f = item.feature, q = f.properties, c = f.geometry.coordinates;
      var sol = estadoVisualParking(q, c);
      var distancia = isFinite(item.distancia) ? (item.distancia < 1 ? Math.round(item.distancia * 1000) + ' m' : (Math.round(item.distancia * 10) / 10).toString().replace('.', ',') + ' km') : '';
      var iconTipo = (q.tipo === 'subterraneo' || q.tipo === 'cubierto') ? 'garaje' : 'pin';
      return '<button type="button" class="mp-parking-option" data-parking-id="' + escaparHtml(q.osmId) + '" aria-label="Ver ' + escaparHtml(q.nombre || 'aparcamiento') + '">' +
        '<span class="mp-option-symbol">' + svgIconoParking(iconTipo, 24, '#36596b') + '</span>' +
        '<span class="mp-option-copy"><span class="mp-option-name">' + escaparHtml(q.nombre || t('parkingName', 'Aparcamiento')) + '</span>' +
        '<span class="mp-option-type">' + escaparHtml(textoTipo(q.tipo)) + ' · ' + escaparHtml(textoPrecio(q.precio)) + '</span>' +
        '<span class="mp-option-status ' + sol.clase + '">' + svgIconoParking(sol.icono, 13, 'currentColor') + '<span>' + escaparHtml(sol.texto) + '</span></span></span>' +
        (distancia ? '<span class="mp-option-distance">' + escaparHtml(distancia) + '</span>' : '') + '</button>';
    }).join('');
    if (!opcionesHtml) opcionesHtml = '<div class="mp-no-options">No hay otras opciones públicas registradas a menos de 3 km.</div>';

    var descripcionEstado = estado.clase === 'is-shade' ? 'Dato calculado con las capas de sombra del mapa' : (estado.clase === 'is-sun' ? 'Sin sombra detectada en este punto' : 'La información de sombra puede no estar disponible');
    return '<section class="mp-parking-results" aria-label="Resultados de búsqueda de parking">' +
      '<div class="mp-results-title">' + escaparHtml(t('parkingSearchResults', 'Resultados de búsqueda de parking')) + '</div>' +
      '<div class="mp-parking-grid"><section class="mp-selected-parking" aria-label="Aparcamiento seleccionado">' +
      '<div class="mp-parking-heading"><span class="mp-parking-symbol">' + svgIconoParking('garaje', 43, '#244c64') + '</span>' +
      '<div class="mp-parking-copy"><h3 class="mp-parking-name">' + escaparHtml(p.nombre || t('parkingName', 'Aparcamiento')) + '</h3>' +
      '<div class="mp-parking-type">' + escaparHtml(textoTipo(p.tipo)) + '</div><div class="mp-parking-meta">' + escaparHtml(textoAcceso(p.acceso)) + ' · ' + escaparHtml(textoPrecio(p.precio)) + '</div></div></div>' +
      '<div class="mp-parking-status ' + estado.clase + '">' + svgIconoParking(estado.icono, 24, 'currentColor') + '<div><strong>' + escaparHtml(estado.texto) + '</strong><span>' + escaparHtml(descripcionEstado) + '</span></div></div>' +
      '<div class="mp-parking-data"><div class="mp-parking-data-item">' + svgIconoParking('plazas', 22, '#537481') + '<div><strong>Capacidad</strong><span>' + capacidad + '</span></div></div>' +
      '<div class="mp-parking-data-item">' + svgIconoParking('precio', 22, '#537481') + '<div><strong>Precio</strong><span>' + tarifa + '</span></div></div></div>' +
      '<div class="mp-parking-footer"><span><strong>Acceso:</strong> ' + escaparHtml(textoAcceso(p.acceso)) + '</span><span><strong>Horario:</strong> ' + horario + '</span></div>' +
      '</section><aside class="mp-parking-options" aria-label="Otras opciones"><h4 class="mp-options-title">' + escaparHtml(t('parkingOtherOptions', 'Otras opciones')) + '</h4>' + opcionesHtml + '</aside></div></section>';
  }

  function conectarEventosAlternativasPopup() {
    if (!parking.popup) return;
    var raiz = parking.popup.getElement();
    if (!raiz) return;
    raiz.classList.add('mp-parking-popup');
    // El contenido es desplazable en móvil. Estos eventos no deben llegar
    // al mapa, porque podrían moverlo o cambiar el zoom mientras se lee.
    if (!raiz.__manolitoParkingGestos) {
      ['wheel', 'touchstart', 'touchmove'].forEach(function (tipo) {
        raiz.addEventListener(tipo, function (e) { e.stopPropagation(); }, { passive: true });
      });
      raiz.__manolitoParkingGestos = true;
    }
    var botones = raiz.querySelectorAll('[data-parking-id]');
    Array.prototype.forEach.call(botones, function (boton) {
      boton.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = boton.getAttribute('data-parking-id');
        var feats = parking.datosActuales && parking.datosActuales.features || [];
        for (var i = 0; i < feats.length; i++) {
          if (feats[i].properties && feats[i].properties.osmId === id) {
            abrirPopupParking(feats[i]);
            break;
          }
        }
      });
    });
  }

  function abrirPopupParking(feature) {
    if (!map || !feature || !feature.properties || !feature.geometry || !Array.isArray(feature.geometry.coordinates)) return;
    instalarEstilosPopupParking();
    if (parking.popup) {
      var anterior = parking.popup;
      parking.popup = null;
      try { anterior.remove(); } catch (e) { /* popup ya cerrado */ }
    }
    var coords = feature.geometry.coordinates;
    parking.popupFeatureId = feature.properties.osmId || null;
    var popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '650px', offset: 12, className: 'mp-parking-popup' })
      .setLngLat(coords)
      .setHTML(htmlPopupParking(feature.properties, coords))
      .addTo(map);
    parking.popup = popup;
    popup.on('close', function () {
      // Un evento tardío de un popup anterior no debe borrar la referencia
      // ni el temporizador de la tarjeta que acaba de abrirse.
      if (parking.popup === popup) {
        parking.popup = null;
        parking.popupFeatureId = null;
        clearTimeout(parking.temporizadorSolPopup);
      }
    });
    conectarEventosAlternativasPopup();
    programarRefrescoSolPopup();
  }

  // Si el popup sigue abierto cuando las sombras se recalculan (slider de
  // hora, motor que termina de cargar...), se reescribe con el dato nuevo.
  function refrescarPopupSiAbierto() {
    try {
      if (!parking.popup || !parking.popupFeatureId || !parking.datosActuales) return;
      var feats = parking.datosActuales.features || [];
      for (var i = 0; i < feats.length; i++) {
        if (feats[i].properties && feats[i].properties.osmId === parking.popupFeatureId) {
          parking.popup.setHTML(htmlPopupParking(feats[i].properties, feats[i].geometry && feats[i].geometry.coordinates));
          conectarEventosAlternativasPopup();
          break;
        }
      }
    } catch (e) { /* el popup viejo sigue siendo válido */ }
  }

  // Sin bucles (orden de -): UN temporizador dormido hasta el próximo
  // orto u ocaso real, solo mientras el popup está abierto. Si el popup se
  // abrió de día y pilla el ocaso por medio, la frase cambia sola a la de
  // noche sin gastar batería mirando el reloj cada minuto.
  function programarRefrescoSolPopup() {
    clearTimeout(parking.temporizadorSolPopup);
    try {
      if (!window.SunCalc || !parking.popup) return;
      var ll = parking.popup.getLngLat();
      var ahora = new Date();
      var candidatos = [];
      var vecesHoy = window.SunCalc.getTimes(ahora, ll.lat, ll.lng);
      candidatos.push(vecesHoy.sunrise, vecesHoy.sunset);
      var vecesManana = window.SunCalc.getTimes(new Date(ahora.getTime() + 24 * 3600 * 1000), ll.lat, ll.lng);
      candidatos.push(vecesManana.sunrise, vecesManana.sunset);
      var proximo = null;
      for (var i = 0; i < candidatos.length; i++) {
        var d = candidatos[i];
        if (d && d.getTime && d.getTime() > ahora.getTime() && (!proximo || d < proximo)) proximo = d;
      }
      if (!proximo) return;
      var espera = proximo.getTime() - ahora.getTime() + 30000;
      if (espera > 26 * 3600 * 1000) return; // demasiado lejos: ni se agenda
      parking.temporizadorSolPopup = setTimeout(function () {
        refrescarPopupSiAbierto();
        programarRefrescoSolPopup(); // encadena el siguiente orto u ocaso si el popup sigue abierto
      }, espera);
    } catch (e) { /* sin refresco programado */ }
  }

  function overpassAGeojson(datos) {
    var features = [];
    var elementos = (datos && Array.isArray(datos.elements)) ? datos.elements : [];
    for (var i = 0; i < elementos.length && features.length < CONFIG.maxPuntos; i++) {
      var el = elementos[i];
      var lat = el.lat, lon = el.lon;
      if (lat == null && el.center) { lat = el.center.lat; lon = el.center.lon; }
      if (!isFinite(lat) || !isFinite(lon)) continue;
      var c = clasificarParking(el.tags);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          osmId: el.type + '/' + el.id,
          nombre: (el.tags && el.tags.name) || t('parkingName', 'Aparcamiento'),
          tipo: c.tipo,
          acceso: c.acceso,
          precio: c.precio,
          color: c.color,
          capacidad: (el.tags && el.tags.capacity) || '',
          tarifa: (el.tags && (el.tags.charge || el.tags['fee:charge'])) || '',
          horario: (el.tags && el.tags.opening_hours) || '',
          // 09-oct-2026 (orden de -): null = SIN DATO de sombra.
          // Antes nacía en false y el popup lo leía como «Al sol ahora»,
          // incluso de noche cerrada. null jamás miente.
          sombra: null,
        },
      });
    }
    return { type: 'FeatureCollection', features: features };
  }

  function bboxConsulta() {
    var b = map.getBounds();
    var sur = b.getSouth(), oeste = b.getWest(), norte = b.getNorth(), este = b.getEast();
    var centro = map.getCenter();
    var maxGradosLat = CONFIG.maxLadoConsultaKm / 111;
    var maxGradosLon = CONFIG.maxLadoConsultaKm / (111 * Math.max(0.2, Math.cos(centro.lat * Math.PI / 180)));
    if (norte - sur > maxGradosLat) { sur = centro.lat - maxGradosLat / 2; norte = centro.lat + maxGradosLat / 2; }
    if (este - oeste > maxGradosLon) { oeste = centro.lng - maxGradosLon / 2; este = centro.lng + maxGradosLon / 2; }
    return [sur, oeste, norte, este];
  }

  function claveCelda(bbox) {
    var c = CONFIG.cacheCeldasGrados;
    return bbox.map(function (n) { return (Math.round(n / c) * c).toFixed(3); }).join(',');
  }

  async function descargarAparcamientos() {
    if (!parking.activo || !map) return;
    // 08-oct-2026 (orden de -): de lejos no se pide nada. Los
    // parkings son cosa de cerca, como los edificios 3D; si el zoom es
    // bajo se conserva lo ya pintado (la CSS de la capa lo oculta por
    // minzoom) y se espera al próximo moveend para reintentar.
    try { if (map.getZoom() < CONFIG.zoomMinParking) return; } catch (e) { /* sigue */ }
    var bbox = bboxConsulta();
    var clave = claveCelda(bbox);

    var enCache = parking.cache.get(clave);
    if (enCache && Date.now() - enCache.ts < CONFIG.cacheClienteMs) {
      pintarAparcamientos(enCache.geojson);
      return;
    }

    if (parking.peticion) { try { parking.peticion.abort(); } catch (e) { /* sin drama */ } }
    var controller = new AbortController();
    parking.peticion = controller;
    var temporizador = setTimeout(function () { controller.abort(); }, (CONFIG.timeoutS + 3) * 1000);

    var query = '[out:json][timeout:' + CONFIG.timeoutS + '];(' +
      'node["amenity"="parking"](' + bbox[0] + ',' + bbox[1] + ',' + bbox[2] + ',' + bbox[3] + ');' +
      'way["amenity"="parking"](' + bbox[0] + ',' + bbox[1] + ',' + bbox[2] + ',' + bbox[3] + ');' +
      'relation["amenity"="parking"](' + bbox[0] + ',' + bbox[1] + ',' + bbox[2] + ',' + bbox[3] + ');' +
      ');out center ' + CONFIG.maxPuntos + ';';

    try {
      var resp = await fetch(CONFIG.overpassUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var datos = await resp.json();
      var geojson = overpassAGeojson(datos);
      parking.cache.set(clave, { ts: Date.now(), geojson: geojson });
      if (parking.cache.size > 40) {
        parking.cache.delete(parking.cache.keys().next().value);
      }
      if (controller === parking.peticion) pintarAparcamientos(geojson);
    } catch (e) {
      // Silencio total: el proxy ya devuelve 200 con elements vacíos y F12
      // no se entera de nada.
    } finally {
      clearTimeout(temporizador);
      if (controller === parking.peticion) parking.peticion = null;
    }
  }

  function asegurarCapasParking() {
    if (!estiloListo() || map.getSource('aparcamientos')) return;
    map.addSource('aparcamientos', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    // 08-oct-2026 (orden de -): las tres capas llevan minzoom, como
    // los edificios 3D. De lejos no se pintan (el dato queda guardado y
    // vuelve solo al acercarte), de cerca aparecen a la distancia que
    // estás mirando.
    map.addLayer({
      id: 'capa-aparcamientos-halo',
      type: 'circle',
      source: 'aparcamientos',
      minzoom: CONFIG.zoomMinParking,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 16, 12],
        'circle-color': '#0b1220',
        'circle-opacity': 0.22,
      },
    });
    map.addLayer({
      id: 'capa-aparcamientos',
      type: 'circle',
      source: 'aparcamientos',
      minzoom: CONFIG.zoomMinParking,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 8],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
    // Anillo teal para los que tienen sombra AHORA.
    map.addLayer({
      id: 'capa-aparcamientos-sombra',
      type: 'circle',
      source: 'aparcamientos',
      minzoom: CONFIG.zoomMinParking,
      filter: ['==', ['get', 'sombra'], true],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 8, 16, 14],
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': COLOR_SOMBRA,
      },
    });

    map.on('click', 'capa-aparcamientos', function (e) {
      if (!e.features || !e.features.length) return;
      abrirPopupParking(e.features[0]);
    });
    map.on('mouseenter', 'capa-aparcamientos', function () { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'capa-aparcamientos', function () { map.getCanvas().style.cursor = ''; });
  }

  function pintarAparcamientos(geojson) {
    if (!map) return;
    if (!map.getSource('aparcamientos')) {
      try { asegurarCapasParking(); } catch (e) { /* abajo el plan B */ }
      if (!map.getSource('aparcamientos')) {
        map.once('idle', function () { if (parking.activo) pintarAparcamientos(geojson); });
        return;
      }
    }
    evaluarSombraEn(geojson);
    parking.datosActuales = geojson;
    map.getSource('aparcamientos').setData(geojson);
  }

  function limpiarAparcamientos() {
    parking.datosActuales = null;
    parking.popupFeatureId = null;
    clearTimeout(parking.temporizadorSolPopup);
    if (!map || !map.getSource('aparcamientos')) return;
    map.getSource('aparcamientos').setData({ type: 'FeatureCollection', features: [] });
    if (parking.popup) { try { parking.popup.remove(); } catch (e) { /* ok */ } parking.popup = null; }
  }

  // Sombra: SOLO LEE (jamás escribe) las fuentes que ya mantienen otros
  // módulos: 'sombras' (edificios, shadows-route.js) y
  // 'arboles-globales-sombra' (árboles, manolito-mapa.js).
  // 08-oct-2026 (orden de -, arreglo urgente): antes se usaba
  // querySourceFeatures, que por el troceado en tiles del mapa devuelve
  // cero o solo lo que se ve en pantalla. Resultado: los anillos teal
  // no salían NUNCA. Ahora se leen los datos COMPLETOS de la fuente
  // (_data o serialize().data), el mismo patrón que usa planetario.js.
  function leerDatosCompletosFuente(id) {
    try {
      var src = map.getSource(id);
      if (!src) return null;
      var datos = src._data || (src.serialize && src.serialize().data);
      if (typeof datos === 'string') { try { datos = JSON.parse(datos); } catch (e) { datos = null; } }
      return (datos && Array.isArray(datos.features)) ? datos.features : null;
    } catch (e) { return null; }
  }

  function evaluarSombraEn(geojson) {
    try {
      if (typeof turf === 'undefined') return;
      var poligonos = [];
      var deEdificios = leerDatosCompletosFuente('sombras');
      var deArboles = leerDatosCompletosFuente('arboles-globales-sombra');
      if (deEdificios) poligonos = poligonos.concat(deEdificios);
      if (deArboles) poligonos = poligonos.concat(deArboles);
      if (!poligonos.length) return;
      for (var i = 0; i < geojson.features.length; i++) {
        var f = geojson.features[i];
        var punto = turf.point(f.geometry.coordinates);
        var cubierto = false;
        for (var j = 0; j < poligonos.length; j++) {
          var geom = poligonos[j].geometry;
          if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
          if (turf.booleanPointInPolygon(punto, poligonos[j])) { cubierto = true; break; }
        }
        f.properties.sombra = cubierto;
      }
    } catch (e) { /* la sombra es un extra: jamás rompe la capa */ }
  }

  // 08-oct-2026 (arreglo urgente del choque con sombras): se trabaja
  // sobre la copia íntegra guardada en pintarAparcamientos. ANTES se
  // reconstruía con querySourceFeatures('aparcamientos'), que por tiles
  // devolvía cero o un recorte del viewport, y ese recorte se volcaba
  // con setData: cada recálculo del motor de sombras BORRABA puntos.
  function reevaluarSombraActual() {
    if (!parking.activo || !map || !map.getSource('aparcamientos')) return;
    clearTimeout(parking.temporizadorSombra);
    parking.temporizadorSombra = setTimeout(function () {
      try {
        var src = map.getSource('aparcamientos');
        if (!src || !parking.datosActuales || !parking.datosActuales.features || !parking.datosActuales.features.length) return;
        var geojson = {
          type: 'FeatureCollection',
          features: parking.datosActuales.features.map(function (f) {
            return { type: 'Feature', geometry: f.geometry, properties: Object.assign({}, f.properties, { sombra: null }) };
          }),
        };
        evaluarSombraEn(geojson);
        parking.datosActuales = geojson;
        src.setData(geojson);
        refrescarPopupSiAbierto(); // 09-oct-2026: la frase de sol sigue al dato
      } catch (e) { /* extra, nunca rompe */ }
    }, CONFIG.esperaSombraMs);
  }

  function alMoverElMapa() {
    clearTimeout(parking.temporizadorMove);
    parking.temporizadorMove = setTimeout(function () {
      if (!parking.activo || document.hidden) return;
      descargarAparcamientos();
    }, CONFIG.esperaMoveendMs);
  }

  function alCambiarDatos(e) {
    if (!parking.activo) return;
    // Recálculo de sombra de edificios O de árboles: en ambos casos hay
    // que repasar los anillos (siempre con la copia íntegra guardada).
    if (e && e.isSourceLoaded && (e.sourceId === 'sombras' || e.sourceId === 'arboles-globales-sombra')) reevaluarSombraActual();
  }

  function activarParking() {
    if (parking.activo || !map) return;
    parking.activo = true;
    if (parking.btn) parking.btn.setAttribute('aria-pressed', 'true');
    map.on('moveend', alMoverElMapa);
    map.on('sourcedata', alCambiarDatos);
    if (estiloListo()) {
      try { asegurarCapasParking(); } catch (e) { /* ya entra el idle */ }
      descargarAparcamientos();
    } else {
      map.once('idle', function () {
        if (!parking.activo) return;
        try { asegurarCapasParking(); } catch (e) { /* jamás rompe el mapa */ }
        descargarAparcamientos();
      });
    }
    document.dispatchEvent(new CustomEvent('manolito:parking-cambiado', { detail: { activo: true } }));
  }

  function desactivarParking() {
    if (!parking.activo || !map) return;
    parking.activo = false;
    if (parking.btn) parking.btn.setAttribute('aria-pressed', 'false');
    map.off('moveend', alMoverElMapa);
    map.off('sourcedata', alCambiarDatos);
    clearTimeout(parking.temporizadorMove);
    clearTimeout(parking.temporizadorSombra);
    if (parking.peticion) { try { parking.peticion.abort(); } catch (e) { /* ok */ } parking.peticion = null; }
    limpiarAparcamientos();
    document.dispatchEvent(new CustomEvent('manolito:parking-cambiado', { detail: { activo: false } }));
  }

  function alternarParking() { if (parking.activo) desactivarParking(); else activarParking(); }

  function activarParkingEn(lat, lon) {
    if (!map) return;
    try {
      if (isFinite(lat) && isFinite(lon)) {
        map.easeTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), CONFIG.zoomLlegada), duration: 900 });
      }
    } catch (e) { /* centrar es un gesto, no una obligación */ }
    activarParking();
  }

  /* ==========================================================================
     BLOQUE 2. VIAJE LARGO EN COCHE
     ========================================================================== */
  var viaje = {
    btn: null,
    panel: null,
    inputOrigen: null,
    inputDestino: null,
    estado: null,
    peticion: null,
    temporizadorLlegada: null,
  };

  function decirEstado(texto) {
    if (viaje.estado) viaje.estado.textContent = texto || '';
  }

  async function geocodificar(texto) {
    var consulta = String(texto || '').trim();
    if (!consulta) return null;
    try {
      var url = new URL(CONFIG.geoUrl, window.location.origin);
      url.searchParams.set('q', consulta);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      var resp = await fetch(url.toString(), { headers: { 'Accept-Language': 'es' } });
      if (!resp.ok) return null;
      var datos = await resp.json();
      if (Array.isArray(datos) && datos.length) {
        return { lat: parseFloat(datos[0].lat), lon: parseFloat(datos[0].lon), nombre: datos[0].display_name || consulta };
      }
    } catch (e) { /* silencio: null y mensaje claro */ }
    return null;
  }

  function miPosicion() {
    return new Promise(function (resolve) {
      var porMapa = function () {
        try {
          var c = map.getCenter();
          resolve({ lat: c.lat, lon: c.lng, nombre: t('tripMapCenter', 'Centro del mapa') });
        } catch (e) { resolve(null); }
      };
      if (!('geolocation' in navigator)) { porMapa(); return; }
      var hecho = false;
      var temporizador = setTimeout(function () { if (!hecho) { hecho = true; porMapa(); } }, 4000);
      navigator.geolocation.getCurrentPosition(function (pos) {
        if (hecho) return;
        hecho = true;
        clearTimeout(temporizador);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, nombre: t('tripMyLocation', 'Mi ubicación') });
      }, function () {
        if (hecho) return;
        hecho = true;
        clearTimeout(temporizador);
        porMapa();
      }, { timeout: 3500, maximumAge: 60000 });
    });
  }

  async function rutaEnCoche(origen, destino) {
    var coords = origen.lon + ',' + origen.lat + ';' + destino.lon + ',' + destino.lat;
    var url = CONFIG.osrmCocheUrl + '/driving/' + coords + '?overview=full&geometries=geojson&steps=false';
    var controller = new AbortController();
    viaje.peticion = controller;
    var temporizador = setTimeout(function () { controller.abort(); }, CONFIG.timeoutViajeMs);
    try {
      var resp = await fetch(url, { signal: controller.signal });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var datos = await resp.json();
      if (!datos || datos.code !== 'Ok' || !datos.routes || !datos.routes.length) return null;
      var r = datos.routes[0];
      if (!r.geometry || !r.geometry.coordinates || !r.geometry.coordinates.length) return null;
      return { geometry: r.geometry, distanciaM: r.distance || 0, duracionS: r.duration || 0 };
    } catch (e) {
      return null;
    } finally {
      clearTimeout(temporizador);
      if (controller === viaje.peticion) viaje.peticion = null;
    }
  }

  function asegurarCapasViaje() {
    if (!estiloListo()) return false;
    if (map.getSource('viaje-largo')) return true;
    map.addSource('viaje-largo', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'capa-viaje-outline',
      type: 'line',
      source: 'viaje-largo',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: 'capa-viaje',
      type: 'line',
      source: 'viaje-largo',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#B0512E', 'line-width': 5, 'line-opacity': 0.95 },
    });
    return true;
  }

  function pintarRuta(geometry) {
    if (!asegurarCapasViaje()) {
      map.once('idle', function () { pintarRuta(geometry); });
      return;
    }
    map.getSource('viaje-largo').setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: geometry, properties: {} }],
    });
    // Reaplicar el estilo fino sobre las capas recién creadas del viaje.
    afinarLineasRuta();
    // Que el viaje SE VEA: encuadre de la ruta completa antes de la llegada.
    try {
      var bounds = new maplibregl.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]);
      for (var i = 1; i < geometry.coordinates.length; i++) bounds.extend(geometry.coordinates[i]);
      map.fitBounds(bounds, { padding: { top: 90, bottom: 90, left: 40, right: 40 }, duration: 900 });
    } catch (e) { /* el encuadre es un gesto, no una obligación */ }
  }

  function limpiarViaje() {
    if (viaje.peticion) { try { viaje.peticion.abort(); } catch (e) { /* ok */ } viaje.peticion = null; }
    clearTimeout(viaje.temporizadorLlegada);
    if (map && map.getSource('viaje-largo')) {
      map.getSource('viaje-largo').setData({ type: 'FeatureCollection', features: [] });
    }
    decirEstado('');
  }

  // Llegada: enciende el motor de sombras SOLO si estaba apagado (es lo que
  // da el anillo teal a los parkings) y activa la capa centrada en destino.
  function prepararLlegada(destino) {
    try {
      var toggleSombras = document.getElementById('rsToggleSombras');
      if (toggleSombras && !toggleSombras.checked) toggleSombras.click();
    } catch (e) { /* la sombra es un refuerzo, no una obligación */ }
    try {
      activarParkingEn(destino.lat, destino.lon);
    } catch (e) { /* sin parking no pasa nada, el viaje ya está trazado */ }
  }

  async function planificar(origenTexto, destinoTexto) {
    if (!map) return;
    if (viaje.panel && viaje.panel.hasAttribute('hidden')) viaje.panel.removeAttribute('hidden');

    var dTxt = String(destinoTexto != null ? destinoTexto : (viaje.inputDestino ? viaje.inputDestino.value : '')).trim();
    var oTxt = String(origenTexto != null ? origenTexto : (viaje.inputOrigen ? viaje.inputOrigen.value : '')).trim();
    if (!dTxt) {
      decirEstado(t('tripNeedDest', 'Dime a dónde vas y te trazo el viaje.'));
      return;
    }

    decirEstado(t('tripSearching', 'Buscando el mejor camino…'));
    var destino = await geocodificar(dTxt);
    if (!destino) {
      decirEstado(t('tripNoGeocode', 'No encuentro ese destino. Prueba con el nombre de la ciudad.'));
      return;
    }
    var origen = oTxt ? await geocodificar(oTxt) : await miPosicion();
    if (!origen) {
      decirEstado(t('tripNoOrigin', 'No encuentro ese origen. Déjalo vacío para salir de donde estás.'));
      return;
    }

    var ruta = await rutaEnCoche(origen, destino);
    if (!ruta) {
      decirEstado(t('tripNoRoute', 'No he podido trazar el viaje en coche. Inténtalo en un momento.'));
      return;
    }

    pintarRuta(ruta.geometry);

    var km = ruta.distanciaM / 1000;
    var kmTxt = String(km >= 10 ? Math.round(km) : (Math.round(km * 10) / 10)).replace('.', ',');
    var min = Math.round(ruta.duracionS / 60);
    var tiempoTxt = min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min';
    decirEstado(t('tripSummary', 'Viaje trazado') + ' · ' + kmTxt + ' km · ' + tiempoTxt + '. ' + t('tripParkingOn', 'Abajo tienes los aparcamientos del destino, con anillo los que están a la sombra.'));

    clearTimeout(viaje.temporizadorLlegada);
    viaje.temporizadorLlegada = setTimeout(function () { prepararLlegada(destino); }, CONFIG.esperaLlegadaMs);
  }

  /* ---------------- Interfaz: dos filas-botón y el panelito ---------------- */
  function crearBotones() {
    parking.btn = document.createElement('button');
    parking.btn.type = 'button';
    parking.btn.id = 'rsBtnParking';
    parking.btn.setAttribute('aria-pressed', 'false');
    parking.btn.textContent = t('parkingBtn', 'Buscar aparcamiento');
    parking.btn.addEventListener('click', function () { alternarParking(); });

    viaje.btn = document.createElement('button');
    viaje.btn.type = 'button';
    viaje.btn.id = 'rsBtnViaje';
    viaje.btn.setAttribute('aria-pressed', 'false');
    viaje.btn.setAttribute('aria-controls', 'rsPanelViaje');
    viaje.btn.textContent = t('tripBtn', 'Planificar viaje');

    var monteParking = document.getElementById('rsMonteParking');
    var monteViaje = document.getElementById('rsMonteViaje');
    var lista = document.getElementById('rsListaCapas');
    if (monteParking) monteParking.appendChild(parking.btn);
    else if (lista) {
      var filaP = document.createElement('div');
      filaP.className = 'rs-capa-fila rs-capa-fila-btn rs-ico-parking';
      filaP.id = 'rsMonteParking';
      filaP.appendChild(parking.btn);
      lista.appendChild(filaP);
    }
    if (monteViaje) monteViaje.appendChild(viaje.btn);
    else if (lista) {
      var filaV = document.createElement('div');
      filaV.className = 'rs-capa-fila rs-capa-fila-btn rs-ico-viaje';
      filaV.id = 'rsMonteViaje';
      filaV.appendChild(viaje.btn);
      lista.appendChild(filaV);
    }
  }

  function crearPanel() {
    viaje.panel = document.createElement('div');
    viaje.panel.id = 'rsPanelViaje';
    viaje.panel.className = 'rs-panel-viaje';
    viaje.panel.setAttribute('hidden', '');

    var titulo = document.createElement('p');
    titulo.className = 'rs-panel-viaje-tit';
    titulo.textContent = t('tripPanelTitle', 'Viaje largo en coche');
    viaje.panel.appendChild(titulo);

    viaje.inputOrigen = document.createElement('input');
    viaje.inputOrigen.type = 'text';
    viaje.inputOrigen.id = 'rsViajeOrigen';
    viaje.inputOrigen.setAttribute('placeholder', t('tripOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    viaje.inputOrigen.setAttribute('aria-label', t('tripOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    viaje.inputOrigen.autocomplete = 'off';
    viaje.panel.appendChild(viaje.inputOrigen);

    viaje.inputDestino = document.createElement('input');
    viaje.inputDestino.type = 'text';
    viaje.inputDestino.id = 'rsViajeDestino';
    viaje.inputDestino.setAttribute('placeholder', t('tripDestPh', 'A dónde vas'));
    viaje.inputDestino.setAttribute('aria-label', t('tripDestPh', 'A dónde vas'));
    viaje.inputDestino.autocomplete = 'off';
    viaje.panel.appendChild(viaje.inputDestino);

    var filaBotones = document.createElement('div');
    filaBotones.className = 'rs-panel-viaje-botones';

    var btnCalcular = document.createElement('button');
    btnCalcular.type = 'button';
    btnCalcular.className = 'rs-panel-viaje-calcular';
    btnCalcular.textContent = t('tripCalcBtn', 'Trazar viaje');
    btnCalcular.addEventListener('click', function () { planificar(); });
    filaBotones.appendChild(btnCalcular);

    var btnLimpiar = document.createElement('button');
    btnLimpiar.type = 'button';
    btnLimpiar.className = 'rs-panel-viaje-limpiar';
    btnLimpiar.textContent = t('tripClearBtn', 'Quitar viaje');
    btnLimpiar.addEventListener('click', function () { limpiarViaje(); });
    filaBotones.appendChild(btnLimpiar);

    viaje.panel.appendChild(filaBotones);

    viaje.estado = document.createElement('p');
    viaje.estado.className = 'rs-panel-viaje-estado';
    viaje.estado.setAttribute('role', 'status');
    viaje.panel.appendChild(viaje.estado);

    // 08-oct-2026 (orden directa de -): el panel vive junto al MAPA,
    // en la zona de mapas y viajes, nunca en medio del planetario. Así el
    // orden clásico queda intacto: mapa y sus controles arriba, el
    // planetario entero abajo del todo y el acceso LiDAR debajo de él.
    var mapaWrap = document.querySelector('.map-wrap');
    if (mapaWrap && mapaWrap.parentNode) mapaWrap.parentNode.insertBefore(viaje.panel, mapaWrap.nextSibling);
    else document.getElementById('main-content')?.appendChild(viaje.panel);

    // Apertura con animación (08-oct): en vez de hidden seco, el panel
    // baja suave con opacidad y desplazamiento (CSS .rs-panel-viaje-abierto).
    viaje.btn.addEventListener('click', function () {
      var abierto = !viaje.panel.hasAttribute('hidden');
      if (!abierto) {
        viaje.panel.removeAttribute('hidden');
        // Forzar reflow para que la transición arranque desde cerrado.
        void viaje.panel.offsetHeight;
        viaje.panel.classList.add('rs-panel-viaje-abierto');
        viaje.btn.setAttribute('aria-pressed', 'true');
      } else {
        viaje.panel.classList.remove('rs-panel-viaje-abierto');
        viaje.btn.setAttribute('aria-pressed', 'false');
        setTimeout(function () {
          if (!viaje.panel.classList.contains('rs-panel-viaje-abierto')) {
            viaje.panel.setAttribute('hidden', '');
          }
        }, 280);
      }
    });

    viaje.inputDestino.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); planificar(); }
    });
    viaje.inputOrigen.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); planificar(); }
    });
  }

  function refrescarTextos() {
    if (parking.btn) parking.btn.textContent = t('parkingBtn', 'Buscar aparcamiento');
    if (viaje.btn) viaje.btn.textContent = t('tripBtn', 'Planificar viaje');
    if (!viaje.panel) return;
    var tit = viaje.panel.querySelector('.rs-panel-viaje-tit');
    if (tit) tit.textContent = t('tripPanelTitle', 'Viaje largo en coche');
    if (viaje.inputOrigen) {
      viaje.inputOrigen.setAttribute('placeholder', t('tripOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
      viaje.inputOrigen.setAttribute('aria-label', t('tripOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    }
    if (viaje.inputDestino) {
      viaje.inputDestino.setAttribute('placeholder', t('tripDestPh', 'A dónde vas'));
      viaje.inputDestino.setAttribute('aria-label', t('tripDestPh', 'A dónde vas'));
    }
    var bc = viaje.panel.querySelector('.rs-panel-viaje-calcular');
    if (bc) bc.textContent = t('tripCalcBtn', 'Trazar viaje');
    var bl = viaje.panel.querySelector('.rs-panel-viaje-limpiar');
    if (bl) bl.textContent = t('tripClearBtn', 'Quitar viaje');
  }

  /* ---------------- APIs públicas y eventos -------------------------------- */
  window.manolitoParking = {
    alternar: alternarParking,
    activar: activarParking,
    desactivar: desactivarParking,
    estaActivo: function () { return parking.activo; },
    activarEn: activarParkingEn,
  };
  window.manolitoViaje = {
    planificar: planificar,
    limpiar: limpiarViaje,
  };

  document.addEventListener('manolito:activar-parking', function (e) {
    var d = (e && e.detail) || {};
    if (isFinite(d.lat) && isFinite(d.lon)) activarParkingEn(d.lat, d.lon);
    else activarParking();
  });
  document.addEventListener('manolito:planificar-viaje', function (e) {
    var d = (e && e.detail) || {};
    planificar(d.origen, d.destino);
  });
  document.addEventListener('manolito:idioma-cambiado', refrescarTextos);

  /* ---------------- Arranque: espera al mapa con reintentos suaves -------- */
  /* ================================================================
     BLOQUE 3 · Restyle fino de las líneas de ruta (08-oct-2026, orden
     directa de -: "la visualización de los trazados es tosca").
     No se toca shadows-route.js: se ajustan los paint de las capas ya
     creadas con setPaintProperty, con guardas por si aún no existen.
     Qué cambia: grosores que ESCALAN con el zoom (antes fijos, por eso
     a zoom bajo la línea era un chorro), opacidades más suaves y un
     line-blur fino que hace de anti-aliasing en los bordes.
     ================================================================ */
  function afinarLineasRuta(intentos) {
    if (!map) return;
    if (typeof intentos !== 'number') intentos = 0;
    // Con el motor de sombras activo el estilo anda ocupado recalculando
    // justo cuando se traza el viaje: si no está listo, se reintenta en
    // el próximo idle en vez de rendirse en silencio.
    if (!estiloListo()) {
      if (intentos < 10) map.once('idle', function () { afinarLineasRuta(intentos + 1); });
      return;
    }
    var ajustes = [
      // Ruta a pie (las pinta shadows-route.js)
      ['capa-ruta-outline', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 9], 'line-opacity': 0.55 }],
      ['capa-ruta-glow', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 7, 16, 14], 'line-opacity': 0.22, 'line-blur': 6 }],
      ['capa-ruta', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 16, 5.5], 'line-opacity': 0.95, 'line-blur': 0.4 }],
      ['capa-ruta-sombra-outline', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 9], 'line-opacity': 0.6 }],
      ['capa-ruta-sombra', { 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 16, 5.5], 'line-opacity': 0.9, 'line-blur': 0.4 }],
      // Viaje largo en coche (las pinta este módulo, bloque 2)
      ['capa-viaje-outline', { 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 6, 15, 9], 'line-opacity': 0.55 }],
      ['capa-viaje', { 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.8, 10, 3.5, 15, 5.5], 'line-opacity': 0.95, 'line-blur': 0.4 }],
    ];
    var algunaFalta = false;
    ajustes.forEach(function (par) {
      var id = par[0], props = par[1];
      if (!map.getLayer(id)) { algunaFalta = true; return; }
      Object.keys(props).forEach(function (prop) {
        try { map.setPaintProperty(id, prop, props[prop]); } catch (e) { /* capa rehaciéndose */ }
      });
    });
    // Las capas de la ruta a pie nacen cuando arranca el motor de sombras
    // y las del viaje al trazar; si alguna falta se reintenta unas pocas
    // veces (tope 10, nunca un bucle infinito) y además se reaplica el
    // estilo cada vez que se traza un viaje nuevo.
    if (algunaFalta && intentos < 10) {
      map.once('idle', function () { afinarLineasRuta(intentos + 1); });
    }
  }

  (function arrancar(intentos) {
    try {
      if (window.manolitAireMap) {
        map = window.manolitAireMap;
        crearBotones();
        crearPanel();
        if (estiloListo()) afinarLineasRuta();
        else map.once('idle', afinarLineasRuta);
      } else if (intentos < 90) {
        setTimeout(function () { arrancar(intentos + 1); }, 500);
      }
    } catch (e) { /* este módulo jamás rompe el mapa */ }
  })(0);
})();
