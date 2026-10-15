/* ============================================================
   MANOLIT AIRE, js/ambientes.js (sep-2026, NUEVO)
   Ambientes climatológicos automáticos: según la fecha de hoy,
   pone data-ambiente="..." en <html> y css/ambientes.css cambia
   la piel entera de la web. 100% local (sin red ni librerías),
   sin consola sucia y sin tocar nada los demás días del año:
   si no hay ambiente, este script no hace absolutamente nada.

   Calendario:
   - Semana Santa (variable: Domingo de Ramos → Resurrección)
   - 1 ene ........ Año Nuevo
   - 26 mar ....... Día Mundial del Clima
   - 22 abr ....... Día de la Tierra
   - 23-24 jun .... San Juan (hogueras)
   - resto de junio . Orgullo
   - 31 oct ....... Halloween
   - 24-31 dic .... Navidad
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- VENTANAS DEL MODO SALUD (01-oct-2026) ----------------
     LEY NUEVA, orden directa de Sandro tras el susto del verde que seguía
     puesto el viernes siguiente sin avisar:

     1) PROHIBIDAS las reglas recurrentes ("todos los sábados", "cada
        domingo"...). Eso es lo que reactivó el tema verde solo, una y
        otra vez, sin que nadie lo pidiera.
     2) El modo salud solo se enciende dentro de VENTANAS CERRADAS escritas
        aquí abajo, cada una con su fecha de inicio y su fecha y hora de
        FIN. Al llegar el fin, la condición deja de cumplirse y la web
        vuelve sola a su piel de siempre, sin tocar nada.
     3) AVISO PREVIO SIEMPRE: ninguna ventana existe sin orden expresa de
        Sandro, así que él sabe de cada ventana antes de que se active.
        Además, una semana antes de cada ventana este script deja un aviso
        en la consola (F12) por si lo abre, y mientras la ventana está
        activa el banner verde enseña el día y la hora exacta en que
        termina.
     4) Para repetir el evento en otra fecha se añade otra línea al array,
        nunca se resucita una regla semanal.

     La ventana de estreno (vie 25-sep-2026 → dom 27-sep-2026 18:00) ya
     pasó y se queda aquí comentada como memoria. NO BORRAR (orden de
     Sandro): todo el modo salud se guarda para reutilizarlo. */
  var VENTANAS_SALUD = [
    // { desde: new Date(2026, 8, 25), hasta: new Date(2026, 8, 27, 18, 0) }, // estreno, ya pasó
  ];

  function ventanaSaludActiva(ahora) {
    for (var v = 0; v < VENTANAS_SALUD.length; v++) {
      if (ahora >= VENTANAS_SALUD[v].desde && ahora < VENTANAS_SALUD[v].hasta) return VENTANAS_SALUD[v];
    }
    return null;
  }

  function ventanaSaludProxima(ahora) {
    var semana = 7 * 24 * 3600 * 1000;
    for (var v = 0; v < VENTANAS_SALUD.length; v++) {
      if (ahora < VENTANAS_SALUD[v].desde && (VENTANAS_SALUD[v].desde - ahora) <= semana) return VENTANAS_SALUD[v];
    }
    return null;
  }

  // Domingo de Resurrección por el algoritmo de Computus (calendario
  // gregoriano): la Semana Santa cambia de fechas cada año y hay que
  // calcularla, no vale una tabla fija.
  function obtenerPascua(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mes = Math.floor((h + l - 7 * m + 114) / 31);
    var dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mes - 1, dia);
  }

  function ambienteDeHoy() {
    // OJO: "ahora" guarda la hora real y "hoy" se pone a las 00:00 más
    // abajo. La regla de salud necesita la hora (el domingo corta a las
    // 18:00), así que se mira "ahora", nunca "hoy".
    var ahora = new Date();
    var hoy = new Date(ahora);
    hoy.setHours(0, 0, 0, 0);
    var ano = hoy.getFullYear();
    var mes = hoy.getMonth() + 1; // 1 = enero … 12 = diciembre
    var dia = hoy.getDate();

    // 0) Salud (sep-2026, orden de Sandro; REGLA BLINDADA el 01-oct-2026):
    //    solo manda la lista VENTANAS_SALUD de arriba, ventanas cerradas
    //    con fin escrito. La antigua regla semanal (sábado entero y
    //    domingo hasta las 18:00) se eliminó por orden directa: era la
    //    que volvía a poner la web en verde cada fin de semana sin
    //    avisar. Va lo primero y manda sobre el resto: si la ventana
    //    pisa otra fiesta, gana la salud mientras dure la ventana.
    if (ventanaSaludActiva(ahora)) return 'salud';

    // 1) Semana Santa (variable): tiene prioridad sobre todo lo demás.
    var pascua = obtenerPascua(ano);
    var ramos = new Date(pascua);
    ramos.setDate(pascua.getDate() - 7);
    if (hoy >= ramos && hoy <= pascua) return 'semana-santa';

    // 2) Fechas fijas. OJO al orden: San Juan va ANTES que Orgullo,
    //    porque junio entero es Orgullo y se "comería" las hogueras.
    if (mes === 1 && dia === 1) return 'anonuevo';
    if (mes === 3 && dia === 26) return 'ambiental';  // Día Mundial del Clima
    if (mes === 4 && dia === 22) return 'ambiental';  // Día de la Tierra
    if (mes === 6 && (dia === 23 || dia === 24)) return 'sanjuan';
    if (mes === 6) return 'orgullo';
    if (mes === 10 && dia === 31) return 'halloween';
    if (mes === 12 && dia >= 24) return 'navidad';
    return '';
  }

  var ambiente = ambienteDeHoy();

  // Aviso previo en consola (01-oct-2026, ley nueva de Sandro): una semana
  // antes de cada ventana de salud queda escrito aquí cuándo empieza y
  // cuándo acaba, y mientras dura, a qué hora vuelve la piel normal.
  // console.info no ensucia: no es warning ni error, el F12 sigue limpio.
  try {
    var ahoraAviso = new Date();
    var ventanaViva = ventanaSaludActiva(ahoraAviso);
    var ventanaQueViene = ventanaSaludProxima(ahoraAviso);
    if (ventanaViva) {
      console.info('[ambientes] Tema de salud ACTIVO. Termina: ' + ventanaViva.hasta.toLocaleString('es-ES') + '. A esa hora la web vuelve sola a su piel de siempre.');
    } else if (ventanaQueViene) {
      console.info('[ambientes] Tema de salud PROGRAMADO. Empieza: ' + ventanaQueViene.desde.toLocaleString('es-ES') + ', termina: ' + ventanaQueViene.hasta.toLocaleString('es-ES') + '.');
    }
  } catch (e) { }

  if (!ambiente) return; // día normal: ni un byte de cambio
  document.documentElement.setAttribute('data-ambiente', ambiente);

  // Extras del modo salud (sep-2026, orden de Sandro). Clase global
  // html.modo-salud que gobierna banner, sección y piel (el CSS la usa).
  // El banner y la sección salen solos por CSS; aquí solo quedan dos
  // toques que no se pueden hacer con CSS: el título de la pestaña y
  // el subtítulo de la pantalla de entrada. Todo reversible: el domingo
  // el script no llega hasta aquí y no se toca nada.
  if (ambiente === 'salud') {
    document.documentElement.classList.add('modo-salud');

    var ponerTitulosSalud = function () {
      // Pestaña del navegador y subtitulo de la pantalla de entrada.
      // 01-oct-2026: traducidos como el resto de la web (antes iban fijos
      // en castellano). Se lee el diccionario de i18n.js si ya esta
      // cargado y se cae al castellano si no.
      var msgSalud = null;
      try { if (typeof window.getMessages === 'function') msgSalud = window.getMessages(); } catch (e) { }
      document.title = (msgSalud && msgSalud.saludSaturdayTitle) || 'Manolit∞ Aire · Sábado de la Salud';
      var sub = document.querySelector('#manolitoSplash .sub-brand');
      if (sub) sub.textContent = (msgSalud && msgSalud.saludSaturdaySub) || '+ Sábado de la Salud';

      // Aviso de reversión visible (01-oct-2026, ley nueva de Sandro):
      // mientras el verde está activo, el propio banner dice el día y la
      // hora exacta en que la web vuelve a su piel. Nadie vuelve a
      // encontrarse un tema puesto "porque sí" y sin fecha de fin.
      var ventana = ventanaSaludActiva(new Date());
      if (ventana) {
        var banner = document.querySelector('.salud-banner');
        if (banner) {
          var finEl = banner.querySelector('.salud-banner-fin');
          if (!finEl) {
            finEl = document.createElement('span');
            finEl.className = 'salud-banner-fin';
            banner.appendChild(finEl);
          }
          var LOCALES_SALUD = { es: 'es-ES', ca: 'ca-ES', eu: 'eu-ES', gl: 'gl-ES', en: 'en-GB', ka: 'ka-GE', ar: 'ar-SA' };
          var langSalud = 'es';
          try { if (typeof window.getCurrentLang === 'function') langSalud = window.getCurrentLang() || 'es'; } catch (e) { }
          var fechaFin = ventana.hasta.toLocaleString(LOCALES_SALUD[langSalud] || 'es-ES', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
          });
          var tplFin = (msgSalud && msgSalud.saludBannerFinTpl) || 'El verde es temporal, el {f} la web vuelve a su piel de siempre.';
          finEl.textContent = tplFin.split('{f}').join(fechaFin);
        }
      }

      // Enlace del banner: lleva a la sección Y la abre (sigue siendo
      // el usuario quien decide cerrarla, el bloque nunca nace abierto).
      // Abrir pasa por el acordeon animado de abajo (clic sintetico en
      // el summary); si ya esta abierto no se toca, nunca lo cierra.
      var enlace = document.querySelector('.salud-banner a[href="#defensa-sombras"]');
      var bloque = document.getElementById('defensa-sombras');
      if (enlace && bloque) {
        enlace.addEventListener('click', function () {
          if (bloque.open) return;
          var resumenBloque = bloque.querySelector('summary');
          if (resumenBloque) resumenBloque.click(); else bloque.open = true;
        });
      }

      // Acordeones con animacion fiable en los dos sentidos (26-sep-2026,
      // bug real cazado en pruebas): Chrome no anima bien los <details>.
      // Al cerrar, el contenido deja de renderizarse y la transicion se
      // congela (el bloque se quedaba abierto en pantalla con el
      // triangulo ya en "cerrado"); al abrir, el contenido entra en
      // layout un frame tarde y la animacion arrancaba sobre un bloque
      // vacio. Asi que el clic lo gobernamos aqui: animamos max-height
      // con pixeles medidos tras dos frames (contenido ya pintado) y
      // solo tocamos el atributo open cuando la animacion termina.
      // Con movimiento reducido, abre/cierra directo sin animar.
      var movimientoReducido = false;
      try { movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
      [
        { det: document.getElementById('defensa-sombras'), cuerpo: document.querySelector('#defensa-sombras .salud-contenido') },
        { det: document.querySelector('.salud-recursos-desplegable'), cuerpo: document.querySelector('.recursos-envoltura') }
      ].forEach(function (ac) {
        if (!ac.det || !ac.cuerpo) return;
        var resumen = ac.det.querySelector('summary');
        if (!resumen) return;
        resumen.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (movimientoReducido) { ac.det.open = !ac.det.open; return; }
          if (ac.animando) return;
          ac.animando = true;
          var cuerpo = ac.cuerpo;
          var abriendo = !ac.det.open;
          var soltar = function () {
            if (ac.det.open && !abriendo) ac.det.open = false; // cierre: ya plegado, se marca cerrado
            cuerpo.style.maxHeight = ''; // gobierna la regla CSS
            ac.animando = false;
          };
          var fin = function (e) {
            if (e && e.propertyName && e.propertyName !== 'max-height') return;
            cuerpo.removeEventListener('transitionend', fin);
            soltar();
          };
          cuerpo.addEventListener('transitionend', fin);
          // Red de seguridad por si transitionend no llega jamas.
          setTimeout(function () { if (ac.animando) soltar(); }, 950);
          if (abriendo) {
            ac.det.open = true;              // el contenido entra en layout
            cuerpo.style.maxHeight = '0px';  // pero plegado
            // Dos frames: el primero renderiza el contenido, el segundo
            // ya puede medirlo de verdad para animar hasta su altura.
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                var interno = cuerpo.firstElementChild;
                var alto = interno ? Math.ceil(interno.getBoundingClientRect().height) : cuerpo.scrollHeight;
                cuerpo.style.maxHeight = alto + 'px';
              });
            });
          } else {
            cuerpo.style.maxHeight = Math.ceil(cuerpo.getBoundingClientRect().height) + 'px';
            void cuerpo.offsetHeight; // fuerza el reflow
            cuerpo.style.maxHeight = '0px';
          }
        });
      });

      // Frase de cierre del chat en fin de semana de salud (26-sep-2026,
      // orden de Sandro): burbuja extra de Manolito justo tras la
      // bienvenida, SOLO en modo salud. Lleva data-i18n, así que cambia
      // de idioma con el resto de la web. El lunes no se crea.
      var bienvenida = document.querySelector('.chat-msg.mano[data-i18n="chatWelcome"]');
      if (bienvenida && !document.querySelector('[data-i18n="saludChat"]')) {
        var burbuja = document.createElement('div');
        burbuja.className = 'chat-msg mano';
        burbuja.setAttribute('data-i18n', 'saludChat');
        try {
          if (typeof translations !== 'undefined' && translations[currentLang] && translations[currentLang].saludChat) {
            burbuja.textContent = translations[currentLang].saludChat;
          } else {
            burbuja.textContent = '¡Por cierto! Recuerda que estamos en el fin de semana de la salud ambiental. El entorno influye en tu cuerpo: si sales a la calle, busca la acera de la sombra y refréscate, que la calle quema.';
          }
        } catch (e) {
          burbuja.textContent = '¡Por cierto! Recuerda que estamos en el fin de semana de la salud ambiental. El entorno influye en tu cuerpo: si sales a la calle, busca la acera de la sombra y refréscate, que la calle quema.';
        }
        bienvenida.parentNode.insertBefore(burbuja, bienvenida.nextSibling);
      }

      // Stickers interactivos de salud (26-sep-2026, orden de Sandro):
      // clic abre el panel fijo con el texto del icono (en el idioma
      // activo, leido de su propio tooltip ya traducido), reclic cierra,
      // otro sticker cambia el contenido, Esc cierra. El hover es CSS
      // puro y no pasa por aqui. Todo solo existe en modo salud.
      var panelSticker = document.getElementById('saludStickerPanel');
      var botonesSticker = document.querySelectorAll('.salud-stickers .sticker');
      if (panelSticker && botonesSticker.length) {
        botonesSticker.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var yaAbierto = btn.getAttribute('aria-expanded') === 'true';
            botonesSticker.forEach(function (b) {
              b.setAttribute('aria-expanded', 'false');
              b.classList.remove('activo');
            });
            if (yaAbierto) { panelSticker.hidden = true; return; }
            var tit = btn.querySelector('.sticker-tip strong');
            var txt = btn.querySelector('.sticker-tip > span');
            panelSticker.querySelector('.sticker-panel-titulo').textContent = tit ? tit.textContent : '';
            panelSticker.querySelector('.sticker-panel-texto').textContent = txt ? txt.textContent : '';
            panelSticker.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
            btn.classList.add('activo');
          });
        });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && !panelSticker.hidden) {
            panelSticker.hidden = true;
            botonesSticker.forEach(function (b) {
              b.setAttribute('aria-expanded', 'false');
              b.classList.remove('activo');
            });
          }
        });
      }
    };

    // ambientes.js carga en <head>, antes de que exista el <body>,
    // así que esto espera a que el DOM esté listo.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ponerTitulosSalud);
    } else {
      ponerTitulosSalud();
    }
    // 01-oct-2026: al cambiar de idioma, applyTranslations repone el title
    // y el sub-brand genericos; este evento llega despues, asi que aqui
    // volvemos a poner la version del Sabado de la Salud en el idioma nuevo.
    document.addEventListener('langChanged', ponerTitulosSalud);
  }
})();
