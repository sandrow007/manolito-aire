/* ============================================================
   MANOLIT AIRE — shadow-worker.js  (ANDAMIO / SCAFFOLD)
   Licencia: AGPL-3.0, igual que el resto del proyecto.
   ------------------------------------------------------------
   Web Worker para sacar los cálculos pesados del hilo principal
   (la página seguirá respondiendo al dedo mientras se calcula).

   QUÉ HACE YA MISMO:
   - Protocolo de mensajes con id (petición → respuesta).
   - 'ping' → 'pong' (para comprobar que el worker vive).
   - 'posicion-solar': posición del sol con el algoritmo NOAA,
     SIN dependencias (no hace falta SunCalc aquí dentro para
     empezar). Devuelve altitude/azimuth en radianes, igual que
     SunCalc.getPosition(), más las variantes en grados.

   DÓNDE VA CADA COSA PESADA (busca «TODO Worker»):
   1) POSICIÓN SOLAR EXACTA CON SUNCALC
      Si algún día quieres la precisión exacta de SunCalc aquí
      dentro, copia el contenido de suncalc.min.js al principio
      de ESTE archivo (los workers no ven los <script> de la
      página) o usa importScripts('/js/vendor/suncalc.min.js')
      con una copia LOCAL en el repo (nada de CDN en caliente:
      así no dependemos de que un servidor externo esté vivo).
      Después, en el manejador 'posicion-solar' puedes cambiar
      la llamada NOAA por SunCalc.getPosition(...) y listo.
   2) CONOS DE SOMBRA DE ÁRBOLES
      Manejador 'conos-arboles'. La página mandaría
      { arboles: [...], horaMs, lat, lon } y aquí se calcularía
      cada cono (dirección = azimuth + 180°, largo = altura /
      tan(altitude)). Turf: copia turf.min.js local igual que
      SunCalc si hace falta geometría pesada.
   3) TURF PESADO (buffer / union / intersect / booleanPointInPolygon)
      Manejador 'turf-pesado'. OJO: los polígonos GeoJSON viajan
      perfectamente por postMessage (structured clone), pero los
      objetos MapLibre NO: hay que mandar GeoJSON plano.
   4) ISLAS DE CALOR (matriz de microclima)
      Manejador 'islas-calor'. Entrada: rejilla de puntos +
      clasificación de superficie + temperatura base. Salida:
      array de temperaturas. La pintada del canvas se queda en
      la página (los workers no tocan el DOM).

   REGLAS DEL PROYECTO QUE ESTE ARCHIVO RESPETA:
   - Cero dependencias de pago, cero servicios externos nuevos.
   - La LÓGICA no cambia: solo se mueve de sitio (postMessage).
   - Si el worker falla, la página debe seguir igual de bien:
     TODAS las llamadas desde la página tienen plan B en el hilo
     principal (ver js/rendimiento-movil.js, USAR_WORKER_SOMBRAS).
   ============================================================ */
'use strict';

/* ---------------- Utilidades de fecha (NOAA) ---------------- */
const RAD = Math.PI / 180;

function aJuliano(fechaMs) {
  return fechaMs / 86400000 + 2440587.5; // días julianos
}

/* Posición solar aproximada (algoritmo NOAA, error típico < 0,01°).
   Devuelve en RADIANES y con la misma convención que SunCalc:
   azimuth medido desde el SUR, positivo hacia el OESTE. */
function posicionSolarNOAA(fechaMs, lat, lon) {
  const d = aJuliano(fechaMs) - 2451545.0;          // días desde J2000.0
  const g = (357.529 + 0.98560028 * d) % 360;       // anomalía media (°)
  const q = (280.460 + 0.98564736 * d) % 360;       // longitud media (°)
  const L = q + 1.915 * Math.sin(g * RAD) + 0.020 * Math.sin(2 * g * RAD); // longitud eclíptica (°)
  const e = 23.439 - 0.00000036 * d;                // oblicuidad (°)

  const declinacion = Math.asin(Math.sin(e * RAD) * Math.sin(L * RAD));
  const ascensionRecta = Math.atan2(Math.cos(e * RAD) * Math.sin(L * RAD), Math.cos(L * RAD));

  // Tiempo sidéreo (°) → ángulo horario
  const sidereo = (280.46061837 + 360.98564736629 * d) % 360;
  const H = (sidereo + lon) * RAD - ascensionRecta;

  const latR = lat * RAD;
  const altitude = Math.asin(Math.sin(latR) * Math.sin(declinacion) + Math.cos(latR) * Math.cos(declinacion) * Math.cos(H));
  // Azimut desde el SUR, positivo hacia el OESTE (convención SunCalc):
  const azimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(latR) - Math.tan(declinacion) * Math.cos(latR));

  return { altitude, azimuth };
}

/* ---------------- Protocolo de mensajes ----------------
   La página envía:  { id: <n>, tipo: '<tipo>', payload: {...} }
   El worker devuelve: { id: <n>, ok: true,  resultado: {...} }
                  o bien { id: <n>, ok: false, error: '<texto>' }   */

const MANEJADORES = {
  ping() {
    return 'pong';
  },

  // payload: { fechaMs: number, lat: number, lon: number }
  'posicion-solar'(p) {
    const r = posicionSolarNOAA(p.fechaMs, p.lat, p.lon);
    return {
      altitude: r.altitude,                 // radianes (convención SunCalc)
      azimuth: r.azimuth,                   // radianes desde el SUR
      alturaGrados: r.altitude / RAD,
      azimutGrados: r.azimuth / RAD,
      fuente: 'noaa-sin-dependencias',
    };
  },

  /* TODO Worker 2 — CONOS DE SOMBRA DE ÁRBOLES
     payload previsto: { arboles: [{lat, lon, alturaM, radioCopaM}],
                         fechaMs, latCentro, lonCentro }
     resultado previsto: { type:'FeatureCollection', features:[...] }  */
  'conos-arboles'() {
    throw new Error('conos-arboles aún no implementado: ver TODO Worker 2 en la cabecera');
  },

  /* TODO Worker 3 — TURF PESADO
     payload previsto: { operacion:'buffer'|'union'|..., geojson, opciones } */
  'turf-pesado'() {
    throw new Error('turf-pesado aún no implementado: ver TODO Worker 3 en la cabecera');
  },

  /* TODO Worker 4 — ISLAS DE CALOR / MICROCLIMA
     payload previsto: { puntos:[[lon,lat]...], superficies:[...], tempBase, nubes, fechaMs }
     resultado previsto: { temperaturas:[...] }  */
  'islas-calor'() {
    throw new Error('islas-calor aún no implementado: ver TODO Worker 4 en la cabecera');
  },
};

self.onmessage = function (ev) {
  const msg = ev.data || {};
  const id = msg.id;
  try {
    const manejador = MANEJADORES[msg.tipo];
    if (!manejador) throw new Error('tipo desconocido: ' + String(msg.tipo));
    const resultado = manejador(msg.payload || {});
    self.postMessage({ id, ok: true, resultado });
  } catch (err) {
    self.postMessage({ id, ok: false, error: (err && err.message) ? err.message : String(err) });
  }
};
