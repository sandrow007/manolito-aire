/* ============================================================
   MANOLITO AIRE — Ruta real + Sombras 3D reales + AQI (origen)
   Stack: MapLibre GL JS (edificios 3D + capas) + SunCalc (sol)
   + Turf.js (geometría de sombra) + OSRM (ruta por calles)

   v2 — añade: slider de tiempo (hoy / solsticios), vuelo de
   entrada cinemático, botón de captura de imagen, sombras por
   volumen de barrido real (no aproximación por envolvente
   convexa), halo de "feather" en el borde de la sombra, aviso
   de hora dorada/azul, caché de edificios (el slider no vuelve
   a consultar el mapa en cada movimiento) y navegación por
   teclado en las sugerencias de dirección.
   ============================================================ */

'use strict';

(function () {
  const CONFIG = {
    centroInicial: [-5.9845, 37.3891], // [lon, lat] Sevilla
    zoomInicial: 15.5,
    pitchInicial: 55,
    bearingInicial: -15,
    nominatimUrl: 'https://nominatim.openstreetmap.org/search',
    osrmUrl: 'https://router.project-osrm.org/route/v1',
    airQualityUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty', // vector tiles gratis, sin key
    edificiosLayerId: 'building-3d',
    fetchTimeoutMs: 9000,
    fetchRetries: 2,
    alturaPorDefectoM: 9, // si un edificio no trae altura en los datos OSM
    maxEdificiosSombra: 220, // límite de seguridad para no colgar el navegador
    loteSombraSize: 30, // nº de edificios que se procesan antes de ceder el hilo al navegador
    duracionVueloInicialMs: 2000,
  };

  function leerVar(nombre) {
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  }

  // Pequeña espera para dejar respirar al hilo principal entre lotes de
  // cálculo pesado — así el mapa no se queda "pillado" al hacer zoom.
  function cederAlNavegador() {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 120 });
      else setTimeout(resolve, 0);
    });
  }

  function crearDebounce(fn, esperaMs) {
    let temporizador = null;
    return (...args) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => fn(...args), esperaMs);
    };
  }

  const mapEl = document.getElementById('shadowRouteMap');
  if (!mapEl) return;

  // El panel de controles se inyecta encima del mapa: nos aseguramos
  // de que el contenedor padre pueda alojar un overlay posicionado.
  const contenedorMapa = mapEl.parentElement || mapEl;
  if (getComputedStyle(contenedorMapa).position === 'static') {
    contenedorMapa.style.position = 'relative';
  }

  /* ---------------- Mapa MapLibre con edificios 3D reales ---------------- */
  // Arrancamos con la cámara "recogida" (menos zoom, sin inclinación) y
  // volamos hasta la posición final una vez cargado el estilo — vuelo de
  // entrada de 2s en vez de aparecer ya posicionado.

  const map = new maplibregl.Map({
    container: 'shadowRouteMap',
    style: CONFIG.styleUrl,
    center: CONFIG.centroInicial,
    zoom: Math.max(CONFIG.zoomInicial - 2.3, 1),
    pitch: 0,
    bearing: 0,
    attributionControl: true,
    preserveDrawingBuffer: true, // necesario para poder exportar la vista como imagen
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

  let capaEdificiosDisponible = false;
  let edificiosCacheados = []; // se refresca al cargar y al mover el mapa; el slider de tiempo NO vuelve a consultarlo

  map.on('load', () => {
    // El estilo "liberty" de OpenFreeMap ya trae edificios en 3D (fill-extrusion).
    // Detectamos su id real por si cambia de nombre entre versiones del estilo.
    const capas = map.getStyle().layers || [];
    const capaEdificios = capas.find(
      (l) => l.type === 'fill-extrusion' && /building/i.test(l.id)
    );
    if (capaEdificios) {
      CONFIG.edificiosLayerId = capaEdificios.id;
      capaEdificiosDisponible = true;
    }

    // Fuente + capa de HALO (feather): sombra "difuminada" por debajo de la sombra nítida
    map.addSource('sombras-halo', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer(
      {
        id: 'capa-sombras-halo',
        type: 'fill',
        source: 'sombras-halo',
        paint: { 'fill-color': '#0b1220', 'fill-opacity': 0.10 },
      },
      capaEdificiosDisponible ? CONFIG.edificiosLayerId : undefined
    );

    // Fuente + capa de sombra nítida
    map.addSource('sombras', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer(
      {
        id: 'capa-sombras',
        type: 'fill',
        source: 'sombras',
        paint: { 'fill-color': '#0b1220', 'fill-opacity': 0.28 },
      },
      capaEdificiosDisponible ? CONFIG.edificiosLayerId : undefined // por debajo de los edificios
    );

    map.addSource('ruta', { type: 'geojson', data: turf.featureCollection([]) });
    map.addLayer({
      id: 'capa-ruta',
      type: 'line',
      source: 'ruta',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': leerVar('--accent') || '#F4A66B', 'line-width': 5, 'line-opacity': 0.9 },
    });

    // Capa de cielo nativa de MapLibre: oculta hasta que se active el toggle del sol
    map.addLayer({
      id: 'cielo-sol',
      type: 'sky',
      layout: { visibility: 'none' },
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0, 90],
        'sky-atmosphere-sun-intensity': 8,
      },
    });

    inyectarControlesTiempo();
    actualizarCacheEdificios();
    recalcularSombrasVisibles();
    conectarTogglesDeCapas();
    actualizarIluminacionSolar();

    // Vuelo de entrada: pequeña pausa para que el primer frame ya tenga
    // edificios/sombras pintados antes de empezar a mover la cámara.
    setTimeout(() => {
      map.easeTo({
        pitch: CONFIG.pitchInicial,
        bearing: CONFIG.bearingInicial,
        zoom: CONFIG.zoomInicial,
        duration: CONFIG.duracionVueloInicialMs,
        essential: true,
      });
    }, 150);
  });

  // Debounced: si el usuario encadena varios movimientos/zooms seguidos,
  // esperamos a que se asiente antes de recalcular — evita disparar el
  // cálculo pesado varias veces por segundo mientras aún se está moviendo.
  const alTerminarMovimiento = crearDebounce(() => {
    actualizarCacheEdificios();
    if (document.getElementById('rsToggleSombras')?.checked) recalcularSombrasVisibles();
  }, 220);
  map.on('moveend', alTerminarMovimiento);

  function actualizarCacheEdificios() {
    if (!capaEdificiosDisponible || !map.getLayer(CONFIG.edificiosLayerId)) return;
    edificiosCacheados = map
      .queryRenderedFeatures({ layers: [CONFIG.edificiosLayerId] })
      .slice(0, CONFIG.maxEdificiosSombra);
  }

  /* ---------------- Sombras reales: sol + altura de edificios ---------------- */
  // La sombra de cada edificio se calcula como el volumen de barrido real
  // (suma de Minkowski del contorno del edificio con el vector sol→sombra):
  // por cada arista del edificio se genera el cuadrilátero que forma al
  // desplazarse, y se unen todos esos cuadriláteros + el propio edificio.
  // Es exacto para cualquier polígono (convexo o no), a diferencia de la
  // aproximación anterior por envolvente convexa.

  function unirDosPoligonos(a, b) {
    // Distintas versiones de Turf exponen union() con firmas distintas
    // (v6: dos features sueltos · v7: una FeatureCollection). Probamos
    // ambas para no depender de qué build haya cargado la página.
    try {
      const r = turf.union(turf.featureCollection([a, b]));
      if (r) return r;
    } catch (e) { /* probamos la otra firma */ }
    try {
      const r = turf.union(a, b);
      if (r) return r;
    } catch (e) { /* nos quedamos con lo que había */ }
    return a;
  }

  function calcularVolumenSombra(poligonoSimple, distanciaKm, bearingSombra) {
    const anillo = poligonoSimple.geometry.coordinates[0];
    let resultado = poligonoSimple;
    for (let i = 0; i < anillo.length - 1; i++) {
      const p1 = anillo[i];
      const p2 = anillo[i + 1];
      const p1t = turf.transformTranslate(turf.point(p1), distanciaKm, bearingSombra, { units: 'kilometers' }).geometry.coordinates;
      const p2t = turf.transformTranslate(turf.point(p2), distanciaKm, bearingSombra, { units: 'kilometers' }).geometry.coordinates;
      try {
        const cuadrilatero = turf.polygon([[p1, p2, p2t, p1t, p1]]);
        resultado = unirDosPoligonos(resultado, cuadrilatero);
      } catch (e) {
        continue; // arista degenerada: la saltamos sin romper el edificio entero
      }
    }
    return resultado;
  }

  function obtenerHoraEfectiva() {
    return modoManual ? obtenerFechaDelSlider() : new Date();
  }

  // Versión del cálculo en curso: si llega una petición nueva mientras
  // aún estamos procesando lotes de la anterior, la anterior se aborta
  // sola en el siguiente punto de control — así nunca se acumulan
  // cálculos pisándose unos a otros.
  let versionCalculoSombras = 0;

  async function recalcularSombrasVisibles(horaOverride) {
    if (!map.getSource('sombras')) return;
    const miVersion = ++versionCalculoSombras;

    const ahora = horaOverride || obtenerHoraEfectiva();
    const centro = puntoReferenciaSol || map.getCenter();
    const lat = centro.lat, lon = centro.lon ?? centro.lng;
    const posSol = SunCalc.getPosition(ahora, lat, lon);
    actualizarBadgeHoraDorada(ahora, lat, lon); // el indicador de sol se actualiza siempre, haya o no sombras activas

    if (!document.getElementById('rsToggleSombras')?.checked) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      return;
    }

    // Sol bajo el horizonte: no hay sombra física que dibujar
    if (posSol.altitude <= 0) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      mostrarAvisoSol('El sol está bajo el horizonte a esa hora — no hay sombras que proyectar.');
      return;
    }
    mostrarAvisoSol('');

    if (!capaEdificiosDisponible || !edificiosCacheados.length) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      return;
    }

    // Dirección hacia la que cae la sombra: opuesta al azimut solar
    const azimutGrados = (posSol.azimuth * 180) / Math.PI + 180;
    const bearingSombra = (azimutGrados + 180) % 360; // turf usa bearing geográfico (0=N)

    const poligonosSombra = [];
    for (let i = 0; i < edificiosCacheados.length; i += CONFIG.loteSombraSize) {
      if (miVersion !== versionCalculoSombras) return; // hay un cálculo más reciente pedido: abortamos este

      const lote = edificiosCacheados.slice(i, i + CONFIG.loteSombraSize);
      for (const edificio of lote) {
        try {
          const altura = Number(edificio.properties.height ?? edificio.properties.render_height) || CONFIG.alturaPorDefectoM;
          const longitudSombraM = altura / Math.tan(posSol.altitude);
          if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;

          const geom = edificio.geometry;
          if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

          const distanciaKm = longitudSombraM / 1000;
          const partes = turf.flatten(turf.feature(geom)).features; // MultiPolygon -> varios Polygon simples
          for (const parte of partes) {
            const volumen = calcularVolumenSombra(parte, distanciaKm, bearingSombra);
            if (volumen) poligonosSombra.push(volumen);
          }
        } catch (e) {
          // Un edificio con geometría rara no debe tirar abajo el resto del cálculo
          continue;
        }
      }

      // Pintamos ya lo que llevamos (la sombra "se va completando" en vez de
      // aparecer de golpe) y cedemos el hilo antes del siguiente lote.
      if (miVersion !== versionCalculoSombras) return;
      map.getSource('sombras')?.setData(turf.featureCollection(poligonosSombra));
      if (i + CONFIG.loteSombraSize < edificiosCacheados.length) await cederAlNavegador();
    }

    if (miVersion !== versionCalculoSombras) return;
    const coleccionSombras = turf.featureCollection(poligonosSombra);
    map.getSource('sombras')?.setData(coleccionSombras);

    // Halo/feather: solo si no hay demasiados polígonos — es la parte más
    // cara del cálculo y aquí es puramente decorativa.
    if (poligonosSombra.length <= 160) {
      try {
        const halo = turf.buffer(coleccionSombras, 3.5, { units: 'meters', steps: 4 });
        if (miVersion === versionCalculoSombras) map.getSource('sombras-halo')?.setData(halo || turf.featureCollection([]));
      } catch (e) {
        map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
      }
    } else {
      map.getSource('sombras-halo')?.setData(turf.featureCollection([]));
    }
  }

  function mostrarAvisoSol(texto) {
    const el = document.getElementById('rsSunNote');
    if (el) el.textContent = texto;
  }

  // Recalcula cada minuto para que las sombras y la luz "se muevan" con el
  // reloj real — solo mientras no estemos en modo manual (slider tocado).
  setInterval(() => {
    if (modoManual) return;
    if (map.loaded()) recalcularSombrasVisibles();
    actualizarIluminacionSolar();
  }, 60 * 1000);

  /* ---------------- Widget de posición del sol (estilo "sun tool" de Google Earth) ---------------- */
  // No montamos ningún cajetín aparte: cambiamos la luz y el cielo del
  // propio mapa 3D según la posición real (o simulada) del sol — como el
  // "Sun" de Google Earth. Usa las APIs nativas de MapLibre: map.setLight()
  // (sombreado de los edificios) + capa "sky" (color del cielo/atardecer).

  let puntoReferenciaSol = null; // { lat, lon } — se actualiza al buscar ruta

  function calcularAnguloSol(horaOverride) {
    const centro = puntoReferenciaSol || map.getCenter();
    const lat = centro.lat;
    const lon = centro.lon ?? centro.lng;
    const pos = SunCalc.getPosition(horaOverride || obtenerHoraEfectiva(), lat, lon);
    const azimutDeg = ((pos.azimuth * 180) / Math.PI + 180) % 360; // 0=N medido desde el norte
    const alturaDeg = (pos.altitude * 180) / Math.PI;
    return { azimutDeg, alturaDeg };
  }

  function actualizarIluminacionSolar(horaOverride) {
    const tSol = document.getElementById('rsToggleSol');
    if (!tSol || !map.getLayer('cielo-sol')) return;

    if (!tSol.checked) {
      // Apagado: luz neutra de fábrica, sin cielo de atmósfera
      map.setLayoutProperty('cielo-sol', 'visibility', 'none');
      map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.35, position: [1.5, 0, 40] });
      return;
    }

    const { azimutDeg, alturaDeg } = calcularAnguloSol(horaOverride);
    const bajoHorizonte = alturaDeg <= 0;
    const polar = Math.max(0, 90 - Math.max(alturaDeg, 0)); // 0=cenit, 90=horizonte

    // Sombreado real de los edificios 3D, según de dónde viene el sol
    map.setLight({
      anchor: 'map',
      color: bajoHorizonte ? '#3a4a63' : '#fff6e6',
      intensity: bajoHorizonte ? 0.15 : Math.min(1, 0.35 + alturaDeg / 90),
      position: [1.5, azimutDeg, polar],
    });

    // Cielo con brillo/halo hacia donde está el sol (rasante = efecto atardecer)
    map.setLayoutProperty('cielo-sol', 'visibility', 'visible');
    map.setPaintProperty('cielo-sol', 'sky-atmosphere-sun', [azimutDeg, polar]);
    map.setPaintProperty('cielo-sol', 'sky-atmosphere-sun-intensity', bajoHorizonte ? 3 : 12);
  }

  function actualizarBadgeHoraDorada(fechaEfectiva, lat, lon) {
    const badge = document.getElementById('rsGoldenBadge');
    const posSol = SunCalc.getPosition(fechaEfectiva, lat, lon);
    const altitudeDeg = (posSol.altitude * 180) / Math.PI;

    let solarNoonMs = null;
    let estado = null;

    try {
      const tiempos = SunCalc.getTimes(fechaEfectiva, lat, lon);
      solarNoonMs = tiempos.solarNoon.getTime();
      const t = fechaEfectiva.getTime();
      const enDorada =
        (t >= tiempos.sunrise.getTime() && t <= tiempos.goldenHourEnd.getTime()) ||
        (t >= tiempos.goldenHour.getTime() && t <= tiempos.sunset.getTime());
      const enAzul =
        (t >= tiempos.dawn.getTime() && t <= tiempos.sunrise.getTime()) ||
        (t >= tiempos.sunset.getTime() && t <= tiempos.dusk.getTime());
      estado = enDorada ? 'dorada' : enAzul ? 'azul' : null;
    } catch (e) { /* sin datos de horario fiables, seguimos sin badge */ }

    if (badge) {
      if (estado === 'dorada') {
        badge.textContent = '🌅 Hora dorada';
        badge.style.visibility = 'visible';
        badge.style.color = '#e7b06a';
        badge.style.background = '#e7b06a22';
        badge.style.borderColor = '#e7b06a55';
      } else if (estado === 'azul') {
        badge.textContent = '🌆 Hora azul';
        badge.style.visibility = 'visible';
        badge.style.color = '#7fb3c9';
        badge.style.background = '#7fb3c922';
        badge.style.borderColor = '#7fb3c955';
      } else {
        badge.style.visibility = 'hidden'; // ocupa el hueco pero no se ve: el panel no "salta" al aparecer/desaparecer
      }
    }

    actualizarIndicadorSolar(altitudeDeg, solarNoonMs != null ? fechaEfectiva.getTime() <= solarNoonMs : true);
  }

  // Mini-esfera solar: un arco de horizonte a cenit con un punto que marca
  // la altura real del sol — mitad izquierda por la mañana, mitad derecha
  // por la tarde, como recorre el cielo de verdad.
  function actualizarIndicadorSolar(altitudeDeg, esManana) {
    const punto = document.getElementById('rsSolPunto');
    const grupo = document.getElementById('rsSolGrupo');
    if (!punto || !grupo) return;

    if (altitudeDeg == null || altitudeDeg <= 0) {
      grupo.style.opacity = '0.25';
      return;
    }
    grupo.style.opacity = '1';

    const cx = 30, cy = 30, r = 26;
    const altura = Math.max(0, Math.min(90, altitudeDeg));
    const theta = esManana ? 180 - altura : altura; // grados: 180=horizonte E, 90=cenit, 0=horizonte O
    const rad = (theta * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy - r * Math.sin(rad);
    punto.setAttribute('cx', x.toFixed(1));
    punto.setAttribute('cy', y.toFixed(1));
  }

  /* ---------------- Slider de tiempo (hoy / solsticio verano / solsticio invierno) ---------------- */

  let modoManual = false;
  let fechaBaseManual = new Date();
  let sliderTiempo = null;
  let etiquetaTiempo = null;
  let temporizadorSlider = null;

  function fechaSolsticio(tipo) {
    const anio = new Date().getFullYear();
    return tipo === 'verano' ? new Date(anio, 5, 21, 12, 0, 0) : new Date(anio, 11, 21, 12, 0, 0);
  }

  function minutosDesdeFecha(fecha) {
    return fecha.getHours() * 60 + fecha.getMinutes();
  }

  function obtenerFechaDelSlider() {
    const d = new Date(fechaBaseManual);
    const minutos = Number(sliderTiempo?.value ?? minutosDesdeFecha(new Date()));
    d.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
    return d;
  }

  function formatoHora(fecha) {
    return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function actualizarEtiquetaTiempo(contexto) {
    if (!etiquetaTiempo) return;
    const fecha = obtenerFechaDelSlider();
    const prefijo = contexto === 'verano' ? 'Solsticio de verano · ' : contexto === 'invierno' ? 'Solsticio de invierno · ' : modoManual ? 'Simulando · ' : 'Ahora · ';
    etiquetaTiempo.textContent = prefijo + formatoHora(fecha);
  }

  function aplicarCambioDeHora(contexto) {
    actualizarEtiquetaTiempo(contexto);
    recalcularSombrasVisibles();
    actualizarIluminacionSolar();
  }

  // Estilo "placa de instrumento" (gnomon/astrolabio) en vez de la típica
  // tarjeta de cristal redondeada: metal oscuro cepillado, esquina cortada,
  // tipografía monoespaciada para la hora y un arco solar como firma visual
  // — todo con estilos propios para no heredar el aspecto genérico.
  function inyectarEstilosPanel() {
    if (document.getElementById('rsPanelEstilos')) return;
    const estilo = document.createElement('style');
    estilo.id = 'rsPanelEstilos';
    estilo.textContent = `
      #rsTimeControls{
        --rs-metal-1:#1b2029; --rs-metal-2:#262c38; --rs-latón:#c98a4b;
        --rs-latón-vivo:#e7b06a; --rs-verdigris:#6f9c8b; --rs-hueso:#e9e4d8;
        position:absolute; left:12px; bottom:12px; z-index:5; width:246px;
        background:linear-gradient(160deg,var(--rs-metal-2),var(--rs-metal-1) 70%);
        border-radius:3px 16px 3px 16px;
        border:1px solid #00000055; border-left:2px solid var(--rs-latón);
        box-shadow:0 12px 28px rgba(0,0,0,.32), inset 0 1px 0 #ffffff0c;
        padding:13px 15px; font-family:inherit; color:var(--rs-hueso);
        transition:opacity .18s ease, transform .18s ease;
      }
      #rsTimeControls.rs-cerrado{ padding-bottom:13px; }
      #rsTimeControls .rs-cuerpo{ overflow:hidden; }
      #rsTimeControls.rs-cerrado .rs-cuerpo{ display:none; }
      #rsTimeControls .rs-fila{ display:flex; align-items:center; gap:10px; }
      #rsTimeControls .rs-cabecera{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
      #rsTimeControls.rs-cerrado .rs-cabecera{ margin-bottom:0; }
      #rsTimeControls:not(.rs-cerrado) .rs-cabecera{ margin-bottom:10px; }
      #rsTimeControls .rs-eyebrow{
        font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--rs-latón);
        font-weight:700; opacity:.9;
      }
      #rsPlegarBtn{
        appearance:none; border:none; background:transparent; color:var(--rs-hueso);
        cursor:pointer; padding:2px 4px; opacity:.75; line-height:0;
      }
      #rsPlegarBtn:hover{ opacity:1; }
      #rsPlegarBtn svg{ display:block; transition:transform .2s ease; }
      #rsTimeControls.rs-cerrado #rsPlegarBtn svg{ transform:rotate(180deg); }
      #rsTimeLabel{
        font-family:'Space Mono',ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;
        font-size:15px; letter-spacing:.03em; color:var(--rs-hueso); white-space:nowrap;
      }
      #rsGoldenBadge{
        font-size:10px; font-weight:700; letter-spacing:.04em; padding:3px 8px 3px 6px;
        border-radius:3px; border:1px solid transparent; white-space:nowrap;
        display:inline-flex; align-items:center; gap:5px;
      }
      #rsGoldenBadge::before{ content:''; width:6px; height:6px; border-radius:50%; background:currentColor; }
      #rsTimeControls .rs-divisor{
        height:1px; margin:10px 0; background:repeating-linear-gradient(90deg,#c98a4b55 0 4px,transparent 4px 8px);
      }
      #rsTimeSlider{
        -webkit-appearance:none; appearance:none; width:100%; height:16px; background:transparent; cursor:pointer; margin:6px 0 2px;
      }
      #rsTimeSlider::-webkit-slider-runnable-track{
        height:3px; background:linear-gradient(90deg,var(--rs-latón),#00000000),#3a4150; border-radius:2px;
      }
      #rsTimeSlider::-webkit-slider-thumb{
        -webkit-appearance:none; margin-top:-6px; width:15px; height:15px; border-radius:50%;
        background:var(--rs-latón-vivo); border:2px solid #1b2029; box-shadow:0 0 0 3px #e7b06a2e;
      }
      #rsTimeSlider::-moz-range-track{ height:3px; background:#3a4150; border-radius:2px; }
      #rsTimeSlider::-moz-range-progress{ height:3px; background:var(--rs-latón); border-radius:2px; }
      #rsTimeSlider::-moz-range-thumb{
        width:15px; height:15px; border-radius:50%; background:var(--rs-latón-vivo); border:2px solid #1b2029;
      }
      #rsTimeControls .rs-botones{ display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
      #rsTimeControls button{
        flex:1; min-width:0; font-size:10.5px; letter-spacing:.05em; text-transform:uppercase;
        padding:7px 6px; border-radius:2px; border:1px solid #ffffff1f; background:#00000026;
        color:var(--rs-hueso); cursor:pointer; font-weight:700; transition:background .15s,border-color .15s;
      }
      #rsTimeControls button:hover{ background:#c98a4b22; border-color:#c98a4b66; }
      #rsTimeControls button:active{ background:#c98a4b3a; }
      #rsTimeControls button.rs-btn-capturar{ flex-basis:100%; color:var(--rs-latón-vivo); border-color:#c98a4b44; }
      @media (max-width:480px){ #rsTimeControls{ width:calc(100vw - 24px); max-width:250px; } }
    `;
    document.head.appendChild(estilo);
  }


  function inyectarControlesTiempo() {
    if (document.getElementById('rsTimeControls')) return; // por si el load se dispara más de una vez
    inyectarEstilosPanel();

    const panel = document.createElement('div');
    panel.id = 'rsTimeControls';

    // Cabecera: pequeño arco de horizonte→cenit (el "gnomon") + eyebrow +
    // botón de plegar/desplegar, siempre visible aunque el resto se oculte.
    const cabecera = document.createElement('div');
    cabecera.className = 'rs-cabecera';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'rs-eyebrow';
    eyebrow.textContent = 'Posición solar';

    const svgSol = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgSol.setAttribute('viewBox', '0 0 60 34');
    svgSol.setAttribute('width', '48');
    svgSol.setAttribute('height', '28');
    svgSol.innerHTML = `
      <g id="rsSolGrupo" style="transition:opacity .3s;">
        <path d="M 4 30 A 26 26 0 0 1 56 30" fill="none" stroke="#c98a4b" stroke-width="1" stroke-dasharray="1.5 3" opacity="0.55"/>
        <line x1="4" y1="30" x2="56" y2="30" stroke="#ffffff22" stroke-width="1"/>
        <circle id="rsSolPunto" cx="30" cy="4" r="3.4" fill="#e7b06a"/>
      </g>`;

    const btnPlegar = document.createElement('button');
    btnPlegar.id = 'rsPlegarBtn';
    btnPlegar.type = 'button';
    btnPlegar.setAttribute('aria-label', 'Mostrar u ocultar el panel de posición solar');
    btnPlegar.innerHTML = '<svg width="11" height="7" viewBox="0 0 11 7"><path d="M1 1l4.5 4.5L10 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btnPlegar.addEventListener('click', () => {
      panel.classList.toggle('rs-cerrado');
    });

    cabecera.append(eyebrow, svgSol, btnPlegar);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'rs-cuerpo';

    const filaEtiqueta = document.createElement('div');
    filaEtiqueta.className = 'rs-fila';
    filaEtiqueta.style.justifyContent = 'space-between';
    etiquetaTiempo = document.createElement('span');
    etiquetaTiempo.id = 'rsTimeLabel';
    const badgeDorada = document.createElement('span');
    badgeDorada.id = 'rsGoldenBadge';
    badgeDorada.style.visibility = 'hidden'; // reserva el hueco desde el principio: el panel no cambia de tamaño al aparecer
    badgeDorada.textContent = 'Hora dorada';
    filaEtiqueta.append(etiquetaTiempo, badgeDorada);

    sliderTiempo = document.createElement('input');
    sliderTiempo.type = 'range';
    sliderTiempo.id = 'rsTimeSlider';
    sliderTiempo.min = '0';
    sliderTiempo.max = '1439';
    sliderTiempo.step = '5';
    sliderTiempo.value = String(minutosDesdeFecha(new Date()));

    sliderTiempo.addEventListener('input', () => {
      modoManual = true;
      fechaBaseManual = esFechaSolsticioActiva ? fechaBaseManual : new Date();
      clearTimeout(temporizadorSlider);
      temporizadorSlider = setTimeout(() => aplicarCambioDeHora(esFechaSolsticioActiva), 90);
      actualizarEtiquetaTiempo(esFechaSolsticioActiva); // feedback inmediato, aunque el recálculo vaya con leve retardo
    });

    let esFechaSolsticioActiva = false;

    const divisor = document.createElement('div');
    divisor.className = 'rs-divisor';

    const filaBotones = document.createElement('div');
    filaBotones.className = 'rs-botones';

    function crearBoton(texto) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = texto;
      return b;
    }

    const btnAhora = crearBoton('Ahora');
    const btnVerano = crearBoton('Verano');
    const btnInvierno = crearBoton('Invierno');
    const btnCapturar = crearBoton('Capturar vista');
    btnCapturar.className = 'rs-btn-capturar';

    btnAhora.addEventListener('click', () => {
      modoManual = false;
      esFechaSolsticioActiva = false;
      fechaBaseManual = new Date();
      sliderTiempo.value = String(minutosDesdeFecha(new Date()));
      aplicarCambioDeHora(false);
    });

    btnVerano.addEventListener('click', () => {
      modoManual = true;
      esFechaSolsticioActiva = 'verano';
      fechaBaseManual = fechaSolsticio('verano');
      sliderTiempo.value = '780'; // 13:00, cerca del mediodía solar
      aplicarCambioDeHora('verano');
    });

    btnInvierno.addEventListener('click', () => {
      modoManual = true;
      esFechaSolsticioActiva = 'invierno';
      fechaBaseManual = fechaSolsticio('invierno');
      sliderTiempo.value = '780';
      aplicarCambioDeHora('invierno');
    });

    btnCapturar.addEventListener('click', capturarVista);

    filaBotones.append(btnAhora, btnVerano, btnInvierno, btnCapturar);
    cuerpo.append(filaEtiqueta, sliderTiempo, divisor, filaBotones);
    panel.append(cabecera, cuerpo);
    contenedorMapa.appendChild(panel);

    actualizarEtiquetaTiempo(false);
  }

  /* ---------------- Captura/compartir: exportar la vista actual como imagen ---------------- */

  function capturarVista() {
    try {
      map.triggerRepaint();
      requestAnimationFrame(() => {
        const canvas = map.getCanvas();
        const url = canvas.toDataURL('image/png');
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `manolito-aire-${Date.now()}.png`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      });
    } catch (e) {
      // Si los tiles del basemap no envían cabeceras CORS, el canvas queda
      // "manchado" (tainted) y toDataURL lanza SecurityError — no hay forma
      // de evitarlo desde el cliente, solo avisamos con claridad.
      console.error('No se ha podido exportar la vista como imagen:', e);
      mostrarEstado('No se ha podido generar la imagen (limitación del servidor de mapas). Prueba a hacer una captura de pantalla normal.', 'error');
    }
  }

  /* ---------------- Toggles de capas ---------------- */

  function conectarTogglesDeCapas() {
    const tEdificios = document.getElementById('rsToggleEdificios');
    const tSombras = document.getElementById('rsToggleSombras');
    const tRuta = document.getElementById('rsToggleRuta');
    const tSol = document.getElementById('rsToggleSol');

    tEdificios?.addEventListener('change', () => {
      if (capaEdificiosDisponible) {
        map.setLayoutProperty(CONFIG.edificiosLayerId, 'visibility', tEdificios.checked ? 'visible' : 'none');
      }
    });
    tSombras?.addEventListener('change', () => recalcularSombrasVisibles());
    tRuta?.addEventListener('change', () => {
      map.setLayoutProperty('capa-ruta', 'visibility', tRuta.checked ? 'visible' : 'none');
    });
    tSol?.addEventListener('change', () => actualizarIluminacionSolar());
  }

  /* ---------------- Red: fetch con timeout + reintentos ---------------- */

  async function fetchConReintentos(url, options = {}, intentos = CONFIG.fetchRetries) {

    for (let intento = 0; intento <= intentos; intento++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.fetchTimeoutMs);
      try {
        const respuesta = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        return await respuesta.json();
      } catch (err) {
        clearTimeout(timeoutId);
        if (intento === intentos) throw err;
        await new Promise((r) => setTimeout(r, 600 * (intento + 1)));
      }
    }
  }

  /* ---------------- Geocodificación (Nominatim) ---------------- */

  async function consultarNominatim(consulta) {
    const url = new URL(CONFIG.nominatimUrl);
    url.searchParams.set('q', consulta);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    return fetchConReintentos(url.toString(), { headers: { 'Accept-Language': 'es' } });
  }

  async function geocodificar(direccionTexto) {
    // Nominatim es muy sensible al formato. Si la consulta tal cual falla,
    // probamos variantes más simples antes de rendirnos: sin el número,
    // y añadiendo ", España" por si falta contexto de país.
    const variantes = [
      direccionTexto,
      `${direccionTexto}, España`,
      direccionTexto.replace(/\s*\d+\s*$/, '').trim(), // quita el número final
      `${direccionTexto.replace(/\s*\d+\s*$/, '').trim()}, España`,
    ].filter((v, i, arr) => v && arr.indexOf(v) === i); // sin vacíos ni duplicados

    for (const intento of variantes) {
      try {
        const datos = await consultarNominatim(intento);
        if (datos && datos.length > 0) {
          return { lat: parseFloat(datos[0].lat), lon: parseFloat(datos[0].lon), nombre: datos[0].display_name };
        }
      } catch (e) {
        // seguimos con la siguiente variante
      }
      // Nominatim pide no encadenar peticiones sin pausa
      await new Promise((r) => setTimeout(r, 350));
    }

    throw new Error(`No se ha encontrado: "${direccionTexto}". Prueba a escribirla como "calle, número, ciudad".`);
  }

  /* ---------------- Ruta real por calles (OSRM) ---------------- */

  async function calcularRutaReal(origen, destino) {
    const coords = `${origen.lon},${origen.lat};${destino.lon},${destino.lat}`;
    const url = `${CONFIG.osrmUrl}/foot/${coords}?overview=full&geometries=geojson`;

    try {
      const datos = await fetchConReintentos(url);
      if (datos?.code === 'Ok' && datos.routes?.[0]) {
        return {
          geojson: datos.routes[0].geometry,
          distanciaKm: (datos.routes[0].distance / 1000).toFixed(2),
          duracionMin: Math.round(datos.routes[0].duration / 60),
          esReal: true,
        };
      }
      throw new Error('OSRM no ha devuelto una ruta válida.');
    } catch (err) {
      // Si el servidor público de OSRM falla, avisamos claramente y caemos
      // a una línea directa en vez de romper la búsqueda.
      console.warn('Routing real no disponible, usando línea directa:', err);
      return {
        geojson: { type: 'LineString', coordinates: [[origen.lon, origen.lat], [destino.lon, destino.lat]] },
        distanciaKm: null,
        duracionMin: null,
        esReal: false,
      };
    }
  }

  /* ---------------- Calidad del aire (Open-Meteo) ---------------- */

  async function obtenerCalidadAire(lat, lon) {
    const url = new URL(CONFIG.airQualityUrl);
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('current', ['us_aqi', 'pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide'].join(','));
    url.searchParams.set('timezone', 'auto');

    const datos = await fetchConReintentos(url.toString());
    if (!datos || !datos.current) throw new Error('La API de calidad del aire no ha devuelto datos.');
    return datos.current;
  }

  function clasificarAQI(valor) {
    if (valor == null || Number.isNaN(valor)) return { etiqueta: 'Sin datos', color: leerVar('--sky-mid') };
    if (valor <= 50) return { etiqueta: 'Buena', color: leerVar('--breath-good') };
    if (valor <= 100) return { etiqueta: 'Moderada', color: leerVar('--breath-mid') };
    return { etiqueta: 'Mala', color: leerVar('--breath-bad') };
  }

  function pintarPanelAQI(current) {
    const placeholder = document.getElementById('rsAqiPlaceholder');
    const contenido = document.getElementById('rsAqiContent');
    const aqi = current.us_aqi;
    const clasificacion = clasificarAQI(aqi);

    document.getElementById('rsAqiValue').textContent = aqi != null ? Math.round(aqi) : '--';
    const categoriaEl = document.getElementById('rsAqiCategory');
    categoriaEl.textContent = clasificacion.etiqueta;
    categoriaEl.style.color = clasificacion.color;
    categoriaEl.style.background = clasificacion.color + '26';

    document.getElementById('rsPm25').textContent = current.pm2_5 != null ? `${current.pm2_5} µg/m³` : '--';
    document.getElementById('rsPm10').textContent = current.pm10 != null ? `${current.pm10} µg/m³` : '--';
    document.getElementById('rsO3').textContent = current.ozone != null ? `${current.ozone} µg/m³` : '--';
    document.getElementById('rsNo2').textContent = current.nitrogen_dioxide != null ? `${current.nitrogen_dioxide} µg/m³` : '--';

    placeholder.style.display = 'none';
    contenido.style.display = 'block';
  }

  /* ---------------- Marcadores ---------------- */

  let marcadorOrigen = null, marcadorDestino = null;

  function pintarMarcadores(origen, destino) {
    if (marcadorOrigen) marcadorOrigen.remove();
    if (marcadorDestino) marcadorDestino.remove();

    const pin = (color) => {
      const el = document.createElement('div');
      el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:3px solid var(--paper);box-shadow:0 0 0 2px ${color}66;`;
      return el;
    };

    marcadorOrigen = new maplibregl.Marker({ element: pin(leerVar('--accent') || '#F4A66B') })
      .setLngLat([origen.lon, origen.lat])
      .setPopup(new maplibregl.Popup().setHTML(`<b>Origen</b><br>${origen.nombre}`))
      .addTo(map);

    marcadorDestino = new maplibregl.Marker({ element: pin(leerVar('--sky-deep') || '#1C3144') })
      .setLngLat([destino.lon, destino.lat])
      .setPopup(new maplibregl.Popup().setHTML(`<b>Destino</b><br>${destino.nombre}`))
      .addTo(map);
  }

  /* ---------------- UI principal ---------------- */

  const inputOrigen = document.getElementById('rsOrigen');
  const inputDestino = document.getElementById('rsDestino');
  const btnBuscar = document.getElementById('rsBuscarBtn');
  const statusEl = document.getElementById('rsStatus');

  function mostrarEstado(texto, tipo) {
    statusEl.textContent = texto;
    statusEl.style.color = tipo === 'error' ? leerVar('--breath-bad') : tipo === 'ok' ? leerVar('--breath-good') : leerVar('--sky-mid');
  }

  function ponerCargando(cargando) {
    btnBuscar.disabled = cargando;
    btnBuscar.textContent = cargando ? 'Buscando…' : 'Buscar ruta';
  }

  /* ---------------- Autocompletado tipo Google (Nominatim) ---------------- */
  // Guardamos, por input, el punto exacto que el usuario ha CLICADO (o
  // seleccionado con teclado) en la lista de sugerencias. Si al pulsar
  // "Buscar ruta" el texto coincide con lo seleccionado, usamos esas
  // coordenadas exactas y no volvemos a geocodificar texto libre.
  const seleccionPorInput = new Map(); // input -> { lat, lon, nombre, texto }

  function crearAutocompletado(input, contenedorSugerenciasId) {
    const contenedor = document.getElementById(contenedorSugerenciasId);
    if (!contenedor) return;

    let temporizador = null;
    let controladorActual = null;
    let indiceActivo = -1;
    let ultimosResultados = [];

    input.addEventListener('input', () => {
      seleccionPorInput.delete(input); // el usuario ha editado a mano: la selección previa ya no vale
      indiceActivo = -1;
      const texto = input.value.trim();

      clearTimeout(temporizador);
      if (texto.length < 3) {
        contenedor.innerHTML = '';
        contenedor.style.display = 'none';
        return;
      }

      temporizador = setTimeout(async () => {
        if (controladorActual) controladorActual.abort();
        controladorActual = new AbortController();

        try {
          const url = new URL(CONFIG.nominatimUrl);
          url.searchParams.set('q', texto);
          url.searchParams.set('format', 'json');
          url.searchParams.set('limit', '6');
          url.searchParams.set('addressdetails', '1');
          url.searchParams.set('countrycodes', 'es'); // Manolito Aire es de España

          const resp = await fetch(url.toString(), {
            headers: { 'Accept-Language': 'es' },
            signal: controladorActual.signal,
          });
          const resultados = await resp.json();
          pintarSugerencias(resultados, texto);
        } catch (e) {
          if (e.name !== 'AbortError') contenedor.innerHTML = '';
        }
      }, 350); // debounce: no dispara una petición por cada tecla
    });

    function reordenarPorCiudadEscrita(resultados, textoOriginal) {
      // Si el usuario ya mencionó una ciudad en lo que escribió, subimos al
      // principio los resultados cuya ciudad/pueblo (según Nominatim) coincida
      // con esa palabra — así "Rafael Alberti 5 Sevilla" no te manda a un
      // pueblo homónimo solo porque Nominatim lo considera más "importante".
      const textoLower = textoOriginal.toLowerCase();
      return [...resultados].sort((a, b) => {
        const ciudadA = (a.address?.city || a.address?.town || a.address?.village || '').toLowerCase();
        const ciudadB = (b.address?.city || b.address?.town || b.address?.village || '').toLowerCase();
        const coincideA = ciudadA && textoLower.includes(ciudadA) ? 1 : 0;
        const coincideB = ciudadB && textoLower.includes(ciudadB) ? 1 : 0;
        return coincideB - coincideA; // los que coinciden con la ciudad escrita, primero
      });
    }

    function seleccionarSugerencia(r) {
      input.value = r.display_name;
      seleccionPorInput.set(input, {
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        nombre: r.display_name,
        texto: r.display_name,
      });
      contenedor.innerHTML = '';
      contenedor.style.display = 'none';
      indiceActivo = -1;
    }

    function resaltarActivo() {
      const items = contenedor.querySelectorAll('li[data-idx]');
      items.forEach((li, i) => {
        li.style.background = i === indiceActivo ? (leerVar('--accent') || '#F4A66B') + '22' : '';
      });
      if (indiceActivo >= 0 && items[indiceActivo]) {
        items[indiceActivo].scrollIntoView({ block: 'nearest' });
      }
    }

    function pintarSugerencias(resultados, textoOriginal) {
      ultimosResultados = [];
      if (!resultados || resultados.length === 0) {
        contenedor.innerHTML = '<li class="rs-sug-empty">Sin resultados</li>';
        contenedor.style.display = 'block';
        return;
      }

      resultados = reordenarPorCiudadEscrita(resultados, textoOriginal);
      ultimosResultados = resultados;
      indiceActivo = -1;

      contenedor.innerHTML = resultados
        .map((r, i) => {
          const ciudad = r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || '';
          const resto = r.display_name.split(',')[0]; // calle/lugar (primer tramo)
          return `<li data-idx="${i}">
            <span class="rs-sug-linea1">${resto}</span>
            <span class="rs-sug-linea2">${ciudad ? ciudad + ' · ' : ''}${r.address?.state || ''}</span>
          </li>`;
        })
        .join('');
      contenedor.style.display = 'block';

      contenedor.querySelectorAll('li[data-idx]').forEach((li) => {
        li.addEventListener('click', () => seleccionarSugerencia(resultados[Number(li.dataset.idx)]));
      });
    }

    // Navegación por teclado: ↑/↓ para moverse, Enter para elegir. Solo
    // interceptamos Enter aquí cuando hay una sugerencia resaltada; si no,
    // dejamos que el Enter siga su curso normal (disparar la búsqueda de ruta).
    input.addEventListener('keydown', (e) => {
      const visible = contenedor.style.display !== 'none' && ultimosResultados.length > 0;
      if (!visible) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        indiceActivo = (indiceActivo + 1) % ultimosResultados.length;
        resaltarActivo();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        indiceActivo = (indiceActivo - 1 + ultimosResultados.length) % ultimosResultados.length;
        resaltarActivo();
      } else if (e.key === 'Enter' && indiceActivo >= 0) {
        e.preventDefault();
        e.stopImmediatePropagation(); // no dispares también el listener de "buscar ruta"
        seleccionarSugerencia(ultimosResultados[indiceActivo]);
      } else if (e.key === 'Escape') {
        contenedor.style.display = 'none';
        indiceActivo = -1;
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target !== input && !contenedor.contains(e.target)) {
        contenedor.style.display = 'none';
      }
    });
  }

  crearAutocompletado(inputOrigen, 'rsSugerenciasOrigen');
  crearAutocompletado(inputDestino, 'rsSugerenciasDestino');

  async function resolverPunto(input) {
    const seleccionado = seleccionPorInput.get(input);
    const texto = input.value.trim();
    if (seleccionado && seleccionado.texto === texto) return seleccionado;
    return geocodificar(texto);
  }

  async function manejarBusqueda() {
    const textoOrigen = inputOrigen.value.trim();
    const textoDestino = inputDestino.value.trim();
    if (!textoOrigen || !textoDestino) {
      mostrarEstado('Introduce origen y destino.', 'error');
      return;
    }

    ponerCargando(true);
    mostrarEstado('Geocodificando direcciones…');

    try {
      const [origen, destino] = await Promise.all([resolverPunto(inputOrigen), resolverPunto(inputDestino)]);

      mostrarEstado('Calculando ruta real por calles…');
      const ruta = await calcularRutaReal(origen, destino);

      map.getSource('ruta').setData(turf.feature(ruta.geojson));
      pintarMarcadores(origen, destino);

      const bounds = ruta.geojson.coordinates.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(ruta.geojson.coordinates[0], ruta.geojson.coordinates[0])
      );
      map.fitBounds(bounds, { padding: 70, maxZoom: 17, duration: 800 });

      puntoReferenciaSol = { lat: origen.lat, lon: origen.lon };
      recalcularSombrasVisibles();
      actualizarIluminacionSolar();

      if (ruta.esReal) {
        mostrarEstado(`Ruta real: ${ruta.distanciaKm} km · ${ruta.duracionMin} min a pie.`, 'ok');
      } else {
        mostrarEstado('No se pudo calcular la ruta por calles (servidor OSRM ocupado) — mostrando línea directa.', 'error');
      }

      try {
        const aire = await obtenerCalidadAire(origen.lat, origen.lon);
        pintarPanelAQI(aire);
      } catch (errAire) {
        console.error(errAire);
      }
    } catch (err) {
      console.error(err);
      mostrarEstado(err.message || 'Error al buscar la ruta. Inténtalo de nuevo.', 'error');
    } finally {
      ponerCargando(false);
    }
  }

  btnBuscar.addEventListener('click', manejarBusqueda);
  [inputOrigen, inputDestino].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); manejarBusqueda(); }
    });
  });

  document.getElementById('themeToggle')?.addEventListener('click', () => setTimeout(() => {
    if (map.getLayer('capa-ruta')) map.setPaintProperty('capa-ruta', 'line-color', leerVar('--accent'));
  }, 50));
})();