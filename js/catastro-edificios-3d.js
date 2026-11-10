/* ============================================================
   MANOLIT AIRE — catastro-edificios-3d.js
   Volúmenes 3D de relleno del Catastro oficial (INSPIRE WFS
   bu:BuildingPart, vía /catastro-edificios del Worker).

   Enganche: shadows-route.js llama a window.manolitoCatastro3D(activo)
   desde el interruptor «Catastro 3D». Con el zoom suficiente se piden
   bloques fijos de 0,003° para el área visible, se cachean en memoria
   y se pintan en UNA capa fill-extrusion propia. OSM manda siempre:
   una huella del Catastro solo se levanta si el centroide no cae
   dentro de ningún edificio del mapa base ya cargado. Las líneas del
   catastro (raster WMS) quedan de fondo, intactas. Al apagar se
   eliminan capa y fuente y el mapa queda exactamente como antes.

   Regla de oro: este módulo dibuja y proyecta sombra. No toca el motor
   de sombras, ni los árboles, ni el splash, ni los estilos de otras
   capas. Todo está envuelto en try/catch: un fallo aquí nunca rompe el
   mapa.
   ============================================================ */
(function () {
  'use strict';
  if (window.__manolitoCatastroEdificios3D) return;
  window.__manolitoCatastroEdificios3D = true;

  /* INTERRUPTOR DE EMERGENCIA: ponlo en false y los edificios del
     Catastro siguen dibujándose en 3D pero dejan de proyectar sombra
     (no se crea el Web Worker ni se alimenta el motor). Sirve para
     cortar rápido si en algún móvil se nota algo raro. */
  var SOMBRAS_CATASTRO_ACTIVAS = true;

  var SRC = 'catastro-edificios-src';
  var CAPA = 'catastro-edificios-capa';
  var BLOQUE_GRADOS = 0.003;        // ~300 m: el WFS del Catastro se ahoga con cajas grandes
  var ZOOM_MINIMO = 15;             // más allá los volúmenes apenas se aprecian y la
                                    // vista pediría cientos de bloques de golpe
  var COLCHON_GRADOS = 0.0015;      // ~150 m extra: las sombras largas del
                                    // atardecer entran desde fuera de pantalla.
                                    // Los bloques son fijos y van a caché:
                                    // pedir ese anillo extra no cuesta más
                                    // en cada movimiento del mapa.
  var PETICIONES_EN_VUELO = 3;      // peticiones simultáneas; al terminar cada una se
                                    // pinta lo recibido y se lanza la siguiente, sin
                                    // esperar a que la tanda entera acabe
  // (sin tope de edificios por vista desde el 10-nov: se pintan todos,
  //  el recorte a 900 dejaba manzanas completas sin volumen)
  var ALTURA_PLANTA_M = 3;          // plantas × 3 m
  var ALTURA_SIN_DATO_M = 10;       // altura baja genérica si no hay plantas
  var CELDA_REJILLA = 0.001;        // ~110 m para la rejilla espacial OSM
  var MAX_PUNTOS_ANILLO = 28;       // simplificación barata de geometría

  var map = null;
  var activo = false;
  var temporizador = null;
  var controlAbortar = null;   // AbortController de las peticiones en vuelo
  var movimientoReal = false;  // movestart con originalEvent: el usuario (o una
                               // animación) ha movido el mapa de verdad. Solo
                               // entonces se cancelan las peticiones en curso;
                               // los eventos 'sourcedata' de nubes, sombras y
                               // compañía ya NO recortan lo que vuela.
  var bloques = new Map();     // "cyx cx" -> { estado: 'ok'|'vacia'|'error'|'cargando', datos: FC|null }

  // ---------- sombras del Catastro (Web Worker + caché por franja solar) ----------
  // NOTA retomable: la capa «edificios-en-sombra» (fachadas oscurecidas)
  // del motor solo considera edificios OSM; los del Catastro proyectan
  // sombra pero no se oscurecen a sí mismos. Se deja así de propósito.
  var ultimosEdificiosVisibles = [];  // la última lista pintada (los que proyectan)
  var firmaEdificios = '';            // identifica el conjunto visible actual
  var ultimaRespuestaSombras = null;  // última tanda válida: se muestra mientras llega la nueva
  var workerSombras = null;
  var workerRoto = false;
  var siguienteIdMensaje = 1;
  var esperandoRespuesta = new Map(); // id -> resolve
  var trabajoEnCurso = false;
  var trabajoPendiente = null;        // {clave, payload}: si llegan varios, gana el último
  var cacheSombras = new Map();       // "firma|franja" -> [features de sombra]

  function atribucionCatastro() {
    return '© <a href="https://www.sedecatastro.gob.es/" target="_blank" rel="noopener">Dirección General del Catastro</a>';
  }

  function idCapaEdificiosOsm() {
    try {
      var capas = map.getStyle().layers || [];
      var c = capas.find(function (l) {
        return l.type === 'fill-extrusion' && l.id !== CAPA && /building/i.test(l.id);
      });
      return c ? c.id : null;
    } catch (e) { return null; }
  }

  function asegurarCapa() {
    if (!map.getSource(SRC)) {
      map.addSource(SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        attribution: atribucionCatastro(),
      });
    }
    if (!map.getLayer(CAPA)) {
      // Debajo de los edificios OSM: si se solapan, OSM (dibujado después) tapa.
      var antes = idCapaEdificiosOsm() || undefined;
      map.addLayer({
        id: CAPA,
        type: 'fill-extrusion',
        source: SRC,
        paint: {
          // Mismo gradiente azul que los edificios OSM en modo normal;
          // los de altura estimada (sin plantas) llevan un tono gris-azulado
          // más claro para distinguirlos de lejos. OJO: fill-extrusion-opacity
          // NO admite expresiones de datos en MapLibre (error de estilo), así
          // que la diferencia va en el color y la opacidad es fija.
          'fill-extrusion-color': [
            'case',
            ['==', ['get', 'est'], 1],
            '#9fb6cf',
            [
              'interpolate', ['linear'], ['get', 'h'],
              0, '#8fb3e8',
              30, '#5f8fd6',
              70, '#3f6bc0',
              140, '#274a96'
            ]
          ],
          'fill-extrusion-opacity': 0.9,
          'fill-extrusion-height': ['get', 'h'],
          'fill-extrusion-base': 0,
          'fill-extrusion-vertical-gradient': true,
        },
      }, antes);
    }
  }

  function quitarCapa() {
    try { if (map.getLayer(CAPA)) map.removeLayer(CAPA); } catch (e) { }
    try { if (map.getSource(SRC)) map.removeSource(SRC); } catch (e) { }
  }

  // ---------- utilidades geométricas ligeras ----------
  function puntoEnAnillo(lon, lat, ring) {
    var dentro = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) dentro = !dentro;
    }
    return dentro;
  }

  function decimarAnillo(ring, maxPuntos) {
    if (ring.length <= maxPuntos) return ring;
    var paso = Math.ceil(ring.length / maxPuntos);
    var salida = [];
    for (var i = 0; i < ring.length - 1; i += paso) salida.push(ring[i]);
    salida.push(ring[0]); // cerrar
    return salida;
  }

  // Rejilla espacial una sola vez por repintada: celda -> [{ext, minLon...}]
  // con los polígonos de edificios OSM ya cargados en el renderer.
  function construirRejillaOsm() {
    var rejilla = new Map();
    var idOsm = idCapaEdificiosOsm();
    if (!idOsm || !map.getLayer(idOsm)) return rejilla;
    var crudos;
    try { crudos = map.queryRenderedFeatures({ layers: [idOsm] }); } catch (e) { return rejilla; }
    for (var i = 0; i < crudos.length; i++) {
      try {
        var g = crudos[i].geometry;
        if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue;
        var poligonos = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
        for (var p = 0; p < poligonos.length; p++) {
          var ext = poligonos[p][0];
          if (!ext || ext.length < 4) continue;
          var minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
          for (var k = 0; k < ext.length; k++) {
            if (ext[k][0] < minLon) minLon = ext[k][0];
            if (ext[k][0] > maxLon) maxLon = ext[k][0];
            if (ext[k][1] < minLat) minLat = ext[k][1];
            if (ext[k][1] > maxLat) maxLat = ext[k][1];
          }
          var celda = { ext: ext, minLon: minLon, maxLon: maxLon, minLat: minLat, maxLat: maxLat };
          for (var cy = Math.floor(minLat / CELDA_REJILLA); cy <= Math.floor(maxLat / CELDA_REJILLA); cy++) {
            for (var cx = Math.floor(minLon / CELDA_REJILLA); cx <= Math.floor(maxLon / CELDA_REJILLA); cx++) {
              var clave = cy + ':' + cx;
              var lista = rejilla.get(clave);
              if (!lista) { lista = []; rejilla.set(clave, lista); }
              lista.push(celda);
            }
          }
        }
      } catch (e) { continue; }
    }
    return rejilla;
  }

  function osmTieneEdificioEn(lon, lat, rejilla) {
    var cy0 = Math.floor(lat / CELDA_REJILLA), cx0 = Math.floor(lon / CELDA_REJILLA);
    for (var cy = cy0 - 2; cy <= cy0 + 2; cy++) {
      for (var cx = cx0 - 2; cx <= cx0 + 2; cx++) {
        var lista = rejilla.get(cy + ':' + cx);
        if (!lista) continue;
        for (var i = 0; i < lista.length; i++) {
          var c = lista[i];
          if (lon < c.minLon || lon > c.maxLon || lat < c.minLat || lat > c.maxLat) continue;
          if (puntoEnAnillo(lon, lat, c.ext)) return true;
        }
      }
    }
    return false;
  }

  function anillosIntersectan(a, b) {
    for (var i = 0; i < a.length - 1; i++) {
      var ax = a[i][0], ay = a[i][1], bx = a[i + 1][0], by = a[i + 1][1];
      for (var j = 0; j < b.length - 1; j++) {
        var cx = b[j][0], cy = b[j][1], dx = b[j + 1][0], dy = b[j + 1][1];
        var d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        var d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
        var d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
        var d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
      }
    }
    return false;
  }

  function huellaCatastroSolapaOsm(ext, rejilla) {
    var minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (var p = 0; p < ext.length; p++) {
      if (ext[p][0] < minLon) minLon = ext[p][0];
      if (ext[p][0] > maxLon) maxLon = ext[p][0];
      if (ext[p][1] < minLat) minLat = ext[p][1];
      if (ext[p][1] > maxLat) maxLat = ext[p][1];
    }
    var cy0 = Math.floor(((minLat + maxLat) / 2) / CELDA_REJILLA);
    var cx0 = Math.floor(((minLon + maxLon) / 2) / CELDA_REJILLA);
    for (var cy = cy0 - 2; cy <= cy0 + 2; cy++) {
      for (var cx = cx0 - 2; cx <= cx0 + 2; cx++) {
        var lista = rejilla.get(cy + ':' + cx);
        if (!lista) continue;
        for (var i = 0; i < lista.length; i++) {
          var c = lista[i];
          if (c.maxLon < minLon || c.minLon > maxLon || c.maxLat < minLat || c.minLat > maxLat) continue;
          if (anillosIntersectan(ext, c.ext) ||
              puntoEnAnillo(ext[0][0], ext[0][1], c.ext) ||
              puntoEnAnillo(c.ext[0][0], c.ext[0][1], ext)) return true;
        }
      }
    }
    return false;
  }

  // ---------- carga de bloques ----------
  function claveBloque(cy, cx) { return cy + 'x' + cx; }

  function bloquesDeLaVista() {
    var b = map.getBounds();
    var sur = b.getSouth() - COLCHON_GRADOS, oeste = b.getWest() - COLCHON_GRADOS;
    var norte = b.getNorth() + COLCHON_GRADOS, este = b.getEast() + COLCHON_GRADOS;
    var lista = [];
    for (var cy = Math.floor(sur / BLOQUE_GRADOS); cy <= Math.floor(norte / BLOQUE_GRADOS); cy++) {
      for (var cx = Math.floor(oeste / BLOQUE_GRADOS); cx <= Math.floor(este / BLOQUE_GRADOS); cx++) {
        lista.push([cy, cx]);
      }
    }
    // Orden centro → esquinas: lo primero que llega es lo que el usuario
    // está mirando, no la esquina superior izquierda de la vista.
    var ccy = Math.floor(((sur + norte) / 2) / BLOQUE_GRADOS);
    var ccx = Math.floor(((oeste + este) / 2) / BLOQUE_GRADOS);
    lista.sort(function (a, b) {
      var da = (a[0] - ccy) * (a[0] - ccy) + (a[1] - ccx) * (a[1] - ccx);
      var db = (b[0] - ccy) * (b[0] - ccy) + (b[1] - ccx) * (b[1] - ccx);
      return da - db;
    });
    // Sin capar ni por zoom ni por número de bloques: a gran escala puede
    // tardar más porque las celdas se consultan por tandas pequeñas, pero la
    // cobertura no se queda recortada a un círculo central.
    return lista;
  }

  async function pedirBloque(cy, cx, senal) {
    var clave = claveBloque(cy, cx);
    bloques.set(clave, { estado: 'cargando', datos: null });
    try {
      var s = (cy * BLOQUE_GRADOS).toFixed(6), n = ((cy + 1) * BLOQUE_GRADOS).toFixed(6);
      var w = (cx * BLOQUE_GRADOS).toFixed(6), e = ((cx + 1) * BLOQUE_GRADOS).toFixed(6);
      var resp = await fetch('/catastro-edificios?s=' + s + '&w=' + w + '&n=' + n + '&e=' + e, { signal: senal });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var fc = await resp.json();
      if (!fc || !Array.isArray(fc.features)) throw new Error('respuesta inválida');
      // La cabecera del Worker distingue un hueco real ('vacio'/'cache'
      // sin features) de un fallo del Catastro ('error:...'): lo segundo
      // se trata como bloque fallido y su ventana de reintento lo vuelve
      // a intentar, no se da por bueno un vacío que no lo es.
      var aviso = String(resp.headers.get('X-Proxy-Aviso') || '');
      if (fc.features.length === 0 && aviso.indexOf('error:') === 0) {
        console.warn('[Catastro 3D] bloque ' + clave + ' falló en el proxy: ' + aviso);
        throw new Error('proxy ' + aviso);
      }
      bloques.set(clave, { estado: fc.features.length ? 'ok' : 'vacia', datos: fc });
      console.debug('[Catastro 3D] bloque ' + clave + ': ' + fc.features.length + ' edificios' + (aviso ? ' [' + aviso + ']' : ''));
      // Pintar EN CUANTO llega: no se espera a que la tanda entera
      // acabe. Si el mapa base aún está cargando, repintar() solo
      // reprograma su espera y no molesta.
      repintar();
      return fc.features.length > 0;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        // La petición se abandonó porque el usuario movió el mapa de
        // verdad, no por un fallo: el bloque queda reintentable de
        // inmediato para la nueva vista.
        bloques.set(clave, { estado: 'error', datos: null, t: 0 });
        return false;
      }
      bloques.set(clave, { estado: 'error', datos: null, t: Date.now() });
      console.error('[Catastro 3D] bloque ' + clave + ' ERROR:', (err && err.message) || err);
      return false;
    }
  }

  // Cola concurrente: PETICIONES_EN_VUELO obreros recorren la lista ya
  // ordenada (centro primero). Cuando uno acaba lanza el siguiente sin
  // esperar a sus compañeros, y cada respuesta se pinta al llegar.
  async function recorrerCola(lista, senal) {
    var siguiente = 0;
    async function obrero() {
      while (signalViva(senal) && siguiente < lista.length) {
        var trabajo = lista[siguiente++];
        var clave = claveBloque(trabajo[0], trabajo[1]);
        var previo = bloques.get(clave);
        if (previo && previo.estado !== 'error') continue; // ya está en memoria o en vuelo
        // Un bloque que falló no se reintenta en caliente: 5 min de espera
        if (previo && previo.estado === 'error' && (previo.t || 0) > 0 && Date.now() - previo.t < 300000) continue;
        await pedirBloque(trabajo[0], trabajo[1], senal);
      }
    }
    var obreros = [];
    for (var k = 0; k < PETICIONES_EN_VUELO; k++) obreros.push(obrero());
    await Promise.all(obreros);
  }

  function signalViva(senal) {
    return activo && !document.hidden && senal && !senal.aborted;
  }

  // ---------- repintado ----------
  var esperandoIdle = false; // evita apilar map.once('idle') en cadena

  // Red de seguridad: si con las nubes y las sombras activas el mapa no
  // llega a 'idle' (siempre hay una fuente cargando), la espera no puede
  // durar eternamente: a los 2,5 s se repinta con lo que haya. El riesgo
  // de pintar un duplicado antes de que OSM termine se acepta a cambio
  // de no congelar la capa para siempre.
  var alFinalemperaIdle = null; // el manejador 'idle' en vuelo, por si hay que retirarlo
  function esperarMapaListo(callback) {
    if (map.loaded()) { callback(); return; }
    if (!esperandoIdle) {
      esperandoIdle = true;
      esperaAbiertaEn = Date.now();
      alFinalemperaIdle = function () { esperandoIdle = false; alFinalemperaIdle = null; callback(); };
      map.once('idle', alFinalemperaIdle);
      setTimeout(function () {
        if (esperandoIdle) {
          esperandoIdle = false;
          try { if (alFinalemperaIdle) map.off('idle', alFinalemperaIdle); } catch (e) { }
          alFinalemperaIdle = null;
          callback();
        }
      }, 2500);
    }
    // Si ya había una espera abierta, la devolución de llamada actual se
    // pierde a propósito: la que esté colgada pintará con los datos nuevos
    // cuando salte (idle o el plazo de 2,5 s).
  }

  function repintar() {
    try {
      if (!activo || !map.getSource(SRC)) return;
      if (map.getZoom() < ZOOM_MINIMO) {
        map.getSource(SRC).setData({ type: 'FeatureCollection', features: [] });
        return;
      }
      // Esperar a que el mapa base haya cargado sus teselas antes de
      // decidir qué huecos rellenar: si no, faltan edificios OSM y se
      // levantarían duplicados que luego quedarían bajo los de OSM.
      // Con tope de 2,5 s para no quedarse colgados si el mapa nunca
      // llega a idle (nubes, sombras y otras capas cargando sin fin).
      if (!map.loaded()) {
        esperarMapaListo(repintar);
        return;
      }

      var rejillaOsm = construirRejillaOsm();
      var b = map.getBounds();
      var sur = b.getSouth() - COLCHON_GRADOS, oeste = b.getWest() - COLCHON_GRADOS;
      var norte = b.getNorth() + COLCHON_GRADOS, este = b.getEast() + COLCHON_GRADOS;
      var candidatos = []; // {dc, feature}
      var celdasCatastro = new Set(); // dedupe de huellas catastrales superpuestas
      var centroVista = map.getCenter();
      var cosLatVista = Math.cos((centroVista.lat * Math.PI) / 180);

      bloques.forEach(function (bloque, clave) {
        if (bloque.estado !== 'ok' || !bloque.datos) return;
        var xy = clave.split('x');
        var cy = Number(xy[0]), cx = Number(xy[1]);
        // ¿el bloque toca la vista actual?
        if ((cy + 1) * BLOQUE_GRADOS < sur || cy * BLOQUE_GRADOS > norte) return;
        if ((cx + 1) * BLOQUE_GRADOS < oeste || cx * BLOQUE_GRADOS > este) return;
        for (var i = 0; i < bloque.datos.features.length; i++) {
          try {
            var f = bloque.datos.features[i];
            var coords = f.geometry && f.geometry.coordinates;
            if (!coords || !coords[0] || coords[0].length < 4) continue;
            var ext = coords[0];
            var minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
            for (var k = 0; k < ext.length; k++) {
              if (ext[k][0] < minLon) minLon = ext[k][0];
              if (ext[k][0] > maxLon) maxLon = ext[k][0];
              if (ext[k][1] < minLat) minLat = ext[k][1];
              if (ext[k][1] > maxLat) maxLat = ext[k][1];
            }
            // Recorte rápido: huella fuera de pantalla
            if (maxLon < oeste || minLon > este || maxLat < sur || minLat > norte) continue;
            var clon = (minLon + maxLon) / 2, clat = (minLat + maxLat) / 2;
            // Dedupe: varias partes pueden solaparse (edificio + partes).
            // La celda es fina (~5 m) para no tragarnos casas adosadas
            // vecinas: las partes que se solapan tienen centroides casi
            // idénticos, no separados por calles.
            var celdaC = Math.floor(clat / 0.00005) + ':' + Math.floor(clon / 0.00005);
            if (celdasCatastro.has(celdaC)) continue;
            // OSM solo tapa el edificio catastral si las huellas se solapan.
            // No descartar por el centroide: una casa vecina pegada puede
            // contenerlo por error y dejar huecos completos en la manzana.
            if (huellaCatastroSolapaOsm(ext, rejillaOsm)) continue;
            celdasCatastro.add(celdaC);
            var plantas = f.properties ? f.properties.p : null;
            var estimada = !(plantas > 0);
            var altura = estimada ? ALTURA_SIN_DATO_M : plantas * ALTURA_PLANTA_M;
            var dx = (clon - centroVista.lng) * cosLatVista, dy = clat - centroVista.lat;
            var anillos = [decimarAnillo(ext, MAX_PUNTOS_ANILLO)];
            for (var h = 1; h < coords.length; h++) anillos.push(decimarAnillo(coords[h], MAX_PUNTOS_ANILLO));
            candidatos.push({
              dc: dx * dx + dy * dy, // distancia al centro (para el recorte)
              feature: { type: 'Feature', properties: { h: altura, est: estimada ? 1 : 0 }, geometry: { type: 'Polygon', coordinates: anillos } },
            });
          } catch (e) { continue; }
        }
      });

      // Sin recorte por densidad (2026-11-10-c): se pintan TODOS los
      // edificios válidos de los bloques visibles para que Catastro
      // complete los huecos de OSM. El recorte a MAX_EDIFICIOS_EN_VISTA
      // quedó retirado: dejaba manzanas enteras sin volumen en vistas
      // densas. Si algún día hiciera falta un tope en móviles muy
      // modestos, se aplicaría por proximidad al centro ANTES de pintar.
      var finales = candidatos.map(function (c) { return c.feature; });
      console.debug('[Catastro 3D] repintado: ' + finales.length + ' edificios (zoom ' + map.getZoom().toFixed(1) + ', bloques en memoria ' + bloques.size + ')');
      map.getSource(SRC).setData({
        type: 'FeatureCollection',
        features: finales,
      });
      // La MISMA lista alimenta las sombras: lo que se ve es lo que
      // proyecta. Si cambia el conjunto (otro sitio del mapa), lo último
      // conocido deja de valer: no se muestran sombras de otra zona.
      var firmaNueva = finales.length + '|' + (finales.length ? finales[0].geometry.coordinates[0][0].join(',') : 'v');
      if (firmaNueva !== firmaEdificios) {
        firmaEdificios = firmaNueva;
        ultimosEdificiosVisibles = finales;
        ultimaRespuestaSombras = null;
      }
    } catch (e) { /* nunca romper el mapa por esta capa */ }
  }

  var cargandoAhora = false; // solo una pasada activa a la vez

  async function cargarVista() {
    try {
      if (!activo || !map || document.hidden || cargandoAhora) return;
      cargandoAhora = true;
      try {
        // Los bloques en memoria se recortan: en una sesión larga no deben
        // acumularse megas de GeoJSON de zonas que ya no se ven.
        if (bloques.size > 120) {
          var sobran = bloques.size - 120;
          var iter = bloques.keys();
          for (var r = 0; r < sobran; r++) {
            var k0 = iter.next().value;
            var b0 = bloques.get(k0);
            if (b0 && b0.estado !== 'cargando') bloques.delete(k0);
          }
        }
        var lista = bloquesDeLaVista(); // ordenada: primero el centro de la pantalla
        var vistaAlEmpezar = map.getCenter().wrap().lng + ',' + map.getCenter().lat.toFixed(5);
        // NO se aborta al entrar: las peticiones en vuelo de la pasada
        // anterior siguen siendo útiles (bloques fijos, no dependen de la
        // vista). Solo se abandonan cuando el usuario mueve el mapa de
        // verdad (ver enganche 'movestart').
        if (!controlAbortar || controlAbortar.signal.aborted) controlAbortar = new AbortController();
        var senal = controlAbortar.signal;
        // Cola concurrente: 3 en vuelo, cada respuesta se pinta al llegar
        // (pedirBloque llama a repintar()).
        await recorrerCola(lista, senal);
        // Bloques aún sin pedir o con error reintentable: otra pasada.
        // Los errores recientes esperan su ventana de reintento sin
        // provocar un bucle de peticiones cada medio segundo.
        var quedanBloques = false, esperaReintento = Infinity;
        for (var q = 0; q < lista.length; q++) {
          var estadoBloque = bloques.get(claveBloque(lista[q][0], lista[q][1]));
          if (!estadoBloque) { quedanBloques = true; break; }
          if (estadoBloque.estado === 'error') {
            var restante = 300000 - (Date.now() - (estadoBloque.t || 0));
            if (restante <= 0) { quedanBloques = true; break; }
            if (restante < esperaReintento) esperaReintento = restante;
          }
        }
        // Si el usuario movió el mapa mientras la cola trabajaba con la
        // lista vieja, otra pasada pide los bloques de la vista nueva
        // (los que ya están en memoria no se repiden).
        if (activo && !document.hidden) {
          var c = map.getCenter();
          if ((c.wrap().lng + ',' + c.lat.toFixed(5)) !== vistaAlEmpezar) { programar(); return; }
        }
        if (quedanBloques && activo && !senal.aborted) programar();
        else if (esperaReintento < Infinity && activo && !senal.aborted) programar(esperaReintento + 50);
      } finally {
        cargandoAhora = false;
      }
    } catch (e) { /* silencio total */ cargandoAhora = false; }
  }

  function programar(espera) {
    try {
      clearTimeout(temporizador);
      temporizador = setTimeout(cargarVista, espera == null ? 500 : espera);
    } catch (e) { }
  }

  // Solo un movimiento REAL del usuario (arrastre, rueda, pinch o una
  // animación de flyTo lanzada por la web) abandona las peticiones en
  // vuelo. Los eventos 'sourcedata' de nubes, sombras y demás capas no
  // tocan lo que ya está en el aire: el Catastro tarda ~2 s por bloque y
  // cancelar por un simple evento de datos hacía que ningún bloque
  // llegase nunca a completarse.
  function alEmpezarMovimiento(e) {
    try {
      if (!e || !e.originalEvent) return; // evento sintético: ignorar
      movimientoReal = true;
      if (controlAbortar) { try { controlAbortar.abort(); } catch (e2) { } }
      controlAbortar = null;
    } catch (e2) { }
  }

  // Los datos de CUALQUIER fuente disparan 'sourcedata', incluido el setData
  // de la nuestra propia: hay que filtrar, o repintar() → setData →
  // sourcedata → programar() quedaría en un ciclo sin fin. Cuando el mapa
  // está quieto y cargado (map.loaded()) no hay nada nuevo que mirar; si
  // no lo está, se repasa la cola PASADO un plazo (no cada 500 ms en
  // cadena mientras nubes/sombras cargan teselas sin fin).
  function alRecibirDatos(e) {
    try {
      if (e && e.sourceId === SRC) return;
      if (map.loaded()) return;
      if (!movimientoReal) programar(1500); // descanso: no atiborrar mientras carga el mapa base
      movimientoReal = false;
    } catch (e2) { }
  }

  var enganchado = false; // evita duplicar listeners si se alterna dos veces

  function alternar(activoNuevo) {
    try {
      activo = !!activoNuevo;
      if (activo) {
        // Si el estilo del mapa aún se está cargando, addSource puede
        // fallar: se reintenta cuando el mapa quede listo.
        try { asegurarCapa(); } catch (e0) {
          map.once('idle', function () {
            try { if (activo) { asegurarCapa(); programar(); } } catch (e2) { }
          });
        }
        if (!enganchado) {
          enganchado = true;
          map.on('moveend', programar);
          map.on('movestart', alEmpezarMovimiento);
          map.on('sourcedata', alRecibirDatos);
        }
        programar();
      } else {
        if (enganchado) {
          enganchado = false;
          try { map.off('moveend', programar); } catch (e) { }
          try { map.off('movestart', alEmpezarMovimiento); } catch (e) { }
          try { map.off('sourcedata', alRecibirDatos); } catch (e) { }
        }
        clearTimeout(temporizador);
        if (controlAbortar) { try { controlAbortar.abort(); } catch (e) { } controlAbortar = null; }
        quitarCapa(); // libera capa, fuente y memoria de la GPU
        // Los bloques en memoria se conservan: al reactivar no se repiden.
        // Al apagar, las sombras del Catastro salen de la fuente 'sombras'
        // en el acta: el gancho devolverá null y el motor queda como antes.
        ultimaRespuestaSombras = null;
        try { if (typeof window.manolitAireRecalcularSombras === 'function') window.manolitAireRecalcularSombras(); } catch (e) { }
      }
    } catch (e) { }
  }

  // ---------- sombras: Web Worker y enganche con el motor ----------
  function obtenerWorkerSombras() {
    if (workerRoto) return null;
    if (!workerSombras) {
      try {
        workerSombras = new Worker('/js/shadow-worker.js');
        workerSombras.onmessage = function (ev) {
          try {
            var msg = ev.data || {};
            var resolver = esperandoRespuesta.get(msg.id);
            if (!resolver) return;
            esperandoRespuesta.delete(msg.id);
            resolver(msg.ok ? msg.resultado : null);
          } catch (e) { }
        };
        workerSombras.onerror = function () {
          workerRoto = true; // sin worker: el mapa sigue igual, sin sombras del Catastro
        };
      } catch (e) { workerRoto = true; workerSombras = null; }
    }
    return workerSombras;
  }

  function lanzarSiguienteTrabajoSombras() {
    if (!trabajoPendiente || trabajoEnCurso) return;
    var trabajo = trabajoPendiente;
    trabajoPendiente = null;
    trabajoEnCurso = true;
    var id = siguienteIdMensaje++;
    var promesa = new Promise(function (res) {
      esperandoRespuesta.set(id, res);
      // El worker nunca puede dejar esto colgado: a los 8 s se da por fallido
      setTimeout(function () {
        if (esperandoRespuesta.has(id)) { esperandoRespuesta.delete(id); res(null); }
      }, 8000);
    });
    try {
      workerSombras.postMessage({ id: id, tipo: 'sombras-edificios', payload: trabajo.payload });
    } catch (e) {
      esperandoRespuesta.delete(id);
      trabajoEnCurso = false;
      return;
    }
    promesa.then(function (resultado) {
      trabajoEnCurso = false;
      try {
        if (resultado && resultado.anillos) {
          var feats = [];
          for (var i = 0; i < resultado.anillos.length; i++) {
            feats.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [resultado.anillos[i]] } });
          }
          cacheSombras.set(trabajo.clave, feats);
          // FIFO: la caché de sombras no crece sin fin en sesiones largas
          while (cacheSombras.size > 40) {
            var vieja = cacheSombras.keys().next().value;
            cacheSombras.delete(vieja);
          }
          ultimaRespuestaSombras = feats;
          // Ya está lo nuevo: se pide un repintado para que entre en la
          // fuente 'sombras' (la ruta y los aparcamientos la leen de ahí).
          if (activo && SOMBRAS_CATASTRO_ACTIVAS && typeof window.manolitAireRecalcularSombras === 'function') {
            window.manolitAireRecalcularSombras();
          }
        }
      } catch (e) { }
      lanzarSiguienteTrabajoSombras();
    });
  }

  function asegurarSombras(clave, payload) {
    if (cacheSombras.has(clave)) return;
    if (!obtenerWorkerSombras()) return;
    trabajoPendiente = { clave: clave, payload: payload }; // gana el más reciente
    lanzarSiguienteTrabajoSombras();
  }

  // Enganche con el motor de sombras (recalcularSombrasVisibles lo llama
  // en cada barrido, síncrono): devuelve al instante lo que haya en caché
  // para esa franja solar y, si falta, lo pide al Web Worker. El control
  // de hora NUNCA espera: mientras el worker calcula se sigue mostrando
  // la última tanda conocida y la nueva entra cuando llega.
  window.__manolitoSombrasCatastro = function (posSol) {
    try {
      if (!SOMBRAS_CATASTRO_ACTIVAS || !activo) return null;
      if (!posSol || !(posSol.altitude > 0)) return null;
      var edificios = ultimosEdificiosVisibles;
      if (!edificios || !edificios.length) return null;
      var azimutGrados = (posSol.azimuth * 180) / Math.PI + 180;
      var bearing = (azimutGrados + 180) % 360;
      // Franja solar de medio grado: mover un poco el mapa o el tick del
      // reloj cae casi siempre en la misma franja y sale de la caché.
      var franja = (Math.round(azimutGrados * 2) / 2) + '|' + (Math.round((posSol.altitude / (Math.PI / 180)) * 2) / 2);
      var clave = firmaEdificios + '|' + franja;
      var enCache = cacheSombras.get(clave);
      if (enCache) return enCache;
      var lista = [];
      for (var i = 0; i < edificios.length; i++) {
        var anillo = edificios[i].geometry && edificios[i].geometry.coordinates && edificios[i].geometry.coordinates[0];
        if (anillo && anillo.length >= 4) lista.push({ ring: anillo, alturaM: edificios[i].properties.h });
      }
      if (lista.length) asegurarSombras(clave, { edificios: lista, altitudRad: posSol.altitude, bearingSombraDeg: bearing });
      return ultimaRespuestaSombras;
    } catch (e) { return null; }
  };

  // Enganche público: lo llama el interruptor «Catastro 3D» de shadows-route.js
  window.manolitoCatastro3D = function (activoNuevo) {
    try { alternar(activoNuevo); } catch (e) { }
  };
  window.__manolitoCatastroDebug = function () {
    var resumen = { activos: activo, zoom: map && map.getZoom(), bloques: bloques.size, peticiones: 0, edificiosRecibidos: 0, fallos: 0 };
    bloques.forEach(function (b) {
      if (b.estado === 'cargando') resumen.peticiones++;
      if (b.estado === 'error') resumen.fallos++;
      if (b.datos && b.datos.features) resumen.edificiosRecibidos += b.datos.features.length;
    });
    return resumen;
  };

  // Arranque: espera al mapa con reintentos suaves (patrón arboles-3d.js)
  (function arrancar(intentos) {
    try {
      if (window.manolitAireMap) {
        map = window.manolitAireMap;
        // Si el usuario activó el interruptor antes de que el mapa existiera
        // (alternar(true) no pudo enganchar listeners sin mapa): se repite
        if (activo) alternar(true);
        // Si el estilo se recarga (cambio de tema), la capa muere con él:
        // al reactivar (o si ya estaba activo) se vuelve a crear de cero.
        map.on('styledata', function () {
          try {
            if (activo && !map.getLayer(CAPA)) {
              asegurarCapa();
              repintar();
            }
          } catch (e) { }
        });
      } else if (intentos < 90) {
        setTimeout(function () { arrancar(intentos + 1); }, 500);
      }
    } catch (e) { /* este módulo jamás rompe el arranque del mapa */ }
  })(0);
})();
