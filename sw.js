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
     (lista ampliada por Sandro, unicornio y flamenca incluidos).
   - 23-sep-e: modo salud los sábados (ambiente verde, banner y
     sección defensa de las sombras, automático y reversible).
   - 25-sep-a: el modo salud cubre sábado entero y domingo hasta las
     18:00, y este primer finde arranca ya desde el viernes 25.
   - 25-sep-b: textos del modo salud con voz de Sandro (Hércules),
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
// verano (orden de Sandro); (3) emisivo del naranjo ajustado para que no
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
// el nuevo texto de Sandro (huella hidrica digital, publicidad programatica,
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
// con el tono de Sandro y sin marcas tipicas de texto de IA.
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
// 2026-09-18-e: orden visual del mapa (orden de Sandro). El zoom ya no
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
// logico que pide Sandro (1 planetario con su hora, 2 boton de
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
const VERSION = '2026-10-07-e' // -e 07-oct (quinta orden de Sandro, pendiente de su visto bueno y el de Jop antes de publicar): certificado, capa oscura y juego ciudadano. (1) El diploma pasa a llamarse «Certificado de Protección Climática», con tono serio, mensajes nuevos para peque y ciudadano (con y sin nombre), serie MANOLIT∞-AAAA-XXXX-XXXX con crypto.getRandomValues y alfabeto sin caracteres confundibles, fondo de isolíneas tenues, nombre con auto-ajuste de tamaño y pie legal claro en los 6 idiomas. (2) El glifo del sello de sombra vuelve a ser el ORIGINAL recuperado del diploma que Sandro ha subido (diploma-manolit.svg), copiado carácter a carácter: la forma blanca con contorno teal #007A87 sobre su sombra gris proyectada. (3) El sello final de Simulador de Sombras sale del certificado por orden expresa: no se dibuja, no se nombra y no queda nada suyo en el módulo; solo se dibujan los sellos de protección conseguidos y el número del texto sale del mismo dato. (4) La capa oscura del mapa recupera botón propio: el control segmentado de mapa base pasa a tres segmentos [Mapa claro | Mapa IGN | Mapa oscuro], sin quitar nada de lo que había; el oscuro enciende el filtro invertido sobre la base vectorial y apaga el WMS del IGN, y claro e IGN lo apagan al elegirse, como antes. (5) Verificado en espejo local con la estructura real del repositorio que el juego de ciudadano abre su panel con corpus adulto en escritorio y móvil (quien no lo vea es que aún no ha subido los archivos nuevos: hacen falta index.html, style.css, app.js, i18n.js, juego-manolito.js y certificado-manolito.js juntos, y sw.js el último). // -d 07-oct (cuarta orden de Sandro, pendiente de su visto bueno y el de Jop antes de publicar): rediseño del panel lateral de capas. (1) Jerarquía por prioridad visual: los grupos quedan 1) Iluminación y sol, 2) Entorno y clima, 3) Base e infraestructura. (2) Fuera la caja contenedora de «Capas de mapa» y su flecha de acordeón (el botón maestro ya no se crea): los mapas base son ahora un control segmentado plano de dos botones [Mapa claro | Mapa IGN], activo en naranja e inactivo en gris, con cambio de capa inmediato; el filtro de mapa oscuro sigue en el código pero se queda sin botón propio (elegir cualquiera de los dos segmentos lo apaga). (3) Catastro 3D sale de los mapas base y pasa a fila-toggle individual con interruptor a la derecha, como el resto de controles. (4) «Irradiación solar» se renombra a «Intensidad solar» en los 6 idiomas (botón de capa y respuesta rápida del chat). (5) Microclima: verificado que su toggle SÍ es interactivo (enciende y apaga la capa en microclima.js), así que se queda con su etiqueta «Estimado» solo informativa. (6) Scrollbar del panel nueva: 5px, semitransparente, sin flechas ni botones, se aclara al pasar el ratón, integrada con el fondo oscuro. (7) Z-index, dos frentes medidos: los marcadores del mapa (el Manolit que camina llevaba 999 en línea) quedan siempre por debajo del panel y de los controles fijos, y en móvil el botón flotante del chat (el muñeco de Manolit con la burbuja «¡Pregúntame!», que caía justo encima del segmentado, pillado con elementFromPoint en las pruebas) se retira con transición suave mientras la hoja de capas está abierta y vuelve al cerrarla; en escritorio nunca coinciden y sigue siempre visible. // -c 07-oct (tercera orden de Sandro, pendiente de su visto bueno y el de Jop antes de publicar): rediseño visual del modo niños. (1) Jerarquía vertical limpia en el hero peque: selector de ciudad, nube sola en su caja (ya no se desborda los 200px ni tapa el selector), titular en tarjeta amplia en flujo normal (fuera de los 200px del orb-wrap, borde dorado, máx. 2 líneas en móvil), explicación, calidad del aire como chip sólido legible y botones de acción juntos al final (juego como acción principal dorada de 52px, chat de ayuda secundario con contorno teal). (2) La nube se unifica al estilo Manolit∞: misma geometría que la pieza del juego, contorno granate, ondas teal, cara en tinta oscura y TRES gotas doradas (la que tenía más dos nuevas, orden expresa); se acabó el trazo gris. (3) Fuera la lluvia de 24 emojis aleatorios que caía encima del contenido: quedan dos piezas decorativas de marca (sol dorado y nube teal) quietas en las esquinas del hero, detrás de todo, solo en pantallas de 1024px o más; animación solo de transform, pausada con la pestaña oculta y apagada con prefers-reduced-motion (que además ahora sí frena la nube y el titular, antes quedaba pisado). (4) Probado en local a 360, 390, 768, 1024 y 1440px, vertical y horizontal en móvil, sin solapes ni scroll lateral. (5) De propina, un fallo real encontrado midiendo: el contain-intrinsic-size de las secciones diferidas recordaba un ancho fantasma de 900px que inflaba la rejilla del widget solar y daba scroll lateral en móvil y en horizontal hasta que la sección entraba en pantalla; el ancho de recuerdo baja a 320px y la altura sigue en 900px (scrollWidth igual al viewport en todos los tamaños probados). // -b 07-oct (segunda orden de Sandro, pendiente de su visto bueno y el de Jop antes de publicar): ajustes del juego y del diploma. (1) El diploma lleva la FIRMA de Manolit∞ abajo a la derecha, vectorial y tal cual el archivo original (tinta #111827 con su sombra térmica azul), sobre línea fina con la etiqueta traducida; se integra en su estado final, sin la animación de trazo, que en el PDF saldría a medias. (2) Desde el nivel 4 la partida dura 45 s (antes 26/26/25) con objetivos recalibrados 16/18/20 (antes 11/12/13) y barra de progreso nueva bajo el marcador. (3) Todo el juego traducido a los 6 idiomas de la plataforma (interfaz, intro, lecciones, preguntas, feedback, resumen, sellos y diploma SVG/PDF), con respaldo limpio al español y cambio de idioma en caliente sin perder puntos ni sellos (evento langChanged). (4) Credencial aleatoria MJ-XXXX-XXXX por diploma (crypto.getRandomValues, única en la sesión) y banda holográfica decorativa granate/dorado/teal, estática en SVG y PDF, con brillo animado muy ligero solo en la vista previa en pantalla (pausado si no es visible y apagado con prefers-reduced-motion). (5) i18n.js se queda solo con gameIntroBtn (el botón estático): el resto del corpus vive en los módulos. // -a 07-oct: el juego deja de ser "Atrapa el Sol" y pasa a ser "Atrapa a Manolit∞" (orden directa de Sandro, todo pendiente de su visto bueno antes de publicar). (1) La entrada al juego vive SOLO en la sección de niños: botón nuevo dentro de .peque-character (oculto fuera del modo peque) y contenedor en flujo normal; la casilla "Modo sol" y todo el bloque que la montaba salen de shadows-route.js, que se queda sin gafas ni panel en el mapa. (2) Dos módulos nuevos: js/juego-manolito.js (juego educativo de 6 niveles, uno por cada sello de protección ya existente: sol, sombra, salud, agua, temp y prevención; cada nivel enseña su sello con lecciones cortas, pregunta con feedback sin castigo, piezas temáticas y sello en el muro; con los 6 se desbloquea el sello final de Simulador de Sombras) y js/certificado-manolito.js (diploma SVG + PDF fabricado entero en el dispositivo, nombre opcional que no sale de ahí, y texto claro de que no es un título oficial). (3) Motor sin rAF: un solo setInterval de 250 ms gobierna todo, la caída es CSS con transform, pausa total con pestaña oculta (intervalo parado, CSS pausado, relojes por hora real desplazados al volver), prefers-reduced-motion deja las piezas quietas, y destruir() limpia intervalo, listeners y DOM. (4) i18n.js cambia las 5 claves sun* (ya sin uso) por 12 claves game* por idioma (72 en total, paridad 6/6); el corpus educativo largo va en español dentro del módulo, traducción pendiente de decisión. (5) El juego lee el UV que ya muestra la web (sciUV) para el consejo del nivel 1, sin pedir nada nuevo a la red. // -c 06-oct (noche): modo sol con el juego "Atrapa el Sol", orden directa de Sandro. (1) Dos modulos nuevos, js/modo-sol.js y js/juego-sol.js, con la API pedida (TIPS_SOL, consejoUV, obtenerUV, iniciarJuegoSol con destruir) y sin un solo emoji: los textos los lee speechSynthesis y las regiones aria-live, y las piezas son SVG propios (el sol es la mascota oficial de Manolit con gafas de sol y la nube un trazo sencillo). (2) shadows-route.js gana al final un bloque aditivo: casilla "Modo sol" junto a la de invierno con la misma mecanica, panel en flujo normal dentro del formulario de ruta con burbuja aria-live y consejo segun el UV real, gafas de sol para el caminante del mapa y el muneco del chat mas un bote de 1 s (quieto con prefers-reduced-motion), lectura en voz alta solo si la voz ya tiene permiso, y el juego montado en el panel llamando a destruir() al cerrar; no toca la logica de capas ni de rutas. (3) El UV llega primero por /prevision (worker propio, cache de 10 min y respaldo 200 neutro) y solo si falta el dato va directo a Open-Meteo; si todo falla sale un consejo generico de sol suave y la interfaz nunca se bloquea. worker.js suma uv_index al current que pide a Open-Meteo, campo aditivo que no cambia lo que ya leia microclima. (4) Regla de seguridad: desde UV 6 el consejo incluye crema y sombrero y desde UV 8 manda descansar a la sombra. (5) i18n.js gana 5 claves por idioma (casilla, avisos de estado, titulo del juego y aria de cerrar). (6) WCAG 2.2: piezas button de 52px con aria-label jugables con raton, tactil y teclado (Entrar y Espacio), reinicio con "Jugar otra vez", puntuacion solo en memoria y carga perezosa de los modulos: quien no abre el modo no descarga nada. Revision de la misma entrega -c antes de publicar (aun no desplegada): la mascota lleva brazos en todos los tamanos (granate como las piernas, manos doradas, balanceo en contrafase con las piernas, simplificados en el icono de la casilla), la nube se redibuja con la familia visual de la marca (trazo granate, ondas teal, gota dorada), el juego se pausa de verdad al ocultarse la pestaña (reloj por hora real, intervalos y animaciones parados, listener limpiado al terminar o destruir), el marcador solo se repinta cuando cambia, las piezas se posicionan en pixeles medidos del campo para no salir cortadas y la burbuja del consejo UV ya no se pisa al arrancar la partida. -b 06-oct (tarde): cuatro reparaciones urgentes de presentacion, orden directa de Sandro. (1) El marcador de Mi ubicacion de la columna derecha lleva ahora el LOGO OFICIAL de Manolit∞ con la geometria exacta del splash: gota granate, sol dorado y las DOS ondas teal (agua y aire); para que las ondas se distingan en pequeño el trazo va engrosado y la segunda onda un poco mas separada, misma curva y colores, y el icono crece de 16x22 a 22x33. (2) Los botones de camara salian como cajas vacias: el icono vivia en un ::after pero el boton nunca paso a display:flex, asi que el pseudo-elemento inline ignoraba ancho y alto y colapsaba a cero; ahora todos los botones son flex centrados y cada icono se ve claro (casi blanco, trazo 1,5, mismo tamaño) sobre la consola oscura. (3) El planetario de posicion solar queda EXACTAMENTE como estaba antes del rediseño: sin tarjeta, sin borde, sin fondo ni sombra de caja, con la sombra flotante original de la cupula y los datos en su tamaño y color de siempre; la cabecera "Posicion solar" que le habia añadido se retira del HTML. (4) El sello oficial (bloque de salud y pie permanente): el arco inferior se dibuja ahora de izquierda a derecha pasando por la parte baja (sweep-flag 0) y con el radio subido de 130 a 150, asi "SIMULADOR DE SOMBRAS" se lee derecho, con las letras de pie y centradas en el anillo, con el mismo tamaño, tipografia, color y espaciado que "MANOLIT∞", que no se ha tocado; el sello solo existe incrustado en index.html, esas dos instancias son todas las versiones (web y lo que sale al imprimir en A4). -a 06-oct: boton flotante de capas con panel desplegable y mapa a viewport completo (orden directa de Sandro). Solo presentacion: la logica de capas, los ids y el estado global no se tocan. (1) El mapa ocupa el viewport entero: fuera las alturas fijas en px/vh, ahora 100dvh con fallback 100vh y suelo de 440px, y un ResizeObserver reajusta el canvas al cambiar el contenedor (rotacion, barra del navegador movil), no solo con window.resize. (2) El panel de capas sale de la cuadricula y vive dentro del mapa como popover de 290px anclado a un boton flotante de 44px (icono Layers propio que al abrirse cambia a X), z-index 1110 por encima de los controles de MapLibre; en movil es bottom sheet con max-height 70dvh, asa, scroll interno y safe-area inferior; sin JavaScript el panel se queda visible en la cuadricula de siempre. (3) Cierra con la X, con Escape, repulsando el boton o con pointerdown fuera; al abrir el foco va al primer control, Tab y Shift+Tab no salen del panel y al cerrar el foco vuelve al boton. (4) Grupos nuevos: Base e infraestructura (Mapa base con sus tres tarjetas combinables, Edificios 3D, Ruta), Entorno y clima (Arboles, Calidad del aire, Microclima Estimado, Nubes) e Iluminacion y sol (Sombras, Posicion del sol, Irradiacion solar); "Sol y sombra" no existia como capa y Catastro sigue dentro de Mapa base; los mapas base siguen combinables porque forzar seleccion unica habria cambiado el comportamiento. (5) Safe-areas en flotante, camaras y barra; hover solo con hover real y hover pegajoso neutralizado en tactil; touch-action manipulation en botones sin tocar el lienzo; transiciones de 0,2s apagadas con prefers-reduced-motion. (6) i18n: 5 claves nuevas por idioma (tres grupos, aria del flotante y cerrar). (7) Arreglo de la cuadricula bajo el mapa: la seccion de OpenStreetMap y el boton LiDAR van siempre a lo ancho (con la rejilla del dia 1 caian en la columna estrecha). -z 01-oct: rediseño visual de la interfaz del mapa (orden directa de Sandro: solo capa visual, sin tocar la logica, los ids, los handlers ni el comportamiento de ninguna capa). Todo el sistema vive al final de css/style.css: tokens unicos (superficies oscuras neutras, un solo acento naranja reservado a lo activo y a la accion principal, radios 12/8, bordes de 1px sutiles, sombra minima, altura de control unica con 44px tactil en movil), tipografia de la app con dos tamaños para controles y uno para titulos de grupo, sentence case en los 6 idiomas y foco visible AA. (1) Un solo panel plegable "Capas" que une el panel viejo y el bloque "Capas de mapa": grupos Contenido del mapa (Entorno, Sol y sombra, Clima y aire, Recorrido) y Mapa base con tres tarjetas iguales en cuadricula. Catastro 3D sigue siendo lo que siempre fue, un overlay WMS sobre la misma base vectorial, asi que vive en Mapa base como tarjeta combinable; forzar eleccion unica habria cambiado el comportamiento y la orden lo prohibe. (2) Filas con icono propio SVG enmascarado (currentColor, trazo 1,5px, viewBox 24) e interruptores propios vestidos sobre las casillas reales de siempre, con input real, label y aria; "Microclima · estimado" pasa a "Microclima" con etiqueta pequeña "Estimado". (3) La barra superior se queda solo con acciones (Elegir en el mapa, Mi ubicacion, Iniciar caminata, Guia por voz, Paseo virtual 3D, Reiniciar): Arboles e Irradiacion solar se mudan al panel de capas y shadows-route.js los monta dentro con respaldo a la barra si el ancla no existiera; Mi ubicacion se queda porque el boton de camara le delega el clic por id. (4) Controles de camara agrupados (zoom, orientacion, localizar y pantalla completa) con el mismo tamaño e iconos SVG; fuera los glifos de texto (+, -, flechas) y el emoji del altavoz en los 6 idiomas, en la barra y en la guia accesible. (5) La tarjeta solar pierde el degradado naranja y viste la misma piel del panel con cabecera propia. (6) i18n.js gana 7 claves nuevas por idioma (etiqueta Estimado y titulos de grupo) y corrige capasBtn, layerMicroclimate e irrLayerBtn. Cero emojis como iconos, cero casillas nativas sin vestir, una sola familia visual. -y 01-oct: modo oscuro legible, orden directa de Sandro ("cualquier texto, en cualquier idioma y seccion, tiene que leerse perfectamente en modo oscuro igual que en modo claro; minimo AA, sin excepciones"). Todo el arreglo vive al final de css/style.css y solo pisa lo que fallaba. (1) Las variables de texto --text y --text-soft nunca habian existido: quien las usaba caia al gris oscuro del fallback, tinta oscura sobre fondo noche. Ya nacen definidas en claro y en oscuro (11,8:1 y 17,8:1 medidos). (2) Fuera TODA sombra de texto en modo oscuro por decreto: el desdoblado rojo/azul que se veia en la frase del modo peque venia de fuera de esta hoja y queda anulado para cualquier texto, canvas y SVG se respetan. (3) La palabra del orbe (BUENA/GOOD) iba en blanco directo sobre el color vivo del estado (1,3:1 en oscuro): ahora lleva una chapa oscura translucida detras, entre 5,6:1 y 11,4:1 con los seis colores de estado. (4) El boton escuchar de las indicaciones, al estar activo, ponia blanco sobre el acento claro del tema oscuro (1,4:1 en cosmos): ahora acento oscurecido con blanco en claro (minimo 5,1:1) y acento neon con tinta noche en oscuro (minimo 7,8:1). (5) El boton LiDAR en oscuro tenia blanco fijo sobre turquesa (2,2:1): la tinta pasa a noche, 9,2:1. (6) El CTA Buscar ruta ya era correcto en todas las paletas menos en coral, donde ni tinta oscura ni blanco llegaban a AA (4,2:1): solo para coral, fondo oscurecido al 78% con blanco, 6,1:1 en los dos temas. Auditados ademas tarjetas de modo, chips, burbujas del chat, titulos con degradado, tour guiado, popups del mapa y bloques de salud: todos pasan AA en oscuro. -x 01-oct: las tres ordenes directas de Sandro. (1) Capa 'Calidad del aire' en el panel de capas del mapa de rutas, SOLO para España: la casilla nace oculta y shadows-route.js la enseña cuando tu GPS, tu punto elegido o el centro del mapa caen en territorio español (poligono peninsular + Baleares, Canarias, Ceuta y Melilla); si sales de España con ella encendida se apaga, se vacia y avisa. Datos de /api/air-quality por celdas de 0,5 grados con cache de 10 minutos. (2) El tema verde del Sabado de la Salud ya NO puede volver solo: fuera la regla semanal recurrente que lo reactivaba cada finde sin avisar. Ahora solo hay ventanas cerradas con fecha de fin escrita en ambientes.js, cada ventana nueva necesita orden expresa tuya, mientras una ventana esta activa el banner dice el dia y la hora exacta en que la web vuelve a su piel, y una semana antes queda aviso en consola. Y las 4 insignias SVG de los observatorios (OSMAN, OSCC, Observatorio Europeo, ClimaHealth OMS+OMM) se han recuperado del cajon donde casi se pierden y viven ya para siempre en el pie, junto al sello oficial, con su explicacion en los 6 idiomas. (3) El boton magico de traduccion: la burbuja '¡Pregúntame!' ya sale del diccionario de verdad (antes buscaba un objeto que no existia, por eso se quedaba en español) y se repinta al cambiar de idioma; y i18n.js gana un barredor automatico en tres pisos: lo que ya funcionaba no se toca, todo texto visible que coincida con el diccionario se traduce aunque nadie le pusiera data-i18n, y lo que no este en el diccionario se traduce solo por la ruta nueva /traduce del worker (MyMemory, gratis, sin clave), una frase cada tercio de segundo, con cache eterna en el movil y sin tocar jamas la marca ni las paginas legales. -w 01-oct: segunda pasada de la traduccion total (Sandro vio el panel de ruta mezclado en ingles). Las claves que shadows-route.js y el resto de modulos pedian con t() y no existian ya estan en los 6 idiomas: guia por voz, modo invierno y sus avisos, botones naranjas de camara y su grupo, sincronizar/exportar, errores de GPS y de capas, 'y' entre calles; la guia por voz, el sync del pie, las camaras y el grupo de capas se retraducen en caliente al cambiar de idioma. air-forecast.js gana su helper tAir y traduce la grafica entera (carga, eje 'ahora', aria-label, barras cuanticas, estadisticas y errores), las fechas del eje y las horas del planetario y del slider usan el locale del idioma elegido, la voz del saludo habla en el idioma elegido y las fases de la luna van por diccionario. ambientes.js traduce el title y el subtitulo del Sabado de la Salud y se reaplica tras cada cambio de idioma. Los aria-label de cerrar, plegar, IGN y Catastro tambien viajan por i18n. -v 01-oct: traduccion completa de la web, la que faltaba (orden de Sandro: TOOOODA). Todos los textos visibles que aun iban fijos en español pasan por js/i18n.js en los 6 idiomas: splash y su lema, boton accesible, capas, microclima, LiDAR, toda la seccion de colaborar en OpenStreetMap (nuevo data-i18n-html para bloques con enlaces y codigo dentro), indice UV, evolucion del aire y sus leyendas, el bloque cuantico entero, los tres textos del pie, la donacion y Ko-fi, los enlaces de familia, el sello de carbono SVG, los rotulos de los stickers de salud, el title y la description de la pestaña (solo en la portada), los mensajes de sincronizacion y el cargando de arboles en shadows-route.js, el cargados X/Y de app.js y el modo peque gana su bloque georgiano, que era el unico idioma sin carita traducida. -u 28-sep: arreglo de la carga en frio que notaban los amigos de Sandro. El CSS de maplibre (unpkg) ya no bloquea el primer pintado (preload con intercambio al cargar, como las fuentes del about) y hay preconexion a unpkg y jsdelivr. Antes, si ese CDN iba lento o la red lo cortaba, la pagina se quedaba en blanco; a ti nunca te pasaba porque lo tenias en cache. -t 28-sep: arreglo para la revision de AlternativeTo. Lo que yo añadi estos dias y solo iba en español ya esta en los 6 idiomas (h1 del hero, enlace del generador del widget y encuesta de CO2, claves nuevas en js/i18n.js, y co2.js se retraduce en caliente al cambiar de idioma). El pie gana el enlace visible al codigo abierto en GitHub, que era uno de los motivos del rechazo. -s 28-sep: insignia de AlternativeTo al final del pie, centrada y con carga diferida. -r 28-sep: SEO fase 1 (orden de Sandro). Title y description orientados a busqueda, meta keywords fuera, twitter card summary_large_image, JSON-LD completo (WebApplication con alternateName "Manolito Aire", Person con sameAs, FAQPage con el texto identico al visible, BreadcrumbList en subpaginas), h1 unico en el hero, robots.txt y sitemap.xml nuevos, canonical en cada pagina y el snippet del widget con enlace de texto a manolitoaire.com. -q 28-sep: meta de verificacion de Bing Webmaster Tools en el head del index. -p 27-sep: CO2 evitado por ruta fresca (js/co2.js nuevo). Tras calcular una ruta, una encuesta de un toque pregunta el medio que se habria usado y muestra el CO2 evitado yendo a pie, con factores publicos BEIS/DEFRA (coche 170, moto 114, autobus 97 g CO2e/km; a pie y bici 0). Respuesta efimera, no se guarda nada. -o 27-sep: enlace "Anade Manolit∞ a tu web" en la zona de familia del index, entrada publica al generador del widget. -n 27-sep: widget v2 con el mismo aspecto que la web principal (panel oscuro con iconos, boton naranja), buscador de direcciones y boton de mi ubicacion (geocodificacion via /geo y /geo-reverso, igual que la web), y el generador anade-manolito.html rehecho intuitivo, sin campos de latitud, longitud ni zoom: se busca el lugar, se mueve el mapa de vista previa y el codigo iframe se genera solo con allow="geolocation". -m 26-sep: widget embebible nuevo (widget.html, ruta con sombra o con sol, nubes y badge, parametros lat/lng/zoom/modo por query string, logo a manolitoaire.com), la pagina generadora anade-manolito.html y el archivo _headers con frame-ancestors para que cualquier web pueda incrustarlo. -l 26-sep: la seccion de salud vuelve a la forma sencilla de antes (orden de Sandro): la fila de recursos oficiales se queda con una sola pastilla andaluza, OSMAN, y el bloque de las 4 gamas con las insignias SVG queda aparcado comentado dentro del propio index, guardado para mudarse al about ("por que existe Manolit") cuando acabe el domingo. -k 26-sep: el pie vuelve a quedar como Sandro lo dejo corregido en la web, sin la fila de Instagram @manolitoinfinitum8; quedan TikTok @manolitoinfinitum8 y su Instagram personal @manolit_8. -j 26-sep: los 4 recursos institucionales van plegados en un sub-desplegable ("Recursos oficiales") que solo se abre al pulsarlo, nada fijo en pantalla. -i 26-sep: el chat hereda al instante la posicion que ya tenga el mapa (cero busquedas GPS duplicadas, se acabo el bucle de "Buscando tu ubicacion"), los textos dinamicos del chat de rutas se retraducen al cambiar de idioma, y los recursos oficiales pasan a 4 gamas con insignia propia (OSMAN, OSCC, Observatorio Europeo, ClimaHealth); se retiran los dos enlaces andaluces anteriores. -h 26-sep: las etiquetas de texto internas de los stickers quedan ocultas siempre (estado inicial = 6 iconos limpios; el texto solo llega por tooltip al pasar el raton o por panel fijo al hacer clic). -g 26-sep: los seis stickers de salud son botones independientes (hover con tooltip rapido, clic abre panel fijo, reclic o Esc cierra), textos de salud ambiental en los 6 idiomas, "Manolito" ya no aparece sin su ∞ en ningun texto visible
// -f 26-sep: el sticker "sombra" del desplegable de salud es ahora el que paso Sandro (copa de arbol clara con sombra proyectada en tres capas), alineado con los otros cinco // -f 26-sep: el sticker "sombra" del desplegable de salud es ahora el que paso Sandro (copa de arbol clara con sombra proyectada en tres capas), alineado con los otros cinco
// -e 26-sep: textos del modo salud con la voz de Sandro (salud ambiental urbana, asfalto y Hercules), stickers SVG de salud dentro del desplegable, disclaimer al final del todo y frase de cierre de Manolito en el chat solo estos dias // -e 26-sep: textos del modo salud con la voz de Sandro (salud ambiental urbana, asfalto y Hercules), stickers SVG de salud dentro del desplegable, disclaimer al final del todo y frase de cierre de Manolito en el chat solo estos dias
// -d 25-sep: el desplegable de salud cierra con nota de precision (el simulador puede fallar, manda el sentido comun) y pie de recursos oficiales (Consejeria y Salud Responde); el sello oficial se queda permanente en la esquina del pie, en corporativos y en verde solo los fines de semana de salud // -d 25-sep: el desplegable de salud cierra con nota de precision (el simulador puede fallar, manda el sentido comun) y pie de recursos oficiales (Consejeria y Salud Responde); el sello oficial se queda permanente en la esquina del pie, en corporativos y en verde solo los fines de semana de salud
// -c 25-sep: el bloque de salud es un desplegable manual estricto (cerrado por defecto, clic abre y clic cierra), lleva el sello oficial SVG con su geometría intacta y sus colores salen de variables CSS (verdes en modo salud, corporativos el resto del año) // -c 25-sep: el bloque de salud es un desplegable manual estricto (cerrado por defecto, clic abre y clic cierra), lleva el sello oficial SVG con su geometría intacta y sus colores salen de variables CSS (verdes en modo salud, corporativos el resto del año)
// -e 23-sep: arboles-3d.js arregla los abanicos rosas gigantes que salían al agitar el móvil de noche (los pompones de albizia que ya habían caído se "ocultaban" con una escala 3000 veces mayor que la normal en vez de hacerse invisibles)
// 2026-09-23-b: los pompones caídos de la albizia se esconden de verdad (escala 1e-12, no 0.0001), se acabaron los abanicos rosas al despertar el GPS en otoño e invierno. Solo cambia js/arboles-3d.js
// 2026-09-23-a: about sin placa detrás del logo (flota sobre el fondo, claro u oscuro), colores del logo y del panel adaptados a cada tema, todos los guiones largos fuera de los textos. Solo cambia about.html
// -d 22-sep: about.html crece con la página de la cara de Manolit∞ que pasó Sandro: logo interactivo arriba del todo, descripción debajo y el resto (contenido nuevo + el que ya había) en 5 secciones plegadas. Solo cambia about.html
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
const RUTAS_DINAMICAS = ['/api/', '/geo', '/ruta', '/clima', '/prevision', '/arboles', '/manolito'];

/* Hosts de datos dinámicos externos */
const HOSTS_DINAMICOS = [
	'api.open-meteo.com',
	'overpass-api.de',
	'lz4.overpass-api.de',
	'overpass.kumi.systems',
	'overpass.nchc.org.tw',
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

// Sirve la copia cacheada al instante (si existe) y SIEMPRE pide a red en
// segundo plano para refrescarla: velocidad de cache-first sin congelar
// el contenido. Así el planeta nuevo de OpenFreeMap entra solo.
function staleWhileRevalidate(peticion) {
	return caches.open(CACHE_ESTATICA).then(function(cache) {
		return cache.match(peticion).then(function(guardada) {
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

	// Navegaciones (entrar a la web): frescura primero.
	if (peticion.mode === 'navigate') {
		ev.respondWith(networkFirst(peticion));
		return;
	}

	if (esDinamico(url)) {
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
