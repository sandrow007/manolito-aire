/* ============================================================
   MANOLIT AIRE — sw.js (Service Worker)
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
     proxies propios /api /geo /ruta /clima /arboles). Así los
     datos están frescos cuando hay red y hay respaldo cuando
     no la hay.
   - NUNCA se cachean POST (el chat /manolito) ni otras APIs
     que no sean GET.

   Para publicar una versión nueva de los estáticos basta subir
   el número VERSION de abajo: se borran las cachés viejas.
   ============================================================ */
'use strict';

const VERSION = '2026-08-30-a';
const CACHE_ESTATICA = 'manolito-estatica-' + VERSION;
const CACHE_DINAMICA = 'manolito-dinamica-' + VERSION;
const MAX_ENTRADAS_ESTATICAS = 600; // tiles incluidos; tope de seguridad

/* Hosts de contenido casi inmutable: mapa, librerías y fuentes */
const HOSTS_ESTATICOS = [
  'tiles.openfreemap.org',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

/* Rutas propias con datos dinámicos (proxies del worker) */
const RUTAS_DINAMICAS = ['/api/', '/geo', '/ruta', '/clima', '/arboles', '/manolito'];

/* Hosts de datos dinámicos externos */
const HOSTS_DINAMICOS = [
  'api.open-meteo.com',
  'overpass-api.de',
  'lz4.overpass-api.de',
  'overpass.kumi.systems',
  'overpass.nchc.org.tw',
];

/* ---------------- install / activate ---------------- */
self.addEventListener('install', function (ev) {
  // Activar cuanto antes; no precacheamos nada para no fallar
  // nunca la instalación por un recurso concreto.
  self.skipWaiting();
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys()
      .then(function (claves) {
        return Promise.all(
          claves
            .filter(function (c) { return c.indexOf('manolito-') === 0 && c.indexOf(VERSION) === -1; })
            .map(function (c) { return caches.delete(c); })
        );
      })
      .then(function () { return self.clients.claim(); })
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
    return RUTAS_DINAMICAS.some(function (r) { return url.pathname.indexOf(r) === 0; });
  }
  return false;
}

function recortarCache(nombreCache, maximo) {
  // Borra las entradas más antiguas si nos pasamos del tope.
  return caches.open(nombreCache).then(function (cache) {
    return cache.keys().then(function (claves) {
      if (claves.length <= maximo) return;
      const sobrantes = claves.length - maximo;
      return Promise.all(claves.slice(0, sobrantes).map(function (k) { return cache.delete(k); }));
    });
  }).catch(function () { /* recortar es opcional */ });
}

function cacheFirst(peticion) {
  return caches.match(peticion).then(function (guardada) {
    if (guardada) return guardada;
    return fetch(peticion).then(function (respuesta) {
      // Solo guardamos respuestas válidas (u opacas de CDNs de tiles)
      if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
        const copia = respuesta.clone();
        caches.open(CACHE_ESTATICA).then(function (cache) { cache.put(peticion, copia); })
          .then(function () { recortarCache(CACHE_ESTATICA, MAX_ENTRADAS_ESTATICAS); })
          .catch(function () { /* caché llena o no disponible */ });
      }
      return respuesta;
    });
  });
}

function networkFirst(peticion) {
  return fetch(peticion).then(function (respuesta) {
    if (respuesta && respuesta.ok) {
      const copia = respuesta.clone();
      caches.open(CACHE_DINAMICA).then(function (cache) { cache.put(peticion, copia); })
        .catch(function () { /* sin caché */ });
    }
    return respuesta;
  }).catch(function () {
    return caches.match(peticion).then(function (guardada) {
      // Si no hay red ni caché, devolvemos error de red estándar.
      return guardada || Response.error();
    });
  });
}

/* ---------------- fetch ---------------- */
self.addEventListener('fetch', function (ev) {
  const peticion = ev.request;

  // Solo GET: el chat (/manolito) y cualquier POST van directos a red.
  if (peticion.method !== 'GET') return;

  let url;
  try { url = new URL(peticion.url); } catch (e) { return; }
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

  if (esEstatico(url)) {
    ev.respondWith(cacheFirst(peticion));
    return;
  }

  // Resto (mayoría same-origin): network-first suave con respaldo.
  ev.respondWith(networkFirst(peticion));
});
