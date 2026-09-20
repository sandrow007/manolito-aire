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
const VERSION = '2026-09-19-h' // -h 19-sep: Manolit visible con Mi ubicacion (CSS de MapLibre + position absolute) + paciencia con GPS lento + microclima con respaldo directo;
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
