/*
 * Rutas en bicicleta + capa de carriles bici de Manolit∞ Aire.
 *
 * - ADITIVO: no toca la lógica de coche (aparcamientos-viaje.js) ni la de
 *   sombra. Se engancha al mapa por window.manolitAireMap, como el resto.
 * - Motor principal: OSRM bici de FOSSGIS por el proxy propio /ruta-bici.
 *   El proxy usa routed-bike (no el perfil de coche ni el de paseo) y devuelve
 *   una geometría para pintar la ruta sin depender del CORS de BRouter.
 * - BRouter queda como alternativa independiente si el proxy no da ninguna ruta.
 * - Atribución: "BRouter" y "© OpenStreetMap contributors" visibles en el
 *   panel. Carriles bici: Overpass vía el proxy /carriles-bici (ruta propia,
 *   separada de /aparcamientos y de /arboles: cada capa tiene su propio
 *   espacio de caché en el Worker para que nunca se devuelvan unos datos
 *   por otros en el mismo bbox — 24-oct-2026, arreglo del carril que no
 *   aparecía).
 * - VELOCIDAD (01-nov-2026 c): la capa pide por MACROCELDA de 0,02° (mismo
 *   sistema que fuentes de agua). La caja visible se expande a la rejilla,
 *   se consulta una vez y queda servida en memoria al moverse por la zona.
 *   Por debajo de z12,5 la consulta va en modo ligero (solo vías dedicadas,
 *   timeout de 8 s) y al acercarse la celda se completa sola. Así el primer
 *   carril aparece en 1-3 s y los paseos por la zona son instantáneos.
 * - "Más sombra" para bici NO se implementa: reutilizar el motor de sombra
 *   sobre la polilínea de bici no es trivial y se deja fuera para no tocar
 *   la lógica existente.
 */
(function () {
  'use strict';

  if (window.__manolitoRutasBici) return; // doble carga: jamás
  window.__manolitoRutasBici = true;

  // El proxy del sitio usa el perfil routed-bike; ruta propia para no
  // interferir con las rutas de paseo ni con las rutas en coche.
  // En desarrollo local (file:// O localhost) no corre el Worker: se apunta
  // al proxy de producción (CORS abierto).
  var ES_LOCAL = window.location.protocol === 'file:'
    || ['localhost', '127.0.0.1', '[::1]'].indexOf(window.location.hostname) !== -1;
  var OSRM_BICI_URL = ES_LOCAL ? 'https://manolitoaire.com/ruta-bici' : '/ruta-bici';
  var BROUTER_URL = 'https://brouter.de/brouter';
  var GEO_URL = ES_LOCAL ? 'https://manolitoaire.com/geo' : '/geo';
  // Ruta PROPIA para los carriles bici (ver nota de cabecera): antes
  // reutilizaba '/aparcamientos' y, si esa misma zona ya tenía la caché de
  // aparcamiento guardada en el Worker, el carril bici recibía esos mismos
  // datos (nodos de parking, sin geometría de vía) y no dibujaba nada.
  var OVERPASS_URL = ES_LOCAL ? 'https://manolitoaire.com/carriles-bici' : '/carriles-bici';

  // Fallback directo desde el navegador: el Worker no alcanza Overpass
  // desde Cloudflare, pero el navegador sí (CORS abierto). Solo se usa
  // cuando el proxy propio devuelve vacío.
  var OVERPASS_DIRECTO = 'https://overpass-api.de/api/interpreter';
  var OVERPASS_DIRECTO_2 = 'https://overpass.kumi.systems/api/interpreter';

  var RUTA_TTL_MS = 60 * 1000;
  var MIN_GAP_MS = 1000;             // BRouter: 1 petición/segundo
  var MAX_ALTERNATIVAS = 3;
  var MAX_KM_OVERBRIDGE = 30;      // carriles bici: bbox máximo ~30 km (antes 20: con la carrera en paralelo sobra margen y la vista amplia de ciudad sí busca)
  var CARRIL_TTL_MS = 15 * 60 * 1000;
  var CARRIL_MIN_ZOOM = 10;        // por debajo de z10 no se PIDEN zonas nuevas...
  // ...pero lo ya pintado PERMANECE (01-nov-2026 b). Antes al alejarse se
  // ejecutaba pintarCarriles([]) y el carril desaparecía del mapa. Ahora las
  // capas solo se ocultan por debajo de CARRIL_ZOOM_OCULTAR y los datos
  // siguen en memoria: al acercarte otra vez reaparecen al instante, como
  // el resto de capas.
  var CARRIL_ZOOM_OCULTAR = 7;
  var CARRIL_ACUMULADO_MAX = 6000;  // tope de tramos guardados (recorte FIFO, móvil ligero)
  // Infladores/estaciones de reparación reales de OSM: son los ÚNICOS puntos
  // de la capa (nov-2026, petición de Sandro: fuera los iconos redondos
  // genéricos de bici, solo línea roja y, si existen, puntos de inflado).
  var INFLADOR_MAX = 2000;          // tope de puntos guardados
  var INFLADOR_MIN_ZOOM = 12;
  // 01-nov-2026 (c): la búsqueda se hace por MACROCELDA de 0,02° (misma
  // escala que la capa de fuentes de agua). La caja visible se expande a la
  // rejilla, se pide UNA vez y queda servida desde memoria al moverte por
  // la zona: sin releo a cada paso. Por debajo de z12,5 la consulta va en
  // modo ligero (solo vías dedicadas) y al acercarte se completa sola.
  var CARRIL_REJILLA_GRADOS = 0.02;
  var CARRIL_ZOOM_COMPLETO = 12.5;
  var carrilCeldas = new Map();     // clave macrocelda -> { features, modo, touched }

  var map = null;
  var rutaSourceListo = false;
  var carrilEnabled = false;
  var carrilToggle = null;
  var carrilTimer = 0;
  var carrilCache = new Map();
  var carrilAcumulado = new Map(); // id OSM -> tramo pintado, en orden de llegada
  var infladorAcumulado = new Map(); // id OSM (node/) -> punto de inflado/reparación
  var carrilUltima = 0;

  var lista = { ultimaClave: '', rutas: [], touched: 0 };

  function t(clave, fallback) {
    try {
      var fn = window.getMessages;
      if (typeof fn === 'function') {
        var msg = fn();
        if (msg && msg[clave] != null) return msg[clave];
      }
    } catch (e) {
      // i18n no cargado todavía: usar el texto en español es intencional,
      // no es un error de la capa.
      console.debug('[rutas-bici] i18n no disponible, uso fallback:', e);
    }
    return fallback != null ? fallback : clave;
  }

  /* ---------------- Utilidades ------------------------------------------ */
  function geoJson(geometry) { return { type: 'Feature', geometry: geometry, properties: {} }; }

  function fmtMinutos(seg) {
    var min = Math.round(seg / 60);
    return min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min';
  }

  function fmtKm(m) {
    var km = m / 1000;
    return String(km >= 10 ? Math.round(km) : (Math.round(km * 10) / 10)).replace('.', ',');
  }

  function keyRuta(o, d) {
    return o.lon.toFixed(5) + ',' + o.lat.toFixed(5) + '|' + d.lon.toFixed(5) + ',' + d.lat.toFixed(5);
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------------- Geocodificación y ubicación ------------------------- */
  async function geocodificar(consulta) {
    try {
      var resp = await fetch(GEO_URL + '/search?q=' + encodeURIComponent(consulta) + '&format=json&limit=1', { credentials: 'omit' });
      if (!resp.ok) return null;
      var datos = await resp.json();
      if (Array.isArray(datos) && datos.length) {
        return { lat: parseFloat(datos[0].lat), lon: parseFloat(datos[0].lon), nombre: datos[0].display_name || consulta };
      }
    } catch (e) { /* devuelve null */ }
    return null;
  }

  function miPosicion() {
    return new Promise(function (resolve) {
      var porMapa = function () {
        try {
          var c = map.getCenter();
          resolve({ lat: c.lat, lon: c.lng, nombre: t('tripMapCenter', 'Centro del mapa') });
        } catch (e) { resolve(null); }
      };
      if (!('geolocation' in navigator)) { porMapa(); return; }
      var hecho = false;
      var temporizador = setTimeout(function () { if (!hecho) { hecho = true; porMapa(); } }, 4000);
      navigator.geolocation.getCurrentPosition(function (pos) {
        if (hecho) return;
        hecho = true;
        clearTimeout(temporizador);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, nombre: t('myLocation', 'Mi ubicación') });
      }, function () {
        if (hecho) return;
        hecho = true;
        clearTimeout(temporizador);
        porMapa();
      }, { timeout: 3500, maximumAge: 60000 });
    });
  }

  /* ---------------- BRouter de respaldo --------------------------------- */
  var ultimaBrouter = 0;

  async function pedirBrouter(lonlats, alternativeIdx) {
    var falta = MIN_GAP_MS - (Date.now() - ultimaBrouter);
    if (falta > 0) await esperar(falta);
    ultimaBrouter = Date.now();

    var url = BROUTER_URL +
      '?lonlats=' + encodeURIComponent(lonlats) +
      '&profile=trekking&alternativeidx=' + alternativeIdx +
      '&format=geojson';

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 8000);
    try {
      var resp = await fetch(url, {
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Accept': 'application/geo+json, application/json' }
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function parseBrouter(datos) {
    var features = datos && datos.features;
    if (!Array.isArray(features) || !features.length) return null;
    var f = features[0];
    var geom = f.geometry;
    if (!geom || geom.type !== 'LineString' || !geom.coordinates || !geom.coordinates.length) return null;
    var props = f.properties || {};
    var distancia = parseFloat(props['track-length']) || 0;
    var desnivel = parseFloat(props['filtered ascend']) || 0;
    var duracion = parseFloat(props['total-time']) || 0;
    return { geometry: geom, distanciaM: distancia, duracionS: duracion, desnivelM: desnivel };
  }

  /* ---------------- Respaldo OSRM bici ---------------------------------- */
  async function pedirOsrmBici(origen, destino) {
    var coords = origen.lon + ',' + origen.lat + ';' + destino.lon + ',' + destino.lat;
    // HUD de navegación (nov-2026): steps=true NO cambia la geometría ni
    // los tiempos; solo pide además los pasos con maniobra/nombre/límite
    // para el banner del HUD. Sin este dato el banner queda oculto.
    var url = OSRM_BICI_URL + '/driving/' + coords + '?overview=full&geometries=geojson&steps=true&alternatives=' + (MAX_ALTERNATIVAS - 1);
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var resp = await fetch(url, { signal: controller.signal, credentials: 'omit' });
      if (!resp.ok) return [];
      var datos = await resp.json();
      if (!datos || datos.code !== 'Ok' || !Array.isArray(datos.routes)) return [];
      return datos.routes.map(function (r) {
        return {
          geometry: r.geometry,
          distanciaM: r.distance || 0,
          duracionS: r.duration || 0,
          desnivelM: null,
          // HUD de navegación (nov-2026, ADITIVO): pasos crudos para el banner.
          pasos: (r.legs || []).reduce(function (acc, l) { return acc.concat(l.steps || []); }, []),
        };
      }).filter(function (r) { return r.geometry && r.geometry.coordinates && r.geometry.coordinates.length; });
    } catch (e) {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------------- Cálculo de rutas ------------------------------------ */
  async function calcularRutas(origen, destino) {
    var clave = keyRuta(origen, destino);
    if (lista.ultimaClave === clave && Date.now() - lista.touched < RUTA_TTL_MS) {
      return lista.rutas;
    }

    var lonlats = origen.lon + ',' + origen.lat + '|' + destino.lon + ',' + destino.lat;
    var rutas = [];
    try {
      rutas = await pedirOsrmBici(origen, destino);
    } catch (e) {
      console.warn('[rutas-bici] El proxy OSRM no respondió; se probará BRouter.', e);
    }
    rutas.forEach(function (r, idx) { r.indice = idx; });

    // Si OSRM no devuelve una geometría, intenta BRouter en una petición
    // independiente. Este fallo nunca afecta a las rutas a pie o en coche.
    if (!rutas.length) {
      var datos = await pedirBrouter(lonlats, 0);
      var ruta = parseBrouter(datos);
      if (ruta) {
        ruta.indice = 0;
        rutas.push(ruta);
      }
    }

    lista.ultimaClave = clave;
    lista.rutas = rutas;
    lista.touched = Date.now();
    return rutas;
  }

  /* ---------------- Pintado de rutas ------------------------------------ */
  var SOURCE_ID = 'bici-rutas';
  var OUTLINE_ID = 'bici-rutas-outline';
  var LINE_ID = 'bici-rutas-line';
  var ACCENT_COLOR = '#FF6B1A';
  var SECONDARY_COLOR = '#5a6b78';

  function asegurarCapasRuta() {
    if (!map || !map.isStyleLoaded()) return false;
    if (map.getSource(SOURCE_ID)) {
      if (!map.getLayer(OUTLINE_ID)) {
        map.addLayer({
          id: OUTLINE_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 7, 15, 11],
            'line-opacity': 0.95
          }
        });
      }
      if (!map.getLayer(LINE_ID)) {
        map.addLayer({
          id: LINE_ID,
          type: 'line',
          source: SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['case', ['get', 'primaria'], ACCENT_COLOR, SECONDARY_COLOR],
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 10, 5, 15, 8],
            'line-opacity': 1
          }
        });
      }
      return true;
    }
    map.addSource(SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: OUTLINE_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 7, 15, 11],
        'line-opacity': 0.95
      }
    });
    map.addLayer({
      id: LINE_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['case', ['get', 'primaria'], ACCENT_COLOR, SECONDARY_COLOR],
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 10, 5, 15, 8],
        'line-opacity': 1
      }
    });
    return true;
  }

  function pintarRutas(rutas) {
    if (!asegurarCapasRuta()) {
      map.once('style.load', function () { pintarRutas(rutas); });
      return;
    }
    var features = rutas.map(function (r, idx) {
      var f = geoJson(r.geometry);
      f.properties = { indice: idx, primaria: idx === 0 };
      return f;
    });
    map.getSource(SOURCE_ID).setData({ type: 'FeatureCollection', features: features });
    stashHudBici(rutas);
    if (features.length) {
      try {
        var bounds = new maplibregl.LngLatBounds(features[0].geometry.coordinates[0], features[0].geometry.coordinates[0]);
        for (var i = 0; i < features.length; i++) {
          var coords = features[i].geometry.coordinates;
          for (var j = 1; j < coords.length; j++) bounds.extend(coords[j]);
        }
        map.fitBounds(bounds, { padding: { top: 90, bottom: 90, left: 40, right: 40 }, duration: 900 });
      } catch (e) { /* encuadre opcional */ }
    }
  }

  function limpiarRuta(opciones) {
    if (!(opciones && opciones.conservarRuta) && map && map.getSource(SOURCE_ID)) {
      map.getSource(SOURCE_ID).setData({ type: 'FeatureCollection', features: [] });
    }
    if (opciones && opciones.conservarRuta) return;
    if (!(opciones && opciones.conservarCampos)) {
      if (inputOrigen) inputOrigen.value = '';
      if (inputDestino) inputDestino.value = '';
    }
    if (estado) estado.textContent = '';
    if (listaAlt) listaAlt.textContent = '';
    lista.ultimaClave = '';
    lista.rutas = [];
    // HUD de navegación (nov-2026, ADITIVO): sin ruta no hay HUD.
    try { window.__manolitHudBici = null; } catch (eHud) { }
  }
  window.manolitAireLimpiarRutaBici = limpiarRuta;

  function seleccionarAlternativa(indice) {
    var source = map && map.getSource(SOURCE_ID);
    if (!source) return;
    var data = source._data || { type: 'FeatureCollection', features: [] };
    if (!Array.isArray(data.features)) return;
    data.features.forEach(function (f) {
      f.properties.primaria = (f.properties.indice === indice);
    });
    source.setData(data);
    // HUD de navegación (nov-2026, ADITIVO): el HUD sigue la alternativa
    // elegida (por defecto la 0, la primaria).
    try {
      if (window.__manolitHudBici) window.__manolitHudBici.activa = indice;
    } catch (eHud) { }
  }

  // HUD de navegación (nov-2026, ADITIVO): cada pintado deja la lista de
  // rutas accesible con la alternativa activa. Solo lectura presentacional.
  function stashHudBici(rutas) {
    try {
      window.__manolitHudBici = { rutas: rutas || [], activa: 0 };
    } catch (eHud) { }
  }

  /* ---------------- Panel ------------------------------------------------- */
  var panel = null;
  var inputOrigen = null;
  var inputDestino = null;
  var estado = null;
  var listaAlt = null;

  function construirPanel() {
    panel = document.createElement('div');
    panel.id = 'rsPanelBici';
    panel.className = 'rs-panel-viaje';
    panel.setAttribute('hidden', '');

    var titulo = document.createElement('p');
    titulo.className = 'rs-panel-viaje-tit';
    titulo.textContent = t('bikePanelTitle', 'Ruta en bicicleta');
    panel.appendChild(titulo);

    inputOrigen = document.createElement('input');
    inputOrigen.type = 'text';
    inputOrigen.setAttribute('placeholder', t('bikeOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    inputOrigen.setAttribute('aria-label', t('bikeOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
    inputOrigen.autocomplete = 'off';
    panel.appendChild(inputOrigen);

    inputDestino = document.createElement('input');
    inputDestino.type = 'text';
    inputDestino.setAttribute('placeholder', t('bikeDestPh', 'A dónde vas'));
    inputDestino.setAttribute('aria-label', t('bikeDestPh', 'A dónde vas'));
    inputDestino.autocomplete = 'off';
    panel.appendChild(inputDestino);

    var filaBotones = document.createElement('div');
    filaBotones.className = 'rs-panel-viaje-botones';
    var btnCalcular = document.createElement('button');
    btnCalcular.type = 'button';
    btnCalcular.className = 'rs-panel-viaje-calcular';
    btnCalcular.textContent = t('bikeCalcBtn', 'Trazar ruta');
    btnCalcular.addEventListener('click', function () { planificar(); });
    filaBotones.appendChild(btnCalcular);

    var btnLimpiar = document.createElement('button');
    btnLimpiar.type = 'button';
    btnLimpiar.className = 'rs-panel-viaje-limpiar';
    btnLimpiar.textContent = t('bikeClearBtn', 'Quitar ruta');
    btnLimpiar.addEventListener('click', function () { limpiarRuta(); if (estado) estado.textContent = ''; });
    filaBotones.appendChild(btnLimpiar);
    panel.appendChild(filaBotones);

    estado = document.createElement('p');
    estado.className = 'rs-panel-viaje-estado';
    estado.setAttribute('role', 'status');
    panel.appendChild(estado);

    listaAlt = document.createElement('div');
    listaAlt.className = 'rs-panel-bici-alternativas';
    panel.appendChild(listaAlt);

    var attribution = document.createElement('small');
    attribution.className = 'rs-panel-viaje-estado';
    attribution.textContent = t('bikeAttribution', 'Ruta por BRouter y © Colaboradores de OpenStreetMap · Respaldo: OSRM/FOSSGIS');
    panel.appendChild(attribution);

    var mapaWrap = document.querySelector('.map-wrap');
    if (mapaWrap && mapaWrap.parentNode) mapaWrap.parentNode.insertBefore(panel, mapaWrap.nextSibling);
    else document.getElementById('main-content')?.appendChild(panel);

    inputDestino.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); planificar(); } });
    inputOrigen.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); planificar(); } });
  }

  function pintarAlternativas(rutas) {
    if (!listaAlt) return;
    listaAlt.textContent = '';
    if (!rutas.length) return;

    var cabecera = document.createElement('p');
    cabecera.className = 'rs-panel-viaje-estado';
    cabecera.textContent = t('bikeAlternatives', 'Alternativas');
    listaAlt.appendChild(cabecera);

    rutas.forEach(function (r, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rs-panel-bici-alt' + (idx === 0 ? ' activa' : '');
      btn.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');

      var fuerte = document.createElement('strong');
      fuerte.textContent = fmtMinutos(r.duracionS) + ' · ' + fmtKm(r.distanciaM) + ' km';
      btn.appendChild(fuerte);

      if (r.desnivelM != null && r.desnivelM > 0) {
        var sub = document.createElement('span');
        sub.className = 'rs-panel-bici-sub';
        sub.textContent = ' · ' + Math.round(r.desnivelM) + ' m ' + t('bikeElevation', 'desnivel');
        btn.appendChild(sub);
      }

      btn.addEventListener('click', function () {
        seleccionarAlternativa(idx);
        var botones = listaAlt.querySelectorAll('.rs-panel-bici-alt');
        for (var i = 0; i < botones.length; i++) {
          botones[i].classList.toggle('activa', i === idx);
          botones[i].setAttribute('aria-pressed', i === idx ? 'true' : 'false');
        }
      });
      listaAlt.appendChild(btn);
    });
  }

  async function planificar(opciones) {
    if (!map) return;
    if (panel && panel.hasAttribute('hidden')) panel.removeAttribute('hidden');

    var dTxt = String(inputDestino ? inputDestino.value : '').trim();
    var oTxt = String(inputOrigen ? inputOrigen.value : '').trim();
    if (!dTxt) { if (estado) estado.textContent = t('tripNeedDest', 'Dime a dónde vas y te trazo el viaje.'); return; }

    if (estado) estado.textContent = t('bikeSearching', 'Buscando la mejor ruta en bici…');
    var destino = opciones && opciones.destino
      ? opciones.destino
      : await geocodificar(dTxt);
    if (!destino) { if (estado) estado.textContent = t('bikeNoGeocode', 'No encuentro ese destino. Prueba con el nombre de la ciudad.'); return; }
    var origen = opciones && opciones.origen
      ? opciones.origen
      : (oTxt ? await geocodificar(oTxt) : await miPosicion());
    if (!origen) { if (estado) estado.textContent = t('bikeNoOrigin', 'No encuentro ese origen. Déjalo vacío para salir de donde estás.'); return; }

    var rutas = await calcularRutas(origen, destino);
    if (!rutas.length) { if (estado) estado.textContent = t('bikeNoRoute', 'No he podido trazar la ruta en bici. Inténtalo en un momento.'); return; }

    pintarRutas(rutas);
    pintarAlternativas(rutas);
    if (estado) estado.textContent = '';
    return {
      origen: origen,
      destino: destino,
      alternativas: rutas.length,
      distanciaM: rutas[0].distanciaM,
      duracionS: rutas[0].duracionS
    };
  }

  // API pública acotada para que el chat use la misma geocodificación y
  // el mismo motor/pintado que el panel, sin duplicar rutas ni acceder al DOM.
  window.manolitAirePlanificarRutaBici = async function (origenTexto, destinoTexto, opciones) {
    if (!map || !String(destinoTexto || '').trim()) return null;
    if (panel && panel.hasAttribute('hidden')) panel.removeAttribute('hidden');
    if (inputOrigen) inputOrigen.value = String(origenTexto || '');
    if (inputDestino) inputDestino.value = String(destinoTexto || '');
    try {
      var resultado = await planificar(opciones);
      return resultado || null;
    } catch (error) {
      console.debug('[rutas-bici] No se pudo planificar desde el chat:', error);
      return null;
    }
  };

  /* ---------------- Capa de carriles bici (roja con bandas blancas) -------- */
  var CARRIL_SOURCE = 'carriles-bici-source';
  var CARRIL_HALO = 'carriles-bici-halo';
  var CARRIL_ROJO = 'carriles-bici-rojo';
  var CARRIL_BRILLO = 'carriles-bici-brillo';
  var CARRIL_BORDE_IZQ = 'carriles-bici-borde-izq';
  var CARRIL_BORDE_DER = 'carriles-bici-borde-der';
  var INFLADOR_SOURCE = 'infladores-bici-source';
  var INFLADOR_LAYER = 'infladores-bici-circulo';
  var CARRIL_CACHE_VERSION = 'osm-cycleway-20261029';
  var carrilCapaLista = false; // Flag para saber si la capa está completamente inicializada
  var carrilInicializando = false; // Flag para evitar múltiples inicializaciones
  var carrilRequestId = 0;
  var carrilStyleHandler = null;
  var infladorInteraccionLista = false;

  function bboxVisible() {
    var b = map.getBounds();
    return {
      west: Math.max(-180, b.getWest()), south: Math.max(-85, b.getSouth()),
      east: Math.min(180, b.getEast()), north: Math.min(85, b.getNorth())
    };
  }

  // 01-nov-2026 (c): dos niveles de consulta. El ligero (vías dedicadas
  // únicamente) responde en 1-3 s incluso con espejos lentos; el completo
  // añade los carriles sobre calzada y solo se pide a partir de z12,5. La
  // macrocelda recuerda el nivel con que se sirvió: al acercarte, una celda
  // ligera se repite en completa; una completa sirve para cualquier zoom.
  function consultaCarriles(bbox, ligera) {
    var s = bbox.south.toFixed(6), w = bbox.west.toFixed(6),
        n = bbox.north.toFixed(6), e = bbox.east.toFixed(6);
    var b = s + ',' + w + ',' + n + ',' + e;
    var dedicadas =
      'way["highway"="cycleway"](' + b + ');' +
      'way["bicycle"~"^(designated|official)$"](' + b + ');';
    // Los infladores y estaciones de reparación se consultan también en la
    // petición ligera: son puntos pequeños y no deben esperar al zoom alto.
    var puntosServicio =
      'node["amenity"="bicycle_repair_station"](' + b + ');' +
      'node["compressed_air"="yes"](' + b + ');' +
      'node["service:bicycle:pump"="yes"](' + b + ');';
    if (ligera) return '[out:json][timeout:8];(' + dedicadas + puntosServicio + ');out body geom;';
    // Etiquetas habituales de OSM: vías dedicadas, carriles y rutas señalizadas.
    // Se suman los nodos de INFLADO/REPARACIÓN reales (amenity=bicycle_repair_station,
    // compressed_air=yes o service:bicycle:pump=yes): son los únicos puntos
    // que se pintan sobre el carril, con popup al tocarlos.
    return '[out:json][timeout:8];(' + dedicadas +
      'way["cycleway"](' + b + ');' +
      'way["cycleway:left"](' + b + ');' +
      'way["cycleway:right"](' + b + ');' +
      'way["cycleway:both"](' + b + ');' +
      'node["amenity"="bicycle_repair_station"](' + b + ');' +
      'node["compressed_air"="yes"](' + b + ');' +
      'node["service:bicycle:pump"="yes"](' + b + ');' +
      ');out body geom;';
  }

  // Expande la caja visible a la macrocelda de la rejilla: una sola
  // petición cubre los paseos por la zona y el caché de memoria responde
  // al instante, igual que hace la capa de fuentes de agua.
  function macroceldaCarriles(bbox) {
    var g = CARRIL_REJILLA_GRADOS;
    return {
      west: Math.max(-180, Math.floor(bbox.west / g) * g),
      south: Math.max(-85, Math.floor(bbox.south / g) * g),
      east: Math.min(180, Math.ceil(bbox.east / g) * g),
      north: Math.min(85, Math.ceil(bbox.north / g) * g)
    };
  }

  function wayToLineString(element) {
    if (!element) return null;
    var coords = Array.isArray(element.geometry)
      ? element.geometry.map(function (p) { return [Number(p.lon), Number(p.lat)]; })
      : [];
    if (coords.length < 2 && Array.isArray(element.nodes)) {
      coords = element.nodes.map(function (node) { return [Number(node.lon), Number(node.lat)]; })
        .filter(function (p) { return Number.isFinite(p[0]) && Number.isFinite(p[1]); });
    }
    if (coords.length < 2 || coords.some(function (p) { return !Number.isFinite(p[0]) || !Number.isFinite(p[1]); })) return null;
    var props = element.tags || {};
    // id estable del elemento OSM: permite acumular zonas sin duplicar tramos
    props.__cid = (element.type || 'way') + '/' + element.id;
    return { type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: coords } };
  }

  // Nodo OSM de inflado/reparación de bicicletas -> punto para la capa.
  // Son los únicos marcadores que quedan sobre el carril (nov-2026).
  function nodoAInflador(element) {
    if (!element || element.type !== 'node') return null;
    var lat = Number(element.lat);
    var lon = Number(element.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    var tags = element.tags || {};
    var reparacion = tags['amenity'] === 'bicycle_repair_station';
    var inflador = tags['compressed_air'] === 'yes' || tags['service:bicycle:pump'] === 'yes';
    if (!reparacion && !inflador) return null;
    return {
      type: 'Feature',
      properties: {
        __cid: 'node/' + element.id,
        name: tags.name || '',
        reparacion: reparacion,
        inflador: inflador,
        operador: tags.operator || tags.brand || '',
        horario: tags.opening_hours || ''
      },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    };
  }

  // 01-nov-2026: el proxy y los espejos compiten EN PARALELO. Antes era una
  // cadena (proxy 20 s -> overpass-api.de 15 s -> kumi 15 s): con Overpass
  // rechazando al Worker (406 y timeouts) el primer carril podía tardar
  // ~50 s en pintarse o no pintarse nunca y nadie avisaba. Ahora gana el
  // primero que responda con una respuesta válida, como en la capa de
  // fuentes de agua, y el carril de Sevilla (y el de cualquier ciudad)
  // aparece en 1-3 s.
  var OVERPASS_ESPEJOS_CARRIL = [
    OVERPASS_DIRECTO,
    'https://lz4.overpass-api.de/api/interpreter',
    OVERPASS_DIRECTO_2,
    'https://overpass.private.coffee/api/interpreter'
  ];

  async function pedirCarriles(url, bbox, timeoutMs, esProxy, ligera) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, timeoutMs);
    try {
      var resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'Accept': 'application/json' },
        body: new URLSearchParams({ data: consultaCarriles(bbox, ligera) }).toString(),
        credentials: 'omit',
        signal: controller.signal
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      // El proxy responde 200 con elements vacío cuando TODOS sus espejos
      // han fallado: eso no es "zona sin carriles", es un fallo. Se lee la
      // cabecera X-Proxy-Aviso y se trata como error para que otro gane.
      if (esProxy && resp.headers.get('X-Proxy-Aviso') === 'sin-datos') throw new Error('proxy sin-datos');
      var datos = await resp.json();
      if (!datos || !Array.isArray(datos.elements)) throw new Error('respuesta inválida');
      var carriles = [];
      var infladores = [];
      datos.elements.forEach(function (el) {
        if (el && el.type === 'node') {
          var punto = nodoAInflador(el);
          if (punto) infladores.push(punto);
          return;
        }
        var tramo = wayToLineString(el);
        if (tramo) carriles.push(tramo);
      });
      return { carriles: carriles, infladores: infladores };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function pedirCarrilesCarrera(bbox, ligera) {
    var participantes = [pedirCarriles(OVERPASS_URL, bbox, 18000, true, ligera)]
      .concat(OVERPASS_ESPEJOS_CARRIL.map(function (url) { return pedirCarriles(url, bbox, 15000, false, ligera); }));
    // El primero que resuelve (incluida una respuesta vacía válida) gana.
    // Promise.any no está disponible en todos los navegadores que soporta
    // este sitio; un rechazo agregado se deja manejar por cargarCarriles().
    if (typeof Promise.any === 'function') return Promise.any(participantes);
    return new Promise(function (resolve, reject) {
      var pendientes = participantes.length;
      var errores = [];
      participantes.forEach(function (participante) {
        Promise.resolve(participante).then(resolve, function (error) {
          errores.push(error);
          pendientes--;
          if (!pendientes) reject(errores[0] || new Error('Overpass no disponible'));
        });
      });
    });
  }

  var carrilFallosSeguidos = 0;
  var carrilStatusPropio = false;
  function mostrarEstadoCarril(texto) {
    // La barra de estado flotante sobre el mapa ("Carriles bici · N tramos")
    // queda desactivada: era un cartel feo encima del mapa. La capa sigue
    // cargando y pintando igual; simplemente ya no escribe en #rsStatus.
  }
  function limpiarEstadoCarril() {
    // Solo borramos lo que escribió esta capa: el estado puede estar
    // mostrando un aviso de la capa de transporte o de las fuentes.
    if (carrilStatusPropio) mostrarEstadoCarril('');
  }

  async function cargarCarriles() {
    if (!carrilEnabled || !map) return;
    var requestId = ++carrilRequestId;
    var bbox = bboxVisible();
    var zoom = map.getZoom();
    if (bbox.east <= bbox.west || bbox.north <= bbox.south) return;
    var ladoKm = Math.max(
      (bbox.east - bbox.west) * 111.32 * Math.cos((bbox.south + bbox.north) / 2 * Math.PI / 180),
      (bbox.north - bbox.south) * 111.32
    );

    // Crear la capa aunque se haga zoom hacia fuera, para evitar que una
    // consulta anterior deje datos en pantalla fuera del área/zoom válido.
    var capaLista = await asegurarCapaCarril();
    if (!capaLista && carrilEnabled && requestId === carrilRequestId) {
      // 01-nov-2026: el estilo aún cargaba. Antes se devolvía false en
      // silencio y la capa no aparecía hasta mover el mapa. Ahora se espera
      // (sondeo de 250 ms, tope de 12 s) y se intenta de nuevo.
      capaLista = await new Promise(function (resolve) {
        var t0 = Date.now();
        var sondeo = setInterval(function () {
          if (!carrilEnabled || requestId !== carrilRequestId || Date.now() - t0 > 12000) {
            clearInterval(sondeo);
            resolve(false);
            return;
          }
          if (map && map.isStyleLoaded()) {
            clearInterval(sondeo);
            asegurarCapaCarril().then(resolve, function () { resolve(false); });
          }
        }, 250);
      });
    }
    if (!capaLista || !carrilEnabled || requestId !== carrilRequestId) return;
    if (zoom < CARRIL_MIN_ZOOM || ladoKm > MAX_KM_OVERBRIDGE) {
      // 01-nov-2026 (b): aquí antes se hacía pintarCarriles([]) y el carril
      // se BORRABA entero al alejarse o con vista amplia. Ahora lo pintado
      // permanece en el mapa: solo se pausa la búsqueda de zonas nuevas y
      // se avisa en la barra de estado.
      mostrarEstadoCarril(t('bikeLaneZoomIn', 'Acércate un poco para cargar más carriles.'));
      return;
    }

    // (c) MACROCELDA: la caja visible se expande a la rejilla de 0,02° y la
    // respuesta queda servida en memoria. Moverse por la zona ya no vuelve
    // a pedir nada (antes cada movimiento con cambio de caja era una
    // consulta nueva de varios segundos). Una celda completa sirve para
    // cualquier zoom; una ligera se repite en completa al acercarse.
    var celda = macroceldaCarriles(bbox);
    var zoomAlto = zoom >= CARRIL_ZOOM_COMPLETO;
    var claveCelda = celda.west.toFixed(3) + ':' + celda.south.toFixed(3) + ':' + celda.east.toFixed(3) + ':' + celda.north.toFixed(3);
    var celdaCache = carrilCeldas.get(claveCelda);
    if (celdaCache && Date.now() - celdaCache.touched < CARRIL_TTL_MS && (celdaCache.modo === 'completa' || !zoomAlto)) {
      incorporarCarriles(celdaCache.features);
      incorporarInfladores(celdaCache.infladores);
      repintarCarrilAcumulado();
      mostrarEstadoCarril(carrilAcumulado.size
        ? t('bikeLaneStatus', 'Carriles bici · {n} tramos').replace('{n}', String(carrilAcumulado.size))
        : t('bikeLaneNoData', 'Sin carriles bici mapeados en esta zona.'));
      return;
    }

    var clave = CARRIL_CACHE_VERSION + ':' + [bbox.west.toFixed(3), bbox.south.toFixed(3), bbox.east.toFixed(3), bbox.north.toFixed(3)].join(':');
    var cached = carrilCache.get(clave);
    if (cached && Date.now() - cached.touched < CARRIL_TTL_MS) {
      incorporarCarriles(cached.features);
      incorporarInfladores(cached.infladores);
      repintarCarrilAcumulado();
      mostrarEstadoCarril(t('bikeLaneStatus', 'Carriles bici · {n} tramos').replace('{n}', String(carrilAcumulado.size)));
      return;
    }

    var falta = 500 - (Date.now() - carrilUltima);
    if (falta > 0) await esperar(falta);
    if (!carrilEnabled || requestId !== carrilRequestId) return;
    carrilUltima = Date.now();

    try {
      mostrarEstadoCarril(t('bikeLaneLoading', 'Cargando carriles bici…'));
      // Proxy propio y espejos Overpass directos, todos a la vez, sobre la
      // macrocelda: gana el primero con respuesta válida (ver nota de
      // pedirCarrilesCarrera). En zoom lejano la consulta va ligera y vuela.
      var datos = await pedirCarrilesCarrera(celda, !zoomAlto);
      if (!carrilEnabled || requestId !== carrilRequestId) return;
      var features = datos.carriles;
      var infladores = datos.infladores;
      // No cachear vacío: un fallo temporal no debe ocultar el carril 15 min.
      if (features.length || infladores.length) {
        carrilCeldas.set(claveCelda, { features: features, infladores: infladores, modo: zoomAlto ? 'completa' : 'ligera', touched: Date.now() });
        while (carrilCeldas.size > 120) carrilCeldas.delete(carrilCeldas.keys().next().value);
        // El caché fino heredado sigue alimentado: si una consulta externa
        // (chat) pide exactamente esta caja, responde sin red.
        carrilCache.set(clave, { features: features, infladores: infladores, touched: Date.now() });
        while (carrilCache.size > 200) carrilCache.delete(carrilCache.keys().next().value);
      }
      // (b) Los tramos nuevos se SUMAN a los ya pintados (nunca se borra lo
      // que ya se veía al moverse por el mapa) y se repinta el conjunto.
      incorporarCarriles(features);
      incorporarInfladores(infladores);
      repintarCarrilAcumulado();
      carrilFallosSeguidos = 0;
      mostrarEstadoCarril(carrilAcumulado.size
        ? t('bikeLaneStatus', 'Carriles bici · {n} tramos').replace('{n}', String(carrilAcumulado.size))
        : t('bikeLaneNoData', 'Sin carriles bici mapeados en esta zona.'));
    } catch (e) {
      if (carrilEnabled && requestId === carrilRequestId) {
        console.warn('[rutas-bici] No se pudieron cargar carriles bici:', e);
        // Reintento con espera creciente mientras la capa siga activa: un
        // espejo caído o un 429 puntual se curan solos, sin tocar el toggle.
        carrilFallosSeguidos++;
        var esperaMs = Math.min(45000, 4000 * Math.pow(2, carrilFallosSeguidos - 1));
        mostrarEstadoCarril(t('bikeLaneError', 'No se pudieron cargar los carriles bici. Reintento en marcha.'));
        clearTimeout(carrilTimer);
        carrilTimer = setTimeout(cargarCarriles, esperaMs);
      }
    }
  }

  // Popup de los puntos de inflado/reparación: se construye con nodos DOM
  // (nada de innerHTML con datos de OSM) y se registra UNA sola vez.
  function prepararInteraccionInfladores() {
    if (infladorInteraccionLista || !map) return;
    infladorInteraccionLista = true;
    map.on('click', function (e) {
      if (!map.getLayer(INFLADOR_LAYER)) return;
      var feats = map.queryRenderedFeatures(e.point, { layers: [INFLADOR_LAYER] });
      if (!feats.length) return;
      var p = feats[0].properties || {};
      var coords = feats[0].geometry.coordinates;
      var caja = document.createElement('div');
      var titulo = document.createElement('b');
      titulo.textContent = p.name ||
        (p.reparacion ? t('bikeRepairStation', 'Punto de reparación de bicicletas') : t('bikePump', 'Inflador para bicicletas'));
      caja.appendChild(titulo);
      var detalles = [];
      if (p.reparacion) detalles.push(t('bikeRepairStation', 'Punto de reparación de bicicletas'));
      if (p.inflador) detalles.push(t('bikePump', 'Inflador para bicicletas'));
      if (p.operador) detalles.push(p.operador);
      if (p.horario) detalles.push(p.horario);
      if (detalles.length) {
        var sub = document.createElement('div');
        sub.textContent = detalles.join(' · ');
        caja.appendChild(sub);
      }
      new maplibregl.Popup({ closeButton: true })
        .setLngLat([Number(coords[0]), Number(coords[1])])
        .setDOMContent(caja)
        .addTo(map);
    });
    map.on('mousemove', function (e) {
      if (!map.getLayer(INFLADOR_LAYER)) return;
      var feats = map.queryRenderedFeatures(e.point, { layers: [INFLADOR_LAYER] });
      map.getCanvas().style.cursor = feats.length ? 'pointer' : '';
    });
  }

  async function asegurarCapaCarril() {
    if (!map || !map.isStyleLoaded()) return false;
    if (carrilCapaLista && map.getSource(CARRIL_SOURCE) && map.getLayer(CARRIL_ROJO)) return true;
    if (carrilInicializando) {
      for (var intento = 0; intento < 40 && carrilInicializando; intento++) await esperar(50);
      return !!(map && map.isStyleLoaded() && map.getSource(CARRIL_SOURCE) && map.getLayer(CARRIL_ROJO));
    }

    carrilInicializando = true;
    var mapaInicial = map;
    var estiloInicial = map.getStyle();

    try {
      if (map !== mapaInicial || !mapaInicial.isStyleLoaded()) return false;

      // Crear la fuente de datos si no existe
      if (!map.getSource(CARRIL_SOURCE)) {
        map.addSource(CARRIL_SOURCE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          attribution: 'Carriles bici © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">Colaboradores de OpenStreetMap</a> (ODbL)'
        });
      }

      // 1. HALO DE CRISTAL (aura translúcida bajo el tubo, efecto glass)
      if (!map.getLayer(CARRIL_HALO)) {
        map.addLayer({
          id: CARRIL_HALO,
          type: 'line',
          source: CARRIL_SOURCE,
          minzoom: CARRIL_ZOOM_OCULTAR,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#FF6B5E',
            'line-opacity': 0.18,
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'],
              7, 5,
              10, 7,
              12, 10,
              14, 14,
              16, 19,
              18, 25,
              20, 34
            ]
          }
        });
      }

      // 2. TUBO PRINCIPAL (coral suave translúcido; antes rojo puro #E31837)
      if (!map.getLayer(CARRIL_ROJO)) {
        map.addLayer({
          id: CARRIL_ROJO,
          type: 'line',
          source: CARRIL_SOURCE,
          minzoom: CARRIL_ZOOM_OCULTAR,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#E4574C', // coral glass, rojo menos chillón (petición de Sandro 01-nov-2026)
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'],
              7, 1.8,
              10, 2.4,
              12, 3.6,
              14, 6,
              16, 9,
              18, 13,
              20, 18
            ],
            'line-opacity': 0.6
          }
        });
      }

      // 3. BRILLO CENTRAL (reflejo interior del cristal)
      if (!map.getLayer(CARRIL_BRILLO)) {
        map.addLayer({
          id: CARRIL_BRILLO,
          type: 'line',
          source: CARRIL_SOURCE,
          minzoom: CARRIL_ZOOM_OCULTAR,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#FFE9E4',
            'line-opacity': 0.38,
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'],
              7, 0.5,
              10, 0.7,
              12, 1.1,
              14, 1.7,
              16, 2.5,
              18, 3.4,
              20, 4.6
            ]
          }
        });
      }

      // 4. BORDE IZQUIERDO (filo de cristal; antes banda blanca dura)
      if (!map.getLayer(CARRIL_BORDE_IZQ)) {
        map.addLayer({
          id: CARRIL_BORDE_IZQ,
          type: 'line',
          source: CARRIL_SOURCE,
          minzoom: CARRIL_ZOOM_OCULTAR,
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'],
              7, 0.5,
              10, 0.7,
              12, 1,
              14, 1.6,
              16, 2.2,
              18, 3,
              20, 4.2
            ],
            'line-opacity': 0.4,
            'line-offset': ['interpolate', ['exponential', 1.5], ['zoom'],
              7, -1.4,
              10, -1.9,
              12, -2.8,
              14, -4.2,
              16, -6,
              18, -8.5,
              20, -12
            ]
          }
        });
      }

      // 5. BORDE DERECHO (filo de cristal; antes banda blanca dura)
      if (!map.getLayer(CARRIL_BORDE_DER)) {
        map.addLayer({
          id: CARRIL_BORDE_DER,
          type: 'line',
          source: CARRIL_SOURCE,
          minzoom: CARRIL_ZOOM_OCULTAR,
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': ['interpolate', ['exponential', 1.5], ['zoom'],
              7, 0.5,
              10, 0.7,
              12, 1,
              14, 1.6,
              16, 2.2,
              18, 3,
              20, 4.2
            ],
            'line-opacity': 0.4,
            'line-offset': ['interpolate', ['exponential', 1.5], ['zoom'],
              7, 1.4,
              10, 1.9,
              12, 2.8,
              14, 4.2,
              16, 6,
              18, 8.5,
              20, 12
            ]
          }
        });
      }

      // 6. INFLADORES / PUNTOS DE REPARACIÓN reales de OSM (nov-2026).
      // Antes había un icono redondo de bici repetido cada 100 m sobre el
      // trazado: fuera. Solo quedan puntos donde DE VERDAD hay un inflador
      // o una estación de reparación, con popup al tocarlos.
      if (!map.getSource(INFLADOR_SOURCE)) {
        map.addSource(INFLADOR_SOURCE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }
      if (!map.getLayer(INFLADOR_LAYER)) {
        map.addLayer({
          id: INFLADOR_LAYER,
          type: 'circle',
          source: INFLADOR_SOURCE,
          minzoom: INFLADOR_MIN_ZOOM,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 6.5, 19, 9],
            'circle-color': '#FFFFFF',
            'circle-opacity': 0.95,
            'circle-stroke-color': '#E4574C',
            'circle-stroke-width': 2.2,
            'circle-stroke-opacity': 0.9
          }
        });
      }
      prepararInteraccionInfladores();

      carrilCapaLista = true;
      return true;
      
    } catch (e) {
      console.error('[rutas-bici] Error inicializando capa de carriles:', e);
      return false;
    } finally {
      carrilInicializando = false;
    }
  }

  // 01-nov-2026 (b): acumulador de zonas. Antes cada consulta REEMPLAZABA
  // lo pintado: al moverte a otro barrio el carril anterior desaparecía, y
  // al alejarte se borraba todo. Ahora los tramos se suman por su id de OSM
  // (sin duplicar) y el conjunto se recorta en FIFO si supera el tope,
  // para que el móvil siga ligero.
  function incorporarCarriles(features) {
    (features || []).forEach(function (f) {
      if (!f || !f.geometry || f.geometry.type !== 'LineString') return;
      var id = f.properties && f.properties.__cid;
      if (!id) {
        var c = f.geometry.coordinates || [];
        var p1 = c[0] || [0, 0];
        var p2 = c[c.length - 1] || p1;
        id = 'geo/' + p1[0].toFixed(5) + ',' + p1[1].toFixed(5) + '/' + p2[0].toFixed(5) + ',' + p2[1].toFixed(5) + '/' + c.length;
      }
      if (carrilAcumulado.has(id)) carrilAcumulado.delete(id); // al final: más reciente
      carrilAcumulado.set(id, f);
    });
    while (carrilAcumulado.size > CARRIL_ACUMULADO_MAX) {
      carrilAcumulado.delete(carrilAcumulado.keys().next().value);
    }
    return carrilAcumulado.size;
  }

  // Los puntos de inflado/reparación se acumulan igual que los tramos: por
  // id de nodo OSM, sin duplicar, con el mismo recorte FIFO.
  function incorporarInfladores(infladores) {
    (infladores || []).forEach(function (f) {
      if (!f || !f.geometry || f.geometry.type !== 'Point') return;
      var id = (f.properties && f.properties.__cid) ||
        'geo/' + f.geometry.coordinates[0].toFixed(5) + ',' + f.geometry.coordinates[1].toFixed(5);
      if (infladorAcumulado.has(id)) infladorAcumulado.delete(id);
      infladorAcumulado.set(id, f);
    });
    while (infladorAcumulado.size > INFLADOR_MAX) {
      infladorAcumulado.delete(infladorAcumulado.keys().next().value);
    }
    return infladorAcumulado.size;
  }

  function repintarCarrilAcumulado() {
    if (!map || !map.getSource(CARRIL_SOURCE)) return;
    // Orden de apilado: el último movido queda por encima (los puntos de
    // inflado, encima del trazado del carril).
    [CARRIL_HALO, CARRIL_ROJO, CARRIL_BRILLO, CARRIL_BORDE_IZQ, CARRIL_BORDE_DER, INFLADOR_LAYER].forEach(function (id) { if (map.getLayer(id)) map.moveLayer(id); });
    map.getSource(CARRIL_SOURCE).setData({
      type: 'FeatureCollection',
      features: Array.from(carrilAcumulado.values())
    });
    if (map.getSource(INFLADOR_SOURCE)) {
      map.getSource(INFLADOR_SOURCE).setData({
        type: 'FeatureCollection',
        features: Array.from(infladorAcumulado.values())
      });
    }
  }

  async function pintarCarriles(features) {
    if (!carrilEnabled || !map || !map.isStyleLoaded()) return;
    var capaLista = await asegurarCapaCarril();
    if (!capaLista || !carrilEnabled || !map || !map.getSource(CARRIL_SOURCE)) return;
    // (b) Pintar ya nunca sustituye: suma al acumulado y repinta el conjunto.
    incorporarCarriles(features);
    repintarCarrilAcumulado();
  }

  function destroyCarril() {
    carrilRequestId++;
    clearTimeout(carrilTimer);
    try {
      [INFLADOR_LAYER, CARRIL_BORDE_DER, CARRIL_BORDE_IZQ, CARRIL_BRILLO, CARRIL_ROJO, CARRIL_HALO].forEach(function(id) {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(CARRIL_SOURCE)) map.removeSource(CARRIL_SOURCE);
      if (map.getSource(INFLADOR_SOURCE)) map.removeSource(INFLADOR_SOURCE);
    } catch (e) { /* estilo reemplazado */ }
    carrilCapaLista = false;
    carrilInicializando = false;
    carrilAcumulado.clear();
    infladorAcumulado.clear();
    // (c) carrilCeldas NO se borra: al reactivar la capa la zona ya está
    // servida en memoria y se pinta al instante, como fuentes de agua.
  }

  function onCarrilToggle() {
    carrilEnabled = !!(carrilToggle && carrilToggle.checked);
    clearTimeout(carrilTimer);
    if (carrilEnabled) {
      carrilFallosSeguidos = 0;
      // Aviso inmediato: la capa ya está trabajando (01-nov-2026).
      mostrarEstadoCarril(t('bikeLaneLoading', 'Cargando carriles bici…'));
      map.off('moveend', scheduleCarril);
      map.on('moveend', scheduleCarril);
      map.off('zoomend', scheduleCarril);
      map.on('zoomend', scheduleCarril);
      cargarCarriles();
    } else {
      map.off('moveend', scheduleCarril);
      map.off('zoomend', scheduleCarril);
      destroyCarril();
      limpiarEstadoCarril();
    }
  }

  function scheduleCarril() {
    if (!carrilEnabled) return;
    clearTimeout(carrilTimer);
    carrilTimer = setTimeout(cargarCarriles, 200);
  }

  /* ---------------- Arranque -------------------------------------------- */
  function iniciar(mapa) {
    map = mapa;
    construirPanel();

    var monteBici = document.getElementById('rsMonteBici');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'rsBtnBici';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-controls', 'rsPanelBici');
    btn.textContent = t('bikeBtn', 'Ruta en bici');
    btn.addEventListener('click', function () {
      if (!panel) return;
      var abierto = !panel.hasAttribute('hidden');
      if (!abierto) {
        panel.removeAttribute('hidden');
        void panel.offsetHeight;
        panel.classList.add('rs-panel-viaje-abierto');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        panel.classList.remove('rs-panel-viaje-abierto');
        btn.setAttribute('aria-pressed', 'false');
        setTimeout(function () {
          if (!panel.classList.contains('rs-panel-viaje-abierto')) panel.setAttribute('hidden', '');
        }, 280);
      }
    });

    if (monteBici) monteBici.appendChild(btn);
    else {
      var lista = document.getElementById('rsListaCapas');
      if (lista) {
        var fila = document.createElement('div');
        fila.className = 'rs-capa-fila rs-capa-fila-btn rs-ico-bici';
        fila.id = 'rsMonteBici';
        fila.appendChild(btn);
        lista.appendChild(fila);
      }
    }

    carrilToggle = document.getElementById('rsToggleCarrilesBici');
    if (carrilToggle) {
      carrilToggle.addEventListener('change', onCarrilToggle);
      // Si se reemplaza el estilo del mapa, MapLibre elimina las fuentes y
      // capas personalizadas: recrearlas y volver a pedir los datos.
      carrilStyleHandler = function () {
        carrilCapaLista = false;
        carrilInicializando = false;
        if (carrilEnabled) {
          clearTimeout(carrilTimer);
          carrilTimer = setTimeout(cargarCarriles, 150);
        }
      };
      map.on('style.load', carrilStyleHandler);
      if (carrilToggle.checked) onCarrilToggle();
    }

    document.addEventListener('manolito:idioma-cambiado', function () {
      btn.textContent = t('bikeBtn', 'Ruta en bici');
      var tit = panel.querySelector('.rs-panel-viaje-tit');
      if (tit) tit.textContent = t('bikePanelTitle', 'Ruta en bicicleta');
      if (inputOrigen) inputOrigen.setAttribute('placeholder', t('bikeOriginPh', 'Desde dónde sales (vacío = tu ubicación)'));
      if (inputDestino) inputDestino.setAttribute('placeholder', t('bikeDestPh', 'A dónde vas'));
    });
  }

  (function esperarMapa(intentos) {
    try {
      var mapa = window.manolitAireMap;
      if (mapa) { iniciar(mapa); return; }
    } catch (e) {
      console.debug('[rutas-bici] Error al enganchar el mapa:', e);
    }
    if (intentos < 240) setTimeout(function () { esperarMapa(intentos + 1); }, 500);
  })(0);
})();