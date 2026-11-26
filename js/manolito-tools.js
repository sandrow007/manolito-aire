/* ============================================================================
   MANOLIT∞ — HERRAMIENTAS DEL AGENTE (nov-2026)

   Mapea TODOS los controles manuales de la interfaz a herramientas que el
   chat puede ejecutar con Function Calling. Paridad Chat = Control Manual:

     mapa       : centrar / zoom / volar a coordenadas o a un lugar
     hora       : fijar hora, ahora, solsticios, fecha
     capas      : sombras, sol, árboles, nubes, lluvia, aire, edificios,
                  catastro, ruta, fuentes de agua, carriles bici, transporte,
                  aparcamientos, mapa base (claro / IGN / oscuro)
     rutas      : trazar ruta a un punto / lugar en caminar, bici o coche
     vista      : 2D / 3D (inclinación), orientación, paseo virtual
     seguimiento: iniciar / detener caminata, servicio de ruta (RouteTracker)
     búsqueda   : fuente de agua más cercana

   DISEÑO SEGURO:
     - Cada herramienta REUTILIZA el control real de la UI (clic en el mismo
       botón/casilla) o la API pública ya existente. No duplica lógica.
     - Toda herramienta devuelve {ok, respuesta} con un texto breve en
       castellano neutro; el chat lo usa como resultado de la llamada.
     - Si el mapa aún no está cargado, las herramientas que lo requieren
       devuelven ok:false y Manolito se lo dice al usuario. Nunca fingen.
     - Sin este archivo, la web funciona exactamente igual.
   ========================================================================== */
(function () {
  'use strict';
  if (window.ManolitTools) return; // doble carga: jamás

  /* ---------------------------------------------------------------------
     Helpers.
     --------------------------------------------------------------------- */
  function mapa() {
    return window.manolitAireMap && typeof window.manolitAireMap.getCenter === 'function'
      ? window.manolitAireMap : null;
  }

  function clic(id) {
    var el = document.getElementById(id);
    if (!el) return false;
    el.click();
    return true;
  }

  // Fija un checkbox/botón a un estado deseado sin alternar a ciegas.
  function fijarBoton(id, encendido) {
    var el = document.getElementById(id);
    if (!el) return false;
    var activo = el.getAttribute('aria-pressed') === 'true';
    if (activo !== !!encendido) el.click();
    return true;
  }

  function fijarCheckbox(id, encendido) {
    var el = document.getElementById(id);
    if (!el) return false;
    if (!!el.checked !== !!encendido) el.click();
    return true;
  }

  function esperarMapa(ms) {
    if (mapa()) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function bucle(intento) {
        if (mapa()) return resolve(true);
        if (Date.now() - t0 > (ms || 20000) || intento > 200) return resolve(false);
        setTimeout(function () { bucle(intento + 1); }, 250);
      })(0);
    });
  }

  function geocodificar(texto) {
    if (!texto) return Promise.resolve(null);
    var coords = String(texto).match(/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
    if (coords) {
      var lat = Number(coords[1].replace(',', '.'));
      var lon = Number(coords[2].replace(',', '.'));
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return Promise.resolve({ lat: lat, lon: lon, nombre: 'las coordenadas ' + lat + ', ' + lon });
      }
    }
    var url = new URL('/geo', window.location.origin);
    url.searchParams.set('q', String(texto).trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    return fetch(url.toString(), { headers: { 'Accept-Language': 'es' } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (lugares) {
        if (!Array.isArray(lugares) || !lugares.length) return null;
        return {
          lat: Number(lugares[0].lat),
          lon: Number(lugares[0].lon),
          nombre: lugares[0].display_name || String(texto).trim()
        };
      })
      .catch(function () { return null; });
  }

  /* ---------------------------------------------------------------------
     Catálogo de herramientas. Cada una: nombre, descripción (para el modelo),
     esquema de parámetros y ejecutor async.
     --------------------------------------------------------------------- */
  var HERRAMIENTAS = {

    /* ------------------------- MAPA ------------------------- */
    centrar_mapa: {
      descripcion: 'Centra el mapa en un lugar o en unas coordenadas (lat, lon).',
      parametros: { lugar: 'string opcional: ciudad, dirección o "lat, lon"' },
      async ejecutar(args) {
        if (!await esperarMapa(15000)) return { ok: false, respuesta: 'El mapa todavía se está cargando.' };
        var p = await geocodificar(args && (args.lugar || args.coordenadas));
        if (!p) return { ok: false, respuesta: 'No he encontrado ese lugar.' };
        mapa().flyTo({ center: [p.lon, p.lat], zoom: Math.max(mapa().getZoom(), 13) });
        return { ok: true, respuesta: 'Mapa centrado en ' + String(p.nombre).split(',')[0] + '.' };
      }
    },

    sombra_en_mi_avance: {
      descripcion: 'Analiza, una sola vez, cómo está el sol y la sombra justo donde estás ahora (y si hay fuentes de agua cerca). Es la consulta puntual del modo coche, al preguntar por la sombra del avance.',
      parametros: {},
      async ejecutar() {
        if (!await esperarMapa(10000)) return { ok: false, respuesta: 'El mapa todavía se está cargando.' };
        var RT = window.ManolitRouteTracker;
        var pos = null;
        try {
          var p = window.__manolitUltimaPos;
          if (p && isFinite(p.lat) && isFinite(p.lon)) pos = { lat: Number(p.lat), lon: Number(p.lon) };
        } catch (e) { }
        if (!pos) {
          try {
            var c = mapa().getCenter();
            pos = { lat: c.lat, lon: c.lng };
          } catch (e2) { }
        }
        if (!pos) return { ok: false, respuesta: 'No sé dónde estás. Dame permiso de ubicación o dime el sitio.' };
        if (!RT) return { ok: false, respuesta: 'El motor de ruta todavía no está disponible.' };
        var haySol = RT.haySolEn(pos.lat, pos.lon);
        var sombra = RT.sombraPuntualPct(pos.lat, pos.lon);
        var fuente = await RT.fuentesCercanas(pos.lat, pos.lon);
        var avance = RT.estado();
        var partes = [];
        if (haySol === true) partes.push('Ahora mismo da el sol en tu posición');
        else if (haySol === false) partes.push('No hay sol en tu posición (de noche o bajo el horizonte)');
        else partes.push('No he podido leer la posición del sol');
        if (sombra === 100) partes.push('y el punto está en sombra');
        else if (sombra === 0) partes.push('y el punto está al sol');
        if (avance.activo) partes.push('llevas ' + avance.distanciaAcumuladaKm + ' km en ' + avance.modo);
        if (fuente) partes.push('tienes ' + fuente.nombre + ' a ' + Math.round(fuente.distanciaM) + ' m');
        return {
          ok: true,
          respuesta: partes.join('; ') + '.',
          datos: { haySol: haySol, sombraPct: sombra, fuente: fuente }
        };
      }
    },

    acercar: {
      descripcion: 'Acerca (zoom in) el mapa.',
      parametros: { niveles: 'número opcional de niveles de zoom (por defecto 1)' },
      async ejecutar(args) {
        if (!mapa()) return { ok: false, respuesta: 'El mapa todavía se está cargando.' };
        var n = Math.max(1, Math.min(5, Number(args && args.niveles) || 1));
        mapa().easeTo({ zoom: mapa().getZoom() + n, duration: 400 });
        return { ok: true, respuesta: 'Acercado ' + n + ' nivel(es).' };
      }
    },

    alejar: {
      descripcion: 'Aleja (zoom out) el mapa.',
      parametros: { niveles: 'número opcional de niveles (por defecto 1)' },
      async ejecutar(args) {
        if (!mapa()) return { ok: false, respuesta: 'El mapa todavía se está cargando.' };
        var n = Math.max(1, Math.min(5, Number(args && args.niveles) || 1));
        mapa().easeTo({ zoom: Math.max(1, mapa().getZoom() - n), duration: 400 });
        return { ok: true, respuesta: 'Alejado ' + n + ' nivel(es).' };
      }
    },

    /* ------------------------- HORA / FECHA ------------------------- */
    fijar_hora: {
      descripcion: 'Fija la hora del simulador de sombras (0-23 h y minutos).',
      parametros: { hora: 'número 0-23', minutos: 'número 0-59 opcional' },
      async ejecutar(args) {
        var hora = args && Number.isInteger(args.hora) ? args.hora :
          (args && /^\d{1,2}:\d\d$/.test(String(args.hora)) ? parseInt(String(args.hora).split(':')[0], 10) : null);
        if (hora == null || hora < 0 || hora > 23) return { ok: false, respuesta: 'La hora debe estar entre 0 y 23.' };
        var minutos = args && Number.isInteger(args.minutos) ? args.minutos :
          (args && /^\d{1,2}:\d\d$/.test(String(args.hora)) ? parseInt(String(args.hora).split(':')[1], 10) : 0);
        minutos = Math.max(0, Math.min(59, minutos));
        var slider = document.getElementById('rsTimeSlider');
        if (!slider) return { ok: false, respuesta: 'El panel de hora del mapa todavía no está listo.' };
        slider.value = String(hora * 60 + minutos);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        return { ok: true, respuesta: 'Hora del simulador fijada a ' + String(hora).padStart(2, '0') + ':' + String(minutos).padStart(2, '0') + '.' };
      }
    },

    hora_ahora: {
      descripcion: 'Devuelve el simulador de sombras a la hora real de ahora.',
      parametros: {},
      async ejecutar() {
        if (!clic('rsBtnAhora')) return { ok: false, respuesta: 'El panel de hora del mapa todavía no está listo.' };
        return { ok: true, respuesta: 'Simulador puesto en la hora real.' };
      }
    },

    solsticio: {
      descripcion: 'Pone el simulador en el solsticio de verano o de invierno.',
      parametros: { estacion: '"verano" o "invierno"' },
      async ejecutar(args) {
        var est = String(args && args.estacion || '').toLowerCase();
        if (est === 'verano') {
          if (!clic('rsBtnVerano')) return { ok: false, respuesta: 'El panel de hora no está listo.' };
          return { ok: true, respuesta: 'Solsticio de verano activado.' };
        }
        if (est === 'invierno') {
          if (!clic('rsBtnInvierno')) return { ok: false, respuesta: 'El panel de hora no está listo.' };
          return { ok: true, respuesta: 'Solsticio de invierno activado.' };
        }
        return { ok: false, respuesta: 'Indica "verano" o "invierno".' };
      }
    },

    fijar_fecha: {
      descripcion: 'Fija la fecha del simulador de sombras (formato YYYY-MM-DD).',
      parametros: { fecha: 'string YYYY-MM-DD' },
      async ejecutar(args) {
        var iso = String(args && args.fecha || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { ok: false, respuesta: 'La fecha debe venir como YYYY-MM-DD.' };
        if (typeof window.manolitAireFijarFecha !== 'function') return { ok: false, respuesta: 'El motor de sombras todavía no está listo.' };
        window.manolitAireFijarFecha(iso);
        return { ok: true, respuesta: 'Fecha del simulador fijada a ' + iso + '.' };
      }
    },

    /* ------------------------- CAPAS ------------------------- */
    capa: {
      descripcion: 'Enciende o apaga una capa del mapa. Capas: sombras, sol, arboles, nubes, lluvia, aire, microclima, edificios, ruta, fuentes_agua, carriles_bici, transporte.',
      parametros: { nombre: 'string con el nombre de la capa', encendida: 'booleano' },
      async ejecutar(args) {
        var mapaCapas = {
          sombras: 'rsToggleSombras', sol: 'rsToggleSol', arboles: 'rsBtnArboles',
          nubes: 'rsToggleNubes', lluvia: 'rsToggleLluvia', aire: 'rsToggleAire',
          microclima: 'rsToggleMicroclima', edificios: 'rsToggleEdificios',
          ruta: 'rsToggleRuta', fuentes_agua: 'rsToggleFuentesAgua',
          carriles_bici: 'rsToggleCarrilesBici', transporte: 'rsToggleTransporte'
        };
        var nombre = String(args && args.nombre || '').toLowerCase().replace(/\s+/g, '_');
        var id = mapaCapas[nombre];
        var encendida = args && args.encendida !== false;
        if (!id) return { ok: false, respuesta: 'No conozco la capa «' + nombre + '».' };
        var hecho = id === 'rsBtnArboles' ? fijarBoton(id, encendida) : fijarCheckbox(id, encendida);
        if (!hecho) return { ok: false, respuesta: 'La capa «' + nombre + '» todavía no está disponible.' };
        return { ok: true, respuesta: 'Capa «' + nombre + '» ' + (encendida ? 'encendida' : 'apagada') + '.' };
      }
    },

    mapa_base: {
      descripcion: 'Cambia el mapa base: "claro", "ign" u "oscuro".',
      parametros: { estilo: '"claro" | "ign" | "oscuro"' },
      async ejecutar(args) {
        var estilo = String(args && args.estilo || '').toLowerCase();
        if (['claro', 'ign', 'oscuro'].indexOf(estilo) < 0) {
          return { ok: false, respuesta: 'Estilos válidos: claro, ign, oscuro.' };
        }
        // Fijar al estado pedido sin alternar a ciegas: el control segmentado
        // solo tiene [Mapa claro] (id histórico rsBtnMapaOscuro) e [Mapa IGN].
        var claro = document.getElementById('rsBtnMapaOscuro');
        var ign = document.getElementById('rsBtnMapaIGN');
        if (!claro || !ign) return { ok: false, respuesta: 'El control de mapa base todavía no está listo.' };
        if (estilo === 'claro') {
          if (claro.getAttribute('aria-pressed') !== 'true') claro.click();
        } else if (estilo === 'ign') {
          if (ign.getAttribute('aria-pressed') !== 'true') ign.click();
        } else {
          // El segmento oscuro (si existe) es el que decide; si no, se apaga
          // el IGN para volver a la base vectorial.
          var osc = document.getElementById('rsBtnMapaOsc');
          if (osc) { if (osc.getAttribute('aria-pressed') !== 'true') osc.click(); }
          else if (ign.getAttribute('aria-pressed') === 'true') ign.click();
        }
        return { ok: true, respuesta: 'Mapa base en modo ' + estilo + '.' };
      }
    },

    /* ------------------------- RUTAS ------------------------- */
    trazar_ruta: {
      descripcion: 'Calcula y dibuja una ruta hasta un destino (lugar o "lat, lon") en el modo indicado: caminar, bici o coche.',
      parametros: { destino: 'string', modo: '"caminar" | "bici" | "coche"' },
      async ejecutar(args) {
        if (!await esperarMapa(15000)) return { ok: false, respuesta: 'El mapa todavía se está cargando.' };
        var destinoTexto = String(args && (args.destino || args.lugar) || '').trim();
        if (!destinoTexto) return { ok: false, respuesta: 'Dime a dónde quieres ir.' };
        var modo = ['caminar', 'bici', 'coche'].indexOf(args && args.modo) >= 0 ? args.modo : 'caminar';
        var p = await geocodificar(destinoTexto);
        if (!p) return { ok: false, respuesta: 'No he encontrado «' + destinoTexto + '».' };

        // Bici: el planificador propio (OSRM/BRouter con textos).
        if (modo === 'bici' && typeof window.manolitAirePlanificarRutaBici === 'function') {
          if (window.manolitAireElegirModoRuta) window.manolitAireElegirModoRuta('bici');
          var r = await window.manolitAirePlanificarRutaBici('', destinoTexto);
          if (r) {
            var km = (r.distanciaM / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 });
            return { ok: true, respuesta: 'Ruta en bici dibujada: ' + km + ' km, unos ' + Math.max(1, Math.round(r.duracionS / 60)) + ' min.' };
          }
          return { ok: false, respuesta: 'No he podido calcular la ruta en bici.' };
        }

        if (window.manolitAireElegirModoRuta) window.manolitAireElegirModoRuta(modo);
        if (typeof window.manolitAireCalcularRutaPuntoCompartido !== 'function') {
          return { ok: false, respuesta: 'El planificador de rutas todavía no está listo.' };
        }
        var ok = await window.manolitAireCalcularRutaPuntoCompartido(
          { lat: p.lat, lon: p.lon, nombre: p.nombre.split(',')[0] }, modo
        );
        if (!ok) return { ok: false, respuesta: 'No he podido calcular esa ruta. Revisa el origen y vuelve a intentarlo.' };
        var como = modo === 'coche' ? 'en coche' : 'a pie';
        return { ok: true, respuesta: 'Ruta ' + como + ' hasta ' + p.nombre.split(',')[0] + ' dibujada en el mapa.' };
      }
    },

    buscar_fuente_agua: {
      descripcion: 'Busca la fuente de agua más cercana a tu ubicación y dibuja la ruta.',
      parametros: { lugar: 'string opcional si no hay GPS' },
      async ejecutar(args) {
        if (!await esperarMapa(15000)) return { ok: false, respuesta: 'El mapa todavía se está cargando.' };
        var origen = null;
        var ultima = window.__manolitUltimaPos;
        if (ultima && isFinite(ultima.lat) && isFinite(ultima.lon)) origen = { lat: Number(ultima.lat), lon: Number(ultima.lon) };
        if (!origen && args && args.lugar) origen = await geocodificar(args.lugar);
        if (!origen) return { ok: false, respuesta: 'No conozco tu ubicación. Dime una ciudad, dirección o coordenadas.' };
        if (typeof window.manolitAireBuscarFuenteAguaCercana !== 'function') return { ok: false, respuesta: 'La capa de fuentes todavía no está lista.' };
        fijarCheckbox('rsToggleFuentesAgua', true);
        var f = await window.manolitAireBuscarFuenteAguaCercana(origen);
        if (!f) return { ok: false, respuesta: 'No encuentro fuentes cartografiadas en 5 km a la redonda.' };
        var nombre = f.nombre && f.nombre !== f.tipo ? f.tipo + ': ' + f.nombre : f.tipo;
        if (typeof window.manolitAireCalcularRutaAgua === 'function') {
          await window.manolitAireCalcularRutaAgua(origen, { lat: f.lat, lon: f.lon, nombre: nombre });
        }
        return {
          ok: true,
          respuesta: 'Fuente más cercana: ' + nombre + ' a ' + Math.round(f.distanciaMetros) + ' m. Ruta dibujada en el mapa.',
          datos: f
        };
      }
    },

    /* ------------------------- VISTA 2D / 3D ------------------------- */
    vista_3d: {
      descripcion: 'Inclina el mapa en vista 3D (o lo devuelve a 2D plano).',
      parametros: { activa: 'booleano' },
      async ejecutar(args) {
        if (!mapa()) return { ok: false, respuesta: 'El mapa todavía se está cargando.' };
        var m = mapa();
        // En el paseo virtual la cámara la manda el jugador: no se toca.
        try {
          var btnPaseo = document.getElementById('rsBtnPaseo');
          if (btnPaseo && btnPaseo.classList.contains('rs-activo')) {
            return { ok: false, respuesta: 'Estás en el paseo virtual 3D: sal de él para cambiar la vista.' };
          }
        } catch (ePaseo) { }
        var activa = !(args && args.activa === false);
        var pitch = activa ? Math.min(60, (m.getMaxPitch ? m.getMaxPitch() : 60)) : 0;
        if (!(pitch > 0)) pitch = 0; // el motor no admite 3D: mejor planos, sin mentir
        return new Promise(function (resolve) {
          var respondido = false;
          var responder = function (okReal) {
            if (respondido) return;
            respondido = true;
            if (activa && okReal) resolve({ ok: true, respuesta: 'Vista 3D inclinada.' });
            else if (activa) resolve({ ok: false, respuesta: 'Este mapa no admite inclinación 3D ahora mismo.' });
            else resolve({ ok: true, respuesta: 'Vista 2D plana y al norte.' });
          };
          try {
            var alTerminar = function () {
              try { m.off('moveend', alTerminar); } catch (eOff) { }
              var real = m.getPitch ? m.getPitch() : 0;
              responder(Math.abs(real - pitch) < 1);
            };
            if (typeof m.once === 'function') m.once('moveend', alTerminar);
            m.easeTo({ pitch: pitch, bearing: activa ? m.getBearing() : 0, duration: 600 });
            setTimeout(function () { try { m.off('moveend', alTerminar); } catch (eOff2) { } responder((m.getPitch ? m.getPitch() : 0) > 1); }, 1500);
          } catch (e) {
            resolve({ ok: false, respuesta: 'No he podido cambiar la vista.' });
          }
        });
      }
    },

    orientar_norte: {
      descripcion: 'Orienta el mapa al norte y nivela la vista.',
      parametros: {},
      async ejecutar() {
        if (!mapa()) return { ok: false, respuesta: 'El mapa todavía se está cargando.' };
        mapa().easeTo({ bearing: 0, pitch: 0, duration: 400 });
        return { ok: true, respuesta: 'Mapa orientado al norte.' };
      }
    },

    paseo_virtual: {
      descripcion: 'Entra o sale del paseo virtual 3D.',
      parametros: { activo: 'booleano' },
      async ejecutar(args) {
        if (!clic('rsBtnPaseo')) return { ok: false, respuesta: 'El paseo virtual todavía no está disponible.' };
        return { ok: true, respuesta: (args && args.activo === false) ? 'Paseo virtual detenido.' : 'Paseo virtual activado.' };
      }
    },

    /* ------------------------- SEGUIMIENTO GPS ------------------------- */
    iniciar_caminata: {
      descripcion: 'Inicia el seguimiento GPS de caminata (o lo detiene si ya está activo).',
      parametros: {},
      async ejecutar() {
        var btn = document.getElementById('rsBtnWalk');
        if (!btn) return { ok: false, respuesta: 'El control de caminata todavía no está listo.' };
        var andando = btn.classList.contains('rs-activo');
        btn.click();
        return { ok: true, respuesta: andando ? 'Caminata detenida.' : 'Caminata iniciada: te sigue el GPS.' };
      }
    },

    seguimiento_ruta: {
      descripcion: 'Arranca el motor de ruta inteligente (RouteTracker) con un modo (caminar, bici, coche) y un objetivo (sombra, sol o agua). Lo detiene con activo=false.',
      parametros: { activo: 'booleano (por defecto true)', modo: '"caminar" | "bici" | "coche"', objetivo: '"sombra" | "sol" | "agua"' },
      async ejecutar(args) {
        if (!window.ManolitRouteTracker) return { ok: false, respuesta: 'El servicio de ruta todavía no está disponible.' };
        if (args && args.activo === false) {
          var fin = window.ManolitRouteTracker.parar();
          return { ok: true, respuesta: 'Seguimiento de ruta detenido. Distancia acumulada: ' + (fin.distanciaAcumuladaM / 1000).toFixed(2) + ' km.' };
        }
        var modo = args && args.modo;
        var objetivo = args && args.objetivo;
        var r = window.ManolitRouteTracker.iniciar({ modo: modo, objetivo: objetivo });
        if (!r.ok) return { ok: false, respuesta: 'No he podido arrancar el seguimiento (GPS no disponible).' };
        var umbral = r.umbralM > 0 ? ('un aviso cada ' + (r.umbralM >= 1000 ? (r.umbralM / 1000) + ' km' : r.umbralM + ' m')) : 'sin avisos automáticos; usa «sombra_en_mi_avance» cuando quieras una foto del avance';
        return {
          ok: true,
          respuesta: 'Seguimiento activo en modo ' + r.modo + ', objetivo ' + r.objetivo + '; ' + umbral + '.'
        };
      }
    },

    estado_ruta: {
      descripcion: 'Consulta el estado del motor de ruta: distancia, tiempo y modo.',
      parametros: {},
      async ejecutar() {
        if (!window.ManolitRouteTracker) return { ok: false, respuesta: 'El servicio de ruta todavía no está disponible.' };
        var e = window.ManolitRouteTracker.estado();
        if (!e.activo) return { ok: true, respuesta: 'El seguimiento está parado.', datos: e };
        return {
          ok: true,
          respuesta: 'Seguimiento ' + e.modo + ': ' + e.distanciaAcumuladaKm + ' km, ' + e.tiempoTranscurridoMin + ' min, ' + e.checkpoints + ' puntos de control.',
          datos: e
        };
      }
    }
  };

  /* ---------------------------------------------------------------------
     Ejecutor genérico: recibe {nombre, parametros}, devuelve
     {ok, respuesta, datos}. Nunca lanza.
     --------------------------------------------------------------------- */
  async function ejecutar(nombre, parametros) {
    var h = HERRAMIENTAS[nombre];
    if (!h) return { ok: false, respuesta: 'No existe la herramienta «' + nombre + '».' };
    try {
      var r = await h.ejecutar(parametros || {});
      return r || { ok: false, respuesta: 'La herramienta no devolvió resultado.' };
    } catch (e) {
      return { ok: false, respuesta: 'No he podido ejecutar «' + nombre + '».', error: String(e && e.message || e) };
    }
  }

  /* ---------------------------------------------------------------------
     Catálogo para el LLM (formato tipo OpenAI tools): lo usa el chat si el
     modelo devuelve una llamada estructurada {tool, args}.
     --------------------------------------------------------------------- */
  function catalogo() {
    return Object.keys(HERRAMIENTAS).map(function (nombre) {
      return {
        type: 'function',
        function: {
          name: nombre,
          description: HERRAMIENTAS[nombre].descripcion,
          parameters: HERRAMIENTAS[nombre].parametros || {}
        }
      };
    });
  }

  window.ManolitTools = {
    lista: function () { return Object.keys(HERRAMIENTAS); },
    existe: function (nombre) { return !!HERRAMIENTAS[nombre]; },
    ejecutar: ejecutar,
    catalogo: catalogo
  };
})();
