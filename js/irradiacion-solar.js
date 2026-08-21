/* ============================================================
   CAPA DE IRRADIACIÓN SOLAR REAL — NASA POWER API
   ------------------------------------------------------------
   Archivo aparte, mismo patrón que arboles-globales.js: se
   engancha a window.manolitAireMap (ya expuesto por
   shadows-route.js) y no toca ningún archivo existente.

   AVISO HONESTO: este proyecto usa MapLibre GL JS, no Three.js
   — no existe tal archivo en esta conversación. MapLibre no deja
   escribir shaders GLSL propios por vértice, así que "Lambert en
   shaders" no es literal aquí. Lo que SÍ hace este archivo, y es
   el equivalente funcional real:
     1. Pide a la NASA POWER API la irradiancia solar histórica
        real (ALLSKY_SFC_SW_DWN) para Sevilla, mes y año elegidos.
     2. La combina con la altura solar real de ese día (vía
        SunCalc) — esa combinación ES la ley del coseno de Lambert
        aplicada al resultado (radiación_horizontal × sin(altura)
        ≈ radiación × cos(cenit)).
     3. Con ese número final, recolorea edificios, árboles y
        (si tu estilo del mapa la tiene) la capa de terreno, con
        una rampa: blanco/amarillo (pico de calor) → naranja →
        rojo → morado/azul violeta (frío/sombra).
   Al desactivar la capa, restaura los colores originales tal
   cual estaban antes de tocarlos.
   ============================================================ */

'use strict';

(function () {
  const CONFIG = {
    lat: 37.3891,
    lon: -5.9845,
    nasaPowerUrl: 'https://power.larc.nasa.gov/api/temporal/monthly/point',
    parametroNasa: 'ALLSKY_SFC_SW_DWN', // irradiancia global horizontal, kWh/m²/día (correcto; ALLSKY_SNDW_LW no existe)
    anioMinimo: 1981,
    esperaMapaMs: 15000,
  };

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
        const r = Math.round(a.color[0] + (b.color[0] - a.color[0]) * f);
        const g = Math.round(a.color[1] + (b.color[1] - a.color[1]) * f);
        const bl = Math.round(a.color[2] + (b.color[2] - a.color[2]) * f);
        return `rgb(${r},${g},${bl})`;
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

    // ---- Identificar capas a recolorear: edificios (de shadows-route.js), árboles (de arboles-globales.js) ----
    function capaEdificios() {
      const capas = map.getStyle().layers || [];
      return capas.find((l) => l.type === 'fill-extrusion' && /building/i.test(l.id));
    }
    function capaTerrenoOSuelo() {
      // Muchos estilos de MapLibre traen una capa 'land' o 'landuse' tipo fill.
      const capas = map.getStyle().layers || [];
      return capas.find((l) => l.type === 'fill' && /^(land|landuse|landcover)/i.test(l.id));
    }

    const capasRecoloreables = [
      { id: () => capaEdificios()?.id, prop: 'fill-extrusion-color' },
      { id: () => 'capa-arboles-globales-3d', prop: 'fill-extrusion-color' },
      { id: () => capaTerrenoOSuelo()?.id, prop: 'fill-color' },
    ];

    const coloresOriginales = new Map(); // id -> valor original de paint (para restaurar)

    function guardarColorOriginal(id, prop) {
      if (coloresOriginales.has(id)) return;
      try {
        coloresOriginales.set(id, map.getPaintProperty(id, prop));
      } catch (e) { /* capa no lista todavía */ }
    }

    function aplicarColorATodasLasCapas(colorCss) {
      capasRecoloreables.forEach(({ id, prop }) => {
        const capaId = id();
        if (!capaId || !map.getLayer(capaId)) return;
        guardarColorOriginal(capaId, prop);
        try {
          map.setPaintProperty(capaId, prop, colorCss);
        } catch (e) { /* la capa puede no soportar ese paint todavía */ }
      });
    }

    function restaurarColoresOriginales() {
      capasRecoloreables.forEach(({ id, prop }) => {
        const capaId = id();
        if (!capaId || !map.getLayer(capaId)) return;
        if (coloresOriginales.has(capaId)) {
          try { map.setPaintProperty(capaId, prop, coloresOriginales.get(capaId)); } catch (e) { }
        }
      });
    }

    // ---- NASA POWER: consulta con caché en memoria (año-mes) ----
    const cacheNasa = new Map();

    async function obtenerIrradianciaHistorica(anio, mes) {
      const clave = `${anio}-${mes}`;
      if (cacheNasa.has(clave)) return cacheNasa.get(clave);

      const url = new URL(CONFIG.nasaPowerUrl);
      url.searchParams.set('parameters', CONFIG.parametroNasa);
      url.searchParams.set('community', 'RE');
      url.searchParams.set('longitude', CONFIG.lon);
      url.searchParams.set('latitude', CONFIG.lat);
      url.searchParams.set('start', String(anio));
      url.searchParams.set('end', String(anio));
      url.searchParams.set('format', 'JSON');

      const r = await fetch(url.toString());
      if (!r.ok) throw new Error(`NASA POWER HTTP ${r.status}`);
      const datos = await r.json();

      // La respuesta mensual trae claves tipo "202401".."202412" y "202413" (media anual)
      const serie = datos?.properties?.parameter?.[CONFIG.parametroNasa];
      if (!serie) throw new Error('La NASA no ha devuelto la serie esperada');
      const claveMes = `${anio}${String(mes).padStart(2, '0')}`;
      const valor = serie[claveMes];
      if (valor == null || valor === -999) throw new Error(`Sin dato NASA para ${claveMes}`);

      cacheNasa.set(clave, valor);
      return valor; // kWh/m²/día
    }

    // Rango histórico aproximado de referencia para normalizar el color (kWh/m²/día en Sevilla)
    const IRRADIANCIA_MIN_REF = 1.5; // días de invierno flojos
    const IRRADIANCIA_MAX_REF = 8.5; // picos de verano

    async function aplicarIrradiancia(anio, mes) {
      mostrarEstadoPanel('Consultando NASA POWER…');
      try {
        const irradianciaDiaria = await obtenerIrradianciaHistorica(anio, mes);

        // Ley del coseno de Lambert: la irradiancia efectiva depende del ángulo de
        // incidencia del sol. Usamos la altura solar real (SunCalc) al mediodía
        // solar del día 15 de ese mes/año como factor multiplicador —
        // radiación_horizontal × sin(altura_solar) ≈ radiación × cos(cenit).
        const fecha = new Date(Date.UTC(anio, mes - 1, 15, 12, 0, 0));
        const posSol = SunCalc.getPosition(fecha, CONFIG.lat, CONFIG.lon);
        const factorLambert = Math.max(0, Math.sin(Math.max(posSol.altitude, 0)));

        const irradianciaEfectiva = irradianciaDiaria * factorLambert;
        const t = (irradianciaEfectiva - IRRADIANCIA_MIN_REF) / (IRRADIANCIA_MAX_REF - IRRADIANCIA_MIN_REF);
        const colorFinal = interpolarColor(t);

        aplicarColorATodasLasCapas(colorFinal);
        mostrarEstadoPanel(`${irradianciaDiaria.toFixed(2)} kWh/m²/día (NASA POWER) · altura solar ${(posSol.altitude * 180 / Math.PI).toFixed(1)}°`);
      } catch (e) {
        console.warn('[irradiacion-solar]', e.message);
        mostrarEstadoPanel('No se ha podido consultar la NASA ahora mismo. Reintenta en unos segundos.', true);
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
          position:absolute; right:12px; top:60px; z-index:6; width:230px;
          background:linear-gradient(160deg,#262c38,#1b2029 70%);
          border:1px solid #ffffff1f; border-right:2px solid #c98a4b;
          border-radius:3px 12px 3px 12px; padding:12px 14px; color:#e9e4d8;
          font-family:inherit; box-shadow:0 8px 18px rgba(0,0,0,.28); display:none;
        }
        #irrPanel.rs-visible{ display:block; }
        #irrPanel label{ font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; color:#c98a4b; display:block; margin-bottom:4px; }
        #irrPanel select{
          width:100%; margin-bottom:8px; background:#00000026; color:#e9e4d8;
          border:1px solid #ffffff1f; border-radius:2px; padding:5px; font-family:inherit; font-size:12px;
        }
        #irrEstado{ font-size:10.5px; margin-top:4px; line-height:1.4; }
        @media (max-width:480px){ #irrPanel{ width:calc(100vw - 24px); right:12px; } }
      `;
      document.head.appendChild(estilo);

      panelEl = document.createElement('div');
      panelEl.id = 'irrPanel';

      const labelAnio = document.createElement('label');
      labelAnio.textContent = 'Año histórico';
      const selectAnio = document.createElement('select');
      const anioActual = new Date().getFullYear();
      for (let a = anioActual; a >= CONFIG.anioMinimo; a--) {
        const opt = document.createElement('option');
        opt.value = String(a);
        opt.textContent = String(a);
        selectAnio.appendChild(opt);
      }

      const labelMes = document.createElement('label');
      labelMes.textContent = 'Mes';
      const selectMes = document.createElement('select');
      const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      nombresMeses.forEach((nombre, i) => {
        const opt = document.createElement('option');
        opt.value = String(i + 1);
        opt.textContent = nombre;
        selectMes.appendChild(opt);
      });
      selectMes.value = String(new Date().getMonth() + 1);

      estadoEl = document.createElement('div');
      estadoEl.id = 'irrEstado';

      function onCambio() {
        if (!capaActiva) return;
        aplicarIrradiancia(Number(selectAnio.value), Number(selectMes.value));
      }
      selectAnio.addEventListener('change', onCambio);
      selectMes.addEventListener('change', onCambio);

      panelEl.append(labelAnio, selectAnio, labelMes, selectMes, estadoEl);
      contenedorMapa.appendChild(panelEl);

      return { selectAnio, selectMes };
    }

    const { selectAnio, selectMes } = construirPanel();

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
          aplicarIrradiancia(Number(selectAnio.value), Number(selectMes.value));
        } else {
          restaurarColoresOriginales();
          mostrarEstadoPanel('');
        }
      });
      panelControles.appendChild(btn);
    }
    setTimeout(inyectarBotonCapa, 600);
  }
})();