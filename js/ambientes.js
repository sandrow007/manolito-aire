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

    // 0) Salud (sep-2026, orden de Sandro): la web se pone en verde por
    //    la salud TODO el sábado y el domingo hasta las 18:00. A esa
    //    hora esta regla deja de cumplirse y la web vuelve sola a su
    //    piel normal, sin tocar nada. Va lo primero y manda sobre el
    //    resto: si el fin de semana cae en otra fiesta, gana la salud
    //    (el domingo a las 18:00 esa fiesta recupera su turno).
    //    ESTRENO (ventana única): esta primera vez arranca el viernes
    //    25-sep-2026 y corre hasta el domingo 27 a las 18:00. Pasado
    //    ese momento solo manda la regla semanal de arriba.
    //    NO BORRAR (orden de Sandro): todo el modo salud (esta regla, el
    //    banner, el desplegable y sus estilos) se queda comentado y
    //    guardado en el repositorio aunque no se vea entre semana. Lo
    //    reutilizaremos el año que viene o en otras secciones.
    if (ahora >= new Date(2026, 8, 25) && ahora < new Date(2026, 8, 27, 18)) return 'salud';
    if (ahora.getDay() === 6) return 'salud';
    if (ahora.getDay() === 0 && ahora.getHours() < 18) return 'salud';

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
      // Pestaña del navegador.
      document.title = 'Manolit∞ Aire · Sábado de la Salud';
      // Pantalla de entrada, guiño de Manolito (el splash es siempre
      // en castellano, así que este texto también).
      var sub = document.querySelector('#manolitoSplash .sub-brand');
      if (sub) sub.textContent = '+ Sábado de la Salud';

      // Enlace del banner: lleva a la sección Y la abre (sigue siendo
      // el usuario quien decide cerrarla, el bloque nunca nace abierto).
      var enlace = document.querySelector('.salud-banner a[href="#defensa-sombras"]');
      var bloque = document.getElementById('defensa-sombras');
      if (enlace && bloque) {
        enlace.addEventListener('click', function () { bloque.open = true; });
      }

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
  }
})();
