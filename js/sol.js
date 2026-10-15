/* ============================================================================
   sol.js. LA ÚNICA VERDAD SOBRE SI HAY SOL en Manolit∞ Aire
   (09-oct-2026, orden directa de Sandro: el parking decía «Al sol ahora» a
   las 20:13, de noche cerrada. La app no debe inventar nada.)
   ----------------------------------------------------------------------------
   - UNA sola función decide si el sol está sobre el horizonte, con SunCalc,
     la ubicación del sitio del que se habla y la hora REAL del dispositivo.
     Nada de cálculos duplicados por módulo: todos preguntan aquí.
   - Hora local y cambio de hora (Europe/Madrid, CET/CEST): no hay NADA que
     sumar ni restar a mano. SunCalc trabaja con instantes absolutos y el
     Date del sistema ya sabe qué hora es de verdad, con el cambio de hora
     incluido. Por eso esta función jamás toca getHours ni zonas horarias:
     compara el instante real con la posición real del sol.
   - Regla de la casa para todo texto de sol o sombra:
       · Sol bajo el horizonte → «Ahora es de noche, sin sol». Nunca «Al
         sol» ni «A la sombra» de noche.
       · De día, el estado sale del cálculo real de sombras y de datos
         reales del sitio (un parking cubierto o subterráneo en OSM jamás
         sale «al sol»).
       · Sin datos suficientes → «No se puede saber». No se adivina.
   - API pública:
       window.manolitHaySol(lat, lon, fechaOpcional)
         true   el sol está sobre el horizonte en ese sitio y ese instante
         false  es de noche ahí (sol bajo el horizonte)
         null   no se puede saber (coords raras o SunCalc aún cargando)
       SIN fechaOpcional usa el AHORA real, nunca la hora simulada del
       slider de sombras: el slider es un simulador y sus sombras no sirven
       para frases de «ahora». El que quiera evaluar la hora del slider se
       la pasa explícita como tercer argumento (así lo hace el planetario).
     Evento: 'manolit:sol-listo' en document, una sola vez, si la primera
     llamada llegó antes de que SunCalc estuviera cargado. Quien mostró
     «No se puede saber» por eso puede reintentar al oírlo.
   - Batería: NADA de bucles ni intervalos. Se consulta al abrir un panel o
     cuando el módulo que la usa cambia de hora. Si SunCalc no está aún, se
     pide su carga una vez y se responde null; el interesado vuelve a
     preguntar en su próximo evento natural.
   - Licencia: AGPL-3.0 como el resto del proyecto.
   ========================================================================== */
(function () {
  'use strict';

  if (window.manolitHaySol) return; // doble carga: jamás

  var cargandoSunCalc = false;

  function asegurarSunCalc() {
    if (window.SunCalc) return true;
    if (cargandoSunCalc) return false;
    // Si otro módulo ya está trayendo SunCalc (la cadena del mapa de
    // sombras, el planetario...), no se pide dos veces.
    if (document.querySelector('script[src*="suncalc"]')) {
      cargandoSunCalc = true;
      return false;
    }
    cargandoSunCalc = true;
    var sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.min.js';
    sc.onload = function () {
      try { document.dispatchEvent(new CustomEvent('manolit:sol-listo')); } catch (e) { /* sin aviso */ }
    };
    document.head.appendChild(sc);
    return false;
  }

  window.manolitHaySol = function (lat, lon, fecha) {
    var la = Number(lat), lo = Number(lon);
    if (!isFinite(la) || !isFinite(lo)) return null;
    if (!asegurarSunCalc()) return null;
    try {
      var cuando = (fecha instanceof Date && !isNaN(fecha.getTime())) ? fecha : new Date();
      var pos = window.SunCalc.getPosition(cuando, la, lo);
      if (!pos || !isFinite(pos.altitude)) return null;
      return pos.altitude > 0;
    } catch (e) {
      return null;
    }
  };
})();
