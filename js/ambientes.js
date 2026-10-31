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
   - 31 oct-1 nov . Halloween (con decoración festiva, hasta el 1 nov 23:59)
   - 10 dic-15 ene  Navidad (con decoración festiva; el 31 dic anuncia el
     cambio de año; el 1 ene manda el ambiente anonuevo y del 2 al 15 ene
     vuelve la piel de Navidad hasta despedirse)
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- VENTANAS DEL MODO SALUD (01-oct-2026) ----------------
     LEY NUEVA tras el susto del verde que seguía
     puesto el viernes siguiente sin avisar:

     1) PROHIBIDAS las reglas recurrentes ("todos los sábados", "cada
        domingo"...). Eso es lo que reactivó el tema verde solo, una y
        otra vez, sin que nadie lo pidiera.
     2) El modo salud solo se enciende dentro de VENTANAS CERRADAS escritas
        aquí abajo, cada una con su fecha de inicio y su fecha y hora de
        FIN. Al llegar el fin, la condición deja de cumplirse y la web
        vuelve sola a su piel de siempre, sin tocar nada.
     3) AVISO PREVIO SIEMPRE: ninguna ventana existe sin orden expresa; el script conoce cada ventana antes de que se active.
        Además, una semana antes de cada ventana este script deja un aviso
        en la consola (F12) por si lo abre, y mientras la ventana está
        activa el banner verde enseña el día y la hora exacta en que
        termina.
     4) Para repetir el evento en otra fecha se añade otra línea al array,
        nunca se resucita una regla semanal.

     La ventana de estreno (vie 25-sep-2026 → dom 27-sep-2026 18:00) ya
     pasó y se queda aquí comentada como memoria. NO BORRAR (): todo el modo salud se guarda para reutilizarlo. */
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

    // 0) Salud (sep-2026; REGLA BLINDADA el 01-oct-2026):
    //    solo manda la lista VENTANAS_SALUD de arriba, ventanas cerradas
    //    con fin escrito. La antigua regla semanal (sábado entero y
    //    domingo hasta las 18:00) se eliminó : era la
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
    // Halloween: la noche del 31 y todo el día 1 de noviembre (23:59 incluida;
    // el 2 a las 00:00 la web ya vuelve sola a su piel de siempre).
    if (mes === 10 && dia >= 31) return 'halloween';
    if (mes === 11 && dia === 1) return 'halloween';
    // Navidad: del 10 de diciembre al 15 de enero (Año Nuevo georgiano viejo,
    // que se celebra el 13-14 de enero). El 1 de enero lo gobierna el
    // ambiente 'anonuevo' de más arriba; del 2 al 15 enero vuelve Navidad
    // para despedirse.
    if (mes === 12 && dia >= 10) return 'navidad';
    if (mes === 1 && dia >= 2 && dia <= 15) return 'navidad';
    return '';
  }

  var ambiente = ambienteDeHoy();

  // Vista previa manual (31-oct-2026): ?ambiente=halloween|navidad|anonuevo|
  // ambiental|sanjuan|orgullo|semana-santa obliga a un tema aunque no sea su
  // fecha, y ?ambiente=off apaga cualquier tema. Sirve para enseñar cómo se
  // queda la web en cualquier época sin esperar al calendario.
  try {
    var forzado = new URLSearchParams(window.location.search).get('ambiente');
    if (forzado) {
      var AMBIENTES_VALIDOS = ['halloween', 'navidad', 'anonuevo', 'ambiental', 'sanjuan', 'orgullo', 'semana-santa'];
      if (forzado === 'off') ambiente = '';
      else if (AMBIENTES_VALIDOS.indexOf(forzado) !== -1) ambiente = forzado;
    }
  } catch (e) { }

  if (ambiente) {
    console.info('[ambientes] Tema activo: ' + ambiente + '. Vista previa en cualquier fecha con ?ambiente=halloween, navidad, anonuevo u off.');
  }

  // Aviso previo en consola (01-oct-2026, ley nueva): una semana
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

  // ---- FESTEJOS CON DECORACIÓN (31-oct-2026) ----
  // Halloween y Navidad llevan una capa fija de adornos (telarañas, fantasmas,
  // calabaza, gorro de Papá Noel, muñeco de nieve...). Reglas de ahorro:
  //   1) SVG en línea, sin red ni imágenes nuevas (cero descargas).
  //   2) Solo 2-4 elementos animados por fiesta, con duraciones largas
  //      (8-40 s) y solo transform/opacity: la GPU lo mueve casi gratis.
  //   3) Con prefers-reduced-motion TODO queda estático: ni un frame animado.
  //   4) pointer-events:none y aria-hidden: no estorban ni a ratón ni a lector
  //      de pantalla. Nada se guarda ni se repite: fuera de fecha no se crea.
  var DECORACIONES = {
    halloween:
      // Telarañas en las dos esquinas superiores
      '<svg class="festijo-fig festijo-web festijo-web-izq" viewBox="0 0 140 140" width="130" height="130" aria-hidden="true"><g stroke="currentColor" fill="none" stroke-width="1.6">' +
      '<path d="M0 0 L140 0 M0 0 L135 37 M0 0 L121 70 M0 0 L99 99 M0 0 L70 121 M0 0 L37 135 M0 0 L0 140"/>' +
      '<path d="M45 0 A45 45 0 0 1 43.5 11.7 A45 45 0 0 1 39 22.5 A45 45 0 0 1 31.8 31.8 A45 45 0 0 1 22.5 39 A45 45 0 0 1 11.7 43.5 A45 45 0 0 1 0 45"/>' +
      '<path d="M90 0 A90 90 0 0 1 87 23.4 A90 90 0 0 1 78 45 A90 90 0 0 1 63.6 63.6 A90 90 0 0 1 45 78 A90 90 0 0 1 23.4 87 A90 90 0 0 1 0 90"/>' +
      '<path d="M135 0 A135 135 0 0 1 130.5 35 A135 135 0 0 1 117 67.5 A135 135 0 0 1 95.4 95.4 A135 135 0 0 1 67.5 117 A135 135 0 0 1 35 130.5 A135 135 0 0 1 0 135"/></g></svg>' +
      '<svg class="festijo-fig festijo-web festijo-web-der" viewBox="0 0 140 140" width="130" height="130" aria-hidden="true"><g stroke="currentColor" fill="none" stroke-width="1.6">' +
      '<path d="M140 0 L0 0 M140 0 L5 37 M140 0 L19 70 M140 0 L41 99 M140 0 L70 121 M140 0 L103 135 M140 0 L140 140"/>' +
      '<path d="M95 0 A45 45 0 0 0 96.5 11.7 A45 45 0 0 0 101 22.5 A45 45 0 0 0 108.2 31.8 A45 45 0 0 0 117.5 39 A45 45 0 0 0 128.3 43.5 A45 45 0 0 0 140 45"/>' +
      '<path d="M50 0 A90 90 0 0 0 53 23.4 A90 90 0 0 0 62 45 A90 90 0 0 0 76.4 63.6 A90 90 0 0 0 95 78 A90 90 0 0 0 116.6 87 A90 90 0 0 0 140 90"/>' +
      '<path d="M5 0 A135 135 0 0 0 9.5 35 A135 135 0 0 0 23 67.5 A135 135 0 0 0 44.6 95.4 A135 135 0 0 0 72.5 117 A135 135 0 0 0 105 130.5 A135 135 0 0 0 140 135"/></g></svg>' +
      // Gorro de bruja colgado arriba
      '<svg class="festijo-fig festijo-gorro" viewBox="0 0 64 52" width="72" height="58" aria-hidden="true"><path d="M18 40 L33 4 L48 40 Z" fill="#4c1d95"/><ellipse cx="33" cy="42" rx="28" ry="7" fill="#3b0764"/><rect x="24" y="30" width="18" height="7" rx="2" fill="#eab308"/></svg>' +
      // Murciélagos volando (animados)
      '<svg class="festijo-fig festijo-murcielago festijo-m1" viewBox="0 0 40 18" width="34" height="15" aria-hidden="true"><path d="M2 9 Q8 0 13 7 Q16 -1 20 5 Q24 -1 27 7 Q32 0 38 9 L20 15 Z" fill="#150a1e"/></svg>' +
      '<svg class="festijo-fig festijo-murcielago festijo-m2" viewBox="0 0 40 18" width="26" height="12" aria-hidden="true"><path d="M2 9 Q8 0 13 7 Q16 -1 20 5 Q24 -1 27 7 Q32 0 38 9 L20 15 Z" fill="#150a1e"/></svg>' +
      // Fantasmas flotando (animados)
      '<svg class="festijo-fig festijo-fantasma festijo-f1" viewBox="0 0 60 68" width="62" height="70" aria-hidden="true"><path d="M10 34 C10 14 20 6 30 6 C40 6 50 14 50 34 L50 58 L42 51 L36 58 L30 51 L24 58 L18 51 L10 58 Z" fill="#f8fafc" opacity="0.8"/><circle cx="23" cy="28" r="3.4" fill="#1e293b"/><circle cx="37" cy="28" r="3.4" fill="#1e293b"/><ellipse cx="30" cy="38" rx="4" ry="5" fill="#1e293b" opacity="0.55"/></svg>' +
      '<svg class="festijo-fig festijo-fantasma festijo-f2" viewBox="0 0 60 68" width="44" height="50" aria-hidden="true"><path d="M10 34 C10 14 20 6 30 6 C40 6 50 14 50 34 L50 58 L42 51 L36 58 L30 51 L24 58 L18 51 L10 58 Z" fill="#f8fafc" opacity="0.65"/><circle cx="23" cy="28" r="3.4" fill="#1e293b"/><circle cx="37" cy="28" r="3.4" fill="#1e293b"/></svg>' +
      // Calabaza tallada abajo a la izquierda
      '<svg class="festijo-fig festijo-calabaza" viewBox="0 0 64 58" width="86" height="78" aria-hidden="true"><ellipse cx="32" cy="36" rx="26" ry="19" fill="#ea580c"/><ellipse cx="32" cy="36" rx="15" ry="19" fill="#f97316" opacity="0.7"/><ellipse cx="32" cy="36" rx="6" ry="19" fill="#fb923c" opacity="0.6"/><path d="M32 17 Q34 10 39 8" stroke="#166534" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M20 32 L27 26 L27 35 Z M44 32 L37 26 L37 35 Z" fill="#1c0e04"/><path d="M20 42 Q26 48 32 42 Q38 48 44 42 L41 47 L38 43 L35 48 L32 44 L29 48 L26 43 L23 47 Z" fill="#1c0e04"/></svg>' +
      // Monstruito asomando abajo a la derecha
      '<svg class="festijo-fig festijo-monstruo" viewBox="0 0 56 52" width="66" height="62" aria-hidden="true"><path d="M12 22 L7 8 L19 17 Z M44 22 L49 8 L37 17 Z" fill="#16a34a"/><path d="M6 52 Q4 20 28 20 Q52 20 50 52 Z" fill="#16a34a"/><circle cx="20" cy="34" r="6.5" fill="#f8fafc"/><circle cx="36" cy="34" r="6.5" fill="#f8fafc"/><circle cx="21.5" cy="35" r="3" fill="#14532d"/><circle cx="34.5" cy="35" r="3" fill="#14532d"/><path d="M22 44 L34 44 L28 49 Z" fill="#f8fafc"/></svg>',
    navidad:
      // Nieve cayendo (dos capas de puntos que se desplazan lentas)
      '<div class="festijo-nieve" aria-hidden="true"></div>' +
      // Bolas colgando del borde superior (columpio suave)
      '<svg class="festijo-fig festijo-bola festijo-b1" viewBox="0 0 24 42" width="22" height="40" aria-hidden="true"><line x1="12" y1="0" x2="12" y2="13" stroke="#94a3b8" stroke-width="1.4"/><circle cx="12" cy="15" r="2.6" fill="#eab308"/><circle cx="12" cy="27" r="11" fill="#dc2626"/><circle cx="8" cy="23" r="2.4" fill="#fca5a5" opacity="0.85"/></svg>' +
      '<svg class="festijo-fig festijo-bola festijo-b2" viewBox="0 0 24 42" width="26" height="46" aria-hidden="true"><line x1="12" y1="0" x2="12" y2="13" stroke="#94a3b8" stroke-width="1.4"/><circle cx="12" cy="15" r="2.6" fill="#eab308"/><circle cx="12" cy="27" r="11" fill="#166534"/><circle cx="8" cy="23" r="2.4" fill="#86efac" opacity="0.85"/></svg>' +
      '<svg class="festijo-fig festijo-bola festijo-b3" viewBox="0 0 24 42" width="20" height="36" aria-hidden="true"><line x1="12" y1="0" x2="12" y2="13" stroke="#94a3b8" stroke-width="1.4"/><circle cx="12" cy="15" r="2.6" fill="#eab308"/><circle cx="12" cy="27" r="11" fill="#0e7490"/><circle cx="8" cy="23" r="2.4" fill="#a5f3fc" opacity="0.85"/></svg>' +
      // Gorro de Papá Noel arriba a la derecha
      '<svg class="festijo-fig festijo-gorropapa" viewBox="0 0 92 70" width="88" height="66" aria-hidden="true"><path d="M8 54 Q10 18 46 10 Q88 4 84 36 Q82 46 73 42 Q62 36 58 46 Q42 60 8 54 Z" fill="#dc2626"/><ellipse cx="32" cy="54" rx="27" ry="10" fill="#f8fafc"/><circle cx="80" cy="38" r="7.5" fill="#f8fafc"/></svg>' +
      // Muñeco de nieve abajo a la izquierda
      '<svg class="festijo-fig festijo-nieve-muneco" viewBox="0 0 64 88" width="66" height="90" aria-hidden="true"><circle cx="32" cy="62" r="21" fill="#f8fafc"/><circle cx="32" cy="32" r="14" fill="#f8fafc"/><circle cx="27" cy="29" r="2" fill="#0f172a"/><circle cx="37" cy="29" r="2" fill="#0f172a"/><path d="M32 33 L39 36 L32 38 Z" fill="#ea580c"/><circle cx="32" cy="58" r="2" fill="#0f172a"/><circle cx="32" cy="66" r="2" fill="#0f172a"/><rect x="22" y="8" width="20" height="11" rx="2" fill="#14532d"/><rect x="16" y="18" width="32" height="5" rx="2" fill="#14532d"/><rect x="18" y="44" width="28" height="7" rx="3" fill="#dc2626"/></svg>' +
      // Regalo abajo a la derecha
      '<svg class="festijo-fig festijo-regalo" viewBox="0 0 60 60" width="60" height="60" aria-hidden="true"><rect x="10" y="24" width="40" height="28" fill="#dc2626"/><rect x="26" y="24" width="8" height="28" fill="#eab308"/><rect x="6" y="15" width="48" height="11" rx="2" fill="#b91c1c"/><rect x="26" y="15" width="8" height="11" fill="#eab308"/><circle cx="24" cy="13" r="5" fill="#eab308"/><circle cx="36" cy="13" r="5" fill="#eab308"/><circle cx="30" cy="14" r="3" fill="#ca8a04"/></svg>'
  };

  function ponerFestejo() {
    if (!DECORACIONES[ambiente]) return;
    if (document.getElementById('festijo-decor')) return; // doble carga: jamás
    var decor = document.createElement('div');
    decor.id = 'festijo-decor';
    decor.className = 'festijo-' + ambiente;
    decor.setAttribute('aria-hidden', 'true');
    decor.innerHTML = DECORACIONES[ambiente];
    document.body.appendChild(decor);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ponerFestejo);
  } else {
    ponerFestejo();
  }

  // Anuncio de fin de año: el 31 de diciembre, dentro del modo Navidad,
  // una barra festiva bajo la cabecera da la bienvenida al año que entra.
  var finDeAno = false;
  try {
    var hoyFin = new Date();
    finDeAno = ambiente === 'navidad' && hoyFin.getMonth() === 11 && hoyFin.getDate() === 31;
  } catch (e) { }
  if (finDeAno) {
    var ponerAnuncioFinDeAno = function () {
      if (document.getElementById('festijo-anuncio')) return;
      var ahora = new Date();
      var anoQueEntra = ahora.getFullYear() + 1;
      var barra = document.createElement('div');
      barra.id = 'festijo-anuncio';
      barra.setAttribute('role', 'status');
      barra.innerHTML = '<strong>Esta noche cambia el año. ¡Adiós ' + ahora.getFullYear() + ', bienvenido ' + anoQueEntra + '!</strong>' +
        '<span>Manolit∞ te desea un ' + anoQueEntra + ' con sombra fresca, agua cerca y rutas sin sol.</span>';
      var cabecera = document.querySelector('header.topbar');
      if (cabecera && cabecera.parentNode) cabecera.parentNode.insertBefore(barra, cabecera.nextSibling);
      else if (document.body) document.body.insertBefore(barra, document.body.firstChild);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ponerAnuncioFinDeAno);
    } else {
      ponerAnuncioFinDeAno();
    }
  }

  // Extras del modo salud (sep-2026). Clase global
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

      // Aviso de reversión visible (01-oct-2026, ley nueva):
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
      //): burbuja extra de Manolito justo tras la
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

      // Stickers interactivos de salud (26-sep-2026):
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
