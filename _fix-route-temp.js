const fs = require('fs');
const p = 'js/shadows-route.js';
let s = fs.readFileSync(p, 'utf8');
const mal = "const r = await fetch(url.toString(), { headers: { 'Accept-Language': 'es' });";
const BR = String.fromCharCode(125); // '}'
const SP = String.fromCharCode(32);
const bien = "const r = await fetch(url.toString(), { headers: { 'Accept-Language': 'es' " + BR + SP + BR + ");";
const count = s.split(mal).length - 1;
if (count !== 1) {
  console.error('Coincidencias del patron mal formado:', count);
  process.exit(1);
}
s = s.replace(mal, bien);
fs.writeFileSync(p, s);
console.log('OK: linea corregida');
console.log('Nueva linea:', bien);
