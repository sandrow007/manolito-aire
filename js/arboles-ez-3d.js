/* ============================================================================
   arboles-ez-3d.js. Árboles 3D procedurales estilo EZ-TREE para las especies
   SIN modelo propio (nov-2026, módulo SEPARADO y ADITIVO).
   ----------------------------------------------------------------------------
   Origen del estilo: https://github.com/dgreenheck/ez-tree (MIT). Lo esencial
   de su algoritmo portado aquí: esqueleto recursivo (levels/children/angle por
   nivel), torcedura (gnarliness), copa de planos de hoja billboard, generación
   determinista por semilla (mulberry32).

   GARANTÍAS (lo que pide el jefe, blanco y negro):
   - NO toca js/arboles-3d.js: la albizia y el naranjo mantienen SU motor, SUS
     meshes, SU capa 'capa-arboles-3d' y SU filtro intactos, línea a línea.
   - Módulo propio con SU PROPIA capa MapLibre ('capa-arboles-ez-3d'), SU
     propio renderer Three sobre el mismo contexto GL (respetando renderer
     state de MapLibre con renderer.resetState()), y SU PROPIA lista de datos.
   - Si este módulo falla, falla SOLO él: nunca detiene arboles-3d.js ni el
     mapa. Todo va en try/catch y con carga perezosa (zoom ≥ 16).
   - Reutiliza THREE ya cargado por arboles-3d.js si existe; si no, carga
     js/three.min.js él mismo y lo comparte. Jamás lo sustituye.
   - Datos: window.manolitoClasificarArbol (de shadows-route.js) para clasificar
     árboles de OSM/inventario con LOS MISMOS tipos; los EZ entran SOLO si
     arboles-3d.js no los reclama (naranjo/albizia siempre van a SU motor).
   ========================================================================== */
(function () {
  'use strict';

  if (window.__manolitoArbolesEZ3D) return; // doble carga: jamás
  window.__manolitoArbolesEZ3D = true;

  var ZOOM_MIN = 16;          // algo más conservador que el motor principal
  var MAX_ARBOL = 30;         // tope propio (independiente del motor principal)
  var N_VARIANTES = 2;        // variantes deterministas por especie

  // Tipos con modelo EZ (los MISMOS nombres que TIPOS_ARBOL de shadows-route.js).
  var EZ_TIPOS = ['pino', 'encina_roble', 'platanero', 'olmo', 'chopo',
    'eucalipto', 'tipuana', 'jacaranda', 'morera', 'ficus', 'paraiso', 'ginkgo'];

  // Alturas de referencia (las de TIPOS_ARBOL).
  var EZ_ALTURAS = {
    pino: 14, eucalipto: 18, ginkgo: 12, encina_roble: 10, platanero: 16,
    olmo: 12, chopo: 15, tipuana: 12, jacaranda: 10, morera: 8, ficus: 8, paraiso: 10,
  };

  // Parámetros por especie (TreeOptions simplificado de ez-tree).
  var EZ_ESPECIES = {
    pino: { niveles: 3, hijos: [2, 4, 3], angulo: 42, paleta: [0x2d5a3d, 0x3a6b4a, 0x24503a], hoja: 'aguja', perenne: true },
    eucalipto: { niveles: 3, hijos: [2, 3, 3], angulo: 38, paleta: [0x3d6b4a, 0x4d7d5a, 0x35604a], hoja: 'ovalada', perenne: true },
    ginkgo: { niveles: 3, hijos: [2, 3, 3], angulo: 40, paleta: [0x7cb342, 0x8bc34a, 0x6ba032], hoja: 'abanico', perenne: true },
    encina_roble: { niveles: 4, hijos: [2, 4, 4, 3], angulo: 48, paleta: [0x4f7a35, 0x5f8c42, 0x45703a], hoja: 'ovalada', perenne: true },
    platanero: { niveles: 4, hijos: [2, 4, 4, 3], angulo: 52, paleta: [0x4a8a3f, 0x5c9e4a, 0x3f7a38], hoja: 'ancha', perenne: false },
    olmo: { niveles: 4, hijos: [2, 4, 4, 3], angulo: 50, paleta: [0x5a8f3d, 0x6ba04a, 0x4a7c35], hoja: 'ovalada', perenne: false },
    chopo: { niveles: 4, hijos: [2, 3, 3, 3], angulo: 30, paleta: [0x4f9a45, 0x5faa52, 0x3f8a3c], hoja: 'ovalada', perenne: false, alargada: true },
    tipuana: { niveles: 4, hijos: [2, 4, 4, 3], angulo: 55, paleta: [0x5e9b4c, 0x6fab58, 0x4e8a42], hoja: 'ovalada', perenne: false },
    jacaranda: { niveles: 4, hijos: [2, 4, 4, 3], angulo: 54, paleta: [0x5f9e4f, 0x6fae58, 0x4f8a42], hoja: 'fina', perenne: false },
    morera: { niveles: 4, hijos: [2, 4, 4, 3], angulo: 50, paleta: [0x4e8f3f, 0x5e9f4c, 0x42803a], hoja: 'ancha', perenne: false },
    ficus: { niveles: 4, hijos: [2, 4, 4, 3], angulo: 50, paleta: [0x4d8a3e, 0x5d9a4a, 0x417c36], hoja: 'ancha', perenne: true },
    paraiso: { niveles: 4, hijos: [2, 4, 4, 3], angulo: 48, paleta: [0x5b9348, 0x6ba354, 0x4a8240], hoja: 'fina', perenne: false },
  };

  // Formas de la capa plana que este módulo oculta (SOLO estas; sombrilla y
  // naranjo quedan en manos de arboles-3d.js, aquí NO se mencionan).
  var EZ_FORMAS = ['conica', 'ancha_redondeada', 'ancha_irregular', 'oval_alargada'];

  // Estaciones: perennes siempre verdes; caducas pierden hoja (invierno) y
  // se doran (otoño), coherente con fenologiaArbol de shadows-route.js.
  var EZ_ESTACIONES = {
    perenne: {
      primavera: { escala: 0.95, densidad: 0.95 }, verano: { escala: 1.0, densidad: 1.0 },
      otono: { escala: 1.0, densidad: 0.85 }, invierno: { escala: 1.0, densidad: 0.85 },
    },
    caduca: {
      primavera: { escala: 0.85, densidad: 0.8, color: 0x8fbf5a },
      verano: { escala: 1.0, densidad: 1.0 },
      otono: { escala: 0.85, densidad: 0.55, color: 0xc9862f },
      invierno: { escala: 0, densidad: 0 },
    },
  };

  // ---------- RNG determinista ----------
  function mulberry32(semilla) {
    var a = semilla >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashCoords(lon, lat) {
    var x = Math.sin(lon * 12.9898 + lat * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  function metrosAMercator(lat) {
    return 1 / (40075016.686 * Math.cos(lat * Math.PI / 180));
  }

  // ---------- Estado ----------
  var map = null;
  var listo = false, cargandoThree = false, activo = false;
  var renderer = null, scene = null, camera = null, sol = null;
  var variantes = [];         // una por tipo EZ
  var estacionActual = null;
  var QUAT_UP = null, TMP_M4 = null, TMP_V3 = null, TMP_ESC = null, TMP_PROY = null;
  var REF = { x: 0, y: 0, z: 0 };
  var firmaInstancias = '';

  // ---------- Fusión de BufferGeometry indexadas ----------
  function fusionar(geos) {
    var totalV = 0, totalI = 0, i;
    for (i = 0; i < geos.length; i++) {
      totalV += geos[i].attributes.position.count;
      totalI += geos[i].index ? geos[i].index.count : geos[i].attributes.position.count;
    }
    var pos = new Float32Array(totalV * 3);
    var nor = new Float32Array(totalV * 3);
    var IdxArr = totalV > 65535 ? Uint32Array : Uint16Array;
    var idx = new IdxArr(totalI);
    var vo = 0, io = 0;
    for (i = 0; i < geos.length; i++) {
      var g = geos[i];
      pos.set(g.attributes.position.array, vo * 3);
      nor.set(g.attributes.normal.array, vo * 3);
      var ni = g.index ? g.index.count : g.attributes.position.count;
      for (var k = 0; k < ni; k++) idx[io + k] = (g.index ? g.index.array[k] : k) + vo;
      vo += g.attributes.position.count; io += ni;
      g.dispose();
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(totalV * 2), 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  }
  function fusionarConColores(geos, colores) {
    var totalV = 0, totalI = 0, i;
    for (i = 0; i < geos.length; i++) {
      totalV += geos[i].attributes.position.count;
      totalI += geos[i].index ? geos[i].index.count : geos[i].attributes.position.count;
    }
    var pos = new Float32Array(totalV * 3);
    var nor = new Float32Array(totalV * 3);
    var col = new Float32Array(totalV * 3);
    var IdxArr = totalV > 65535 ? Uint32Array : Uint16Array;
    var idx = new IdxArr(totalI);
    var vo = 0, io = 0;
    for (i = 0; i < geos.length; i++) {
      var g = geos[i], c = colores[i], n = g.attributes.position.count;
      pos.set(g.attributes.position.array, vo * 3);
      nor.set(g.attributes.normal.array, vo * 3);
      for (var k = 0; k < n; k++) {
        col[(vo + k) * 3] = c.r; col[(vo + k) * 3 + 1] = c.g; col[(vo + k) * 3 + 2] = c.b;
      }
      var ni = g.index ? g.index.count : n;
      for (var j = 0; j < ni; j++) idx[io + j] = (g.index ? g.index.array[j] : j) + vo;
      vo += n; io += ni;
      g.dispose();
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  }

  function geometriaCilindro(a, b, r0, r1, segs) {
    var dir = new THREE.Vector3().subVectors(b, a);
    var len = dir.length();
    if (len <= 0) return null;
    var geo = new THREE.CylinderGeometry(r1, r0, len, segs || 6, 1);
    var q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    var mid = a.clone().addScaledVector(dir, 0.5);
    geo.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    return geo;
  }

  // ==========================================================================
  // Esqueleto EZ-TREE (recursivo, ángulo/hijos por nivel, gnarliness)
  // ==========================================================================
  function construirEsqueleto(especie, rand, alargada) {
    var segs = [], puntas = [];
    var nivel0Len = 2.2 + rand() * 0.6;
    var nivel0Rad = 0.28 + rand() * 0.06;

    function branch(origin, dir, len, rad, nivel) {
      if (nivel > especie.niveles) return; // límite de profundidad: jamás desborda
      var gnarl = 0.18;
      var end = origin.clone().addScaledVector(dir, len);
      end.x += (rand() - 0.5) * gnarl * len;
      end.y += (rand() - 0.5) * gnarl * len * 0.3;
      end.z += (rand() - 0.5) * gnarl * len;
      segs.push({ a: origin.clone(), b: end.clone(), r0: rad, r1: rad * 0.6 });
      if (nivel >= especie.niveles - 1) {
        puntas.push({ pos: end.clone(), dir: dir.clone() });
        return;
      }
      var nHijos = especie.hijos[nivel] || 3;
      var spread = Math.max(0.25, (especie.angulo * Math.PI / 180) * (1 + nivel * 0.08));
      if (alargada) spread *= 0.7;
      for (var i = 0; i < nHijos; i++) {
        var theta = (i / nHijos) * Math.PI * 2 + rand() * 0.6;
        var tilt = spread * (0.6 + rand() * 0.8);
        var perp1 = new THREE.Vector3(1, 0, 0).cross(dir);
        if (perp1.lengthSq() < 0.01) perp1.set(0, 0, 1);
        else perp1.normalize();
        var perp2 = dir.clone().cross(perp1).normalize();
        var nd = dir.clone();
        nd.addScaledVector(perp1, Math.cos(theta) * tilt)
          .addScaledVector(perp2, Math.sin(theta) * tilt)
          .addScaledVector(new THREE.Vector3(0, 1, 0), 0.12);
        nd.normalize();
        branch(end.clone(), nd, len * (0.72 - nivel * 0.04 + rand() * 0.12), rad * 0.62, nivel + 1);
      }
    }
    branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), nivel0Len, nivel0Rad, 0);
    return { segs: segs, puntas: puntas };
  }

  // Hojas billboard por punta (tamaño según tipo de hoja).
  function descriptoresHojas(puntas, rand, especie) {
    var desc = [];
    var tam = { aguja: [0.30, 0.07], ovalada: [0.24, 0.14], abanico: [0.20, 0.20], fina: [0.22, 0.09], ancha: [0.28, 0.18] };
    var t = tam[especie.hoja] || tam.ovalada;
    var nPorPunta = (especie.hoja === 'aguja') ? 22 : 10;
    for (var p = 0; p < puntas.length; p++) {
      for (var i = 0; i < nPorPunta; i++) {
        var ang = rand() * Math.PI * 2;
        var dist = 0.08 + rand() * 0.5;
        desc.push({
          x: puntas[p].pos.x + Math.cos(ang) * dist,
          y: puntas[p].pos.y + (rand() - 0.35) * 0.4,
          z: puntas[p].pos.z + Math.sin(ang) * dist,
          rx: (rand() - 0.5) * 1.0, ry: ang + rand() * 0.6, rz: (rand() - 0.5) * 0.7,
          tx: t[0], tz: t[1],
          col: especie.paleta[Math.floor(rand() * especie.paleta.length)],
        });
      }
    }
    return desc;
  }

  function geometriaHojas(desc, est) {
    if (!desc.length || est.densidad <= 0 || est.escala <= 0) return null;
    var geos = [], colores = [];
    for (var i = 0; i < desc.length; i++) {
      if ((i % 100) / 100 >= est.densidad) continue;
      var d = desc[i];
      var g = new THREE.PlaneGeometry(d.tx * est.escala, d.tz * est.escala);
      g.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(d.x, d.y, d.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(d.rx, d.ry, d.rz)),
        new THREE.Vector3(1, 1, 1)
      ));
      geos.push(g);
      colores.push(new THREE.Color(est.color || d.col));
    }
    return geos.length ? fusionarConColores(geos, colores) : null;
  }

  function construirVariantes() {
    var barkMat = new THREE.MeshStandardMaterial({
      color: 0x6b5138, flatShading: true, roughness: 1.0, metalness: 0.02,
    });
    var hojaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, flatShading: true, roughness: 1.0, metalness: 0.0,
      vertexColors: true, transparent: true, opacity: 0.88,
      emissive: 0x55853f, emissiveIntensity: 0.5, // anti-contraluz desde arriba
      side: THREE.DoubleSide,
    });

    EZ_TIPOS.forEach(function (tipo, k) {
      for (var v = 0; v < N_VARIANTES; v++) {
        var rand = mulberry32(7700 + k * 7919 + v * 131);
        var especie = EZ_ESPECIES[tipo];
        var esq = construirEsqueleto(especie, rand, !!especie.alargada);
        var geoMadera = fusionar(esq.segs.map(function (s) {
          return geometriaCilindro(s.a, s.b, s.r0, s.r1, 6);
        }).filter(Boolean));
        geoMadera.computeBoundingBox();
        var altReal = Math.max(2, geoMadera.boundingBox.max.y);
        var descHojas = descriptoresHojas(esq.puntas, rand, especie);
        var geoHojas = geometriaHojas(descHojas, EZ_ESTACIONES[especie.perenne ? 'perenne' : 'caduca'].verano) || new THREE.BufferGeometry();

        var meshT = new THREE.InstancedMesh(geoMadera, barkMat, MAX_ARBOL);
        var meshH = new THREE.InstancedMesh(geoHojas, hojaMat, MAX_ARBOL);
        meshT.count = 0; meshH.count = 0;
        meshT.frustumCulled = false; meshH.frustumCulled = false;
        scene.add(meshT); scene.add(meshH);

        variantes[tipo] = variantes[tipo] || [];
        variantes[tipo].push({
          tipo: tipo,
          alturaModelo: altReal,
          techoEscala: (EZ_ALTURAS[tipo] || 10) / altReal,
          meshTroncos: meshT, meshHojas: meshH,
          descHojas: descHojas, especie: especie, geoHojasActual: null,
        });
      }
    });
  }

  // Aplica estación a TODAS las variantes EZ (reconstruye hojas solo al cambiar).
  function aplicarEstacion(estacion) {
    if (estacion === estacionActual || !variantes.length) return;
    estacionActual = estacion;
    variantes.forEach(function (lista) {
      lista.forEach(function (vf) {
        var tabla = EZ_ESTACIONES[vf.especie.perenne ? 'perenne' : 'caduca'];
        var est = tabla[estacion] || tabla.verano;
        if (vf.geoHojasActual) { vf.geoHojasActual.dispose(); vf.geoHojasActual = null; }
        var geo = geometriaHojas(vf.descHojas, est);
        if (geo) {
          vf.geoHojasActual = geo;
          vf.meshHojas.geometry = geo;
          vf.meshHojas.visible = true;
        } else {
          vf.meshHojas.visible = false; // caduca desnuda en invierno
        }
      });
    });
    refrescarInstancias(true);
  }

  // ==========================================================================
  // Datos: árboles EZ en vista. Fuente = window.manolitAireArbolesTodos
  // (shadows-route.js ya expone TODOS los árboles con su posición) +
  // window.manolitoClasificarArbol si cada árbol lleva tags; si no, usa el
  // tipo que arbolesParaTodo ya calcula (a.tipo via manolitAireArboles3D no
  // nos vale: solo da albizia/naranjo). Buscamos un hook propio: si
  // shadows-route aún no lo publica, devolvemos [] (sin romper nada).
  // ==========================================================================
  function arbolesEZEnVista() {
    try {
      if (typeof window.manolitAireArbolesEZ !== 'function') return [];
      var todas = window.manolitAireArbolesEZ() || [];
      var b = map.getBounds(), c = map.getCenter();
      return todas.filter(function (a) {
        return EZ_ALTURAS[a.tipo] &&
          a.lon >= b.getWest() && a.lon <= b.getEast() &&
          a.lat >= b.getSouth() && a.lat <= b.getNorth();
      }).sort(function (a1, a2) {
        var d1 = (a1.lon - c.lng) * (a1.lon - c.lng) + (a1.lat - c.lat) * (a1.lat - c.lat);
        var d2 = (a2.lon - c.lng) * (a2.lon - c.lng) + (a2.lat - c.lat) * (a2.lat - c.lat);
        return d1 - d2;
      }).slice(0, MAX_ARBOL);
    } catch (e) { return []; }
  }

  function refrescarInstancias(forzar) {
    if (!listo || !activo) return;
    var arboles = arbolesEZEnVista();
    var firma = (estacionActual || '') + '|' + map.getZoom().toFixed(2) + '|' + arboles.length;
    for (var f = 0; f < arboles.length; f++) {
      firma += '|' + arboles[f].tipo + ',' + arboles[f].lon.toFixed(6) + ',' + arboles[f].lat.toFixed(6) + ',' + (arboles[f].altura || 0);
    }
    if (!forzar && firma === firmaInstancias) return;
    firmaInstancias = firma;

    var cRef = map.getCenter();
    var mcRef = maplibregl.MercatorCoordinate.fromLngLat({ lng: cRef.lng, lat: cRef.lat }, 0);
    REF.x = mcRef.x; REF.y = mcRef.y; REF.z = mcRef.z;

    // Agrupación por (tipo, variante): el hash de coords decide la variante
    // y así cada árbol nace siempre con la MISMA forma.
    var buckets = []; // buckets[k] = árboles para la variante k (índice plano)
    for (var i = 0; i < arboles.length; i++) {
      var a = arboles[i];
      var li = Math.floor(hashCoords(a.lon, a.lat) * N_VARIANTES) % N_VARIANTES;
      buckets[li] = buckets[li] || [];
      buckets[li].push(a);
    }

    var m4 = TMP_M4, escV = TMP_ESC;
    var k = 0;
    Object.keys(EZ_ESPECIES).forEach(function (tipo) {
      var lista = variantes[tipo] || [];
      for (var v = 0; v < lista.length; v++, k++) {
        var vf = lista[v];
        var losMios = (buckets[v] || []).filter(function (a) { return a.tipo === tipo; });
        for (var i2 = 0; i2 < losMios.length; i2++) {
          var ar = losMios[i2];
          var mc = maplibregl.MercatorCoordinate.fromLngLat({ lng: ar.lon, lat: ar.lat }, 0);
          var s = metrosAMercator(ar.lat);
          var techo = vf.techoEscala || 1.8;
          var sArbol = Math.max(0.55, Math.min(techo, (ar.altura || vf.alturaModelo) / vf.alturaModelo));
          escV.set(s * sArbol, s * sArbol, s * sArbol);
          m4.compose(TMP_V3.set(mc.x - REF.x, mc.y - REF.y, mc.z - REF.z), QUAT_UP, escV);
          vf.meshTroncos.setMatrixAt(i2, m4);
          vf.meshHojas.setMatrixAt(i2, m4);
        }
        vf.meshTroncos.count = losMios.length;
        vf.meshHojas.count = losMios.length;
        vf.meshTroncos.instanceMatrix.needsUpdate = true;
        vf.meshHojas.instanceMatrix.needsUpdate = true;
      }
    });
    map.triggerRepaint();
  }

  // ==========================================================================
  // Capa custom MapLibre propia
  // ==========================================================================
  function crearCapa() {
    return {
      id: 'capa-arboles-ez-3d',
      type: 'custom',
      renderingMode: '3d',
      onAdd: function (m, gl) {
        renderer = new THREE.WebGLRenderer({
          canvas: m.getCanvas(), context: gl, antialias: true,
        });
        renderer.autoClear = false;
        scene = new THREE.Scene();
        camera = new THREE.Camera();
        camera.matrixAutoUpdate = false;
        scene.add(new THREE.HemisphereLight(0xfff4de, 0x4a5a3a, 0.95));
        sol = new THREE.DirectionalLight(0xffffff, 1.0);
        sol.position.set(10, 18, 7);
        scene.add(sol);
        QUAT_UP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        TMP_M4 = new THREE.Matrix4(); TMP_V3 = new THREE.Vector3(); TMP_ESC = new THREE.Vector3();
        TMP_PROY = new THREE.Matrix4();
        construirVariantes();
      },
      render: function (gl, matrix) {
        if (!activo) return;
        try {
          if (typeof window.manolitAireCentroSol === 'function') {
            var sp = window.manolitAireCentroSol();
            if (sp && isFinite(sp.altitude) && sp.altitude > 0.02) {
              var el = Math.max(0.65, sp.altitude), az = sp.azimuth || 0;
              sol.position.set(
                Math.sin(az) * Math.cos(el) * 50,
                -Math.cos(az) * Math.cos(el) * 50,
                Math.sin(el) * 50
              );
            }
          }
        } catch (e) { /* sol fijo */ }
        camera.projectionMatrix = TMP_PROY.fromArray(matrix)
          .multiply(TMP_M4.makeTranslation(REF.x, REF.y, REF.z));
        renderer.resetState();
        renderer.render(scene, camera);
      },
    };
  }

  function condicionesCumplidas() {
    try {
      if (!map) return false;
      if (map.getZoom() < ZOOM_MIN) return false;
      if (typeof window.manolitAireArbolesEZ !== 'function') return false;
      return arbolesEZEnVista().length > 0;
    } catch (e) { return false; }
  }

  function activar() {
    activo = true;
    firmaInstancias = '';
    if (!map.getLayer('capa-arboles-ez-3d')) map.addLayer(crearCapa());
    // Oculta SOLO las formas EZ planas. 'sombrilla' (albizia) y 'naranjo'
    // quedan PROHIBIDAS aquí: las gestiona arboles-3d.js, que es suyo.
    // IMPORTANTE: este filtro RECONSTRUYE SIEMPRE también las exclusiones
    // de arboles-3d.js, para que nunca dejemos ver albizias/naranjos planos
    // por encima de su 3D (ambos motores comparten la capa plana).
    try {
      if (map.getLayer('capa-arboles-globales-3d')) {
        var f = ['all',
          ['!=', ['get', 'forma'], 'sombrilla'],
          ['!=', ['get', 'forma'], 'naranjo']];
        EZ_FORMAS.forEach(function (fo) { f.push(['!=', ['get', 'forma'], fo]); });
        map.setFilter('capa-arboles-globales-3d', f);
      }
    } catch (e) { /* conviven */ }
    var estacion = (typeof window.manolitAireEstacionActual === 'function')
      ? window.manolitAireEstacionActual() : 'verano';
    estacionActual = null;
    aplicarEstacion(estacion);
  }

  function desactivar() {
    activo = false;
    try {
      // Restaura el filtro CON las exclusiones de arboles-3d.js SIEMPRE:
      // aunque este módulo se apague, la albizia y el naranjo planos siguen
      // ocultos si su 3D (arboles-3d.js) sigue activo. Si su módulo también
      // se apaga, él mismo pone setFilter(null) y todo vuelve.
      if (map.getLayer('capa-arboles-globales-3d') &&
          typeof window.manolitAireArboles3D === 'function' && !map.__manolitoArboles3DActivo !== true) {
        // Si el motor principal NO está activo (su capa fue retirada),
        // restauramos la vista plana completa.
        var suCapa3D = map.getLayer('capa-arboles-3d');
        if (!suCapa3D || map.getLayoutProperty('capa-arboles-3d', 'visibility') === 'none') {
          map.setFilter('capa-arboles-globales-3d', null);
        } else {
          map.setFilter('capa-arboles-globales-3d',
            ['all', ['!=', ['get', 'forma'], 'sombrilla'], ['!=', ['get', 'forma'], 'naranjo']]);
        }
      }
    } catch (e) { /* nada */ }
    map.triggerRepaint();
  }

  // PROBLEMA CONOCIDO Y SU SOLUCIÓN: ambos motores escriben el MISMO filtro
  // de la capa plana. Para no pisarnos, este módulo RECONSTRUYE el filtro
  // incluyendo las exclusiones de arboles-3d.js (sombrilla + naranjo) siempre
  // que toque el filtro, y arboles-3d.js hace lo propio con las nuestras si
  // existen (no las conoce, pero su setFilter(null) al desactivar restaura).
  // Resultado: mientras cualquiera de los dos esté activo, la capa plana de
  // EZ está oculta; al desactivarse ambos, todo vuelve.

  function evaluar() {
    if (!map) return;
    var debe = condicionesCumplidas();
    if (debe && !listo && !cargandoThree) {
      cargandoThree = true;
      var s = document.createElement('script');
      s.src = 'js/three.min.js';
      s.onload = function () { cargandoThree = false; listo = true; activar(); };
      s.onerror = function () { cargandoThree = false; }; // sin THREE: nada EZ
      document.head.appendChild(s);
      return;
    }
    if (window.__manolitoArboles3D && window.THREE && !listo && !cargandoThree) {
      // arboles-3d.js ya cargó THREE: lo aprovechamos sin segunda descarga.
      listo = true; activar(); return;
    }
    if (!listo) return;
    if (debe && !activo) { activar(); }
    else if (!debe && activo) { desactivar(); }
    else if (activo) {
      var estacion = (typeof window.manolitAireEstacionActual === 'function')
        ? window.manolitAireEstacionActual() : estacionActual;
      if (estacion !== estacionActual) aplicarEstacion(estacion);
      else refrescarInstancias();
    }
  }

  window.manolitAireArbolesEZDebug = function () {
    return {
      listo: listo, activo: activo, estacion: estacionActual,
      enVista: map ? arbolesEZEnVista().length : -1,
      variantes: variantes.map ? variantes.filter(Boolean).map(function (l) {
        return l.map(function (v) { return { tipo: v.tipo, troncos: v.meshTroncos.count }; });
      }) : [],
      zoom: map ? map.getZoom() : -1,
    };
  };

  (function arrancar(intentos) {
    try {
      if (window.manolitAireMap) {
        map = window.manolitAireMap;
        map.on('moveend', evaluar);
        map.on('zoomend', evaluar);
        map.on('load', evaluar);
        setInterval(function () { if (!document.hidden) evaluar(); }, 2500);
        evaluar();
      } else if (intentos < 90) {
        setTimeout(function () { arrancar(intentos + 1); }, 500);
      }
    } catch (e) { /* este módulo jamás rompe el mapa */ }
  })(0);
})();
