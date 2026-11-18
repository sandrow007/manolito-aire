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

  // Presets REALES de ez-tree y adaptaciones locales de los cuatro perfiles.
  var EZ_PRESETS = {
    oak: { seed: 35729, type: 'deciduous', levels: 3, angle: [54, 58, 32], children: [6, 4, 3], length: [37.24, 11.08, 12.39, 7.16], radius: [1.41, 0.90, 0.69, 1.19], sections: [8, 6, 3, 1], segments: [7, 5, 3, 3], start: [0, 0.49, 0.06, 0.12], taper: [0.73, 0.42, 0.69, 0.75], gnarliness: [0, -0.1, -0.15, 0.09], twist: [-0.23, 0.42, 0, 0], force: 0.02, leafAngle: 42, leafCount: 18, leafStart: 0.16, leafSize: 2.5, leafVariance: 0.7, leafColor: 0x5c8e45, barkColor: 0xffd791 },
    ash: { seed: 36330, type: 'deciduous', levels: 3, angle: [48, 75, 60], children: [7, 4, 3], length: [43.47, 27.14, 9.51, 4.6], radius: [2, 0.63, 0.76, 0.7], sections: [12, 8, 6, 4], segments: [12, 6, 4, 3], start: [0, 0.23, 0.33, 0], taper: [0.7, 0.7, 0.7, 0.7], gnarliness: [0.03, 0.25, 0.2, 0.09], twist: [0.09, -0.07, 0, 0], force: 0.01, leafAngle: 55, leafCount: 16, leafStart: 0, leafSize: 2.67, leafVariance: 0.72, leafColor: 0x5c8e45, barkColor: 0xffd791 },
    aspen: { seed: 18020, type: 'deciduous', levels: 2, angle: [75, 32, 7], children: [10, 3, 3], length: [50, 6.07, 11.19, 1], radius: [0.72, 0.41, 0.7, 0.7], sections: [12, 10, 8, 6], segments: [8, 6, 4, 3], start: [0, 0.59, 0.35, 0], taper: [0.37, 0.13, 0.7, 0.7], gnarliness: [0.05, 0.12, 0.12, 0.02], twist: [0, 0, 0, 0], force: 0.0148, leafAngle: 30, leafCount: 11, leafStart: 0.124, leafSize: 2.5, leafVariance: 0.7, leafColor: 0xa6c882, barkColor: 0xffd791 },
    pine: { seed: 13977, type: 'evergreen', levels: 1, angle: [110, 16, 60], children: [82, 3, 5], length: [50, 23.87, 14.08, 1], radius: [1.05, 0.36, 0.7, 0.7], sections: [12, 10, 8, 6], segments: [8, 6, 4, 3], start: [0, 0.27, 0.14, 0.3], taper: [0.7, 0.7, 0.7, 0.7], gnarliness: [0.05, 0.08, 0, 0], twist: [0, 0, 0, 0], force: -0.003, leafAngle: 39, leafCount: 30, leafStart: 0.09, leafSize: 1.435, leafVariance: 0.201, leafColor: 0x4f7a3d, barkColor: 0xffffff },
  };
  var EZ_ESPECIES = {
    pino: { preset: 'pine', evergreen: true }, eucalipto: { preset: 'aspen', evergreen: true },
    ginkgo: { preset: 'aspen', evergreen: false }, encina_roble: { preset: 'oak', evergreen: true },
    platanero: { preset: 'ash', evergreen: false }, olmo: { preset: 'ash', evergreen: false },
    chopo: { preset: 'aspen', evergreen: false }, tipuana: { preset: 'ash', evergreen: false },
    jacaranda: { preset: 'ash', evergreen: false }, morera: { preset: 'oak', evergreen: false },
    ficus: { preset: 'oak', evergreen: true }, paraiso: { preset: 'ash', evergreen: false },
  };



  // Color estacional del follaje, por familia botánica.
  var EZ_ESTACIONES = {
    perenne: {
      primavera: { color: 0x729b50 }, verano: { color: 0x4f7a3d },
      otono: { color: 0x586e3c }, invierno: { color: 0x47643a },
    },
    caduca: {
      primavera: { color: 0x8fbf5a }, verano: { color: 0x5c8e45 },
      otono: { color: 0xc9862f }, invierno: { color: 0x746346 },
    },
  };

  // ---------- RNG determinista ----------
  // RNG LCG de EZ-tree y permutación de slots angulares del skeleton.
  function ezRng(seed) {
    var mw = (123456789 + (seed >>> 0)) >>> 0;
    var mz = (987654321 - (seed >>> 0)) >>> 0;
    return function (max, min) {
      if (max == null) max = 1;
      if (min == null) min = 0;
      mz = (Math.imul(36969, mz & 65535) + (mz >>> 16)) >>> 0;
      mw = (Math.imul(18000, mw & 65535) + (mw >>> 16)) >>> 0;
      var result = (((mz << 16) + (mw & 65535)) >>> 0) / 4294967296;
      return (max - min) * result + min;
    };
  }
  function ezShuffledIndices(count, rand) {
    var slots = [];
    for (var i = 0; i < count; i++) slots.push(i);
    for (var j = slots.length - 1; j > 0; j--) {
      var k = Math.floor(rand() * (j + 1));
      var tmp = slots[j]; slots[j] = slots[k]; slots[k] = tmp;
    }
    return slots;
  }
  function dirToEuler(dir) {
    return new THREE.Euler(Math.atan2(dir.z, dir.y), 0, Math.atan2(-dir.x, Math.sqrt(dir.y * dir.y + dir.z * dir.z)));
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
  // Objeto por tipo; Array.length no cuenta propiedades string (variantes['pino']),
  // y eso dejaba el motor permanentemente en cero.
  var variantes = Object.create(null);
  var estacionActual = null;
  var QUAT_UP = null, TMP_M4 = null, TMP_V3 = null, TMP_ESC = null, TMP_PROY = null;
  var REF = { x: 0, y: 0, z: 0 };
  var firmaInstancias = '';

  // ---------- Fusión de BufferGeometry indexadas ----------
  function fusionar(geos) {
    if (!geos.length) {
      var empty = new THREE.BufferGeometry();
      empty.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
      empty.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(0), 3));
      empty.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(0), 2));
      empty.setIndex([]);
      return empty;
    }
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




  // ==========================================================================
  // Port del generador de ez-tree (Tree.generateSkeleton/growBranch): cada
  // nivel usa length/radius/sections/segments/start/taper/gnarliness/twist,
  // las ramas hijas nacen alrededor de la rama padre y las hojas terminales
  // se generan por slots. Los presets proceden de src/lib/presets.
  // ==========================================================================
  function construirEsqueleto(preset, rand) {
    var ramas = [];
    var hojas = [];
    var up = new THREE.Vector3(0, 1, 0);
    var maxItems = 3200; // defensa de memoria; los presets caben bajo este tope
    var maxDepth = 4;
    function grow(origin, dir, level, length, radius) {
      if (level > maxDepth) throw new Error('EZ-TREE branch depth limit exceeded');
      if (ramas.length >= maxItems || hojas.length >= maxItems || length < 0.08 || radius < 0.008) return;
      var sectionCount = Math.max(1, Math.floor(preset.sections[level] || 1));
      var segments = Math.max(3, Math.floor(preset.segments[level] || 3));
      var taper = preset.taper[level] == null ? 0.7 : preset.taper[level];
      var gnarl = preset.gnarliness[level] || 0;
      var twist = preset.twist[level] || 0;
      var previous = origin.clone();
      var orientation = dirToEuler(dir);
      var sectionEnds = [{ pos: origin.clone(), radius: radius, fraction: 0, orientation: orientation.clone() }];
      var sectionLength = length / sectionCount / (preset.type === 'deciduous' ? Math.max(1, preset.levels - 1) : 1);
      for (var s = 0; s < sectionCount; s++) {
        var qStep = new THREE.Quaternion().setFromEuler(new THREE.Euler(
          rand(gnarl, -gnarl), twist, rand(gnarl, -gnarl)
        ));
        var stepDir = up.clone().applyQuaternion(new THREE.Quaternion().setFromEuler(orientation)).applyQuaternion(qStep).normalize();
        var p = previous.clone().addScaledVector(stepDir, sectionLength);
        var f = (s + 1) / sectionCount;
        var sectionRadius = radius * (1 - f * (1 - taper));
        if (s === sectionCount - 1 && level === preset.levels) sectionRadius = 0.001;
        var geo = new THREE.CylinderGeometry(sectionRadius, sectionEnds[sectionEnds.length - 1].radius, sectionLength, segments, 1);
        var axis = p.clone().sub(previous);
        var q = new THREE.Quaternion().setFromUnitVectors(up, axis.clone().normalize());
        geo.applyMatrix4(new THREE.Matrix4().compose(previous.clone().add(p).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
        ramas.push(geo);
        orientation.x += twist;
        orientation.z += gnarl * (rand() - 0.5) + preset.force;
        sectionEnds.push({ pos: p.clone(), radius: sectionRadius, fraction: f, orientation: orientation.clone() });
        previous.copy(p);
      }

      // EZ-tree genera hojas en las ramas terminales, con slots
      // estratificados y orientación interpolada desde las secciones.
      if (level === preset.levels) {
        var radialOffset = rand();
        var leafCount = preset.leafCount;
        var heightStep = (1 - preset.leafStart) / leafCount;
        var angleSlots = ezShuffledIndices(leafCount, rand);
        for (var li = 0; li < leafCount && hojas.length < maxItems; li++) {
          var leafStart = preset.leafStart + (li + rand()) * heightStep;
          var sectionIndex = Math.min(sectionEnds.length - 1, Math.floor(leafStart * (sectionEnds.length - 1)));
          var sectionA = sectionEnds[sectionIndex];
          var sectionB = sectionEnds[Math.min(sectionIndex + 1, sectionEnds.length - 1)];
          var alpha = (leafStart - sectionIndex / (sectionEnds.length - 1)) * (sectionEnds.length - 1);
          var leafOrigin = sectionA.pos.clone().lerp(sectionB.pos, alpha);
          var leafOrientation = sectionA.orientation.clone();
          var radialJitter = rand(0.5, -0.5);
          var radialAngle = 2 * Math.PI * (radialOffset + (angleSlots[li] + radialJitter) / leafCount);
          var q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), preset.leafAngle * Math.PI / 180);
          var q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), radialAngle);
          var leafQ = new THREE.Quaternion().setFromEuler(leafOrientation).multiply(q2).multiply(q1);
          var leafSize = preset.leafSize * (1 + rand(preset.leafVariance, -preset.leafVariance));
          var leafGeo = new THREE.PlaneGeometry(leafSize, leafSize * 0.48);
          leafGeo.applyMatrix4(new THREE.Matrix4().compose(leafOrigin, leafQ, new THREE.Vector3(1, 1, 1)));
          hojas.push(leafGeo);
        }
      }

      // Hijos EZ-tree: cantidad children[level], origen estratificado,
      // ángulos y orientación compuestos con la rama padre.
      if (level >= preset.levels || ramas.length >= maxItems) return;
      var childCount = Math.max(0, Math.min(100, Math.floor(preset.children[level] || 0)));
      if (!childCount) return;
      var childLevel = level + 1;
      var startMin = preset.start[childLevel] || 0;
      var heightStep = (1 - startMin) / Math.max(1, childCount);
      var angleSlots = ezShuffledIndices(childCount, rand);
      var radialOffset = rand();
      for (var c = 0; c < childCount && ramas.length < maxItems; c++) {
        var childStart = startMin + (c + rand()) * heightStep;
        var sectionIndex = Math.min(sectionEnds.length - 2, Math.floor(childStart * (sectionEnds.length - 1)));
        var sectionA = sectionEnds[sectionIndex];
        var sectionB = sectionEnds[Math.min(sectionIndex + 1, sectionEnds.length - 1)];
        var alpha = (childStart - sectionIndex / (sectionEnds.length - 1)) * (sectionEnds.length - 1);
        var childOrigin = sectionA.pos.clone().lerp(sectionB.pos, alpha);
        var childRadius = Math.max(0.01, preset.radius[childLevel] * ((1 - alpha) * sectionA.radius + alpha * sectionB.radius));
        var parentOrientation = sectionA.orientation.clone();
        var radialJitter = rand(0.5, -0.5);
        var radialAngle = 2 * Math.PI * (radialOffset + (angleSlots[c] + radialJitter) / childCount);
        var childAngle = (preset.angle[childLevel] || 45) * Math.PI / 180;
        var q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), childAngle);
        var q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), radialAngle);
        var childOrientation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromEuler(parentOrientation).multiply(q2.multiply(q1)));
        childOrientation.z += preset.force;
        var childDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion().setFromEuler(childOrientation));
        grow(childOrigin, childDirection, childLevel, preset.length[childLevel], childRadius);
      }
    }

    grow(new THREE.Vector3(0, 0, 0), up, 0, preset.length[0], preset.radius[0]);
    return { madera: ramas, hojas: hojas };
  }



  function construirVariantes() {
    EZ_TIPOS.forEach(function (tipo, k) {
      var especie = EZ_ESPECIES[tipo];
      var preset = EZ_PRESETS[especie.preset];
      var barkMat = new THREE.MeshStandardMaterial({ color: 0x594332, flatShading: true, roughness: 1.0, metalness: 0.02 });
      var meshesHoja = Object.create(null);
      variantes[tipo] = [];
      for (var v = 0; v < N_VARIANTES; v++) {
        var rand = ezRng(preset.seed + k * 7919 + v * 131);
        var ramaje = construirEsqueleto(preset, rand);
        var geoMadera = fusionar(ramaje.madera);
        geoMadera.computeBoundingBox();
        var altReal = Math.max(2, geoMadera.boundingBox.max.y);
        var geoHojas = fusionar(ramaje.hojas);
        geoHojas.computeBoundingBox(); geoHojas.computeBoundingSphere();
        var meshT = new THREE.InstancedMesh(geoMadera, barkMat, MAX_ARBOL);
        meshT.count = 0; meshT.frustumCulled = false;
        scene.add(meshT);
        Object.keys(EZ_ESTACIONES[vfEstacionKey(especie)]).forEach(function (est) {
          var color = EZ_ESTACIONES[vfEstacionKey(especie)][est].color;
          var key = String(color);
          if (meshesHoja[key]) return;
          var material = new THREE.MeshStandardMaterial({
            color: color, flatShading: true, roughness: 1.0, metalness: 0.0,
            vertexColors: false, transparent: false,
            emissive: color, emissiveIntensity: 0.24, side: THREE.DoubleSide,
          });
          var meshH = new THREE.InstancedMesh(geoHojas, material, MAX_ARBOL);
          meshH.count = 0; meshH.frustumCulled = false;
          scene.add(meshH);
          meshesHoja[key] = meshH;
        });
        variantes[tipo].push({
          tipo: tipo, alturaModelo: altReal,
          techoEscala: (EZ_ALTURAS[tipo] || 10) / altReal,
          meshTroncos: meshT, meshHojas: meshesHoja,
          preset: preset, especie: especie, geoHojasActual: geoHojas,
        });
      }
    });
  }

  function vfEstacionKey(especie) { return especie.evergreen ? 'perenne' : 'caduca'; }

  // Aplica estación a TODAS las variantes EZ (reconstruye hojas solo al cambiar).
  function aplicarEstacion(estacion) {
    if (estacion === estacionActual || !Object.keys(variantes).length) return;
    estacionActual = estacion;
    Object.keys(variantes).forEach(function (tipo) {
      variantes[tipo].forEach(function (vf) {
        var tabla = EZ_ESTACIONES[vfEstacionKey(vf.especie)];
        var est = tabla[estacion] || tabla.verano;
        vf.meshTroncos.material.color.setHex(0x594332);
        Object.keys(vf.meshHojas).forEach(function (color) {
          vf.meshHojas[color].visible = color === String(est.color);
        });
      });
    });
    refrescarInstancias(true);
  }

  // ==========================================================================
  // Datos EZ. Fuente pública manolitAireArbolesEZ, fusionada con inventario
  // oficial de Sevilla por shadows-route/arboles-sevilla. No se accede al
  // array privado de árboles ni se recategoriza Albizia/naranjo.
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
    if (!listo || !activo || !TMP_M4 || !scene) return;
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
    var buckets = Object.create(null); // buckets por tipo y variante
    for (var i = 0; i < arboles.length; i++) {
      var a = arboles[i];
      var li = Math.floor(hashCoords(a.lon, a.lat) * N_VARIANTES) % N_VARIANTES;
      var key = a.tipo + '#' + li;
      buckets[key] = buckets[key] || [];
      buckets[key].push(a);
    }

    var m4 = TMP_M4, escV = TMP_ESC;
    Object.keys(EZ_ESPECIES).forEach(function (tipo) {
      var lista = variantes[tipo] || [];
      for (var v = 0; v < lista.length; v++) {
        var vf = lista[v];
        var losMios = buckets[tipo + '#' + v] || [];
        for (var i2 = 0; i2 < losMios.length; i2++) {
          var ar = losMios[i2];
          var mc = maplibregl.MercatorCoordinate.fromLngLat({ lng: ar.lon, lat: ar.lat }, 0);
          var s = metrosAMercator(ar.lat);
          var alturaModeloDeseada = ar.altura || EZ_ALTURAS[tipo];
          var sArbol = Math.max(0.3, Math.min(2.5, alturaModeloDeseada / vf.alturaModelo));
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
    // El 3D EZ se dibuja encima de la capa plana. No se cambia el filtro
    // compartido: evita interferir con las exclusiones originales de albizia
    // y naranjo controladas exclusivamente por js/arboles-3d.js.
    var estacion = (typeof window.manolitAireEstacionActual === 'function')
      ? window.manolitAireEstacionActual() : 'verano';
    estacionActual = null;
    aplicarEstacion(estacion);
  }

  function desactivar() {
    activo = false;
    // No se toca el filtro de la capa global: es propiedad del motor original.
    map.triggerRepaint();
  }

  // La capa de copas OSM se conserva sin cambios; el 3D EZ se renderiza encima.
  // La vista sigue mostrando el cambio de geometría 3D y el módulo no tiene
  // que competir por el filtro que protege albizia/naranjo.

  function evaluar() {
    if (!map) return;
    var debe = condicionesCumplidas();
    if (window.THREE && !listo && !cargandoThree) {
      listo = true; // Three.js del motor original ya está disponible globalmente
    }
    if (debe && !listo && !cargandoThree) {
      cargandoThree = true;
      var s = document.createElement('script');
      s.src = 'js/three.min.js';
      s.onload = function () {
        cargandoThree = false;
        if (!window.THREE) { evaluar(); return; }
        listo = true;
        activar();
      };
      s.onerror = function () { cargandoThree = false; }; // sin THREE: nada EZ
      document.head.appendChild(s);
      return;
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
      variantes: Object.keys(variantes).map(function (tipo) {
        return variantes[tipo].map(function (v) {
          return { tipo: v.tipo, troncos: v.meshTroncos.count, hojas: v.meshHojas.count };
        });
      }),
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
