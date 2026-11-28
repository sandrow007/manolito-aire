/* ==========================================================================
   CLIMA 2050 — js/clima-2050-source.js (módulo aditivo e independiente)
   --------------------------------------------------------------------------
   Selección de FUENTE de datos para la capa "Clima 2050". No ejecuta TARGET
   en el navegador (sin Python ni WASM aquí): solo intenta leer un GeoJSON
   PRECALCULADO que se genera fuera de la web (TARGET/UMEP, ver
   scripts/target/README.md) y se copia en:

     data/clima2050/target/clima_2050_target.geojson

   Modo elegido por CLIMA_2050_SOURCE = auto | emulated | target
   (por defecto: auto). Se lee, por este orden de prioridad:
   1) opciones.source pasado a resolverFuente/leerConfiguracionFuente,
   2) parámetro de URL ?clima2050source=auto|emulated|target,
   3) localStorage["manolito_clima2050_source"],
   4) window.MANOLIT_CLIMA_2050_SOURCE,
   5) "auto".

   - emulated: nunca descarga el archivo TARGET; la capa funciona EXACTAMENTE
     como antes (fórmula emulada de días >40 °C en el cliente).
   - target: pide el archivo; si no existe, está corrupto o no cumple el
     esquema mínimo, NO se inventa nada: vuelve a emulated y deja un aviso.
   - auto: igual que target, pero el aviso es aún más discreto (se espera que
     el archivo aún no exista).

   Expone window.manolitClima2050Fuente. En Node (tests, validador CLI)
   también se puede require(): mismo objeto, sin window.
   ========================================================================== */
(function (global) {
  'use strict';

  var URL_TARGET_DEFECTO = 'data/clima2050/target/clima_2050_target.geojson';
  var CLAVE_LOCALSTORAGE = 'manolito_clima2050_source';
  var PARAMETRO_URL = 'clima2050source';
  var FUENTES = { AUTO: 'auto', EMULADA: 'emulated', TARGET: 'target' };

  /* ---------------- fórmula emulada (AISLADA y DOCUMENTADA) ----------------
     dias40 = 30 + risk_level × 5 + hashTexto(area) mod 7.
     Es la fórmula que la capa Clima 2050 lleva ejecutando desde el inicio
     (estaba en js/clima-2050.js); aquí queda aislada para que el módulo de
     fuente y los tests la compartan. El hash determinista hace variar el
     ejemplo según el nombre del área; no representa medición ni variabilidad
     climática. NO CAMBIAR: los tests comprueban que el resultado es idéntico
     al de la fórmula original. */
  function hashTextoClima2050(t) {
    var h = 0;
    for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return h;
  }
  function calcularDias40Emulados(riskLevel, area) {
    var risk = Number(riskLevel);
    if (!isFinite(risk) || risk < 0 || risk > 3) return null;
    return 30 + risk * 5 + (hashTextoClima2050(String(area == null ? '' : area)) % 7);
  }

  /* ---------------- configuración de la fuente ---------------- */

  function normalizarNombreFuente(v) {
    if (v == null) return null;
    var s = String(v).trim().toLowerCase();
    if (s === 'auto') return FUENTES.AUTO;
    if (s === 'emulated' || s === 'emulada' || s === 'emulado') return FUENTES.EMULADA;
    if (s === 'target') return FUENTES.TARGET;
    return null;
  }

  function leerParametroUrl(nombre) {
    try {
      if (!global.window || !global.window.location) return null;
      return new URLSearchParams(global.window.location.search).get(nombre);
    } catch (e) { return null; }
  }

  function leerLocalStorage(clave) {
    try {
      if (!global.localStorage) return null;
      return global.localStorage.getItem(clave);
    } catch (e) { return null; }
  }

  // Devuelve 'auto' | 'emulated' | 'target'. Nunca lanza: cualquier valor
  // raro se ignora y se cae al siguiente nivel de prioridad.
  function leerConfiguracionFuente(opciones) {
    opciones = opciones || {};
    var orden = [
      opciones.source,
      leerParametroUrl(PARAMETRO_URL),
      leerLocalStorage(CLAVE_LOCALSTORAGE),
      global.MANOLIT_CLIMA_2050_SOURCE
    ];
    for (var i = 0; i < orden.length; i++) {
      var v = normalizarNombreFuente(orden[i]);
      if (v) return v;
    }
    return FUENTES.AUTO;
  }

  /* ---------------- esquema mínimo del GeoJSON TARGET ----------------
     Obligatorio por feature:
       - geometry: Polygon o MultiPolygon con coordinates.
       - properties.municipio: string no vacío.
       - properties.area: string no vacío.
       - properties.risk_level: entero 0-3.
     Capacidad opcional (si vienen deben ser números; si faltan, la UI dice
     "no disponible" y no inventa nada):
       dias40, noches_tropicales, hazard_index, vulnerability_index.
     Metadatos del análisis (se leen de collection.metadata, de miembros de
     la colección o de las propiedades de las features; en ese orden):
       source: "TARGET", scenario: "RCP4.5" | "SSP2-4.5", year: 2050,
       resolution_m: 100. Si faltan, el informe los da por "no indicado". */

  function numeroOpcional(v) {
    if (v == null || v === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function extraerMetaTarget(col) {
    var candidatos = [];
    if (col && col.metadata && typeof col.metadata === 'object') candidatos.push(col.metadata);
    if (col) candidatos.push(col);
    function buscar(campo) {
      for (var i = 0; i < candidatos.length; i++) {
        if (candidatos[i][campo] != null && candidatos[i][campo] !== '') return candidatos[i][campo];
      }
      var fs = (col && col.features) || [];
      for (var j = 0; j < fs.length; j++) {
        var p = fs[j] && fs[j].properties;
        if (p && p[campo] != null && p[campo] !== '') return p[campo];
      }
      return null;
    }
    return {
      source: buscar('source'),
      scenario: buscar('scenario'),
      year: numeroOpcional(buscar('year')),
      resolution_m: numeroOpcional(buscar('resolution_m'))
    };
  }

  function validarGeojsonTarget(col) {
    var errores = [];
    if (!col || typeof col !== 'object') {
      return { ok: false, errores: ['no es un objeto JSON'], meta: null };
    }
    if (col.type !== 'FeatureCollection') errores.push('type debe ser "FeatureCollection"');
    var feats = Array.isArray(col.features) ? col.features : null;
    if (!feats || !feats.length) errores.push('features ausente o vacío');
    if (errores.length) return { ok: false, errores: errores, meta: null };
    for (var i = 0; i < feats.length; i++) {
      var f = feats[i];
      var pref = 'features[' + i + ']';
      if (!f || f.type !== 'Feature') { errores.push(pref + ': type debe ser "Feature"'); continue; }
      if (!f.geometry || (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') || !Array.isArray(f.geometry.coordinates)) {
        errores.push(pref + ': geometry debe ser Polygon o MultiPolygon con coordinates');
      }
      var p = f.properties || {};
      if (typeof p.municipio !== 'string' || !p.municipio.trim()) errores.push(pref + ': falta municipio (string no vacío)');
      if (typeof p.area !== 'string' || !p.area.trim()) errores.push(pref + ': falta area (string no vacío)');
      var r = Number(p.risk_level);
      if (!isFinite(r) || r < 0 || r > 3 || Math.floor(r) !== r) errores.push(pref + ': risk_level debe ser entero 0-3');
      var opcionales = ['dias40', 'noches_tropicales', 'hazard_index', 'vulnerability_index'];
      for (var k = 0; k < opcionales.length; k++) {
        var campo = opcionales[k];
        if (p[campo] != null && p[campo] !== '' && !isFinite(Number(p[campo]))) {
          errores.push(pref + ': ' + campo + ' debe ser número si existe');
        }
      }
      // Más de 20 errores no ayudan a nadie: se corta la lista.
      if (errores.length > 20) { errores.push('… (lista de errores cortada)'); break; }
    }
    return { ok: errores.length === 0, errores: errores, meta: extraerMetaTarget(col) };
  }

  // Objeto normalizado por feature: siempre con las mismas claves; los
  // opcionales ausentes quedan null ("no disponible"), jamás inventados.
  function normalizarFeatureTarget(feature, meta) {
    var p = (feature && feature.properties) || {};
    var r = Number(p.risk_level);
    return {
      source: 'target',
      scenario: meta ? meta.scenario : null,
      year: meta ? meta.year : null,
      resolution_m: meta ? meta.resolution_m : null,
      municipio: typeof p.municipio === 'string' ? p.municipio : null,
      area: typeof p.area === 'string' ? p.area : null,
      risk_level: (isFinite(r) && r >= 0 && r <= 3 && Math.floor(r) === r) ? r : null,
      hazard_index: numeroOpcional(p.hazard_index),
      vulnerability_index: numeroOpcional(p.vulnerability_index),
      dias40: numeroOpcional(p.dias40),
      noches_tropicales: numeroOpcional(p.noches_tropicales),
      metadata: null
    };
  }

  /* ---------------- resolución de la fuente ---------------- */

  function fuenteEmulada(aviso) {
    return { source: FUENTES.EMULADA, url: null, geojson: null, meta: null, features: null, aviso: aviso || null };
  }

  // Devuelve una Promise de { source, url, geojson, meta, features, aviso }.
  // source 'target': geojson con el objeto YA validado (la capa lo usa en
  // línea y evita una segunda descarga). source 'emulated': todo null salvo
  // aviso; la capa sigue usando su URL maestra de siempre.
  function resolverFuente(opciones) {
    opciones = opciones || {};
    var modo = leerConfiguracionFuente(opciones);
    if (modo === FUENTES.EMULADA) return Promise.resolve(fuenteEmulada(null));
    var fetchImpl = opciones.fetchImpl || (typeof global.fetch === 'function' ? global.fetch.bind(global) : null);
    var urlTarget = opciones.urlTarget || URL_TARGET_DEFECTO;
    if (!fetchImpl) return Promise.resolve(fuenteEmulada('fetch no disponible en este entorno'));
    var promesa;
    try {
      promesa = fetchImpl(urlTarget);
    } catch (e) {
      return Promise.resolve(fuenteEmulada('error al lanzar la petición del GeoJSON TARGET'));
    }
    return promesa.then(function (resp) {
      if (!resp || !resp.ok) {
        return fuenteEmulada('no existe data/clima2050/target/clima_2050_target.geojson (HTTP ' + (resp && resp.status) + ')');
      }
      return resp.json().then(function (col) {
        var v = validarGeojsonTarget(col);
        if (!v.ok) return fuenteEmulada('esquema inválido: ' + v.errores.slice(0, 3).join('; '));
        return {
          source: FUENTES.TARGET,
          url: urlTarget,
          geojson: col,
          meta: v.meta,
          features: (col.features || []).map(function (f) { return normalizarFeatureTarget(f, v.meta); }),
          aviso: null
        };
      }, function () {
        return fuenteEmulada('JSON corrupto en el GeoJSON TARGET');
      });
    }, function () {
      return fuenteEmulada('error de red al cargar el GeoJSON TARGET');
    });
  }

  var api = {
    FUENTES: FUENTES,
    URL_TARGET_DEFECTO: URL_TARGET_DEFECTO,
    CLAVE_LOCALSTORAGE: CLAVE_LOCALSTORAGE,
    PARAMETRO_URL: PARAMETRO_URL,
    hashTextoClima2050: hashTextoClima2050,
    calcularDias40Emulados: calcularDias40Emulados,
    normalizarNombreFuente: normalizarNombreFuente,
    leerConfiguracionFuente: leerConfiguracionFuente,
    extraerMetaTarget: extraerMetaTarget,
    validarGeojsonTarget: validarGeojsonTarget,
    normalizarFeatureTarget: normalizarFeatureTarget,
    resolverFuente: resolverFuente
  };
  global.manolitClima2050Fuente = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
