/* ==========================================================================
   Tests de la fuente de datos Clima 2050 (auto/emulated/target).
   Se ejecutan con Node puro, sin dependencias:

     node --test tests/

   El fixture tests/fixtures/clima2050-target-valido.fixture.geojson es
   SINTÉTICO (está marcado así en su metadata): solo sirve para tests, no es
   un dato TARGET de producción.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const fuente = require('../js/clima-2050-source.js');

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRuta = join(raiz, 'tests', 'fixtures', 'clima2050-target-valido.fixture.geojson');
const fixture = JSON.parse(readFileSync(fixtureRuta, 'utf8'));

// fetch falso: responde 200 con el fixture dado (o con lo que se pase).
function fetchFake(col, llamadas) {
  return function () {
    llamadas.n++;
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(col) });
  };
}

test('target válido: carga el fixture, normaliza y no inventa dias40 ausente', async () => {
  const llamadas = { n: 0 };
  const r = await fuente.resolverFuente({ source: 'target', fetchImpl: fetchFake(fixture, llamadas) });
  assert.equal(llamadas.n, 1);
  assert.equal(r.source, 'target');
  assert.equal(r.aviso, null);
  assert.equal(r.geojson, fixture, 'el geojson validado se devuelve en línea (sin segunda descarga)');
  assert.equal(r.meta.scenario, 'SSP2-4.5');
  assert.equal(r.meta.year, 2050);
  assert.equal(r.meta.resolution_m, 100);
  assert.equal(r.features.length, 2);
  assert.equal(r.features[0].source, 'target');
  assert.equal(r.features[0].dias40, fixture.features[0].properties.dias40);
  assert.equal(r.features[0].hazard_index, fixture.features[0].properties.hazard_index);
  // Segunda feature del fixture: SIN dias40 → null, jamás derivado.
  assert.equal(r.features[1].dias40, null);
  assert.equal(r.features[1].risk_level, fixture.features[1].properties.risk_level);
});

test('fallback a emulated si el archivo no existe (HTTP 404)', async () => {
  const fetch404 = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
  const r = await fuente.resolverFuente({ source: 'target', fetchImpl: fetch404 });
  assert.equal(r.source, 'emulated');
  assert.match(r.aviso, /no existe/);
  assert.equal(r.geojson, null);
  assert.equal(r.features, null);
});

test('fallback a emulated si el esquema es inválido (risk_level 9, falta area)', async () => {
  const invalido = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      properties: { municipio: 'Sevilla', risk_level: 9 } // sin area y risk fuera de rango
    }]
  };
  const llamadas = { n: 0 };
  const r = await fuente.resolverFuente({ source: 'target', fetchImpl: fetchFake(invalido, llamadas) });
  assert.equal(r.source, 'emulated');
  assert.match(r.aviso, /esquema inválido/);
});

test('fallback a emulated si el JSON está corrupto', async () => {
  const fetchCorrupto = () => Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.reject(new SyntaxError('Unexpected token'))
  });
  const r = await fuente.resolverFuente({ source: 'target', fetchImpl: fetchCorrupto });
  assert.equal(r.source, 'emulated');
  assert.match(r.aviso, /JSON corrupto/);
});

test('modo emulated: nunca descarga el archivo TARGET', async () => {
  const llamadas = { n: 0 };
  const r = await fuente.resolverFuente({ source: 'emulated', fetchImpl: fetchFake(fixture, llamadas) });
  assert.equal(r.source, 'emulated');
  assert.equal(r.aviso, null);
  assert.equal(llamadas.n, 0, 'en modo emulated no se hace ninguna petición');
});

test('fórmula emulada: resultado idéntico al algoritmo original', () => {
  // Re-implementación INLINE de la fórmula que la capa lleva usando desde el
  // inicio (estaba en js/clima-2050.js): si el módulo la reprogramara mal,
  // este test lo detecta. NO CAMBIAR la fórmula.
  function hashOriginal(t) {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return h;
  }
  function dias40Original(risk, area) {
    return 30 + risk * 5 + (hashOriginal(area) % 7);
  }
  const areas = [
    'Centro', 'Nervión', 'Triana', 'Los Remedios', 'Barrio León',
    'áéíóú ñü 漢字', 'A'.repeat(64), ''
  ];
  for (const area of areas) {
    for (let risk = 0; risk <= 3; risk++) {
      assert.equal(
        fuente.calcularDias40Emulados(risk, area),
        dias40Original(risk, area),
        `risk=${risk}, area=${JSON.stringify(area)}`
      );
    }
  }
});

test('validarGeojsonTarget acepta el fixture y rechaza una geometry Point', () => {
  const ok = fuente.validarGeojsonTarget(fixture);
  assert.equal(ok.ok, true);
  assert.equal(ok.meta.source, 'TARGET');

  const punto = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-5.99, 37.39] },
      properties: { municipio: 'Sevilla', area: 'Centro', risk_level: 2 }
    }]
  };
  const mal = fuente.validarGeojsonTarget(punto);
  assert.equal(mal.ok, false);
  assert.ok(mal.errores.some((e) => /Polygon o MultiPolygon/.test(e)));
});

test('CLI validate-target-geojson.mjs: VÁLIDO con el fixture (exit 0)', () => {
  const salida = execFileSync(
    process.execPath,
    [join(raiz, 'scripts', 'validate-target-geojson.mjs'), fixtureRuta],
    { encoding: 'utf8' }
  );
  assert.match(salida, /VÁLIDO/);
});
