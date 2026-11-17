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

  // El GeoJSON vive comprimido (.gz) para poder desplegar en Cloudflare
  // (límite de 25 MiB por asset). El worker lo sirve con Content-Encoding:
  // gzip, así que el navegador lo descomprime de forma transparente.
  // Fallback: si el worker no lo transforma, se descomprime aquí con
  // DecompressionStream('gzip').
  var GEOJSON_URL = 'data/arboles-inventario-sevilla.geojson.gz';
  // Bbox aproximado de Sevilla: fuera de aquí el inventario no existe y no
  // tiene sentido ni descargarlo ni mezclarlo (ahorra red en otras ciudades).
  var SEVILLA = { oeste: -6.12, este: -5.80, sur: 37.28, norte: 37.46 };
  var DISTANCIA_DUP_M = 7; // misma que el filtro estático del conversor

  var estado = {
    cargado: false,
    cargando: null,   // promesa en curso
    features: [],     // árboles del inventario ya convertidos
  };

  function enSevilla(map) {
    try {
      var b = map.getBounds();
      return b.getEast() > SEVILLA.oeste && b.getWest() < SEVILLA.este &&
        b.getNorth() > SEVILLA.sur && b.getSouth() < SEVILLA.norte;
    } catch (e) { return false; }
  }

  // Rejilla espacial del inventario para descartes O(log 1) al pintar
  var CELDA = 0.004;
  function celdaDe(lon, lat) { return Math.floor(lat / CELDA) + ',' + Math.floor(lon / CELDA); }
  var rejilla = null;

  function construirRejilla() {
    rejilla = new Map();
    for (var i = 0; i < estado.features.length; i++) {
      var a = estado.features[i];
      var [lon, lat] = a.punto.geometry.coordinates;
      var k = celdaDe(lon, lat);
      if (!rejilla.has(k)) rejilla.set(k, []);
      rejilla.get(k).push(a);
    }
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
    if (!rejilla) return false;
    var cy = Math.floor(lat / CELDA), cx = Math.floor(lon / CELDA);
    var cosLat = Math.cos(lat * Math.PI / 180);
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var grupo = rejilla.get((cy + dy) + ',' + (cx + dx));
        if (!grupo) continue;
        for (var i = 0; i < grupo.length; i++) {
          var [glon, glat] = grupo[i].punto.geometry.coordinates;
          var dmx = (glon - lon) * cosLat * 111320;
          var dmy = (glat - lat) * 110540;
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

  function cargar() {
    if (estado.cargado) return Promise.resolve(true);
    if (estado.cargando) return estado.cargando;
    estado.cargando = fetch(GEOJSON_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (buf) {
        // A prueba de servidores: algunos sirven el .gz ya descomprimido
        // (content-encoding tratado por el navegador o el CDN) y otros lo
        // dan crudo aunque la cabecera diga gzip. No nos fiamos de
        // cabeceras: miramos los bytes mágicos 1F 8B.
        var bytes = new Uint8Array(buf);
        if (bytes.length > 2 && bytes[0] === 0x1F && bytes[1] === 0x8B) {
          return descomprimirGzip(buf);
        }
        return JSON.parse(new TextDecoder().decode(bytes));
      })
      .then(function (geo) { return aplicarGeojson(geo); })
      .catch(function (e) {
        console.warn('[arboles-sevilla] Inventario oficial no disponible:', e && e.message);
        estado.cargando = null; // permite reintentar más tarde
        return false;
      });
    return estado.cargando;
  }

  // Descompresión manual de gzip en navegadores con DecompressionStream
  // (Chrome 80+, Safari 16.4+, Firefox 113+). Si no está, la capa oficial
  // de árboles no carga y el resto de la app sigue igual que antes.
  function descomprimirGzip(buf) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('Descompresión gzip no disponible');
    }
    var ds = new DecompressionStream('gzip');
    return new Response(new Response(buf).body.pipeThrough(ds)).json();
  }

  function aplicarGeojson(geo) {
    var turf = window.turf;
    if (!turf || !geo || !Array.isArray(geo.features)) throw new Error('GeoJSON/turf no disponible');
    var lista = [];
    for (var i = 0; i < geo.features.length; i++) {
      var a = convertirFeature(geo.features[i], turf);
      if (a) lista.push(a);
    }
    estado.features = lista;
    construirRejilla();
    estado.cargado = true;
    console.info('[arboles-sevilla] Inventario cargado:', lista.length, 'árboles oficiales');
    return true;
  }

  // ---------------------------------------------------------------------------
  // API pública. shadows-route.js y arboles-3d.js la consultan si existe.
  // ---------------------------------------------------------------------------

  // Árboles del inventario en la vista (para quien quiera solo la capa oficial)
  window.manolitAireArbolesOficiales = function (bounds) {
    if (!estado.cargado || !estado.features.length) return [];
    if (!bounds) return estado.features;
    if (!bounds.getWest) return estado.features;
    return estado.features.filter(function (a) {
      var [lon, lat] = a.punto.geometry.coordinates;
      return lon >= bounds.getWest() && lon <= bounds.getEast() &&
        lat >= bounds.getSouth() && lat <= bounds.getNorth();
    });
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

  // Descarga perezosa: la llama shadows-route.js al mover el mapa por Sevilla
  window.manolitAireArbolesOficialesCargarSiToca = function (map) {
    if (!map || !enSevilla(map)) return Promise.resolve(false);
    return cargar();
  };

  // Telemetría ligera por consola (window.manolitAireArbolesOficialesDebug)
  window.manolitAireArbolesOficialesDebug = function () {
    return { cargado: estado.cargado, total: estado.features.length };
  };
})();
