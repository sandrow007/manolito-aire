/* ============================================================
   ÁRBOLES GLOBALES + SOMBRA — capa independiente, vía Overpass/OSM

   v7 — Robustez Overpass + formas por especie:
   - Cooldown exponencial ante errores 429/502/504/CORS para no saturar Overpass.
   - Timeout y área de consulta reducidos.
   - Clasificación por species/genus y sombras realistas por tipo de árbol.

   v5 — FIX CRÍTICO de unidades + Sombras Orgánicas Asimétricas
   ============================================================ */

'use strict';

(function () {
  const CONFIG = {
    overpassUrls: [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
    ],
    overpassTimeoutS: 15,

    alturaMinimaM: 2,
    alturaEstimadaSinDatoM: 6,
    radioCopaPorDefectoM: 2.2,

    maxArbolesEnPantalla: 1000,
    maxArbolesConSombra: 250,
    loteSombraSize: 20,
    sincroSombraMs: 60 * 1000,
    esperaMoveendMs: 500,
    maxLadoConsultaKm: 2.5,
    cacheCeldasGrados: 0.01,
    esperaMapaMs: 15000,
  };

  /* ---------------- Tipología de árboles (forma + sombra realista) ---------------- */

  const TIPOS_ARBOL = {
    palmera: {
      keywords: ['phoenix', 'washingtonia', 'palma', 'palm', 'date palm', 'datilera'],
      alturaMediaM: 10,
      radioCopaMedioM: 2.0,
      forma: 'palmera',
      color: '#7a9b4a',
    },
    pino: {
      keywords: ['pinus', 'pino', 'pine', 'cedrus', 'cedro', 'cedar', 'ciprés', 'cypress', 'cupressus', 'abeto', 'fir'],
      alturaMediaM: 14,
      radioCopaMedioM: 3.0,
      forma: 'conica',
      color: '#2d5a3d',
    },
    encina_roble: {
      keywords: ['quercus', 'encina', 'roble', 'oak', 'alcornoque', 'cork oak', 'quejigo'],
      alturaMediaM: 10,
      radioCopaMedioM: 6.0,
      forma: 'ancha_redondeada',
      color: '#4f7a35',
    },
    olivo: {
      keywords: ['olea', 'olivo', 'olive', 'acebuche'],
      alturaMediaM: 8,
      radioCopaMedioM: 4.0,
      forma: 'ancha_irregular',
      color: '#6b8c42',
    },
    citrico: {
      keywords: ['citrus', 'naranjo', 'limonero', 'orange', 'lemon', 'mandarino', 'pomelo'],
      alturaMediaM: 5,
      radioCopaMedioM: 2.8,
      forma: 'redondeada',
      color: '#5a8a3a',
    },
    platanero: {
      keywords: ['platanus', 'plátano', 'platano', 'plane', 'sicomoro'],
      alturaMediaM: 16,
      radioCopaMedioM: 5.5,
      forma: 'ancha_redondeada',
      color: '#4a8a3f',
    },
    eucalipto: {
      keywords: ['eucalyptus', 'eucalipto', 'gum'],
      alturaMediaM: 18,
      radioCopaMedioM: 3.0,
      forma: 'oval_alargada',
      color: '#3d6b4a',
    },
    olmo: {
      keywords: ['ulmus', 'olmo', 'elm'],
      alturaMediaM: 12,
      radioCopaMedioM: 5.0,
      forma: 'ancha_redondeada',
      color: '#5a8f3d',
    },
    chopo: {
      keywords: ['populus', 'chopo', 'poplar', 'álamo', 'alamo'],
      alturaMediaM: 15,
      radioCopaMedioM: 4.0,
      forma: 'oval_alargada',
      color: '#4f9a45',
    },
    generico: {
      alturaMediaM: CONFIG.alturaEstimadaSinDatoM,
      radioCopaMedioM: CONFIG.radioCopaPorDefectoM,
      forma: 'redondeada',
      color: '#7fb069',
    },
  };

  function clasificarArbol(tags) {
    const texto = [
      tags.species || '',
      tags['species:es'] || '',
      tags['species:en'] || '',
      tags.genus || '',
      tags.taxon || '',
      tags.name || '',
      tags['leaf_type'] || '',
    ].join(' ').toLowerCase();

    for (const [tipo, info] of Object.entries(TIPOS_ARBOL)) {
      if (tipo === 'generico') continue;
      for (const kw of info.keywords) {
        if (texto.includes(kw.toLowerCase())) return { tipo, ...info };
      }
    }
    return { tipo: 'generico', ...TIPOS_ARBOL.generico };
  }

  function estimarDimensionesArbol(tags, clasificacion) {
    let altura = leerNumero(tags, ['height', 'maxheight']);
    let diametroCopa = leerNumero(tags, ['diameter_crown', 'crown_diameter']);

    if (altura == null) {
      const circ = leerNumero(tags, ['circumference', 'circumference_dbh', 'dbh']);
      if (circ) {
        // Altura aproximada a partir del diámetro a la altura del pecho
        const factor = clasificacion.forma === 'conica' ? 2.8 : clasificacion.forma === 'palmera' ? 5.0 : 2.0;
        altura = Math.max(3, (circ / Math.PI) * factor);
      } else {
        altura = clasificacion.alturaMediaM;
      }
    }

    if (diametroCopa == null) {
      const circ = leerNumero(tags, ['circumference', 'circumference_dbh', 'dbh']);
      if (circ) {
        diametroCopa = circ / Math.PI;
      } else {
        const proporcion = {
          palmera: 0.22,
          conica: 0.30,
          oval_alargada: 0.32,
          ancha_redondeada: 0.75,
          ancha_irregular: 0.65,
          redondeada: 0.55,
        }[clasificacion.forma] || 0.5;
        diametroCopa = altura * proporcion;
      }
    }

    // Palmera: copa siempre pequeña y alta
    if (clasificacion.forma === 'palmera') {
      diametroCopa = Math.min(diametroCopa, 3.5);
      altura = Math.max(altura, 6);
    }

    const radioCopaM = Math.max(0.6, diametroCopa / 2);
    return { altura, radioCopaM };
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

  function obtenerHoraEfectiva() {
    if (typeof window.manolitAireHoraEfectiva === 'function') {
      try {
        const h = window.manolitAireHoraEfectiva();
        if (h instanceof Date && !isNaN(h)) return h;
      } catch (e) { /* seguimos con el respaldo */ }
    }
    return new Date();
  }

  function obtenerCentroSolar(map) {
    if (typeof window.manolitAireCentroSol === 'function') {
      try {
        const c = window.manolitAireCentroSol();
        if (c && typeof c.lat === 'number' && typeof c.lon === 'number') return c;
      } catch (e) { /* seguimos con el respaldo */ }
    }
    const c = map.getCenter();
    return { lat: c.lat, lon: c.lng };
  }

  function sombrasActivadasEnPanel() {
    const t = document.getElementById('rsToggleSombras');
    return !t || t.checked;
  }

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
            'fill-color': '#0b1220',
            'fill-opacity': 0.26,
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
                'case',
                ['has', 'color'], ['get', 'color'],
                [
                  'interpolate', ['linear'], ['get', 'altura'],
                  3, '#7fb069',
                  8, '#4f8a3d',
                  15, '#2f5d2a',
                ]
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

    if (map.loaded()) {
      asegurarCapas();
    } else {
      map.once('load', asegurarCapas);
    }

    let capaVisible = true;
    let overpassBackoffHasta = 0;
    let overpassErroresSeguidos = 0;

    function inyectarToggle() {
      const panel = document.getElementById('rsMapControls');
      if (!panel || document.getElementById('rsBtnArboles')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'rsBtnArboles';
      btn.textContent = (typeof window.getMessages === 'function' ? (window.getMessages().treesBtn || 'Árboles') : 'Árboles');
      btn.classList.add('rs-activo');
      btn.addEventListener('click', () => {
        capaVisible = !capaVisible;
        btn.classList.toggle('rs-activo', capaVisible);
        ['capa-arboles-globales-3d', 'capa-sombra-arboles-globales'].forEach((id) => {
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', capaVisible ? 'visible' : 'none');
        });
        if (capaVisible) {
          cargarArbolesDeLaVista();
          recalcularSombrasArboles();
        }
      });
      panel.appendChild(btn);
    }
    // Retraducir el botón al cambiar el idioma (evento de i18n.js)
    document.addEventListener('langChanged', () => {
      const b = document.getElementById('rsBtnArboles');
      if (b && typeof window.getMessages === 'function') b.textContent = window.getMessages().treesBtn || 'Árboles';
    });
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
      const ahora = Date.now();
      if (ahora < overpassBackoffHasta) {
        throw new Error('Overpass en cooldown por errores recientes');
      }

      const query = `[out:json][timeout:${CONFIG.overpassTimeoutS}];(node["natural"="tree"](${bbox.join(',')}););out body;`;
      let ultimoError = null;
      for (let i = 0; i < CONFIG.overpassUrls.length; i++) {
        const url = CONFIG.overpassUrls[i];
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
          overpassErroresSeguidos = 0;
          return await r.json();
        } catch (e) {
          ultimoError = e;
          if (i < CONFIG.overpassUrls.length - 1) {
            await new Promise((res) => setTimeout(res, 700 * (i + 1)));
          }
          continue;
        }
      }

      overpassErroresSeguidos++;
      const backoffMs = Math.min(90000, 4000 * Math.pow(2, overpassErroresSeguidos - 1));
      overpassBackoffHasta = Date.now() + backoffMs;
      console.warn(`[arboles-globales] Overpass falló ${overpassErroresSeguidos} veces seguidas. Cooldown ${(backoffMs / 1000).toFixed(0)} s.`);
      throw ultimoError || new Error('Overpass no disponible');
    }

    function procesarElementoOSM(el) {
      if (el.type !== 'node' || el.lat == null || el.lon == null) return null;
      const tags = el.tags || {};
      const clasificacion = clasificarArbol(tags);
      const { altura, radioCopaM } = estimarDimensionesArbol(tags, clasificacion);
      if (altura <= CONFIG.alturaMinimaM) return null;
      const nombre = tags.species || tags['species:es'] || tags.genus || clasificacion.tipo || 'Árbol';
      return {
        punto: turf.point([el.lon, el.lat]),
        altura,
        radioCopaM,
        nombre,
        forma: clasificacion.forma,
        color: clasificacion.color,
        tipo: clasificacion.tipo,
      };
    }

    async function cargarArbolesDeLaVista() {
      if (!capaVisible || consultaEnCurso) return;
      const bounds = map.getBounds();
      if (anchoVistaKm(bounds) > CONFIG.maxLadoConsultaKm) return;

      const celdas = celdasDeVista(bounds).filter((c) => !celdasConsultadas.has(c));
      if (!celdas.length) { dibujarArbolesVisibles(); return; }

      // Si Overpass está en cooldown, no intentamos más consultas; usamos lo que haya
      if (Date.now() < overpassBackoffHasta) {
        dibujarArbolesVisibles();
        return;
      }

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
      programarSincroSombra(true);
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
        const forma = a.forma || 'redondeada';
        const [lon, lat] = a.punto.geometry.coordinates;

        // Proporciones del tronco y las copas según la forma real del árbol
        let factorTronco = 0.35, factorCopaBaja = 0.40, factorCopaAlta = 0.25;
        if (forma === 'palmera') { factorTronco = 0.80; factorCopaBaja = 0.15; factorCopaAlta = 0.05; }
        else if (forma === 'conica') { factorTronco = 0.45; factorCopaBaja = 0.35; factorCopaAlta = 0.20; }
        else if (forma === 'oval_alargada') { factorTronco = 0.50; factorCopaBaja = 0.30; factorCopaAlta = 0.20; }
        else if (forma === 'ancha_redondeada') { factorTronco = 0.30; factorCopaBaja = 0.45; factorCopaAlta = 0.25; }
        else if (forma === 'ancha_irregular') { factorTronco = 0.32; factorCopaBaja = 0.43; factorCopaAlta = 0.25; }

        const alturaTroncoM = Math.max(1, a.altura * factorTronco);
        const alturaCopaInferiorM = a.altura * factorCopaBaja;
        const alturaCopaSuperiorM = Math.max(0.5, a.altura * factorCopaAlta);
        const radioTroncoM = Math.max(0.15, a.radioCopaM * (forma === 'palmera' ? 0.10 : 0.15));

        const tronco = turf.circle(a.punto, radioTroncoM / 1000, { units: 'kilometers', steps: 8 });
        tronco.properties = { altura: a.altura, baseM: 0, alturaTotalM: alturaTroncoM, nombre: a.nombre, tipo: 'tronco', forma, color: a.color };
        features.push(tronco);

        // Copa inferior: forma realista según especie
        const radioInferior = forma === 'palmera' ? a.radioCopaM * 0.90 : a.radioCopaM;
        const copaInferior = crearFormaCopa(a.punto, radioInferior / 1000, forma, lon, lat);
        copaInferior.properties = { altura: a.altura, baseM: alturaTroncoM, alturaTotalM: alturaTroncoM + alturaCopaInferiorM, nombre: a.nombre, tipo: 'copa', forma, color: a.color };
        features.push(copaInferior);

        // Copa superior: más pequeña y cerrada (salvo palmera)
        const radioSuperior = forma === 'palmera' ? a.radioCopaM * 0.80 : a.radioCopaM * 0.65;
        const formaSuperior = forma === 'palmera' ? 'palmera' : forma === 'conica' ? 'conica' : 'redondeada';
        const copaSuperior = crearFormaCopa(a.punto, radioSuperior / 1000, formaSuperior, lon, lat + 0.0001);
        copaSuperior.properties = { altura: a.altura, baseM: alturaTroncoM + alturaCopaInferiorM, alturaTotalM: a.altura, nombre: a.nombre, tipo: 'copa', forma, color: a.color };
        features.push(copaSuperior);
      }
      map.getSource('arboles-globales-copas').setData(turf.featureCollection(features));
      return enVista;
    }

    /* ---------------- Generación de Sombras Orgánicas ---------------- */

    function pseudoRandom(x, y, seed) {
      const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
      return n - Math.floor(n);
    }

    function crearFormaCopa(centro, radioKm, forma, lon, lat) {
      const pasos = {
        palmera: 28,
        conica: 14,
        oval_alargada: 18,
        ancha_redondeada: 22,
        ancha_irregular: 26,
        redondeada: 18,
      }[forma] || 18;

      const coords = [];
      for (let i = 0; i < pasos; i++) {
        const anguloDeg = (i * 360) / pasos;
        const anguloRad = (anguloDeg * Math.PI) / 180;
        let factorRadio = 1;

        switch (forma) {
          case 'ancha_redondeada':
            factorRadio = 1.0 + 0.22 * Math.cos(2 * anguloRad);
            break;
          case 'ancha_irregular':
            factorRadio = 0.92 + 0.28 * Math.cos(2 * anguloRad) + 0.18 * pseudoRandom(lon, lat, i + 50);
            break;
          case 'conica':
            factorRadio = 0.82 + 0.12 * Math.cos(2 * anguloRad);
            break;
          case 'oval_alargada':
            factorRadio = 0.88 + 0.18 * Math.cos(2 * anguloRad);
            break;
          case 'palmera':
            // Palmera: corona pequeña con palmas que sobresalen
            const esPalma = i % 4 === 0;
            factorRadio = esPalma ? 1.55 : 0.72;
            break;
        }

        // Ruido orgánico general
        factorRadio *= 0.82 + pseudoRandom(lon, lat, i) * 0.30;

        const radioEfectivo = Math.max(0.000001, radioKm * factorRadio);
        const pt = turf.transformTranslate(centro, radioEfectivo, anguloDeg, { units: 'kilometers' }).geometry.coordinates;
        coords.push(pt);
      }
      coords.push(coords[0]);
      return turf.polygon([coords]);
    }

    function crearCopaIrregular(centro, radioKm, lon, lat) {
      return crearFormaCopa(centro, radioKm, 'redondeada', lon, lat);
    }

    function unirDosPoligonos(a, b) {
      try {
        const r = turf.union(turf.featureCollection([a, b]));
        if (r) return r;
      } catch (e) { }
      try {
        const r = turf.union(a, b);
        if (r) return r;
      } catch (e) { }
      return a;
    }

    function calcularSombraArbol(arbol, distanciaKm, bearingSombra) {
      const forma = arbol.forma || 'redondeada';
      const perpendicular = (bearingSombra + 90) % 360;
      const radioTroncoKm = Math.max(arbol.radioCopaM * (forma === 'palmera' ? 0.08 : 0.12), 0.25) / 1000;
      const radioCopaKm = arbol.radioCopaM / 1000;
      const [lon, lat] = arbol.punto.geometry.coordinates;

      const lejano = turf.transformTranslate(arbol.punto, distanciaKm, bearingSombra, { units: 'kilometers' });

      // Copa proyectada: mantiene la silueta realista del tipo de árbol
      const radioProyectado = forma === 'palmera' ? radioCopaKm * 0.85 : radioCopaKm;
      const copaProyectada = crearFormaCopa(lejano, radioProyectado, forma, lon, lat);

      // Para palmeras la sombra es casi solo la corona proyectada (poco volumen lateral)
      if (forma === 'palmera') {
        const baseRedondeada = turf.circle(arbol.punto, radioTroncoKm, { units: 'kilometers', steps: 8 });
        return unirDosPoligonos(copaProyectada, baseRedondeada);
      }

      // Cuerpo de la sombra entre el tronco y la copa proyectada
      const pBaseA = turf.transformTranslate(arbol.punto, radioTroncoKm, perpendicular, { units: 'kilometers' }).geometry.coordinates;
      const pBaseB = turf.transformTranslate(arbol.punto, radioTroncoKm, (perpendicular + 180) % 360, { units: 'kilometers' }).geometry.coordinates;

      // Ancho de la cuna según la forma (copas anchas proyectan más volumen lateral)
      const factorAncho = { ancha_redondeada: 0.90, ancha_irregular: 0.85, redondeada: 0.75, conica: 0.55, oval_alargada: 0.60 }[forma] || 0.75;
      const pLejosA = turf.transformTranslate(lejano, radioCopaKm * factorAncho, perpendicular, { units: 'kilometers' }).geometry.coordinates;
      const pLejosB = turf.transformTranslate(lejano, radioCopaKm * factorAncho, (perpendicular + 180) % 360, { units: 'kilometers' }).geometry.coordinates;

      let cuna;
      try {
        cuna = turf.polygon([[pBaseA, pLejosA, pLejosB, pBaseB, pBaseA]]);
      } catch (e) {
        return copaProyectada;
      }

      const baseRedondeada = turf.circle(arbol.punto, radioTroncoKm, { units: 'kilometers', steps: 8 });

      let sombraFinal = unirDosPoligonos(cuna, copaProyectada);
      return unirDosPoligonos(sombraFinal, baseRedondeada);
    }

    let versionSombra = 0;

    async function recalcularSombrasArboles() {
      if (!map.getSource('arboles-globales-sombra') || !capaVisible) return;

      if (!sombrasActivadasEnPanel()) {
        map.getSource('arboles-globales-sombra').setData(turf.featureCollection([]));
        return;
      }

      const miVersion = ++versionSombra;

      const centro = obtenerCentroSolar(map);
      const posSol = SunCalc.getPosition(obtenerHoraEfectiva(), centro.lat, centro.lon);

      if (posSol.altitude <= 0) {
        map.getSource('arboles-globales-sombra').setData(turf.featureCollection([]));
        return;
      }

      const azimutGrados = (posSol.azimuth * 180) / Math.PI + 180;
      const bearingSombra = (azimutGrados + 180) % 360;

      const enVista = dibujarArbolesVisibles();
      const paraSombra = enVista.slice(0, CONFIG.maxArbolesConSombra);

      const tangenteSol = Math.tan(posSol.altitude);
      if (!tangenteSol) return;

      const sombras = [];
      for (let i = 0; i < paraSombra.length; i += CONFIG.loteSombraSize) {
        if (miVersion !== versionSombra) return;
        const lote = paraSombra.slice(i, i + CONFIG.loteSombraSize);
        for (const arbol of lote) {
          const longitudSombraM = arbol.altura / tangenteSol;
          if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;
          const distanciaKm = longitudSombraM / 1000;
          const volumen = calcularSombraArbol(arbol, distanciaKm, bearingSombra);
          if (volumen) sombras.push(volumen);
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

    let esperaMoveend = null;
    map.on('moveend', () => {
      clearTimeout(esperaMoveend);
      esperaMoveend = setTimeout(() => {
        cargarArbolesDeLaVista();
        recalcularSombrasArboles();
      }, CONFIG.esperaMoveendMs);
    });

    window.manolitAireRecalcularArboles = recalcularSombrasArboles;

    await cargarArbolesDeLaVista();
    recalcularSombrasArboles();
  }
})();