/* ============================================================================
   arboles-sevilla.js · Inventario oficial de árboles del Ayuntamiento de
   Sevilla (Parques y Jardines) integrado en la capa de árboles globales de
   js/shadows-route.js.

   QUÉ HACE
   --------
   1. Carga perezosa (solo si la vista está en Sevilla) del GeoJSON
      data/arboles-inventario-sevilla.geojson, generado a partir del CSV
      oficial "Parques_y_Jardines_Inventario_de_Arboles_sevilla.csv"
      (coordenadas UTM 30N convertidas a WGS84; la conversión y el filtro
      anti-duplicado frente a OSM se hicieron en herramientas/, ver
      tools_csv_a_geojson.py).
   2. Convierte cada feature al MISMO formato interno que usa la capa OSM
      (punto turf, altura, radioCopaM, nombre, forma, color, tipo), reutilizando
      clasificarArbol() y estimarDimensionesArbol() de shadows-route.js: así el
      inventario oficial se pinta, sombrea y estacionaliza igual que los de OSM.
   3. ANTI-CHOQUE CON OSM en dos niveles:
      a) Estático: el GeoJSON ya excluye los árboles a menos de 7 m de uno OSM.
      b) En vivo: al cargar nodos OSM y al pintar, si un árbol OSM coincide
         (misma posición a <7 m) con uno del inventario, EL OFICIAL gana:
         tiene especie, altura y perímetro medidos de verdad, así que el
         de OSM no se añade/pinta. Así no se dibuja el mismo árbol doble.
      Además alimenta window.manolitAireArboles3D fusionando ambas fuentes
      sin duplicar (arboles-3d.js no cambia).
   4. Los árboles oficiales llevan en su nombre el sello «· inventario
      oficial», para que el popup sea honesto sobre la fuente.

   ADITIVO: no toca la consulta Overpass ni elimina nada; si este archivo
   falla o el GeoJSON no carga, la app funciona exactamente igual que antes.
   Licencia: AGPL-3.0, igual que el resto del proyecto.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__manolitoArbolesSevilla) return;
  window.__manolitoArbolesSevilla = true;

  // El GeoJSON vive comprimido (.gz) para respetar el límite de assets de
  // Cloudflare. Su lectura y el filtrado espacial se ejecutan en un Web Worker.
  // Bbox aproximado de Sevilla: fuera de aquí el inventario no existe y no
  // tiene sentido ni descargarlo ni mezclarlo (ahorra red en otras ciudades).
  var SEVILLA = { oeste: -6.12, este: -5.80, sur: 37.28, norte: 37.46 };
  var DISTANCIA_DUP_M = 7; // misma que el filtro estático del conversor

  var estado = {
    cargado: false,
    cargando: null,   // promesa en curso
    features: [],     // árboles del inventario ya convertidos
    worker: null,
    consultas: new Map(),
    siguienteConsulta: 1,
  };

  function enSevilla(map) {
    try {
      var b = map.getBounds();
      return b.getEast() > SEVILLA.oeste && b.getWest() < SEVILLA.este &&
        b.getNorth() > SEVILLA.sur && b.getSouth() < SEVILLA.norte;
    } catch (e) { return false; }
  }

  // Rejilla espacial sobre el subconjunto de la vista (máximo 1400 árboles).
  var CELDA = 0.004;
  function celdaDe(lon, lat) { return Math.floor(lat / CELDA) + ',' + Math.floor(lon / CELDA); }
  var rejilla = new Map();

  function construirRejilla() {
    rejilla = new Map();
    for (var i = 0; i < estado.features.length; i++) {
      var a = estado.features[i];
      var c = a.punto.geometry.coordinates;
      var k = celdaDe(c[0], c[1]);
      if (!rejilla.has(k)) rejilla.set(k, []);
      rejilla.get(k).push(a);
    }
  }

  function obtenerWorker() {
    if (estado.worker) return estado.worker;
    if (typeof Worker !== 'function') return null;
    try {
      var worker = new Worker('js/arboles-sevilla-worker.js?v=20261118-a');
      worker.onmessage = function (evento) {
        var m = evento.data || {};
        var pendiente = estado.consultas.get(m.id);
        if (!pendiente) return;
        estado.consultas.delete(m.id);
        if (m.error) pendiente.reject(new Error(m.error));
        else pendiente.resolve(m.features || []);
      };
      worker.onerror = function (evento) {
        estado.consultas.forEach(function (p) { p.reject(new Error(evento.message || 'Error en worker')); });
        estado.consultas.clear();
        try { worker.terminate(); } catch (e) { /* sin acción */ }
        estado.worker = null;
      };
      estado.worker = worker;
      return worker;
    } catch (e) { return null; }
  }

  function consultarWorker(caja) {
    var worker = obtenerWorker();
    if (!worker) return Promise.reject(new Error('Web Worker no disponible'));
    var id = estado.siguienteConsulta++;
    return new Promise(function (resolve, reject) {
      estado.consultas.set(id, { resolve: resolve, reject: reject });
      worker.postMessage({ tipo: 'consulta', id: id, caja: caja, centro: [(caja[0] + caja[2]) / 2, (caja[1] + caja[3]) / 2] });
    });
  }

  function obtenerOficialesEnBounds(bounds) {
    if (!estado.features.length) return [];
    var oeste = bounds.getWest(), este = bounds.getEast();
    var sur = bounds.getSouth(), norte = bounds.getNorth();
    return estado.features.filter(function (a) {
      var c = a.punto.geometry.coordinates;
      return c[0] >= oeste && c[0] <= este && c[1] >= sur && c[1] <= norte;
    });
  }

  // ¿Hay árbol del INVENTARIO a <7 m de este punto OSM? Devuelve el árbol
  // oficial (truthy) o null. Lo llama shadows-route.js antes de añadir un
  // nodo OSM, para que el dato oficial gane y no se pinte doble.
  window.manolitAireArbolesOficialesDuplicado = function (lon, lat) {
    if (!estado.cargado || lon == null || lat == null) return null;
    return hayInventarioCerca(lon, lat);
  };

  // ¿Hay árbol del inventario a menos de DISTANCIA_DUP_M de (lon, lat)?
  function hayInventarioCerca(lon, lat) {
    if (!rejilla || !estado.features.length) return null;
    var cy = Math.floor(lat / CELDA), cx = Math.floor(lon / CELDA);
    var cosLat = Math.cos(lat * Math.PI / 180);
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var grupo = rejilla.get((cy + dy) + ',' + (cx + dx));
        if (!grupo) continue;
        for (var i = 0; i < grupo.length; i++) {
          var c = grupo[i].punto.geometry.coordinates;
          var dmx = (c[0] - lon) * cosLat * 111320;
          var dmy = (c[1] - lat) * 110540;
          if (dmx * dmx + dmy * dmy < DISTANCIA_DUP_M * DISTANCIA_DUP_M) return grupo[i];
        }
      }
    }
    return null;
  }

  function tagsDePropiedades(p) {
    // El PERIMETRO del CSV viene en CENTÍMETROS; la etiqueta circumference
    // que consume estimarDimensionesArbol() usa METROS (semántica OSM).
    // Se pasa SOLO cuando falta la altura: allí sirve para estimarla. Si la
    // altura medida existe, no se pasa, porque diametroCopa = circ/π es el
    // diámetro del TRONCO, no de la copa: con el perímetro real siempre
    // presente, la copa saldría siempre con el suelo de 0.6 m y los árboles
    // del inventario se verían como puntos sin copa ni sombra.
    var tags = { species: p.species || '', height: p.altura, circumference: null };
    if (!p.altura && p.perimetro) tags.circumference = parseFloat(p.perimetro) / 100;
    return tags;
  }

  function convertirFeature(f, turf) {
    if (!f.geometry || f.geometry.type !== 'Point') return null;
    var p = f.properties || {};
    var coords = f.geometry.coordinates;
    // Etiquetas con el mismo vocabulario que usa clasificarArbol(): así
    // el inventario se clasifica (naranjo, palmera, albizia…) igual
    // que un nodo de OSM con species.
    var tags = tagsDePropiedades(p);
    var clas = window.manolitoClasificarArbol
      ? window.manolitoClasificarArbol(tags)
      : { tipo: 'generico', forma: 'redondeada', color: '#7fb069' };
    var dims = window.manolitoEstimarDimensionesArbol
      ? window.manolitoEstimarDimensionesArbol(tags, clas)
      : { altura: p.altura || 6, radioCopaM: 3 };
    if (!dims.altura || dims.altura <= 2) return null;
    return {
      punto: turf.point([coords[0], coords[1]]),
      altura: dims.altura,
      radioCopaM: dims.radioCopaM,
      nombre: (p.species || 'Árbol') + ' · inventario oficial',
      forma: clas.forma,
      color: clas.color,
      tipo: clas.tipo,
      oficial: true,
      fuente: 'Ayto. Sevilla',
      distrito: p.distrito || null,
    };
  }





  // ---------------------------------------------------------------------------
  // API pública. shadows-route.js y arboles-3d.js la consultan si existe.
  // ---------------------------------------------------------------------------

  // Árboles del inventario en la vista (para quien quiera solo la capa oficial)
  window.manolitAireArbolesOficiales = function (bounds) {
    if (!bounds || !bounds.getWest) return estado.features;
    return obtenerOficialesEnBounds(bounds);
  };

  // Fusión SIN DUPLICADOS: oficial + osm. Un árbol OSM se descarta si hay
  // uno del inventario a <7 m (el dato oficial, con especie y altura real,
  // manda). Devuelve el array combinado en el formato interno común.
  window.manolitAireArbolesFusionados = function (arbolesOsm, bounds) {
    var oficiales = window.manolitAireArbolesOficiales(bounds);
    if (!oficiales.length) return arbolesOsm || [];
    var salida = oficiales.slice();
    if (!arbolesOsm || !arbolesOsm.length) return salida;
    for (var i = 0; i < arbolesOsm.length; i++) {
      var a = arbolesOsm[i];
      if (a.oficial) continue;
      var [lon, lat] = a.punto.geometry.coordinates;
      var cerca = hayInventarioCerca(lon, lat);
      if (cerca) {
        // Ya está cubierto por el dato oficial: fuera. (Ni OSM gana ni
        // se pinta doble: el inventario tiene especie, altura y perímetro
        // medidos de verdad.)
        continue;
      }
      salida.push(a);
    }
    return salida;
  };

  // Descarga perezosa y por vista: el worker consulta solo el rectángulo
  // visible; nunca se parsean ni se recorren los 188.000 árboles en el hilo UI.
  window.manolitAireArbolesOficialesCargarSiToca = function (map) {
    if (!map || !enSevilla(map)) return Promise.resolve(false);
    var b = map.getBounds();
    var caja = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    // Al alejarse mucho, conserva un vecindario razonable alrededor del centro
    // y limita la capa oficial a 1400 puntos para no saturar fuentes ni render.
    if (Math.abs(caja[2] - caja[0]) > 0.12 || Math.abs(caja[3] - caja[1]) > 0.10) {
      caja = [Math.max(caja[0], -6.12), Math.max(caja[1], 37.28), Math.min(caja[2], -5.80), Math.min(caja[3], 37.46)];
      var mitadLon = (caja[0] + caja[2]) / 2, mitadLat = (caja[1] + caja[3]) / 2;
      caja = [Math.max(caja[0], mitadLon - 0.06), Math.max(caja[1], mitadLat - 0.05), Math.min(caja[2], mitadLon + 0.06), Math.min(caja[3], mitadLat + 0.05)];
    }
    return consultarWorker(caja)
      .then(function (features) {
        var convertidos = [];
        for (var i = 0; i < features.length; i++) {
          var arbol = convertirFeature(features[i], window.turf);
          if (arbol) convertidos.push(arbol);
        }
        estado.features = estado.features.filter(function (a) {
          var c = a.punto.geometry.coordinates;
          return c[0] < caja[0] || c[0] > caja[2] || c[1] < caja[1] || c[1] > caja[3];
        }).concat(convertidos);
        construirRejilla();
        estado.cargado = true;
        var centroConsulta = [(caja[0] + caja[2]) / 2, (caja[1] + caja[3]) / 2];
        var dCentro = function (a) {
          var c = a.punto.geometry.coordinates;
          var dx = (c[0] - centroConsulta[0]) * Math.cos(centroConsulta[1] * Math.PI / 180);
          var dy = c[1] - centroConsulta[1];
          return dx * dx + dy * dy;
        };
        estado.features.sort(function (a, b) { return dCentro(a) - dCentro(b); });
        if (estado.features.length > 1400) estado.features.length = 1400;
        construirRejilla();
        return true;
      })
      .catch(function (e) {
        console.warn('[arboles-sevilla] Consulta del inventario no disponible:', e && e.message);
        return false;
      });
  };

  // Telemetría ligera por consola (window.manolitAireArbolesOficialesDebug)
  window.manolitAireArbolesOficialesDebug = function () {
    return { cargado: estado.cargado, total: estado.features.length };
  };
})();
