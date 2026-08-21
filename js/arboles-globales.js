/* ============================================================
   ÁRBOLES GLOBALES + SOMBRA — DEPURACIÓN ROBUSTA
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

  esperarMapa().then(iniciar).catch((e) => console.warn('[arboles]', e.message));

  async function iniciar(map) {

    function asegurarCapas() {
      if (!map.getSource('arboles-globales-sombra')) {
        map.addSource('arboles-globales-sombra', { type: 'geojson', data: turf.featureCollection([]) });
        map.addLayer({
          id: 'capa-sombra-arboles-globales',
          type: 'fill',
          source: 'arboles-globales-sombra',
          paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.85 }, // Rojo intenso
        });
        console.log('[arboles] Capa de sombras creada');
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
        console.log('[arboles] Capa de árboles creada');
      }
    }

    // Crear capas en cuanto el mapa esté listo
    if (map.loaded()) {
      asegurarCapas();
    } else {
      map.once('load', asegurarCapas);
    }

    let capaVisible = true;
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
        turf.point([bounds.getWest(), (bounds.getNorth() + bounds.getSouth()) / 2]),
        turf.point([bounds.getEast(), (bounds.getNorth() + bounds.getSouth()) / 2]),
        { units: 'kilometers' }
      );
    }

    async function consultarOverpass(bbox) {
      const query = `[out:json][timeout:${CONFIG.overpassTimeoutS}];(node["natural"="tree"](${bbox.join(',')}););out body;`;
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
          console.warn('[arboles] Error con mirror, intentando siguiente...', e.message);
        }
      }
      throw new Error('Overpass no disponible');
    }

    function procesarElementoOSM(el) {
      if (el.type !== 'node' || el.lat == null || el.lon == null) return null;
      const tags = el.tags || {};
      const altura = parseFloat(tags.height) || CONFIG.alturaEstimadaSinDatoM;
      const diametroCopa = parseFloat(tags.diameter_crown);
      if (altura <= CONFIG.alturaMinimaM) return null;
      const radioCopaM = diametroCopa ? diametroCopa / 2 : CONFIG.radioCopaPorDefectoM;
      const nombre = tags.species || tags['species:es'] || tags.genus || 'Árbol';
      return { punto: turf.point([el.lon, el.lat]), altura, radioCopaM, nombre };
    }

    async function cargarArbolesDeLaVista() {
      if (!capaVisible || consultaEnCurso) return;
      const bounds = map.getBounds();
      if (anchoVistaKm(bounds) > CONFIG.maxLadoConsultaKm) {
        console.log('[arboles] Vista demasiado ancha, no se consulta.');
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
        console.log('[arboles] Elementos recibidos:', elementos.length);
        for (const el of elementos) {
          const arbol = procesarElementoOSM(el);
          if (arbol) arbolesGrandes.push(arbol);
        }
        console.log('[arboles] Total acumulado:', arbolesGrandes.length);
      } catch (e) {
        console.warn('[arboles] Overpass falló:', e.message);
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

      console.log('[arboles] Árboles visibles:', enVista.length);

      const features = [];
      for (const a of enVista) {
        const alturaTroncoM = Math.max(1, a.altura * 0.35);
        const alturaCopaInferiorM = a.altura * 0.40;
        const alturaCopaSuperiorM = a.altura - alturaTroncoM - alturaCopaInferiorM;
        const radioTroncoM = Math.max(0.15, a.radioCopaM * 0.15);

        const tronco = turf.circle(a.punto, radioTroncoM / 1000, { units: 'kilometers', steps: 8 });
        tronco.properties = { altura: a.altura, baseM: 0, alturaTotalM: alturaTroncoM, tipo: 'tronco' };
        features.push(tronco);

        const copaInferior = turf.circle(a.punto, a.radioCopaM / 1000, { units: 'kilometers', steps: 14 });
        copaInferior.properties = { altura: a.altura, baseM: alturaTroncoM, alturaTotalM: alturaTroncoM + alturaCopaInferiorM, tipo: 'copa' };
        features.push(copaInferior);

        const copaSuperior = turf.circle(a.punto, (a.radioCopaM * 0.65) / 1000, { units: 'kilometers', steps: 14 });
        copaSuperior.properties = { altura: a.altura, baseM: alturaTroncoM + alturaCopaInferiorM, alturaTotalM: a.altura, tipo: 'copa' };
        features.push(copaSuperior);
      }
      map.getSource('arboles-globales-copas').setData(turf.featureCollection(features));
      return enVista;
    }

    function sombraDeCopa(circuloCopa, distanciaKm, bearingSombra) {
      // Versión simple: solo trasladar el círculo, sin unión
      try {
        return turf.transformTranslate(circuloCopa, distanciaKm, bearingSombra, { units: 'kilometers' });
      } catch (e) {
        console.warn('[arboles] No se pudo trasladar sombra:', e);
        return circuloCopa;
      }
    }

    async function recalcularSombrasArboles() {
      if (!map.getSource('arboles-globales-sombra') || !capaVisible) return;
      const centro = map.getCenter();
      const posSol = SunCalc.getPosition(new Date(), centro.lat, centro.lng);
      console.log('[arboles] Altitud solar real:', posSol.altitude);

      // Forzamos altitud a 45° si es de noche para la prueba
      let altSol = posSol.altitude;
      if (altSol <= 0) {
        altSol = 0.785; // 45 grados en radianes
        console.log('[arboles] Altitud solar forzada a 45° para depuración');
      }

      const azimutGrados = (posSol.azimuth * 180) / Math.PI + 180;
      const bearingSombra = (azimutGrados + 180) % 360;

      const enVista = dibujarArbolesVisibles();
      const paraSombra = enVista.slice(0, CONFIG.maxArbolesConSombra);
      console.log('[arboles] Árboles para sombra:', paraSombra.length);

      const sombras = [];
      for (const arbol of paraSombra) {
        const tangenteSol = Math.tan(altSol);
        if (!tangenteSol || tangenteSol === 0) continue;
        const longitudSombraM = arbol.altura / tangenteSol;
        if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;
        const circulo = turf.circle(arbol.punto, arbol.radioCopaM / 1000, { units: 'kilometers', steps: 10 });
        sombras.push(sombraDeCopa(circulo, longitudSombraM / 1000, bearingSombra));
      }

      console.log('[arboles] Total sombras generadas:', sombras.length);
      map.getSource('arboles-globales-sombra').setData(turf.featureCollection(sombras));
    }

    let esperaMoveend = null;
    map.on('moveend', () => {
      clearTimeout(esperaMoveend);
      esperaMoveend = setTimeout(() => {
        cargarArbolesDeLaVista();
      }, CONFIG.esperaMoveendMs);
    });

    // Importante: esperar a que el mapa cargue antes de la primera consulta
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