/* ============================================================
   MICROCLIMA GLOBAL, capa opcional de temperatura de superficie
   v2 RENDIMIENTO: nunca congela la página.
   ------------------------------------------------------------
   Qué pinta: un mapa de calor (azul = fresco, rojo = caliente)
   sobre el mapa de sombras 3D, estimando la temperatura del suelo
   con tres fuentes GRATIS y honestas:

     1) Open-Meteo  -> temperatura base del aire (1 llamada / 15 min)
     2) El propio mapa -> tipo de superficie leído de los tiles
        vectoriales YA CARGADOS (cero llamadas extra a Overpass)
     3) El motor de sombras existente -> si el punto está en sombra,
        se atenúa el calentamiento solar

   HONESTIDAD: esto es una ESTIMACIÓN por modelo (literatura de isla
   de calor urbana), NO una medición por satélite. La leyenda lo dice.

   POR QUÉ ESTA V2 NO SE CUELGA (la v1 sí):
   - La v1 llamaba a queryRenderedFeatures POR CADA CELDA (miles de
     llamadas, cada una escanea todo lo renderizado -> minutos de
     bloqueo y diálogo de "página no responde").
   - La v2 hace UNA ÚNICA consulta por todo el viewport, indexa los
     polígonos por su caja (bbox) y luego cada celda solo comprueba
     los 1-5 polígonos candidatos. Además procesa POR TANDAS con
     pausas (cede el hilo al navegador) y ABORTA si el mapa se mueve
     antes de terminar. Resultado: fluido incluso en móvil.

   CAMBIOS DE ESTA REVISIÓN (a petición):
   - La leyenda se mueve a la esquina INFERIOR DERECHA (antes
     izquierda), para no tapar la barra de horarios/ruta.
   - La leyenda ahora tiene un botón "×" para CERRARLA sin apagar
     la capa: el microclima sigue activo en el mapa, solo se oculta
     la cajita. Queda un botón circular pequeño para reabrirla.

   CAMBIOS v3 (a petición):
   - La leyenda nace OCULTA: solo se ve el botón 🌡. Se abre solo
     si el usuario quiere verla, y su elección se recuerda.
   - RELOJ SOLAR: la capa solo se calcula con el reloj en PASADO
     o PRESENTE (datos reales). Si el reloj marca futuro, la capa
     se oculta sola y el botón cambia a ⏳: la estimación futura
     aún no está disponible.

   CAMBIOS v4 (a petición): la capa aprende a mirar adelante.
   - MODO PREDICTIVO: con el reloj solar en el futuro la capa YA
     NO se oculta. Usa la previsión horaria de Open-Meteo servida
     por el worker (/prevision, misma casa, caché edge 10 min) y
     pinta la estimación de esa hora. La leyenda avisa de que es
     previsión, nunca la hace pasar por medición.
   - CACHÉ HORARIA: la previsión se guarda indexada por hora unix
     (ayer, hoy y mañana), así que mover el reloj no dispara nuevas
     llamadas: una sola petición cada 15 min por zona, como antes.
   - INERCIA TÉRMICA: cada material acumula el sol de las últimas
     horas con su propia constante de tiempo (el asfalto tarda en
     calentarse y sigue templado de noche, el césped responde al
     momento). Se implementa como media exponencial de la exposición
     solar (geometría SunCalc + nubosidad horaria) PRECALCULADA por
     material: el coste por celda no sube nada.
   - MÁS RESOLUCIÓN OSM: rejilla de 30 a 24 px y clases nuevas
     (peatonal, arena, roca) leídas de los mismos tiles.
   - ALBEDO + EVAPOTRANSPIRACIÓN: los offsets positivos se corrigen
     con el albedo típico de cada superficie (el asfalto negro se
     calienta mucho más que una acera clara) y los enfriamientos se
     modulan con la humedad horaria (el bosque enfría más con aire
     seco, porque evapotranspira mejor).
   - DPR: la rejilla se calcula en píxeles CSS y se dibuja escalada
     a los píxeles físicos del canvas. En móviles retina la capa
     queda alineada con el mapa y más fina, no estirada.
   ============================================================ */

(function () {
  'use strict';

  /* ---- CONSTANTES AJUSTABLES (literatura UHI) ---- */
  const OFFSET_SUPERFICIE = {
    asfalto: 16,          // punto medio +12 a +20 °C en sol directo
    edificio: 14,         // punto medio +10 a +18
    peatonal: 11,         // aceras y plazas claras: calientan menos que el asfalto
    suelo_desnudo: 7,     // punto medio +5 a +10
    roca: 10,             // roca desnuda: se calienta pero menos que asfalto
    arena: 12,            // arena seca: muy caliente al tacto, albedo alto
    vegetacion_baja: 1.5, // punto medio 0 a +3
    bosque: -6,           // enfriamiento por copa arbórea
    agua: -3.5,           // efecto moderador del agua
    urbano_generico: 10   // fallback si el punto no clasifica
  };
  // v4 INERCIA TÉRMICA: constante de tiempo (horas) de cada material.
  // A mayor tau, más tarda en calentarse y más tarda en enfriarse:
  // el agua guarda el fresco de la mañana hasta la tarde, el asfalto
  // sigue templado bien entrada la noche, el césped responde al momento.
  const TAU_HORAS = {
    asfalto: 2.5,
    edificio: 3,
    peatonal: 2,
    suelo_desnudo: 1.5,
    roca: 2,
    arena: 1.5,
    vegetacion_baja: 0.8,
    bosque: 1.2,
    agua: 6,
    urbano_generico: 2
  };
  // v4 ALBEDO típico (fracción de luz solar que cada superficie refleja):
  // a más albedo, menos energía se queda en el suelo. Solo corrige los
  // offsets POSITIVOS (los negativos enfrían por sombra y evapotranspiración,
  // no por reflexión).
  const ALBEDO_SUPERFICIE = {
    asfalto: 0.08,
    edificio: 0.20,
    peatonal: 0.32,
    suelo_desnudo: 0.25,
    roca: 0.23,
    arena: 0.38,
    vegetacion_baja: 0.22,
    bosque: 0.16,
    agua: 0.07,
    urbano_generico: 0.15
  };
  const ALBEDO_REF = 0.15; // albedo de referencia implícito en OFFSET_SUPERFICIE
  // v4 EVAPOTRANSPIRACIÓN: cuánto del enfriamiento de cada superficie depende
  // de evaporar agua. Con humedad alta el aire está casi saturado y ese
  // enfriamiento se reduce; con aire seco es más fuerte.
  const ET_PESO = {
    asfalto: 0,
    edificio: 0,
    peatonal: 0.05,
    suelo_desnudo: 0.10,
    roca: 0,
    arena: 0.05,
    vegetacion_baja: 0.55,
    bosque: 0.75,
    agua: 0.9,
    urbano_generico: 0.15
  };
  const FACTOR_SOMBRA = 0.21;        // fracción de aporte solar que queda en sombra (luz difusa)
  const REJILLA_PX = 24;             // celda en píxeles CSS (más grande = más rápido)
  const CACHE_TEMP_MS = 15 * 60000;  // previsión: máximo 1 llamada / 15 min por zona
  const DEBOUNCE_MS = 400;
  const FILAS_POR_TANDA = 6;         // filas de rejilla por tanda antes de ceder el hilo

  let mapa = null;
  // v4: una sola caché con la previsión completa (actual + horas).
  // "horas" va indexada por hora unix (segundos): mover el reloj solar
  // consulta esta tabla sin volver a llamar a la red.
  let previsionCache = { ts: 0, lat: null, lon: null, actualT: null, actualN: null, actualH: null, horas: {} };
  let temporizador = null;
  let activo = false;
  let versionCalculo = 0;            // para abortar cálculos viejos
  let ultimaHoraClave = -1;          // minuto de la última pasada (ahorra repaints iguales)

  /* ---- índice espacial simple: cajas (bbox) por tipo ---- */

  function construirIndiceSuperficie() {
    // UNA sola consulta para todo el viewport (esto es lo que la v1
    // hacía miles de veces). Clasificamos cada polígono UNA vez.
    const idx = { agua: [], bosque: [], vegetacion_baja: [], edificio: [], asfalto: [], peatonal: [], suelo_desnudo: [], roca: [], arena: [] };
    let feats = [];
    try { feats = mapa.queryRenderedFeatures() || []; } catch (e) { return idx; }

    const vistos = new Set();
    for (const f of feats) {
      if (!f.geometry || (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon')) continue;
      const sl = (f.sourceLayer || '').toLowerCase();
      const cls = ((f.properties && (f.properties.class || f.properties.subclass)) || '').toLowerCase();
      const lay = ((f.layer && f.layer.id) || '').toLowerCase();

      let tipo = null;
      if (sl === 'water' || lay.includes('water')) tipo = 'agua';
      else if (cls === 'wood' || cls === 'forest') tipo = 'bosque';
      else if (['park', 'grass', 'garden', 'meadow', 'cemetery', 'pitch', 'playground', 'village_green', 'recreation_ground'].includes(cls)) tipo = 'vegetacion_baja';
      else if (sl === 'building' || lay.includes('building')) tipo = 'edificio';
      else if (sl === 'transportation' || lay.includes('road')) {
        // v4: dentro de la red vial se distingue lo peatonal (aceras,
        // plazas, carriles: pavimento claro, albedo alto) de la calzada
        // de asfalto negro. Es la mayor fuente de "resolución" nueva:
        // justo las calles por donde camina la gente.
        if (['pedestrian', 'footway', 'path', 'cycleway', 'corridor', 'pedestrian_area', 'steps', 'track'].includes(cls)) tipo = 'peatonal';
        else tipo = 'asfalto';
      }
      else if (cls === 'sand' || cls === 'beach') tipo = 'arena';
      else if (cls === 'bare_rock' || cls === 'scree' || cls === 'cliff') tipo = 'roca';
      else if (cls === 'bare_soil') tipo = 'suelo_desnudo';
      if (!tipo) continue;

      // la misma geometría puede salir duplicada por tiles: deduplicar
      let clave;
      try { clave = tipo + JSON.stringify(f.geometry.coordinates).slice(0, 120); } catch (e) { continue; }
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      try { idx[tipo].push({ bbox: turf.bbox(f), geo: f }); } catch (e) { /* geometría rara: fuera */ }
    }

    // Copas de árboles del propio motor = microclima de bosque urbano
    try {
      const copas = mapa.querySourceFeatures('arboles-globales-copas') || [];
      for (const f of copas) {
        if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
          try { idx.bosque.push({ bbox: turf.bbox(f), geo: f }); } catch (e) {}
        }
      }
    } catch (e) { /* fuente de árboles aún no existe */ }

    return idx;
  }

  function construirIndiceSombras() {
    const lista = [];
    for (const src of ['sombras', 'arboles-globales-sombra']) {
      try {
        const feats = mapa.querySourceFeatures(src) || [];
        for (const f of feats) {
          if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
            try { lista.push({ bbox: turf.bbox(f), geo: f }); } catch (e) {}
          }
        }
      } catch (e) { /* fuente no lista */ }
    }
    return lista;
  }

  function enPoligono(lista, lng, lat) {
    // solo comprueba polígonos cuya caja contiene el punto (casi ninguno)
    for (const p of lista) {
      const b = p.bbox;
      if (lng < b[0] || lat < b[1] || lng > b[2] || lat > b[3]) continue;
      try {
        if (turf.booleanPointInPolygon(turf.point([lng, lat]), p.geo)) return true;
      } catch (e) {}
    }
    return false;
  }

  function clasificarPunto(idx, lng, lat) {
    if (enPoligono(idx.agua, lng, lat)) return 'agua';
    if (enPoligono(idx.bosque, lng, lat)) return 'bosque';
    if (enPoligono(idx.vegetacion_baja, lng, lat)) return 'vegetacion_baja';
    if (enPoligono(idx.edificio, lng, lat)) return 'edificio';
    if (enPoligono(idx.peatonal, lng, lat)) return 'peatonal';
    if (enPoligono(idx.asfalto, lng, lat)) return 'asfalto';
    if (enPoligono(idx.arena, lng, lat)) return 'arena';
    if (enPoligono(idx.roca, lng, lat)) return 'roca';
    if (enPoligono(idx.suelo_desnudo, lng, lat)) return 'suelo_desnudo';
    return 'urbano_generico';
  }

  // v4: la temperatura y la nubosidad llegan por el worker (/prevision),
  // que las sirve same-origin con caché edge. La respuesta trae la hora
  // actual y la previsión horaria (ayer, hoy y mañana) en unixtime, así
  // que la misma caché vale para pasado, presente y futuro cercano.
  async function obtenerPrevision() {
    const c = mapa.getCenter();
    const ahora = Date.now();
    const mismaZona = previsionCache.lat !== null &&
      Math.abs(previsionCache.lat - c.lat) < 0.25 && Math.abs(previsionCache.lon - c.lng) < 0.25;
    if (previsionCache.ts && mismaZona && ahora - previsionCache.ts < CACHE_TEMP_MS) {
      return previsionCache;
    }
    try {
      const r = await fetch(`/prevision?lat=${c.lat.toFixed(3)}&lon=${c.lng.toFixed(3)}`);
      if (!r.ok) throw new Error('prevision ' + r.status);
      const d = await r.json();
      const t = Number(d && d.current && d.current.temperature_2m);
      const horas = {};
      if (d && d.hourly && Array.isArray(d.hourly.time)) {
        const tt = d.hourly.temperature_2m || [], nn = d.hourly.cloudcover || [], hh = d.hourly.relative_humidity_2m || [];
        for (let i = 0; i < d.hourly.time.length; i++) {
          const temp = Number(tt[i]);
          if (!isFinite(temp)) continue;
          horas[Math.floor(Number(d.hourly.time[i]))] = {
            t: temp,
            n: Number(nn[i]),
            h: Number(hh[i])
          };
        }
      }
      if (!isFinite(t) && Object.keys(horas).length === 0) throw new Error('sin datos');
      previsionCache = {
        ts: ahora,
        lat: c.lat,
        lon: c.lng,
        actualT: isFinite(t) ? t : null,
        actualN: Number(d && d.current && d.current.cloudcover),
        actualH: Number(d && d.current && d.current.relative_humidity_2m),
        horas
      };
    } catch (e) { /* se sirve la caché que hubiera, aunque sea vieja */ }
    return previsionCache;
  }

  // Temperatura, nubosidad y humedad PARA LA HORA QUE MARCA EL RELOJ.
  // Si esa hora está en la previsión se usa su dato horario; si está
  // más lejos (solsticios, otro día) se cae a la temperatura actual
  // y la leyenda ya dice que todo esto es una estimación por modelo.
  function datosParaHora(horaMs) {
    const p = previsionCache;
    const celda = p.horas[Math.floor(horaMs / 3600000)];
    const nubesActuales = () => {
      if (isFinite(p.actualN)) return p.actualN;
      try { return (typeof window.manolitAireNubosidad === 'function') ? window.manolitAireNubosidad() : null; } catch (e) { return null; }
    };
    if (celda && isFinite(celda.t)) {
      return {
        t: celda.t,
        nubes: isFinite(celda.n) ? celda.n : nubesActuales(),
        humedad: isFinite(celda.h) ? celda.h : (isFinite(p.actualH) ? p.actualH : null)
      };
    }
    if (p.actualT !== null && isFinite(p.actualT)) {
      return { t: p.actualT, nubes: nubesActuales(), humedad: isFinite(p.actualH) ? p.actualH : null };
    }
    return null;
  }

  function obtenerHoraRelojMs() {
    try {
      if (typeof window.manolitAireHoraEfectiva === 'function') {
        const h = window.manolitAireHoraEfectiva();
        const ms = (h instanceof Date) ? h.getTime() : new Date(h).getTime();
        if (isFinite(ms)) return ms;
      }
    } catch (e) { /* reloj aún no listo */ }
    return Date.now();
  }

  // v4: offset efectivo de cada superficie = offset base corregido por
  // ALBEDO (solo calentamientos) y modulado por EVAPOTRANSPIRACIÓN
  // (solo superficies que enfrían evaporando, según la humedad del aire).
  function offsetEfectivo(tipo, humedad) {
    let base = (OFFSET_SUPERFICIE[tipo] !== undefined) ? OFFSET_SUPERFICIE[tipo] : OFFSET_SUPERFICIE.urbano_generico;
    if (base > 0) {
      const albedo = ALBEDO_SUPERFICIE[tipo] || ALBEDO_REF;
      base *= Math.pow(ALBEDO_REF / albedo, 0.5);
    }
    const et = ET_PESO[tipo] || 0;
    if (et > 0 && base !== 0) {
      const hr = isFinite(humedad) ? Math.max(0, Math.min(100, humedad)) : 50;
      base *= 1 - et * (1 - hr / 100) * 0.5;
    }
    return base;
  }

  // v4 INERCIA TÉRMICA, precalculada por material (coste por celda: cero).
  // La exposición solar de una hora cualquiera NO depende del punto del
  // mapa (el sol es el mismo para todo el viewport), así que para cada
  // material se suma una media exponencial hacia atrás:
  //     expo = (s0 * ahora + resto de horas pasadas) / peso total
  // donde s0 es el sol del instante (el único término que la sombra
  // actual puede atenuar) y "resto" es la memoria térmica del material.
  function precomputarExposicion(horaMs, p) {
    const tabla = {};
    const c = mapa.getCenter();
    const solDisponible = typeof SunCalc !== 'undefined';
    const nubesEn = (ms) => {
      const cel = p.horas[Math.floor(ms / 3600000)];
      if (cel && isFinite(cel.n)) return cel.n;
      if (isFinite(p.actualN)) return p.actualN;
      try { return (typeof window.manolitAireNubosidad === 'function') ? window.manolitAireNubosidad() : 0; } catch (e) { return 0; }
    };
    for (const tipo in OFFSET_SUPERFICIE) {
      const tau = TAU_HORAS[tipo] || 2;
      const pasos = Math.min(6, Math.max(2, Math.ceil(tau * 2)));
      let s0 = 0, resto = 0, peso = 0;
      for (let k = 0; k <= pasos; k++) {
        const ms = horaMs - k * 3600000;
        let s = 0;
        if (solDisponible) {
          try {
            const pos = SunCalc.getPosition(new Date(ms), c.lat, c.lng);
            if (pos && pos.altitude > 0) {
              s = Math.sin(pos.altitude);
              s *= 1 - Math.max(0, Math.min(100, nubesEn(ms))) / 100 * 0.75;
            }
          } catch (e) { s = 0; }
        } else {
          // Sin SunCalc (no debería pasar): comportamiento clásico.
          s = 1 - Math.max(0, Math.min(100, nubesEn(ms))) / 100 * 0.6;
        }
        const w = Math.exp(-k / tau);
        if (k === 0) s0 = s; else resto += w * s;
        peso += w;
      }
      tabla[tipo] = { s0, resto, peso: peso || 1 };
    }
    return tabla;
  }

  function colorPara(t, tMin, tMax) {
    const x = Math.max(0, Math.min(1, (t - tMin) / (tMax - tMin || 1)));
    const h = 220 - 220 * x; // 220° azul (fresco) -> 0° rojo (caliente)
    return `hsl(${h.toFixed(0)}, 85%, 55%)`;
  }

  const ceder = () => new Promise(r => setTimeout(r, 0));

  /* ---- ciclo principal: POR TANDAS y con aborto ---- */

  async function recalcular(espacial) {
    if (!activo || !mapa) return;
    // v4: con el reloj en el futuro TAMBIÉN se calcula (previsión horaria).
    const miVersion = ++versionCalculo;
    const horaMs = obtenerHoraRelojMs();

    // Ahorro: si solo se movió el slider y seguimos dentro del mismo
    // minuto solar, la imagen sería idéntica. El mapa movido (espacial)
    // siempre recalcula.
    const horaClave = Math.floor(horaMs / 60000);
    if (!espacial && horaClave === ultimaHoraClave) return;

    await obtenerPrevision();
    if (!activo || miVersion !== versionCalculo) return;
    const datosHora = datosParaHora(horaMs);
    if (datosHora === null) return;
    const tBase = datosHora.t;
    ultimaHoraClave = horaClave;

    const idx = construirIndiceSuperficie();
    const sombras = construirIndiceSombras();
    if (miVersion !== versionCalculo) return;

    // v4: exposición solar acumulada por material (inercia térmica).
    // Se calcula UNA vez para todo el viewport.
    const expoPorTipo = precomputarExposicion(horaMs, previsionCache);

    const canvas = document.getElementById('microclima-canvas');
    if (!canvas) return;
    // v4 DPR: la rejilla y las coordenadas se calculan en píxeles CSS
    // (lo que unproject entiende) y el canvas se dibuja escalado a los
    // píxeles físicos. En pantallas retina la capa queda alineada y fina.
    const lienzoMapa = mapa.getCanvas();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, lienzoMapa.clientWidth || Math.round(lienzoMapa.width / dpr));
    const h = Math.max(1, lienzoMapa.clientHeight || Math.round(lienzoMapa.height / dpr));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Pasada 1 (por tandas): temperatura por celda + rango para normalizar
    const celdas = [];
    let tMin = Infinity, tMax = -Infinity, fila = 0;
    for (let y = REJILLA_PX / 2; y < h; y += REJILLA_PX) {
      for (let x = REJILLA_PX / 2; x < w; x += REJILLA_PX) {
        const lngLat = mapa.unproject([x, y]);
        const tipo = clasificarPunto(idx, lngLat.lng, lngLat.lat);
        const E = expoPorTipo[tipo] || expoPorTipo.urbano_generico;
        const enSombra = enPoligono(sombras, lngLat.lng, lngLat.lat);
        // La sombra solo atenúa el aporte del INSTANTE (s0): lo que el
        // material acumuló durante las últimas horas se nota igualmente.
        const expo = (E.s0 * (enSombra ? FACTOR_SOMBRA : 1) + E.resto) / E.peso;
        const t = tBase + offsetEfectivo(tipo, datosHora.humedad) * expo;
        celdas.push({ x, y, t });
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
      }
      fila++;
      if (fila % FILAS_POR_TANDA === 0) {
        await ceder();                       // cede el hilo: la página respira
        if (miVersion !== versionCalculo) return; // el mapa se movió: aborta
      }
    }

    // Pasada 2: pintar (rápida, solo dibujo)
    const radio = REJILLA_PX * 0.72;
    for (const c of celdas) {
      ctx.fillStyle = colorPara(c.t, tMin, tMax);
      ctx.beginPath();
      ctx.arc(c.x, c.y, radio, 0, Math.PI * 2);
      ctx.fill();
    }
    if (miVersion !== versionCalculo) return;

    const coords = [
      mapa.unproject([0, 0]).toArray(),
      mapa.unproject([w, 0]).toArray(),
      mapa.unproject([w, h]).toArray(),
      mapa.unproject([0, h]).toArray()
    ];
    const url = canvas.toDataURL('image/png');
    const src = mapa.getSource('microclima');
    if (src) {
      src.updateImage({ url, coordinates: coords });
    } else {
      mapa.addSource('microclima', { type: 'image', url, coordinates: coords });
      let antesDe = null;
      try {
        const capas = mapa.getStyle().layers;
        const capaRef = capas.find(l => l.id === 'sombras-relleno' || l.id === 'edificios-3d' || l.id === 'building-3d');
        if (capaRef) antesDe = capaRef.id;
      } catch (e) {}
      mapa.addLayer({
        id: 'microclima-capa',
        type: 'raster',
        source: 'microclima',
        paint: { 'raster-opacity': 0.45, 'raster-fade-duration': 0 }
      }, antesDe || undefined);
    }
    actualizarLeyenda(tMin, tMax);
  }

  /* ---- leyenda: esquina inferior DERECHA, con botón de cerrar ---- */

  let notaVisible = false;
  // v3: la leyenda nace OCULTA, solo se ve si el usuario pulsa
  // el botón 🌡 (él decide cuándo verla; su elección se recuerda).
  let leyendaCerrada = true;
  try { leyendaCerrada = localStorage.getItem('manolito_microclima_leyenda') !== '1'; } catch (e) { /* sin almacenamiento */ }
  let ultimoRango = null;          // último {tMin, tMax} para redibujar al reabrir

  function pintarLeyendaAbierta(tMin, tMax) {
    const leyenda = document.getElementById('microclima-leyenda');
    if (!leyenda) return;
    leyenda.style.pointerEvents = 'auto';
    leyenda.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-weight:600;">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span>Microclima</span>' +
          '<button id="microclima-info-btn" aria-expanded="false" title="Qué es esta capa" ' +
          'style="pointer-events:auto;cursor:pointer;border:1px solid rgba(255,255,255,0.4);background:transparent;' +
          'color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;line-height:1;padding:0;">i</button>' +
        '</div>' +
        '<button id="microclima-cerrar-btn" title="Ocultar (la capa sigue activa en el mapa)" ' +
        'style="pointer-events:auto;cursor:pointer;border:none;background:transparent;color:#fff;' +
        'opacity:0.75;font-size:15px;line-height:1;padding:0 2px;">×</button>' +
      '</div>' +
      '<div style="height:7px;border-radius:4px;margin-top:4px;background:linear-gradient(90deg,hsl(220,85%,55%),hsl(120,85%,55%),hsl(60,85%,55%),hsl(0,85%,55%));"></div>' +
      `<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px;"><span>${tMin.toFixed(0)}°C</span><span>${tMax.toFixed(0)}°C</span></div>` +
      '<div id="microclima-nota" style="display:' + (notaVisible ? 'block' : 'none') + ';font-size:9px;opacity:0.75;margin-top:3px;line-height:1.25;">' +
        'Estimación por modelo (superficie, sombra e inercia térmica), no una medición por satélite. Con el reloj en el futuro se usa la previsión horaria de Open-Meteo.' +
      '</div>' +
      (esFuturo
        ? '<div style="color:#ffd27a;font-size:9px;margin-top:3px;line-height:1.25;">Previsión por horas. Cuanto más lejos esté la hora marcada, menos precisa será.</div>'
        : '');

    const btnInfo = document.getElementById('microclima-info-btn');
    if (btnInfo) {
      btnInfo.addEventListener('click', (ev) => {
        ev.stopPropagation();
        notaVisible = !notaVisible;
        const nota = document.getElementById('microclima-nota');
        if (nota) nota.style.display = notaVisible ? 'block' : 'none';
        btnInfo.setAttribute('aria-expanded', notaVisible ? 'true' : 'false');
      });
    }
    const btnCerrar = document.getElementById('microclima-cerrar-btn');
    if (btnCerrar) {
      btnCerrar.addEventListener('click', (ev) => {
        ev.stopPropagation();
        leyendaCerrada = true;
        try { localStorage.setItem('manolito_microclima_leyenda', '0'); } catch (e) {}
        pintarLeyendaCerrada();
      });
    }
  }

  function pintarLeyendaCerrada() {
    const leyenda = document.getElementById('microclima-leyenda');
    if (!leyenda) return;
    leyenda.style.width = 'auto';
    leyenda.style.padding = '0';
    leyenda.style.background = 'transparent';
    leyenda.style.backdropFilter = 'none';
    leyenda.style.pointerEvents = 'auto';
    leyenda.innerHTML =
      '<button id="microclima-reabrir-btn" title="Mostrar leyenda de microclima" ' +
      'style="pointer-events:auto;cursor:pointer;border:1px solid rgba(255,255,255,0.4);' +
      'background:rgba(10,15,25,0.82);color:#fff;border-radius:50%;width:28px;height:28px;' +
      'font-size:14px;line-height:1;backdrop-filter:blur(4px);">🌡</button>';
    const btn = document.getElementById('microclima-reabrir-btn');
    if (btn) {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        leyendaCerrada = false;
        try { localStorage.setItem('manolito_microclima_leyenda', '1'); } catch (e) {}
        leyenda.style.width = '150px';
        leyenda.style.padding = '7px 9px';
        leyenda.style.background = 'rgba(10,15,25,0.82)';
        leyenda.style.backdropFilter = 'blur(4px)';
        if (ultimoRango) pintarLeyendaAbierta(ultimoRango.tMin, ultimoRango.tMax);
      });
    }
  }

  function actualizarLeyenda(tMin, tMax) {
    const leyenda = document.getElementById('microclima-leyenda');
    if (!leyenda) return;
    leyenda.style.display = 'block';
    ultimoRango = { tMin, tMax };
    if (leyendaCerrada) {
      pintarLeyendaCerrada();
    } else {
      pintarLeyendaAbierta(tMin, tMax);
    }
  }

  function crearLeyenda() {
    if (document.getElementById('microclima-leyenda')) return;
    const wrap = document.querySelector('.map-wrap') || document.body;
    const div = document.createElement('div');
    div.id = 'microclima-leyenda';
    // Esquina inferior DERECHA (antes izquierda: tapaba la barra de horarios/ruta)
    div.style.cssText = 'display:none;position:absolute;right:10px;bottom:10px;z-index:5;width:150px;' +
      'background:rgba(10,15,25,0.82);color:#fff;padding:7px 9px;border-radius:10px;' +
      'font-family:inherit;font-size:11px;pointer-events:auto;backdrop-filter:blur(4px);';
    wrap.appendChild(div);
    if (!document.getElementById('microclima-canvas')) {
      const lienzo = document.createElement('canvas');
      lienzo.id = 'microclima-canvas';
      lienzo.style.display = 'none';
      document.body.appendChild(lienzo);
    }
  }

  /* ---- sincronización con el reloj solar: pasado, presente y FUTURO ----
     v4: la capa ya no se oculta al mirar adelante. Con el reloj en pasado
     o presente usa la meteorología actual y las horas ya pasadas de la
     previsión; con el reloj en el futuro usa la previsión horaria de
     Open-Meteo y la leyenda lo dice claramente. La variable esFuturo
     solo decide qué aviso muestra la leyenda y cuándo conviene
     recalcular (al cruzar la frontera cambia la fuente de datos). */
  let esFuturo = false;
  let temporizadorReloj = null;

  function horaEsFutura() {
    try {
      if (typeof window.manolitAireHoraEfectiva !== 'function') return false;
      const h = window.manolitAireHoraEfectiva();
      const ms = (h instanceof Date) ? h.getTime() : new Date(h).getTime();
      if (!isFinite(ms)) return false;
      return ms > Date.now() + 5 * 60 * 1000; // margen de 5 minutos
    } catch (e) { return false; }
  }

  function aplicarVisibilidadPorReloj() {
    // v4: la capa permanece visible siempre que esté encendida; aquí solo
    // se repinta la leyenda para que el aviso de "previsión" aparezca o
    // desaparezca según la hora marcada.
    if (!leyendaCerrada && ultimoRango) pintarLeyendaAbierta(ultimoRango.tMin, ultimoRango.tMax);
  }

  function sincronizarConRelojSolar() {
    // Ahorro de batería (sep-2026, ADITIVO): con la pestaña oculta no hay
    // nada que sincronizar, el intervalo de 2 s seguía despertando el hilo
    // principal sin nadie mirando. Al volver a la pestaña, el siguiente tic
    // (máx. 2 s) retoma la sincronización exactamente donde iba.
    if (document.hidden) return;
    const futuro = horaEsFutura();
    if (futuro === esFuturo) return;
    esFuturo = futuro;
    aplicarVisibilidadPorReloj();
    // Al cruzar la frontera (en cualquier dirección) cambia la fuente de
    // datos: se recalcula para que el cambio se note al momento.
    if (activo) recalcular(true);
  }

  function encender() {
    activo = true;
    // v3: NO se fuerza la leyenda abierta, queda como la dejara
    // el usuario la última vez (por defecto, oculta: solo el 🌡).
    crearLeyenda();
    esFuturo = horaEsFutura();
    aplicarVisibilidadPorReloj();
    clearInterval(temporizadorReloj);
    temporizadorReloj = setInterval(sincronizarConRelojSolar, 2000);
    recalcular(true);
  }

  function apagar() {
    activo = false;
    versionCalculo++; // aborta cualquier cálculo en curso
    clearTimeout(temporizador);
    clearInterval(temporizadorReloj);
    esFuturo = false;
    ultimaHoraClave = -1;
    try { if (mapa.getLayer('microclima-capa')) mapa.removeLayer('microclima-capa'); } catch (e) {}
    try { if (mapa.getSource('microclima')) mapa.removeSource('microclima'); } catch (e) {}
    const leyenda = document.getElementById('microclima-leyenda');
    if (leyenda) leyenda.style.display = 'none';
  }

  // Dos caminos hacia el mismo recálculo: mover el mapa siempre manda
  // (cambia la superficie visible); mover el reloj solo recalcula si
  // el minuto solar cambió de verdad (arrastrar el slider ya no
  // repinta la misma imagen veinte veces).
  function programar(espacial) {
    if (!activo) return;
    versionCalculo++; // el cálculo anterior muere aquí
    clearTimeout(temporizador);
    temporizador = setTimeout(() => recalcular(espacial), DEBOUNCE_MS);
  }

  function alMoverse() { programar(true); }
  function alTocarReloj() { programar(false); }

  /* ---- arranque: espera a que el mapa de sombras exista ---- */
  function iniciar() {
    mapa = window.manolitAireMap;
    if (!mapa || typeof turf === 'undefined') { setTimeout(iniciar, 500); return; }
    const toggle = document.getElementById('rsToggleMicroclima');
    if (!toggle) { setTimeout(iniciar, 500); return; }

    toggle.addEventListener('change', () => (toggle.checked ? encender() : apagar()));
    mapa.on('moveend', alMoverse);
    const slider = document.getElementById('rsHoraSlider') || document.querySelector('input[type="range"]');
    if (slider) slider.addEventListener('input', alTocarReloj);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
