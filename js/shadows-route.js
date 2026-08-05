/* ============================================================
   MANOLITO AIRE — Ruta real + Sombras 3D reales + AQI (origen)
   Stack: MapLibre GL JS (edificios 3D + capas) + SunCalc (sol)
   + Turf.js (geometría de sombra) + OSRM (ruta por calles)
   ============================================================ */

'use strict';

(function () {
  const CONFIG = {
    centroInicial: [-5.9845, 37.3891], // [lon, lat] Sevilla
    zoomInicial: 15.5,
    pitchInicial: 55,
    nominatimUrl: 'https://nominatim.openstreetmap.org/search',
    osrmUrl: 'https://router.project-osrm.org/route/v1',
    airQualityUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty', // vector tiles gratis, sin key
    edificiosLayerId: 'building-3d',
    fetchTimeoutMs: 9000,
    fetchRetries: 2,
    alturaPorDefectoM: 9, // si un edificio no trae altura en los datos OSM
  };

  function leerVar(nombre) {
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  }

  const mapEl = document.getElementById('shadowRouteMap');
  if (!mapEl) return;

  /* ---------------- Mapa MapLibre con edificios 3D reales ---------------- */

  const map = new maplibregl.Map({
    container: 'shadowRouteMap',
    style: CONFIG.styleUrl,
    center: CONFIG.centroInicial,
    zoom: CONFIG.zoomInicial,
    pitch: CONFIG.pitchInicial,
    bearing: -15,
    attributionControl: true,
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

  let capaEdificiosDisponible = false;

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

    // Fuentes vacías donde iremos metiendo sombras y ruta
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

    recalcularSombrasVisibles();
    conectarTogglesDeCapas();
    actualizarIluminacionSolar();
  });

  map.on('moveend', () => {
    if (document.getElementById('rsToggleSombras')?.checked) recalcularSombrasVisibles();
  });

  /* ---------------- Sombras reales: sol + altura de edificios ---------------- */

  function recalcularSombrasVisibles() {
    if (!map.getSource('sombras')) return;
    if (!document.getElementById('rsToggleSombras')?.checked) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      return;
    }

    const ahora = new Date();
    const centro = map.getCenter();
    const posSol = SunCalc.getPosition(ahora, centro.lat, centro.lng);

    // Sol bajo el horizonte: no hay sombra física que dibujar
    if (posSol.altitude <= 0) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      mostrarAvisoSol('El sol está bajo el horizonte ahora mismo — no hay sombras que proyectar.');
      return;
    }
    mostrarAvisoSol('');

    if (!capaEdificiosDisponible) return;

    const edificios = map.queryRenderedFeatures({ layers: [CONFIG.edificiosLayerId] });
    if (!edificios.length) {
      map.getSource('sombras').setData(turf.featureCollection([]));
      return;
    }

    // Dirección hacia la que cae la sombra: opuesta al azimut solar
    const azimutGrados = (posSol.azimuth * 180) / Math.PI + 180;
    const bearingSombra = (azimutGrados + 180) % 360; // turf usa bearing geográfico (0=N)

    const poligonosSombra = [];
    for (const edificio of edificios.slice(0, 400)) { // límite de seguridad para no colgar el navegador
      try {
        const altura = Number(edificio.properties.height ?? edificio.properties.render_height) || CONFIG.alturaPorDefectoM;
        const longitudSombraM = altura / Math.tan(posSol.altitude);
        if (!isFinite(longitudSombraM) || longitudSombraM <= 0) continue;

        const geom = edificio.geometry;
        if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

        const original = turf.feature(geom);
        const trasladado = turf.transformTranslate(original, longitudSombraM / 1000, bearingSombra, { units: 'kilometers' });

        // La sombra visible es la "huella" entre el edificio y su copia desplazada:
        // usamos el envolvente convexo de ambos como aproximación de la proyección.
        const combinados = turf.combine(turf.featureCollection([original, trasladado]));
        const envolvente = turf.convex(combinados);
        if (envolvente) poligonosSombra.push(envolvente);
      } catch (e) {
        // Un edificio con geometría rara no debe tirar abajo el resto del cálculo
        continue;
      }
    }

    map.getSource('sombras').setData(turf.featureCollection(poligonosSombra));
  }

  function mostrarAvisoSol(texto) {
    const el = document.getElementById('rsSunNote');
    if (el) el.textContent = texto;
  }

  // Recalcula cada minuto para que las sombras y la luz "se muevan" con el reloj real
  setInterval(() => {
    if (map.loaded()) recalcularSombrasVisibles();
    actualizarIluminacionSolar();
  }, 60 * 1000);

  /* ---------------- Widget de posición del sol (estilo "sun tool" de Google Earth) ---------------- */
  // Aquí NO montamos ningún cajetín aparte: cambiamos la luz y el cielo del
  // propio mapa 3D según la posición real del sol — como el "Sun" de Google
  // Earth. Usa las APIs nativas de MapLibre: map.setLight() (sombreado de
  // los edificios) + capa "sky" (color del cielo/atardecer).

  let puntoReferenciaSol = null; // { lat, lon } — se actualiza al buscar ruta

  function calcularAnguloSol() {
    const centro = puntoReferenciaSol || map.getCenter();
    const lat = centro.lat;
    const lon = centro.lon ?? centro.lng;
    const pos = SunCalc.getPosition(new Date(), lat, lon);
    const azimutDeg = ((pos.azimuth * 180) / Math.PI + 180) % 360; // 0=N medido desde el norte
    const alturaDeg = (pos.altitude * 180) / Math.PI;
    return { azimutDeg, alturaDeg };
  }

  function actualizarIluminacionSolar() {
    const tSol = document.getElementById('rsToggleSol');
    if (!tSol || !map.getLayer('cielo-sol')) return;

    if (!tSol.checked) {
      // Apagado: luz neutra de fábrica, sin cielo de atmósfera
      map.setLayoutProperty('cielo-sol', 'visibility', 'none');
      map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.35, position: [1.5, 0, 40] });
      return;
    }

    const { azimutDeg, alturaDeg } = calcularAnguloSol();
    const bajoHorizonte = alturaDeg <= 0;
    const polar = Math.max(0, 90 - Math.max(alturaDeg, 0)); // 0=cenit, 90=horizonte

    // Sombreado real de los edificios 3D, según de dónde viene el sol ahora mismo
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
    tSombras?.addEventListener('change', recalcularSombrasVisibles);
    tRuta?.addEventListener('change', () => {
      map.setLayoutProperty('capa-ruta', 'visibility', tRuta.checked ? 'visible' : 'none');
    });
    tSol?.addEventListener('change', actualizarIluminacionSolar);
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
  // Guardamos, por input, el punto exacto que el usuario ha CLICADO en la
  // lista de sugerencias. Si al pulsar "Buscar ruta" el texto coincide con
  // lo seleccionado, usamos esas coordenadas exactas y no volvemos a
  // geocodificar texto libre — así se acaba la ambigüedad tipo "Benacazón".
  const seleccionPorInput = new Map(); // input -> { lat, lon, nombre, texto }

  function crearAutocompletado(input, contenedorSugerenciasId) {
    const contenedor = document.getElementById(contenedorSugerenciasId);
    if (!contenedor) return;

    let temporizador = null;
    let controladorActual = null;

    input.addEventListener('input', () => {
      seleccionPorInput.delete(input); // el usuario ha editado a mano: la selección previa ya no vale
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

    function pintarSugerencias(resultados, textoOriginal) {
      if (!resultados || resultados.length === 0) {
        contenedor.innerHTML = '<li class="rs-sug-empty">Sin resultados</li>';
        contenedor.style.display = 'block';
        return;
      }

      resultados = reordenarPorCiudadEscrita(resultados, textoOriginal);

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
        li.addEventListener('click', () => {
          const r = resultados[Number(li.dataset.idx)];
          input.value = r.display_name;
          seleccionPorInput.set(input, {
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            nombre: r.display_name,
            texto: r.display_name,
          });
          contenedor.innerHTML = '';
          contenedor.style.display = 'none';
        });
      });
    }

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

      recalcularSombrasVisibles();
      puntoReferenciaSol = { lat: origen.lat, lon: origen.lon };
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