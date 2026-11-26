/* ============================================================
   MANOLIT AIRE · sw.js (Service Worker)
   Licencia: AGPL-3.0, igual que el resto del proyecto.
   ------------------------------------------------------------
   Objetivo: que la web cargue rápido y aguante cortes de red en
   el móvil, SIN servicios nuevos ni de pago. Es un archivo
   estático más; funciona igual en Cloudflare Workers/Pages free.

   Política de caché:
   - CACHE-FIRST (primero caché, luego red si falta):
     tiles del mapa, librerías JS de CDN, fuentes y estáticos
     propios (js/css/imágenes). Cambian poco: velocidad máxima.
   - NETWORK-FIRST (primero red; si falla, caché):
     páginas HTML y datos dinámicos (Open-Meteo, Overpass y los
     proxies propios /api /geo /ruta /clima /prevision /arboles). Así los
     datos están frescos cuando hay red y hay respaldo cuando
     no la hay.
   - NUNCA se cachean POST (el chat /manolito) ni otras APIs
     que no sean GET.

   Para publicar una versión nueva de los estáticos basta subir
   el número VERSION de abajo: se borran las cachés viejas.
   - 23-sep-c: about.html rehecho (textos humanizados, lema nuevo sin
     'vende sombra', inglés y georgiano completos, LANGS con en).
   - 23-sep-d: index.html, modo peque con 24 emojis flotantes
   - 23-sep-e: modo salud los sábados (ambiente verde, banner y
     sección defensa de las sombras, automático y reversible).
   - 25-sep-a: el modo salud cubre sábado entero y domingo hasta las
     18:00, y este primer finde arranca ya desde el viernes 25.
     banner sin decir el día para que el estreno de viernes cuadre.
   ============================================================ */
'use strict';

// 2026-09-12-a: botonera fina + botón mini "Act. mapa" con purga de cachés.
// Subir VERSION hace que, al activarse, este SW borre las cachés viejas
// (teselas incluidas) y los clientes reciban el JS/CSS nuevo.
// 2026-09-13-c: las teselas de OpenFreeMap pasan de CACHE-FIRST a
// STALE-WHILE-REVALIDATE. Motivo: con cache-first el estilo JSON cacheado
// apuntaba SIEMPRE al planeta viejo (planet/AAAAMMDD.../) y los edificios
// nuevos de OSM nunca aparecían aunque OpenFreeMap ya los llevaba. Ahora la
// tesela se sirve al instante desde caché (misma velocidad) pero se
// revalida en segundo plano: el mapa se auto-actualiza solo.
// 2026-09-14-a: (1) descamuflaje: el árbol plano duplicado pegado a un
// naranjo/albizia 3D ya no se pinta (adiós al "cubo verde" y al flash
// negro al hacer zoom); (2) el naranjo 3D da naranjas MADURAS también en
// brille de más de cerca. Cambian arboles-3d.js y shadows-route.js.
// 2026-09-14-b: SEO de sostenibilidad en index.html (huella hídrica por
// visita ~1-4 ml, sin publicidad programática; metas, OG, JSON-LD y línea
// visible en el footer). Solo cambia index.html.
// 2026-09-14-c: IRRADIACIÓN SOLAR GLOBAL REAL (irradiacion-solar.js v4 +
// i18n.js). Antes TODAS las consultas a NASA POWER usaban lat/lon fijos de
// Sevilla: el mismo dato en cualquier parte del mundo. Ahora el punto de
// consulta sigue al centro del mapa y a cada clic, agrupado por la celda
// real de la malla NASA (0.5°), cacheado por celda (memoria + 7 días):
// Sevilla da Sevilla, Tokio da Tokio. Marcador naranja del punto, coords
// en popup y panel, media anual del punto, y timeout de 12 s en red.
// 2026-09-14-d: sección "El agua que no se ve" en manolito-aire-comparativa.html
// (cuentas reales: ~3 ml/visita vs ~375 L/s de la publicidad programática
// mundial, gráfica interactiva por periodos + contador en vivo, sin librerías)
// y banda destacada del mismo dato en index.html antes del footer.
// 2026-09-16-a: datos de agua ACTUALIZADOS con telemetría real de Cloudflare
// (16 ago – 15 sep 2026: 176.444 peticiones, 1,80 GB, 4.819 visitas →
// 0,38 MB y ~2 ml por visita medidos). Cambian index.html (banda, footer,
// SEO: description/keywords/OG/JSON-LD) y manolito-aire-comparativa.html
// (tarjetas con telemetría + franja de estadísticas reales).
// 2026-09-16-b: (1) se eliminan TODOS los guiones largos de los textos de la
// web (marca típica de texto de IA; ahora suena a persona); (2) contador vivo
// en la cabecera del mapa: "Anuncios gastando agua a nivel mundial: N L" con
// la fórmula en pequeño y el número subiendo de color por escalones. Coste:
// una escritura de texto por segundo, sin animaciones; batería ~0.
// Cambian index.html, js/i18n.js (6 idiomas) y textos de varios js.
// 2026-09-16-c: (1) TODOS los contadores de agua comparten el mismo arranque
// (sessionStorage, clave manolito_agua_inicio): el conteo sigue al pasar del
// mapa a la comparativa dentro de la misma pestaña y vuelve a cero al cerrarla.
// (2) La comparativa se abre en la misma pestaña (target _self en los enlaces).
// (3) Nueva sección en la comparativa: "Cuánta agua gasta tu móvil" (guía
// Android/iPhone + calculadora GB x 200 L) e indicador discreto de sesión.
// 2026-09-16-d: cierre del pie en index.html: sello de eficiencia A+
// (Website Carbon Rating, sin metadatos externos) y fila discreta de redes
// sociales (TikTok e Instagram, iconos SVG en línea, sin peso extra).
// Cambian index.html y style.css.
// 2026-09-16-e: la barra superior deja de ser fija (sticky): al bajar por la
// pagina se queda arriba y ya no tapa el mapa ni corta el contenido.
// Cambia style.css.
// 2026-09-16-f: se actualiza la pagina "Por que existe esto" (about.html) con
// cero anuncios por coherencia y llamada a una futura ley), limpio de guiones
// largos, punto y coma y dos puntos en los textos visibles.
// Cambia about.html.
// 2026-09-16-g: toda la navegacion interna se abre en la misma pestana
// (script que anula el target _blank de la etiqueta base en index, about,
// comparativa y las paginas legales). Los enlaces externos siguen abriendo
// pestana nueva con rel noopener.
// Cambian index.html, about.html, manolito-aire-comparativa.html,
// aviso-legal.html, privacidad.html y cookies.html.
// 2026-09-16-h: nueva seccion de preguntas frecuentes (FAQ) al final de
// index.html, antes del pie. Hecha con details/summary, sin JavaScript,
// Cambian index.html y style.css.
// 2026-09-18-c: botonera de camara del mapa (zoom y mirar arriba o abajo
// sin rueda de raton), pitch libre hasta 85 grados, joystick del paseo
// virtual visible tambien en ordenador, y las capas de mapa (Mapa oscuro,
// Mapa IGN, Catastro 3D y las casillas) integradas en el widget de
// posicion solar en vez de flotar encima del mapa.
// Cambian index.html, style.css y js/shadows-route.js.
// 2026-09-18-d: vuelven los controles nativos del mapa (zoom, brujula y
// el boton de pantalla completa, que llevaba tiempo sin verse). La web
// no carga la hoja de estilos de MapLibre para ahorrar en el primer
// pintado y sin ella esos botones se dibujaban debajo del mapa,
// invisibles. Ahora se posicionan y se pintan sus iconos desde la
// hoja propia, sin cargar nada extra. En iPhone el boton usa el modo
// pantalla completa por CSS de siempre.
// Cambian style.css y js/shadows-route.js.
// sale dos veces: se retiran los controles nativos de MapLibre y todo
// el manejo del mapa vive en una unica botonera a la izquierda (zoom,
// mirar arriba o abajo, norte y pantalla completa juntos). El widget
// de posicion solar se ordena en dos piezas claras: el sol con su hora
// y el acceso LiDAR a la izquierda, las capas a la derecha con una
// linea fina de separacion. Y el index traia la etiqueta base pegada
// 7 veces: se queda en una, que es la unica que usa el navegador.
// Cambian index.html, style.css y js/shadows-route.js.
// 2026-09-18-f: la botonera unica del mapa pasa al borde DERECHO y se
// compacta en un mando de dos columnas (+ -, arriba abajo, brujula y
// pantalla completa). La letra N se cambia por una brujula de verdad,
// con la punta naranja al norte, que gira con el mapa y vuelve al
// norte al tocarla. El widget solar queda compacto y centrado, y los
// botones de mapa base en rejilla de tres columnas.
// Cambian style.css y js/shadows-route.js.
// 2026-09-18-g: widget de posicion solar en COLUMNA con el orden
// Renderizado LiDAR, 3 capas del mapa), centrado en movil y en
// ordenador. Botonera del mapa mas pequena en movil (34 px). La
// brujula, ademas de girar con el mapa, al tocarla vuelve al norte
// y nivela la vista (si estabas mirando al cielo, te devuelve al
// mapa plano).
// (historial de versiones en los comentarios de abajo)
// Cambian index.html (carga la CSS oficial de MapLibre, sin ella los
// marcadores DOM no se veian NUNCA), js/shadows-route.js (Manolit ya se
// VE al dar a Mi ubicacion y aguanta GPS lento de movil) y
// js/microclima.js (respaldo directo a Open-Meteo si el worker aun no
// tiene la ruta nueva).
// 2026-10-20-splash-sombra-real: intro nuevo (MAN [logo] LIT∞ con la sombra
// real del logo proyectada en el suelo). Cambia solo index.html; la
// puerta de idiomas y la ciudad en sombra siguen igual.
// 2026-10-20-l: recarga la lógica histórica de árboles y el estado de las
// capas de agua y aparcamiento en el preview local.
// Cambian index.html, js/shadows-route.js, js/fuentes-agua.js,
// js/aparcamientos-viaje.js y sw.js.
// 2026-10-23-a: arreglo del widget de sombra que no se abría al hacer click.
// Se corrigen los pointer-events del marcador #mk y se ajustan los eventos
// de click para que no interfieran con el pointerdown.
// Cambia index.html.
// 2026-10-23-b: FIX CRÍTICO - El SVG tiene pointer-events:none inline que
// bloquea TODOS los eventos. Se sobrescribe con CSS más específico usando
// svg#map #mk para que el marcador vuelva a ser clickeable.
// Cambia index.html.
// 2026-10-23-c: FIX DEFINITIVO - Había OTRO CSS al final del SVG (línea 3638)
// con pointer-events:none!important que sobrescribía todo. Ahora las reglas
// del marcador #mk están en ese mismo bloque CSS para tener máxima prioridad.
// Cambia index.html.
// 2026-10-23-f: EL WIDGET DE SOMBRA NO ABRÍA (ni el marcador, ni las pestañas,
// ni el cierre). El script del widget se cortaba nada más empezar: el SVG se
// llamaba "map" pero rsSolarWidgetBridge devolvía ese mismo id al mapa viejo,
// así que quedaban DOS #map y $("map") cogía el equivocado. Ahora el SVG del
// widget se llama "rsSolarMap" (id único), el script lo busca así, y el puente
// solo devuelve el id clásico si no choca con nadie. Sin tocar la franja de
// colores de las horas de luz ni nada más del widget.
// Cambian index.html, css/style.css y js/shadows-route.js.
// 2026-10-23-g: el aviso de cookies salía siempre en castellano aunque
// eligieras otro idioma en la puerta de entrada. Sus textos no existen en
// i18n.js: ahora están en js/cookie-banner.js en los 6 idiomas de la web y se
// elige por el idioma activo real (puerta inicial, getCurrentLang, guardado y
// atributo lang). Cambia js/cookie-banner.js.
// 2026-10-23-h: EL WIDGET DEL MAPA NO SE VEÍA NI SE ABRÍA. La regla genérica
// `svg{...}` del bloque CSS interno (línea ~3326) pisaba los atributos
// width="390" height="460" del SVG #rsSolarMap: los atributos de presentación
// pierden ante cualquier CSS, así que el widget se quedaba en 0x0 px (invisible
// y sin caja que pulsar). Se devuelve su tamaño con svg#rsSolarMap{width:390px;
// height:460px}; el puente sigue reescalándolo en móvil y pantalla completa.
// Cambia index.html.
// 2026-10-23-i: sello registral al final del pie de index.html (obra
// registrada en Propiedad Intelectual, números de expediente y registro
// copiables, vista compacta en móvil) y retirada la línea de atribución
// «Mapa IGN» del pie, que ya queda cubierta en aviso-legal.html.
// Cambia index.html.
// 2026-10-24-a: capa de transporte público (Transitous) y capa de rutas en
// bici + carriles bici (BRouter, OSRM/FOSSGIS, Overpass). Cambian index.html,
// css/style.css, js/i18n.js, js/transporte-publico.js, js/rutas-bici.js,
// transit-regions.json y worker.js.
// 2026-10-25-a: ARREGLO DE VERDAD de transporte público y carril bici, que
// llevaban días sin funcionar pese a estar "ya subidos":
//   (1) faltaban POR COMPLETO las rutas /transporte-paradas y
//       /transporte-salidas en worker.js: transporte-publico.js las
//       llamaba desde el primer día pero nunca existieron, así que cada
//       petición caía en el 404 de los assets estáticos y la capa jamás
//       pudo mostrar una sola parada. Ahora proxian a la API pública de
//       Transitous (MOTIS), sin clave ni registro.
//   (2) el carril bici ya tenía su arreglo (ruta /carriles-bici propia,
//       separada de /aparcamientos) subido en GitHub, pero como esta
//       VERSION no había cambiado, el Service Worker seguía sirviendo el
//       js/rutas-bici.js VIEJO desde la caché del móvil/navegador: el
//       código bueno nunca llegaba a ejecutarse. Subir VERSION purga esa
//       caché y fuerza la descarga de todo lo nuevo.
//   (3) la tarjeta de parada de transporte público (fondo claro) pasa a
//       usar el mismo lenguaje visual oscuro y semitransparente que el
//       widget de sombra (rgba(8,12,20,.94) + blur), responsive en web
//       y móvil igual que éste.
// 2026-10-27-a: las coordenadas MOTIS pueden llegar como texto con coma
// decimal, la descarga de regiones podía competir con la primera consulta y
// Transitous puede responder GeoJSON además de arrays. Se normalizan respuestas
// GeoJSON/MOTIS y se invalida la caché de scripts del SW.
// Cambian index.html y js/transporte-publico.js.
// 2026-10-28-a: se restaura Transitous como fuente de paradas para conservar
// stopId compatibles con sus horarios; Overpass queda de respaldo. Evita la
// antigua caché de paradas OSM y actualiza los scripts del navegador.
// Cambian worker.js e index.html.
// 2026-10-28-b: se unifica transporte-publico.js en un solo archivo (antes
// estaba dividido en transporte-publico.js + transporte-tarjeta.js +
// transporte-paradas.js). Se restaura la versión funcional completa.
// Cambian js/transporte-publico.js e index.html.
// 2026-10-28-c: la capa de transporte usa exclusivamente paradas OSM vía
// Overpass; invalida la antigua caché Transitous del cliente.
// Cambian worker.js e index.html.
// 2026-10-29-a: mejora tolerancia de Overpass y tamaño de consultas de paradas.
// Cambian worker.js y js/transporte-publico.js.
// 2026-10-29-b: alinea zoom, cobertura en cuadrícula, reintentos y visibilidad
// de transporte público con el patrón de la capa de fuentes de agua.
// Cambian index.html, worker.js y js/transporte-publico.js.
// 2026-10-29-c: invalida copias antiguas de la capa y alinea la URL del script.
// 2026-10-29-d: capa agrega estaciones y limita las consultas Overpass por vista.
// 2026-10-29-g: reconecta y cachea las peticiones de parada por teselas del Worker.
// Cambian index.html, worker.js y js/transporte-publico.js.
// 2026-10-29-h: arreglo de /transporte-paradas en worker.js (variable `datos` sin declarar
// lanzaba ReferenceError y el proxy devolvía siempre []). Cambia worker.js.
// 2026-10-30-a: rutas-bici.js tenia una comilla sin cerrar (SyntaxError) y el SW podia
// seguir sirviendo la copia rota. Cambia js/rutas-bici.js.
// 2026-10-30-b: los JS de transporte y carriles bici ahora se piden primero a la red
// (antes cache-first: aunque se subiera un arreglo, el navegador seguia ejecutando la
// copia vieja guardada con la misma URL ?v=...). Cambia sw.js.
// 2026-10-31-a: la capa de transporte dejó de dibujarse porque los espejos de
// Overpass rechazan las peticiones (HTTP 406 y timeouts) y el cliente dependía
// solo del proxy. El navegador prueba ahora Transitous directo
// (api.transitous.org/api/v1/map/stops, CORS abierto) antes que Overpass, y el
// proxy /transporte-paradas combina Transitous + Overpass en paralelo. Además,
// si el estilo del mapa aún no está listo al activar la capa, se reintenta en
// vez de rendirse. Cambian index.html, worker.js y js/transporte-publico.js.
// 2026-10-31-b: fusión de ambas líneas y corrección en worker.js (MOTIS devuelve
// "stopId", no "id": se descartaban todas las paradas de Transitous). Además se
// retiran las 3 etiquetas <base> duplicadas de index.html.
// 2026-10-31-d: no esperar hasta 15 s a los espejos Overpass caídos si Transitous
// ya tiene paradas; el proxy da prioridad a la respuesta rápida y limita el
// enriquecimiento OSM a 2,5 s. Se invalida la caché para aplicar el arreglo.
// Cambia worker.js.
// 2026-11-01-a: transporte público y carriles bici cargan ya EN PARALELO
// (el Worker, Transitous directo y los espejos Overpass compiten y gana el
// primero con datos, como hace la capa de fuentes de agua). El carril bici
// reintenta solo con espera creciente y avisa en la barra de estado de lo
// que está pasando, y las dos capas ya no se quedan mudas si el estilo del
// mapa aún estaba cargando al activarlas. Cambian js/transporte-publico.js,
// js/rutas-bici.js, js/i18n.js (5 claves nuevas en 7 idiomas) e index.html
// (versiones de los dos scripts).
// 2026-11-01-b: el carril bici ya NO se borra al alejarse ni al moverse a
// otro barrio. Lo pintado permanece (como el resto de capas), las zonas se
// acumulan sin duplicar tramos y solo se pausa la búsqueda cuando estás
// muy lejos, avisando en la barra de estado. Nuevo acabado glass: tubo
// coral translúcido con halo, brillo interior y señales de bici sobre
// pastilla de cristal. Cambian js/rutas-bici.js, js/i18n.js (clave nueva
// bikeLaneZoomIn en 7 idiomas) e index.html (versiones de scripts).
// 2026-11-01-f: las políticas legales se localizan en las siete lenguas
// ofrecidas; se añade georgiano y se invalida la caché de traducciones JS.
// Cambian js/i18n-legal.js, js/i18n.js y las tres páginas legales.
// 2026-11-17-k: capa de LLUVIA (js/lluvia.js, archivo nuevo): mancha de
// precipitación OWM vía /tiles/lluvia (ruta nueva del worker, espejo de
// /tiles/nubes) de lejos y gotas animadas en canvas a zoom ≥13 solo si
// llueve ahora (/clima gana el campo aditivo lluvia_mm_h). Casilla nueva
// rsToggleLluvia apagada por defecto. Además se enganchan la superficie
// continua de aire (js/aire-superficie.js) y la nubosidad unificada del
// microclima de la ronda anterior, que no habían invalidado caché.
// Cambian worker.js, js/lluvia.js, js/aire-superficie.js, js/shadows-route.js,
// js/microclima.js, js/i18n.js (2 claves nuevas en 7 idiomas), css/style.css
// e index.html.
// 2026-11-17-l: CONFORT TÉRMICO UTCI (Fase 1). El coste del Dijkstra de la
// ruta fresca deja de ser solo "fracción de sombra": cada tramo pesa
// tiempo × estrés UTCI (sol/sombra con Tmrt estimada) cuando hay meteo, y
// cae al coste clásico si no la hay (silencioso). Nuevos módulos
// js/utci-confort.js (UTCI polinómico de Bröde et al. 2012, Tmrt estimada,
// viento de Open-Meteo ajustado de 10 m a peatón ×0,6, caché de meteo por
// celda 0,25°) y js/confort-ruta.js (comparativa ruta fresca vs rápida:
// UTCI medio, minutos al sol y diferencia; índice de confianza de los
// datos con alturas reales, especie de árboles, toldos y frescura meteo;
// avisos por umbrales de UTCI para colectivos vulnerables). worker.js
// gana wind_speed_10m y shortwave_radiation en /prevision (aditivo).
// Cambian worker.js, js/shadows-route.js, js/i18n.js (18 claves nuevas en
// 7 idiomas), css/style.css, index.html y los dos js nuevos.
// 2026-11-20-a: (1) SQI también en los ÁRBOLES: las sombras de árboles se
//     tiñen con el color de calidad de sombra (verde/ámbar/naranja/rojo),
//     mismo mecanismo y colores que los edificios. Cambian
//     js/sqi-calidad-sombra.js y js/shadows-route.js.
// (2) Buscador: un solo lugar basta — texto solo en origen (o destino) y
//     «Buscar ruta» lleva el mapa al sitio, sin exigir los dos campos.
//     Cambia js/shadows-route.js.
// 2026-11-20-b: búsqueda de UN solo lugar = solo MIRAR: sin origen no se
//     lanzan resúmenes de bici/coche ni distancias (antes sacaba km/min
//     absurdos desde un punto que el usuario nunca pidió) y se limpian los
//     resúmenes de una búsqueda anterior. El botón dice «Buscar» (antes
//     «Buscar ruta»). Cambian js/shadows-route.js, js/i18n.js e index.html.
// 2026-11-20-c: RESALTE DEL LUGAR BUSCADO (como Google). Al buscar una
//     ciudad, provincia, barrio o calle con «Buscar» y sin origen, se pide a
//     Nominatim el polígono del área (polygon_geojson=1) y se dibuja
//     delimitada: relleno azul suave + borde sólido (capa-lugar-buscado y
//     capa-lugar-buscado-borde), con la cámara encuadrada al área entera en
//     vez de a un punto. Si el resultado es una dirección puntual sin
//     polígono, no se pinta nada y se hace el vuelo de siempre.
//     Funciona en los tres modos (caminar/bici/coche) y se limpia al
//     calcular una ruta. Verificado: capas, colores, encuadre de polígono,
//     calle (LineString) y provincia (MultiPolygon), limpieza y casos sin
//     geometría. Además se corrige una coma doble de sintaxis en
//     js/i18n-legal.js (met_glop) que rompía ese archivo completo.
//     Cambian js/shadows-route.js, js/i18n-legal.js e index.html.
// 2026-11-20-d: EL CHAT YA SABE DE CALIDAD DE SOMBRA (SQI). El prompt del
//     servidor (SYSTEM_PROMPT_AIRE en worker.js) solo describía «sombras y
//     mapa» en general: el detalle del SQI que el cliente enviaba
//     (js/chat.js) se descartaba, así que el chat de producción no conocía
//     la escala verde/ámbar/naranja/rojo, ni AOD/PM2.5/DHI, ni Köppen.
//     Ahora el prompt del Worker incluye una sección 2b completa del SQI,
//     una entrada en la especialidad catedrática y las funciones nuevas
//     (búsqueda de un solo lugar con área delimitada en azul, árboles 3D
//     con fenología). Verificado importando el Worker: HTTP 200 y el
//     sistema recibido por el modelo contiene todo el contenido del SQI.
//     Cambian worker.js y sw.js.
// 2026-11-20-e: REINICIAR BORRA TAMBIÉN EL ÁREA DEL LUGAR BUSCADO. Al pulsar
//     «Reiniciar» el resalte azul de ciudad/barrio/calle (capa
//     capa-lugar-buscado) se quedaba pintado en el mapa. Ahora
//     reiniciarTodo() limpia la fuente 'lugar-buscado' mediante el puente
//     manolitAireMarcarLugarBuscado(null), con optional chaining para que
//     un puente ausente nunca rompa el reinicio. Verificado: marcado=1,
//     tras reiniciar=0, doble reinicio=0 sin errores, y se puede volver a
//     marcar (sigue en 1).
//     Cambian js/shadows-route.js y sw.js.
// 2026-11-21-a: ARBOLADO MÁS COHERENTE Y PALMERAS REALES.
// (1) Palmeras EZ rehechas: generador propio (NO el port fractal de ez-tree
//     que las dibujaba como "árbol con hojas en la punta"). Fuste con base
//     abultada + anillos + corona de frondes en arco continuo, verde todo el
//     año, dátiles en la datilera. 4 especies bien diferenciadas.
// (2) 4 géneros más del parque de María Luisa con modelo EZ propio (antes
//     caían en 'generico' sin copa 3D): ailanto, lagunaria, taxodio, tejo.
// (3) Clasificador: orden de palmáceas corregido — Phoenix dactylifera ya no
//     cae en 'palmera' genérica y "Pinus canariensis" vuelve a ser PINO (lo
//     se lo robaba la keyword 'canariensis' de la palmera canaria).
// (4) Madera por especie en el motor EZ (palmeras con su pardo-gris de fuste).
// Cambian js/arboles-ez-3d.js, js/shadows-route.js, index.html (?v=) y sw.js
// (purga de caché).
// 2026-11-21-b: FIX DE ALTURA EN PALMERAS + PURGA DE CACHÉ DEL SW.
// (1) El fix de palmeras anteriores (2026-11-21-a) y este NO llegaban al
//     navegador: arboles-ez-3d.js es cache-first en el SW y la VERSION no
//     había cambiado, así que seguía sirviéndose la copia vieja. Subir
//     VERSION borra las cachés viejas y fuerza la descarga del módulo nuevo.
// (2) PALMERAS: las 147 con altura 1-5 m del inventario (y 26 sin dato)
//     salían todas enanas e iguales por el suelo de 6 m de
//     estimarDimensionesArbol. Ahora, si la altura no es verosímil (<6 m),
//     manda el porte adulto de la ESPECIE (datilera 12 m, canaria 13 m,
//     washingtonia 14 m); los datos fiables (>=6 m) siguen mandando.
// Cambian js/shadows-route.js, js/arboles-ez-3d.js, index.html (?v=) y sw.js.
// 2026-11-21-e: (1) PALMERAS VISIBLES. La corona plana se pinta SIEMPRE para
// forma palmera (un solo feature, el de la foto, a ras de frondes). La rama
// que la condicionaba a estar cerca del 3D dejaba las palmeras sin copa y
// pareciar desaparecer.
// (2) NARANJO Y ALBIZIA SIN COPAS PLANAS ENCIMA ("árboles con
// hojas" en las esquinas de los naranjos). Junto a un naranjo/albizia 3D, el
// motor plano pinta TRES cosas para el mismo ejemplar: el TRONCO (solo, bien)
// y las DOS copas planas de siempre (dos poligonos apilados de baseM 3,0 y
// 5,2 m). Las copas planas tapaban por arriba la malla real desde el suelo y
// hacían que el naranjo pareciera un árbol de hojas planas. Ahora, junto a
// ellos, solo va el tronco. Nada cambia para albizia/naranjo ni en ningun
// otro caso (sin 3D, lejos o naranjo de invierno siguen igual).
// Cambia js/shadows-route.js.
// 2026-11-21-c: DOS CORONAS EN LA PALMERA (la causa de "árboles con hojas").
// (1) Con el motor EZ 3D activo, la palmera pintaba ADEMÁS la copa plana de
//     siempre, y con DOS pisos (uno de 0,15 y otro de 0,05 de la altura por
//     encima): una columna de hasta 4,7 m de follaje plano encima de su
//     fuste, de ahí que parecieran árboles. Ahora, junto al 3D, hay UN solo
//     feature de corona (el de la foto, a ras de frondes). Sin EZ, etc.
// (2) 2 árboles más del parque con modelo EZ propio: firmiana (árbol de las
//     pagodas, 1.085) y ficus_alto (microcarpa/benjamina/elastica, 602).
// (3) Altura de palmeras: si la del inventario no es verosímil (<6 m), manda
//     el porte de la especie (datilera 12, canaria 13, washingtonia 14 m).
// Cambian js/shadows-route.js, js/arboles-ez-3d.js, index.html (?v=) y sw.js.
// 2026-11-21-f: (1) SEVILLA SIN ÁRBOLES OSM GENÉRICOS: con el inventario
//     oficial completo, los nodos de OSM sin species/genus/nombre ya no se
//     dibujan dentro del bbox de Sevilla (fuera, sin cambios). Cambia
//     js/shadows-route.js. (2) PINO EZ REHECHO: silueta cónica con ramas de
//     verticilo casi horizontales desde abajo, acículas finas/oscuras y
//     corteza parda. Cambia js/arboles-ez-3d.js. Ambos con ?v= en index.html.
// 2026-11-24-a: NARANJO/ALBIZIA RESTAURADOS y 3 especies más.
// (1) El motor propio de naranjo/albizia (js/arboles-3d.js) vuelve a SU
//     selección original (en vista, cercanía al centro, tope 40): nada de
//     EZ ni filtros nuevos, como se pidió.
// (2) El motor plano (js/shadows-route.js) devuelve su guardia original:
//     naranjo/albizia NUNCA se saltan el descamuflaje y pintan SIEMPRE sus
//     copas planas como antes de los EZ (sin mallaTieneEsteEjemplar).
// (3) 3 géneros más con preset EZ propio y keywords: koelreuteria (2.559,
//     antes colada como sophora), tamarix (538) y paulownia (127).
// Cambian js/arboles-3d.js, js/shadows-route.js, js/arboles-ez-3d.js e
// index.html (?v=). NO se toca la malla del naranjo ni la de la albizia.
// 2026-11-24-b: PINO CONÍFERA REAL (como la captura). Tronco esbelto
//     desnudo hasta media altura, verticilos de ramas horizontales (82°)
//     con penacho denso de acículas finas por rama (52 x 1.05, verde
//     oscuro) que se acortan hacia la cima: pisos cónicos de pino real.
//     Solo cambia js/arboles-ez-3d.js e index.html (?v=).
// 2026-11-25-d: PINO PIÑONERO DEFINITIVO (construirPinoReal). El pino
//     sale del generador fractal (que daba el "castillo de discos" con
//     tronco pelado y palas anchas) y pasa a silueta propia: líder recto,
//     copa CÓNICA CONTINUA de 11 verticilos solapados desde el 32 % de la
//     altura (sin huecos entre pisos) y acículas finas triangulares (17
//     por penacho, ancho 0.028) pegadas a cada rama, con tope de 520
//     penachos por árbol repartidos con cuenta EXACTA por bisección (la
//     proporción por longitud dejaba la punta pelada por encima de 9 m).
//     Verde propio de conífera (0x355638) en vez del verde de hoja ancha.
//     Solo cambia js/arboles-ez-3d.js: el resto de especies EZ, el
//     naranjo y la albizia quedan exactamente igual.
// 2026-11-26-a: INDICACIONES CON LADO DE LA SOMBRA + MICROCLIMA SUAVE.
// (1) Las indicaciones de ruta dicen por qué LADO de la calle va la sombra
//     ("La sombra va por tu lado izquierdo/derecho", "Hay sombra en los dos
//     lados") y, en tramos largos al sol, si el sol te da de cara o de
//     espaldas. Se muestrea cada acera a ~7 m del eje con el mismo índice
//     espacial de siempre. Cambian js/shadows-route.js y js/i18n.js.
// (2) Microclima del suelo DIFUMINADO: de círculos duros (lunar de puntos)
//     a lienzo en miniatura escalado con bilineal: mapa de calor continuo.
//     Botón "i" de la leyenda con objetivo táctil de 26 px (en móvil no se
//     podía abrir la nota). Cambia js/microclima.js.
// (3) Con microclima activo, la temperatura (aire + rango de suelo) se
//     muestra en un chip dentro del widget de sombra SQI, junto al
//     glosario; el glosario re-ancla la tarjeta al abrirse (en móvil el
//     contenido se salía de pantalla). Cambian js/sqi-calidad-sombra.js y
//     css/sqi.css.
// 2026-11-26-feria: se restaura el aviso de la feria de Mairena (splash,
//     intro SEO y sección "Manolit∞ sale a la calle") que se había perdido
//     al sobrescribir index.html en 003dcbc. Solo cambia index.html.
// 2026-11-26-arboles: mejora general de los árboles EZ (menos palmeras,
//     albizia y naranjo, que se quedan como están): corteza con sombreado
//     suave (el tronco ya no sale facetado "redondo redondo" con anillos
//     de luz absurdos) y copa en racimo: cada hoja es ahora 2 planos
//     pequeños cruzados y desplazados en vez de una pala plana gigante.
//     Cambian js/arboles-ez-3d.js e index.html (?v=).
// 2026-11-26-widget: FALLO DE MUERTE corregido. Al calcular una ruta, las
//     tarjetas (resumen, encuesta CO2, UTCI) empujan el mapa hacia abajo
//     pero el widget solar y la tarjeta SQI (rsSqiMini) se quedaban en sus
//     coordenadas viejas, flotando FUERA del mapa sobre el fondo oscuro.
//     El puente rsSolarWidgetBridge (index.html) ahora observa el tamaño
//     del body con ResizeObserver y re-ancla el widget siempre. Solo
//     cambia index.html.
const VERSION = '2026-11-26-widget-anclado-al-mapa';
// 2026-11-19-h: ÁRBOLES EZ COMPLETOS Y BIEN DIBUJADOS.
// (1) Mapa lleno: tope por vista 30 -> 200 y fuera el filtro de separación
//     entre copas (solo se descartan nodos a <1,2 m, o sea duplicados).
// (2) La consulta de OSM pide las 4 esquinas reales del lienzo + 30 % de
//     colchón: con el mapa inclinado el borde de arriba ya no queda vacío.
// (3) 5 especies más con preset EZ propio sacado del repo dgreenheck/ez-tree
//     (ash_medium, oak_medium, oak_bushy, pine_medium, aspen_small):
//     lagerstroemia, bauhinia, grevillea, algarrobo y laurel, más keywords
//     nuevas en TIPOS_ARBOL para que no caigan en 'generico'.
// (4) Copas legibles desde arriba: emissive de hoja 0.24 -> 0.55 y
//     AmbientLight 0.35 en la escena EZ (antes salían casi negras en picado).
// Cambian js/arboles-ez-3d.js, js/shadows-route.js, index.html y sw.js.
// 2026-11-19-g: Corrección de vista previa en redes sociales (WhatsApp, Telegram,
// Twitter/X, iMessage): sustitución de compartir.png (1080x1920 vertical, 671 KB,
// rechazada por exceder los límites de WhatsApp y relación de aspecto) por
// og-image.png (1200x630 horizontal 1.91:1 estándar, 52 KB con logo de Manolit∞,
// edificios 3D y sol). Se añaden metadatos completos og:image:secure_url,
// og:image:width, og:image:height, og:image:type, itemprop="image" y twitter:image
// en index.html y todas las páginas del sitio.
// 2026-11-19-f: (1) ¡NUNCA MÁS ÁRBOLES ARQUEADOS!: gnarliness/twist/force a
// cero en TODOS los presets EZ (troncos y ramas rectos, copa arriba).
// (2) Palmera EZ nueva (palmera/datilera/washingtonia): tronco recto único
// y corona de 26 hojas radiales en la punta; 12 m normalizados. Abunda en
// Sevilla y en toda ciudad cálida de OSM.
// Cambian js/arboles-ez-3d.js, js/shadows-route.js y sw.js.
// 2026-11-19-e: FIX DEFINITIVO de gigantes: cada modelo EZ se NORMALIZA a su
// altura de referencia (EZ_ALTURAS) al construirlo; antes el suelo 0.4 del
// clamp de escala OBLIGABA a inflar los presets altos del repo (oak_large ~95
// unidades) y salían árboles de 20-30 m en la Plaza de España. Ahora la
// escala en vivo es ~1.0 y el tamaño lo manda el dato real (altura medida).
// Cambian js/arboles-ez-3d.js y sw.js.
// 2026-11-19-d: FIX de gigantes e inclinaciones EZ: presets _large con hojas
// que nacen a media rama (leafStart 0.4+) y de tamaño normal (2.0-2.2 en vez
// de 4.5), fuerza lateral reducida (force 0.02->0.008) y escala del motor
// acotada a 1.15x hacia arriba con altura deseada techo por especie. Adiós
// torres y árboles arqueados de María Luisa. Cambian js/arboles-ez-3d.js y sw.js.
// 2026-11-19-c: parque de María Luisa: 6 especies EZ más (gleditsia,
// ligustro, cercis, magnolia, catalpa, casuarina), reutilizando presets del
// repo (cero peso). FIX del gigantismo: tope de escala del motor EZ de 2.5x
// a 1.8x y capar alturas imposibles del inventario (810 m...) a 40 m.
// Cambian js/shadows-route.js, js/arboles-ez-3d.js y sw.js (purga de caché).
// 2026-11-19-b: 10 especies EZ completas (círculo cerrado): se suman almez,
// brachychiton, robinia, fresno, ciprés y sophora/acacia de Japón a los
// presets existentes. Keywords nuevas en TIPOS_ARBOL (shadows-route.js) para
// que la clasificación funcione GLOBAL con cualquier árbol de OSM etiquetado
// (Madrid, Tokio, donde sea), no solo con el inventario de Sevilla.
// Arreglos: 'ciprés/cypress/cupressus' quitadas de 'pino' (iban antes y el
// ciprés nunca llegaba a su entrada) y forma columnar_estrecha (no existía
// en ninguna tabla) pasa a conica, ya soportada en todo el pipeline.
// Cambian js/shadows-route.js, js/arboles-ez-3d.js y sw.js (purga de caché).
// 2026-11-19-a: árboles visibles sin copias OSM ni copas planas duplicadas;
// separación del 3D conforme al tamaño de copa y carga versionada de módulos.
// Cambian index.html, js/shadows-route.js, js/arboles-3d.js y js/arboles-ez-3d.js.
// 2026-11-18-a: se corrige el render 3D EZ de Sevilla: se actualizarán todas
// las mallas de hojas de cada variante, evitando la excepción al acercar el mapa.
// Cambia js/arboles-ez-3d.js.
// 2026-11-17-n: árboles 3D procedurales estilo ez-tree (MIT) para coníferas
// y frondosas, en MÓDULO SEPARADO js/arboles-ez-3d.js. La albizia y el
// naranjo (js/arboles-3d.js) quedan INTACTOS, byte a byte. Cambian index.html
// (carga del módulo), js/shadows-route.js (hook nuevo manolitAireArbolesEZ)
// y se añade js/arboles-ez-3d.js.
// 2026-11-17-f: el coeficiente K de amortiguación del factor LUR del SQI
// deja de ser el 0.5 fijo y pasa a depender de la zona Köppen-Geiger del
// punto (Beck et al. 2018, rejilla local data/koppen-rejilla.json,
// cache-first). Cambian js/sqi-calidad-sombra.js y sw.js.
// 2026-10-31-c: festejos decorados. Halloween dura del 31 oct al 1 nov 23:59
// y Navidad del 10 dic al 15 ene (el 31 dic anuncia el cambio de año). js/
// ambientes.js crea la capa de adornos (SVG en línea, animaciones de bajo
// consumo, estáticas con prefers-reduced-motion) y css/ambientes.css la
// dibuja. Además ?ambiente=halloween|navidad|anonuevo fuerza un tema para
// verlo en cualquier fecha y ?ambiente=off lo apaga. También se regenera
// compartir.png (0 bytes: era la og:image rota de Bing/tarjetas sociales) y
// se retiran 3 <base> duplicadas del <head> de index.html.
// Cambian index.html, css/ambientes.css, js/ambientes.js y compartir.png.
const CACHE_ESTATICA = 'manolito-estatica-' + VERSION;
const CACHE_DINAMICA = 'manolito-dinamica-' + VERSION;
const MAX_ENTRADAS_ESTATICAS = 600; // tiles incluidos; tope de seguridad

/* Hosts de contenido casi inmutable: librerías y fuentes */
const HOSTS_ESTATICOS = [
	'cdn.jsdelivr.net',
	'unpkg.com',
	'fonts.googleapis.com',
	'fonts.gstatic.com',
];

/* Hosts con STALE-WHILE-REVALIDATE: rápidos Y auto-actualizados */
const HOSTS_REVALIDABLES = [
	'tiles.openfreemap.org',
];

/* Rutas propias con datos dinámicos (proxies del worker) */
const RUTAS_DINAMICAS = ['/api/', '/geo', '/ruta', '/clima', '/prevision', '/arboles', '/aparcamientos', '/carriles-bici', '/transporte-paradas', '/transporte-salidas', '/manolito'];

/* Hosts de datos dinámicos externos */
const HOSTS_DINAMICOS = [
	'api.open-meteo.com',
	'overpass-api.de',
	'lz4.overpass-api.de',
	'overpass.kumi.systems',
];

/* Respuestas geográficas de fuentes: uso en memoria de la página, sin caché
   Cache API persistente. Las llamadas POST ya quedan fuera de este handler. */
const HOSTS_SOLO_MEMORIA = [
	'geoportal.valencia.es',
	'datosabiertos.malaga.eu',
];

/* ---------------- install / activate ---------------- */
self.addEventListener('install', function(ev) {
	// Activar cuanto antes; no precacheamos nada para no fallar
	// nunca la instalación por un recurso concreto.
	self.skipWaiting();
});

self.addEventListener('activate', function(ev) {
	ev.waitUntil(
		caches.keys()
		.then(function(claves) {
			return Promise.all(
				claves
				.filter(function(c) {
					return c.indexOf('manolito-') === 0 && c.indexOf(VERSION) === -1;
				})
				.map(function(c) {
					return caches.delete(c);
				})
			);
		})
		.then(function() {
			return self.clients.claim();
		})
	);
});

/* ---------------- utilidades ---------------- */
function esEstatico(url) {
	if (HOSTS_ESTATICOS.indexOf(url.hostname) !== -1) return true;
	if (url.origin === self.location.origin) {
		// La rejilla Köppen es un dato estático versionado: cache-first para
		// que la consulta por punto nunca dependa de red tras el arranque.
		if (url.pathname === '/data/koppen-rejilla.json') return true;
		return /\.(js|css|png|jpe?g|svg|ico|webp|woff2?|ttf|webmanifest|geojson)(\?.*)?$/i.test(url.pathname);
	}
	return false;
}

function esDinamico(url) {
	if (HOSTS_DINAMICOS.indexOf(url.hostname) !== -1) return true;
	if (url.origin === self.location.origin) {
		return RUTAS_DINAMICAS.some(function(r) {
			return url.pathname.indexOf(r) === 0;
		});
	}
	return false;
}

function recortarCache(nombreCache, maximo) {
	// Borra las entradas más antiguas si nos pasamos del tope.
	return caches.open(nombreCache).then(function(cache) {
		return cache.keys().then(function(claves) {
			if (claves.length <= maximo) return;
			const sobrantes = claves.length - maximo;
			return Promise.all(claves.slice(0, sobrantes).map(function(k) {
				return cache.delete(k);
			}));
		});
	}).catch(function() {
		/* recortar es opcional */ });
}

function cacheFirst(peticion) {
	return caches.match(peticion).then(function(guardada) {
		if (guardada) return guardada;
		return fetch(peticion).then(function(respuesta) {
			// Solo guardamos respuestas válidas (u opacas de CDNs de tiles)
			if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
				const copia = respuesta.clone();
				caches.open(CACHE_ESTATICA).then(function(cache) {
						cache.put(peticion, copia);
					})
					.then(function() {
						recortarCache(CACHE_ESTATICA, MAX_ENTRADAS_ESTATICAS);
					})
					.catch(function() {
						/* caché llena o no disponible */ });
			}
			return respuesta;
		});
	});
}

/* Ventana anti-revalidado (nov-2026, ahorro de batería): cada tesela única
   se revalida en segundo plano como mucho 1 vez cada 10 minutos. Antes,
   CADA petición de una tesela ya cacheada (volver a panear por la misma
   zona, zoom in/out, recentrar) disparaba SIEMPRE una descarga en segundo
   plano: la radio del móvil no descansa y eso gasta batería y calienta.
   Con esta ventana la frescura se mantiene (la tesela que se sigue viendo
   acaba revalidándose en ≤10 min, el planeta nuevo sigue entrando solo)
   pero el número de peticiones de fondo cae en órdenes de magnitud. */
const REVALIDACION_MINIMA_MS = 10 * 60 * 1000;
const TOPE_REVALIDACIONES = 3000;
const ultimaRevalidacion = new Map(); // url -> timestamp (memoria del SW)

function marcarRevalidacion(clave, ahora) {
	if (ultimaRevalidacion.size >= TOPE_REVALIDACIONES) {
		// Map itera en orden de inserción: la primera es la más vieja.
		ultimaRevalidacion.delete(ultimaRevalidacion.keys().next().value);
	}
	ultimaRevalidacion.set(clave, ahora);
}

// Sirve la copia cacheada al instante (si existe) y pide a red en
// segundo plano para refrescarla, SALVO si esa tesela ya se revalidó hace
// menos de REVALIDACION_MINIMA_MS: velocidad de cache-first sin congelar
// el contenido y sin ahogar la radio del móvil.
function staleWhileRevalidate(peticion) {
	return caches.open(CACHE_ESTATICA).then(function(cache) {
		return cache.match(peticion).then(function(guardada) {
			const clave = peticion.url;
			const ahora = Date.now();
			const ultima = ultimaRevalidacion.get(clave) || 0;
			if (guardada && (ahora - ultima) < REVALIDACION_MINIMA_MS) {
				// Copia reciente (primera descarga o revalidación reciente):
				// se sirve tal cual, cero red de fondo.
				return guardada;
			}
			marcarRevalidacion(clave, ahora);
			const promesaRed = fetch(peticion).then(function(respuesta) {
				if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
					cache.put(peticion, respuesta.clone())
						.then(function() {
							recortarCache(CACHE_ESTATICA, MAX_ENTRADAS_ESTATICAS);
						})
						.catch(function() {
							/* caché llena o no disponible */ });
				}
				return respuesta;
			}).catch(function() {
				return guardada || Response.error();
			});
			return guardada || promesaRed;
		});
	});
}

function networkFirst(peticion) {
	return fetch(peticion).then(function(respuesta) {
		if (respuesta && respuesta.ok) {
			const copia = respuesta.clone();
			caches.open(CACHE_DINAMICA).then(function(cache) {
					cache.put(peticion, copia);
				})
				.catch(function() {
					/* sin caché */ });
		}
		return respuesta;
	}).catch(function() {
		return caches.match(peticion).then(function(guardada) {
			// Si no hay red ni caché, devolvemos error de red estándar.
			return guardada || Response.error();
		});
	});
}

/* ---------------- fetch ---------------- */
self.addEventListener('fetch', function(ev) {
	const peticion = ev.request;

	// Solo GET: el chat (/manolito) y cualquier POST van directos a red.
	if (peticion.method !== 'GET') return;

	let url;
	try {
		url = new URL(peticion.url);
	} catch (e) {
		return;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
	if (HOSTS_SOLO_MEMORIA.indexOf(url.hostname) !== -1) return;

	// Navegaciones (entrar a la web): frescura primero.
	if (peticion.mode === 'navigate') {
		ev.respondWith(networkFirst(peticion));
		return;
	}

	if (esDinamico(url)) {
		ev.respondWith(networkFirst(peticion));
		return;
	}

	// Capas en desarrollo activo: red primero para que un arreglo llegue al
	// momento (con caché como respaldo sin conexión).
	if (url.origin === self.location.origin &&
		/\/js\/(transporte-publico|rutas-bici|fuentes-agua)\.js$/i.test(url.pathname)) {
		ev.respondWith(networkFirst(peticion));
		return;
	}

	// Teselas del mapa: al instante desde caché + revalidación en segundo
	// plano (que los edificios nuevos de OSM lleguen sin tocar nada).
	if (HOSTS_REVALIDABLES.indexOf(url.hostname) !== -1) {
		ev.respondWith(staleWhileRevalidate(peticion));
		return;
	}

	if (esEstatico(url)) {
		ev.respondWith(cacheFirst(peticion));
		return;
	}

	// Resto (mayoría same-origin): network-first suave con respaldo.
	ev.respondWith(networkFirst(peticion));
});