/* ============================================================
   CERTIFICADO DE MANOLIT∞ (07-oct-2026, orden directa de Sandro)
   Genera el diploma del juego "Atrapa a Manolit∞" ENTERO en el
   dispositivo del niño. No se envía ni se guarda nada en ningún
   servidor: el nombre solo vive en la memoria de la página y se
   olvida al cerrarla.

   Revisión 07-oct-2026 (segunda orden de Sandro):
     - El diploma sale en el idioma elegido en la plataforma
       (es, ca, eu, gl, en, ka), con respaldo limpio al español.
     - Número de credencial aleatorio MJ-XXXX-XXXX en cada diploma
       (crypto.getRandomValues; único dentro de la sesión).
     - Firma de Manolit∞ en la parte inferior, sobre una línea fina,
       con la etiqueta traducida. Geometría y colores exactamente
       los del archivo original de Sandro, en su estado final (sin
       la animación de trazo, que en el PDF saldría a medias).
     - Banda holográfica decorativa (granate/dorado/teal con
       brillos suaves), estática en SVG y PDF. Es solo símbolo de
       juego: no es un elemento de seguridad real.

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

/* ---------------- textos del diploma, los 6 idiomas ---------------- */
export const TEXTOS_CERT = {
  es: {
    titulo: 'Diploma del juego de Manolit∞',
    certifica: 'Manolit∞ certifica que',
    anonimo: 'un peque con mucha cabeza',
    cuerpo1: (s) => `ha jugado a «Atrapa a Manolit∞» y ha conseguido ${s} de 6 sellos de protección del calor,`,
    cuerpo2: (p) => `con ${p} puntos y toda la gracia del mundo.`,
    completo: 'Y con los 6 sellos completos gana también el sello de Simulador de Sombras.',
    kicker: 'SELLOS DE PROTECCIÓN CONSEGUIDOS',
    sellos: { sol: 'sol', sombra: 'sombra', salud: 'salud', agua: 'agua', temp: 'temp.', prevencion: 'prevención' },
    final1: 'SIMULADOR', final2: 'DE SOMBRAS',
    dia: 'Día', credencial: 'Credencial', firma: 'Firma',
    disc1: 'Diploma de juego, sin validez oficial ni acreditación.',
    disc2: 'Hecho en tu propio dispositivo. Tu nombre no sale de aquí. manolitoaire.com'
  },
  ca: {
    titulo: 'Diploma del joc de Manolit∞',
    certifica: 'En Manolit∞ certifica que',
    anonimo: 'un infant amb molta traça',
    cuerpo1: (s) => `ha jugat a «Atrapa en Manolit∞» i ha aconseguit ${s} de 6 segells de protecció de la calor,`,
    cuerpo2: (p) => `amb ${p} punts i tota la gràcia del món.`,
    completo: 'I amb els 6 segells complets guanya també el segell de Simulador d\'Ombres.',
    kicker: 'SEGELLS DE PROTECCIÓ ACONSEGUITS',
    sellos: { sol: 'sol', sombra: 'ombra', salud: 'salut', agua: 'aigua', temp: 'temp.', prevencion: 'prevenció' },
    final1: 'SIMULADOR', final2: 'D\'OMBRES',
    dia: 'Dia', credencial: 'Credencial', firma: 'Signatura',
    disc1: 'Diploma de joc, sense validesa oficial ni acreditació.',
    disc2: 'Fet al teu propi dispositiu. El teu nom no surt d\'aquí. manolitoaire.com'
  },
  eu: {
    titulo: 'Manolit∞ jokoaren diploma',
    certifica: 'Manolit∞-ek ziurtatzen du',
    anonimo: 'buru argi duen txiki bat',
    cuerpo1: (s) => `«Harrapatu Manolit∞» jokuan jolastu du eta beroaren 6 babes zigiluetik ${s} lortu ditu,`,
    cuerpo2: (p) => `${p} puntu eta munduko grazia guztiarekin.`,
    completo: 'Eta 6 zigiluak osatuta, Itzal Simulatzailearen zigilua ere irabazten du.',
    kicker: 'LORTUTAKO BABES ZIGILUAK',
    sellos: { sol: 'eguzkia', sombra: 'itzala', salud: 'osasuna', agua: 'ura', temp: 'tenp.', prevencion: 'prebentzioa' },
    final1: 'ITZAL', final2: 'SIMULATZAILEA',
    dia: 'Eguna', credencial: 'Kredentziala', firma: 'Sinadura',
    disc1: 'Jolaserako diploma, balio ofizialik edo akreditaziorik gabe.',
    disc2: 'Zure gailuan bertan egina. Zure izena ez da hemendik ateratzen. manolitoaire.com'
  },
  gl: {
    titulo: 'Diploma do xogo de Manolit∞',
    certifica: 'Manolit∞ certifica que',
    anonimo: 'un pequeno con moita cabeza',
    cuerpo1: (s) => `xogou a «Atrapa a Manolit∞» e conseguiu ${s} de 6 selos de protección da calor,`,
    cuerpo2: (p) => `con ${p} puntos e toda a graza do mundo.`,
    completo: 'E cos 6 selos completos gaña tamén o selo de Simulador de Sombras.',
    kicker: 'SELOS DE PROTECCIÓN CONSEGUIDOS',
    sellos: { sol: 'sol', sombra: 'sombra', salud: 'saúde', agua: 'auga', temp: 'temp.', prevencion: 'prevención' },
    final1: 'SIMULADOR', final2: 'DE SOMBRAS',
    dia: 'Día', credencial: 'Credencial', firma: 'Sinatura',
    disc1: 'Diploma de xogo, sen validez oficial nin acreditación.',
    disc2: 'Feito no teu propio dispositivo. O teu nome non sae de aquí. manolitoaire.com'
  },
  en: {
    titulo: 'Manolit∞ Game Diploma',
    certifica: 'Manolit∞ certifies that',
    anonimo: 'a kid with a clever head',
    cuerpo1: (s) => `has played «Catch Manolit∞» and earned ${s} of 6 heat protection seals,`,
    cuerpo2: (p) => `with ${p} points and all the grace in the world.`,
    completo: 'And with all 6 seals they also earn the Shadow Simulator seal.',
    kicker: 'PROTECTION SEALS EARNED',
    sellos: { sol: 'sun', sombra: 'shade', salud: 'health', agua: 'water', temp: 'temp.', prevencion: 'prevention' },
    final1: 'SHADOW', final2: 'SIMULATOR',
    dia: 'Date', credencial: 'Credential', firma: 'Signature',
    disc1: 'A play diploma, with no official validity or accreditation.',
    disc2: 'Made on your own device. Your name never leaves it. manolitoaire.com'
  },
  ka: {
    titulo: 'მანოლიტ∞-ის თამაშის დიპლომი',
    certifica: 'მანოლიტ∞ ადასტურებს, რომ',
    anonimo: 'ჭკვიანი ბავშვი',
    cuerpo1: (s) => `ითამაშა «დაიჭირე მანოლიტ∞» და მოიპოვა სითბოსგან დაცვის 6 ბეჭდიდან ${s},`,
    cuerpo2: (p) => `${p} ქულით და მსოფლიოს ყველა მოხურებით.`,
    completo: 'და ყველა 6 ბეჭდით აგრეთვე იგებს ჩრდილების სიმულატორის ბეჭედს.',
    kicker: 'მოპოვებული დაცვის ბეჭდები',
    sellos: { sol: 'მზე', sombra: 'ჩრდილი', salud: 'ჯანმრთელობა', agua: 'წყალი', temp: 'ტემპ.', prevencion: 'პრევენცია' },
    final1: 'ჩრდილების', final2: 'სიმულატორი',
    dia: 'თარიღი', credencial: 'ნომერი', firma: 'ხელმოწერა',
    disc1: 'სათამაშო დიპლომი, ოფიციალური ძალისა და აკრედიტაციის გარეშე.',
    disc2: 'შექმნილია შენს მოწყობილობაში. შენი სახელი აქედან არ გადის. manolitoaire.com'
  }
};

function textosCertDe(lang) {
  const base = TEXTOS_CERT.es;
  const pack = TEXTOS_CERT[lang] || base;
  return new Proxy(pack, {
    get(obj, clave) {
      if (clave in obj) return obj[clave];
      return base[clave];
    }
  });
}

/* ============================================================
   Número de credencial aleatorio, formato MJ-XXXX-XXXX.
   Sale de crypto.getRandomValues (con respaldo a Math.random si
   el navegador no lo tuviera). El Set lo hace único dentro de la
   sesión; sin almacenamiento no se puede garantizar unicidad
   eterna entre dispositivos, y así se dice en la entrega.
   ============================================================ */
const credencialesUsadas = new Set();
export function nuevaCredencial() {
  let c = '';
  do {
    const b = new Uint8Array(4);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (let i = 0; i < 4; i++) b[i] = Math.floor(Math.random() * 256);
    const hex = Array.from(b, x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    c = 'MJ-' + hex.slice(0, 4) + '-' + hex.slice(4, 8);
  } while (credencialesUsadas.has(c));
  credencialesUsadas.add(c);
  return c;
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
function selloFinal(cx, cy, conseguido, tc) {
  const op = conseguido ? '1' : '0.28';
  return `
  <g opacity="${op}">
    <circle cx="${cx}" cy="${cy}" r="58" fill="#FFFFFF" stroke="${DORADO}" stroke-width="5"/>
    <circle cx="${cx}" cy="${cy}" r="50" fill="none" stroke="${GRANATE}" stroke-width="2"/>
    <path d="M ${cx} ${cy - 34} C ${cx - 26} ${cy - 6} ${cx - 26} ${cy + 26} ${cx} ${cy + 42} C ${cx + 26} ${cy + 26} ${cx + 26} ${cy - 6} ${cx} ${cy - 34} Z" fill="none" stroke="${GRANATE}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M ${cx} ${cy - 6} C ${cx - 11} ${cy - 17} ${cx - 11} ${cy + 5} ${cx} ${cy - 6} C ${cx + 11} ${cy - 17} ${cx + 11} ${cy + 5} ${cx} ${cy - 6} Z" fill="none" stroke="${GRANATE}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M ${cx - 22} ${cy + 8} Q ${cx - 11} ${cy + 2} ${cx} ${cy + 8} T ${cx + 22} ${cy + 8}" fill="none" stroke="${TEAL}" stroke-width="3" stroke-linecap="round"/>
    <text x="${cx}" y="${cy + 72}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="700" fill="${GRANATE}">${escXml(tc.final1)}</text>
    <text x="${cx}" y="${cy + 87}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="700" fill="${GRANATE}">${escXml(tc.final2)}</text>
  </g>`;
}

/* ---- Banda holográfica decorativa (como la de las tarjetas).
   Degradado iridiscente entre los colores de marca con brillos
   suaves. Es símbolo de juego, no elemento de seguridad real.
   El rect con clase jm-holo-anim solo se mueve en la vista previa
   de la página (el CSS vive allí): en el archivo descargado y en
   el PDF la banda es completamente estática. ---- */
function bandaHolo() {
  return `
  <defs>
    <linearGradient id="certHolo" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${GRANATE}"/>
      <stop offset="0.22" stop-color="${DORADO}"/>
      <stop offset="0.5" stop-color="${TEAL}"/>
      <stop offset="0.78" stop-color="${DORADO}"/>
      <stop offset="1" stop-color="${GRANATE}"/>
    </linearGradient>
    <linearGradient id="certHoloBrillo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="0.35" stop-color="#FFFFFF" stop-opacity="0.05"/>
      <stop offset="0.65" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <pattern id="certHoloLineas" width="3" height="37" patternUnits="userSpaceOnUse">
      <rect width="1" height="37" fill="#FFFFFF" opacity="0.08"/>
    </pattern>
    <clipPath id="certHoloClip"><rect x="60" y="615" width="1003" height="37" rx="9"/></clipPath>
  </defs>
  <rect x="60" y="615" width="1003" height="37" rx="9" fill="url(#certHolo)" opacity="0.92"/>
  <rect x="60" y="615" width="1003" height="37" rx="9" fill="url(#certHoloLineas)"/>
  <rect x="60" y="615" width="1003" height="37" rx="9" fill="url(#certHoloBrillo)"/>
  <g clip-path="url(#certHoloClip)">
    <g class="jm-holo-anim"><rect x="60" y="615" width="150" height="37" fill="#FFFFFF" opacity="0.28" transform="skewX(-18)"/></g>
  </g>
  <rect x="60" y="615" width="1003" height="37" rx="9" fill="none" stroke="${GRANATE}" stroke-width="1.5" opacity="0.5"/>`;
}

/* ---- Firma de Manolit∞. Geometría y colores copiados tal cual
   del archivo original de Sandro (viewBox 0 0 1000 400): la
   palabra "Manolit" y el trazo de la 't' que muta hacia el
   infinito, con su sombra térmica azul. Se integra en su estado
   final, sin la animación de trazo (si se animara, el PDF la
   rasterizaría a medio dibujar). La cuadrícula cartográfica del
   original era el fondo de la página de firma, no parte de la
   firma, y no se incluye. ---- */
function firmaSVG(x, y, escala) {
  return `
  <defs>
    <filter id="certFirmaBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
  </defs>
  <g transform="translate(${x}, ${y}) scale(${escala})">
    <g fill="none" stroke="#3b82f6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.25" transform="translate(6, 10)" filter="url(#certFirmaBlur)">
      <path d="M 150 230
        C 150 150, 200 120, 210 200
        C 210 250, 220 250, 220 200
        C 220 150, 270 120, 280 200
        C 280 250, 290 250, 300 230
        C 320 200, 290 200, 290 230
        C 290 260, 340 260, 340 230
        C 340 200, 340 250, 360 230
        C 360 190, 380 190, 380 220
        C 380 250, 390 250, 390 220
        C 390 190, 420 190, 420 220
        C 420 250, 430 250, 440 230
        C 460 200, 430 200, 430 230
        C 430 260, 480 260, 480 230
        C 480 200, 460 210, 490 200
        C 510 100, 540 80, 530 150
        C 520 250, 540 250, 550 230
        C 560 190, 570 190, 570 230
        C 570 250, 580 250, 590 230
        C 600 120, 610 120, 610 160
        C 610 250, 630 250, 640 230" />
      <path d="M 560 170
        C 620 160, 680 120, 740 120
        C 820 120, 850 180, 800 240
        C 750 300, 680 120, 600 120
        C 520 120, 490 180, 540 240
        C 590 300, 680 200, 780 200
        C 850 200, 920 220, 950 180" />
    </g>
    <g fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 150 230
        C 150 150, 200 120, 210 200
        C 210 250, 220 250, 220 200
        C 220 150, 270 120, 280 200
        C 280 250, 290 250, 300 230
        C 320 200, 290 200, 290 230
        C 290 260, 340 260, 340 230
        C 340 200, 340 250, 360 230
        C 360 190, 380 190, 380 220
        C 380 250, 390 250, 390 220
        C 390 190, 420 190, 420 220
        C 420 250, 430 250, 440 230
        C 460 200, 430 200, 430 230
        C 430 260, 480 260, 480 230
        C 480 200, 460 210, 490 200
        C 510 100, 540 80, 530 150
        C 520 250, 540 250, 550 230
        C 560 190, 570 190, 570 230
        C 570 250, 580 250, 590 230
        C 600 120, 610 120, 610 160
        C 610 250, 630 250, 640 230" />
      <path d="M 560 170
        C 620 160, 680 120, 740 120
        C 820 120, 850 180, 800 240
        C 750 300, 680 120, 600 120
        C 520 120, 490 180, 540 240
        C 590 300, 680 200, 780 200
        C 850 200, 920 220, 950 180" />
    </g>
    <circle cx="576" cy="160" r="4.5" fill="#3b82f6" filter="url(#certFirmaBlur)"/>
    <circle cx="570" cy="150" r="4.5" fill="#111827"/>
  </g>`;
}

/* ============================================================
   construirCertificadoSVG({ nombre, puntos, sellos, fecha, lang,
   credencial })
   - nombre: string (ya recortado) o '' si el niño no quiso ponerlo
   - puntos: número entero
   - sellos: array de ids conseguidos, p. ej. ['sol','sombra',...]
   - fecha: string ya formateada por el llamador (locale del niño)
   - lang: idioma de la plataforma ('es','ca','eu','gl','en','ka');
           cualquier otra cosa cae al español sin romperse
   - credencial: string MJ-XXXX-XXXX (si falta se genera una)
   Devuelve el SVG como string (A4 apaisado, 1123x794).
   ============================================================ */
export function construirCertificadoSVG({ nombre = '', puntos = 0, sellos = [], fecha = '', lang = 'es', credencial = '' } = {}) {
  const tc = textosCertDe(lang);
  const SELLOS = ['sol', 'sombra', 'salud', 'agua', 'temp', 'prevencion'];
  const completo = SELLOS.every(id => sellos.includes(id));
  const quien = nombre ? escXml(nombre) : escXml(tc.anonimo);
  const cred = credencial || nuevaCredencial();

  let fila = '';
  SELLOS.forEach((id, i) => {
    fila += miniSello(id, tc.sellos[id] || id, 236 + i * 130, 505, sellos.includes(id));
  });
  const final = selloFinal(236 + 6 * 130 + 10, 505, completo, tc);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1123" height="794" viewBox="0 0 1123 794" font-family="'Segoe UI', system-ui, sans-serif">
  <rect width="1123" height="794" fill="${PAPEL}"/>
  <rect x="18" y="18" width="1087" height="758" fill="none" stroke="${GRANATE}" stroke-width="5"/>
  <rect x="30" y="30" width="1063" height="734" fill="none" stroke="${GRANATE}" stroke-width="1.5" stroke-dasharray="8 5"/>

  <text x="610" y="96" text-anchor="middle" font-family="monospace" font-size="22" letter-spacing="6" fill="${GRANATE}">MANOLIT∞ AIRE</text>
  <text x="610" y="150" text-anchor="middle" font-size="44" font-weight="800" fill="${TINTA}">${escXml(tc.titulo)}</text>

  <text x="610" y="205" text-anchor="middle" font-size="22" fill="${TINTA}">${escXml(tc.certifica)}</text>
  <text x="610" y="252" text-anchor="middle" font-size="34" font-weight="700" fill="${GRANATE}">${quien}</text>
  <line x1="360" y1="268" x2="860" y2="268" stroke="${DORADO}" stroke-width="3"/>

  <text x="610" y="310" text-anchor="middle" font-size="20" fill="${TINTA}">${escXml(tc.cuerpo1(sellos.length))}</text>
  <text x="610" y="340" text-anchor="middle" font-size="20" fill="${TINTA}">${escXml(tc.cuerpo2(puntos))}</text>
  ${completo ? `<text x="610" y="382" text-anchor="middle" font-size="22" font-weight="700" fill="${GRANATE}">${escXml(tc.completo)}</text>` : ''}

  ${selloOficial(44, 64, 0.47)}

  <text x="610" y="430" text-anchor="middle" font-family="monospace" font-size="16" letter-spacing="3" fill="${TEAL}">${escXml(tc.kicker)}</text>
  ${fila}
  ${final}

  ${bandaHolo()}

  <text x="92" y="690" font-family="monospace" font-size="16" fill="${TINTA}">${escXml(tc.dia)} · ${escXml(fecha)}</text>
  <text x="92" y="712" font-family="monospace" font-size="14" fill="${TEAL}">${escXml(tc.credencial)} · ${escXml(cred)}</text>
  <text x="92" y="742" font-family="monospace" font-size="11" fill="${TINTA}">${escXml(tc.disc1)}</text>
  <text x="92" y="757" font-family="monospace" font-size="11" fill="${TINTA}">${escXml(tc.disc2)}</text>

  ${firmaSVG(828, 656, 0.19)}
  <line x1="828" y1="736" x2="1048" y2="736" stroke="${TINTA}" stroke-width="1.5"/>
  <text x="938" y="752" text-anchor="middle" font-family="monospace" font-size="13" fill="${TINTA}">${escXml(tc.firma)}</text>
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
