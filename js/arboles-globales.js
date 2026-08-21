/* ============================================================
   ÁRBOLES GLOBALES + SOMBRA — capa independiente, vía Overpass/OSM
   ------------------------------------------------------------
   Archivo APARTE de manolit-aire.js (no toca su lógica interna,
   ni su diseño, ni sus capas). Se engancha al mismo mapa MapLibre
   a través de `window.manolitAireMap`, que manolit-aire.js expone
   con una sola línea añadida junto a la creación del mapa:

       window.manolitAireMap = map;

   Por qué Overpass y no una lista de coordenadas:
   Overpass API (overpass-api.de) es la puerta de consulta pública
   de OpenStreetMap. La gente de todo el mundo ya ha ido marcando
   árboles ahí (natural=tree), muchos con altura (height) y
   diámetro de copa (diameter_crown). Con una sola consulta,
   acotada al rectángulo que se ve en pantalla en cada momento,
   funciona en cualquier ciudad del planeta — Sevilla, Madrid,
   Roma, donde sea — sin mantener ninguna lista de ciudades ni
   escribir una sola coordenada a mano.

   Qué hace este archivo:
   1. En cada movimiento del mapa (con espera para no saturar),
      pide a Overpass los árboles dentro del rectángulo visible.
   2. Acepta cualquier nodo natural=tree (esa etiqueta en OSM ya
      significa "árbol", no arbusto — eso sería natural=shrub).
      Si trae height o diameter_crown se usan esos datos reales;
      si no trae nada (lo más habitual, la inmensa mayoría de los
      árboles en OSM no tienen esos campos rellenos) se le asigna
      una altura/copa por defecto en vez de descartarlo.
   3. Los dibuja en 3D (copa como un pequeño volumen extruido)
      con la misma estética que los edificios 3D del mapa.
   4. Proyecta su sombra según la posición real del sol —mismo
      principio que las sombras de los edificios: trasladar la
      copa en la dirección/longitud de sombra y fusionarla con
      la original— y la mantiene actualizada al mover el mapa o
      con el paso del tiempo.
   5. Todo por lotes y con límites de cantidad, para no ralentizar
      la carga ni saturar el navegador aunque haya miles de
      árboles en la vista.
   ============================================================ */

'use strict';

(function () {
  const CONFIG = {
    // Overpass: puerta pública de consulta de OpenStreetMap. Con mirrors de
    // reserva por si el principal está ocupado (son públicos y gratuitos).
    overpassUrls: [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
    ],
    overpassTimeoutS: 20,

    alturaMinimaM: 2,          // altura mínima para considerarlo "árbol grande" (no seto/arbusto)
    alturaEstimadaSinDatoM: 6, // altura asumida cuando el nodo natural=tree no trae height
    radioCopaPorDefectoM: 2.2, // copa asumida cuando el nodo no trae diameter_crown

    maxArbolesEnPantalla: 700,  // límite de dibujado por rendimiento
    maxArbolesConSombra: 220,   // límite de cálculo de sombra por rendimiento
    loteSombraSize: 25,
    sincroSombraMs: 60 * 1000,  // recalcular sombras cada minuto, como los edificios
    esperaMoveendMs: 500,       // espera tras mover el mapa antes de volver a pedir datos
    maxLadoConsultaKm: 3,       // no se piden árboles si la vista es más ancha que esto (evita sobrecarga)
    cacheCeldasGrados: 0.01,    // tamaño de celda de caché (~1km) para no repetir la misma consulta
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
          return reject(new Error('No se ha encontrado window.manolitAireMap — añade "window.manolitAireMap = map;" justo después de crear el mapa en manolit-aire.js'));
        }
        setTimeout(intento, 200);
      })();
    });
  }

  esperarMapa().then(iniciar).catch((e) => console.warn('[arboles-globales]', e.message));

  async function iniciar(map) {

    // ---- Fuentes y capas propias, independientes de las de manolit-aire.js ----
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
          paint: { 'fill-color': '#0b1220', 'fill-opacity': 0.26 },
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

    // ---- Toggle discreto, si existe el panel de controles de manolit-aire.js ----
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

    // ---- Consulta a Overpass, acotada al rectángulo visible ----
    let arbolesGrandes = [];       // árboles cargados hasta ahora (acumulados por celda de caché)
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
      // bbox = [south, west, north, east], como pide Overpass
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
          continue; // probamos el siguiente mirror
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

      // natural=tree en OSM ya significa "árbol" (los arbustos van aparte,
      // como natural=shrub). La inmensa mayoría de los árboles mapeados NO
      // traen height ni diameter_crown rellenos — eso no significa que no
      // sean árboles grandes, solo que nadie ha rellenado ese dato. Por eso
      // ya no descartamos el nodo si faltan esos campos: usamos los valores
      // reales cuando existen, y si no, asumimos un árbol "normal".
      const altura = leerNumero(tags, ['height']) || CONFIG.alturaEstimadaSinDatoM;
      const diametroCopa = leerNumero(tags, ['diameter_crown']);

      if (altura <= CONFIG.alturaMinimaM) return null; // esto sí descarta setos/arbolillos con height explícito muy bajo

      const radioCopaM = diametroCopa ? diametroCopa / 2 : CONFIG.radioCopaPorDefectoM;
      const nombre = tags.species || tags['species:es'] || tags.genus || 'Árbol';

      return {
        punto: turf.point([el.lon, el.lat]),
        altura,
        radioCopaM,
        nombre,
      };
    }

    async function cargarArbolesDeLaVista() {
      if (!capaVisible || consultaEnCurso) return;
      const bounds = map.getBounds();
      if (anchoVistaKm(bounds) > CONFIG.maxLadoConsultaKm) return; // muy alejado: no pedimos nada (rendimiento)

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
        celdas.forEach((c) => celdasConsultadas.delete(c)); // permite reintentar más adelante
      } finally {
        consultaEnCurso = false;
      }

      dibujarArbolesVisibles();
      programarSincroSombra(true);
    }

    // ---- Dibujado de las copas en 3D (limitado a lo visible, por rendimiento) ----
    function dibujarArbolesVisibles() {
      if (!map.getSource('arboles-globales-copas') || !capaVisible) return [];
      const b = map.getBounds();
      const enVista = arbolesGrandes.filter((a) => {
        const [lon, lat] = a.punto.geometry.coordinates;
        return lon >= b.getWest() && lon <= b.getEast() && lat >= b.getSouth() && lat <= b.getNorth();
      }).slice(0, CONFIG.maxArbolesEnPantalla);

      const features = [];
      for (const a of enVista) {
        const alturaTroncoM = Math.max(1, a.altura * 0.35);          // Tronco: 35% de la altura total (mínimo 1 m)
        const alturaCopaInferiorM = a.altura * 0.40;                   // Copa inferior: 40%
        const alturaCopaSuperiorM = a.altura - alturaTroncoM - alturaCopaInferiorM; // Resto arriba
        const radioTroncoM = Math.max(0.15, a.radioCopaM * 0.15);      // Tronco delgado

        // Tronco (cilindro marrón desde el suelo)
        const tronco = turf.circle(a.punto, radioTroncoM / 1000, { units: 'kilometers', steps: 8 });
        tronco.properties = {
          altura: a.altura,
          baseM: 0,
          alturaTotalM: alturaTroncoM,
          nombre: a.nombre,
          tipo: 'tronco'
        };
        features.push(tronco);

        // Copa inferior (más ancha)
        const copaInferior = turf.circle(a.punto, a.radioCopaM / 1000, { units: 'kilometers', steps: 14 });
        copaInferior.properties = {
          altura: a.altura,
          baseM: alturaTroncoM,
          alturaTotalM: alturaTroncoM + alturaCopaInferiorM,
          nombre: a.nombre,
          tipo: 'copa'
        };
        features.push(copaInferior);

        // Copa superior (más estrecha, para dar forma redondeada)
        const copaSuperior = turf.circle(a.punto, (a.radioCopaM * 0.65) / 1000, { units: 'kilometers', steps: 14 });
        copaSuperior.properties = {
          altura: a.altura,
          baseM: alturaTroncoM + alturaCopaInferiorM,
          alturaTotalM: a.altura,
          nombre: a.nombre,
          tipo: 'copa'
        };
        features.push(copaSuperior);
      }
      map.getSource('arboles-globales-copas').setData(turf.featureCollection(features));
      return enVista;
    } // <-- ¡Esta llave faltaba!

    // ---- Sombras de los árboles: mismo principio que en manolit-aire.js ----
    function sombraDeCopa(circuloCopa, distanciaKm, bearingSombra) {
      try {
        const trasladado = turf.transformTranslate(circuloCopa, distanciaKm, bearingSombra, { units: 'kilometers' });
        const union = turf.union(turf.featureCollection([circuloCopa, trasladado]));
        return union || circuloCopa;
      } catch (e) {
        return circuloCopa;
      }
    }

    let versionSombra = 0;
    async function recalcularSombrasArboles() {
      if (!map.getSource('arboles-globales-sombra') || !capaVisible) return;
      const miVersion = ++versionSombra;

      const centro = map.getCenter();
      const posSol = SunCalc.getPosition(new Date(), centro.lat, centro.lng);
      if (false) { // <-- Cambia a "if (posSol.altitude <= 0) {" para sombras reales solo de día
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
          const altSol = posSol && typeof posSol.altitude === 'number' ? posSol.altitude : 0;
          if (altSol <= 0) continue;
          const tangenteSol = Math.tan(altSol);
          if (!tangenteSol || tangenteSol === 0) continue;
          const longitudSombraM = arbol.altura / tangenteSol;
          if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;
          const circulo = turf.circle(arbol.punto, arbol.radioCopaM / 1000, { units: 'kilometers', steps: 10 });
          sombras.push(sombraDeCopa(circulo, longitudSombraM / 1000, bearingSombra));
        }
        if (miVersion !== versionSombra) return;
        map.getSource('arboles-globales-sombra')?.setData(turf.featureCollection(sombras));
        if (i + CONFIG.loteSombraSize < paraSombra.length) await cederAlNavegador();
      }
    }

    let temporizadorSombra = null;
    function programarSincroSombra(inmediato) {
      clearInterval(temporizadorSombra);
      if (inmediato) recalcularSombrasArboles();
      temporizadorSombra = setInterval(recalcularSombrasArboles, CONFIG.sincroSombraMs);
    }

    // ---- Recarga al mover el mapa (con espera para no saturar de peticiones) ----
    let esperaMoveend = null;
    map.on('moveend', () => {
      clearTimeout(esperaMoveend);
      esperaMoveend = setTimeout(() => {
        cargarArbolesDeLaVista();
        recalcularSombrasArboles();
      }, CONFIG.esperaMoveendMs);
    });

    await cargarArbolesDeLaVista();
  }
})();