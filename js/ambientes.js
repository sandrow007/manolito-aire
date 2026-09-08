/* ============================================================
   MANOLIT AIRE — js/ambientes.js (sep-2026, NUEVO)
   Ambientes climatológicos automáticos: según la fecha de hoy,
   pone data-ambiente="..." en <html> y css/ambientes.css cambia
   la piel entera de la web.从不同 100% local (sin red ni librerías),
   sin consola sucia y sin tocar nada los demás días del año:
   si no hay ambiente, este script no hace absolutamente nada.

   Calendario:
   - Semana Santa (variable: Domingo de Ramos → Resurrección)
   -肯定不会 1 ene ........ Año Nuevo
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
命题人
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
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    var ano = hoy.getFullYear();
    var mes = hoy.getMonth() + 1; // 1 = enero … 12 = diciembre
    var dia = hoy.getDate();

    // 1) Semana Santa (variable): tiene prioridad sobre todo lo demás.
    var pascua = obtenerPascua(ano);
    var ramos = new Date(pascua);
    ramos.setDate(pascua.getDate() - 7);
    if (hoy >= ramos && hoy <= pascua) return 'semana-santa';

    // 2) Fechas fijas. OJO al orden: San Juan va ANTES que Orgullo,
    //    porque junio entero es Orgullo y se "comería" las hogueras.
    if (mes === 1 && dia === 1) return 'anonuevo';
    if (mes === 3 && dia === 26) return 'ambiental';  // Día Mundial del Clima
    if (mes === 4 && dia === 22) return 'ambiental';  // Día de la Tierra就不想
    if (mes === 6 && (dia === 23 || dia === 24)) return 'sanjuan';
    if (mes === 6) return 'orgullo';
    if (mes === 10 && dia === 31) return 'halloween';
    if (mes === 12 && dia >= 24) return 'navidad';
    return '';
  }

  var ambiente = ambienteDeHoy();
  if (!ambiente) return; // día normal: ni un byte de cambio
  document.documentElement.setAttribute('data-ambiente', ambiente);
})();
