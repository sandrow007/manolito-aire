/* ============================================================
   CERTIFICADO DE MANOLIT∞ (07-oct-2026, orden directa de Sandro)
   Genera el diploma del juego "Atrapa a Manolit∞" ENTERO en el
   dispositivo del niño. No se envía ni se guarda nada en ningún
   servidor: el nombre solo vive en la memoria de la página y se
   olvida al cerrarla.

   Dos formatos:
     - SVG vectorial (descarga directa, calidad infinita).
     - PDF de una página A4 apaisado. El PDF se construye a mano
       (sin librerías) incrustando el diploma rasterizado a JPEG,
       formato que el PDF admite tal cual (/DCTDecode).

   Es un diploma de juego: el propio certificado dice que no es
   un título oficial ni acreditado.
   ============================================================ */

const GRANATE = '#7A0016';
const DORADO = '#E6A100';
const TEAL = '#007A87';
const TINTA = '#26424B';
const PAPEL = '#FBFAF7';

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/* ---- Sello oficial Manolit∞ (geometría exacta del que ya vive
   en index.html, solo con colores de marca fijos) ---- */
function selloOficial(x, y, escala) {
  return `
  <g transform="translate(${x}, ${y}) scale(${escala})">
    <defs>
      <path id="certArcoSup" d="M 70, 200 A 130 130 0 0 1 330 200" />
      <path id="certArcoInf" d="M 50, 200 A 150 150 0 0 0 350 200" />
    </defs>
    <circle cx="200" cy="200" r="190" fill="none" stroke="${GRANATE}" stroke-width="6"/>
    <circle cx="200" cy="200" r="180" fill="none" stroke="${GRANATE}" stroke-width="2"/>
    <circle cx="200" cy="200" r="105" fill="none" stroke="${GRANATE}" stroke-width="2" stroke-dasharray="6 4"/>
    <text font-family="monospace" font-size="18" font-weight="600" letter-spacing="3" fill="${TINTA}">
      <textPath href="#certArcoSup" startOffset="50%" text-anchor="middle">MANOLIT∞</textPath>
    </text>
    <text font-family="monospace" font-size="18" font-weight="600" letter-spacing="3" fill="${TINTA}">
      <textPath href="#certArcoInf" startOffset="50%" text-anchor="middle">SIMULADOR DE SOMBRAS</textPath>
    </text>
    <g transform="translate(140, 104) scale(0.60)">
      <circle cx="100" cy="150" r="45" fill="none" stroke="${DORADO}" stroke-width="2.5"/>
      <path d="M 60,165 Q 80,155 100,165 T 140,165" fill="none" stroke="${TEAL}" stroke-width="4" stroke-linecap="round"/>
      <path d="M 65,175 Q 82.5,167 100,175 T 135,175" fill="none" stroke="${TEAL}" stroke-width="3" stroke-linecap="round"/>
      <path d="M 100,149 C 75,124 75,174 100,149 C 125,124 125,174 100,149 Z" fill="none" stroke="${GRANATE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 100,30 C 30,110 30,210 100,290 C 170,210 170,110 100,30 Z" fill="none" stroke="${GRANATE}" stroke-width="5" stroke-linejoin="round"/>
    </g>
  </g>`;
}

/* ---- Mini sellos de protección: mismos glifos que los stickers
   de salud de la web (sol, sombra, salud, agua, temp, prevención),
   montados sobre un círculo granate de diploma. ---- */
function glifoSello(id, cx, cy) {
  switch (id) {
    case 'sol': {
      let rayos = '';
      for (let k = 0; k < 8; k++) {
        const a = Math.PI / 4 * k;
        const x1 = cx + 26 * Math.cos(a), y1 = cy + 26 * Math.sin(a);
        const x2 = cx + 36 * Math.cos(a), y2 = cy + 36 * Math.sin(a);
        rayos += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${DORADO}" stroke-width="4" stroke-linecap="round"/>`;
      }
      return `${rayos}<circle cx="${cx}" cy="${cy}" r="18" fill="${DORADO}"/>`;
    }
    case 'sombra':
      return `<ellipse cx="${cx + 8}" cy="${cy + 22}" rx="26" ry="7" fill="${TINTA}" opacity="0.35"/>
      <path d="M${cx} ${cy - 26} C${cx - 14} ${cy - 26} ${cx - 26} ${cy - 14} ${cx - 26} ${cy} C${cx - 26} ${cy + 10} ${cx - 18} ${cy + 17} ${cx - 10} ${cy + 22} L${cx + 10} ${cy + 22} C${cx + 18} ${cy + 17} ${cx + 26} ${cy + 10} ${cx + 26} ${cy} C${cx + 26} ${cy - 14} ${cx + 14} ${cy - 26} ${cx} ${cy - 26} Z" fill="#FFFFFF" stroke="${TEAL}" stroke-width="3"/>`;
    case 'salud':
      return `<path d="M${cx} ${cy + 24} C${cx - 22} ${cy + 6} ${cx - 32} ${cy - 8} ${cx - 32} ${cy - 20} C${cx - 32} ${cy - 30} ${cx - 24} ${cy - 36} ${cx - 16} ${cy - 36} C${cx - 10} ${cy - 36} ${cx - 4} ${cy - 33} ${cx} ${cy - 27} C${cx + 4} ${cy - 33} ${cx + 10} ${cy - 36} ${cx + 16} ${cy - 36} C${cx + 24} ${cy - 36} ${cx + 32} ${cy - 30} ${cx + 32} ${cy - 20} C${cx + 32} ${cy - 8} ${cx + 22} ${cy + 6} ${cx} ${cy + 24} Z" fill="${GRANATE}"/>
      <line x1="${cx}" y1="${cy - 16}" x2="${cx}" y2="${cy + 6}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
      <line x1="${cx - 11}" y1="${cy - 5}" x2="${cx + 11}" y2="${cy - 5}" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>`;
    case 'agua':
      return `<path d="M${cx} ${cy - 30} C${cx} ${cy - 30} ${cx - 20} ${cy - 4} ${cx - 20} ${cy + 10} C${cx - 20} ${cy + 22} ${cx - 11} ${cy + 31} ${cx} ${cy + 31} C${cx + 11} ${cy + 31} ${cx + 20} ${cy + 22} ${cx + 20} ${cy + 10} C${cx + 20} ${cy - 4} ${cx} ${cy - 30} ${cx} ${cy - 30} Z" fill="${TEAL}"/>
      <ellipse cx="${cx - 7}" cy="${cy + 6}" rx="4" ry="7" fill="#FFFFFF" opacity="0.5"/>`;
    case 'temp':
      return `<rect x="${cx - 5}" y="${cy - 30}" width="10" height="40" rx="5" fill="#FFFFFF" stroke="${GRANATE}" stroke-width="3"/>
      <circle cx="${cx}" cy="${cy + 18}" r="13" fill="${GRANATE}"/>
      <rect x="${cx - 3.5}" y="${cy - 12}" width="7" height="26" fill="${GRANATE}"/>`;
    case 'prevencion':
      return `<path d="M${cx} ${cy - 32} L${cx + 27} ${cy - 21} L${cx + 27} ${cy + 1} C${cx + 27} ${cy + 18} ${cx + 15} ${cy + 28} ${cx} ${cy + 34} C${cx - 15} ${cy + 28} ${cx - 27} ${cy + 18} ${cx - 27} ${cy + 1} L${cx - 27} ${cy - 21} Z" fill="${DORADO}"/>
      <path d="M${cx - 12} ${cy} L${cx - 4} ${cy + 9} L${cx + 13} ${cy - 11}" stroke="${GRANATE}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    default:
      return '';
  }
}

function miniSello(id, nombre, cx, cy, conseguido) {
  const op = conseguido ? '1' : '0.28';
  const aro = conseguido ? GRANATE : TINTA;
  return `
  <g opacity="${op}">
    <circle cx="${cx}" cy="${cy}" r="50" fill="#FFFFFF" stroke="${aro}" stroke-width="4"/>
    <circle cx="${cx}" cy="${cy}" r="43" fill="none" stroke="${aro}" stroke-width="1.5" stroke-dasharray="4 3"/>
    ${glifoSello(id, cx, cy)}
    <text x="${cx}" y="${cy + 72}" text-anchor="middle" font-family="monospace" font-size="15" fill="${TINTA}">${escXml(nombre)}</text>
  </g>`;
}

/* ---- Sello final: solo se estampa si están los 6 ---- */
function selloFinal(cx, cy, conseguido) {
  const op = conseguido ? '1' : '0.28';
  return `
  <g opacity="${op}">
    <circle cx="${cx}" cy="${cy}" r="58" fill="#FFFFFF" stroke="${DORADO}" stroke-width="5"/>
    <circle cx="${cx}" cy="${cy}" r="50" fill="none" stroke="${GRANATE}" stroke-width="2"/>
    <path d="M ${cx} ${cy - 34} C ${cx - 26} ${cy - 6} ${cx - 26} ${cy + 26} ${cx} ${cy + 42} C ${cx + 26} ${cy + 26} ${cx + 26} ${cy - 6} ${cx} ${cy - 34} Z" fill="none" stroke="${GRANATE}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M ${cx} ${cy - 6} C ${cx - 11} ${cy - 17} ${cx - 11} ${cy + 5} ${cx} ${cy - 6} C ${cx + 11} ${cy - 17} ${cx + 11} ${cy + 5} ${cx} ${cy - 6} Z" fill="none" stroke="${GRANATE}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M ${cx - 22} ${cy + 8} Q ${cx - 11} ${cy + 2} ${cx} ${cy + 8} T ${cx + 22} ${cy + 8}" fill="none" stroke="${TEAL}" stroke-width="3" stroke-linecap="round"/>
    <text x="${cx}" y="${cy + 72}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="700" fill="${GRANATE}">SIMULADOR</text>
    <text x="${cx}" y="${cy + 87}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="700" fill="${GRANATE}">DE SOMBRAS</text>
  </g>`;
}

/* ============================================================
   construirCertificadoSVG({ nombre, puntos, sellos, fecha })
   - nombre: string (ya recortado) o '' si el niño no quiso ponerlo
   - puntos: número entero
   - sellos: array de ids conseguidos, p. ej. ['sol','sombra',...]
   - fecha: string ya formateada por el llamador (locale del niño)
   Devuelve el SVG como string (A4 apaisado, 1123x794).
   ============================================================ */
export function construirCertificadoSVG({ nombre = '', puntos = 0, sellos = [], fecha = '' } = {}) {
  const SELLOS = [
    ['sol', 'sol'], ['sombra', 'sombra'], ['salud', 'salud'],
    ['agua', 'agua'], ['temp', 'temp.'], ['prevencion', 'prevención']
  ];
  const completo = SELLOS.every(([id]) => sellos.includes(id));
  const quien = nombre ? escXml(nombre) : 'un peque con mucha cabeza';

  let fila = '';
  SELLOS.forEach(([id, nom], i) => {
    fila += miniSello(id, nom, 236 + i * 130, 528, sellos.includes(id));
  });
  const final = selloFinal(236 + 6 * 130 + 10, 528, completo);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1123" height="794" viewBox="0 0 1123 794" font-family="'Segoe UI', system-ui, sans-serif">
  <rect width="1123" height="794" fill="${PAPEL}"/>
  <rect x="18" y="18" width="1087" height="758" fill="none" stroke="${GRANATE}" stroke-width="5"/>
  <rect x="30" y="30" width="1063" height="734" fill="none" stroke="${GRANATE}" stroke-width="1.5" stroke-dasharray="8 5"/>

  <text x="610" y="96" text-anchor="middle" font-family="monospace" font-size="22" letter-spacing="6" fill="${GRANATE}">MANOLIT∞ AIRE</text>
  <text x="610" y="150" text-anchor="middle" font-size="44" font-weight="800" fill="${TINTA}">Diploma del juego de Manolit∞</text>

  <text x="610" y="205" text-anchor="middle" font-size="22" fill="${TINTA}">Manolit∞ certifica que</text>
  <text x="610" y="252" text-anchor="middle" font-size="34" font-weight="700" fill="${GRANATE}">${quien}</text>
  <line x1="360" y1="268" x2="860" y2="268" stroke="${DORADO}" stroke-width="3"/>

  <text x="610" y="310" text-anchor="middle" font-size="20" fill="${TINTA}">ha jugado a «Atrapa a Manolit∞» y ha conseguido ${sellos.length} de 6 sellos de protección del calor,</text>
  <text x="610" y="340" text-anchor="middle" font-size="20" fill="${TINTA}">con ${puntos} puntos y toda la gracia del mundo.</text>
  ${completo ? `<text x="610" y="382" text-anchor="middle" font-size="22" font-weight="700" fill="${GRANATE}">Y con los 6 sellos completos gana también el sello de Simulador de Sombras.</text>` : ''}

  ${selloOficial(44, 64, 0.47)}

  <text x="610" y="452" text-anchor="middle" font-family="monospace" font-size="16" letter-spacing="3" fill="${TEAL}">SELLOS DE PROTECCIÓN CONSEGUIDOS</text>
  ${fila}
  ${final}

  <text x="92" y="724" font-family="monospace" font-size="16" fill="${TINTA}">Día ${escXml(fecha)}</text>
  <text x="1031" y="700" text-anchor="end" font-family="monospace" font-size="12" fill="${TINTA}">Diploma de juego, sin validez oficial ni acreditación.</text>
  <text x="1031" y="720" text-anchor="end" font-family="monospace" font-size="12" fill="${TINTA}">Hecho en tu propio dispositivo. Tu nombre no sale de aquí.</text>
  <text x="1031" y="740" text-anchor="end" font-family="monospace" font-size="12" fill="${TINTA}">manolitoaire.com</text>
</svg>`;
}

/* ============================================================
   PDF mínimo de una página A4 apaisada (841.92 x 595.44 pt) con
   una imagen JPEG a página completa. Sin librerías: el JPEG se
   incrusta tal cual porque PDF entiende /DCTDecode.
   jpegBytes: Uint8Array con un JPEG completo.
   Devuelve Uint8Array con el PDF.
   ============================================================ */
export function construirPDFdesdeJPEG(jpegBytes, anchoPx, altoPx) {
  const W = 841.92, H = 595.44;
  const enc = new TextEncoder();
  const partes = [];   // strings o Uint8Array
  let len = 0;
  const push = (p) => { partes.push(p); len += p.length; };

  push(enc.encode('%PDF-1.4\n'));

  const offsets = [0];
  const obj = (n, cuerpo) => {
    offsets[n] = len;
    push(enc.encode(`${n} 0 obj\n`));
    push(typeof cuerpo === 'string' ? enc.encode(cuerpo) : cuerpo);
    push(enc.encode('\nendobj\n'));
  };

  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R >>`);

  const contenido = `q\n${W} 0 0 ${H} 0 0 cm\n/Im0 Do\nQ\n`;
  obj(4, `<< /Length ${contenido.length} >>\nstream\n${contenido}endstream`);

  offsets[5] = len;
  push(enc.encode(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${anchoPx} /Height ${altoPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`));
  push(jpegBytes);
  push(enc.encode('\nendstream\nendobj\n'));

  const xrefPos = len;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let n = 1; n <= 5; n++) xref += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
  push(enc.encode(xref));
  push(enc.encode(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`));

  const salida = new Uint8Array(len);
  let p = 0;
  for (const parte of partes) { salida.set(parte, p); p += parte.length; }
  return salida;
}

/* ---- helpers de descarga y conversión (solo navegador) ---- */

export function descargarTexto(nombre, texto, tipo) {
  const blob = new Blob([texto], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function descargarSVG(nombre, svgTexto) {
  descargarTexto(nombre, svgTexto, 'image/svg+xml;charset=utf-8');
}

function dataUrlABytes(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/* Rasteriza el SVG a JPEG x2 (nitidez de sobra para imprimir) y
   devuelve { bytes, ancho, alto }. Rechaza si el canvas no puede. */
export async function svgAJpeg(svgTexto) {
  const ESC = 2;
  const ancho = 1123 * ESC, alto = 794 * ESC;
  const url = URL.createObjectURL(new Blob([svgTexto], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    const cargada = new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('svg no cargable'));
    });
    img.src = url;
    await cargada;
    const canvas = document.createElement('canvas');
    canvas.width = ancho; canvas.height = alto;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = PAPEL;
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return { bytes: dataUrlABytes(dataUrl), ancho, alto };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

export async function descargarPDF(nombre, svgTexto) {
  const { bytes, ancho, alto } = await svgAJpeg(svgTexto);
  const pdf = construirPDFdesdeJPEG(bytes, ancho, alto);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
