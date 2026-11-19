/* Worker del inventario de Sevilla: mantener el GeoJSON grande fuera del hilo de render. */
'use strict';

var datos = null;
var rejilla = null;
var CELDA = 0.004;

function claveCelda(lon, lat) {
  return Math.floor(lat / CELDA) + ',' + Math.floor(lon / CELDA);
}

function cargarDatos() {
  if (datos) return Promise.resolve();
  if (cargarDatos.promesa) return cargarDatos.promesa;
  cargarDatos.promesa = fetch(new URL('../data/arboles-inventario-sevilla.geojson.gz', self.location.href))
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    })
    .then(function (buf) {
      var bytes = new Uint8Array(buf);
      if (bytes.length > 2 && bytes[0] === 0x1F && bytes[1] === 0x8B) {
        if (typeof DecompressionStream !== 'function') throw new Error('Descompresión gzip no disponible');
        return new Response(new Response(buf).body.pipeThrough(new DecompressionStream('gzip'))).json();
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    })
    .then(function (geo) {
      if (!geo || !Array.isArray(geo.features)) throw new Error('GeoJSON inválido');
      datos = geo.features;
      rejilla = new Map();
      for (var i = 0; i < datos.length; i++) agregarARejilla(datos[i]);
    })
    .catch(function (e) {
      cargarDatos.promesa = null;
      throw e;
    });
  return cargarDatos.promesa;
}

function consultar(caja, centro) {
  var minX = Math.floor(caja[0] / CELDA), maxX = Math.floor(caja[2] / CELDA);
  var minY = Math.floor(caja[1] / CELDA), maxY = Math.floor(caja[3] / CELDA);
  var totalCeldas = (maxX - minX + 1) * (maxY - minY + 1);
  if (!isFinite(totalCeldas) || totalCeldas > 20000) return [];
  var salida = [];
  for (var y = minY; y <= maxY; y++) {
    for (var x = minX; x <= maxX; x++) buscarGrupo(caja, salida, y, x);
  }
  if (salida.length > 1400 && Array.isArray(centro) && centro.length >= 2) {
    ordenarPorDistancia(salida, centro);
    salida.length = 1400;
  }
  return salida;
}

function agregarDentroDeCaja(grupo, caja, salida) {
  for (var i = 0; i < grupo.length; i++) {
    var f = grupo[i], c = f.geometry.coordinates;
    if (c[0] >= caja[0] && c[0] <= caja[2] && c[1] >= caja[1] && c[1] <= caja[3]) salida.push(f);
  }
}

function buscarGrupo(caja, salida, y, x) {
  var grupo = rejilla.get(y + ',' + x);
  if (grupo) agregarDentroDeCaja(grupo, caja, salida);
}

function ordenarPorDistancia(salida, centro) {
  var cosLat = Math.cos(centro[1] * Math.PI / 180);
  salida.sort(function (a, b) {
    var ca = a.geometry.coordinates, cb = b.geometry.coordinates;
    var dxa = (ca[0] - centro[0]) * cosLat, dya = ca[1] - centro[1];
    var dxb = (cb[0] - centro[0]) * cosLat, dyb = cb[1] - centro[1];
    return dxa * dxa + dya * dya - dxb * dxb - dyb * dyb;
  });
}

self.onmessage = function (evento) {
  var m = evento.data || {};
  if (m.tipo !== 'consulta' || !Array.isArray(m.caja)) return;
  cargarDatos()
    .then(function () { self.postMessage({ id: m.id, features: consultar(m.caja, m.centro) }); })
    .catch(function (e) {
      self.postMessage({ id: m.id, error: e && e.message || 'Error cargando inventario' });
    });
};

function agregarARejilla(f) {
  var c = f.geometry && f.geometry.coordinates;
  if (!c || c.length < 2) return;
  var k = claveCelda(c[0], c[1]);
  if (!rejilla.has(k)) rejilla.set(k, []);
 rejilla.get(k).push(f);
}
