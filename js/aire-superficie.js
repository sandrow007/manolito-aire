/* ==========================================================================
   SUPERFICIE CONTINUA DE CALIDAD DEL AIRE (España) — módulo aditivo
   --------------------------------------------------------------------------
   La capa clásica (capa-aire-es, en js/shadows-route.js) dibuja círculos
   sueltos sobre celdas de 0,5°: a zoom de calle se ve "a puntos". Este
   módulo añade DEBAJO de esos círculos una superficie interpolada entre
   las mismas celdas (capa tipo heatmap de MapLibre: la interpolación la
   hace la GPU, sin trabajo por píxel en el hilo principal, sin descargas
   nuevas y sin cachés nuevas: lee la MISMA fuente GeoJSON 'aire-es' que
   ya rellena y limpia shadows-route.js).

   Reglas heredadas, sin duplicar lógica:
   - Misma paleta verde/ámbar/rojo con los mismos cortes de PM2.5
     (≤12 bueno, ≤35 medio, >35 malo).
   - Misma regla "solo España": la fuente solo contiene celdas españolas,
     y shadows-route.js apaga esta capa a la vez que la de puntos.
   - Mismo popup: los círculos siguen encima y recibiendo los clics.

   Integración: window.manolitAireSuperficie = { instalar(map, cfg), vis(v) }
   Su ausencia o su fallo nunca rompe la capa de puntos.
   ========================================================================== */
(function () {
  'use strict';
  if (window.manolitAireSuperficie) return;

  var CAPA_ID = 'capa-aire-es-superficie';
  var mapa = null;
  var listo = false;

  function instalar(map, cfg) {
    if (listo || !map || !cfg || !cfg.fuenteId) return;
    try {
      if (!map.getSource(cfg.fuenteId) || map.getLayer(CAPA_ID)) return;
      // Peso 0..1 desde PM2.5 con los mismos cortes que los círculos:
      // 12 µg/m³ -> 0,3 (verde) y 35 µg/m³ -> 0,75 (rojo); el ámbar vive
      // en la rampa entre ambos. La densidad del heatmap en cada píxel es
      // la media ponderada de las celdas cercanas: interpolación suave.
      map.addLayer({
        id: CAPA_ID,
        type: 'heatmap',
        source: cfg.fuenteId,
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['coalesce', ['get', 'pm25'], 0],
            0, 0.05, 12, 0.3, 35, 0.75, 60, 1],
          'heatmap-intensity': 1,
          // Radio en píxeles por zoom: suaviza la celda de 0,5° sin
          // disparar el coste de GPU en móvil (acotado a ~520 px).
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'],
            5, 10, 9, 45, 11, 110, 13, 260, 15, 520],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,185,138,0)',
            0.12, 'rgba(0,185,138,0.50)',
            0.3, 'rgba(0,185,138,0.55)',
            0.5, 'rgba(255,184,0,0.55)',
            0.72, 'rgba(230,62,95,0.55)',
            1, 'rgba(230,62,95,0.65)'],
          'heatmap-opacity': 0.6
        }
      }, cfg.capaId); // debajo de los círculos: ellos mandan en el clic
      mapa = map;
      listo = true;
      // Nace con la visibilidad que toque según la casilla del panel;
      // así una instalación tardía tampoco deja la capa desincronizada.
      var toggle = document.getElementById('rsToggleAire');
      vis(toggle && toggle.checked ? 'visible' : 'none');
    } catch (e) { /* la capa de puntos sigue funcionando sola */ }
  }

  function vis(v) {
    try {
      if (mapa && mapa.getLayer(CAPA_ID)) mapa.setLayoutProperty(CAPA_ID, 'visibility', v);
    } catch (e) { /* estilo a medio cargar: se reintentará al reinstalar */ }
  }

  window.manolitAireSuperficie = { instalar: instalar, vis: vis };
})();
