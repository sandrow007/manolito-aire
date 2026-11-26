/* ==========================================================================
   UTCI Y CONFORT TÉRMICO — js/utci-confort.js (módulo aditivo e independiente)
   --------------------------------------------------------------------------
   Matemática pura + meteo cacheada para el confort del peatón. NO dibuja
   nada ni toca el mapa: la integración con el routing vive en
   js/confort-ruta.js. Si este archivo falta o falla, la web funciona
   exactamente igual que antes (coste del Dijkstra por fracción de sombra).

   Contenido:
   1) UTCI (Universal Thermal Climate Index) con la aproximación polinómica
      oficial de Bröde et al. (2012), la misma que usan las librerías de
      referencia (pythermalcomfort, Ladybug). Entradas: temperatura del
      aire (Ta), temperatura radiante media (Tmrt), humedad relativa (HR) y
      viento (va). Todo se calcula en cliente: no se envía ubicación ni
      rutas a ningún servidor.
   2) Tmrt ESTIMADA sol/sombra (modelo propio, documentado abajo: no es una
      medida, por eso toda la UI dice "UTCI estimado").
   3) Viento a nivel peatón: Open-Meteo da viento a 10 m; el peatón camina
      a ~1,1 m. Ajuste por ley potencial de Hellmann con exponente urbano
      alfa = 0,22: v_peaton = v10 x (1,1/10)^0,22 ~ 0,6 x v10
      (FACTOR_VIENTO_PEATON). Es el valor estándar de ingeniería de viento
      peatonal en ciudad (rango real 0,55-0,65 según rugosidad).
   4) Meteo cacheada de /prevision (worker propio, caché edge 10 min), con
      respaldo directo a Open-Meteo si el worker desplegado es viejo, igual
      que hace microclima.js. Caché en memoria por celda de 0,25 grados +
      localStorage (10 min), sin llamadas repetidas al mover el mapa.

   Rangos de validez del modelo UTCI (se recortan las entradas):
   Ta de -50 a +50 C, va de 0,5 a 17 m/s, Tmrt-Ta de -30 a +70 K.
   ========================================================================== */
(function () {
  'use strict';
  if (window.ManolitUTCI) return;

  /* ---------------- Constantes del modelo (documentadas) ---------------- */

  var FACTOR_VIENTO_PEATON = 0.6;   // Hellmann urbano alfa=0,22 a 1,1 m (ver cabecera)
  var ALFA_VIENTO = 0.22;           // exponente de la ley potencial, terreno urbano
  var TMRT_SOMBRA_INCREMENTO = 2;   // K sobre Ta a la sombra (cielo visible acota)
  var TMRT_SOL_INCREMENTO_MAX = 18; // K sobre Ta a pleno sol vertical y cielo limpio
  var GHI_REFERENCIA = 900;         // W/m2 de referencia para escalar la Tmrt solar
  var CACHE_METEO_MS = 10 * 60 * 1000; // /prevision renueva cada ~10 min
  var CELDA_GRADOS = 0.25;          // misma celda que microclima.js
  var VIENTO_DEFECTO_10M = 3;       // m/s si el worker viejo no trae viento

  /* ---------------- 1) UTCI: aproximación polinómica oficial ----------------
     Bröde, Fiala, Blazejczyk et al. (2012), "Deriving the operational
     procedure for the Universal Thermal Climate Index (UTCI)".
     Entradas: Ta (C), va (m/s, a 10 m en el modelo oficial; aquí llega ya
     ajustada a peatón por decisión del proyecto), D_Tmrt = Tmrt - Ta (K),
     Pa = presión de vapor de agua (kPa). */

  function presionVaporKPa(ta, rh) {
    // Presión de saturación con la ecuación ESPECÍFICA del modelo UTCI
    // (la del código Fortran original de www.utci.org, no Magnus): serie
    // exponencial sobre kelvin con los coeficientes g de Bröde et al.
    var G = [-2836.5744, -6028.076559, 19.54263612, -0.02737830188,
      0.000016261698, 7.0229056e-10, -1.8680009e-13];
    var tk = ta + 273.15;
    var es = 2.7150305 * Math.log(tk);
    for (var i = 0; i < G.length; i++) es += G[i] * Math.pow(tk, i - 2);
    es = Math.exp(es) * 0.01; // de Pa a hPa
    return Math.max(0, Math.min(100, rh)) / 100 * es / 10; // hPa -> kPa
  }

  function calcularUTCI(ta, tmrt, va, rh) {
    if (!isFinite(ta) || !isFinite(tmrt) || !isFinite(va) || !isFinite(rh)) return null;
    // Recorte a los rangos de validez del modelo.
    ta = Math.max(-50, Math.min(50, ta));
    va = Math.max(0.5, Math.min(17, va));
    var dTmrt = Math.max(-30, Math.min(70, tmrt - ta));
    var pa = Math.max(0, Math.min(10, presionVaporKPa(ta, rh)));

    var Ta = ta, va2 = va * va, va3 = va2 * va, va4 = va3 * va, va5 = va4 * va, va6 = va5 * va;
    var Ta2 = Ta * Ta, Ta3 = Ta2 * Ta, Ta4 = Ta3 * Ta, Ta5 = Ta4 * Ta, Ta6 = Ta5 * Ta;
    var D = dTmrt, D2 = D * D, D3 = D2 * D, D4 = D3 * D, D5 = D4 * D, D6 = D5 * D;
    var Pa = pa, Pa2 = Pa * Pa, Pa3 = Pa2 * Pa, Pa4 = Pa3 * Pa, Pa5 = Pa4 * Pa, Pa6 = Pa5 * Pa;

    var utci = Ta
      + 6.07562052e-01
      - 2.27712343e-02 * Ta
      + 8.06470249e-04 * Ta2
      - 1.54271372e-04 * Ta3
      - 3.24651735e-06 * Ta4
      + 7.32602852e-08 * Ta5
      + 1.35959073e-09 * Ta6
      - 2.25836520e+00 * va
      + 8.80326035e-02 * Ta * va
      + 2.16844454e-03 * Ta2 * va
      - 1.53347087e-05 * Ta3 * va
      - 5.72983704e-07 * Ta4 * va
      - 2.55090145e-09 * Ta5 * va
      - 7.51269505e-01 * va2
      - 4.08350271e-03 * Ta * va2
      - 5.21670675e-05 * Ta2 * va2
      + 1.94544667e-06 * Ta3 * va2
      + 1.14099531e-08 * Ta4 * va2
      + 1.58137256e-01 * va3
      - 6.57263143e-05 * Ta * va3
      + 2.22697524e-07 * Ta2 * va3
      - 4.16117031e-08 * Ta3 * va3
      - 1.27762753e-02 * va4
      + 9.66891875e-06 * Ta * va4
      + 2.52785852e-09 * Ta2 * va4
      + 4.56306672e-04 * va5
      - 1.74202546e-07 * Ta * va5
      - 5.91491269e-06 * va6
      + 3.98374029e-01 * D
      + 1.83945314e-04 * Ta * D
      - 1.73754510e-04 * Ta2 * D
      - 7.60781159e-07 * Ta3 * D
      + 3.77830287e-08 * Ta4 * D
      + 5.43079673e-10 * Ta5 * D
      - 2.00518269e-02 * va * D
      + 8.92859837e-04 * Ta * va * D
      + 3.45433048e-06 * Ta2 * va * D
      - 3.77925774e-07 * Ta3 * va * D
      - 1.69699377e-09 * Ta4 * va * D
      + 1.69992415e-04 * va2 * D
      - 4.99204314e-05 * Ta * va2 * D
      + 2.47417178e-07 * Ta2 * va2 * D
      + 1.07596466e-08 * Ta3 * va2 * D
      + 8.49242932e-05 * va3 * D
      + 1.35191328e-06 * Ta * va3 * D
      - 6.21531254e-09 * Ta2 * va3 * D
      - 4.99410301e-06 * va4 * D
      - 1.89489258e-08 * Ta * va4 * D
      + 8.15300114e-08 * va5 * D
      + 7.55043090e-04 * D2
      - 5.65095215e-05 * Ta * D2
      - 4.52166564e-07 * Ta2 * D2
      + 2.46688878e-08 * Ta3 * D2
      + 2.42674348e-10 * Ta4 * D2
      + 1.54547250e-04 * va * D2
      + 5.24110970e-06 * Ta * va * D2
      - 8.75874982e-08 * Ta2 * va * D2
      - 1.50743064e-09 * Ta3 * va * D2
      - 1.56236307e-05 * va2 * D2
      - 1.33895614e-07 * Ta * va2 * D2
      + 2.49709824e-09 * Ta2 * va2 * D2
      + 6.51711721e-07 * va3 * D2
      + 1.94960053e-09 * Ta * va3 * D2
      - 1.00361113e-08 * va4 * D2
      - 1.21206673e-05 * D3
      - 2.18203660e-07 * Ta * D3
      + 7.51269482e-09 * Ta2 * D3
      + 9.79063848e-11 * Ta3 * D3
      + 1.25006734e-06 * va * D3
      - 1.81584736e-09 * Ta * va * D3
      - 3.52197671e-10 * Ta2 * va * D3
      - 3.36514630e-08 * va2 * D3
      + 1.35908359e-10 * Ta * va2 * D3
      + 4.17032620e-10 * va3 * D3
      - 1.30369025e-09 * D4
      + 4.13908461e-10 * Ta * D4
      + 9.22652254e-12 * Ta2 * D4
      - 5.08220384e-09 * va * D4
      - 2.24730961e-11 * Ta * va * D4
      + 1.17139133e-10 * va2 * D4
      + 6.62154879e-10 * D5
      + 4.03863260e-13 * Ta * D5
      + 1.95087203e-12 * va * D5
      - 4.73602469e-12 * D6
      + 5.12733497e+00 * Pa
      - 3.12788561e-01 * Ta * Pa
      - 1.96701861e-02 * Ta2 * Pa
      + 9.99690870e-04 * Ta3 * Pa
      + 9.51738512e-06 * Ta4 * Pa
      - 4.66426341e-07 * Ta5 * Pa
      + 5.48050612e-01 * va * Pa
      - 3.30552823e-03 * Ta * va * Pa
      - 1.64119440e-03 * Ta2 * va * Pa
      - 5.16670694e-06 * Ta3 * va * Pa
      + 9.52692432e-07 * Ta4 * va * Pa
      - 4.29223622e-02 * va2 * Pa
      + 5.00845667e-03 * Ta * va2 * Pa
      + 1.00601257e-06 * Ta2 * va2 * Pa
      - 1.81748644e-06 * Ta3 * va2 * Pa
      - 1.25813502e-03 * va3 * Pa
      - 1.79330391e-04 * Ta * va3 * Pa
      + 2.34994441e-06 * Ta2 * va3 * Pa
      + 1.29735808e-04 * va4 * Pa
      + 1.29064870e-06 * Ta * va4 * Pa
      - 2.28558686e-06 * va5 * Pa
      - 3.69476348e-02 * D * Pa
      + 1.62325322e-03 * Ta * D * Pa
      - 3.14279680e-05 * Ta2 * D * Pa
      + 2.59835559e-06 * Ta3 * D * Pa
      - 4.77136523e-08 * Ta4 * D * Pa
      + 8.64203390e-03 * va * D * Pa
      - 6.87405181e-04 * Ta * va * D * Pa
      - 9.13863872e-06 * Ta2 * va * D * Pa
      + 5.15916806e-07 * Ta3 * va * D * Pa
      - 3.59217476e-05 * va2 * D * Pa
      + 3.28696511e-05 * Ta * va2 * D * Pa
      - 7.10542454e-07 * Ta2 * va2 * D * Pa
      - 1.24382300e-05 * va3 * D * Pa
      - 7.38584400e-09 * Ta * va3 * D * Pa
      + 2.20609296e-07 * va4 * D * Pa
      - 7.32469180e-04 * D2 * Pa
      - 1.87381964e-05 * Ta * D2 * Pa
      + 4.80925239e-06 * Ta2 * D2 * Pa
      - 8.75492040e-08 * Ta3 * D2 * Pa
      + 2.77862930e-05 * va * D2 * Pa
      - 5.06004592e-06 * Ta * va * D2 * Pa
      + 1.14325367e-07 * Ta2 * va * D2 * Pa
      + 2.53016723e-06 * va2 * D2 * Pa
      - 1.72857035e-08 * Ta * va2 * D2 * Pa
      - 3.95079398e-08 * va3 * D2 * Pa
      - 3.59413173e-07 * D3 * Pa
      + 7.04388046e-07 * Ta * D3 * Pa
      - 1.89309167e-08 * Ta2 * D3 * Pa
      - 4.79768731e-07 * va * D3 * Pa
      + 7.96079978e-09 * Ta * va * D3 * Pa
      + 1.62897058e-09 * va2 * D3 * Pa
      + 3.94367674e-08 * D4 * Pa
      - 1.18566247e-09 * Ta * D4 * Pa
      + 3.34678041e-10 * va * D4 * Pa
      - 1.15606447e-10 * D5 * Pa
      - 2.80626406e+00 * Pa2
      + 5.48712484e-01 * Ta * Pa2
      - 3.99428410e-03 * Ta2 * Pa2
      - 9.54009191e-04 * Ta3 * Pa2
      + 1.93090978e-05 * Ta4 * Pa2
      - 3.08806365e-01 * va * Pa2
      + 1.16952364e-02 * Ta * va * Pa2
      + 4.95271903e-04 * Ta2 * va * Pa2
      - 1.90710882e-05 * Ta3 * va * Pa2
      + 2.10787756e-03 * va2 * Pa2
      - 6.98445738e-04 * Ta * va2 * Pa2
      + 2.30109073e-05 * Ta2 * va2 * Pa2
      + 4.17856590e-04 * va3 * Pa2
      - 1.27043871e-05 * Ta * va3 * Pa2
      - 3.04620472e-06 * va4 * Pa2
      + 5.14507424e-02 * D * Pa2
      - 4.32510997e-03 * Ta * D * Pa2
      + 8.99281156e-05 * Ta2 * D * Pa2
      - 7.14663943e-07 * Ta3 * D * Pa2
      - 2.66016305e-04 * va * D * Pa2
      + 2.63789586e-04 * Ta * va * D * Pa2
      - 7.01199003e-06 * Ta2 * va * D * Pa2
      - 1.06823306e-04 * va2 * D * Pa2
      + 3.61341136e-06 * Ta * va2 * D * Pa2
      + 2.29748967e-07 * va3 * D * Pa2
      + 3.04788893e-04 * D2 * Pa2
      - 6.42070836e-05 * Ta * D2 * Pa2
      + 1.16257971e-06 * Ta2 * D2 * Pa2
      + 7.68023384e-06 * va * D2 * Pa2
      - 5.47446896e-07 * Ta * va * D2 * Pa2
      - 3.59937910e-08 * va2 * D2 * Pa2
      - 4.36497725e-06 * D3 * Pa2
      + 1.68737969e-07 * Ta * D3 * Pa2
      + 2.67489271e-08 * va * D3 * Pa2
      + 3.23926897e-09 * D4 * Pa2
      - 3.53874123e-02 * Pa3
      - 2.21201190e-01 * Ta * Pa3
      + 1.55126038e-02 * Ta2 * Pa3
      - 2.63917279e-04 * Ta3 * Pa3
      + 4.53433455e-02 * va * Pa3
      - 4.32943862e-03 * Ta * va * Pa3
      + 1.45389826e-04 * Ta2 * va * Pa3
      + 2.17508610e-04 * va2 * Pa3
      - 6.66724702e-05 * Ta * va2 * Pa3
      + 3.33217140e-05 * va3 * Pa3
      - 2.26921615e-03 * D * Pa3
      + 3.80261982e-04 * Ta * D * Pa3
      - 5.45314314e-09 * Ta2 * D * Pa3
      - 7.96355448e-04 * va * D * Pa3
      + 2.53458034e-05 * Ta * va * D * Pa3
      - 6.31223658e-06 * va2 * D * Pa3
      + 3.02122035e-04 * D2 * Pa3
      - 4.77403547e-06 * Ta * D2 * Pa3
      + 1.73825715e-06 * va * D2 * Pa3
      - 4.09087898e-07 * D3 * Pa3
      + 6.14155345e-01 * Pa4
      - 6.16755931e-02 * Ta * Pa4
      + 1.33374846e-03 * Ta2 * Pa4
      + 3.55375387e-03 * va * Pa4
      - 5.13027851e-04 * Ta * va * Pa4
      + 1.02449757e-04 * va2 * Pa4
      - 1.48526421e-03 * D * Pa4
      - 4.11469183e-05 * Ta * D * Pa4
      - 6.80434415e-06 * va * D * Pa4
      - 9.77675906e-06 * D2 * Pa4
      + 8.82773108e-02 * Pa5
      - 3.01859306e-03 * Ta * Pa5
      + 1.04452989e-03 * va * Pa5
      + 2.47090539e-04 * D * Pa5
      + 1.48348065e-03 * Pa6;

    return utci;
  }

  /* ---------------- 2) Tmrt estimada sol/sombra ----------------
     MODELO PROPIO, SENCILLO Y DOCUMENTADO (no es una medida):
     - A la sombra la radiación directa no llega al peatón y la temperatura
       radiante media se acerca a la del aire: Tmrt = Ta + 2 K (las fachadas
       y el cielo visible aún aportan algo).
     - A pleno sol la Tmrt sube con la radiación. Se escala el incremento
       máximo (+18 K) por la radiación real si la hay (GHI de Open-Meteo,
       /prevision) o, en su defecto, por la geometría solar: seno de la
       altitud solar atenuado por la nubosidad (la nube difunde hasta un
       75% de la directa, el suelo y las fachadas siguen radiando).
     - De noche (sol bajo el horizonte) sol y sombra convergen. */

  function tmrtEstimada(ta, enSombra, altitudSolRad, nubes01, ghiWm2) {
    if (!isFinite(ta)) return null;
    if (!isFinite(altitudSolRad) || altitudSolRad <= 0) return ta + TMRT_SOMBRA_INCREMENTO * 0.5;
    if (enSombra) return ta + TMRT_SOMBRA_INCREMENTO;
    var factor;
    if (isFinite(ghiWm2) && ghiWm2 > 0) {
      factor = Math.max(0, Math.min(1, ghiWm2 / GHI_REFERENCIA));
    } else {
      var nubes = isFinite(nubes01) ? Math.max(0, Math.min(1, nubes01)) : 0;
      factor = Math.max(0, Math.sin(altitudSolRad)) * (1 - 0.75 * nubes);
    }
    return ta + TMRT_SOL_INCREMENTO_MAX * Math.max(0, Math.min(1, factor));
  }

  /* ---------------- 3) Viento a nivel peatón ---------------- */

  function ajustarVientoPeaton(v10ms) {
    var v10 = isFinite(v10ms) ? v10ms : VIENTO_DEFECTO_10M;
    // Coherente con la constante documentada: (1,1/10)^0,22 = 0,615 ~ 0,6.
    return Math.max(0.5, v10 * FACTOR_VIENTO_PEATON);
  }

  /* ---------------- 4) Meteo cacheada (/prevision + respaldo) ----------------
     Mismo patrón que microclima.js: celda de 0,25 grados en memoria, con
     persistencia en localStorage (10 min) para no repetir llamadas al
     recargar. Si el worker desplegado no tiene /prevision (respuesta no
     JSON), se llama a Open-Meteo directamente y se recuerda la decisión
     durante la sesión. */

  var cacheMemoria = new Map(); // clave celda -> { ts, datos }
  var previsionDirecta = false;

  function claveCelda(lat, lon) {
    return Math.floor(lat / CELDA_GRADOS) + ',' + Math.floor(lon / CELDA_GRADOS);
  }

  function cacheLocalObtener(clave) {
    try {
      var crudo = localStorage.getItem('manolito_cache_utci_' + clave);
      if (!crudo) return null;
      var obj = JSON.parse(crudo);
      if (obj && obj.datos && Date.now() - obj.ts < CACHE_METEO_MS) return obj.datos;
    } catch (e) { }
    return null;
  }

  function cacheLocalGuardar(clave, datos) {
    try { localStorage.setItem('manolito_cache_utci_' + clave, JSON.stringify({ ts: Date.now(), datos: datos })); } catch (e) { }
  }

  function urlConsulta(lat, lon) {
    var consulta = 'latitude=' + lat.toFixed(3) + '&longitude=' + lon.toFixed(3) +
      '&current=temperature_2m,cloudcover,relative_humidity_2m,uv_index,wind_speed_10m' +
      '&hourly=temperature_2m,cloudcover,relative_humidity_2m,wind_speed_10m,shortwave_radiation' +
      '&past_days=1&forecast_days=2&timezone=auto&timeformat=unixtime';
    return previsionDirecta
      ? 'https://api.open-meteo.com/v1/forecast?' + consulta
      : '/prevision?lat=' + lat.toFixed(3) + '&lon=' + lon.toFixed(3);
  }

  function parsearRespuesta(d) {
    var actual = {
      t: Number(d && d.current && d.current.temperature_2m),
      n: Number(d && d.current && d.current.cloudcover),
      h: Number(d && d.current && d.current.relative_humidity_2m),
      v: Number(d && d.current && d.current.wind_speed_10m),
      uv: Number(d && d.current && d.current.uv_index),
      ts: Number(d && d.current && d.current.time) * 1000 || 0
    };
    var horas = {};
    if (d && d.hourly && Array.isArray(d.hourly.time)) {
      var tt = d.hourly.temperature_2m || [];
      var nn = d.hourly.cloudcover || [];
      var hh = d.hourly.relative_humidity_2m || [];
      var vv = d.hourly.wind_speed_10m || [];
      var gg = d.hourly.shortwave_radiation || [];
      for (var i = 0; i < d.hourly.time.length; i++) {
        var temp = Number(tt[i]);
        if (!isFinite(temp)) continue;
        horas[Math.floor(Number(d.hourly.time[i]))] = {
          t: temp,
          n: Number(nn[i]),
          h: Number(hh[i]),
          v: Number(vv[i]),
          g: Number(gg[i])
        };
      }
    }
    if (!isFinite(actual.t) && !Object.keys(horas).length) return null;
    return { actual: actual, horas: horas };
  }

  function descargarMeteo(lat, lon) {
    return fetch(urlConsulta(lat, lon))
      .then(function (r) { if (!r.ok) throw new Error('prevision ' + r.status); return r.json(); })
      .then(function (d) {
        var datos = parsearRespuesta(d);
        if (datos) return datos;
        throw new Error('sin datos');
      })
      .catch(function (e) {
        if (!previsionDirecta) {
          // Worker viejo (sin /prevision o sin campos nuevos): directo.
          previsionDirecta = true;
          return fetch(urlConsulta(lat, lon))
            .then(function (r) { if (!r.ok) throw new Error('open-meteo ' + r.status); return r.json(); })
            .then(function (d) { return parsearRespuesta(d); });
        }
        return null;
      });
  }

  function obtenerMeteo(lat, lon) {
    var clave = claveCelda(lat, lon);
    var enMemoria = cacheMemoria.get(clave);
    if (enMemoria && Date.now() - enMemoria.ts < CACHE_METEO_MS) return Promise.resolve(enMemoria.datos);
    var persistente = cacheLocalObtener(clave);
    if (persistente) {
      cacheMemoria.set(clave, { ts: Date.now(), datos: persistente });
      return Promise.resolve(persistente);
    }
    return descargarMeteo(lat, lon).then(function (datos) {
      if (datos) {
        cacheMemoria.set(clave, { ts: Date.now(), datos: datos });
        cacheLocalGuardar(clave, datos);
      }
      return datos;
    });
  }

  /* Selecciona los valores PARA LA HORA EFECTIVA del reloj solar: si esa
     hora está en la previsión se usa su dato horario; si es la hora actual
     mandan los valores "current"; si está lejos (solsticios) se cae a la
     situación actual y la UI ya dice que todo es estimación. */
  function meteoParaHora(datos, horaMs) {
    if (!datos) return null;
    var a = datos.actual || {};
    var esAhora = Math.floor(horaMs / 3600000) === Math.floor(Date.now() / 3600000);
    var celda = datos.horas ? datos.horas[Math.floor(horaMs / 3600000)] : null;
    if (celda && isFinite(celda.t)) {
      return {
        t: celda.t,
        n: esAhora && isFinite(a.n) ? a.n : celda.n,
        h: isFinite(celda.h) ? celda.h : a.h,
        v: isFinite(celda.v) ? celda.v : a.v,
        g: isFinite(celda.g) ? celda.g : null,
        uv: esAhora ? a.uv : null,
        ts: a.ts || 0
      };
    }
    if (isFinite(a.t)) {
      return { t: a.t, n: a.n, h: a.h, v: a.v, g: null, uv: a.uv, ts: a.ts || 0 };
    }
    return null;
  }

  /* ---------------- 5) Nivel de estrés y bandas para UI ----------------
     Bandas oficiales del UTCI (grados C):
       < 9 frío; 9-26 sin estrés térmico; 26-32 moderado;
       32-38 fuerte; 38-46 muy fuerte; > 46 extremo. */

  function estresUTCI(utci) {
    // Estrés adimensional 0..~1,15 usado como multiplicador de coste en el
    // routing: 0 por debajo de 26 C (sin estrés), crece lineal hasta el
    // tope en ~51 C. Con tiempo fresco las rutas de sol y sombra cuestan
    // lo mismo (gana la rápida), como debe ser.
    if (!isFinite(utci)) return 0;
    return Math.max(0, Math.min(1.15, (utci - 26) / 22));
  }

  function nivelUTCI(utci) {
    if (!isFinite(utci)) return null;
    if (utci >= 46) return 'extremo';
    if (utci >= 38) return 'muyFuerte';
    if (utci >= 32) return 'fuerte';
    if (utci >= 26) return 'moderado';
    return 'sinEstres';
  }

  /* ---------------- API pública ---------------- */

  window.ManolitUTCI = {
    calcularUTCI: calcularUTCI,
    presionVaporKPa: presionVaporKPa,
    tmrtEstimada: tmrtEstimada,
    ajustarVientoPeaton: ajustarVientoPeaton,
    estresUTCI: estresUTCI,
    nivelUTCI: nivelUTCI,
    obtenerMeteo: obtenerMeteo,
    meteoParaHora: meteoParaHora,
    FACTOR_VIENTO_PEATON: FACTOR_VIENTO_PEATON,
    ALFA_VIENTO: ALFA_VIENTO
  };
})();
