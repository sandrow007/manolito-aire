/* ============================================================
   CAPA DE IRRADIACIÓN SOLAR REAL — NASA POWER API  (v3)
   ------------------------------------------------------------
   Novedades v3:
     A. HISTÓRICO REAL NAVEGABLE: año → mes → día → hora.
        - Endpoint temporal/daily: serie diaria del año completo
          (1 petición por año, cacheada).
        - Endpoint temporal/hourly: perfil horario del día elegido
          (1 petición por día, cacheada). Valores en Wh/m² por hora.
     B. ATENUACIÓN VEGETAL REAL (umbra vs penumbra) con Turf.js 2D
        contra los polígonos de sombra ya existentes (sin
        raycasting 3D):
          · Umbra (edificios, fuente 'sombras'): protección total
            → multiplicador de exposición solar = 1.0
          · Penumbra (árboles, 'arboles-globales-sombra'): luz
            filtrada por la copa (transmitancia ~50 %)
            → multiplicador = 2.0
          · Sol directo (sin intersección): penalización severa
            → multiplicador = 4.0
        La clasificación se expone en window.manolitAireAtenuacion
        para que el cálculo de rutas la reutilice.
     C. El popup de clic muestra el dato REAL de esa hora/día,
        el índice de nubosidad instantáneo (GHI/cielo despejado)
        y la exposición efectiva con la atenuación aplicada.

   Física: la ley del coseno de Lambert solo se aplica a la
   componente DIRECTA al transponer a plano inclinado:
     G_plano = DNI·cos(θ) + DHI·(1+cosβ)/2
   La GHI horizontal de la NASA ya incluye el ángulo de
   incidencia; multiplicarla otra vez por sin(altura) lo
   contaría dos veces.
   ============================================================ */

'use strict';

(function () {
  // El botón del mapa puede cargar este script dos veces (precarga en cadena
  // + carga perezosa al pulsar). La segunda ejecución no debe hacer nada.
  if (window.__irradiacionSolarCargada) return;
  window.__irradiacionSolarCargada = true;

  // Traducción: enganche al diccionario global de i18n.js (mismo patrón que shadows-route.js)
  function t(clave, fallback) {
    try {
      const fn = window.getMessages;
      if (typeof fn === 'function') {
        const msg = fn();
        if (msg && msg[clave] != null) return msg[clave];
      }
    } catch (e) { /* seguimos con el fallback */ }
    return fallback != null ? fallback : clave;
  }

  const CONFIG = {
    lat: 37.3891,
    lon: -5.9845,
    nasaDiario: 'https://power.larc.nasa.gov/api/temporal/daily/point',
    nasaHorario: 'https://power.larc.nasa.gov/api/temporal/hourly/point',
    // GHI horizontal, directa normal y cielo despejado
    parametrosNasa: ['ALLSKY_SFC_SW_DWN', 'ALLSKY_SFC_SW_DNI', 'CLRSKY_SFC_SW_DWN'],
    anioMinimo: 1984, // las series horarias de POWER arrancan en 1984
    esperaMapaMs: 15000,
    inclinacionPanelGrados: 30,
  };

  // Multiplicadores de exposición solar (índice de castigo térmico al caminar).
  // Las etiquetas se resuelven con t() en el momento de pintar, no al cargar.
  const ATENUACION = {
    UMBRA: { factor: 1.0, claveEtiqueta: 'irrUmbra', color: '#7fa8c9' },
    PENUMBRA: { factor: 2.0, claveEtiqueta: 'irrPenumbra', color: '#8fbf7f' },
    SOL: { factor: 4.0, claveEtiqueta: 'irrSol', color: '#e7b06a' },
  };

  const CONSTANTE_SOLAR = 1367; // W/m²

  const RAMPA = [
    { t: 0.0, color: [76, 0, 130] },
    { t: 0.35, color: [200, 30, 30] },
    { t: 0.65, color: [255, 140, 0] },
    { t: 1.0, color: [255, 250, 200] },
  ];

  function interpolarColor(t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 0; i < RAMPA.length - 1; i++) {
      const a = RAMPA[i], b = RAMPA[i + 1];
      if (t >= a.t && t <= b.t) {
        const f = (t - a.t) / (b.t - a.t);
        return `rgb(${[0, 1, 2].map((c) => Math.round(a.color[c] + (b.color[c] - a.color[c]) * f)).join(',')})`;
      }
    }
    return `rgb(${RAMPA[RAMPA.length - 1].color.join(',')})`;
  }

  function esperarMapa() {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      (function intento() {
        if (window.manolitAireMap) return resolve(window.manolitAireMap);
        if (Date.now() - t0 > CONFIG.esperaMapaMs) {
          return reject(new Error('No se ha encontrado window.manolitAireMap'));
        }
        setTimeout(intento, 200);
      })();
    });
  }

  esperarMapa().then(iniciar).catch((e) => console.debug('[irradiacion-solar]', e.message));

  async function iniciar(map) {
    const contenedorMapa = map.getContainer();

    // ================= CAPAS A RECOLOREAR =================
    function capaEdificios() {
      return (map.getStyle().layers || [])
        .find((l) => l.type === 'fill-extrusion' && /building/i.test(l.id));
    }
    function capaTerrenoOSuelo() {
      return (map.getStyle().layers || [])
        .find((l) => l.type === 'fill' && /^(land|landuse|landcover)/i.test(l.id));
    }
    const capasRecoloreables = [
      { id: () => capaEdificios()?.id, prop: 'fill-extrusion-color' },
      { id: () => 'capa-arboles-globales-3d', prop: 'fill-extrusion-color' },
      { id: () => capaTerrenoOSuelo()?.id, prop: 'fill-color' },
    ];
    const coloresOriginales = new Map();

    function aplicarColorATodasLasCapas(colorCss) {
      capasRecoloreables.forEach(({ id, prop }) => {
        const capaId = id();
        if (!capaId || !map.getLayer(capaId)) return;
        if (!coloresOriginales.has(capaId)) {
          try { coloresOriginales.set(capaId, map.getPaintProperty(capaId, prop)); } catch (e) { }
        }
        try { map.setPaintProperty(capaId, prop, colorCss); } catch (e) { }
      });
    }
    function restaurarColoresOriginales() {
      capasRecoloreables.forEach(({ id, prop }) => {
        const capaId = id();
        if (!capaId || !map.getLayer(capaId) || !coloresOriginales.has(capaId)) return;
        try { map.setPaintProperty(capaId, prop, coloresOriginales.get(capaId)); } catch (e) { }
      });
    }

    // ================= NASA POWER: CACHÉS =================
    const cacheDiaria = new Map();   // anio -> { 'YYYYMMDD': {ghi, dni, cielo} }  (kWh/m²/día)
    const cacheHoraria = new Map();  // 'YYYYMMDD' -> { hora(0-23): {ghi, dni, cielo} } (Wh/m² esa hora)

    function claveFecha(anio, mes, dia) {
      return `${anio}${String(mes).padStart(2, '0')}${String(dia).padStart(2, '0')}`;
    }
    function esValorValido(v) { return v != null && v !== -999; }

    // Caché persistente (localStorage): los datos históricos de la NASA no
    // cambian, así que se guardan 7 días y no se repiten llamadas.
    const NASA_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
    function nasaCacheObtener(clave) {
      try {
        const crudo = localStorage.getItem(`manolito_cache_nasa_${clave}`);
        if (!crudo) return null;
        const entrada = JSON.parse(crudo);
        if (!entrada || Date.now() - entrada.t > NASA_CACHE_TTL) return null;
        return entrada.v;
      } catch (e) { return null; }
    }
    function nasaCacheGuardar(clave, valor) {
      try { localStorage.setItem(`manolito_cache_nasa_${clave}`, JSON.stringify({ t: Date.now(), v: valor })); } catch (e) { }
    }

    async function obtenerAnioDiario(anio) {
      if (cacheDiaria.has(anio)) return cacheDiaria.get(anio);
      const persistente = nasaCacheObtener(`d_${anio}`);
      if (persistente) { cacheDiaria.set(anio, persistente); return persistente; }
      const url = new URL(CONFIG.nasaDiario);
      url.searchParams.set('parameters', CONFIG.parametrosNasa.join(','));
      url.searchParams.set('community', 'RE');
      url.searchParams.set('longitude', CONFIG.lon);
      url.searchParams.set('latitude', CONFIG.lat);
      url.searchParams.set('start', `${anio}0101`);
      url.searchParams.set('end', `${anio}1231`);
      url.searchParams.set('format', 'JSON');
      const r = await fetch(url.toString());
      if (!r.ok) throw new Error(`NASA POWER HTTP ${r.status}`);
      const datos = await r.json();
      const series = datos?.properties?.parameter;
      if (!series?.[CONFIG.parametrosNasa[0]]) throw new Error('Serie diaria no recibida');
      const porDia = {};
      for (const [clave, ghi] of Object.entries(series[CONFIG.parametrosNasa[0]])) {
        if (!esValorValido(ghi)) continue;
        const dni = series[CONFIG.parametrosNasa[1]]?.[clave];
        const cielo = series[CONFIG.parametrosNasa[2]]?.[clave];
        porDia[clave] = {
          ghi,
          dni: esValorValido(dni) ? dni : null,
          cieloDespejado: esValorValido(cielo) ? cielo : null,
        };
      }
      cacheDiaria.set(anio, porDia);
      nasaCacheGuardar(`d_${anio}`, porDia);
      return porDia;
    }

    async function obtenerDiaHorario(anio, mes, dia) {
      const clave = claveFecha(anio, mes, dia);
      if (cacheHoraria.has(clave)) return cacheHoraria.get(clave);
      const persistente = nasaCacheObtener(`h_${clave}`);
      if (persistente) { cacheHoraria.set(clave, persistente); return persistente; }
      const url = new URL(CONFIG.nasaHorario);
      url.searchParams.set('parameters', CONFIG.parametrosNasa.join(','));
      url.searchParams.set('community', 'RE');
      url.searchParams.set('longitude', CONFIG.lon);
      url.searchParams.set('latitude', CONFIG.lat);
      url.searchParams.set('start', clave);
      url.searchParams.set('end', clave);
      url.searchParams.set('format', 'JSON');
      url.searchParams.set('time-standard', 'UTC');
      const r = await fetch(url.toString());
      if (!r.ok) throw new Error(`NASA POWER HTTP ${r.status}`);
      const datos = await r.json();
      const series = datos?.properties?.parameter;
      if (!series?.[CONFIG.parametrosNasa[0]]) throw new Error('Serie horaria no recibida');
      const porHora = {};
      for (let h = 0; h < 24; h++) {
        const claveHora = `${clave}${String(h).padStart(2, '0')}`;
        const ghi = series[CONFIG.parametrosNasa[0]]?.[claveHora];
        if (!esValorValido(ghi)) continue;
        const dni = series[CONFIG.parametrosNasa[1]]?.[claveHora];
        const cielo = series[CONFIG.parametrosNasa[2]]?.[claveHora];
        porHora[h] = {
          ghi, // Wh/m² en esa hora (media climatológica real)
          dni: esValorValido(dni) ? dni : null,
          cieloDespejado: esValorValido(cielo) ? cielo : null,
        };
      }
      cacheHoraria.set(clave, porHora);
      nasaCacheGuardar(`h_${clave}`, porHora);
      return porHora;
    }

    // ================= FÍSICA SOLAR =================
    function radiacionExtraterrestreDiaria(anio, mes, dia) {
      const diaJuliano = Math.floor((Date.UTC(anio, mes - 1, dia) - Date.UTC(anio, 0, 1)) / 86400000) + 1;
      const phi = (CONFIG.lat * Math.PI) / 180;
      const delta = ((23.45 * Math.PI) / 180) * Math.sin(((2 * Math.PI) * (284 + diaJuliano)) / 365);
      const omegaS = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
      const e0 = 1 + 0.033 * Math.cos((2 * Math.PI * diaJuliano) / 365);
      return ((24 * 3600 * CONSTANTE_SOLAR * e0) / Math.PI) *
        (omegaS * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(omegaS)) / 3.6e6;
    }

    // Transposición a plano inclinado: Lambert solo a la directa
    function irradianciaEnPlanoInclinado(ghi, dni, alturaSolarRad, acimutSolRad) {
      const beta = (CONFIG.inclinacionPanelGrados * Math.PI) / 180;
      const sinAlt = Math.max(Math.sin(alturaSolarRad), 0.05);
      const directaHorizontal = dni != null ? dni * sinAlt : ghi * 0.7;
      const dhi = Math.max(0, ghi - directaHorizontal);
      const cosIncidencia = Math.max(0,
        Math.sin(alturaSolarRad) * Math.cos(beta) +
        Math.cos(alturaSolarRad) * Math.sin(beta) * Math.cos(acimutSolRad));
      const factorRb = cosIncidencia / sinAlt;
      const directaPlano = dni != null ? dni * cosIncidencia : directaHorizontal * factorRb;
      const difusaPlano = dhi * (1 + Math.cos(beta)) / 2;
      return directaPlano + difusaPlano;
    }

    // ================= ATENUACIÓN VEGETAL (umbra/penumbra) =================
    // Intersección 2D con Turf.js contra las fuentes de sombra existentes.
    function clasificarPunto(lngLat) {
      if (typeof turf === 'undefined') return { tipo: 'SOL', ...ATENUACION.SOL, etiqueta: t('irrSol', 'Sol directo') };
      const punto = turf.point([lngLat.lng, lngLat.lat]);
      const dentro = (idFuente) => {
        const fuente = map.getSource(idFuente);
        if (!fuente || !fuente._data) return false;
        for (const poligono of (fuente._data.features || [])) {
          try { if (turf.booleanPointInPolygon(punto, poligono)) return true; }
          catch (e) { /* geometría rara */ }
        }
        return false;
      };
      const resolver = (cfg) => ({ ...cfg, etiqueta: t(cfg.claveEtiqueta, cfg.claveEtiqueta) });
      if (dentro('sombras')) return { tipo: 'UMBRA', ...resolver(ATENUACION.UMBRA) };
      if (dentro('arboles-globales-sombra')) return { tipo: 'PENUMBRA', ...resolver(ATENUACION.PENUMBRA) };
      return { tipo: 'SOL', ...resolver(ATENUACION.SOL) };
    }
    // API pública: el motor de rutas puede ponderar cada tramo con este factor
    window.manolitAireAtenuacion = (lngLat) => clasificarPunto(lngLat);

    // ================= APLICAR ESTADO (día + hora) =================
    async function aplicarIrradiancia(anio, mes, dia, hora) {
      mostrarEstadoPanel(t('irrLoading', 'Consultando NASA POWER…'));
      try {
        if (typeof SunCalc === 'undefined') throw new Error('SunCalc no está cargado');

        // Dato diario (kWh/m²/día) — serie real del año completo
        const porDia = await obtenerAnioDiario(anio);
        const datoDia = porDia[claveFecha(anio, mes, dia)];
        if (!datoDia) throw new Error('Sin dato diario para esa fecha');

        // Dato horario (Wh/m²) — perfil real del día elegido
        let datoHora = null;
        try { datoHora = (await obtenerDiaHorario(anio, mes, dia))[hora] ?? null; }
        catch (e) { /* el endpoint horario puede fallar en años antiguos */ }

        // Posición solar real en esa fecha/hora (UTC ≈ hora civil −1/−2 en Sevilla;
        // la serie horaria de POWER es UTC, así que comparamos en UTC)
        const fecha = new Date(Date.UTC(anio, mes - 1, dia, hora, 0, 0));
        const posSol = SunCalc.getPosition(fecha, CONFIG.lat, CONFIG.lon);
        const deNoche = posSol.altitude <= 0;

        // Color: índice de nubosidad instantáneo (GHI / cielo despejado),
        // físico y comparable entre horas, días y años
        let tColor;
        if (deNoche) tColor = 0;
        else if (datoHora?.cieloDespejado > 0) tColor = datoHora.ghi / datoHora.cieloDespejado;
        else tColor = datoDia.ghi / radiacionExtraterrestreDiaria(anio, mes, dia); // Kt diario
        aplicarColorATodasLasCapas(interpolarColor(deNoche ? 0 : (tColor - 0.2) / 0.85));

        const partes = [
          `Día: ${datoDia.ghi.toFixed(2)} kWh/m²`,
          `· plano ${CONFIG.inclinacionPanelGrados}°: ${irradianciaEnPlanoInclinado(datoDia.ghi, datoDia.dni, Math.max(posSol.altitude, 0), posSol.azimuth).toFixed(2)}`,
        ];
        if (datoHora) partes.unshift(`Hora ${String(hora).padStart(2, '0')}:00 UTC: ${datoHora.ghi.toFixed(0)} Wh/m²`);
        partes.push(`· sol ${(posSol.altitude * 180 / Math.PI).toFixed(1)}°${deNoche ? ' (noche)' : ''}`);
        mostrarEstadoPanel(partes.join(' '));
      } catch (e) {
        console.debug('[irradiacion-solar]', e.message);
        mostrarEstadoPanel(e.message.includes('Sin dato')
          ? t('irrNoData', 'La NASA no tiene dato para esa fecha.')
          : t('irrError', 'No se ha podido consultar la NASA ahora mismo. Reintenta en unos segundos.'), true);
      }
    }

    // ================= UI =================
    let panelEl = null;
    let estadoEl = null;
    let capaActiva = false;

    function mostrarEstadoPanel(texto, esError) {
      if (!estadoEl) return;
      estadoEl.textContent = texto;
      estadoEl.style.color = esError ? '#e05252' : '#c9a86f';
    }

    function construirPanel() {
      const estilo = document.createElement('style');
      estilo.textContent = `
        #irrPanel{
          position:absolute; right:12px; top:108px; z-index:6; width:235px;
          background:rgba(251,250,247,0.94);
          backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
          border:1px solid var(--line, rgba(14,59,71,0.14));
          border-radius:14px; padding:11px 13px; color:var(--ink, #0D1F26);
          font-family:inherit; box-shadow:0 8px 22px rgba(22,35,46,0.16); display:none;
        }
        #irrPanel.rs-visible{ display:block; }
        #irrPanel .irr-cabecera{ display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; color:var(--sky-deep, #0E3B47); }
        #irrPanel label{ font-size:8.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--sky-mid, #17788A); display:block; margin-bottom:3px; }
        #irrCerrar{ background:transparent; border:none; color:var(--sky-mid, #17788A); font-size:15px; cursor:pointer; line-height:1; padding:0 2px; }
        #irrCerrar:hover{ color:var(--ink, #0D1F26); }
        #irrPanel input[type=number]{
          width:100%; margin-bottom:7px; background:var(--mist, #EDF1F0); color:var(--ink, #0D1F26);
          border:1px solid var(--line, rgba(14,59,71,0.14)); border-radius:9px; padding:5px 8px; font-family:inherit; font-size:12px;
        }
        #irrPanel input[type=range]{
          -webkit-appearance:none; appearance:none; width:100%; height:16px; background:transparent; cursor:pointer; margin:3px 0 1px;
        }
        #irrPanel input[type=range]::-webkit-slider-runnable-track{ height:3px; background:var(--line, rgba(14,59,71,0.18)); border-radius:2px; }
        #irrPanel input[type=range]::-webkit-slider-thumb{
          -webkit-appearance:none; margin-top:-6px; width:14px; height:14px; border-radius:50%;
          background:var(--accent, #FF6B1A); border:2px solid var(--paper, #FBFAF7); box-shadow:0 1px 4px rgba(22,35,46,0.25);
        }
        #irrPanel .irr-leyenda{ font-size:8.5px; color:var(--sky-mid, #17788A); margin-bottom:5px; padding:0 2px; display:flex; justify-content:space-between; }
        #irrResumen{ font-size:10px; line-height:1.6; border-top:1px solid var(--line, rgba(14,59,71,0.14)); margin-top:7px; padding-top:7px; }
        #irrResumen b{ color:var(--sky-deep, #0E3B47); }
        #irrLeyendaAtenuacion{ font-size:9px; line-height:1.5; color:var(--sky-mid, #17788A); border-top:1px solid var(--line, rgba(14,59,71,0.14)); margin-top:6px; padding-top:6px; }
        #irrEstado{ font-size:10px; margin-top:4px; line-height:1.4; }
        @media (max-width:480px){ #irrPanel{ width:calc(100% - 24px); max-width:235px; right:12px; top:100px; } }
      `;
      document.head.appendChild(estilo);

      panelEl = document.createElement('div');
      panelEl.id = 'irrPanel';

      const cabecera = document.createElement('div');
      cabecera.className = 'irr-cabecera';
      const tituloCabecera = document.createElement('label');
      tituloCabecera.style.marginBottom = '0';
      tituloCabecera.textContent = t('irrPanelTitle', 'Histórico de irradiación');
      const btnCerrar = document.createElement('button');
      btnCerrar.type = 'button';
      btnCerrar.id = 'irrCerrar';
      btnCerrar.textContent = '×';
      btnCerrar.setAttribute('aria-label', 'Cerrar');
      cabecera.append(tituloCabecera, btnCerrar);

      const ahora = new Date();
      const anioMax = ahora.getFullYear();

      // Año
      const labelAnio = document.createElement('label');
      labelAnio.textContent = t('irrYear', 'Año');
      const inputAnio = document.createElement('input');
      inputAnio.type = 'number';
      inputAnio.min = String(CONFIG.anioMinimo);
      inputAnio.max = String(anioMax);
      inputAnio.value = String(Math.min(anioMax, ahora.getFullYear() - 1)); // año cerrado por defecto

      // Mes
      const labelMes = document.createElement('label');
      labelMes.textContent = t('irrMonth', 'Mes');
      const sliderMes = document.createElement('input');
      sliderMes.type = 'range';
      sliderMes.min = '1'; sliderMes.max = '12'; sliderMes.step = '1';
      sliderMes.value = String(ahora.getMonth() + 1);
      const leyendaMes = document.createElement('div');
      leyendaMes.className = 'irr-leyenda';
      ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].forEach((l) => {
        const s = document.createElement('span'); s.textContent = l; leyendaMes.appendChild(s);
      });

      // Día
      const labelDia = document.createElement('label');
      labelDia.textContent = t('irrDay', 'Día');
      const sliderDia = document.createElement('input');
      sliderDia.type = 'range';
      sliderDia.min = '1'; sliderDia.max = '31'; sliderDia.step = '1';
      sliderDia.value = String(Math.min(15, ahora.getDate()));
      const leyendaDia = document.createElement('div');
      leyendaDia.className = 'irr-leyenda';
      const spanDia = document.createElement('span');
      leyendaDia.append('Día del mes: ', spanDia);

      // Hora
      const labelHora = document.createElement('label');
      labelHora.textContent = t('irrHour', 'Hora (UTC)');
      const sliderHora = document.createElement('input');
      sliderHora.type = 'range';
      sliderHora.min = '0'; sliderHora.max = '23'; sliderHora.step = '1';
      sliderHora.value = '12';
      const leyendaHora = document.createElement('div');
      leyendaHora.className = 'irr-leyenda';
      const spanHora = document.createElement('span');
      leyendaHora.append('Hora del día: ', spanHora);

      const resumenEl = document.createElement('div');
      resumenEl.id = 'irrResumen';
      resumenEl.textContent = t('irrAnnualLoading', 'Cargando resumen del año…');

      const leyendaAtenuacion = document.createElement('div');
      leyendaAtenuacion.id = 'irrLeyendaAtenuacion';
      function pintarLeyendaAtenuacion() {
        leyendaAtenuacion.innerHTML =
          `${t('irrExposureFactor', 'Factor de exposición')}:<br>` +
          `<span class="irr-linea"><i class="irr-punto" style="background:${ATENUACION.UMBRA.color}"></i>${t('irrUmbra', 'Umbra (edificio)')} (×${ATENUACION.UMBRA.factor})</span><br>` +
          `<span class="irr-linea"><i class="irr-punto" style="background:${ATENUACION.PENUMBRA.color}"></i>${t('irrPenumbra', 'Penumbra (árbol)')} (×${ATENUACION.PENUMBRA.factor})</span><br>` +
          `<span class="irr-linea"><i class="irr-punto" style="background:${ATENUACION.SOL.color}"></i>${t('irrSol', 'Sol directo')} (×${ATENUACION.SOL.factor})</span>`;
      }
      pintarLeyendaAtenuacion();

      estadoEl = document.createElement('div');
      estadoEl.id = 'irrEstado';

      function diasDelMes(anio, mes) { return new Date(anio, mes, 0).getDate(); }

      function fechaHoraValidos() {
        const anio = Math.max(CONFIG.anioMinimo, Math.min(anioMax, Number(inputAnio.value) || anioMax));
        let mes = Number(sliderMes.value);
        if (anio === anioMax) mes = Math.min(mes, ahora.getMonth() + 1);
        const maxDia = diasDelMes(anio, mes);
        sliderDia.max = String(maxDia);
        let dia = Math.min(Number(sliderDia.value), maxDia);
        if (anio === anioMax && mes === ahora.getMonth() + 1) dia = Math.min(dia, ahora.getDate());
        const hora = Number(sliderHora.value);
        return { anio, mes, dia, hora };
      }

      let temporizador = null;
      function onCambio() {
        const { anio, mes, dia, hora } = fechaHoraValidos();
        sliderDia.value = String(dia);
        spanDia.textContent = `${dia}/${mes}/${anio}`;
        spanHora.textContent = `${String(hora).padStart(2, '0')}:00 UTC`;
        if (!capaActiva) return;
        clearTimeout(temporizador);
        temporizador = setTimeout(() => aplicarIrradiancia(anio, mes, dia, hora), 250);
      }
      [sliderMes, sliderDia, sliderHora].forEach((s) => s.addEventListener('input', onCambio));
      inputAnio.addEventListener('change', () => {
        cargarResumenAnual(Number(inputAnio.value));
        onCambio();
      });

      btnCerrar.addEventListener('click', () => {
        if (capaActiva) document.getElementById('rsBtnIrradiacion')?.click();
      });

      panelEl.append(
        cabecera,
        labelAnio, inputAnio,
        labelMes, sliderMes, leyendaMes,
        labelDia, sliderDia, leyendaDia,
        labelHora, sliderHora, leyendaHora,
        resumenEl, leyendaAtenuacion, estadoEl
      );
      contenedorMapa.appendChild(panelEl);

      // Inicializar etiquetas
      onCambio();

      return { inputAnio, resumenEl, fechaHoraValidos, onCambio };
    }

    const { inputAnio, resumenEl, fechaHoraValidos, onCambio } = construirPanel();

    // ---- Resumen anual: reutiliza la MISMA petición diaria del año ----
    async function cargarResumenAnual(anio) {
      resumenEl.textContent = t('irrAnnualLoading', 'Cargando resumen del año…');
      try {
        const porDia = await obtenerAnioDiario(anio);
        const valores = Object.values(porDia).map((d) => d.ghi);
        if (!valores.length) throw new Error('sin datos');
        const media = valores.reduce((a, b) => a + b, 0) / valores.length;
        const mejor = valores.reduce((a, b) => Math.max(a, b));
        const peor = valores.reduce((a, b) => Math.min(a, b));
        resumenEl.innerHTML =
          `${t('irrAnnual', 'Irradiación anual')}: <b>${Math.round(media * 365)} kWh/m²</b> (${valores.length} ${t('irrRealDays', 'días reales')})<br>` +
          `${t('irrBestDay', 'Mejor día')}: <b>${mejor.toFixed(2)}</b> · ${t('irrWorstDay', 'peor')}: <b>${peor.toFixed(2)} kWh/m²</b><br>` +
          `${t('irrPeakHours', 'Horas de sol pico')}: <b>${media.toFixed(1)} h</b>`;
      } catch (e) {
        resumenEl.textContent = t('irrError', 'No se ha podido calcular el resumen del año.');
      }
    }

    // Retraducir toda la capa cuando cambie el idioma (evento de i18n.js)
    document.addEventListener('langChanged', () => {
      const btn = document.getElementById('rsBtnIrradiacion');
      if (btn) btn.textContent = t('irrLayerBtn', 'Irradiación Solar');
      if (panelEl) {
        const labels = panelEl.querySelectorAll('label');
        const textos = ['irrPanelTitle', 'irrYear', 'irrMonth', 'irrDay', 'irrHour'];
        labels.forEach((el, i) => { if (textos[i]) el.textContent = t(textos[i], el.textContent); });
      }
      const ley = document.getElementById('irrLeyendaAtenuacion');
      if (ley) ley.innerHTML =
        `${t('irrExposureFactor', 'Factor de exposición')}:<br>` +
        `${t('irrUmbra', 'Umbra (edificio)')} (×${ATENUACION.UMBRA.factor})<br>` +
        `${t('irrPenumbra', 'Penumbra (árbol)')} (×${ATENUACION.PENUMBRA.factor})<br>` +
        `${t('irrSol', 'Sol directo')} (×${ATENUACION.SOL.factor})`;
      onCambio(); // repinta etiquetas de día/hora y, si la capa está activa, recarga el estado
      if (capaActiva) {
        const { anio } = fechaHoraValidos();
        cargarResumenAnual(anio);
      }
    });

    // El botón ya lo crea SIEMPRE shadows-route.js (fijo en el mapa); aquí
    // solo lo "adoptamos": texto traducido + lógica de la capa.
    function inyectarBotonCapa() {
      const btn = document.getElementById('rsBtnIrradiacion');
      if (!btn || btn.dataset.listo === '1') return false;
      btn.dataset.listo = '1';
      delete btn.dataset.cargando;
      btn.textContent = t('irrLayerBtn', 'Irradiación Solar');
      btn.addEventListener('click', () => {
        capaActiva = !capaActiva;
        btn.classList.toggle('rs-activo', capaActiva);
        panelEl.classList.toggle('rs-visible', capaActiva);
        if (capaActiva) {
          const { anio, mes, dia, hora } = fechaHoraValidos();
          cargarResumenAnual(anio);
          aplicarIrradiancia(anio, mes, dia, hora);
          activarInspeccionPorClic();
        } else {
          restaurarColoresOriginales();
          mostrarEstadoPanel('');
          desactivarInspeccionPorClic();
        }
      });
      // Si el botón fijo cargó este módulo bajo demanda, el primer clic del
      // usuario ya significaba "actívalo": lo cumplimos ahora que estamos listos.
      if (btn.dataset.autoActivar === '1') {
        delete btn.dataset.autoActivar;
        btn.click();
      }
      return true;
    }
    // Reintenta hasta que el botón fijo exista (antes, si el panel no estaba
    // en ese momento, el botón no aparecía jamás).
    (function intentarBoton(n) {
      if (inyectarBotonCapa()) return;
      if (n > 0) setTimeout(() => intentarBoton(n - 1), 400);
    })(50);

    // ================= INSPECCIÓN POR CLIC =================
    let popupInspeccion = null;

    async function alClicInspeccionar(e) {
      const atenuacion = clasificarPunto(e.lngLat);
      const { anio, mes, dia, hora } = fechaHoraValidos();

      let bloqueHistorico = `<i>${t('irrLoading', 'consultando…')}</i>`;
      try {
        const porDia = await obtenerAnioDiario(anio);
        const datoDia = porDia[claveFecha(anio, mes, dia)];
        let ghiHora = null, cieloHora = null;
        try {
          const datoHora = (await obtenerDiaHorario(anio, mes, dia))[hora];
          if (datoHora) { ghiHora = datoHora.ghi; cieloHora = datoHora.cieloDespejado; }
        } catch (err) { /* sin serie horaria */ }

        if (datoDia) {
          // Exposición efectiva = irradiancia horaria × multiplicador de atenuación
          const base = ghiHora != null ? ghiHora : datoDia.ghi * 1000 / 12; // Wh/m² aprox. si no hay hora
          const exposicion = base * (atenuacion.factor / ATENUACION.SOL.factor);
          const nubosidad = cieloHora > 0 ? ` · ${(100 * ghiHora / cieloHora).toFixed(0)} % del cielo despejado` : '';
          bloqueHistorico =
            `<b>${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}, ${String(hora).padStart(2, '0')}:00 UTC</b><br>` +
            (ghiHora != null ? `Hora: <b>${ghiHora.toFixed(0)} Wh/m²</b>${nubosidad}<br>` : '') +
            `Día completo: <b>${datoDia.ghi.toFixed(2)} kWh/m²</b><br>` +
            `${t('irrEffectiveExposure', 'Exposición efectiva aquí')}: <b>${exposicion.toFixed(0)} Wh/m²</b>`;
        }
      } catch (err) {
        bloqueHistorico = t('irrNoData', 'Sin dato NASA para esa fecha.');
      }

      const html = `
        <div style="font-family:inherit;font-size:12.5px;line-height:1.55;max-width:240px;">
          <b style="color:${atenuacion.color}">${atenuacion.etiqueta}</b><br>
          <span style="color:#999;">${t('irrExposureFactor', 'Factor de exposición')} ×${atenuacion.factor.toFixed(1)}</span><br>
          <hr style="border:none;border-top:1px dashed #ccc;margin:5px 0;">
          ${bloqueHistorico}
        </div>`;

      if (popupInspeccion) popupInspeccion.remove();
      popupInspeccion = new maplibregl.Popup({ closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    }

    function activarInspeccionPorClic() {
      map.on('click', alClicInspeccionar);
      map.getCanvas().style.cursor = 'crosshair';
    }
    function desactivarInspeccionPorClic() {
      map.off('click', alClicInspeccionar);
      map.getCanvas().style.cursor = '';
      if (popupInspeccion) { popupInspeccion.remove(); popupInspeccion = null; }
    }
  }
})();