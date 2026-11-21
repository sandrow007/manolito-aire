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
  // (nov-2026) MAPA COMPLETO: antes 30 y con un filtro de separación que
  // tiraba la mayoría de un paseo arbolado. Ahora 200 árboles por vista: en
  // un encuadre de calle a zoom 17 entran todos los de la manzana y ya no
  // hay huecos "sin árboles" en medio de una alineación.
  var MAX_ARBOL = 200;
  var N_VARIANTES = 2;        // variantes deterministas por especie

  // Tipos con modelo EZ (los MISMOS nombres que TIPOS_ARBOL de shadows-route.js).
  var EZ_TIPOS = ['pino', 'encina_roble', 'platanero', 'olmo', 'chopo',
    'eucalipto', 'tipuana', 'jacaranda', 'morera', 'ficus', 'paraiso', 'ginkgo',
    'almez', 'brachychiton', 'robinia', 'fresno', 'cipres', 'sophora',
    'gleditsia', 'ligustrum', 'cercis', 'magnolia', 'catalpa', 'casuarina',
    'palmera', 'palmera_datilera', 'palmera_canaria', 'palmera_washingtonia',
    'olivo',
    // --- 5 especies MÁS (nov-2026, ronda final): árboles de alineado y de
    // jardín abundantísimos en el inventario oficial que antes se quedaban
    // sin copa 3D. Cada una con SU preset (sacados de los medium/small del
    // repo dgreenheck/ez-tree, MIT): lagerstroemia, bauhinia, grevillea,
    // algarrobo y laurel.
    'lagerstroemia', 'bauhinia', 'grevillea', 'algarrobo', 'laurel',
    // --- 2 ÁRBOLES MÁS (nov-2026, ronda parque): los dos que quedaban
    // abundantes en el inventario oficial sin copa 3D. firmiana = árbol de
    // las pagodas (1.085 ejemplares); ficus_alto = microcarpa/benjamina/
    // elastica (602 con nombre concreto, los grandes del parque).
    'firmiana', 'ficus_alto',
    // --- 4 GÉNEROS MÁS (nov-2026): Parque de María Luisa completo.
    'ailanto', 'lagunaria', 'taxodio', 'tejo'];

  // Alturas de referencia (las de TIPOS_ARBOL).
  var EZ_ALTURAS = {
    pino: 14, eucalipto: 18, ginkgo: 12, encina_roble: 10, platanero: 16,
    olmo: 12, chopo: 15, tipuana: 12, jacaranda: 10, morera: 8, ficus: 8, paraiso: 10,
    almez: 12, brachychiton: 12, robinia: 12, fresno: 14,
    cipres: 12, sophora: 11,
    gleditsia: 11, ligustrum: 7, cercis: 6, magnolia: 10, catalpa: 10, casuarina: 16,
    palmera: 12, palmera_datilera: 12, palmera_canaria: 13,
    palmera_washingtonia: 14, olivo: 8,
    // (nov-2026) la datilera y la canaria son las que MÁS se dibujan en
    // Sevilla (409 datileras y 124 canarias en el inventario oficial), y
    // 'phoenix' también las clasifica genéricamente: al subir un poco su
    // altura de referencia y su escala (ver refrescarInstancias) se ven por
    // encima de los naranjos del paseo, como las reales, sin ser gigantes.
    // --- 5 especies MÁS (nov-2026): alturas medias reales de alineado urbano.
    lagerstroemia: 6, bauhinia: 8, grevillea: 13, algarrobo: 9, laurel: 8,
    // --- 4 GÉNEROS MÁS (nov-2026): los más numerosos del parque de María
    // Luisa que todavía no tenían tipo propio y caían en 'generico' (sin
    // copa 3D). Alturas medias reales de ejemplares urbanos/adultos.
    ailanto: 12, lagunaria: 9, taxodio: 16, tejo: 10,
    // --- 2 ÁRBOLES MÁS (nov-2026): alturas medias reales de parque.
    // firmiana: copa ovalada elevada, tronco derecho (8-15 m).
    // ficus_alto: microcarpa/benjamina en parque, copa ancha y densa (8-10 m).
    firmiana: 11, ficus_alto: 8,
  };

  // Presets REALES de ez-tree y adaptaciones locales de los cuatro perfiles.
  // NOTA (nov-2026, ¡NUNCA MÁS ÁRBOLES ARQUEADOS!): gnarliness/twist/force a
  // cero en TODOS los presets. La torcedura del repo produce troncos en
  // serpiente y ramas en codo que en ciudad parecen árboles rotos; los
  // ejemplares urbanos reales son rectos y con la copa arriba.
  var EZ_PRESETS = {
    oak: { seed: 35729, type: 'deciduous', levels: 3, angle: [54, 58, 32], children: [6, 4, 3], length: [37.24, 11.08, 12.39, 7.16], radius: [1.41, 0.90, 0.69, 1.19], sections: [8, 6, 3, 1], segments: [7, 5, 3, 3], start: [0, 0.49, 0.06, 0.12], taper: [0.73, 0.42, 0.69, 0.75], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 42, leafCount: 18, leafStart: 0.16, leafSize: 2.5, leafVariance: 0.7, leafColor: 0x5c8e45, barkColor: 0xffd791 },
    ash: { seed: 36330, type: 'deciduous', levels: 3, angle: [48, 75, 60], children: [7, 4, 3], length: [43.47, 27.14, 9.51, 4.6], radius: [2, 0.63, 0.76, 0.7], sections: [12, 8, 6, 4], segments: [12, 6, 4, 3], start: [0, 0.23, 0.33, 0], taper: [0.7, 0.7, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 55, leafCount: 16, leafStart: 0, leafSize: 2.67, leafVariance: 0.72, leafColor: 0x5c8e45, barkColor: 0xffd791 },
    aspen: { seed: 18020, type: 'deciduous', levels: 2, angle: [75, 32, 7], children: [10, 3, 3], length: [50, 6.07, 11.19, 1], radius: [0.72, 0.41, 0.7, 0.7], sections: [12, 10, 8, 6], segments: [8, 6, 4, 3], start: [0, 0.59, 0.35, 0], taper: [0.37, 0.13, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 30, leafCount: 11, leafStart: 0.124, leafSize: 2.5, leafVariance: 0.7, leafColor: 0xa6c882, barkColor: 0xffd791 },
    pine: { seed: 13977, type: 'evergreen', levels: 1, angle: [110, 16, 60], children: [82, 3, 5], length: [50, 23.87, 14.08, 1], radius: [1.05, 0.36, 0.7, 0.7], sections: [12, 10, 8, 6], segments: [8, 6, 4, 3], start: [0, 0.27, 0.14, 0.3], taper: [0.7, 0.7, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 39, leafCount: 30, leafStart: 0.09, leafSize: 1.435, leafVariance: 0.201, leafColor: 0x4f7a3d, barkColor: 0xffffff },

    // --- 4 presets EZ-TREE NUEVOS (nov-2026), tomados tal cual del repo
    // dgreenheck/ez-tree (MIT) para las 4 especies más abundantes de Sevilla
    // que aún no tenían modelo EZ: almez, brachychiton, robinia y fresno.
    oak_large: { seed: 23399, type: 'deciduous', levels: 3, angle: [54, 43, 32], children: [9, 5, 3], length: [47.7, 29.39, 17.62, 7.16], radius: [3, 0.69, 0.69, 1.19], sections: [16, 9, 8, 3], segments: [12, 5, 3, 3], start: [0, 0.35, 0.1, 0], taper: [0.73, 0.42, 0.69, 0.75], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 36, leafCount: 10, leafStart: 0.45, leafSize: 2.2, leafVariance: 0.7, leafColor: 0xd5cdad, barkColor: 0xffd791 },
    aspen_large: { seed: 30631, type: 'deciduous', levels: 2, angle: [47, 63, 7], children: [10, 6, 3], length: [69.6, 18.56, 11.19, 1], radius: [1.11, 0.58, 0.7, 0.7], sections: [12, 10, 8, 6], segments: [8, 6, 4, 3], start: [0, 0.62, 0.05, 0], taper: [0.7, 0.13, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 36, leafCount: 20, leafStart: 0.4, leafSize: 2.0, leafVariance: 0.7, leafColor: 0xfd2f26, barkColor: 0xffffff },
    ash_large: { seed: 29919, type: 'deciduous', levels: 3, angle: [39, 39, 51], children: [10, 4, 3], length: [45, 29.42, 15.3, 4.6], radius: [3.03, 0.53, 0.79, 1.11], sections: [12, 8, 6, 4], segments: [8, 6, 4, 3], start: [0, 0.32, 0.34, 0], taper: [0.7, 0.62, 0.76, 0], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 30, leafCount: 10, leafStart: 0.4, leafSize: 2.2, leafVariance: 0.72, leafColor: 0xffffff, barkColor: 0xce9a5e },
    pine_large: { seed: 44166, type: 'evergreen', levels: 1, angle: [129, 16, 60], children: [100, 3, 5], length: [65.25, 34.85, 27.25, 1], radius: [1.27, 0.37, 0.7, 0.7], sections: [12, 10, 8, 6], segments: [8, 6, 4, 3], start: [0, 0.293, 0.14, 0.3], taper: [0.7, 0.7, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 17, leafCount: 18, leafStart: 0.25, leafSize: 1.8, leafVariance: 0.201, leafColor: 0xffffff, barkColor: 0xffffff },

    // --- 2 presets EZ-TREE MÁS (nov-2026), también del repo dgreenheck/ez-tree:
    // perfil estrecho/compacto para ciprés (columna mediterránea) y copa
    // pequeña abierta para sophora (acacia de Japón, Sophora/Styphnolobium
    // japonicum: 7.382 ejemplares sumando ambos nombres del inventario).
    // Alturas reales urbanas.
    pine_small: { seed: 11744, type: 'evergreen', levels: 1, angle: [117, 60, 60], children: [60, 5, 3], length: [39.55, 12.12, 10, 1], radius: [0.55, 0.41, 0.7, 0.7], sections: [12, 10, 8, 6], segments: [8, 6, 4, 3], start: [0, 0.16, 0.3, 0.3], taper: [0.7, 0.7, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 10, leafCount: 21, leafStart: 0, leafSize: 0.965, leafVariance: 0.7, leafColor: 0x3d5c33, barkColor: 0x8a7a5c },
    oak_small: { seed: 30895, type: 'deciduous', levels: 3, angle: [54, 58, 32], children: [4, 2, 3], length: [28.08, 4.55, 9.78, 7.16], radius: [1, 1.02, 0.69, 1.19], sections: [16, 9, 8, 1], segments: [7, 5, 3, 3], start: [0, 0.49, 0.06, 0.12], taper: [0.73, 0.42, 0.69, 0.75], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 42, leafCount: 14, leafStart: 0.16, leafSize: 1.38, leafVariance: 0.7, leafColor: 0x5c8e45, barkColor: 0xffd791 },

    // --- PALMERAS (nov-2026, REHECHAS): ya no son "árboles fractales con
    // hojas en la punta". Cada una tiene sus medidas reales (fuste, base
    // abultada, anillos, corona en arco) y las usa construirPalmera().
    // Medidas: altura de referencia, radios del fuste en metros, proporción
    // de follaje, radio de corona, apertura de frondes por nivel (grados
    // respecto a la vertical), arqueo, número de frondes y ancho del limbo.
    palm: { seed: 45107, type: 'evergreen', palm: {
      altura: 12, radioBase: 0.34, radioAlto: 0.21, follaje: 0.86, corona: 0.26,
      anillos: 18, anilloCada: 3, segmentos: 7, curva: 0.012,
      frondes: 22, arqueo: 1.05, apertura: [34, 6, -26], largo: [1, 0.92, 0.8],
      segmentosFronde: 4, grosorFronde: 0.055, anchoFronde: 0.62, datiles: false,
      barkColor: 0x8c7a5e,
      follajeHex: { primavera: 0x6f9a44, verano: 0x59893a, otono: 0x567f38, invierno: 0x4e7534 },
    } },
    // --- 4 presets EZ MÁS (nov-2026): palmeras bien definidas por especie y
    // olivo. Datilera: tronco fino y esbelto con corona de hojas caídas;
    // canaria (Phoenix canariensis): tronco más grueso y corona densa y
    // esférica; washingtonia: la más alta, tronco columnar y hojas en abanico
    // más abiertas; olivo: tronco corto con copa baja, plateada y redondeada
    // (siempre verde).
    palm_datilera: { seed: 45121, type: 'evergreen', palm: {
      altura: 12, radioBase: 0.40, radioAlto: 0.26, follaje: 0.84, corona: 0.28,
      anillos: 20, anilloCada: 3, segmentos: 8, curva: 0.02,
      frondes: 24, arqueo: 1.25, apertura: [30, 2, -32], largo: [1, 0.94, 0.8],
      segmentosFronde: 4, grosorFronde: 0.07, anchoFronde: 0.86, datiles: true, grosorDatile: 0.055,
      barkColor: 0x9c8460,
      follajeHex: { primavera: 0x7aa04a, verano: 0x628f42, otono: 0x5c8a3c, invierno: 0x517d36 },
    } },
    palm_canaria: { seed: 45233, type: 'evergreen', palm: {
      altura: 13, radioBase: 0.58, radioAlto: 0.40, follaje: 0.78, corona: 0.30,
      anillos: 16, anilloCada: 1, segmentos: 8, curva: 0.008,
      frondes: 28, arqueo: 0.85, apertura: [52, 22, -8], largo: [1, 0.95, 0.85],
      segmentosFronde: 4, grosorFronde: 0.105, anchoFronde: 0.95, datiles: false,
      barkColor: 0x7f6a4c,
      follajeHex: { primavera: 0x6d9a40, verano: 0x5c8a3a, otono: 0x578336, invierno: 0x4f7a32 },
    } },
    palm_washingtonia: { seed: 45347, type: 'evergreen', palm: {
      altura: 14, radioBase: 0.30, radioAlto: 0.24, follaje: 0.90, corona: 0.31,
      anillos: 20, anilloCada: 2, segmentos: 7, curva: 0.016,
      frondes: 22, arqueo: 0.45, apertura: [72, 46, 14], largo: [1, 0.92, 0.78],
      segmentosFronde: 3, grosorFronde: 0.045, anchoFronde: 1.25, datiles: false,
      barkColor: 0x8a6f50,
      follajeHex: { primavera: 0x7aa650, verano: 0x6a9a45, otono: 0x638f40, invierno: 0x58823a },
    } },
     olivo: { seed: 45459, type: 'evergreen', levels: 2, angle: [42, 52, 0], children: [5, 4, 3], length: [18.5, 9.4, 1, 1], radius: [1.6, 0.95, 0.7, 0.7], sections: [8, 6, 1, 1], segments: [7, 5, 3, 3], start: [0, 0.32, 0, 0], taper: [0.62, 0.55, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 34, leafCount: 16, leafStart: 0.28, leafSize: 1.35, leafVariance: 0.55, leafColor: 0x8aa07a, barkColor: 0x8a7a5c },
palm_small: { seed: 45109, type: 'evergreen', levels: 0, angle: [98, 0, 0], children: [0, 0, 0], length: [24, 1, 1, 1], radius: [0.62, 0.4, 0.7, 0.7], sections: [8, 1, 1, 1], segments: [7, 3, 3, 3], start: [0, 0, 0, 0], taper: [0.5, 0.7, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 62, leafCount: 20, leafStart: 0.88, leafSize: 3.6, leafVariance: 0.25, leafColor: 0x5c8e45, barkColor: 0x8a6a48 },

// --- 5 PRESETS MÁS (nov-2026), sacados de los perfiles medium/small del
// repo dgreenheck/ez-tree (MIT). Mismo criterio que el resto del archivo:
// el porte real manda y gnarliness/twist/force quedan a CERO para que
// ningún árbol vuelva a salir arqueado.
// ash_medium: fractal medio del repo → bauhinia (copa aérea, flores lilas).
ash_medium: { seed: 27411, type: 'deciduous', levels: 3, angle: [44, 61, 55], children: [8, 4, 3], length: [41.2, 24.6, 10.4, 4.6], radius: [1.85, 0.59, 0.72, 0.7], sections: [10, 8, 6, 4], segments: [9, 6, 4, 3], start: [0, 0.26, 0.32, 0], taper: [0.7, 0.68, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 52, leafCount: 14, leafStart: 0.05, leafSize: 2.3, leafVariance: 0.62, leafColor: 0x6f9f4c, barkColor: 0xce9a5e },
// oak_medium: copa ancha y media del repo → laurel (densa, siempre verde).
oak_medium: { seed: 33007, type: 'deciduous', levels: 3, angle: [54, 52, 32], children: [6, 4, 3], length: [36.4, 20.1, 11.6, 7.16], radius: [1.75, 0.8, 0.69, 1.19], sections: [12, 8, 6, 2], segments: [9, 5, 3, 3], start: [0, 0.42, 0.08, 0.12], taper: [0.73, 0.42, 0.69, 0.75], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 42, leafCount: 16, leafStart: 0.18, leafSize: 2.1, leafVariance: 0.66, leafColor: 0x4c7d3a, barkColor: 0x8a7150 },
// oak_bushy: copa baja y compacta → lagerstroemia (árbol de Júpiter, 6 m).
oak_bushy: { seed: 31187, type: 'deciduous', levels: 3, angle: [58, 62, 36], children: [5, 4, 3], length: [20.6, 9.2, 6.4, 4.2], radius: [1.15, 0.72, 0.55, 0.8], sections: [10, 7, 5, 2], segments: [8, 5, 3, 3], start: [0, 0.55, 0.1, 0.12], taper: [0.7, 0.4, 0.66, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 46, leafCount: 13, leafStart: 0.2, leafSize: 1.55, leafVariance: 0.6, leafColor: 0x628f42, barkColor: 0x9b8460 },
// pine_medium: conífera ovoide del repo → grevillea (roble sedoso, 13 m).
pine_medium: { seed: 15883, type: 'evergreen', levels: 1, angle: [112, 22, 60], children: [70, 4, 5], length: [46.5, 28.4, 16.2, 1], radius: [0.92, 0.34, 0.7, 0.7], sections: [11, 9, 7, 5], segments: [8, 6, 4, 3], start: [0, 0.24, 0.18, 0.3], taper: [0.7, 0.7, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 26, leafCount: 24, leafStart: 0.12, leafSize: 1.5, leafVariance: 0.28, leafColor: 0x5e7f47, barkColor: 0x9a7a56 },
// --- 4 PRESETS MÁS (nov-2026): los géneros del parque de María Luisa que
// caían en 'generico'. Mismo criterio (gnarliness/twist/force a CERO y porte
// real por delante de la silueta del repo).
// aspen_tall: copa alta y densa, tronco columnar → ailanto (Ailanthus, 39).
// Construido sobre la geometría DENSA de ash (probada en el resto del mapa)
// con base de copa alta (0.52) para el porte columnar del árbol del cielo.
aspen_tall: { seed: 21341, type: 'deciduous', levels: 3, angle: [50, 62, 50], children: [9, 5, 3], length: [43.5, 26.4, 11.8, 4.6], radius: [1.95, 0.64, 0.76, 0.7], sections: [12, 8, 6, 4], segments: [9, 6, 4, 3], start: [0, 0.34, 0.30, 0], taper: [0.7, 0.66, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 44, leafCount: 22, leafStart: 0.10, leafSize: 2.3, leafVariance: 0.65, leafColor: 0x679b48, barkColor: 0xb59a78 },
// oak_compact: copa redondeada, cerrada y baja → lagunaria (37). Base de
// oak_medium: copa ancha y llena desde media altura.
oak_compact: { seed: 24709, type: 'deciduous', levels: 3, angle: [54, 54, 32], children: [7, 5, 3], length: [31, 20.1, 11.6, 7.16], radius: [1.62, 0.8, 0.69, 1.19], sections: [12, 8, 6, 2], segments: [9, 5, 3, 3], start: [0, 0.36, 0.08, 0.12], taper: [0.73, 0.42, 0.69, 0.75], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 44, leafCount: 26, leafStart: 0.12, leafSize: 2.15, leafVariance: 0.6, leafColor: 0x4f7a3d, barkColor: 0x8f7a5e },
// pine_column: conífera cónica de ribera → taxodio (27). Base pine_large,
// con la copa arrancando más baja y más ancha.
pine_column: { seed: 17651, type: 'evergreen', levels: 1, angle: [120, 24, 60], children: [100, 5, 5], length: [46.8, 30.2, 16.2, 1], radius: [0.99, 0.35, 0.7, 0.7], sections: [12, 10, 8, 6], segments: [8, 6, 4, 3], start: [0, 0.13, 0.2, 0.3], taper: [0.68, 0.7, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 20, leafCount: 30, leafStart: 0.05, leafSize: 1.6, leafVariance: 0.3, leafColor: 0x62704a, barkColor: 0x7f6a4e },
// pine_narrow: columna densa y estrecha → tejo/Thuja (Thuja, Podocarpus).
// Base pine_small, algo más corta y con más hijos para la columna tupida.
pine_narrow: { seed: 13109, type: 'evergreen', levels: 1, angle: [104, 52, 60], children: [86, 6, 5], length: [36.5, 14.4, 11.8, 1], radius: [0.74, 0.4, 0.7, 0.7], sections: [12, 9, 8, 6], segments: [8, 6, 4, 3], start: [0, 0.10, 0.24, 0.3], taper: [0.72, 0.7, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 30, leafCount: 26, leafStart: 0.02, leafSize: 1.35, leafVariance: 0.28, leafColor: 0x3f6038, barkColor: 0x8a6a4a },
// aspen_small: tronco corto y copa globosa del repo → algarrobo (Ceratonia).
aspen_small: { seed: 20563, type: 'deciduous', levels: 2, angle: [68, 42, 7], children: [8, 4, 3], length: [26.8, 8.4, 9.2, 1], radius: [0.78, 0.46, 0.7, 0.7], sections: [10, 8, 6, 4], segments: [8, 6, 4, 3], start: [0, 0.48, 0.28, 0], taper: [0.5, 0.18, 0.7, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 38, leafCount: 12, leafStart: 0.18, leafSize: 1.9, leafVariance: 0.62, leafColor: 0x4e7a38, barkColor: 0x8a7150 },
// --- 2 PRESETS MÁS (nov-2026, ronda parque de María Luisa). Mismo criterio
// de siempre: gnarliness/twist/force a CERO (nada arqueado) y el porte real
// por delante de la silueta del repo.
// ficus_ancho: FICUS DE PARQUE (microcarpa, benjamina, elastica, retusa).
// Lo que los distingue de verdad: tronco corto y grueso que se divide en
// ramas horizontales, copa BAJA, ancha y muy densa (llega casi al suelo en
// los ejemplares viejos), y copa más ancha que alta. Base de copa muy baja
// (0.18), pocos niveles y mucho hijo por nivel para la densidad; hojas
// grandes (2.4) para el follaje tupido. copa radio ~2.0x altura.
ficus_ancho: { seed: 27431, type: 'deciduous', levels: 3, angle: [72, 58, 40], children: [9, 6, 4], length: [17.5, 15.2, 9.8, 5.4], radius: [2.35, 0.86, 0.62, 0.55], sections: [10, 8, 6, 3], segments: [9, 7, 5, 3], start: [0, 0.18, 0.22, 0.1], taper: [0.62, 0.5, 0.62, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 46, leafCount: 20, leafStart: 0, leafSize: 2.4, leafVariance: 0.55, leafColor: 0x3f7a33, barkColor: 0x7d6a52 },
// firmiana: ÁRBOL DE LAS PAGODAS (Firmiana simplex). Tronco derecho, liso
// y verde, copa OVALADA y ELEVADA, poco densa en la base (hoja grande de
// plátano arriba). Base de copa alta (0.46) y ancho moderado: copa más
// estrecha que el ficus, como el porte real de la especie.
firmiana: { seed: 28657, type: 'deciduous', levels: 3, angle: [42, 56, 44], children: [7, 4, 3], length: [33.4, 18.6, 10.2, 5.2], radius: [1.42, 0.6, 0.58, 0.52], sections: [12, 8, 6, 3], segments: [9, 6, 4, 3], start: [0, 0.46, 0.3, 0.1], taper: [0.74, 0.6, 0.66, 0.7], gnarliness: [0, 0, 0, 0], twist: [0, 0, 0, 0], force: 0, leafAngle: 46, leafCount: 16, leafStart: 0.06, leafSize: 2.6, leafVariance: 0.5, leafColor: 0x7fae52, barkColor: 0x8f9a6a },
  };
  // NOTA (nov-2026): gleditsia/ligustrum/cercis/magnolia/catalpa/casuarina
  // REUTILIZAN los presets de arriba según su silueta real (nada de presets
  // nuevos): el coste en KB es solo la entrada de 1 línea por especie.
  var EZ_ESPECIES = {
    pino: { preset: 'pine', evergreen: true }, eucalipto: { preset: 'aspen', evergreen: true },
    ginkgo: { preset: 'aspen', evergreen: false }, encina_roble: { preset: 'oak', evergreen: true },
    platanero: { preset: 'ash', evergreen: false }, olmo: { preset: 'ash', evergreen: false },
    chopo: { preset: 'aspen', evergreen: false }, tipuana: { preset: 'ash', evergreen: false },
    jacaranda: { preset: 'ash', evergreen: false }, morera: { preset: 'oak', evergreen: false },
    ficus: { preset: 'oak', evergreen: true }, paraiso: { preset: 'ash', evergreen: false },
    // --- 4 especies NUEVAS de Sevilla (nov-2026), una por estación dominante
    // del arbolado urbano. Almez y brachychiton casi siempre verdes en la
    // calle (perennes), robinia y fresno caducos con ciclo estacional:
    almez: { preset: 'oak_large', evergreen: true },          // Celtis australis, 12.689 ejemplares
    brachychiton: { preset: 'aspen_large', evergreen: true }, // Brachychiton populneus, 7.822
    robinia: { preset: 'ash_large', evergreen: false },       // Robinia pseudoacacia, 3.141
    fresno: { preset: 'pine_large', evergreen: false },       // Fraxinus angustifolia, 1.568
    // --- 2 especies MÁS (nov-2026): siguientes en abundancia sin modelo propio.
    // Ciprés perenne (silueta de columna, siempre verde) y sophora caduco
    // (flor amarilla a final de verano, copa abierta). 3.294 y 3.291 ejemplares.
    cipres: { preset: 'pine_small', evergreen: true },        // Cupressus sempervirens, 3.294
    sophora: { preset: 'oak_small', evergreen: false },       // Sophora/Styphnolobium japonicum, 7.382
    // --- 6 especies del parque de María Luisa (nov-2026), reutilizando los
    // presets del repo por silueta parecida (cero peso nuevo en el bundle):
    gleditsia: { preset: 'ash', evergreen: false },           // Gleditsia triacanthos, 1.600 (acacia de 3 espinas)
    ligustrum: { preset: 'oak_small', evergreen: true },      // Ligustrum japonicum/lucidum, 7.400
    cercis: { preset: 'oak_small', evergreen: false },        // Cercis siliquastrum, 1.395 (árbol de Judas)
    magnolia: { preset: 'oak', evergreen: true },             // Magnolia grandiflora, perenne de copa densa
    catalpa: { preset: 'oak_large', evergreen: false },       // Catalpa bignonioides, copa ancha
    casuarina: { preset: 'pine', evergreen: true },           // Casuarina equisetifolia, porte de cola de caballo
    palmera: { preset: 'palm', evergreen: true },             // resto de palmáceos sin nombre exacto
    // --- 4 especies NUEVAS (nov-2026): palmeras bien diferenciadas entre sí
    // (datilera, canaria y washingtonia, que antes iban todas al preset genérico
    // 'palm') y el olivo, abundantísimo en Sevilla y sin modelo EZ hasta hoy.
    palmera_datilera: { preset: 'palm_datilera', evergreen: true },      // Phoenix dactylifera: esbelta, hojas caídas
    palmera_canaria: { preset: 'palm_canaria', evergreen: true },        // Phoenix canariensis: tronco grueso, corona esférica
    palmera_washingtonia: { preset: 'palm_washingtonia', evergreen: true }, // Washingtonia: la más alta, hojas en abanico
    olivo: { preset: 'olivo', evergreen: true },                         // Olea europaea: copa baja plateada
    // --- 5 especies MÁS (nov-2026): las que quedaban sin copa 3D y son
    // legión en el inventario oficial (lagerstroemia ~1.9k, bauhinia ~1.2k,
    // grevillea ~1.1k, algarrobo ~700, laurel ~600). Cada una con su preset.
    lagerstroemia: { preset: 'oak_bushy', evergreen: false },   // Lagerstroemia indica: copa baja, flores rosas
    bauhinia: { preset: 'ash_medium', evergreen: false },       // Bauhinia variegata/purpurea: copa aérea, flor lila
    grevillea: { preset: 'pine_medium', evergreen: true },      // Grevillea robusta: porte piramidal, hoja fina
    algarrobo: { preset: 'aspen_small', evergreen: true },      // Ceratonia siliqua: copa globosa, perenne
    laurel: { preset: 'oak_medium', evergreen: true },          // Laurus nobilis: copa densa, perenne
    // --- 4 GÉNEROS MÁS (nov-2026): los que más se ven en el parque de María
    // Luisa sin tipo propio (iban a 'generico', sin copa 3D). Cada uno con su
    // preset del repo adaptado por silueta; nada existente cambia.
    ailanto: { preset: 'aspen_tall', evergreen: false },        // Ailanthus altissima, 39 + 4 de su variedad
    lagunaria: { preset: 'oak_compact', evergreen: true },      // Lagunaria patersonii (pica-pica), 37
    taxodio: { preset: 'pine_column', evergreen: false },       // Taxodium distichum, caduca de ribera, 27
    tejo: { preset: 'pine_narrow', evergreen: true },           // Thuja/Podocarpus, 9 de columna densa
    // --- 2 ÁRBOLES MÁS (nov-2026): los que quedaban abundantes en el parque
    // sin copa 3D. Presets propios (ficus_ancho / firmiana) definidos arriba.
    firmiana: { preset: 'firmiana', evergreen: false },         // Firmiana simplex, 1.085 (árbol de las pagodas)
    ficus_alto: { preset: 'ficus_ancho', evergreen: true },     // Ficus microcarpa/benjamina/elastica, 602 (perennes)
  };
  // NOTA (nov-2026): gleditsia/ligustrum/cercis/magnolia/catalpa/casuarina
  // REUTILIZAN los presets de arriba según su silueta real (nada de presets
  // nuevos): el coste en KB es solo la entrada de 1 línea por especie.



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
    // (nov-2026) Las palmeras NO son árboles: un port de ramas fractales
    // les daba un "árbol con hojas verdes en la punta" (el tronco se
    // estrechaba como una rama y las hojas eran elipses horizontales
    // flotando). Ahora tienen SU generador: fuste esbelto con base
    // abultada, anillos y corona de frondes en arco. El resto de tipos
    // sigue exactamente con el port de ez-tree.
    if (preset.palm) return construirPalmera(preset, rand);
    return construirArbol(preset, rand);
  }

  // ==========================================================================
  // PALMERA (nov-2026). Geometrías pensadas para verse REALES a tamaño de
  // calle y desde arriba:
  //   - Fuste: tronco único, liso o escamoso, con base abultada y anillos
  //     reales (no un cono), ligeramente curvado como muchos ejemplares de
  //     alineado. El engrosamiento de la base es el detalle que más delata a
  //     una palmera mal dibujada, y aquí está en todas.
  //   - Corona: frondes en ARCO (suben del cogollo y bajan en curva) hechas
  //     con segmentos encadenados, no planos sueltos. Phoenix: pinnadas y
  //     péndulas; Washingtonia: abanico en V abierto; genérica: intermedia.
  //   - Remate: cogollo cerrado en la punta + (datilera) racimos de dátiles.
  // Todo determinista por semilla y con topes de presupuesto (memoria).
  // ==========================================================================
  function construirPalmera(preset, rand) {
    var madera = [];
    var hojas = [];
    var frutos = [];
    var M = preset.palm;
    var hP = M.altura, radioBase = M.radioBase, radioAlto = M.radioAlto;
    var radioCorona = hP * M.corona;
    // Troncos/madera propios de cada especie: el árbol fractal trae una
    // corteza más oscura (0x6b533c); las palmeras, su fuste pardo-gris.
    var corteza = preset.palm ? preset.palm.barkColor : preset.barkColor;

    // --- FUSTE: anillos apilados con radio que se afina desde la base.
    var anillos = M.anillos;
    var y = 0;
    for (var a = 0; a < anillos; a++) {
      var t0 = a / anillos, t1 = (a + 1) / anillos;
      var y1 = hP * t1;
      // Base abultada (0.62 → 1) en el primer 15 % y afilado suave arriba.
      var rT0 = radioAlto + (radioBase - radioAlto) * Math.pow(1 - t0, 0.75) * (t0 < 0.15 ? 1 + 0.28 * (1 - t0 / 0.15) : 1);
      if (t0 === 0) rT0 *= 0.86;  // el corte del suelo: base redondeada
      var rT1 = radioAlto + (radioBase - radioAlto) * Math.pow(1 - t1, 0.75) * (t1 < 0.15 ? 1 + 0.28 * (1 - t1 / 0.15) : 1);
      // curvatura suave del fuste (solo visual, simula ejemplares inclinados)
      var cx0 = M.curva * hP * Math.sin(t0 * Math.PI * 0.85), cx1 = M.curva * hP * Math.sin(t1 * Math.PI * 0.85);
      var geo = new THREE.CylinderGeometry(rT1, rT0, y1 - y, M.segmentos, 1);
      geo.applyMatrix4(new THREE.Matrix4().makeTranslation((cx0 + cx1) * 0.5, (y + y1) * 0.5, 0));
      madera.push(geo);
      // Anillo/cicatriz: un toroide achatado cada `anilloCada` tramos (las
      // cicatrices de las frondes viejas). Barato: solo si hay presupuesto.
      if (a % M.anilloCada === 0 && a > 0) {
        var tor = new THREE.CylinderGeometry(rT1 * 1.06, rT1 * 1.06, (y1 - y) * 0.55, M.segmentos, 1, true);
        tor.applyMatrix4(new THREE.Matrix4().makeTranslation(cx1, y1, 0));
        madera.push(tor);
      }
      y = y1;
    }
    // Coronamiento: cogollo verde compacto que cierra la punta del fuste.
    var cxTop = M.curva * hP * Math.sin(Math.PI * 0.85);
    var cogollo = new THREE.SphereGeometry(radioAlto * 1.9, 8, 6);
    cogollo.scale(1, 0.75, 1);
    cogollo.applyMatrix4(new THREE.Matrix4().makeTranslation(cxTop, hP, 0));
    hojas.push(cogollo);

    // --- CORONA: N frondes en arco, en TRES pisos (alto, medio y péndulo).
    // Cada fronde es UNA cinta continua de anchura variable que serpentea
    // por su raquis: antes eran quads sueltos por segmento, cada uno con su
    // propia rotación, y la corona salía "trocada" con huecos entre trozos.
    var nFrondes = M.frondes;
    var semillaAng = rand() * Math.PI * 2;
    var raizFronde = new THREE.Vector3(cxTop, hP - radioAlto * 0.35, 0);
    for (var f = 0; f < nFrondes; f++) {
      var nivel = f % 3;               // 0 = alta y arqueada, 1 = media, 2 = péndula
      var ang = semillaAng + (f / nFrondes) * Math.PI * 2 + rand(0.16, -0.16);
      // Ángulo de salida respecto a la horizontal: + sube, - cae.
      var apertura = (M.apertura[nivel] + rand(8, -8)) * Math.PI / 180;
      var largo = radioCorona * (M.largo[nivel] + rand(0.1, -0.1));
      var segs = M.segmentosFronde;
      var dirT = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      var dirL = new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang));

      // 1) Raquis (nervio central): puntos de la curva del fronde.
      var puntos = [raizFronde.clone()];
      for (var s = 1; s <= segs; s++) {
        var u = s / segs;
        // Arco: sale casi recto y cae cada vez más (droop cuadrático).
        var angActual = apertura - M.arqueo * u * u;
        var paso = largo / segs;
        var prev = puntos[puntos.length - 1];
        puntos.push(new THREE.Vector3(
          prev.x + dirT.x * Math.cos(angActual) * paso,
          prev.y + Math.sin(angActual) * paso,
          prev.z + dirT.z * Math.cos(angActual) * paso
        ));
      }
      for (var r2 = 1; r2 < puntos.length; r2++) {
        var u2 = r2 / segs;
        var g = geometriaCilindro(puntos[r2 - 1].clone(), puntos[r2].clone(),
          M.grosorFronde * (1 - 0.8 * u2), M.grosorFronde * (0.2 - 0.14 * u2) + 0.006, 3);
        if (g) madera.push(g);
      }

      // 2) Limbo: cinta continua (perfil de foliolo) a lo largo del raquis.
      //    Ancha en el centro, aguda en la punta; el perfil se estrecha en
      //    la base (pecíolo) y se abre enseguida.
      var wMax = M.anchoFronde * 0.5;
      var fila = [];
      for (var q = 0; q <= segs; q++) {
        var uq = q / segs;
        // forma del limbo: 0 en la base, máximo ~0.6 y afilado en la punta
        var perfil = Math.sin(Math.min(1, uq * 1.02) * Math.PI) * (0.55 + 0.45 * (1 - uq));
        var ancho = Math.max(0.025, wMax * perfil);
        // ondulación suave del limbo (pennas de Phoenix y abanico de Washingtonia)
        var ondula = Math.sin(uq * 9 + f * 1.7) * ancho * 0.18;
        var p0 = puntos[q];
        fila.push({
          izq: new THREE.Vector3(p0.x + dirL.x * (ancho + ondula), p0.y - ancho * 0.28, p0.z + dirL.z * (ancho + ondula)),
          der: new THREE.Vector3(p0.x - dirL.x * (ancho - ondula), p0.y - ancho * 0.28, p0.z - dirL.z * (ancho - ondula)),
        });
      }
      var pos = [], nor = [];
      var norHoja = new THREE.Vector3().crossVectors(dirL, new THREE.Vector3(0, 1, 0)).normalize();
      if (!isFinite(norHoja.x)) norHoja.set(0, 1, 0);
      for (var q2 = 0; q2 < fila.length; q2++) {
        pos.push(fila[q2].izq.x, fila[q2].izq.y, fila[q2].izq.z);
        pos.push(fila[q2].der.x, fila[q2].der.y, fila[q2].der.z);
        nor.push(norHoja.x, norHoja.y, norHoja.z, norHoja.x, norHoja.y, norHoja.z);
      }
      var ind = [];
      for (var q3 = 0; q3 < fila.length - 1; q3++) {
        var a = q3 * 2, b = a + 1, c = a + 2, d = a + 3;
        ind.push(a, c, b, b, c, d);
      }
      var cinta = new THREE.BufferGeometry();
      cinta.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      cinta.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
      cinta.setIndex(ind);
      hojas.push(cinta);

      // Dátiles colgando del cogollo (solo la datilera): racimos naranjas.
      if (M.datiles && f % 2 === 0) {
        var plan = largo * 0.6;
        for (var d = 0; d < plan; d += 0.11) {
          var lado = (d * 37.1 + f * 11.7) % 2 < 1 ? 1 : -1;
          var anchura = wMax * (0.35 + 0.55 * Math.sin((d / plan) * Math.PI));
          var off = lado * anchura * (0.25 + 0.65 * ((d * 91.3 + f) % 1));
          var gd = new THREE.SphereGeometry(M.grosorDatile * (0.8 + 0.45 * ((d * 53.7 + f) % 1)), 5, 4);
          gd.scale(1, 1.4, 1);
          gd.applyMatrix4(new THREE.Matrix4().makeTranslation(
            raizFronde.x + dirT.x * Math.cos(apertura) * d + dirL.x * off,
            raizFronde.y + Math.sin(apertura) * d - 0.38 * d * d / plan - M.grosorDatile,
            raizFronde.z + dirT.z * Math.cos(apertura) * d + dirL.z * off
          ));
          frutos.push(gd);
        }
      }
    }
    return { madera: madera, hojas: hojas, frutos: frutos };
  }

  // Segmento de cilindro entre dos puntos (a→b) con radios r0→r1. Reutilizado
  // por la palmera; el resto del módulo usa el port de ez-tree.
  function geometriaCilindro(a, b, r0, r1, segs) {
    var dir = new THREE.Vector3().subVectors(b, a);
    var largo = dir.length();
    if (!(largo > 1e-5) || !(r0 > 0) || !(r1 > 0)) return null;
    var g = new THREE.CylinderGeometry(Math.max(0.002, r1), Math.max(0.002, r0), largo, segs, 1, false);
    var q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    var medio = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    g.applyMatrix4(new THREE.Matrix4().compose(medio, q, new THREE.Vector3(1, 1, 1)));
    return g;
  }

  // Corteza oscura del árbol fractal (el pardo que el motor plano ya usaba).
  var CORTEZA_ARBOL = 0x6b533c;

  // ==========================================================================
  // ÁRBOLES (port de ez-tree: Tree.generateSkeleton/growBranch)
  // ==========================================================================
  function construirArbol(preset, rand) {
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
    var matDatile = null;   // material único para los frutos de todas las datileras
    EZ_TIPOS.forEach(function (tipo, k) {
      var especie = EZ_ESPECIES[tipo];
      var preset = EZ_PRESETS[especie.preset];
      variantes[tipo] = [];
      for (var v = 0; v < N_VARIANTES; v++) {
        var barkMat = new THREE.MeshStandardMaterial({ color: 0x594332, flatShading: true, roughness: 1.0, metalness: 0.02 });
        var rand = ezRng(preset.seed + k * 7919 + v * 131);
        var ramaje = construirEsqueleto(preset, rand);
        var geoMadera = fusionar(ramaje.madera);
        geoMadera.computeBoundingBox();
        var altReal = Math.max(2, geoMadera.boundingBox.max.y);
        var geoHojas = fusionar(ramaje.hojas);
        var geoFrutos = ramaje.frutos && ramaje.frutos.length ? fusionar(ramaje.frutos) : null;
        geoHojas.computeBoundingBox(); geoHojas.computeBoundingSphere();
        // NORMALIZACIÓN (nov-2026, FIX gigantes de verdad): los presets del
        // repo nacen en unidades arbitrarias (oak_large ~95, pine ~50). Antes
        // se escalaban en vivo con deseada/altReal, pero el suelo de 0.4 del
        // clamp OBLIGABA a inflar los modelos altos: un fresno de 14 m con
        // modelo de 55 unidades se dibujaba a 0.4x55 = 22 m. Ahora el modelo
        // se reescala UNA vez a su altura de referencia (EZ_ALTURAS) y la
        // escala en vivo queda ~1.0 con clamps estrechos: tamaño siempre
        // fiel al dato (altura real del inventario/OSM) sin sorpresas.
        var fNorm = (EZ_ALTURAS[tipo] || 10) / altReal;
        geoMadera.scale(fNorm, fNorm, fNorm);
        geoHojas.scale(fNorm, fNorm, fNorm);
        if (geoFrutos) geoFrutos.scale(fNorm, fNorm, fNorm);
        geoMadera.computeBoundingBox();
        altReal = EZ_ALTURAS[tipo] || 10;
        // Madera de LA ESPECIE: palmera con su fuste pardo-gris; el resto
        // con el pardo oscuro de siempre (0x594332, no cambiado).
        barkMat.color.setHex(preset.palm ? (preset.palm.barkColor || 0x8c7a5e) : 0x594332);
        if (preset.palm) barkMat.roughness = 0.92;
        var meshT = new THREE.InstancedMesh(geoMadera, barkMat, MAX_ARBOL);
        meshT.count = 0; meshT.frustumCulled = false;
        scene.add(meshT);
        var mallasHojas = Object.create(null);
        Object.keys(EZ_ESTACIONES[vfEstacionKey(especie)]).forEach(function (est) {
          var color = EZ_ESTACIONES[vfEstacionKey(especie)][est].color;
          // La palmera conserva SIEMPRE su verde de fronda (el de la especie),
          // solo algo más apagado en invierno; no debe pasar a ocre/otoño.
          if (preset.palm) color = preset.palm.follajeHex ? preset.palm.follajeHex[est] || preset.palm.follajeHex.verano : color;
          var key = String(color);
          if (mallasHojas[key]) return;
          // (nov-2026) Las HOJAS de palmera no pueden llevar el emisivo 0.55
          // del resto: los frondes son cintas anchas que se miran de plano
          // desde el mapa en picado y, con ese emisivo, la corona salía como
          // un disco verde plano sin volumen. Con 0.22 las cintas conservan
          // luz propia (no se apagan en contraluz) pero el sol marca el
          // arqueo de cada fronde y la corona se lee en 3D.
          var esPalmaFollaje = !!preset.palm;
          var material = new THREE.MeshStandardMaterial({
            color: color, flatShading: true, roughness: 1.0, metalness: 0.0,
            vertexColors: false, transparent: false,
            // (nov-2026) ÁRBOLES OSCUROS AL MIRAR DESDE ARRIBA: el mapa se ve
            // en picado y la cara interior de cada plano de hoja quedaba en
            // contraluz (hoja casi negra → copa sucia). Igual que en la
            // albizia y el naranjo, el emisivo del PROPIO color de la hoja al
            // 0.55 mantiene las copas legibles desde cualquier pitch y deja
            // que el sol real siga marcando el sombreado en las caras de luz.
            emissive: color, emissiveIntensity: esPalmaFollaje ? 0.22 : 0.55,
            side: THREE.DoubleSide,
          });
          var meshH = new THREE.InstancedMesh(geoHojas, material, MAX_ARBOL);
          meshH.count = 0; meshH.frustumCulled = false;
          scene.add(meshH);
          mallasHojas[key] = meshH;
        });
        // Dátiles (solo datilera): esferas naranjas achatadas colgando del
        // cogollo, un solo material compartido por la variante.
        var meshF = null;
        if (geoFrutos) {
          if (!matDatile) matDatile = new THREE.MeshStandardMaterial({
            color: 0xd98a2b, flatShading: true, roughness: 0.75, metalness: 0,
            emissive: 0xa8631c, emissiveIntensity: 0.35,
          });
          meshF = new THREE.InstancedMesh(geoFrutos, matDatile, MAX_ARBOL);
          meshF.count = 0; meshF.frustumCulled = false;
          scene.add(meshF);
        }
        variantes[tipo].push({
          tipo: tipo, alturaModelo: altReal,
          techoEscala: (EZ_ALTURAS[tipo] || 10) / altReal,
          meshTroncos: meshT, meshHojas: mallasHojas, meshFrutos: meshF,
          preset: preset, especie: especie, geoHojasActual: geoHojas,
        });
        // Las hojas se resuelven SOLO en aplicarEstacion() (una pasada para
        // todos los tipos). Aquí se ocultan para que un cambio de tipo no
        // pueda dejar visible una época de otro árbol.
        Object.keys(mallasHojas).forEach(function (kc) { mallasHojas[kc].visible = false; });
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
        // Corteza: la de la ESPECIE si la tiene (palmeras), si no el pardo de
        // siempre. Cada variante tiene su propio material, así que esto no
        // afecta a ningún otro tipo.
        var palma = vf.preset.palm;
        vf.meshTroncos.material.color.setHex(palma && palma.barkColor ? palma.barkColor : 0x594332);
        Object.keys(vf.meshHojas).forEach(function (color) {
          var mallaHojas = vf.meshHojas[color];
          // La palmera conserva el verde de fronda todo el año (solo oscurece
          // un poco en invierno): nunca dorada, nunca desnuda.
          var hex = est.color;
          if (palma && palma.follajeHex) hex = palma.follajeHex[estacion] || palma.follajeHex.verano;
          mallaHojas.visible = String(hex) === color;
          mallaHojas.material.color.setHex(hex);
          mallaHojas.material.emissive.setHex(hex);
        });
        if (vf.meshFrutos) vf.meshFrutos.visible = !!(palma && palma.datiles);
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
      // (nov-2026) LÍMITES REALES DEL CANVAS. getBounds() de MapLibre se limita
      // a lat[-85,85] y, con pitch, no cubre lo que se ve arriba del todo: por
      // eso el borde superior del mapa se quedaba sin árboles. Aquí se calculan
      // las 4 esquinas reales (con o sin inclinación) y se usa su envolvente.
      var b = map.getBounds(), c = map.getCenter();
      // Colchón del 10 %: las esquinas del lienzo se quedan cortas cuando
      // MapLibre aún está asentando el render; sin él, los árboles del borde
      // aparecían y desaparecían al mover un píxel.
      var margenLon = Math.max(0.0004, (b.getEast() - b.getWest()) * 0.1);
      var margenLat = Math.max(0.0004, (b.getNorth() - b.getSouth()) * 0.1);
      var lonW = b.getWest() - margenLon, lonE = b.getEast() + margenLon;
      var latS = b.getSouth() - margenLat, latN = b.getNorth() + margenLat;
      try {
        var lienzo = map.getCanvas();
        var w = lienzo.clientWidth, h = lienzo.clientHeight;
        var esquinas = [[0, 0], [w, 0], [0, h], [w, h]];
        for (var e = 0; e < esquinas.length; e++) {
          var p = map.unproject(esquinas[e]);
          if (!isFinite(p.lng) || !isFinite(p.lat)) continue;
          if (p.lng < lonW) lonW = p.lng;
          if (p.lng > lonE) lonE = p.lng;
          if (p.lat < latS) latS = p.lat;
          if (p.lat > latN) latN = p.lat;
        }
      } catch (e2) { /* sin esquinas: nos quedamos con getBounds() */ }
      var candidatas = todas.filter(function (a) {
        return EZ_ALTURAS[a.tipo] &&
          a.lon >= lonW && a.lon <= lonE &&
          a.lat >= latS && a.lat <= latN;
      }).sort(function (a1, a2) {
        var d1 = (a1.lon - c.lng) * (a1.lon - c.lng) + (a1.lat - c.lat) * (a1.lat - c.lat);
        var d2 = (a2.lon - c.lng) * (a2.lon - c.lng) + (a2.lat - c.lat) * (a2.lat - c.lat);
        return d1 - d2;
      });
      // (nov-2026) ANTES se descartaban los ejemplares cuya copa tocaba la del
      // vecino (factor 0.72): en una alineación de plátanos ESO ES CASI TODOS,
      // y el mapa quedaba con árboles sueltos en vez de una fila. Ahora solo
      // se quitan los que caen PRÁCTICAMENTE ENCIMA (dos nodos del mismo
      // árbol: OSM duplicado, inventario + OSM…), a menos de 1,2 m.
      var separados = [];
      for (var i = 0; i < candidatas.length && separados.length < MAX_ARBOL; i++) {
        var actual = candidatas[i];
        var demasiadoCerca = separados.some(function (previo) {
          var latMedia = (actual.lat + previo.lat) * 0.5 * Math.PI / 180;
          var dx = (actual.lon - previo.lon) * 111320 * Math.cos(latMedia);
          var dy = (actual.lat - previo.lat) * 111320;
          return dx * dx + dy * dy < 1.2 * 1.2;
        });
        if (!demasiadoCerca) separados.push(actual);
      }
      return separados;
    } catch (e) { return []; }
  }

  // El motor plano consulta los ejemplares que este módulo está dibujando
  // para no pintar una segunda copa exactamente en el mismo punto.
  window.manolitAireArbolesEZVisibles = function () {
    if (!activo || !map || map.getZoom() < ZOOM_MIN) return [];
    return arbolesEZEnVista().map(function (a) { return { lon: a.lon, lat: a.lat }; });
  };

  function refrescarInstancias(forzar) {
    if (!listo || !activo || !TMP_M4 || !scene) return;
    var arboles = arbolesEZEnVista();
    var firma = (estacionActual || '') + '|' + map.getZoom().toFixed(2) + '|' + arboles.length;
    for (var f = 0; f < arboles.length; f++) {
      firma += '|' + arboles[f].tipo + ',' + arboles[f].lon.toFixed(6) + ',' + arboles[f].lat.toFixed(6) + ',' + (arboles[f].altura || 0) + ',' + (arboles[f].radioCopaM || 0);
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
        var mallasHojas = Object.keys(vf.meshHojas).map(function (color) { return vf.meshHojas[color]; });
        for (var i2 = 0; i2 < losMios.length; i2++) {
          var ar = losMios[i2];
          var mc = maplibregl.MercatorCoordinate.fromLngLat({ lng: ar.lon, lat: ar.lat }, 0);
          var s = metrosAMercator(ar.lat);
          // (nov-2026) FIX DE ALTURA EN PALMERAS: el inventario oficial trae
          // 147 palmeras con altura 1-5 m (ejemplares jóvenes o mal medidas)
          // y 26 sin dato; estimarDimensionesArbol() les aplica su suelo de
          // 6 m y salían TODAS iguales, enanas y a media altura. Como el
          // modelo ya está normalizado a la altura de la ESPECIE, aquí el
          // porte adulto manda: el dato de altura solo se respeta cuando es
          // verosímil (>= 6 m), como ya hacía el clamp de palmáceas.
          var alturaModeloDeseada = ar.altura || EZ_ALTURAS[tipo];
          if (vf.preset.palm && (!ar.altura || ar.altura < 6)) {
            alturaModeloDeseada = EZ_ALTURAS[tipo] || 12;
          }
          // Modelos YA normalizados a EZ_ALTURAS: la escala solo ajusta al
          // dato real del árbol (altura medida), con margen estrecho.
          var deseada = Math.min(alturaModeloDeseada, (EZ_ALTURAS[tipo] || 10) * 1.25);
          // (nov-2026) PALMERAS: su porte real manda, sin encogerse. El
          // inventario mide bien la altura, pero una datilera de 7 m no debe
          // quedar a ras del seto. Se acepta un poco más de recorrido de
          // escala SOLO en palmáceas (0.62 → 1.35) y se mantiene el clamp
          // estrecho de siempre para el resto de árboles.
          var esPalma = !!vf.preset.palm;
          var sArbol = esPalma
            ? Math.max(0.62, Math.min(1.35, deseada / vf.alturaModelo))
            : Math.max(0.5, Math.min(1.25, deseada / vf.alturaModelo));
          escV.set(s * sArbol, s * sArbol, s * sArbol);
          m4.compose(TMP_V3.set(mc.x - REF.x, mc.y - REF.y, mc.z - REF.z), QUAT_UP, escV);
          vf.meshTroncos.setMatrixAt(i2, m4);
          for (var h = 0; h < mallasHojas.length; h++) mallasHojas[h].setMatrixAt(i2, m4);
          if (vf.meshFrutos) vf.meshFrutos.setMatrixAt(i2, m4);
        }
        vf.meshTroncos.count = losMios.length;
        vf.meshTroncos.instanceMatrix.needsUpdate = true;
        if (vf.meshFrutos) {
          vf.meshFrutos.count = losMios.length;
          vf.meshFrutos.instanceMatrix.needsUpdate = true;
        }
        for (var h2 = 0; h2 < mallasHojas.length; h2++) {
          mallasHojas[h2].count = losMios.length;
          mallasHojas[h2].instanceMatrix.needsUpdate = true;
        }
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
        // (nov-2026) Luz ambiental extra: con el cielo/césped del hemisférico
        // los planos de hoja vistos desde arriba se apagaban (la normal mira
        // al suelo). Un AmbientLight suave devuelve volumen a la copa sin
        // lavar la luz direccional del sol.
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
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
    // Actualiza la capa plana después de que el motor 3D quede operativo.
    setTimeout(function () {
      try { if (typeof window.manolitAireRecalcularArboles === 'function') window.manolitAireRecalcularArboles(true); } catch (e) { /* sin efecto colateral */ }
    }, 0);
  }

  function desactivar() {
    activo = false;
    // No se toca el filtro de la capa global: es propiedad del motor original.
    map.triggerRepaint();
    // Al alejarse, vuelve a dibujar las copas planas que sustituía el 3D.
    setTimeout(function () {
      try { if (typeof window.manolitAireRecalcularArboles === 'function') window.manolitAireRecalcularArboles(true); } catch (e) { /* sin efecto colateral */ }
    }, 0);
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
          return {
            tipo: v.tipo, troncos: v.meshTroncos.count,
            hojas: Object.keys(v.meshHojas).reduce(function (total, color) {
              return total + v.meshHojas[color].count;
            }, 0),
          };
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
