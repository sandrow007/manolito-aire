/* ============================================================
   ÁRBOLES GLOBALES + SOMBRA — capa independiente, vía Overpass/OSM
   (Versión adaptada: se sincroniza con el slider de hora de
   shadows-route.js sin modificar ese archivo)
   ============================================================ */

'use strict';

(function () {
  const CONFIG = {
    overpassUrls: [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
    ],
    overpassTimeoutS: 20,

    alturaMinimaM: 2,
    alturaEstimadaSinDatoM: 6,
    radioCopaPorDefectoM: 2.2,

    maxArbolesEnPantalla: 1000,
    maxArbolesConSombra: 300,
    loteSombraSize: 25,
    sincroSombraMs: 60 * 1000,
    esperaMoveendMs: 500,
    maxLadoConsultaKm: 3,
    cacheCeldasGrados: 0.01,
    esperaMapaMs: 15000,
  };

  // --- Estado propio de hora para sincronizarse con la UI de shadows-route ---
  let fechaBaseArboles = new Date();   // si no es solsticio, se usa esta fecha con el slider
  let esSolsticioArboles = false;      // true si se ha pulsado "Verano" o "Invierno"
  let minutosSlider = 0;               // minutos desde medianoche según el slider

  function cederAlNavegador() {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 120 });
      else setTimeout(resolve, 0);
    });
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

  esperarMapa().then(iniciar).catch((e) => console.warn('[arboles-globales]', e.message));

  async function iniciar(map) {

    function primeraCapaEdificiosOSuelo() {
      const capas = map.getStyle().layers || [];
      const edificios = capas.find((l) => l.type === 'fill-extrusion' && /building/i.test(l.id));
      return edificios ? edificios.id : undefined;
    }

    function asegurarCapas() {
      if (!map.getSource('arboles-globales-sombra')) {
        map.addSource('arboles-globales-sombra', { type: 'geojson', data: turf.featureCollection([]) });
        map.addLayer({
          id: 'capa-sombra-arboles-globales',
          type: 'fill',
          source: 'arboles-globales-sombra',
          paint: { 
            'fill-color': '#0d1f0d',   // Verde oscuro natural
            'fill-opacity': 0.35
          },
        }, primeraCapaEdificiosOSuelo());
      }
      if (!map.getSource('arboles-globales-copas')) {
        map.addSource('arboles-globales-copas', { type: 'geojson', data: turf.featureCollection([]) });
        map.addLayer({
          id: 'capa-arboles-globales-3d',
          type: 'fill-extrusion',
          source: 'arboles-globales-copas',
          paint: {
            'fill-extrusion-color': [
              'case',
              ['==', ['get', 'tipo'], 'tronco'], '#8b5a2b',
              ['==', ['get', 'tipo'], 'copa'], [
                'interpolate', ['linear'], ['get', 'altura'],
                3, '#7fb069',
                8, '#4f8a3d',
                15, '#2f5d2a',
              ],
              '#7fb069'
            ],
            'fill-extrusion-base': ['get', 'baseM'],
            'fill-extrusion-height': ['get', 'alturaTotalM'],
            'fill-extrusion-opacity': 0.92,
          },
        });
      }
    }

    console.info('[arboles-globales] enganchado al mapa correctamente, preparando capas...');
    if (map.loaded()) {
      asegurarCapas();
    } else {
      map.once('load', asegurarCapas);
    }

    let capaVisible = true;
    function inyectarToggle() {
      const panel = document.getElementById('rsMapControls');
      if (!panel || document.getElementById('rsBtnArboles')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'rsBtnArboles';
      btn.textContent = 'Árboles';
      btn.classList.add('rs-activo');
      btn.addEventListener('click', () => {
        capaVisible = !capaVisible;
        btn.classList.toggle('rs-activo', capaVisible);
        ['capa-arboles-globales-3d', 'capa-sombra-arboles-globales'].forEach((id) => {
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', capaVisible ? 'visible' : 'none');
        });
        if (capaVisible) cargarArbolesDeLaVista();
      });
      panel.appendChild(btn);
    }
    setTimeout(inyectarToggle, 500);

    let arbolesGrandes = [];
    const celdasConsultadas = new Set();
    let consultaEnCurso = false;

    function celdasDeVista(bounds) {
      const paso = CONFIG.cacheCeldasGrados;
      const celdas = [];
      const minLat = Math.floor(bounds.getSouth() / paso) * paso;
      const maxLat = Math.ceil(bounds.getNorth() / paso) * paso;
      const minLon = Math.floor(bounds.getWest() / paso) * paso;
      const maxLon = Math.ceil(bounds.getEast() / paso) * paso;
      for (let lat = minLat; lat < maxLat; lat += paso) {
        for (let lon = minLon; lon < maxLon; lon += paso) {
          celdas.push(`${lat.toFixed(3)},${lon.toFixed(3)}`);
        }
      }
      return celdas;
    }

    function anchoVistaKm(bounds) {
      return turf.distance(
        turf.point([bounds.getWest(), bounds.getCenter ? bounds.getCenter().lat : (bounds.getNorth() + bounds.getSouth()) / 2]),
        turf.point([bounds.getEast(), bounds.getCenter ? bounds.getCenter().lat : (bounds.getNorth() + bounds.getSouth()) / 2]),
        { units: 'kilometers' }
      );
    }

    async function consultarOverpass(bbox) {
      const query = `[out:json][timeout:${CONFIG.overpassTimeoutS}];(node["natural"="tree"](${bbox.join(',')}););out body;`;
      let ultimoError = null;
      for (const url of CONFIG.overpassUrls) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), CONFIG.overpassTimeoutS * 1000 + 3000);
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: 'data=' + encodeURIComponent(query),
            signal: controller.signal,
          });
          clearTimeout(id);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return await r.json();
        } catch (e) {
          ultimoError = e;
          continue;
        }
      }
      throw ultimoError || new Error('Overpass no disponible');
    }

    function leerNumero(tags, claves) {
      for (const clave of claves) {
        const v = tags?.[clave];
        if (v == null || v === '') continue;
        const n = parseFloat(String(v).replace(',', '.'));
        if (!Number.isNaN(n) && n > 0) return n;
      }
      return null;
    }

    function procesarElementoOSM(el) {
      if (el.type !== 'node' || el.lat == null || el.lon == null) return null;
      const tags = el.tags || {};
      const altura = leerNumero(tags, ['height']) || CONFIG.alturaEstimadaSinDatoM;
      const diametroCopa = leerNumero(tags, ['diameter_crown']);
      if (altura <= CONFIG.alturaMinimaM) return null;
      const radioCopaM = diametroCopa ? diametroCopa / 2 : CONFIG.radioCopaPorDefectoM;
      const nombre = tags.species || tags['species:es'] || tags.genus || 'Árbol';
      return { punto: turf.point([el.lon, el.lat]), altura, radioCopaM, nombre };
    }

    async function cargarArbolesDeLaVista() {
      if (!capaVisible || consultaEnCurso) return;
      const bounds = map.getBounds();
      if (anchoVistaKm(bounds) > CONFIG.maxLadoConsultaKm) {
        return;
      }

      const celdas = celdasDeVista(bounds).filter((c) => !celdasConsultadas.has(c));
      if (!celdas.length) { dibujarArbolesVisibles(); return; }
      celdas.forEach((c) => celdasConsultadas.add(c));

      consultaEnCurso = true;
      try {
        const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()];
        const datos = await consultarOverpass(bbox);
        const elementos = datos.elements || [];
        for (const el of elementos) {
          const arbol = procesarElementoOSM(el);
          if (arbol) arbolesGrandes.push(arbol);
          if (arbolesGrandes.length % 200 === 0) await cederAlNavegador();
        }
      } catch (e) {
        console.warn('[arboles-globales] Overpass no disponible ahora mismo:', e.message);
        celdas.forEach((c) => celdasConsultadas.delete(c));
      } finally {
        consultaEnCurso = false;
      }

      dibujarArbolesVisibles();
      recalcularSombrasArboles();
    }

    function dibujarArbolesVisibles() {
      if (!map.getSource('arboles-globales-copas') || !capaVisible) return [];
      const b = map.getBounds();
      const enVista = arbolesGrandes.filter((a) => {
        const [lon, lat] = a.punto.geometry.coordinates;
        return lon >= b.getWest() && lon <= b.getEast() && lat >= b.getSouth() && lat <= b.getNorth();
      }).slice(0, CONFIG.maxArbolesEnPantalla);

      const features = [];
      for (const a of enVista) {
        const alturaTroncoM = Math.max(1, a.altura * 0.35);
        const alturaCopaInferiorM = a.altura * 0.40;
        const alturaCopaSuperiorM = a.altura - alturaTroncoM - alturaCopaInferiorM;
        const radioTroncoM = Math.max(0.15, a.radioCopaM * 0.15);

        const tronco = turf.circle(a.punto, radioTroncoM / 1000, { units: 'kilometers', steps: 8 });
        tronco.properties = { altura: a.altura, baseM: 0, alturaTotalM: alturaTroncoM, nombre: a.nombre, tipo: 'tronco' };
        features.push(tronco);

        const copaInferior = turf.circle(a.punto, a.radioCopaM / 1000, { units: 'kilometers', steps: 14 });
        copaInferior.properties = { altura: a.altura, baseM: alturaTroncoM, alturaTotalM: alturaTroncoM + alturaCopaInferiorM, nombre: a.nombre, tipo: 'copa' };
        features.push(copaInferior);

        const copaSuperior = turf.circle(a.punto, (a.radioCopaM * 0.65) / 1000, { units: 'kilometers', steps: 14 });
        copaSuperior.properties = { altura: a.altura, baseM: alturaTroncoM + alturaCopaInferiorM, alturaTotalM: a.altura, nombre: a.nombre, tipo: 'copa' };
        features.push(copaSuperior);
      }
      map.getSource('arboles-globales-copas').setData(turf.featureCollection(features));
      return enVista;
    }

    function sombraDeCopa(circuloCopa, distanciaKm, bearingSombra) {
      try {
        const trasladado = turf.transformTranslate(circuloCopa, distanciaKm, bearingSombra, { units: 'kilometers' });
        const union = turf.union(turf.featureCollection([circuloCopa, trasladado]));
        return union || circuloCopa;
      } catch (e) {
        return circuloCopa;
      }
    }

    // --- Obtener la hora efectiva a partir del estado de la interfaz ---
    function obtenerHoraEfectivaArboles() {
      if (esSolsticioArboles) {
        const d = new Date(fechaBaseArboles);
        d.setHours(Math.floor(minutosSlider / 60), minutosSlider % 60, 0, 0);
        return d;
      } else {
        // Modo "Ahora": se usa la hora actual (ignorando el slider)
        return new Date();
      }
    }

    let versionSombra = 0;

    async function recalcularSombrasArboles() {
      if (!map.getSource('arboles-globales-sombra') || !capaVisible) return;
      const miVersion = ++versionSombra;

      const centro = map.getCenter();
      const horaEfectiva = obtenerHoraEfectivaArboles();
      const posSol = SunCalc.getPosition(horaEfectiva, centro.lat, centro.lng);

      // Si el sol está bajo el horizonte, no hay sombra
      if (posSol.altitude <= 0) {
        map.getSource('arboles-globales-sombra').setData(turf.featureCollection([]));
        return;
      }

      const azimutGrados = (posSol.azimuth * 180) / Math.PI + 180;
      const bearingSombra = (azimutGrados + 180) % 360;

      const enVista = dibujarArbolesVisibles();
      const paraSombra = enVista.slice(0, CONFIG.maxArbolesConSombra);

      const sombras = [];
      for (let i = 0; i < paraSombra.length; i += CONFIG.loteSombraSize) {
        if (miVersion !== versionSombra) return;
        const lote = paraSombra.slice(i, i + CONFIG.loteSombraSize);
        for (const arbol of lote) {
          const tangenteSol = Math.tan(posSol.altitude);
          if (!tangenteSol || tangenteSol === 0) continue;
          const longitudSombraM = arbol.altura / tangenteSol;
          if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;
          const circulo = turf.circle(arbol.punto, arbol.radioCopaM / 1000, { units: 'kilometers', steps: 10 });
          sombras.push(sombraDeCopa(circulo, longitudSombraM / 1000, bearingSombra));
        }
        if (miVersion !== versionSombra) return;
        map.getSource('arboles-globales-sombra').setData(turf.featureCollection(sombras));
        if (i + CONFIG.loteSombraSize < paraSombra.length) await cederAlNavegador();
      }
      if (miVersion === versionSombra) {
        map.getSource('arboles-globales-sombra').setData(turf.featureCollection(sombras));
      }
    }

    // --- Sincronización con la interfaz de shadows-route.js ---
    function sincronizarConUI() {
      const slider = document.getElementById('rsTimeSlider');
      const btnAhora = document.getElementById('rsBtnAhora');
      const btnVerano = document.getElementById('rsBtnVerano');
      const btnInvierno = document.getElementById('rsBtnInvierno');

      if (btnAhora) {
        btnAhora.addEventListener('click', () => {
          esSolsticioArboles = false;
          fechaBaseArboles = new Date();
          minutosSlider = new Date().getHours() * 60 + new Date().getMinutes();
          if (slider) slider.value = minutosSlider;
          recalcularSombrasArboles();
        });
      }
      if (btnVerano) {
        btnVerano.addEventListener('click', () => {
          esSolsticioArboles = true;
          const anio = new Date().getFullYear();
          fechaBaseArboles = new Date(anio, 5, 21, 12, 0, 0); // 21 junio
          minutosSlider = 780; // 13:00
          if (slider) slider.value = minutosSlider;
          recalcularSombrasArboles();
        });
      }
      if (btnInvierno) {
        btnInvierno.addEventListener('click', () => {
          esSolsticioArboles = true;
          const anio = new Date().getFullYear();
          fechaBaseArboles = new Date(anio, 11, 21, 12, 0, 0); // 21 diciembre
          minutosSlider = 780; // 13:00
          if (slider) slider.value = minutosSlider;
          recalcularSombrasArboles();
        });
      }
      if (slider) {
        slider.addEventListener('input', () => {
          // Si el usuario mueve el slider manualmente, asumimos modo manual
          esSolsticioArboles = true; // Para que use la fecha base y el slider
          // Pero si no había solsticio activo, ¿qué fecha base usar?
          // Usamos la fecha actual como base, para que solo cambie la hora.
          if (!esSolsticioArboles) {
            fechaBaseArboles = new Date();
          }
          minutosSlider = Number(slider.value);
          recalcularSombrasArboles();
        });
      }
    }

    // Ejecutar sincronización después de que el DOM esté listo
    setTimeout(sincronizarConUI, 300);

    let esperaMoveend = null;
    map.on('moveend', () => {
      clearTimeout(esperaMoveend);
      esperaMoveend = setTimeout(() => {
        cargarArbolesDeLaVista();
      }, CONFIG.esperaMoveendMs);
    });

    // Cargar árboles iniciales y sincronizar sombras
    if (map.loaded()) {
      await cargarArbolesDeLaVista();
    } else {
      map.once('load', async () => {
        await cargarArbolesDeLaVista();
      });
    }

    setInterval(() => {
      if (map.loaded()) recalcularSombrasArboles();
    }, CONFIG.sincroSombraMs);
  }
})();