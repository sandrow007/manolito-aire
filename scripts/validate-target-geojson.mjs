#!/usr/bin/env node
/* ==========================================================================
   Validador del GeoJSON TARGET de Clima 2050 (sin dependencias externas).

   Uso:
     node scripts/validate-target-geojson.mjs [ruta/al/archivo.geojson]

   Sin argumentos valida la ruta por defecto:
     data/clima2050/target/clima_2050_target.geojson

   Reutiliza EXACTAMENTE el mismo validador que usa la web
   (js/clima-2050-source.js → validarGeojsonTarget), así lo que pasa aquí
   pasa también en el navegador. Exit 0 = válido; exit 1 = inválido o
   ilegible. TARGET no se ejecuta aquí: este script solo comprueba el
   archivo que el pipeline externo (ver scripts/target/README.md) genera.
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const fuente = require('../js/clima-2050-source.js');

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ruta = process.argv[2] || join(raiz, 'data', 'clima2050', 'target', 'clima_2050_target.geojson');

let texto;
try {
  texto = await readFile(ruta, 'utf8');
} catch (err) {
  console.error('NO VÁLIDO: no se puede leer ' + ruta + ' (' + err.message + ')');
  process.exit(1);
}

let json;
try {
  json = JSON.parse(texto);
} catch (err) {
  console.error('NO VÁLIDO: JSON corrupto en ' + ruta + ' (' + err.message + ')');
  process.exit(1);
}

const v = fuente.validarGeojsonTarget(json);
if (!v.ok) {
  console.error('NO VÁLIDO: ' + ruta + ' no cumple el esquema mínimo TARGET:');
  v.errores.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

const meta = v.meta || {};
const partes = ['features: ' + json.features.length];
if (meta.source) partes.push('source: ' + meta.source);
if (meta.scenario) partes.push('escenario: ' + meta.scenario);
if (meta.year != null) partes.push('año: ' + meta.year);
if (meta.resolution_m != null) partes.push('resolución: ' + meta.resolution_m + ' m');
console.log('VÁLIDO: ' + ruta);
console.log('  ' + partes.join(' · '));
process.exit(0);
