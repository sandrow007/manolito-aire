/* ============================================================
   MANOLIT AIRE · MÓDULO A11Y (guía para personas ciegas)

   Antes este motor vivía dentro de js/shadows-route.js. Ahora es
   un módulo propio (sep-2026): el motor de sombras queda más
   ligero y aquí se concentra todo lo de voz, lectores de pantalla
   y guiado espacial. shadows-route solo le entrega los pasos de
   la ruta calculada y le pasa cada lectura GPS mientras caminas.

   Mejoras profesionales de esta versión:

   1) Región viva ASSERTIVE exclusiva para los pasos (#rsLiveSteps,
      role="alert"). Antes los pasos compartían la región polite
      del resumen solar (#rsLiveSummary) y un cambio de hora podía
      pisar una indicación de giro antes de que el lector de
      pantalla llegara a anunciarla.
   2) Guiado espacial absoluto: preaviso del giro unos 45 m antes
      ("En unos 45 metros, gira a la izquierda en…"), indicación
      exacta al llegar al punto y aviso de desvío si el GPS se
      aleja más de 80 m de todos los puntos de la ruta.
   3) Textos hablados limpios: sin guiones largos ni dos puntos,
      que los lectores de pantalla deletrean o pausan mal.
   4) Batería y temperatura: distancias con haversine en coma
      flotante pura (cero objetos turf por lectura GPS), avisos
      con freno de tiempo para no repetir, y cada frase nueva
      corta la anterior para que nunca se encimen. El móvil no
      se calienta por guiar.
   5) Todo se apaga solo: al ocultar la página o detener la
      caminata se cancela la voz y se suelta la sesión de audio
      (AirPods/Bluetooth vuelven a lo que sonaba antes).

   Misma licencia AGPL-3.0 que el resto del proyecto.
   ============================================================ */

'use strict';

(function () {
  if (window.ManolitA11y) return; // carga única, sin líos

  /* ---------------- Traducción: mismo enganche que shadows-route ---------------- */
  function t(clave, fallback) {
    try {
      const fn = window.getMessages;
      if (typeof fn === 'function') {
        const msg = fn();
        if (msg && msg[clave] != null) return msg[clave];
      }
    } catch (e) { /* seguimos con el fallback */ }
    return fallback != null ? fallback : clave;
  }

  /* ---------------- Estado del módulo ---------------- */
  let pasosActuales = [];
  let pasosGuiadosActuales = []; // [{ texto, punto:[lon,lat], esLlegada? }]
  let lecturaEnCurso = false;
  let guiaCaminataActiva = false;
  let indicePasoGuiado = 0;
  let resumenRuta = '';

  const CLAVE_VOZ = 'manolito_guia_voz';
  const CLAVE_PERMISO_VOZ = 'manolito_voz_permiso'; // 'concedido' | 'denegado' | (sin preguntar)

  function vozQuerida() {
    try { return localStorage.getItem(CLAVE_VOZ) === '1'; } catch (e) { return false; }
  }
  function vozPermitida() {
    try { return localStorage.getItem(CLAVE_PERMISO_VOZ) === 'concedido'; }
    catch (e) { return false; }
  }
  function vozNavegadorDisponible() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /* ---------------- Utilidades ---------------- */

  // Espera a que exista un elemento del DOM (los paneles nacen tarde).
  function cuandoExista(selector, cb, intentos) {
    intentos = intentos || 0;
    const el = document.querySelector(selector);
    if (el) { cb(el); return; }
    if (intentos > 80) return; // ~40 s de margen y se rinde sin ruido
    setTimeout(() => cuandoExista(selector, cb, intentos + 1), 500);
  }

  // Textos hablados y escritos sin signos que los lectores leen mal.
  function limpiarTextoGuia(texto) {
    return String(texto || '')
      .replace(/\s+—\s+/g, ', ')
      .replace(/Consejo:/g, 'Consejo.')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Haversine directo en metros: aritmética pura, sin objetos nuevos.
  const RAD = Math.PI / 180;
  function distanciaMetros(lon1, lat1, lon2, lat2) {
    const dLat = (lat2 - lat1) * RAD;
    const dLon = (lon2 - lon1) * RAD;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ---------------- Sesión de audio (AirPods/Bluetooth) ----------------
     La Web Speech API de iOS/Android "agarra" la sesión de audio del
     sistema al hablar y puede dejarla pillada. Tras CADA frase hablada
     soltamos la cola de voz: la web nunca retiene el audio cuando no
     está hablando. */
  function liberarSesionDeAudio() {
    try {
      if (vozNavegadorDisponible()
          && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch (e) { /* nada que liberar */ }
  }

  /* ---------------- Región viva ASSERTIVE solo para pasos ----------------
     role="alert" = assertive: la indicación de giro interrumpe lo que el
     lector de pantalla estuviera diciendo, porque es información de
     seguridad en mitad de la calle. El resumen del sol sigue en su
     región polite aparte (#rsLiveSummary), ya no se pisan. */
  let regionPasos = null;
  function asegurarRegionPasos() {
    if (regionPasos && regionPasos.isConnected) return regionPasos;
    regionPasos = document.getElementById('rsLiveSteps');
    if (!regionPasos) {
      regionPasos = document.createElement('div');
      regionPasos.id = 'rsLiveSteps';
      regionPasos.setAttribute('role', 'alert');
      regionPasos.setAttribute('aria-live', 'assertive');
      regionPasos.setAttribute('aria-atomic', 'true');
      regionPasos.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;'
        + 'overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
      document.body.appendChild(regionPasos);
    }
    return regionPasos;
  }

  /* ---------------- Permiso de voz ----------------
     La voz no suena por defecto: como el GPS, hay que concederla. El
     permiso se pide UNA vez con una tarjetita discreta y la elección se
     recuerda en localStorage. */
  function pedirPermisoVozSiHaceFalta(porBotonExpreso) {
    try {
      const previo = localStorage.getItem(CLAVE_PERMISO_VOZ);
      if (previo === 'concedido') return true;
      // 'denegado' solo silencia los avisos AUTOMÁTICOS. Si el usuario
      // pulsa ÉL un botón de voz (orden explícita), se vuelve a preguntar
      // siempre: un "Ahora no" nunca deja la voz muerta para siempre.
      if ((previo === 'denegado' && !porBotonExpreso) || document.getElementById('rsPermisoVoz')) return false;
      const tarjeta = document.createElement('div');
      tarjeta.id = 'rsPermisoVoz';
      tarjeta.setAttribute('role', 'dialog');
      tarjeta.setAttribute('aria-label', 'Permiso de voz');
      tarjeta.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:9999;'
        + 'background:var(--panel,#fff);color:var(--ink,#2A1A05);border:1px solid var(--line,rgba(14,59,71,.25));'
        + 'border-radius:14px;padding:12px 16px;max-width:min(92vw,340px);box-shadow:0 8px 30px rgba(0,0,0,.25);'
        + 'font:500 0.9rem/1.4 system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;gap:10px;';
      const txt = document.createElement('div');
      txt.textContent = t('voicePermission', '¿Quieres que Manolit hable en voz alta? Puedes cambiarlo cuando quieras.');
      const fila = document.createElement('div');
      fila.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
      const btnNo = document.createElement('button');
      btnNo.type = 'button';
      btnNo.textContent = t('voiceNo', 'Ahora no');
      btnNo.style.cssText = 'padding:7px 12px;border-radius:9px;border:1px solid var(--line,rgba(14,59,71,.25));background:none;color:inherit;cursor:pointer;';
      const btnSi = document.createElement('button');
      btnSi.type = 'button';
      btnSi.textContent = t('voiceYes', 'Permitir voz');
      btnSi.style.cssText = 'padding:7px 12px;border-radius:9px;border:none;background:var(--accent,#FFB85C);color:#1a1a1a;font-weight:600;cursor:pointer;';
      btnNo.addEventListener('click', () => { try { localStorage.setItem(CLAVE_PERMISO_VOZ, 'denegado'); } catch (e) { } tarjeta.remove(); });
      btnSi.addEventListener('click', () => {
        try { localStorage.setItem(CLAVE_PERMISO_VOZ, 'concedido'); } catch (e) { }
        tarjeta.remove();
        // iOS: la PRIMERA síntesis debe ocurrir DENTRO de un toque del
        // usuario o Safari la bloquea en silencio. Esta confirmación
        // corta se habla en el propio gesto de "Permitir voz".
        try {
          if (vozNavegadorDisponible()) {
            const saludo = new SpeechSynthesisUtterance(t('voiceGranted', 'Voz activada. Manolit te acompaña.'));
            saludo.lang = (document.documentElement.lang || 'es').slice(0, 5);
            window.speechSynthesis.speak(saludo);
          }
        } catch (e) { /* si no puede hablar ahora, hablará en la guía */ }
      });
      fila.appendChild(btnNo); fila.appendChild(btnSi);
      tarjeta.appendChild(txt); tarjeta.appendChild(fila);
      document.body.appendChild(tarjeta);
      // Si no se toca en 20 s, se retira sola (sin conceder nada).
      setTimeout(() => { if (tarjeta.isConnected) tarjeta.remove(); }, 20000);
    } catch (e) { /* sin permiso: la app sigue muda pero funcional */ }
    return false;
  }

  // iOS: la lista de voces del sistema carga asíncrona; se precalienta
  // al arrancar (gratis) y la primera frase ya suena a la primera.
  try {
    if (vozNavegadorDisponible()) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
          try { window.speechSynthesis.getVoices(); } catch (e) { }
        });
      }
    }
  } catch (e) { /* sin voces del sistema: la app sigue en texto */ }

  // Al ocultar o cerrar la página, cualquier habla pendiente se cancela.
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        try { if (vozNavegadorDisponible()) window.speechSynthesis.cancel(); } catch (e) { }
      }
    });
    window.addEventListener('pagehide', () => {
      try { if (vozNavegadorDisponible()) window.speechSynthesis.cancel(); } catch (e) { }
    });
  } catch (e) { /* navegador sin eventos: no pasa nada */ }

  /* ---------------- Hablar un paso ----------------
     Siempre se refleja en la región viva assertive (los lectores de
     pantalla la anuncian solos) y además suena en voz alta con la voz
     del dispositivo, si hay permiso. */
  function hablarPasoGuia(textoCrudo) {
    const texto = limpiarTextoGuia(textoCrudo);
    if (!texto) return;
    const region = asegurarRegionPasos();
    // Doble escritura: vaciar y rellenar fuerza al lector de pantalla a
    // anunciar aunque el texto coincida con el anterior ("Sigue recto"
    // dos veces seguidas también se dice dos veces).
    region.textContent = '';
    region.textContent = texto;
    if (!vozNavegadorDisponible()) return;
    if (!vozPermitida()) { pedirPermisoVozSiHaceFalta(); return; }
    try {
      // Nunca dos frases encimadas: la indicación nueva corta la anterior.
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      const frase = new SpeechSynthesisUtterance(texto);
      frase.lang = (document.documentElement.lang || 'es').slice(0, 5);
      frase.rate = 1;
      // La guía usa la misma voz neutral de Manolit si está disponible.
      try {
        const walker = window.ManolitWalker;
        if (walker && typeof walker._vozMasNeutra === 'function') {
          const voces = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
          const elegida = walker._vozMasNeutra(voces);
          if (elegida && elegida.voz) frase.voice = elegida.voz;
          frase.pitch = elegida && elegida.genero === 'f' ? 0.88
            : elegida && elegida.genero === 'm' ? 1.18 : 1.04;
        }
      } catch (eVoz) { /* voz por defecto del sistema */ }
      frase.onend = liberarSesionDeAudio;
      frase.onerror = liberarSesionDeAudio;
      window.speechSynthesis.speak(frase);
    } catch (e) { /* voz no disponible: queda el anuncio escrito */ }
  }

  /* ---------------- Guía por voz durante la caminata real (GPS) ---------------- */

  function iniciarGuiaCaminata() {
    indicePasoGuiado = 0;
    guiaCaminataActiva = false;
    preavisoHechoEn = -1;
    ultimoAvisoDesvioMs = 0;
    // La guía solo habla si la persona la encendió con su botón.
    if (!vozQuerida()) return;
    guiaCaminataActiva = pasosGuiadosActuales.length > 0;
    if (!guiaCaminataActiva) return;
    hablarPasoGuia(t('walkGuidanceStart', 'Guía de caminata activada. Te iré diciendo cada paso en voz alta.') + ' ' + pasosGuiadosActuales[0].texto);
    indicePasoGuiado = 1;
  }

  // Constantes del guiado espacial (metros).
  const PREAVISO_M = 45; // avisa del giro ANTES de llegar a la esquina
  const GIRO_M = 30;     // margen para dar la indicación exacta
  const LLEGADA_M = 20;  // margen para anunciar la llegada
  const DESVIO_M = 80;   // más lejos de TODOS los puntos = desvío
  const DESVIO_FRENO_MS = 45000; // el aviso de desvío se repite como mucho cada 45 s

  let preavisoHechoEn = -1;
  let ultimoAvisoDesvioMs = 0;

  function avanzarGuiaCaminata(lat, lon) {
    if (!guiaCaminataActiva || indicePasoGuiado >= pasosGuiadosActuales.length) return;
    try {
      // Una pasada con aritmética pura: cero objetos nuevos por lectura
      // GPS (antes se creaban dos turf.point por paso y por lectura).
      let alcanzado = -1;
      let distanciaMinima = Infinity;
      for (let i = indicePasoGuiado; i < pasosGuiadosActuales.length; i++) {
        const paso = pasosGuiadosActuales[i];
        if (!paso || !paso.punto) continue;
        const d = distanciaMetros(lon, lat, paso.punto[0], paso.punto[1]);
        if (d < distanciaMinima) distanciaMinima = d;
        const umbral = paso.esLlegada ? LLEGADA_M : GIRO_M;
        if (d <= umbral) alcanzado = i;
      }

      // Preaviso del próximo giro, una sola vez por paso.
      const siguiente = pasosGuiadosActuales[indicePasoGuiado];
      if (siguiente && siguiente.punto && !siguiente.esLlegada && preavisoHechoEn !== indicePasoGuiado) {
        const dSig = distanciaMetros(lon, lat, siguiente.punto[0], siguiente.punto[1]);
        if (dSig <= PREAVISO_M && dSig > GIRO_M) {
          preavisoHechoEn = indicePasoGuiado;
          const limpio = limpiarTextoGuia(siguiente.texto);
          hablarPasoGuia('En unos ' + (Math.round(dSig / 5) * 5) + ' metros, '
            + limpio.charAt(0).toLowerCase() + limpio.slice(1));
        }
      }

      // Aviso de desvío: claro, calmado y con freno de tiempo.
      if (distanciaMinima > DESVIO_M) {
        const ahora = Date.now();
        if (ahora - ultimoAvisoDesvioMs > DESVIO_FRENO_MS) {
          ultimoAvisoDesvioMs = ahora;
          hablarPasoGuia(t('a11yOffRoute', 'Atención, parece que te has alejado de la ruta guiada. Detente, orientate y, si lo necesitas, vuelve sobre tus pasos.'));
        }
        return;
      }
      if (alcanzado < 0) return;
      const paso = pasosGuiadosActuales[alcanzado];
      hablarPasoGuia(paso.texto);
      indicePasoGuiado = alcanzado + 1;
      if (paso.esLlegada) guiaCaminataActiva = false;
    } catch (e) { /* geometría rara: se reintenta en la próxima lectura GPS */ }
  }

  function detenerGuiaCaminata() {
    guiaCaminataActiva = false;
    indicePasoGuiado = 0;
    preavisoHechoEn = -1;
    ultimoAvisoDesvioMs = 0;
    if (vozNavegadorDisponible()) {
      try { window.speechSynthesis.cancel(); } catch (e) { }
    }
  }

  /* ---------------- Lectura de las indicaciones (botón escuchar) ---------------- */

  function detenerLecturaPasos() {
    if (vozNavegadorDisponible()) {
      try { window.speechSynthesis.cancel(); } catch (e) { }
    }
    lecturaEnCurso = false;
    const btn = document.getElementById('rsBtnEscucharPasos');
    if (btn) {
      btn.textContent = t('stepsListen', 'Escuchar indicaciones');
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  function alternarLecturaPasos() {
    if (!vozNavegadorDisponible() || !pasosActuales.length) return;
    if (!vozPermitida()) { pedirPermisoVozSiHaceFalta(); return; }
    if (lecturaEnCurso) { detenerLecturaPasos(); return; }
    const btn = document.getElementById('rsBtnEscucharPasos');
    lecturaEnCurso = true;
    if (btn) {
      btn.textContent = t('stepsStop', 'Detener lectura');
      btn.setAttribute('aria-pressed', 'true');
    }
    const idioma = (document.documentElement.lang || 'es').slice(0, 5);
    const textos = [];
    if (resumenRuta) textos.push(resumenRuta);
    textos.push(...pasosActuales);
    let restantes = textos.length;
    for (const texto of textos) {
      const frase = new SpeechSynthesisUtterance(limpiarTextoGuia(texto));
      frase.lang = idioma;
      frase.rate = 0.95;
      frase.onend = () => {
        restantes -= 1;
        if (restantes <= 0) detenerLecturaPasos();
      };
      frase.onerror = frase.onend;
      window.speechSynthesis.speak(frase);
    }
  }

  /* ---------------- Indicaciones paso a paso accesibles (lista escrita) ---------------- */

  function renderizarPasosAccesibles(pasos, guiados) {
    pasosActuales = (Array.isArray(pasos) ? pasos : []).map(limpiarTextoGuia);
    pasosGuiadosActuales = Array.isArray(guiados) ? guiados : [];
    detenerGuiaCaminata();
    detenerLecturaPasos();
    const seccion = document.getElementById('rsPasosSection');
    const lista = document.getElementById('rsListaPasos');
    if (!seccion || !lista) return;
    lista.innerHTML = '';
    if (!pasosActuales.length) {
      seccion.hidden = true;
      return;
    }
    for (const texto of pasosActuales) {
      const li = document.createElement('li');
      li.textContent = texto;
      lista.appendChild(li);
    }
    const btn = document.getElementById('rsBtnEscucharPasos');
    if (btn) btn.hidden = !vozNavegadorDisponible();
    seccion.hidden = false;

    // Las indicaciones son OPCIONALES: la sección aparece plegada y quien
    // quiera leerla o escucharla la despliega con el botón. Solo se abre
    // sola con el modo accesible activado (ahí es información esencial).
    const cabecera = seccion.querySelector('.rs-pasos-cabecera');
    let btnPlegar = document.getElementById('rsBtnPlegarPasos');
    if (!btnPlegar && cabecera) {
      btnPlegar = document.createElement('button');
      btnPlegar.type = 'button';
      btnPlegar.id = 'rsBtnPlegarPasos';
      btnPlegar.className = 'rs-btn-escuchar';
      cabecera.insertBefore(btnPlegar, cabecera.firstChild);
      btnPlegar.addEventListener('click', () => {
        fijarPasosPlegados(lista.style.display === 'none');
      });
    }
    const fijarPasosPlegados = (abierto) => {
      lista.style.display = abierto ? '' : 'none';
      if (btn) btn.style.display = abierto ? '' : 'none';
      if (btnPlegar) {
        btnPlegar.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        btnPlegar.textContent = abierto
          ? ('▾ ' + t('stepsHide', 'Ocultar indicaciones'))
          : ('▸ ' + t('stepsShow', 'Ver indicaciones'));
      }
    };
    fijarPasosPlegados(document.body.classList.contains('modo-accesible'));
  }

  function ocultarPasosAccesibles() {
    pasosActuales = [];
    pasosGuiadosActuales = [];
    detenerGuiaCaminata();
    detenerLecturaPasos();
    const seccion = document.getElementById('rsPasosSection');
    if (seccion) seccion.hidden = true;
  }

  document.addEventListener('langChanged', () => {
    const btn = document.getElementById('rsBtnEscucharPasos');
    if (btn) btn.textContent = lecturaEnCurso ? t('stepsStop', 'Detener lectura') : t('stepsListen', 'Escuchar indicaciones');
    const titulo = document.getElementById('rsPasosTitulo');
    if (titulo) titulo.textContent = t('stepsTitle', 'Indicaciones paso a paso');
  });

  /* ---------------- Botón "Guía por voz" (adopta el que nace con el panel) ----------------
     Apagado por defecto; quien quiera la voz la enciende, quien no,
     camina en silencio. La elección se recuerda (y viaja en
     Sincronizar/Exportar, es manolito_*). */
  cuandoExista('#rsBtnGuiaVoz', (btn) => {
    const pintar = () => {
      const on = vozQuerida();
      btn.classList.toggle('rs-activo', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = (on ? '🔊 ' : '🔇 ') + t('voiceGuide', 'Guía por voz');
      btn.title = on
        ? 'Guía por voz ACTIVADA. Manolit te dice cada paso en voz alta al caminar'
        : 'Guía por voz desactivada. Actívala si quieres que Manolit te diga los pasos en voz alta';
    };
    if (!btn.dataset.rsVozEnlazada) {
      btn.dataset.rsVozEnlazada = '1';
      btn.addEventListener('click', () => {
        try { localStorage.setItem(CLAVE_VOZ, vozQuerida() ? '0' : '1'); } catch (e) { }
        pintar();
        try {
          if (vozQuerida()) {
            // Encender la guía es una ORDEN EXPLÍCITA: si falta el
            // permiso, se pide aquí mismo (aunque antes dijeras "Ahora
            // no": un botón pulsado a mano siempre vuelve a preguntar).
            if (!vozPermitida()) pedirPermisoVozSiHaceFalta(true);
            // La acabas de encender con la caminata en marcha: arranca ya.
            const btnWalk = document.getElementById('rsBtnWalk');
            if (btnWalk && btnWalk.classList.contains('rs-activo')) iniciarGuiaCaminata();
          } else {
            // La acabas de APAGAR: silencio INMEDIATO. Se para la guía,
            // se corta cualquier frase a medias y se vacía la cola de voz.
            detenerGuiaCaminata();
          }
        } catch (e) { /* el botón jamás rompe la caminata */ }
      });
    }
    pintar();
  });

  // El botón "Escuchar indicaciones" vive en el HTML estático.
  cuandoExista('#rsBtnEscucharPasos', (btn) => {
    if (btn.dataset.rsLecturaEnlazada) return;
    btn.dataset.rsLecturaEnlazada = '1';
    btn.addEventListener('click', alternarLecturaPasos);
  });

  /* ---------------- API pública para shadows-route ---------------- */
  window.ManolitA11y = {
    iniciarGuiaCaminata,
    avanzar: avanzarGuiaCaminata,
    detenerGuia: detenerGuiaCaminata,
    renderizarPasos: renderizarPasosAccesibles,
    ocultarPasos: ocultarPasosAccesibles,
    alternarLectura: alternarLecturaPasos,
    detenerLectura: detenerLecturaPasos,
    setResumen(texto) { resumenRuta = String(texto || ''); },
    vozPermitida,
    pedirPermisoVoz: pedirPermisoVozSiHaceFalta,
    liberarSesionDeAudio,
    hablar: hablarPasoGuia,
  };

  // Gancho de verificación (pruebas automáticas, sin UI).
  window.__a11yPro = {
    distanciaMetros,
    limpiarTextoGuia,
    fijarPasosPrueba(pasos) {
      pasosGuiadosActuales = Array.isArray(pasos) ? pasos : [];
      guiaCaminataActiva = pasosGuiadosActuales.length > 0;
      indicePasoGuiado = 0;
      preavisoHechoEn = -1;
      ultimoAvisoDesvioMs = 0;
    },
    avanzar: avanzarGuiaCaminata,
    estado() { return { activa: guiaCaminataActiva, indice: indicePasoGuiado }; },
  };
})();
