/* ============================================================
   CAPA DE IRRADIACIÓN SOLAR REAL — NASA POWER API  (v2 mejorada)
   ------------------------------------------------------------
   Se engancha a window.manolitAireMap (expuesto por
   shadows-route.js) y no toca ningún archivo existente.

   Qué hace:
     1. Pide a la NASA POWER API, EN UNA SOLA PETICIÓN POR AÑO,
        la irradiancia global horizontal (ALLSKY_SFC_SW_DWN),
        la directa normal (ALLSKY_SFC_SW_DNI) y la de cielo
        despejado (CLRSKY_SFC_SW_DWN) para Sevilla.
     2. Aplica la ley del coseno de Lambert CORRECTAMENTE:
        la GHI horizontal ya incluye el ángulo de incidencia, así
        que no hay que multiplicarla otra vez por sin(altura).
        El coseno solo se aplica a la componente DIRECTA al
        transponer al plano de cada superficie:
          G_tilt = DNI·cos(ángulo_incidencia) + DHI·(1+cosβ)/2
        (modelo de difusa isotrópica, el estándar de la norma
        IEC 61724 / ASHRAE para transposición de irradiancia).
     3. Normaliza el color con el índice de claridad Kt
        (GHI / radiación extraterrestre), que es físico y válido
        para cualquier mes/año, en vez de constantes fijas.
     4. Recolorea edificios, árboles y suelo con la rampa
        violeta (sombra/frío) → rojo → naranja → blanco (pico).
     Al desactivar la capa restaura los colores originales.
   ============================================================ */

'use strict';

(function () {
  const CONFIG = {
    lat: 37.3891,
    lon: -5.9845,
    nasaPowerUrl: 'https://power.larc.nasa.gov/api/temporal/monthly/point',
    // GHI horizontal, DNI y cielo despejado — todo en kWh/m²/día
    parametrosNasa: ['ALLSKY_SFC_SW_DWN', 'ALLSKY_SFC_SW_DNI', 'CLRSKY_SFC_SW_DWN'],
    anioMinimo: 1981,
    esperaMapaMs: 15000,
    inclinacionPanelGrados: 30, // inclinación típica óptima en Sevilla (~latitud − 7°)
  };

  const CONSTANTE_SOLAR = 1367; // W/m², radiación solar extraterrestre

  // Rampa de color: de frío/sombra a pico de calor histórico
  const RAMPA = [
    { t: 0.0, color: [76, 0, 130] },    // morado/azul violeta — frío, sombra
    { t: 0.35, color: [200, 30, 30] },  // rojo
    { t: 0.65, color: [255, 140, 0] },  // naranja
    { t: 1.0, color: [255, 250, 200] }, // blanco/amarillo — pico histórico de calor
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

  esperarMapa().then(iniciar).catch((e) => console.warn('[irradiacion-solar]', e.message));

  async function iniciar(map) {
    const contenedorMapa = map.getContainer();

    // ---- Capas a recolorear: edificios (shadows-route.js), árboles (arboles-globales.js), suelo ----
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

    const coloresOriginales = new Map(); // id -> valor original de paint

    function guardarColorOriginal(id, prop) {
      if (coloresOriginales.has(id)) return;
      try { coloresOriginales.set(id, map.getPaintProperty(id, prop)); }
      catch (e) { /* capa no lista todavía */ }
    }

    function aplicarColorATodasLasCapas(colorCss) {
      capasRecoloreables.forEach(({ id, prop }) => {
        const capaId = id();
        if (!capaId || !map.getLayer(capaId)) return;
        guardarColorOriginal(capaId, prop);
        try { map.setPaintProperty(capaId, prop, colorCss); }
        catch (e) { /* la capa puede no soportar ese paint todavía */ }
      });
    }

    function restaurarColoresOriginales() {
      capasRecoloreables.forEach(({ id, prop }) => {
        const capaId = id();
        if (!capaId || !map.getLayer(capaId) || !coloresOriginales.has(capaId)) return;
        try { map.setPaintProperty(capaId, prop, coloresOriginales.get(capaId)); } catch (e) { }
      });
    }

    // ---- NASA POWER: UNA petición por año devuelve los 12 meses ----
    // Cacheamos el año completo; así el resumen anual no repite 12 llamadas.
    const cacheAnual = new Map(); // anio -> { [mes]: { ghi, dni, cieloDespejado } }

    async function obtenerAnioCompleto(anio) {
      if (cacheAnual.has(anio)) return cacheAnual.get(anio);

      const url = new URL(CONFIG.nasaPowerUrl);
      url.searchParams.set('parameters', CONFIG.parametrosNasa.join(','));
      url.searchParams.set('community', 'RE');
      url.searchParams.set('longitude', CONFIG.lon);
      url.searchParams.set('latitude', CONFIG.lat);
      url.searchParams.set('start', String(anio));
      url.searchParams.set('end', String(anio));
      url.searchParams.set('format', 'JSON');

      const r = await fetch(url.toString());
      if (!r.ok) throw new Error(`NASA POWER HTTP ${r.status}`);
      const datos = await r.json();
      const series = datos?.properties?.parameter;
      if (!series?.[CONFIG.parametrosNasa[0]]) throw new Error('La NASA no ha devuelto la serie esperada');

      const porMes = {};
      for (let mes = 1; mes <= 12; mes++) {
        const clave = `${anio}${String(mes).padStart(2, '0')}`;
        const ghi = series[CONFIG.parametrosNasa[0]]?.[clave];
        const dni = series[CONFIG.parametrosNasa[1]]?.[clave];
        const cielo = series[CONFIG.parametrosNasa[2]]?.[clave];
        if (ghi == null || ghi === -999) continue; // mes sin dato (p. ej. futuro)
        porMes[mes] = {
          ghi,
          dni: dni != null && dni !== -999 ? dni : null,
          cieloDespejado: cielo != null && cielo !== -999 ? cielo : null,
        };
      }
      cacheAnual.set(anio, porMes);
      return porMes;
    }

    async function obtenerIrradianciaHistorica(anio, mes) {
      const porMes = await obtenerAnioCompleto(anio);
      const dato = porMes[mes];
      if (!dato) throw new Error(`Sin dato NASA para ${anio}-${String(mes).padStart(2, '0')}`);
      return dato;
    }

    // ---- Física solar ----

    // Radiación extraterrestre horizontal del día 15 del mes (kWh/m²/día),
    // integrando la ecuación de Spencer sobre las horas de sol.
    function radiacionExtraterrestreDiaria(anio, mes) {
      const diaJuliano = Math.floor((Date.UTC(anio, mes - 1, 15) - Date.UTC(anio, 0, 1)) / 86400000) + 1;
      const phi = (CONFIG.lat * Math.PI) / 180;
      const delta = ((23.45 * Math.PI) / 180) * Math.sin(((2 * Math.PI) * (284 + diaJuliano)) / 365);
      const omegaS = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
      const e0 = 1 + 0.033 * Math.cos((2 * Math.PI * diaJuliano) / 365);
      // kJ/m²/día -> kWh/m²/día
      return ((24 * 3600 * CONSTANTE_SOLAR * e0) / Math.PI) *
        (omegaS * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(omegaS)) / 3.6e6;
    }

    // Transposición a plano inclinado (Lambert bien aplicado):
    //   la directa se proyecta con cos(θ), la difusa con (1+cosβ)/2.
    // La GHI horizontal NO se vuelve a multiplicar por sin(altura):
    // ese ángulo ya está dentro del dato.
    function irradianciaEnPlanoInclinado(ghi, dni, alturaSolarRad, acimutSolRad) {
      const beta = (CONFIG.inclinacionPanelGrados * Math.PI) / 180;
      const sinAlt = Math.max(Math.sin(alturaSolarRad), 0.05);
      // Difusa horizontal = GHI − directa horizontal
      const directaHorizontal = dni != null ? dni * sinAlt : ghi * 0.7; // si no hay DNI, estimación 70/30
      const dhi = Math.max(0, ghi - directaHorizontal);

      // Ángulo de incidencia sobre el panel (panel mirando al sur, acimut 0 en SunCalc = sur)
      const cosIncidencia = Math.max(0,
        Math.sin(alturaSolarRad) * Math.cos(beta) +
        Math.cos(alturaSolarRad) * Math.sin(beta) * Math.cos(acimutSolRad));
      const factorRb = sinAlt > 0 ? cosIncidencia / sinAlt : 0;

      const directaPlano = dni != null ? dni * cosIncidencia : directaHorizontal * factorRb;
      const difusaPlano = dhi * (1 + Math.cos(beta)) / 2;
      return { total: directaPlano + difusaPlano, directa: directaPlano, difusa: difusaPlano };
    }

    async function aplicarIrradiancia(anio, mes) {
      mostrarEstadoPanel('Consultando NASA POWER…');
      try {
        if (typeof SunCalc === 'undefined') throw new Error('SunCalc no está cargado');
        const { ghi, dni, cieloDespejado } = await obtenerIrradianciaHistorica(anio, mes);

        // Altura solar real al mediodía solar del día 15 (SunCalc)
        const fecha = new Date(Date.UTC(anio, mes - 1, 15, 12, 0, 0));
        const posSol = SunCalc.getPosition(fecha, CONFIG.lat, CONFIG.lon);

        // Índice de claridad Kt = GHI / extraterrestre (0 = cubierto, ~0.75 = despejado)
        const kt = ghi / radiacionExtraterrestreDiaria(anio, mes);
        // El color responde al Kt: físicamente comparable entre meses y años
        const colorFinal = interpolarColor((kt - 0.25) / 0.55);

        // Plano inclinado con Lambert correcto (solo a la directa)
        const plano = irradianciaEnPlanoInclinado(ghi, dni, Math.max(posSol.altitude, 0), posSol.azimuth);

        aplicarColorATodasLasCapas(colorFinal);
        mostrarEstadoPanel(
          `${ghi.toFixed(2)} kWh/m²/día (horizontal) · plano ${CONFIG.inclinacionPanelGrados}°: ${plano.total.toFixed(2)}` +
          `${cieloDespejado != null ? ` · cielo despejado ${cieloDespejado.toFixed(2)}` : ''}` +
          ` · Kt ${kt.toFixed(2)} · sol ${(posSol.altitude * 180 / Math.PI).toFixed(1)}°`
        );
      } catch (e) {
        console.warn('[irradiacion-solar]', e.message);
        mostrarEstadoPanel(e.message.includes('SunCalc')
          ? 'Error interno: falta la librería SunCalc.'
          : 'No se ha podido consultar la NASA ahora mismo. Reintenta en unos segundos.', true);
      }
    }

    // ---- UI: botón de capa + panel de calendario histórico ----
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
          position:absolute; right:12px; top:108px; z-index:6; width:230px;
          background:linear-gradient(160deg,#262c38,#1b2029 70%);
          border:1px solid #ffffff1f; border-right:2px solid #c98a4b;
          border-radius:3px 12px 3px 12px; padding:12px 14px; color:#e9e4d8;
          font-family:inherit; box-shadow:0 8px 18px rgba(0,0,0,.28); display:none;
        }
        #irrPanel.rs-visible{ display:block; }
        #irrPanel .irr-cabecera{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        #irrPanel label{ font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; color:#c98a4b; display:block; margin-bottom:4px; }
        #irrCerrar{
          background:transparent; border:none; color:#999; font-size:16px; cursor:pointer; line-height:1; padding:0 2px;
        }
        #irrCerrar:hover{ color:#fff; }
        #irrPanel select, #irrPanel input[type=number]{
          width:100%; margin-bottom:8px; background:#00000026; color:#e9e4d8;
          border:1px solid #ffffff1f; border-radius:2px; padding:6px; font-family:inherit; font-size:13px;
          color-scheme: dark;
        }
        #irrMesSlider{
          -webkit-appearance:none; appearance:none; width:100%; height:16px; background:transparent; cursor:pointer; margin:4px 0 2px;
        }
        #irrMesSlider::-webkit-slider-runnable-track{ height:3px; background:#3a4150; border-radius:2px; }
        #irrMesSlider::-webkit-slider-thumb{
          -webkit-appearance:none; margin-top:-6px; width:15px; height:15px; border-radius:50%;
          background:#e7b06a; border:2px solid #1b2029; box-shadow:0 0 0 3px #e7b06a2e;
        }
        #irrMesEtiquetas{ display:flex; justify-content:space-between; font-size:9px; color:#8a8f9c; margin-bottom:6px; padding:0 2px; }
        #irrAnual{ font-size:10.5px; line-height:1.6; border-top:1px dashed #c98a4b55; margin-top:8px; padding-top:8px; }
        #irrAnual b{ color:#e7b06a; }
        #irrEstado{ font-size:10.5px; margin-top:4px; line-height:1.4; }
        @media (max-width:480px){ #irrPanel{ width:calc(100vw - 24px); right:12px; top:100px; } }
      `;
      document.head.appendChild(estilo);

      panelEl = document.createElement('div');
      panelEl.id = 'irrPanel';

      const cabecera = document.createElement('div');
      cabecera.className = 'irr-cabecera';
      const tituloCabecera = document.createElement('label');
      tituloCabecera.style.marginBottom = '0';
      tituloCabecera.textContent = 'Irradiación histórica';
      const btnCerrar = document.createElement('button');
      btnCerrar.type = 'button';
      btnCerrar.id = 'irrCerrar';
      btnCerrar.textContent = '×';
      btnCerrar.setAttribute('aria-label', 'Cerrar');
      cabecera.append(tituloCabecera, btnCerrar);

      const ahora = new Date();
      const anioMax = ahora.getFullYear();

      const labelAnio = document.createElement('label');
      labelAnio.textContent = 'Año';
      const inputAnio = document.createElement('input');
      inputAnio.type = 'number';
      inputAnio.min = String(CONFIG.anioMinimo);
      inputAnio.max = String(anioMax);
      inputAnio.value = String(anioMax);

      const labelMes = document.createElement('label');
      labelMes.textContent = 'Mes';
      const sliderMes = document.createElement('input');
      sliderMes.type = 'range';
      sliderMes.id = 'irrMesSlider';
      sliderMes.min = '1';
      sliderMes.max = '12';
      sliderMes.step = '1';
      sliderMes.value = String(ahora.getMonth() + 1);

      const etiquetasMeses = document.createElement('div');
      etiquetasMeses.id = 'irrMesEtiquetas';
      ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].forEach((letra) => {
        const span = document.createElement('span');
        span.textContent = letra;
        etiquetasMeses.appendChild(span);
      });

      const anualEl = document.createElement('div');
      anualEl.id = 'irrAnual';
      anualEl.textContent = 'Cargando resumen anual…';

      estadoEl = document.createElement('div');
      estadoEl.id = 'irrEstado';

      function mesAnioValidos() {
        const anio = Math.max(CONFIG.anioMinimo, Math.min(anioMax, Number(inputAnio.value) || anioMax));
        let mes = Number(sliderMes.value);
        if (anio === anioMax) mes = Math.min(mes, ahora.getMonth() + 1);
        return { anio, mes };
      }

      let temporizadorCambio = null;
      function onCambio() {
        if (!capaActiva) return;
        clearTimeout(temporizadorCambio);
        temporizadorCambio = setTimeout(() => {
          const { anio, mes } = mesAnioValidos();
          sliderMes.value = String(mes);
          aplicarIrradiancia(anio, mes);
        }, 250);
      }
      sliderMes.addEventListener('input', onCambio);
      inputAnio.addEventListener('change', () => { cargarResumenAnual(Number(inputAnio.value)); onCambio(); });

      btnCerrar.addEventListener('click', () => {
        if (capaActiva) document.getElementById('rsBtnIrradiacion')?.click();
      });

      panelEl.append(cabecera, labelAnio, inputAnio, labelMes, sliderMes, etiquetasMeses, anualEl, estadoEl);
      contenedorMapa.appendChild(panelEl);

      return { inputAnio, sliderMes, anualEl, mesAnioValidos };
    }

    const { inputAnio, sliderMes, anualEl, mesAnioValidos } = construirPanel();

    // ---- Resumen anual: reutiliza la MISMA petición por año (sin 12 llamadas) ----
    async function cargarResumenAnual(anio) {
      anualEl.textContent = 'Cargando resumen anual…';
      try {
        const porMes = await obtenerAnioCompleto(anio);
        const valores = Object.values(porMes).map((d) => d.ghi);
        if (!valores.length) throw new Error('sin datos');
        const mediaDiaria = valores.reduce((a, b) => a + b, 0) / valores.length;
        anualEl.innerHTML =
          `Irradiancia anual: <b>${Math.round(mediaDiaria * 365)} kWh/m²</b><br>` +
          `Horas de sol pico: <b>${mediaDiaria.toFixed(1)} h/día</b>`;
      } catch (e) {
        anualEl.textContent = 'No se ha podido calcular el resumen anual.';
      }
    }

    function inyectarBotonCapa() {
      const panelControles = document.getElementById('rsMapControls');
      if (!panelControles || document.getElementById('rsBtnIrradiacion')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'rsBtnIrradiacion';
      btn.textContent = 'Irradiación Solar';
      btn.addEventListener('click', () => {
        capaActiva = !capaActiva;
        btn.classList.toggle('rs-activo', capaActiva);
        panelEl.classList.toggle('rs-visible', capaActiva);
        if (capaActiva) {
          const { anio, mes } = mesAnioValidos();
          cargarResumenAnual(anio);
          aplicarIrradiancia(anio, mes);
          activarInspeccionPorClic();
        } else {
          restaurarColoresOriginales();
          mostrarEstadoPanel('');
          desactivarInspeccionPorClic();
        }
      });
      panelControles.appendChild(btn);
    }
    setTimeout(inyectarBotonCapa, 600);

    // ---- Inspección por clic: ¿sol directo o sombra AHORA en ese punto? ----
    let popupInspeccion = null;

    function puntoEnSombra(lngLat) {
      if (typeof turf === 'undefined') return false;
      const punto = turf.point([lngLat.lng, lngLat.lat]);
      for (const idFuente of ['sombras', 'arboles-globales-sombra']) {
        const fuente = map.getSource(idFuente);
        if (!fuente || !fuente._data) continue;
        for (const poligono of (fuente._data.features || [])) {
          try { if (turf.booleanPointInPolygon(punto, poligono)) return true; }
          catch (e) { /* geometría rara, se ignora */ }
        }
      }
      return false;
    }

    async function alClicInspeccionar(e) {
      const enSombra = puntoEnSombra(e.lngLat);
      const { anio, mes } = mesAnioValidos();
      let textoValor = 'consultando…';
      try {
        const { ghi } = await obtenerIrradianciaHistorica(anio, mes);
        textoValor = `${ghi.toFixed(2)} kWh/m²/día (media Sevilla, ${mes}/${anio})`;
      } catch (err) { textoValor = 'sin dato para ese mes'; }

      const html = `
        <div style="font-family:inherit;font-size:12.5px;line-height:1.5;">
          <b style="color:${enSombra ? '#7fa8c9' : '#e7b06a'}">${enSombra ? '🌥 En sombra ahora' : '☀️ Sol directo ahora'}</b><br>
          ${textoValor}
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