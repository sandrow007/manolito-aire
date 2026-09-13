/* ============================================================================
   arboles-3d.js — Albizia y naranjo REALES en 3D dentro del mapa
   (ADITIVO, sep-2026; sustituye al borrador albizia-3d.js, que nunca se
   desplegó: un solo motor para ambas especies)
   ----------------------------------------------------------------------------
   Petición de Sandro: los dos árboles emblemáticos de su mapa deben ser
   EXACTAMENTE los modelos 3D que él envió:
   - ALBIZIA: port valor a valor de su HTML (Three.js): tronco corto que se
     bifurca bajo, copa ancha de hojas finas (0.26 x 0.09), pompones rosas
     0xE87A93 que caen en otoño/invierno, tabla de estaciones idéntica.
   - NARANJO (sep-2026, MALLA REAL): la fotogrametría low-poly byte-exacta
     de su "naranjo real mesh v2.html" (19.972 vértices / 19.967 triángulos,
     servida desde js/naranjo-malla.js, carga perezosa en paralelo con
     three.min.js): tronco+copa en UNA geometría con SU coloreado por
     vértice (frontera al 49%, paletas suyas, sombreado 0.9-1.1), escalada
     a 6.2 m y asentada como en su v2, y 34 naranjas 0xE8792A/0xCF6A1E
     colgando de la piel real con SU algoritmo (rechazo a 0.5 m, offset
     normal r*0.9). Si la malla no carga, respaldo: el elipsoide con la
     silueta medida de la malla (x≈1.49 vs z≈1.31, 3 lóbulos suaves).
     Azahar blanco en primavera y naranjas verdes de temporada, como antes.
   - Nada de lo existente se toca: cuando el 3D está activo se OCULTAN solo
     las extrusiones planas de albizia y naranjo (filtro en runtime); al
     desactivarse, el filtro se retira y todo vuelve como antes.
   - Rendimiento móvil: 4 variantes deterministas por especie con geometría
     FUSIONADA + InstancedMesh (~28 draw calls para TODOS los árboles),
     three.js se carga perezoso solo cuando hace falta (zoom ≥ 15 y
     especies en pantalla), temporales reutilizados (nada de `new` por
     frame), firma de estado (no se recalcula lo que no cambia) y la
     animación de caída solo corre un rAF cuando hay algo que caer a la
     vista. Auditado por el agente de renderizado (Jefe Jefe).
   - Licencia: AGPL-3.0 como el resto del proyecto. three.js es MIT
     (compatible) y se sirve LOCAL desde js/three.min.js (sin CDN).
   ========================================================================== */
(function () {
  'use strict';

  if (window.__manolitoArboles3D) return; // doble carga: jamás
  window.__manolitoArboles3D = true;

  var ZOOM_MIN = 15;          // por debajo, la extrusión plana de siempre
  var MAX_ARBOL = 40;         // tope de árboles 3D en pantalla (los más cercanos)
  var N_VARIANTES = 4;        // variantes deterministas para que no haya clones
  var MAX_RACIMOS_ARBOL = 64; // tope de pompones por albizia

  // Tabla de estaciones de la ALBIZIA: los MISMOS valores del HTML de Sandro.
  var ESTACIONES_ALBIZIA = {
    primavera: { hoja: 0x7fc54f, escala: 0.9,  densidad: 0.9, cayendo: false },
    verano:    { hoja: 0x5c9e3f, escala: 1.0,  densidad: 1.0, cayendo: false }, // 0x5c9e3f: verde EXACTO de su HTML (sep-2026)
    otono:     { hoja: 0xc9862f, escala: 0.75, densidad: 0.45, cayendo: true  },
    invierno:  { hoja: 0x5e8c47, escala: 0.0,  densidad: 0.0, cayendo: true  },
  };

  // Estado estacional del NARANJO (perenne), coherente con fenologiaArbol
  // de shadows-route.js: azahar en primavera, naranjas verdes en verano,
  // naranjas maduras colgando otoño e invierno.
  var ESTACIONES_NARANJO = {
    primavera: { frutos: 'ninguno', flores: true  },
    verano:    { frutos: 'verdes',  flores: false },
    otono:     { frutos: 'maduros', flores: false },
    invierno:  { frutos: 'maduros', flores: false },
  };

  // ---------- RNG determinista (mulberry32): cada variante nace siempre igual,
  // así el árbol no "cambia de forma" entre repintados ni entre sesiones.
  function mulberry32(semilla) {
    var a = semilla >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hash determinista de coordenadas → [0,1): a cada árbol le toca siempre
  // la misma variante.
  function hashCoords(lon, lat) {
    var x = Math.sin(lon * 12.9898 + lat * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  // Metros → unidades mercator. MapLibre 4.7.1 no expone el estático
  // meterInMercatorCoordinateUnits: se calcula directo (circunferencia
  // ecuatorial WGS84 · cos(lat)), que es exactamente la misma fórmula.
  function metrosAMercator(lat) {
    return 1 / (40075016.686 * Math.cos(lat * Math.PI / 180));
  }

  // ---------- Estado interno ----------
  var map = null;
  var listo = false;          // three.js cargado y capa creada
  var cargandoThree = false;
  var activo = false;
  var renderer = null, scene = null, camera = null, sol = null;
  var variantesAlbizia = [];
  var variantesNaranjo = [];
  var estacionActual = null;
  var racimosVivos = [];      // caída de pompones: {mesh, idx, x, y, z, s, suelo, caido, visible, fase}
  var rafId = 0;
  var fallosSeguidos = 0;     // histéresis anti-parpadeo del 3D
  var QUAT_UP = null;         // rotación Y-up → Z-up (mercator)
  var firmaInstancias = '';   // firma del estado instanciado (nada se recalcula si no cambia)

  // Temporales REUTILIZADOS: crear Matrix4/Vector3 por frame calienta el
  // móvil (GC 60 veces/seg). Aquí nacen una vez y viven para siempre.
  var TMP_M4 = null, TMP_V3 = null, TMP_ESC = null, TMP_PROY = null;

  // ---------- Fusión manual de BufferGeometry indexadas (sin utils externas)
  function fusionar(geos) {
    var totalV = 0, totalI = 0, i;
    for (i = 0; i < geos.length; i++) {
      totalV += geos[i].attributes.position.count;
      // OJO: hay geometrías NO indexadas (icosaedros): índice sintético
      totalI += geos[i].index ? geos[i].index.count : geos[i].attributes.position.count;
    }
    var pos = new Float32Array(totalV * 3);
    var nor = new Float32Array(totalV * 3);
    var uv = new Float32Array(totalV * 2);
    var IdxArr = totalV > 65535 ? Uint32Array : Uint16Array;
    var idx = new IdxArr(totalI);
    var vo = 0, io = 0;
    for (i = 0; i < geos.length; i++) {
      var g = geos[i];
      pos.set(g.attributes.position.array, vo * 3);
      nor.set(g.attributes.normal.array, vo * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
      var ni = g.index ? g.index.count : g.attributes.position.count;
      for (var k = 0; k < ni; k++) idx[io + k] = (g.index ? g.index.array[k] : k) + vo;
      vo += g.attributes.position.count;
      io += ni;
      g.dispose();
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  }

  // Igual que fusionar pero horneando un COLOR por hoja (vertex colors):
  // la copa del naranjo mezcla los 4 verdes de PALETA_NARANJO, como la malla.
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
      var ni = g.index ? g.index.count : n; // icosaedros: NO indexados
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

  function geometriaCilindro(a, b, r0, r1, radialSegs) {
    var dir = new THREE.Vector3().subVectors(b, a);
    var len = dir.length();
    if (len <= 0) return null;
    var geo = new THREE.CylinderGeometry(r1, r0, len, radialSegs || 6, 1);
    var q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    var mid = a.clone().addScaledVector(dir, 0.5);
    geo.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    return geo;
  }

  // ==========================================================================
  // ALBIZIA — PORT EXACTO del HTML de Sandro: cylinderBetween + branch()
  // ==========================================================================
  function construirEsqueletoAlbizia(rand) {
    var segs = [];   // {a, b, r0, r1}
    var puntas = []; // {pos, dir}

    function branch(origin, dir, length, radius, level, maxLevel) {
      var end = origin.clone().addScaledVector(dir, length);
      segs.push({ a: origin.clone(), b: end.clone(), r0: radius, r1: radius * 0.62 });

      if (level >= maxLevel) {
        puntas.push({ pos: end, dir: dir.clone() });
        return;
      }

      // Número de ramas: bifurcación temprana (3-4 en nivel 0)
      var nChildren;
      if (level === 0) nChildren = 3 + Math.floor(rand() * 2); // 3-4 troncos secundarios
      else if (level < 3) nChildren = 3;                       // Ramas secundarias en abanico
      else nChildren = 2 + Math.floor(rand() * 2);             // Ramas finas terminales

      for (var i = 0; i < nChildren; i++) {
        // Expansión horizontal: mayor spread en niveles bajos
        var spread = 0.6 + level * 0.2;
        var theta = rand() * Math.PI * 2;
        var tilt = spread * (0.4 + rand() * 0.9);
        // Sesgo horizontal muy marcado (para forma de sombrilla)
        var upBias = Math.max(0.05, 0.6 - level * 0.2);
        var newDir = dir.clone();
        var perp1 = new THREE.Vector3(1, 0, 0).cross(dir);
        if (perp1.lengthSq() < 0.01) perp1.set(0, 0, 1);
        else perp1.normalize();
        var perp2 = dir.clone().cross(perp1).normalize();
        newDir.addScaledVector(perp1, Math.cos(theta) * tilt)
              .addScaledVector(perp2, Math.sin(theta) * tilt)
              .addScaledVector(new THREE.Vector3(0, 1, 0), upBias * 0.15);
        newDir.normalize();
        // Ramas más largas en niveles medios para ampliar la copa
        var newLen = length * (0.72 + rand() * 0.1);
        branch(end.clone(), newDir, newLen, radius * 0.62, level + 1, maxLevel);
      }
    }

    // Tronco único, corto y grueso (1.8 m → bifurcación baja)
    branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 1, 0).normalize(), 1.8, 0.45, 0, 5);
    return { segs: segs, puntas: puntas };
  }

  // Descriptores de hojas de albizia: los MISMOS parámetros del HTML
  // (30-40 por punta, plano 0.26 x 0.09, dist 0.12+0.55, y += (rand-0.3)*0.25).
  function descriptoresHojasAlbizia(puntas, rand) {
    var desc = [];
    for (var p = 0; p < puntas.length; p++) {
      var nLeaflets = 30 + Math.floor(rand() * 11);
      for (var i = 0; i < nLeaflets; i++) {
        var angle = (i / nLeaflets) * Math.PI * 2 + rand() * 0.5;
        var dist = 0.12 + rand() * 0.55;
        desc.push({
          x: puntas[p].pos.x + Math.cos(angle) * dist,
          y: puntas[p].pos.y + (rand() - 0.3) * 0.25,
          z: puntas[p].pos.z + Math.sin(angle) * dist,
          rx: (rand() - 0.5) * 0.7,
          ry: angle + rand() * 0.5,
          rz: (rand() - 0.5) * 0.5,
        });
      }
    }
    return desc;
  }

  // Geometría de hojas de albizia para una estación: densidad y escala del HTML.
  function geometriaHojasAlbizia(desc, est) {
    if (!desc.length || est.densidad <= 0 || est.escala <= 0) return null;
    var geos = [];
    for (var i = 0; i < desc.length; i++) {
      // Misma regla de visibilidad del HTML: (i % 100) / 100 < densidad
      if ((i % 100) / 100 >= est.densidad) continue;
      var d = desc[i];
      var g = new THREE.PlaneGeometry(0.26 * est.escala, 0.09 * est.escala);
      g.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(d.x, d.y, d.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(d.rx, d.ry, d.rz)),
        new THREE.Vector3(1, 1, 1)
      ));
      geos.push(g);
    }
    if (!geos.length) return null;
    return fusionar(geos);
  }

  // Pompones de albizia: 55% de las puntas, 1-2 racimos, centro con el MISMO
  // offset del HTML. Devuelve centros (para instanciar y animar la caída).
  function centrosRacimos(puntas, rand) {
    var centros = [];
    for (var p = 0; p < puntas.length; p++) {
      if (rand() >= 0.55) continue;
      var nFlowers = 1 + Math.floor(rand() * 2);
      for (var f = 0; f < nFlowers; f++) {
        centros.push({
          x: puntas[p].pos.x + (rand() - 0.5) * 0.3,
          y: puntas[p].pos.y + 0.1 + rand() * 0.18,
          z: puntas[p].pos.z + (rand() - 0.5) * 0.3,
        });
      }
    }
    return centros.slice(0, MAX_RACIMOS_ARBOL);
  }

  // UN racimo canónico por variante: 8-10 hebras cilindro(0.007, 0.007, 0.22, 3)
  // orientadas en esfera, offset 0.055, escala y 0.8-1.2 — como el HTML.
  function geometriaRacimo(rand) {
    var geos = [];
    var nStrands = 8 + Math.floor(rand() * 3);
    var up = new THREE.Vector3(0, 1, 0);
    for (var s = 0; s < nStrands; s++) {
      var theta = rand() * Math.PI * 2;
      var phi = rand() * Math.PI;
      var dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      );
      var g = new THREE.CylinderGeometry(0.007, 0.007, 0.22, 3);
      g.applyMatrix4(new THREE.Matrix4().compose(
        dir.clone().multiplyScalar(0.055),
        new THREE.Quaternion().setFromUnitVectors(up, dir),
        new THREE.Vector3(1, 0.8 + rand() * 0.4, 1)
      ));
      geos.push(g);
    }
    return fusionar(geos);
  }

  // ==========================================================================
  // NARANJO — el low-poly de la foto de Sandro
  // Tronco único oscuro (~49% de la altura, su proporción aprobada), bola
  // densa de hojas con la silueta medida de la malla real (x≈1.49, z≈1.31,
  // 3 lóbulos suaves — sus valores), naranjas en la piel de la copa.
  // Modelo de referencia: 6.2 m totales (su alturaMediaM), copa radio 2.9 m.
  // ==========================================================================
  var NARANJO_ALTURA = 6.2;
  var NARANJO_TRONCO = 0.49;      // su proporción aprobada (A.1)
  var NARANJO_RADIO = 2.9;        // su radioCopaMedioM
  var PALETA_NARANJO = [0x4f7a3d, 0x5e8c47, 0x3f6733, 0x6a9950]; // su paleta

  function construirMaderaNaranjo(rand) {
    var geos = [];
    var hTronco = NARANJO_ALTURA * NARANJO_TRONCO; // ≈ 3.0 m
    // Tronco en 3 tramos con una curva suave (el de la foto no es un palo)
    var p0 = new THREE.Vector3(0, 0, 0);
    var curvaX = (rand() - 0.5) * 0.3;
    var curvaZ = (rand() - 0.5) * 0.3;
    var p1 = new THREE.Vector3(curvaX * 0.3, hTronco * 0.45, curvaZ * 0.3);
    var p2 = new THREE.Vector3(curvaX * 0.7, hTronco * 0.8, curvaZ * 0.7);
    var p3 = new THREE.Vector3(curvaX, hTronco, curvaZ);
    geos.push(geometriaCilindro(p0, p1, 0.20, 0.165, 7));
    geos.push(geometriaCilindro(p1, p2, 0.165, 0.13, 7));
    geos.push(geometriaCilindro(p2, p3, 0.13, 0.10, 7));
    // 3-4 ramas madres cortas que entran en la bola (se ven entre hojas)
    var nRamas = 3 + Math.floor(rand() * 2);
    for (var i = 0; i < nRamas; i++) {
      var ang = (i / nRamas) * Math.PI * 2 + rand() * 0.7;
      var dirR = new THREE.Vector3(Math.cos(ang), 0.9 + rand() * 0.4, Math.sin(ang)).normalize();
      var fin = p3.clone().addScaledVector(dirR, 0.7 + rand() * 0.4);
      geos.push(geometriaCilindro(p3, fin, 0.10, 0.045, 5));
    }
    return fusionar(geos.filter(Boolean));
  }

  // Bola de hojas: distribución en elipsoide con MÁS densidad hacia la piel
  // (el interior de una copa real está hueco de hojas) y la silueta de 3
  // lóbulos medida de la malla: (0.92 + 0.10·cos θ) · (1 + 0.06·cos 3θ).
  function construirHojasNaranjo(rand) {
    var centroY = NARANJO_ALTURA * NARANJO_TRONCO + (NARANJO_ALTURA * (1 - NARANJO_TRONCO)) * 0.42;
    var rx = NARANJO_RADIO, rz = NARANJO_RADIO * (1.31 / 1.49), ry = NARANJO_RADIO * 0.9;
    var geos = [], colores = [];
    var N = 1300;
    for (var i = 0; i < N; i++) {
      var theta = rand() * Math.PI * 2;
      var phi = Math.acos(2 * rand() - 1);
      // Silueta lobulada en planta (sus valores exactos)
      var lob = (0.92 + 0.10 * Math.cos(theta)) * (1.0 + 0.06 * Math.cos(3 * theta));
      var f = 0.55 + 0.45 * Math.pow(rand(), 0.35); // más hojas hacia fuera
      var x = Math.sin(phi) * Math.cos(theta) * rx * lob * f;
      var y = Math.cos(phi) * ry * f;
      var z = Math.sin(phi) * Math.sin(theta) * rz * lob * f;
      var g = new THREE.PlaneGeometry(0.22, 0.08);
      g.applyMatrix4(new THREE.Matrix4().compose(
        new THREE.Vector3(x, centroY + y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(
          (rand() - 0.5) * 1.1, rand() * Math.PI * 2, (rand() - 0.5) * 0.8
        )),
        new THREE.Vector3(1, 1, 1)
      ));
      geos.push(g);
      colores.push(new THREE.Color(PALETA_NARANJO[Math.floor(rand() * PALETA_NARANJO.length)]));
    }
    return fusionarConColores(geos, colores);
  }

  // Naranjas: icosaedros low-poly colgando de la piel de la copa, algo más
  // abundantes en la mitad baja (como en la foto). Dos juegos horneados:
  // maduras (0xE8792A / 0xCF6A1E) y verdes (0x8AAF3F / 0x739632, más chicas).
  function construirFrutosNaranjo(rand, verdes) {
    var centroY = NARANJO_ALTURA * NARANJO_TRONCO + (NARANJO_ALTURA * (1 - NARANJO_TRONCO)) * 0.42;
    var rx = NARANJO_RADIO, rz = NARANJO_RADIO * (1.31 / 1.49), ry = NARANJO_RADIO * 0.9;
    var geos = [], colores = [];
    var n = verdes ? 8 : 14;
    for (var i = 0; i < n; i++) {
      var theta = rand() * Math.PI * 2;
      var phi = Math.PI * (0.35 + 0.55 * rand()); // sesgo a la mitad baja
      var lob = (0.92 + 0.10 * Math.cos(theta)) * (1.0 + 0.06 * Math.cos(3 * theta));
      var r = verdes ? 0.09 + rand() * 0.02 : 0.11 + rand() * 0.03;
      var pos = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * rx * lob * 0.98,
        centroY + Math.cos(phi) * ry * 0.98 - r * 0.7, // cuelgan bajo la piel
        Math.sin(phi) * Math.sin(theta) * rz * lob * 0.98
      );
      var g = new THREE.IcosahedronGeometry(r, 0);
      g.applyMatrix4(new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z));
      geos.push(g);
      var c = verdes
        ? (i % 2 === 0 ? 0x8AAF3F : 0x739632)
        : (i % 2 === 0 ? 0xE8792A : 0xCF6A1E);
      colores.push(new THREE.Color(c));
    }
    return fusionarConColores(geos, colores);
  }

  // Frutos sobre la MALLA REAL (sep-2026): SU algoritmo del v2 — 34
  // naranjas maduras (verdes: 12, temporada), rechazo a distancia mínima
  // 0.5 m, radio 0.15-0.20 (verdes más chicas), offset r*0.9 a lo largo de
  // la normal de la piel, colores 0xE8792A/0xCF6A1E al azar (sus dos).
  function construirFrutosMalla(cand, rand, verdes) {
    var geos = [], colores = [];
    if (!cand || !cand.n) return fusionarConColores(geos, colores);
    var objetivo = verdes ? 12 : 34; // su targetOranges del v2
    var puestos = [];
    var intentos = 0;
    while (puestos.length < objetivo && intentos < 4000) {
      intentos++;
      var vi = Math.floor(rand() * cand.n);
      var x = cand.pos[vi * 3], y = cand.pos[vi * 3 + 1], z = cand.pos[vi * 3 + 2];
      var cerca = false;
      for (var p = 0; p < puestos.length; p++) {
        var dx = puestos[p][0] - x, dy = puestos[p][1] - y, dz = puestos[p][2] - z;
        if (dx * dx + dy * dy + dz * dz < 0.25) { cerca = true; break; } // 0.5 m
      }
      if (cerca) continue;
      puestos.push([x, y, z]);
      var r = verdes ? 0.10 + rand() * 0.03 : 0.15 + rand() * 0.05; // su rango v2
      var g = new THREE.IcosahedronGeometry(r, 0);
      g.applyMatrix4(new THREE.Matrix4().makeTranslation(
        x + cand.nrm[vi * 3] * r * 0.9,
        y + cand.nrm[vi * 3 + 1] * r * 0.9,
        z + cand.nrm[vi * 3 + 2] * r * 0.9
      ));
      geos.push(g);
      var hex = verdes
        ? (rand() < 0.5 ? 0x8AAF3F : 0x739632)
        : (rand() < 0.5 ? 0xE8792A : 0xCF6A1E); // sus orangeColors
      colores.push(new THREE.Color(hex));
    }
    return fusionarConColores(geos, colores);
  }

  // Azahar: racimos blancos 0xFFF6E0 coronando la bola en primavera (misma
  // idea que los pompones de la albizia, pero blancos y más cortos).
  function construirAzahar(rand) {
    var centroY = NARANJO_ALTURA * NARANJO_TRONCO + (NARANJO_ALTURA * (1 - NARANJO_TRONCO)) * 0.42;
    var geos = [];
    var up = new THREE.Vector3(0, 1, 0);
    for (var c = 0; c < 9; c++) {
      var theta = rand() * Math.PI * 2;
      var lob = (0.92 + 0.10 * Math.cos(theta)) * (1.0 + 0.06 * Math.cos(3 * theta));
      var base = new THREE.Vector3(
        Math.cos(theta) * NARANJO_RADIO * lob * (0.3 + 0.6 * rand()),
        centroY + NARANJO_RADIO * 0.9 * (0.55 + 0.4 * rand()),
        Math.sin(theta) * NARANJO_RADIO * (1.31 / 1.49) * lob * (0.3 + 0.6 * rand())
      );
      var nStrands = 6 + Math.floor(rand() * 3);
      for (var s = 0; s < nStrands; s++) {
        var th = rand() * Math.PI * 2, ph = rand() * Math.PI;
        var dir = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
        var g = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 3);
        g.applyMatrix4(new THREE.Matrix4().compose(
          base.clone().addScaledVector(dir, 0.045),
          new THREE.Quaternion().setFromUnitVectors(up, dir),
          new THREE.Vector3(1, 0.8 + rand() * 0.4, 1)
        ));
        geos.push(g);
      }
    }
    return fusionar(geos);
  }

  // ==========================================================================
  // Construcción de las variantes + sus InstancedMesh
  // ==========================================================================
  function construirVariantes() {
    var barkMat = new THREE.MeshStandardMaterial({
      color: 0x5b4230, flatShading: true, roughness: 1.0, metalness: 0.02,
    });
    var florAlbiziaMat = new THREE.MeshStandardMaterial({
      color: 0xE87A93, flatShading: true, roughness: 0.45, metalness: 0,
      emissive: 0x301015, emissiveIntensity: 0.18,
    });
    var azaharMat = new THREE.MeshStandardMaterial({
      color: 0xFFF6E0, flatShading: true, roughness: 0.6, metalness: 0,
    });
    var frutoMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, flatShading: true, roughness: 0.55, metalness: 0.02,
      vertexColors: true,
    });
    // roughness 1.0 / metalness 0.0 (sep-2026): valores LITERALES del
    // "naranjo real mesh v2.html" de Sandro — con rugosidad < 1 las hojas
    // en contraluz especular salían casi negras.
    // emissive verde medio de SU paleta (0x567f42 ≈ media de 0x4f7a3d,
    // 0x5e8c47, 0x3f6733, 0x6a9950): igual que en la albizia, evita la
    // hoja negra en contraluz cuando el mapa se mira desde arriba.
    var hojaNaranjoMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, flatShading: true, roughness: 1.0, metalness: 0.0,
      vertexColors: true,
      emissive: 0x567f42, emissiveIntensity: 0.55,
    });
    // Material de la MALLA REAL (sep-2026): misma receta del v2 (vertexColors,
    // flatShading, roughness 1.0, metalness 0.0). El emisivo baja a 0.35:
    // al ser una malla cerrada con normales hacia fuera no sufre la hoja
    // negra en contraluz como los planos, y así el tronco conserva su marrón.
    var mallaNaranjoMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, flatShading: true, roughness: 1.0, metalness: 0.0,
      vertexColors: true,
      emissive: 0x567f42, emissiveIntensity: 0.50,
    });

    var v, rand;

    // ----- ALBIZIA x4 -----
    for (v = 0; v < N_VARIANTES; v++) {
      rand = mulberry32(1234 + v * 7919);
      var esq = construirEsqueletoAlbizia(rand);
      var geoMadera = fusionar(esq.segs.map(function (s) {
        return geometriaCilindro(s.a, s.b, s.r0, s.r1, 6);
      }).filter(Boolean));
      geoMadera.computeBoundingBox();

      // side: FrontSide (el defecto), EXACTAMENTE como el HTML de Sandro:
      // con doble cara las hojas que miran fuera del sol salen negras y la
      // copa parece un mosaico; con cara simple se descartan y el hueco lo
      // rellenan las hojas de detrás, que sí están iluminadas.
      // transparent:true + opacity:0.85 (sep-2026, FIX PÁGINA NEGRA):
      // es LITERAL de su HTML — flat(0x5c9e3f, 0.8, true, 0.85) — y es lo
      // que hace que las hojas en contraluz se fundan con el follaje de
      // detrás en vez de salir NEGRAS. Sin esto la copa parecía quemada.
      var hojaAlbiziaMat = new THREE.MeshStandardMaterial({
        color: 0x5c9e3f, flatShading: true, roughness: 0.8, metalness: 0.02,
        transparent: true, opacity: 0.85,
        // emissive = el propio verde de la hoja (sep-2026, FIX PÁGINA NEGRA):
        // su HTML se mira a RAS DE SUELO (órbita) y allí las hojas lucen;
        // el mapa se mira DESDE ARRIBA y las hojas en contraluz salían
        // NEGRAS. Con el emisivo al 45% la hoja nunca baja de "verde oscuro"
        // ni en la cara opuesta al sol — la copa se lee verde desde cualquier
        // pitch, y las caras iluminadas siguen respondiendo al sol real.
        emissive: 0x5c9e3f, emissiveIntensity: 0.55,
      });

      var aTroncos = new THREE.InstancedMesh(geoMadera, barkMat, MAX_ARBOL);
      var aHojas = new THREE.InstancedMesh(new THREE.BufferGeometry(), hojaAlbiziaMat, MAX_ARBOL);
      var aRacimos = new THREE.InstancedMesh(geometriaRacimo(rand), florAlbiziaMat, MAX_ARBOL * MAX_RACIMOS_ARBOL);
      aTroncos.count = 0; aHojas.count = 0; aRacimos.count = 0;
      aTroncos.frustumCulled = false; // el frustum de la cámara custom no
      aHojas.frustumCulled = false;   // conoce las instancias: sin esto
      aRacimos.frustumCulled = false; // desaparecerían al girar el mapa
      scene.add(aTroncos); scene.add(aHojas); scene.add(aRacimos);

      variantesAlbizia.push({
        alturaModelo: Math.max(1, geoMadera.boundingBox.max.y),
        descHojas: descriptoresHojasAlbizia(esq.puntas, rand),
        centros: centrosRacimos(esq.puntas, rand),
        meshTroncos: aTroncos, meshHojas: aHojas, meshRacimos: aRacimos,
        hojaMat: hojaAlbiziaMat, geoHojasActual: null,
      });
    }

    // ----- NARANJO x4 -----
    // Con la MALLA REAL cargada (js/naranjo-malla.js, byte-exacta de su v2)
    // el naranjo es UNA sola geometría tronco+copa con vertexColors y las
    // naranjas cuelgan de la piel real; sin ella, respaldo elipsoide (el
    // mapa jamás se queda sin naranjos por un fallo de descarga).
    var mallaReal = (typeof window.manolitMallaNaranjo !== 'undefined' &&
                     typeof window.manolitMallaNaranjo.construir === 'function')
      ? window.manolitMallaNaranjo : null;
    for (v = 0; v < N_VARIANTES; v++) {
      rand = mulberry32(9021 + v * 7919);
      var geoMaderaN, geoHojasN, geoMaduros, geoVerdes;
      var matMaderaN = barkMat, usaMalla = false;
      if (mallaReal) {
        try {
          var malla = mallaReal.construir(THREE, rand);
          geoMaderaN = malla.geo; // tronco+copa reales, ya coloreados
          geoHojasN = new THREE.BufferGeometry(); // vacía: la copa VA en la malla
          geoMaduros = construirFrutosMalla(malla.cand, rand, false);
          geoVerdes = construirFrutosMalla(malla.cand, rand, true);
          matMaderaN = mallaNaranjoMat;
          usaMalla = true;
        } catch (eMalla) { usaMalla = false; /* cae al respaldo de abajo */ }
      }
      if (!usaMalla) {
        geoMaderaN = construirMaderaNaranjo(rand);
        geoHojasN = construirHojasNaranjo(rand);
        geoMaduros = construirFrutosNaranjo(rand, false);
        geoVerdes = construirFrutosNaranjo(rand, true);
      }
      var geoAzahar = construirAzahar(rand);

      var nTroncos = new THREE.InstancedMesh(geoMaderaN, matMaderaN, MAX_ARBOL);
      var nHojas = new THREE.InstancedMesh(geoHojasN, hojaNaranjoMat, MAX_ARBOL);
      var nFrutos = new THREE.InstancedMesh(geoMaduros, frutoMat, MAX_ARBOL);
      var nFlores = new THREE.InstancedMesh(geoAzahar, azaharMat, MAX_ARBOL);
      nTroncos.count = 0; nHojas.count = 0; nFrutos.count = 0; nFlores.count = 0;
      nTroncos.frustumCulled = false;
      nHojas.frustumCulled = false;
      nFrutos.frustumCulled = false;
      nFlores.frustumCulled = false;
      if (usaMalla) nHojas.visible = false; // con malla real no hay capa de hojas aparte
      scene.add(nTroncos); scene.add(nHojas); scene.add(nFrutos); scene.add(nFlores);

      variantesNaranjo.push({
        alturaModelo: NARANJO_ALTURA,
        meshTroncos: nTroncos, meshHojas: nHojas,
        meshFrutos: nFrutos, meshFlores: nFlores,
        geoMaduros: geoMaduros, geoVerdes: geoVerdes,
        usaMallaReal: usaMalla,
      });
    }
  }

  // Aplica la estación: albizia con la tabla del HTML; naranjo perenne con
  // fruto/flor según su fenología. Solo reconstruye si cambia la estación.
  function aplicarEstacion(estacion) {
    if (estacion === estacionActual) return;
    if (!variantesAlbizia.length) return; // onAdd aún no ha construido (diferido)
    var estA = ESTACIONES_ALBIZIA[estacion] || ESTACIONES_ALBIZIA.verano;
    var estN = ESTACIONES_NARANJO[estacion] || ESTACIONES_NARANJO.verano;
    estacionActual = estacion;
    var v;
    for (v = 0; v < variantesAlbizia.length; v++) {
      var va = variantesAlbizia[v];
      va.hojaMat.color.setHex(estA.hoja);
      va.hojaMat.emissive.setHex(estA.hoja); // el emisivo sigue a la estación (fix contraluz)
      if (va.geoHojasActual) { va.geoHojasActual.dispose(); va.geoHojasActual = null; }
      var geo = geometriaHojasAlbizia(va.descHojas, estA);
      if (geo) {
        va.geoHojasActual = geo;
        va.meshHojas.geometry = geo;
        va.meshHojas.visible = true;
      } else {
        va.meshHojas.visible = false; // invierno: ramas desnudas, como el HTML
      }
    }
    for (v = 0; v < variantesNaranjo.length; v++) {
      var vn = variantesNaranjo[v];
      vn.meshFrutos.visible = estN.frutos !== 'ninguno';
      vn.meshFrutos.geometry = estN.frutos === 'verdes' ? vn.geoVerdes : vn.geoMaduros;
      vn.meshFlores.visible = estN.flores;
    }
    racimosVivos.length = 0; // reinicia la caída al cambiar de estación
    refrescarInstancias(true);
    evaluarAnimacion();
  }

  // ==========================================================================
  // Instanciado de los árboles reales del mapa
  // ==========================================================================
  function arbolesEnVista() {
    // Hook nuevo (albizia + naranjo). Respaldo: el hook original de solo
    // albizias, por si una versión vieja de shadows-route.js sigue viva.
    var todas = [];
    try {
      if (typeof window.manolitAireArboles3D === 'function') {
        todas = window.manolitAireArboles3D() || [];
      } else if (typeof window.manolitAireAlbizias === 'function') {
        todas = (window.manolitAireAlbizias() || []).map(function (a) {
          a.tipo = 'albizia'; return a;
        });
      }
    } catch (e) { return []; }
    var b = map.getBounds();
    var c = map.getCenter();
    return todas.filter(function (a) {
      return a.lon >= b.getWest() && a.lon <= b.getEast() &&
             a.lat >= b.getSouth() && a.lat <= b.getNorth();
    }).sort(function (a1, a2) { // las más cercanas al centro primero
      var d1 = (a1.lon - c.lng) * (a1.lon - c.lng) + (a1.lat - c.lat) * (a1.lat - c.lat);
      var d2 = (a2.lon - c.lng) * (a2.lon - c.lng) + (a2.lat - c.lat) * (a2.lat - c.lat);
      return d1 - d2;
    }).slice(0, MAX_ARBOL);
  }

  // ==========================================================================
  // ORIGEN LOCAL de coordenadas (sep-2026, FIX BASURA GEOMÉTRICA a zoom alto):
  // las matrices de instancia llevaban coordenadas mercator ABSOLUTAS
  // (~0.48) con escala de metros (~3e-8): en float32 la GPU no puede sumar
  // 2e-7 a 0.48 (épsilon ≈ 3e-8) y los vértices se cuantizaban — a z19+ la
  // malla real (40k triángulos) salía como "placa base" negra/verde y la
  // albizia como moteado oscuro. Ahora todo se instancia RELATIVO al centro
  // del mapa (REF) y el render multiplica la proyección por T(+REF): la GPU
  // solo ve números pequeños y la precisión sobra. REF se recalcula aquí
  // (cada reinstanciado), nunca por frame: entre reinstanciados el error
  // relativo es despreciable.
  // ==========================================================================
  var REF = { x: 0, y: 0, z: 0 };

  function refrescarInstancias(forzar) {
    if (!listo || !activo) return;
    if (!variantesAlbizia.length || !variantesNaranjo.length || !TMP_M4) return; // onAdd diferido: aún no hay nada que instanciar
    var arboles = arbolesEnVista();

    // Firma del estado: si los árboles, el zoom y la estación no han
    // cambiado, NO se recalcula ni se resube nada a la GPU (móvil frío).
    var firma = estacionActual + '|' + map.getZoom().toFixed(2) + '|' + arboles.length;
    for (var f = 0; f < arboles.length; f++) {
      firma += '|' + arboles[f].tipo + ',' + arboles[f].lon.toFixed(6) + ',' + arboles[f].lat.toFixed(6) + ',' + (arboles[f].altura || 0);
    }
    if (!forzar && firma === firmaInstancias) return;
    firmaInstancias = firma;

    // Origen local: el centro actual del mapa (doble precisión en JS).
    var cRef = map.getCenter();
    var mcRef = maplibregl.MercatorCoordinate.fromLngLat({ lng: cRef.lng, lat: cRef.lat }, 0);
    REF.x = mcRef.x; REF.y = mcRef.y; REF.z = mcRef.z;

    var porVarianteA = [], porVarianteN = [];
    var v, i;
    for (v = 0; v < N_VARIANTES; v++) { porVarianteA.push([]); porVarianteN.push([]); }
    for (i = 0; i < arboles.length; i++) {
      var a = arboles[i];
      var idx = Math.floor(hashCoords(a.lon, a.lat) * N_VARIANTES) % N_VARIANTES;
      (a.tipo === 'naranjo' ? porVarianteN : porVarianteA)[idx].push(a);
    }

    racimosVivos.length = 0;
    var m4 = TMP_M4;
    var escV = TMP_ESC;

    function instanciar(lista, va, meshes, conRacimos) {
      var nRacimo = 0;
      for (var i = 0; i < lista.length; i++) {
        var ar = lista[i];
        var mc = maplibregl.MercatorCoordinate.fromLngLat({ lng: ar.lon, lat: ar.lat }, 0);
        var mScale = metrosAMercator(ar.lat);
        // Escala: la altura REAL del árbol (OSM) manda sobre el modelo.
        var sArbol = Math.max(0.55, Math.min(1.8, (ar.altura || va.alturaModelo) / va.alturaModelo));
        var s = mScale * sArbol;
        escV.set(s, s, s);
        // Posición RELATIVA a REF (origen local): la GPU suma números
        // pequeños y la malla no se cuantiza a zoom alto.
        m4.compose(TMP_V3.set(mc.x - REF.x, mc.y - REF.y, mc.z - REF.z), QUAT_UP, escV);
        for (var m = 0; m < meshes.length; m++) meshes[m].setMatrixAt(i, m4);

        if (conRacimos) {
          for (var r = 0; r < va.centros.length && nRacimo < MAX_ARBOL * MAX_RACIMOS_ARBOL; r++) {
            var ce = va.centros[r];
            // local (x,y,z) → mercator relativo (x, -z, y) · s + base
            var wx = (mc.x - REF.x) + ce.x * s;
            var wy = (mc.y - REF.y) - ce.z * s;
            var wz = (mc.z - REF.z) + ce.y * s;
            m4.compose(TMP_V3.set(wx, wy, wz), QUAT_UP, escV);
            va.meshRacimos.setMatrixAt(nRacimo, m4);
            racimosVivos.push({
              mesh: va.meshRacimos, idx: nRacimo,
              x: wx, y: wy, z: wz, s: s,
              suelo: (mc.z - REF.z) + 0.1 * s, // altura local 0.1 m, como el HTML
              caido: 0, visible: true, fase: wx * 913.7,
            });
            nRacimo++;
          }
        }
      }
      for (var m2 = 0; m2 < meshes.length; m2++) {
        meshes[m2].count = lista.length;
        meshes[m2].instanceMatrix.needsUpdate = true;
      }
      if (conRacimos) {
        va.meshRacimos.count = nRacimo;
        va.meshRacimos.instanceMatrix.needsUpdate = true;
      }
    }

    for (v = 0; v < N_VARIANTES; v++) {
      var va = variantesAlbizia[v];
      instanciar(porVarianteA[v], va, [va.meshTroncos, va.meshHojas], true);
      var vn = variantesNaranjo[v];
      instanciar(porVarianteN[v], vn, [vn.meshTroncos, vn.meshHojas, vn.meshFrutos, vn.meshFlores], false);
    }
    map.triggerRepaint();
  }

  // ==========================================================================
  // Animación de caída de pompones (otoño/invierno del HTML). Solo corre un
  // rAF cuando: capa activa + estación con caída + pestaña visible.
  // ==========================================================================
  function evaluarAnimacion() {
    var est = ESTACIONES_ALBIZIA[estacionActual] || ESTACIONES_ALBIZIA.verano;
    var debeCorrer = activo && est.cayendo && racimosVivos.length > 0;
    if (debeCorrer && !rafId) {
      var ultimo = performance.now();
      var paso = function (ahora) {
        rafId = 0;
        if (document.hidden) return; // pestaña oculta: cero gasto
        var dt = Math.min(64, ahora - ultimo); ultimo = ahora;
        var avance = 0.018 * (dt / (1000 / 60)); // 0.018 m por frame a 60fps, como el HTML
        var t = ahora * 0.001;
        var m4 = TMP_M4;
        var escV = TMP_ESC;
        var queda = false;
        for (var i = 0; i < racimosVivos.length; i++) {
          var rc = racimosVivos[i];
          if (!rc.visible) continue;
          rc.caido += avance;
          var z = rc.z - rc.caido * rc.s;
          if (z <= rc.suelo) {
            // Llegó al suelo: se oculta, como en el HTML (visible=false)
            escV.set(0.0001, 0.0001, 0.0001);
            m4.compose(TMP_V3.set(rc.x, rc.y, rc.suelo), QUAT_UP, escV);
            rc.mesh.setMatrixAt(rc.idx, m4);
            rc.visible = false;
          } else {
            queda = true;
            var sway = 0.001 * rc.s;
            escV.set(rc.s, rc.s, rc.s);
            m4.compose(TMP_V3.set(
              rc.x + Math.sin(t + rc.fase) * sway,
              rc.y + Math.cos(t + rc.fase) * sway,
              z
            ), QUAT_UP, escV);
            rc.mesh.setMatrixAt(rc.idx, m4);
          }
          rc.mesh.instanceMatrix.needsUpdate = true;
        }
        map.triggerRepaint();
        if (queda) rafId = requestAnimationFrame(paso);
      };
      rafId = requestAnimationFrame(paso);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) evaluarAnimacion();
  });

  // ==========================================================================
  // Capa custom de MapLibre con Three.js dentro
  // ==========================================================================
  function crearCapa() {
    return {
      id: 'capa-arboles-3d',
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

        // La luz del HTML, AJUSTADA A VISTA AÉREA (sep-2026): su HTML se mira
        // a ras de suelo (órbita) con la cara iluminada de frente; el mapa se
        // mira desde arriba y a menudo la cara visible queda A CONTRALUZ del
        // sol real → copas oscuras. Hemisfera 0.6→0.95 y relleno 0.2→0.3:
        // el ambiente levanta las caras en sombra sin quemar las iluminadas.
        scene.add(new THREE.HemisphereLight(0xfff4de, 0x4a5a3a, 0.95));
        sol = new THREE.DirectionalLight(0xffffff, 1.0);
        sol.position.set(10, 18, 7);
        scene.add(sol);
        var relleno = new THREE.DirectionalLight(0xbcd4ff, 0.3);
        relleno.position.set(-8, 0, 0);
        scene.add(relleno);

        QUAT_UP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        TMP_M4 = new THREE.Matrix4();
        TMP_V3 = new THREE.Vector3();
        TMP_ESC = new THREE.Vector3();
        TMP_PROY = new THREE.Matrix4();
        construirVariantes();
      },
      render: function (gl, matrix) {
        if (!activo) return;
        // El sol sigue al sol REAL de la app (mismo hook que las sombras),
        // para que la luz del árbol case con la sombra que dibuja el mapa.
        try {
          if (typeof window.manolitAireCentroSol === 'function') {
            var sp = window.manolitAireCentroSol();
            if (sp && isFinite(sp.altitude) && sp.altitude > 0.02) {
              // Azimut REAL (casa con la sombra del mapa) pero con suelo de
              // elevación: con sol rasante el estándar de Three apaga la
              // copa y el árbol sale negro. El HTML de referencia luce con
              // sol alto; se respeta esa presentación mínima.
              var el = Math.max(0.65, sp.altitude), az = sp.azimuth || 0;
              sol.position.set(
                Math.sin(az) * Math.cos(el) * 50,
                -Math.cos(az) * Math.cos(el) * 50,
                Math.sin(el) * 50
              );
            }
          }
        } catch (e) { /* sol fijo del HTML */ }
        // Proyección × T(+REF): las instancias viven en coordenadas
        // RELATIVAS al centro del mapa; aquí se devuelven al mundo mercator
        // en doble precisión (JS) antes de subir la matriz a la GPU.
        camera.projectionMatrix = TMP_PROY.fromArray(matrix)
          .multiply(TMP_M4.makeTranslation(REF.x, REF.y, REF.z));
        renderer.resetState();
        renderer.render(scene, camera);
      },
    };
  }

  // ==========================================================================
  // Activación / desactivación (perezosa y reversible)
  // ==========================================================================
  function condicionesCumplidas() {
    try {
      if (!map) return false;
      if (map.getZoom() < ZOOM_MIN) return false;
      // OJO: no se usa map.loaded() — parpadea a false durante los
      // movimientos y apagaría el 3D a mitad de gesto. La señal de
      // "motor listo" es que la capa plana de árboles ya existe.
      var capaArboles = map.getLayer('capa-arboles-globales-3d');
      if (!capaArboles) return false;
      if (map.getLayoutProperty('capa-arboles-globales-3d', 'visibility') === 'none') return false;
      return arbolesEnVista().length > 0;
    } catch (e) { return false; }
  }

  function activar() {
    activo = true;
    firmaInstancias = ''; // fuerza reinstanciado al activar
    if (!map.getLayer('capa-arboles-3d')) map.addLayer(crearCapa());
    // Oculta SOLO la albizia y el naranjo planos: el 3D los sustituye.
    try {
      if (map.getLayer('capa-arboles-globales-3d')) {
        map.setFilter('capa-arboles-globales-3d',
          ['all', ['!=', ['get', 'forma'], 'sombrilla'], ['!=', ['get', 'forma'], 'naranjo']]);
      }
    } catch (e) { /* si no se puede filtrar, conviven: no pasa nada */ }
    var estacion = (typeof window.manolitAireEstacionActual === 'function')
      ? window.manolitAireEstacionActual() : 'verano';
    // onAdd puede ser DIFERIDO en MapLibre 4: si las variantes aún no
    // existen, se aplica la estación en cuanto estén (reintentos suaves).
    var intentosEst = 0;
    (function aplicaCuandoListo() {
      try {
        if (variantesAlbizia.length) {
          estacionActual = null; // fuerza reconstrucción de hojas
          aplicarEstacion(estacion);
        } else if (activo && ++intentosEst < 60) {
          setTimeout(aplicaCuandoListo, 100);
        }
      } catch (e) { /* jamás rompe el mapa */ }
    })();
  }

  function desactivar() {
    activo = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    // Devuelve la vista plana: todo como antes de que existiera el 3D.
    try {
      if (map.getLayer('capa-arboles-globales-3d')) {
        map.setFilter('capa-arboles-globales-3d', null);
      }
    } catch (e) { /* nada que restaurar */ }
    map.triggerRepaint();
  }

  function evaluar() {
    if (!map) return;
    var debe = condicionesCumplidas();
    if (debe && !listo && !cargandoThree) {
      cargandoThree = true;
      // Carga en PARALELO three.min.js y la malla real del naranjo
      // (js/naranjo-malla.js, byte-exacta de su v2). El motor arranca
      // cuando three está Y (la malla está o pasaron 4 s): si la malla
      // falla o tarda, se usa el naranjo elipsoide de respaldo y nadie
      // se queda esperando los árboles por 691 KB en datos móviles.
      var pendientes = 2, threeFallo = false, mallaHecha = false;
      var relojMalla = null;
      function listoParcial() {
        if (--pendientes > 0) return;
        cargandoThree = false;
        if (threeFallo) return; // sin three.js se queda la vista plana de siempre
        listo = true;
        activar();
      }
      function mallaLista() {
        if (mallaHecha) return;
        mallaHecha = true;
        if (relojMalla) { clearTimeout(relojMalla); relojMalla = null; }
        listoParcial();
      }
      var s = document.createElement('script');
      s.src = 'js/three.min.js';
      s.onload = listoParcial;
      s.onerror = function () { threeFallo = true; listoParcial(); };
      document.head.appendChild(s);
      var s2 = document.createElement('script');
      s2.src = 'js/naranjo-malla.js';
      s2.onload = mallaLista;
      s2.onerror = mallaLista; // sin malla: respaldo elipsoide, jamás rompe
      document.head.appendChild(s2);
      relojMalla = setTimeout(mallaLista, 4000);
      return;
    }
    if (!listo) return;
    if (debe && !activo) { fallosSeguidos = 0; activar(); }
    else if (!debe && activo) {
      // Histéresis: Overpass vacía la lista un instante al recargar y no
      // queremos apagar/encender el 3D (ni quitar/poner el filtro) por un
      // hueco de un segundo. Solo se desactiva si la condición falla dos
      // veces seguidas (~5 s con el sondeo, o dos gestos de alejamiento).
      fallosSeguidos++;
      if (fallosSeguidos >= 2) { fallosSeguidos = 0; desactivar(); }
    }
    else if (activo) {
      // Cambios de estación en caliente (simulador horario de la app)
      var estacion = (typeof window.manolitAireEstacionActual === 'function')
        ? window.manolitAireEstacionActual() : estacionActual;
      if (estacion !== estacionActual) aplicarEstacion(estacion);
      else { refrescarInstancias(); evaluarAnimacion(); }
    }
  }

  // Diagnóstico en vivo (solo lectura; lo usa el banco de pruebas y Sandro
  // si algún día quiere ver qué está pasando dentro).
  window.manolitAireArboles3DDebug = function () {
    return {
      listo: listo,
      activo: activo,
      estacion: estacionActual,
      enVista: map ? arbolesEnVista().length : -1,
      albizias: variantesAlbizia.map(function (v) {
        return { troncos: v.meshTroncos.count, hojas: v.meshHojas.count, racimos: v.meshRacimos.count };
      }),
      naranjos: variantesNaranjo.map(function (v) {
        return { mallaReal: !!v.usaMallaReal, troncos: v.meshTroncos.count, hojas: v.meshHojas.count, frutos: v.meshFrutos.count };
      }),
      zoom: map ? map.getZoom() : -1,
      // Referencias vivas (solo lectura/manipulación de depuración): el banco
      // de pruebas las usa para encender/apagar mallas y aislar problemas.
      refs: { variantesAlbizia: variantesAlbizia, variantesNaranjo: variantesNaranjo },
    };
  };

  // ==========================================================================
  // Arranque: espera al mapa con reintentos suaves (nunca un solo timeout)
  // ==========================================================================
  (function arrancar(intentos) {
    try {
      if (window.manolitAireMap) {
        map = window.manolitAireMap;
        map.on('moveend', evaluar);
        map.on('zoomend', evaluar);
        map.on('load', evaluar);
        // Los árboles llegan de Overpass en diferido: sondeo barato que
        // también captura refrescos de datos y cambios de estación.
        setInterval(function () { if (!document.hidden) evaluar(); }, 2500);
        evaluar();
      } else if (intentos < 90) {
        setTimeout(function () { arrancar(intentos + 1); }, 500);
      }
    } catch (e) { /* los árboles 3D jamás rompen el mapa */ }
  })(0);
})();
