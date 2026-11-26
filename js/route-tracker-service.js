/* ============================================================================
   ROUTE TRACKER SERVICE — Manolit∞ (nov-2026)

   Motor de seguimiento de ruta pedido en el brief de Manolito. Sincroniza TRES
   variables a la vez mientras te mueves:

     1) el avance GPS (distancia acumulada real, Haversine),
     2) el tiempo transcurrido (y, con él, el reloj del mapa de sombras: el sol
        se mueve mientras viajas, así que cada checkpoint reajusta la hora
        efectiva del simulador),
     3) el objetivo del usuario (buscar sombra, buscar sol o localizar fuentes
        de agua).

   Umbrales de análisis por transporte:
     - caminar : cada 100 m
     - bici    : cada 1500 m (1,5 km)
     - coche   : DESACTIVADO por defecto; solo se activa si el usuario pide
                 explícitamente «buscar sombra» en coche (o pregunta por la
                 sombra de su avance en el chat).

   En cada checkpoint emite un evento telemétrico SILENCIOSO:
     document.dispatchEvent(new CustomEvent('manolito:checkpoint', {detail}))
   con la comparativa estado_anterior vs estado_actual, distancia acumulada,
   tiempo transcurrido y fuentes de agua cercanas (si la capa está activa).
   Lo consume js/chat.js para turnos proactivos de Manolito (si el chat está
   abierto), y cualquiera que escuche el evento.

   REGLAS DURAS (no romper nada):
     - Solo se activa si alguien lo pide (UI, chat o el usuario). No arranca
       GPS por su cuenta ni pide permisos sin una orden explícita.
     - watchPosition con un solo ID, siempre clearWatch al parar.
     - El callback del GPS NO toca el DOM: solo acumula y, como mucho, dispara
       el trabajo pesado fuera del callback.
     - Toda punta externa va en try/catch. Sin el mapa/sombras cargados, el
       servicio arranca igual y simplemente no aporta lectura de sombra.
     - Aditivo: no modifica nada existente; sin cargar este archivo todo
       sigue funcionando exactamente igual.
   ========================================================================== */
(function () {
  'use strict';
  if (window.ManolitRouteTracker) return; // doble carga: jamás

  var D2R = Math.PI / 180;

  /* ---------------------------------------------------------------------
     Distancia Haversine (metros) entre dos puntos {lat, lon}.
     --------------------------------------------------------------------- */
  function haversineM(a, b) {
    if (!a || !b) return 0;
    var lat1 = Number(a.lat) * D2R;
    var lat2 = Number(b.lat) * D2R;
    var dLat = lat2 - lat1;
    var dLon = (Number(b.lon) - Number(a.lon)) * D2R;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  /* ---------------------------------------------------------------------
     Umbrales por modo. 'car' trabaja en modo pasivo: off por defecto.
     --------------------------------------------------------------------- */
  var UMBRALES = { caminar: 100, bici: 1500, coche: 0 };
  var UMBRAL_COCHE_CON_SOMBRA = 0; // coche: nunca automático (solo avance a petición)
  var MODOS_VALIDOS = ['caminar', 'bici', 'coche'];

  /* ---------------------------------------------------------------------
     Estado del servicio.
     --------------------------------------------------------------------- */
  var S = {
    activo: false,
    modo: 'caminar',
    objetivo: 'sombra',      // 'sombra' | 'sol' | 'agua'
    inicio: null,            // {lat, lon, ts}
    ultimo: null,            // {lat, lon, ts}
    horaBase: null,          // hora solar efectiva al salir (el reloj del viaje)
    distanciaM: 0,           // distancia acumulada real
    distanciaHastaCheckpoint: 0,
    checkpoints: 0,
    pausa: null,             // 'manual' mientras el usuario simula la hora
    estadoAnterior: null,    // {haySol, sombraPct, fuentes, lat, lon, ts, hora}
    ultimoCheckpointTs: 0,
    ultimoError: null,
    avisoIA: true            // el chat dispara turnos proactivos si está abierto
  };

  function ahora() { return Date.now(); }

  function modoUmbral() {
    if (S.modo === 'coche') {
      // No avisamos automáticamente en coche, aunque el usuario busque
      // sombra. Solo una petición puntual explícita al chat habilita un
      // análisis único del avance (no un seguimiento periódico al conducir).
      return 0;
    }
    return UMBRALES[S.modo] || 100;
  }

  function objetivoValido(objetivo) {
    return objetivo === 'sombra' || objetivo === 'sol' || objetivo === 'agua';
  }

  function posicionActualDesdeApp() {
    try {
      var p = window.__manolitUltimaPos;
      if (p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))) {
        return { lat: Number(p.lat), lon: Number(p.lon), ts: Number(p.ts) || ahora() };
      }
    } catch (e) { }
    return null;
  }

  function siActivo() { return S.activo === true; }

  function tiempoTranscurridoMs() {
    return S.inicio ? Math.max(0, ahora() - S.inicio.ts) : 0;
  }

  function tiempoSimuladorDeTrayecto() {
    // El reloj del mapa arranca en la hora solar efectiva justo al iniciar
    // el seguimiento y avanza con tiempo REAL transcurrido (no con la hora
    // registrada por el último checkpoint, que puede llegar con retraso).
    var base = S.horaBase;
    return base instanceof Date && !isNaN(base.getTime())
      ? new Date(base.getTime() + tiempoTranscurridoMs())
      : new Date();
  }

  /* ---------------------------------------------------------------------
     Lectura de estado en un punto. Todo best-effort: si el motor de sombras
     o SunCalc no están cargados, devuelve nulls honestos, nunca inventa.
     --------------------------------------------------------------------- */
  function haySolEn(lat, lon, fecha) {
    try {
      if (typeof window.manolitHaySol === 'function') {
        var realTime = window.manolitHaySol(lat, lon, fecha || undefined);
        if (realTime != null) return realTime;
      }
      if (typeof SunCalc !== 'undefined' && SunCalc.getPosition) {
        var t = fecha || horaEfectiva();
        return SunCalc.getPosition(t, lat, lon).altitude > 0;
      }
    } catch (e) { /* sin sol: se queda null */ }
    return null;
  }

  // % de sombra puntual: edificios + árboles. Usa las geometrías que ya tiene
  // el mapa en escena (no recalcula nada). turfs "booleanPointInPolygon" está
  // disponible porque shadows-route carga turf; si no, se resume a árboles.
  function sombraPuntualPct(lat, lon) {
    var lng = lon;
    var punto = null;
    try {
      punto = typeof turf !== 'undefined' ? turf.point([lng, lat]) : null;
    } catch (e) { punto = null; }
    var enSombra = false;
    var hayFuenteSombra = false;
    function revisar(fuente, filtroProps) {
      try {
        var src = window.manolitAireMap && window.manolitAireMap.getSource(fuente);
        var datos = src && (src._data || (src.serialize && src.serialize().data));
        if (!datos || !datos.features) return;
        for (var i = 0; i < datos.features.length; i++) {
          var f = datos.features[i];
          if (!f || !f.geometry) continue;
          if (filtroProps && !filtroProps(f.properties || {})) continue;
          hayFuenteSombra = true;
          if (punto && turf && typeof turf.booleanPointInPolygon === 'function') {
            try {
              if (turf.booleanPointInPolygon(punto, f)) { enSombra = true; return; }
            } catch (e2) { /* geometría rara: seguimos */ }
          }
        }
      } catch (e3) { /* capa ausente: nada */ }
    }
    revisar('sombras');
    revisar('arboles-globales-sombra');
    if (!hayFuenteSombra) return null;
    return enSombra ? 100 : 0;
  }

  function horaEfectiva() {
    // Durante un trayecto la hora del viaje manda: es la hora real de salida
    // + el tiempo realmente transcurrido (el sol se mueve mientras andas).
    if (S.activo && S.horaBase && S.pausa !== 'manual') return tiempoSimuladorDeTrayecto();
    try {
      if (typeof window.manolitAireHoraEfectiva === 'function') return window.manolitAireHoraEfectiva();
    } catch (e) { }
    return new Date();
  }

  /* ---------------------------------------------------------------------
     Pausa/reanuda el avance cuando el usuario pide una hora a mano.
     Tu posición se sigue leyendo, pero el reloj del viaje deja de mandar
     para no pisar lo que el usuario acaba de pedir.
     --------------------------------------------------------------------- */
  function pausar(motivo) {
    if (!S.activo) return false;
    S.pausa = motivo || 'manual';
    return true;
  }

  function reanudar() {
    if (!S.activo || S.pausa !== 'manual') return false;
    S.pausa = null;
    S.horaBase = new Date();
    S.distanciaHastaCheckpoint = 0;
    if (S.ultimo) S.ultimo = { lat: S.ultimo.lat, lon: S.ultimo.lon, ts: ahora() };
    return true;
  }

  /* ---------------------------------------------------------------------
     Fuente de agua más cercana a un punto. Solo si la capa de fuentes está
     activa y su API pública existe; devuelve null en caso contrario (no
     dispara descargas que el usuario no haya pedido).
     --------------------------------------------------------------------- */
  function fuentesCercanas(lat, lon) {
    var toggle = document.getElementById('rsToggleFuentesAgua');
    if (!toggle || !toggle.checked) return Promise.resolve(null);
    if (typeof window.manolitAireBuscarFuenteAguaCercana !== 'function') return Promise.resolve(null);
    try {
      return Promise.resolve(window.manolitAireBuscarFuenteAguaCercana({ lat: lat, lon: lon }))
        .then(function (f) {
          if (!f) return null;
          return {
            nombre: f.nombre || f.tipo || 'Fuente pública de agua',
            distanciaM: Number(f.distanciaMetros) || Math.round(haversineM({ lat: lat, lon: lon }, f)),
            potable: f.potable === true
          };
        })
        .catch(function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  /* ---------------------------------------------------------------------
     Sincroniza el reloj del simulador de sombras con la hora real de avance.
     El tracker lleva su PROPIA marca de tiempo solar (horaBase + tiempo real
     de trayecto) y se la pasa al motor de sombras como hora de cálculo. No
     mueve el slider ni el modo manual del usuario: solo repinta las sombras
     con la hora del viaje. Si el usuario pide una hora a mano, `pausar()`
     corta esta sincronización hasta que vuelva a la hora real.
     --------------------------------------------------------------------- */
  function sincronizarRelojSolar() {
    try {
      if (S.pausa === 'manual') return;      // el usuario manda: no le pisamos la hora
      var fecha = horaEfectiva();
      // Puente del reloj del viaje: fija la hora REAL del trayecto (fecha
      // absoluta incluida) y repinta sombras/árboles/luz por la cadena única
      // del motor. Ojo: manolitAireRecalcularSombras() no acepta argumentos,
      // así que aquí nunca se le pasa la fecha (se ignoraría sin avisar).
      if (typeof window.manolitAireFijarHoraEfectiva === 'function') {
        window.manolitAireFijarHoraEfectiva(fecha);
        return;
      }
      if (typeof window.manolitAireRecalcularSombras === 'function') {
        window.manolitAireRecalcularSombras();
      }
    } catch (e) { /* nunca rompe el seguimiento */ }
  }

  /* ---------------------------------------------------------------------
     Envío del evento telemétrico al chat (proactivo y contextual).
     --------------------------------------------------------------------- */
  function entregarAviso(detalle) {
    document.dispatchEvent(new CustomEvent('manolito:checkpoint', { detail: detalle }));
    // Si el chat está abierto, encarga el turno proactivo del LLM.
    if (S.avisoIA && typeof window.manolitAireAvisoRuta === 'function') {
      try {
        window.manolitAireAvisoRuta(detalle);
      } catch (e) { /* si el chat no está listo, el evento sigue siendo válido */ }
    }
  }

  /* ---------------------------------------------------------------------
     Comparativa y aviso de checkpoint.
     --------------------------------------------------------------------- */
  function checkpoint(pos, estadoActual) {
    var anterior = S.estadoAnterior;
    var minutos = S.inicio ? Math.max(0, Math.round((ahora() - S.inicio.ts) / 60000)) : 0;
    var detalle = {
      tipo: 'checkpoint',
      modo: S.modo,
      objetivo: S.objetivo,
      numero: ++S.checkpoints,
      distanciaAcumuladaM: Math.round(S.distanciaM),
      distanciaAcumuladaKm: +(S.distanciaM / 1000).toFixed(2),
      tiempoTranscurridoMin: minutos,
      hora: horaEfectiva().toISOString(),
      posicion: { lat: pos.lat, lon: pos.lon },
      anterior: anterior,
      actual: estadoActual,
      cambio: {
        sombra: anterior && estadoActual && anterior.sombraPct != null && estadoActual.sombraPct != null
          ? estadoActual.sombraPct - anterior.sombraPct : null,
        solAhora: estadoActual ? estadoActual.haySol : null,
        solAntes: anterior ? anterior.haySol : null
      },
      fuentesCercanas: estadoActual ? estadoActual.fuentes : null
    };
    S.estadoAnterior = estadoActual;
    S.ultimoCheckpointTs = ahora();
    entregarAviso(detalle);
    return detalle;
  }

  // Reutiliza el GPS que la app YA tiene encendido (caminata, «Mi ubicación»,
  // lectura calibrada): así nunca se abre un segundo watchPosition ni se
  // duplica el consumo de radio. Solo se abre uno propio si nadie más lee
  // posiciones (por eso el tracker está disponible desde ya pero inerte).
  var enganchado = null;

  function posicionApp() {
    try {
      var p = window.__manolitUltimaPos;
      if (p && isFinite(p.lat) && isFinite(p.lon)) {
        return { lat: Number(p.lat), lon: Number(p.lon), ts: Number(p.ts) || ahora() };
      }
    } catch (e) { /* aún sin posición conocida */ }
    return null;
  }

  function procesarApp(pos) {
    if (!siActivo() || !pos) return;
    var ultimo = S.ultimo;
    // La posición global también la mueven el punto marcado a mano o una
    // lectura vieja en caché: sin filtro, eso inventaría kilómetros.
    if (ultimo && pos.ts && ultimo.ts && pos.ts < ultimo.ts + 500) return;
    procesarPunto(pos.lat, pos.lon, pos.ts);
  }

  function enganchar() {
    if (enganchado) return;
    enganchado = function (ev) {
      var d = ev && ev.detail;
      if (d && isFinite(d.lat) && isFinite(d.lon)) {
        procesarApp({ lat: Number(d.lat), lon: Number(d.lon), ts: Date.now() });
      } else {
        procesarApp(posicionApp());
      }
    };
    try { document.addEventListener('manolitUbicacionNueva', enganchado); } catch (e) { }
  }

  function desenganchar() {
    if (!enganchado) return;
    try { document.removeEventListener('manolitUbicacionNueva', enganchado); } catch (e) { }
    enganchado = null;
  }

  /* ---------------------------------------------------------------------
     Procesa un punto {lat, lon, ts}. Acumula distancia y lanza checkpoint
     cuando toca. Nada de DOM aquí: el trabajo pesado va fuera.
     --------------------------------------------------------------------- */
  function procesarPunto(latNum, lonNum, tsNum) {
    try {
      if (S.pausa === 'manual') return;
      var punto = { lat: latNum, lon: lonNum, ts: tsNum || ahora() };
      if (!S.inicio) {
        S.inicio = punto;
        S.ultimo = punto;
      } else {
        var delta = haversineM(S.ultimo, punto);
        // Filtro antiparpadeo: saltos < 2 m son ruido; > 300 m se ignoran
        // salvo que el tiempo transcurrido los justifique (coche).
        var seg = Math.max(1, (punto.ts - (S.ultimo.ts || punto.ts)) / 1000);
        var maximoSalto = Math.max(300, seg * 40); // 40 m/s ≈ 144 km/h
        if (delta >= 2 && delta <= maximoSalto) {
          S.distanciaM += delta;
          S.distanciaHastaCheckpoint += delta;
          S.ultimo = punto;
        }
      }

      var umbral = modoUmbral();
      if (umbral > 0 && S.distanciaHastaCheckpoint >= umbral) {
        var desde = S.distanciaHastaCheckpoint;
        S.distanciaHastaCheckpoint = 0;
        setTimeout(function () { dispararCheckpoint(punto, desde); }, 0);
      }
    } catch (e) { S.ultimoError = String(e && e.message || e); }
  }

  // Entrada directa por si algún día otro módulo quiere pasar una lectura.
  function procesarLectura(pos) {
    try {
      if (!pos || !pos.coords) return;
      procesarPunto(Number(pos.coords.latitude), Number(pos.coords.longitude), pos.timestamp || ahora());
    } catch (e) { S.ultimoError = String(e && e.message || e); }
  }

  function dispararCheckpoint(pos, _desdeM) {
    var estadoActual = {
      lat: pos.lat,
      lon: pos.lon,
      ts: pos.ts,
      hora: horaEfectiva().toISOString(),
      haySol: haySolEn(pos.lat, pos.lon),
      sombraPct: sombraPuntualPct(pos.lat, pos.lon),
      fuentes: null
    };
    // 1) Sincroniza el reloj solar con la hora real del viaje.
    sincronizarRelojSolar();
    // 2) Fuentes de agua (si la capa está activa) y 3) entrega del aviso.
    fuentesCercanas(pos.lat, pos.lon).then(function (f) {
      estadoActual.fuentes = f;
      checkpoint(pos, estadoActual);
    });
  }

  /* ---------------------------------------------------------------------
     API pública.
     --------------------------------------------------------------------- */
  function iniciar(opciones) {
    opciones = opciones || {};
    if (S.activo) parar();
    if (!('geolocation' in navigator)) {
      return { ok: false, motivo: 'sin-geolocalizacion' };
    }
    var modo = MODOS_VALIDOS.indexOf(opciones.modo) >= 0 ? opciones.modo : 'caminar';
    S.activo = true;
    S.modo = modo;
    S.objetivo = objetivoValido(opciones.objetivo) ? opciones.objetivo : 'sombra';
    S.pausa = null;
    S.inicio = null;
    S.ultimo = null;
    S.horaBase = horaEfectiva();            // reloj solar: hora real de salida
    S.distanciaM = 0;
    S.distanciaHastaCheckpoint = 0;
    S.checkpoints = 0;
    S.estadoAnterior = null;
    S.ultimoError = null;

    // 1) Semilla: si la app ya conoce tu posición, el trayecto arranca ahí.
    var p = posicionApp();
    if (p) { S.inicio = { lat: p.lat, lon: p.lon, ts: ahora() }; S.ultimo = S.inicio; }

    // 2) GPS: NO se abre uno nuevo. Se reutiliza el de la app (caminata,
    // «Mi ubicación», lectura calibrada) por su evento público. Abrir otro
    // watchPosition duplicaría el consumo de radio de un móvil que ya
    // camina. Si no hay nadie leyendo posiciones, el servicio sigue
    // disponible pero inerte (sin avisos inventados).
    enganchar();

    document.dispatchEvent(new CustomEvent('manolito:ruta-iniciada', {
      detail: { modo: S.modo, objetivo: S.objetivo, umbralM: modoUmbral() }
    }));
    return { ok: true, modo: S.modo, objetivo: S.objetivo, umbralM: modoUmbral() };
  }

  function parar() {
    desenganchar();
    S.pausa = null;
    var estaba = S.activo;
    S.activo = false;
    if (estaba) {
      document.dispatchEvent(new CustomEvent('manolito:ruta-parada', {
        detail: {
          modo: S.modo,
          distanciaAcumuladaM: Math.round(S.distanciaM),
          checkpoints: S.checkpoints
        }
      }));
    }
    return { ok: true, distanciaAcumuladaM: Math.round(S.distanciaM), checkpoints: S.checkpoints };
  }

  function cambiarModo(modo) {
    if (MODOS_VALIDOS.indexOf(modo) < 0) return false;
    S.modo = modo;
    S.distanciaHastaCheckpoint = 0;
    return true;
  }

  function cambiarObjetivo(objetivo) {
    if (['sombra', 'sol', 'agua'].indexOf(objetivo) < 0) return false;
    S.objetivo = objetivo;
    return true;
  }

  function estado() {
    return {
      activo: S.activo,
      modo: S.modo,
      objetivo: S.objetivo,
      umbralM: modoUmbral(),
      distanciaAcumuladaM: Math.round(S.distanciaM),
      distanciaAcumuladaKm: +(S.distanciaM / 1000).toFixed(2),
      tiempoTranscurridoMin: S.inicio ? Math.max(0, Math.round((ahora() - S.inicio.ts) / 60000)) : 0,
      checkpoints: S.checkpoints,
      ultimoError: S.ultimoError
    };
  }

  /* ---------------------------------------------------------------------
     Análisis puntual a petición (modo coche): una sola foto del avance,
     sin activar ningún aviso periódico. Sirve para «¿cómo está la sombra
     en mi avance?» preguntado por el chat.
     --------------------------------------------------------------------- */
  function analizarAhora() {
    var p = posicionApp();
    if (!p) {
      try {
        var c = window.manolitAireMap && window.manolitAireMap.getCenter();
        if (c) p = { lat: c.lat, lon: c.lng, ts: ahora() };
      } catch (e) { }
    }
    if (!p) return Promise.resolve({ ok: false, motivo: 'sin-posicion' });
    var estadoActual = {
      lat: p.lat,
      lon: p.lon,
      ts: p.ts,
      hora: horaEfectiva().toISOString(),
      haySol: haySolEn(p.lat, p.lon),
      sombraPct: sombraPuntualPct(p.lat, p.lon),
      fuentes: null
    };
    sincronizarRelojSolar();
    return fuentesCercanas(p.lat, p.lon).then(function (f) {
      estadoActual.fuentes = f;
      return {
        ok: true,
        modo: S.modo,
        objetivo: S.objetivo,
        activo: S.activo,
        distanciaAcumuladaKm: +(S.distanciaM / 1000).toFixed(2),
        tiempoTranscurridoMin: Math.round(tiempoTranscurridoMs() / 60000),
        actual: estadoActual
      };
    });
  }

  /* Persistencia mínima del modo: la UI y el chat comparten el mismo servicio. */
  window.ManolitRouteTracker = {
    UMBRALES: { caminar: 100, bici: 1500, coche: 0, cocheConSombra: UMBRAL_COCHE_CON_SOMBRA },
    iniciar: iniciar,
    parar: parar,
    cambiarModo: cambiarModo,
    cambiarObjetivo: cambiarObjetivo,
    estado: estado,
    analizarAhora: analizarAhora,
    pausar: pausar,
    reanudar: reanudar,
    // Utilidades expuestas para tests y para el chat.
    haversineM: haversineM,
    haySolEn: haySolEn,
    sombraPuntualPct: sombraPuntualPct,
    fuentesCercanas: fuentesCercanas
  };
})();
