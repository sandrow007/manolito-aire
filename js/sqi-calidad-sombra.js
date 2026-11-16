/* ==========================================================================
   CALIDAD DE SOMBRA (SQI) — Manolit∞ Aire (nov-2026)
   --------------------------------------------------------------------------
   Colorea las sombras proyectadas que YA dibuja shadows-route.js según su
   calidad térmica real y alimenta el bloque compacto del widget solar SVG.
   Con polvo o aire contaminado la radiación difusa también calienta dentro
   de la sombra, y el SQI lo hace visible.

   REGLAS DURAS DE RENDIMIENTO (móvil que no se calienta):
     - UN solo SQI por polígono, calculado en su centroide. Nada de
       cálculos por píxel, cuadrícula o punto del mapa.
     - Polígonos enormes: se muestrean 2-3 centroides lógicos y se usa el
       valor medio. Nada más masivo.
     - El SQI se guarda como PROPIEDAD del polígono de sombra (sqi, sqi_color,
       sqi_hora), nunca en la geometría del suelo.
     - Las llamadas a Open-Meteo son UNA por zona y hora (caché de 20 min),
       nunca por polígono. Lo que cambia entre polígonos es solo el SVF.
     - Cálculo en lotes de 20 polígonos entre tandas, nunca de golpe. La UI
       nunca espera.
     - Cero errores en consola: fallo silencioso y la sombra queda como
       estaba.
     - No se toca la lógica geométrica de sombras: esto solo escucha los
       datos que la fuente 'sombras' ya publica.

   Fórmula:
     SVF  = fracción de cielo visible en el centroide (0-1), con los
            edificios OSM ya cargados en el mapa, radio 100 m, 8 direcciones.
     DHIef = DHI x SVF
     SQI  = clamp(0, 100, 100 x (1 - DHIef / GHI))
     Si GHI <= 10 W/m2 o el sol está bajo el horizonte: estado "noche", sin
     teñir y con la vista deshabilitada.
     AOD y PM2.5 NO entran en la fórmula: son dato y texto contextual.

   Colores (paleta del sistema):
     85-100 efectiva  verde  #00B98A (var(--breath-good))
     65-84  reducida  amarillo #FFC033
     40-64  débil     naranja var(--accent)
     0-39   ilusoria  rojo   var(--breath-bad)
   ========================================================================== */
(function () {
  'use strict';
  if (window.__manolitSqiIntegrado) return;
  window.__manolitSqiIntegrado = true;

  var S = {
    map: null,
    capaEdificios: null,     // id de la capa fill-extrusion de edificios
    pintando: false,         // true mientras un setData propio está en vuelo
    calculando: false,
    horaKey: '',             // yyyy-MM-ddTHH de la última tanda aplicada
    sigGeometria: '',        // firma de la colección (nº de features)
    cacheSvf: new Map(),     // key polígono -> { geoKey, svf }
    cacheApi: new Map(),     // zona+hora -> { ts, datos }
    ultimosMeteo: null,      // última respuesta buena (para la UI)
    rafProgramado: false,
    timerReevaluacion: null,
    ultimaEval: 0
  };

  var UMBRAL_AREA_GRANDE = 20000;   // m2: polígono enorme (un parque)
  var RADIO_SVF = 100;              // metros
  var LOTE = 20;                    // polígonos por tanda
  var TTL_CACHE = 20 * 60 * 1000;   // 20 minutos
  var RETRASO_REEVALUACION = 40000; // se repasa la hora cada 40 s

  /* ---------------------------------------------------------------------
     Utilidades
     --------------------------------------------------------------------- */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function horaKeyDe(fecha) {
    var f = fecha;
    return f.getFullYear() + '-' +
      ('0' + (f.getMonth() + 1)).slice(-2) + '-' +
      ('0' + f.getDate()).slice(-2) + 'T' +
      ('0' + f.getHours()).slice(-2);
  }

  function fechaEfectiva() {
    try {
      if (typeof window.manolitAireHoraEfectiva === 'function') {
        var f = window.manolitAireHoraEfectiva();
        if (f instanceof Date && !isNaN(f)) return f;
      }
    } catch (e) { }
    return new Date();
  }

  function colorDeSqi(sqi) {
    if (sqi >= 85) return '#00B98A';
    if (sqi >= 65) return '#FFC033';
    if (sqi >= 40) return '#FF6B1A';
    return '#E63E5F';
  }

  function estadoDeSqi(sqi) {
    if (sqi >= 85) return 'Sombra efectiva';
    if (sqi >= 65) return 'Sombra reducida';
    if (sqi >= 40) return 'Sombra débil';
    return 'Sombra ilusoria';
  }

  /* ---------------------------------------------------------------------
     Pestañas de la tarjeta y reubicación de los bloques existentes.
     --------------------------------------------------------------------- */
  function montarTabs() {
    var tabs = document.querySelectorAll('[data-rs-sqi-tab]');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        activarTab(this.getAttribute('data-rs-sqi-tab'));
      });
    }
  }

  function activarTab(nombre) {
    var tabs = document.querySelectorAll('[data-rs-sqi-tab]');
    for (var i = 0; i < tabs.length; i++) {
      var activa = tabs[i].getAttribute('data-rs-sqi-tab') === nombre;
      tabs[i].classList.toggle('rs-sqi-tab-activa', activa);
      tabs[i].setAttribute('aria-selected', activa ? 'true' : 'false');
    }
    var vistas = document.querySelectorAll('.rs-sqi-vista');
    for (var j = 0; j < vistas.length; j++) {
      vistas[j].hidden = vistas[j].getAttribute('data-rs-sqi-vista') !== nombre &&
        vistas[j].id !== 'rsSqiVistaSombra' &&
        vistas[j].id !== 'rsSqiVistaAire' &&
        vistas[j].id !== 'rsSqiVistaPrevision';
    }
    document.getElementById('rsSqiVistaSombra').hidden = nombre !== 'sombra';
    document.getElementById('rsSqiVistaAire').hidden = nombre !== 'aire';
    document.getElementById('rsSqiVistaPrevision').hidden = nombre !== 'prevision';
    try { document.querySelector('.rs-sqi-card').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { }
  }

  function reubicarBloques() {
    try {
      var vistaAire = document.getElementById('rsSqiVistaAire');
      var aqi = document.getElementById('rsAqiPanel');
      if (vistaAire && aqi && aqi.parentElement !== vistaAire) vistaAire.appendChild(aqi);
      var vistaPrevision = document.getElementById('rsSqiVistaPrevision');
      var evolucion = document.querySelector('.forecast-section');
      if (vistaPrevision && evolucion && evolucion.parentElement !== vistaPrevision) vistaPrevision.appendChild(evolucion);
    } catch (e) { }
  }

  /* ---------------------------------------------------------------------
     Cliente Open-Meteo con caché por zona+hora y 3 reintentos con backoff.
     Dos endpoints por zona (forecast y air-quality), cada uno una vez por
     hora efectiva. Sin red o con fallo: se devuelve null y la sombra queda
     como estaba. Cero ruido en consola.
     --------------------------------------------------------------------- */
  function fetchConReintentos(url, intentos) {
    intentos = intentos || 0;
    var ctl;
    try { ctl = new AbortController(); } catch (e) { ctl = null; }
    var timer = null;
    if (ctl) timer = setTimeout(function () { try { ctl.abort(); } catch (e) { } }, 8000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (intentos < 2) {
        return new Promise(function (res) { setTimeout(res, 800 * Math.pow(2, intentos)); })
          .then(function () { return fetchConReintentos(url, intentos + 1); });
      }
      return null; // fallo silencioso
    });
  }

  function meteoDeZona(lat, lon, horaKey) {
    var clave = lat.toFixed(3) + ',' + lon.toFixed(3) + '|' + horaKey;

    var enCache = S.cacheApi.get(clave);
    if (enCache && Date.now() - enCache.ts < TTL_CACHE) {
      return Promise.resolve(enCache);
    }
    var urlSol = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) +
      '&longitude=' + lon.toFixed(4) +
      '&hourly=shortwave_radiation,diffuse_radiation&forecast_days=2&timezone=auto';
    var urlAire = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat.toFixed(4) +
      '&longitude=' + lon.toFixed(4) +
      '&hourly=aerosol_optical_depth,pm2_5&forecast_days=2&timezone=auto';
    return Promise.all([fetchConReintentos(urlSol), fetchConReintentos(urlAire)])
      .then(function (res) {
        var sol = res[0], aire = res[1];
        if (!sol || !aire) return null;
        var datos = { sol: sol, aire: aire, ts: Date.now(), clave: clave };
        // La caché nunca crece sin límite: se purga al pasar de 40 entradas.
        if (S.cacheApi.size > 40) {
          try {
            var keys = Array.from(S.cacheApi.keys());
            for (var i = 0; i < keys.length - 20; i++) S.cacheApi.delete(keys[i]);
          } catch (e) { }
        }
        S.cacheApi.set(clave, datos);
        return datos;
      });
  }

  function serieHoraria(datos) {
    try {
      var sol = datos.sol.hourly, aire = datos.aire.hourly;
      return {
        tiempos: sol.time || [],
        ghi: sol.shortwave_radiation || [],
        dhi: sol.diffuse_radiation || [],
        aod: aire.aerosol_optical_depth || [],
        pm: aire.pm2_5 || []
      };
    } catch (e) { return null; }
  }

  function indiceDeHora(serie, fecha) {
    if (!serie) return -1;
    var pref = horaKeyDe(fecha);
    for (var i = 0; i < serie.tiempos.length; i++) {
      if (String(serie.tiempos[i]).indexOf(pref) === 0) return i;
    }
    // Respaldo si la zona horaria del navegador no coincide con la del lugar
    // (Open-Meteo devuelve la hora en la zona del lugar): se busca por la
    // hora del día dentro de la serie.
    var hh = ('0' + fecha.getHours()).slice(-2) + ':00';
    for (var j = 0; j < serie.tiempos.length; j++) {
      var t = String(serie.tiempos[j]);
      if (t.slice(11) === hh && t.slice(0, 10) >= pref.slice(0, 10)) return j;
    }
    return -1;
  }

  /* ---------------------------------------------------------------------
     SVF aproximado del centroide con los edificios OSM ya cargados.
     8 direcciones, radio 100 m. Los datos vienen de la capa vectorial de
     edificios del propio mapa: sin descargas extra.
     --------------------------------------------------------------------- */
  function alturaDe(props) {
    var h = parseFloat(props.render_height != null ? props.render_height : props.height);
    if (!isFinite(h) || h <= 0) {
      var niveles = parseFloat(props['building:levels'] || props.building_levels);
      h = isFinite(niveles) && niveles > 0 ? niveles * 3 : 10;
    }
    return clamp(h, 3, 120);
  }

  function detectarCapaEdificios() {
    try {
      var capas = S.map.getStyle().layers || [];
      for (var i = 0; i < capas.length; i++) {
        if (capas[i].type === 'fill-extrusion' && /building/i.test(capas[i].id)) return capas[i].id;
      }
      // Respaldo: cualquier fill-extrusion (la capa de edificios es la única
      // extrusión de la app).
      for (var j = 0; j < capas.length; j++) {
        if (capas[j].type === 'fill-extrusion') return capas[j].id;
      }
    } catch (e) { }
    return null;
  }

  function svfDeCentroide(centro, claveGeo) {
    var cacheado = S.cacheSvf.get(claveGeo);
    if (cacheado) return cacheado;

    var vistos = {}, candidatos = [];
    try {
      if (S.capaEdificios) {
        var feats = S.map.querySourceFeatures(S.capaEdificios) || [];
        for (var i = 0; i < feats.length; i++) {
          var f = feats[i];
          var p = f.properties || {};
          var id = p.id || p['@id'] || p.osm_id ||
            (f.id != null ? f.id : null);
          if (id != null && vistos[id]) continue;
          if (id != null) vistos[id] = true;
          var geom = f.geometry;
          if (!geom) continue;
          // Centro del edificio con turf si hay; si no, el primer punto.
          var c;
          try {
            c = turf.centroid(f).geometry.coordinates;
          } catch (e) {
            var ring = geom.type === 'Polygon' ? geom.coordinates[0] : (geom.coordinates[0] && geom.coordinates[0][0]);
            if (!ring || !ring.length) continue;
            c = ring[0];
          }
          var dx = (c[0] - centro[0]) * 111320 * Math.cos(centro[1] * Math.PI / 180);
          var dy = (c[1] - centro[1]) * 110540;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > RADIO_SVF || dist < 1) continue;
          var h = alturaDe(p);
          candidatos.push({ ang: Math.atan2(dy, dx), fracc: clamp(Math.atan2(h, dist) / (Math.PI / 2), 0, 1) });
        }
      }
    } catch (e) { }

    var svf;
    if (!candidatos.length) {
      svf = 1; // sin edificios alrededor, cielo abierto
    } else {
      // Direcciones con su peor oclusión (mayor fracción); el resto, cielo.
      var acum = 0;
      for (var d = 0; d < 8; d++) {
        var dir = d * Math.PI / 4;
        var mejor = 0;
        for (var k = 0; k < candidatos.length; k++) {
          var diff = Math.abs(Math.atan2(Math.sin(candidatos[k].ang - dir), Math.cos(candidatos[k].ang - dir)));
          if (diff < Math.PI / 8 && candidatos[k].fracc > mejor) mejor = candidatos[k].fracc;
        }
        acum += mejor;
      }
      svf = clamp(1 - acum / 8, 0.05, 1);
    }
    if (S.cacheSvf.size > 600) S.cacheSvf.clear();
    S.cacheSvf.set(claveGeo, svf);
    return svf;
  }

  function claveGeometria(f, idx) {
    var p = f.properties || {};
    if (p.id || p.osm_id) return String(p.id || p.osm_id);
    try {
      var coords = f.geometry.coordinates;
      var primero = (f.geometry.type === 'Polygon' ? coords[0][0] : coords[0][0][0]);
      var n = 0;
      if (f.geometry.type === 'Polygon') n = coords[0].length;
      return primero[0].toFixed(6) + ',' + primero[1].toFixed(6) + ':' + n;
    } catch (e) { return 'f' + idx; }
  }

  /* ---------------------------------------------------------------------
     Tinte de los polígonos. UN SQI por polígono en su centroide, por
     tandas de 20, con la fuente 'sombras' que ya existe. El color viaja
     como propiedad del polígono (sqi_color) y el fill-color de la capa se
     vuelve data-driven una sola vez, con transición de 300 ms.
     --------------------------------------------------------------------- */
  function asegurarPaintColor() {
    try {
      if (!S.map.getLayer('capa-sombras')) return;
      S.map.setPaintProperty('capa-sombras', 'fill-color',
        ['coalesce', ['get', 'sqi_color'], '#0b1220']);
      S.map.setPaintProperty('capa-sombras', 'fill-color-transition',
        { duration: 300, delay: 0 });
    } catch (e) { }
  }

  function solVisible(fecha, lat, lon) {
    try {
      if (window.SunCalc && SunCalc.getPosition) {
        return SunCalc.getPosition(fecha, lat, lon).altitude > 0;
      }
    } catch (e) { }
    var h = fecha.getHours();
    return h >= 7 && h <= 21;
  }

  function evaluarSombras() {
    if (S.calculando || S.pintando) {
      // Si llega una sombra nueva mientras hay un cálculo o un setData en
      // vuelo, no se pierde: se reintenta enseguida. Contador de seguridad
      // para que nunca pueda convertirse en un bucle infinito.
      S.reintentos = (S.reintentos || 0) + 1;
      if (S.reintentos <= 25 && !S.timerRetry) {
        S.timerRetry = setTimeout(function () {
          S.timerRetry = null;
          evaluarSombras();
        }, 900);
      }
      return;
    }
    S.reintentos = 0;
    var src;
    try { src = S.map.getSource('sombras'); } catch (e) { return; }
    if (!src) return;
    var datos;
    try { datos = src._data || (src.serialize && src.serialize().data); } catch (e) { return; }
    var feats = datos && datos.features ? datos.features : [];
    var fecha = fechaEfectiva();
    var hKey = horaKeyDe(fecha);
    var centro = S.map.getCenter();
    var lat = centro.lat, lon = centro.lng;

    // Firma de la colección: número de polígonos + hora. Si nada cambió y
    // todos los polígonos llevan la hora actual, no se hace nada.
    var sig = feats.length + '|' + hKey;
    if (sig === S.sigGeometria && S.ultimosMeteo) {
      var completos = true;
      for (var c = 0; c < feats.length; c++) {
        if (!feats[c].properties || feats[c].properties.sqi_hora !== hKey) { completos = false; break; }
      }
      if (completos) {
        var previo = S.horaKey === hKey ? S.ultimoPintado : null;
        pintarUi(fecha, lat, lon, hKey, previo ? previo.sqi : null, previo ? previo.svf : null);
        return;
      }
    }

    S.calculando = true;

    meteoDeZona(lat, lon, hKey).then(function (meteo) {
      if (!meteo) { S.calculando = false; return; } // fallo silencioso
      S.ultimosMeteo = meteo;
      var serie = serieHoraria(meteo);
      var idx = indiceDeHora(serie, fecha);
      var ghi = idx >= 0 ? serie.ghi[idx] : null;
      var dhi = idx >= 0 ? serie.dhi[idx] : null;

      var noche = !solVisible(fecha, lat, lon) || !isFinite(ghi) || ghi === null || ghi <= 10;

      if (!feats.length) {
        S.calculando = false;
        S.sigGeometria = sig;
        S.horaKey = hKey;
        pintarUi(fecha, lat, lon, hKey, null, null);
        return;
      }

      // Lotes: se recorren todos los polígonos, se recolorean y al final
      // hay UN solo setData por tanda completa (la transición suaviza).
      var copias = [];
      for (var i = 0; i < feats.length; i++) {
        var f = feats[i];
        var copia = { type: 'Feature', geometry: f.geometry, properties: {} };
        var props = f.properties || {};
        for (var k in props) copia.properties[k] = props[k];
        copias.push(copia);
      }

      var pendientes = copias.slice();
      var svfMedio = 0, nSvf = 0, sumaSqi = 0, nSqi = 0;

      function tanda() {
        var procesados = 0;
        while (pendientes.length && procesados < LOTE) {
          var f2 = pendientes.shift();
          procesados++;
          try {
            if (noche) {
              delete f2.properties.sqi_color;
              delete f2.properties.sqi;
              delete f2.properties.sqi_hora;
              continue;
            }
            var centroide = turf.centroid(f2).geometry.coordinates;
            var clave = claveGeometria(f2, copias.indexOf(f2));
            var svf;
            try {
              var area = turf.area(f2);
              if (area > UMBRAL_AREA_GRANDE) {
                // Polígono enorme (un parque): 2-3 centroides lógicos con
                // turf y valor medio. Nada más masivo que esto.
                var caja = turf.bbox(f2);
                var mitadX = (caja[0] + caja[2]) / 2;
                var tercioY = (caja[1] + caja[3]) / 2;
                var muestras = [
                  turf.centroid(f2).geometry.coordinates,
                  [mitadX, caja[1] + (caja[3] - caja[1]) * 0.3],
                  [mitadX, caja[1] + (caja[3] - caja[1]) * 0.7]
                ];
                var svfT = 0, nT = 0;
                for (var m = 0; m < muestras.length; m++) {
                  var cl = clave + ':m' + m + ':' + muestras[m][0].toFixed(5) + ',' + muestras[m][1].toFixed(5);
                  svfT += svfDeCentroide(muestras[m], cl); nT++;
                }
                svf = nT ? svfT / nT : 1;
              } else {
                svf = svfDeCentroide(centroide, clave);
              }
            } catch (e) { svf = 1; }

            if (!isFinite(dhi) || dhi === null || !isFinite(ghi) || ghi <= 0) {
              delete f2.properties.sqi_color;
              delete f2.properties.sqi;
              delete f2.properties.sqi_hora;
              continue;
            }
            var dhiEf = dhi * svf;
            var sqi = clamp(0, 100, Math.round(100 * (1 - dhiEf / ghi)));
            f2.properties.sqi = sqi;
            f2.properties.sqi_color = colorDeSqi(sqi);
            f2.properties.sqi_hora = hKey;
            svfMedio += svf; nSvf++;
            sumaSqi += sqi; nSqi++;
          } catch (e) { /* un polígono que falle no rompe la tanda */ }
        }

        if (pendientes.length) {
          setTimeout(tanda, 0);
        } else {
          S.pintando = true;
          try {
            src.setData({ type: 'FeatureCollection', features: copias });
            asegurarPaintColor();
          } catch (e) { }
          // El evento sourcedata que genera nuestro propio setData vuelve a
          // llamar a evaluarSombras, pero la firma ya estará al día.
          setTimeout(function () { S.pintando = false; }, 100);
          S.calculando = false;
          S.sigGeometria = sig;
          S.horaKey = hKey;
          pintarUi(fecha, lat, lon, hKey, nSqi ? sumaSqi / nSqi : null,
            nSvf ? svfMedio / nSvf : null);
        }
      }
      tanda();
    }).catch(function () { S.calculando = false; });
  }

  /* ---------------------------------------------------------------------
     Bloque compacto unido al panel solar SVG visible. El antiguo panel
     #rsTimeControls sigue oculto y solo actúa como puente lógico.
     --------------------------------------------------------------------- */
  function posicionarWidgetMini() {
    var mini = document.getElementById('rsSqiMini');
    var root = S.widgetRoot, panel = S.widgetPanel;
    if (!mini || !root || !panel || !root.parentElement) return;
    if (mini.parentElement !== root.parentElement) {
      root.parentElement.insertBefore(mini, root.nextSibling);
    }
    var abierto = panel.classList.contains('o');
    mini.hidden = !abierto;
    mini.setAttribute('aria-hidden', abierto ? 'false' : 'true');
    if (!abierto) return;

    var rect = root.getBoundingClientRect();
    var escala = rect.width / 390;
    if (!isFinite(escala) || escala <= 0) return;
    var left = parseFloat(root.style.left);
    var top = parseFloat(root.style.top);
    if (!isFinite(left) || !isFinite(top)) {
      var padreRect = root.parentElement.getBoundingClientRect();
      left = rect.left - padreRect.left + root.parentElement.scrollLeft;
      top = rect.top - padreRect.top + root.parentElement.scrollTop;
    }
    mini.style.width = (341 * escala) + 'px';
    mini.style.left = (left + 12 * escala) + 'px';
    mini.style.top = (top + 258 * escala - mini.offsetHeight) + 'px';
  }

  function montarWidgetMini() {
    var root = document.querySelector('svg#map');
    var panel = root && root.querySelector('#w');
    if (!root || !panel || !root.parentElement) return false;

    var slider = document.getElementById('rsTimeSlider');
    if (slider && S.sliderTiempo !== slider) {
      if (S.sliderTiempo) S.sliderTiempo.removeEventListener('input', programarEvaluacion);
      S.sliderTiempo = slider;
      slider.addEventListener('input', programarEvaluacion, { passive: true });
    }

    var mini = document.getElementById('rsSqiMini');
    if (mini && S.widgetRoot === root && S.widgetPanel === panel &&
      mini.parentElement === root.parentElement) return true;

    if (S.widgetRoot !== root) {
      if (S.obsWidgetRoot) S.obsWidgetRoot.disconnect();
      S.widgetRoot = root;
      try {
        S.obsWidgetRoot = new MutationObserver(posicionarWidgetMini);
        S.obsWidgetRoot.observe(root, { attributes: true, attributeFilter: ['style'] });
      } catch (e) { }
    }
    if (S.widgetPanel !== panel) {
      if (S.obsWidgetPanel) S.obsWidgetPanel.disconnect();
      S.widgetPanel = panel;
      try {
        S.obsWidgetPanel = new MutationObserver(posicionarWidgetMini);
        S.obsWidgetPanel.observe(panel, { attributes: true, attributeFilter: ['class'] });
      } catch (e) { }
    }
    if (!S.widgetEventos) {
      S.widgetEventos = true;
      window.addEventListener('resize', posicionarWidgetMini, { passive: true });
      document.addEventListener('fullscreenchange', posicionarWidgetMini);
      document.addEventListener('webkitfullscreenchange', posicionarWidgetMini);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', posicionarWidgetMini, { passive: true });
    }

    if (!mini) {
      mini = document.createElement('div');
      mini.className = 'rs-sqi-mini';
      mini.id = 'rsSqiMini';
      mini.hidden = true;
      mini.setAttribute('role', 'group');
      mini.setAttribute('aria-label', 'Calidad de la sombra');
      mini.innerHTML =
        '<div class="rs-sqi-mini-fila">' +
        '<span class="rs-sqi-mini-estado" id="rsSqiMiniEstado">Midiendo la sombra</span>' +
        '<span class="rs-sqi-mini-pct" id="rsSqiMiniPct"></span>' +
        '</div>' +
        '<div class="rs-sqi-mini-barra" aria-hidden="true">' +
        '<div class="rs-sqi-mini-indicador" id="rsSqiMiniIndicador"></div>' +
        '</div>' +
        '<div class="rs-sqi-mini-datos" id="rsSqiMiniDatos"></div>';
      root.parentElement.insertBefore(mini, root.nextSibling);
      if (S.ultimoPintado) {
        pintarMini(S.ultimoPintado.noche, S.ultimoPintado.sqi,
          S.ultimoPintado.aod, S.ultimoPintado.pm, S.ultimoPintado.dhi);
      }
    }
    posicionarWidgetMini();
    return true;
  }

  function pintarMini(noche, sqi, aod, pm, dhi) {
    var mini = document.getElementById('rsSqiMini');
    if (!mini) return;
    var estadoEl = document.getElementById('rsSqiMiniEstado');
    var pctEl = document.getElementById('rsSqiMiniPct');
    var ind = document.getElementById('rsSqiMiniIndicador');
    var datosEl = document.getElementById('rsSqiMiniDatos');
    mini.classList.toggle('rs-sqi-mini-noche', noche);

    if (noche) {
      if (estadoEl) estadoEl.textContent = 'Sin radiación solar directa';
      if (pctEl) pctEl.textContent = '';
      if (ind) ind.style.left = '0%';
    } else if (sqi != null && isFinite(sqi)) {
      var color = colorDeSqi(sqi);
      mini.style.setProperty('--rs-sqi-mini-color', color);
      if (estadoEl) estadoEl.textContent = estadoDeSqi(sqi);
      if (pctEl) pctEl.textContent = sqi + ' %';
      if (ind) ind.style.left = clamp(0, 100, sqi) + '%';
    } else {
      var sombrasActivas = document.getElementById('rsToggleSombras');
      mini.style.setProperty('--rs-sqi-mini-color', '#EEF1F6');
      if (estadoEl) estadoEl.textContent = sombrasActivas && sombrasActivas.checked
        ? 'Buscando sombras en esta zona' : 'Activa las sombras para medirlas';
      if (pctEl) pctEl.textContent = '';
      if (ind) ind.style.left = '0%';
    }

    var puntoAod = aod == null ? '' : (aod < 0.2 ? ' rs-sqi-punto-bajo' : (aod <= 0.4 ? ' rs-sqi-punto-moderado' : ' rs-sqi-punto-alto'));
    var puntoPm = pm == null ? '' : (pm <= 15 ? ' rs-sqi-punto-bajo' : (pm <= 25 ? ' rs-sqi-punto-moderado' : ' rs-sqi-punto-alto'));
    var html =
      '<span class="rs-sqi-mini-dato"><i class="rs-sqi-punto' + puntoAod + '"></i>AOD <b>' + (aod != null ? aod.toFixed(2) : '–') + '</b></span>' +
      '<span class="rs-sqi-mini-dato"><i class="rs-sqi-punto' + puntoPm + '"></i>PM2.5 <b>' + (pm != null ? Math.round(pm) : '–') + '</b></span>' +
      '<span class="rs-sqi-mini-dato"><i class="rs-sqi-punto rs-sqi-punto-azul"></i>DHI <b>' + (dhi != null ? Math.round(dhi) : '–') + '</b></span>';
    if (datosEl && datosEl.__htmlCache !== html) { datosEl.innerHTML = html; datosEl.__htmlCache = html; }
  }

  function nivelPuntoAod(aod) {
    if (aod == null) return '';
    if (aod < 0.2) return ' rs-sqi-punto-bajo';
    if (aod <= 0.4) return ' rs-sqi-punto-moderado';
    return ' rs-sqi-punto-alto';
  }
  function nivelPuntoPm(pm) {
    if (pm == null) return '';
    if (pm <= 15) return ' rs-sqi-punto-bajo';
    if (pm <= 25) return ' rs-sqi-punto-moderado';
    return ' rs-sqi-punto-alto';
  }

  function pintarUi(fecha, lat, lon, hKey, sqiMedio, svfMedio) {
    var card = document.querySelector('.rs-sqi-card');
    var meteo = S.ultimosMeteo;
    var serie = meteo ? serieHoraria(meteo) : null;
    var idx = serie ? indiceDeHora(serie, fecha) : -1;
    var ghi = idx >= 0 ? serie.ghi[idx] : null;
    var dhi = idx >= 0 ? serie.dhi[idx] : null;
    var aod = idx >= 0 ? serie.aod[idx] : null;
    var pm = idx >= 0 ? serie.pm[idx] : null;
    var noche = !solVisible(fecha, lat, lon) || !isFinite(ghi) || ghi === null || ghi <= 10;

    // Primero el bloque mini del widget de hora: no depende de la tarjeta
    // de la página y tiene que pintar aunque la tarjeta aún no exista.
    var sqiMini = (!noche && sqiMedio != null && isFinite(sqiMedio))
      ? Math.round(clamp(0, 100, sqiMedio)) : null;
    pintarMini(noche, sqiMini, aod, pm, dhi);
    S.ultimoPintado = { noche: noche, sqi: sqiMini, aod: aod, pm: pm, dhi: dhi,
      svf: svfMedio != null && isFinite(svfMedio) ? svfMedio : null };

    var estado = document.getElementById('rsSqiEstado');
    var pct = document.getElementById('rsSqiPct');
    var indicador = document.getElementById('rsSqiIndicador');
    var caja = document.getElementById('rsSqiContexto');
    var titulo = document.getElementById('rsSqiContextoTitulo');
    var cuerpo = document.getElementById('rsSqiContextoCuerpo');

    if (card) card.classList.toggle('rs-sqi-noche', noche);

    if (noche) {
      if (estado) estado.textContent = 'Sin radiación solar directa';
      if (pct) pct.textContent = '–';
      if (indicador) indicador.style.left = '0%';
      if (card) card.style.setProperty('--rs-sqi-color', 'rgba(237,244,242,0.45)');
      if (card) card.style.setProperty('--rs-sqi-borde', 'rgba(237,244,242,0.1)');
      if (titulo) titulo.textContent = 'La sombra descansa';
      if (cuerpo) cuerpo.textContent = 'De noche no hay radiación solar directa que medir. La calidad de sombra vuelve al amanecer.';
    } else if (sqiMedio != null && isFinite(sqiMedio)) {
      var sqi = clamp(0, 100, Math.round(sqiMedio));
      var color = colorDeSqi(sqi);
      if (card) card.style.setProperty('--rs-sqi-color', color);
      if (card) card.style.setProperty('--rs-sqi-borde', color + '55');
      if (estado) estado.textContent = estadoDeSqi(sqi);
      if (pct) pct.textContent = String(sqi);
      if (indicador) indicador.style.left = sqi + '%';

      // Texto contextual por prioridad.
      if (aod != null && aod > 0.4) {
        if (titulo) titulo.textContent = 'Polvo sahariano activo';
        if (cuerpo) cuerpo.textContent = 'La calima dispersa calor dentro de la sombra. Aunque el sol no te dé directo, la carga radiativa se acerca a la de estar al sol.';
      } else if (pm != null && pm > 25) {
        if (titulo) titulo.textContent = 'Contaminación elevada';
        if (cuerpo) cuerpo.textContent = 'Con partículas en suspensión la radiación difusa calienta también a la sombra. Mejor sombra cerrada y poco tiempo al aire libre.';
      } else if ((aod != null && aod < 0.2) && (pm != null && pm <= 15) && (dhi != null && dhi <= 80)) {
        if (titulo) titulo.textContent = 'Aire limpio y cielo despejado';
        if (cuerpo) cuerpo.textContent = 'Esta es una sombra de calidad. El cielo abierto enfría de verdad dentro de la sombra.';
      } else if (sqi >= 85) {
        if (titulo) titulo.textContent = 'Sombra efectiva';
        if (cuerpo) cuerpo.textContent = 'La radiación difusa que llega bajo techo es baja. Esta sombra protege de verdad del calor.';
      } else if (sqi >= 65) {
        if (titulo) titulo.textContent = 'Sombra reducida';
        if (cuerpo) cuerpo.textContent = 'Protege bastante, aunque el cielo cargado deja pasar algo de calor difuso. Sumar sombra de árbol ayuda.';
      } else if (sqi >= 40) {
        if (titulo) titulo.textContent = 'Sombra débil';
        if (cuerpo) cuerpo.textContent = 'La radiación difusa se cuela con fuerza. Busca sombra más cerrada o espacios interiores.';
      } else {
        if (titulo) titulo.textContent = 'Sombra ilusoria';
        if (cuerpo) cuerpo.textContent = 'Apenas protege del calor. Bajo este cielo la diferencia con el sol directo es pequeña.';
      }
    }

    // Badges AOD / PM2.5 / DHI.
    var elAod = document.getElementById('rsSqiAod');
    var elPm = document.getElementById('rsSqiPm');
    var elDhi = document.getElementById('rsSqiDhi');
    var punAod = document.getElementById('rsSqiPuntoAod');
    var punPm = document.getElementById('rsSqiPuntoPm');
    if (elAod) elAod.textContent = aod != null ? aod.toFixed(2) : '–';
    if (elPm) elPm.textContent = pm != null ? Math.round(pm) : '–';
    if (elDhi) elDhi.textContent = dhi != null ? Math.round(dhi) : '–';
    if (punAod) punAod.className = 'rs-sqi-punto' + nivelPuntoAod(aod);
    if (punPm) punPm.className = 'rs-sqi-punto' + nivelPuntoPm(pm);

    // Próximas 6 horas (se usan los datos horarios ya descargados).
    var contHoras = document.getElementById('rsSqiHoras');
    if (contHoras) {
      var html = '';
      var svfZona = svfMedio != null && isFinite(svfMedio) ? svfMedio : 0.8;
      for (var h = 1; h <= 6; h++) {
        var fH = new Date(fecha.getTime() + h * 3600 * 1000);
        var iH = serie ? indiceDeHora(serie, fH) : -1;
        var gH = iH >= 0 ? serie.ghi[iH] : null;
        var dH = iH >= 0 ? serie.dhi[iH] : null;
        var txtHora = fH.getHours() + 'h';
        if (gH == null || !isFinite(gH) || gH <= 10 || !solVisible(fH, lat, lon)) {
          html += '<div class="rs-sqi-hora rs-sqi-hora-noche"><span class="rs-sqi-hora-hora">' + txtHora +
            '</span><span class="rs-sqi-hora-punto"></span><span class="rs-sqi-hora-valor">noche</span></div>';
        } else {
          var sqiH = clamp(0, 100, Math.round(100 * (1 - (dH * svfZona) / gH)));
          var colH = colorDeSqi(sqiH);
          html += '<div class="rs-sqi-hora"><span class="rs-sqi-hora-hora">' + txtHora +
            '</span><span class="rs-sqi-hora-punto" style="--rs-sqi-color-h:' + colH + ';background:' + colH +
            '"></span><span class="rs-sqi-hora-valor" style="--rs-sqi-color-h:' + colH + ';color:' + colH + '">' + sqiH + ' %</span></div>';
        }
      }
      if (contHoras.__htmlCache !== html) { contHoras.innerHTML = html; contHoras.__htmlCache = html; }
    }
  }

  /* ---------------------------------------------------------------------
     Arranque: patrón del proyecto (reintentos suaves), escucha de la fuente
     'sombras' y reevaluación de la hora cada 40 s (el selector de hora
     dispara el recálculo sin llamadas nuevas a la API).
     --------------------------------------------------------------------- */
  function programarEvaluacion() {
    if (S.rafProgramado) return;
    S.rafProgramado = true;
    setTimeout(function () {
      S.rafProgramado = false;
      evaluarSombras();
    }, 700);
  }

  function arrancar(intentos) {
    try {
      if (window.manolitAireMap && window.turf) {
        S.map = window.manolitAireMap;
        // La calidad de sombra vive SOLO dentro del widget de hora del mapa.
        // No hay tarjeta fuera del mapa y los bloques Aire/Previsión de la
        // página se quedan exactamente donde estaban.

        // Widget mini: el panel de hora se construye dinámicamente, así que
        // se espera con un observador y se reinserta si se reconstruye.
        try {
          var obsWidget = new MutationObserver(function () { montarWidgetMini(); });
          obsWidget.observe(document.body, { childList: true, subtree: true });
        } catch (e) { }
        var intentosWidget = 0;
        var timerWidget = setInterval(function () {
          if (montarWidgetMini() || ++intentosWidget > 90) clearInterval(timerWidget);
        }, 1000);

        try { S.map.on('sourcedata', function (e) { if (e && e.sourceId === 'sombras' && !S.pintando) programarEvaluacion(); }); } catch (e) { }
        try { S.map.on('styledata', function () { if (!S.capaEdificios) S.capaEdificios = detectarCapaEdificios(); }); } catch (e) { }
        S.capaEdificios = detectarCapaEdificios();

        S.timerReevaluacion = setInterval(function () {
          if (document.hidden) return;
          var ahora = Date.now();
          if (ahora - S.ultimaEval < RETRASO_REEVALUACION) return;
          S.ultimaEval = ahora;
          var sigHora = horaKeyDe(fechaEfectiva());
          if (sigHora !== S.horaKey || !S.ultimosMeteo) programarEvaluacion();
        }, 10000);

        programarEvaluacion();
      } else if (intentos < 120) {
        setTimeout(function () { arrancar(intentos + 1); }, 500);
      }
    } catch (e) { /* el SQI jamás rompe el mapa */ }
  }

  arrancar(0);
})();
