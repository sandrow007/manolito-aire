/* ============================================================
   CERTIFICADO DE PROTECCIÓN CLIMÁTICA MANOLIT∞
   (07-oct-2026, NUEVA ORDEN de rediseño de Sandro)
   Genera el certificado del juego "Atrapa a Manolit∞" ENTERO en el
   dispositivo. No se envía ni se guarda nada en ningún servidor:
   el nombre solo vive en la memoria de la página y se olvida al
   cerrarla.

   - Nombre serio: fuera "Diploma del juego".
   - Dos mensajes: modo peque (cercano y serio) y modo ciudadano
     (adulto y práctico). Sin nombre propio, fórmula neutra
     ("Esta persona ha completado...").
   - Coherencia de sellos: el número del texto, los sellos dibujados
     y los datos del juego salen de la misma fuente (el array de
     sellos conseguidos). Con menos de 6, solo se dibujan los
     conseguidos. El sello de Simulador de Sombras va aparte, con
     su propia etiqueta, y solo si están los 6.
   - Número de serie MANOLIT∞-AAAA-XXXX-XXXX, aleatorio con
     crypto.getRandomValues, alfabeto sin caracteres confusos
     (sin 0/O ni 1/I). Se genera en el dispositivo, es simbólico:
     no existe registro ni verificación. Se mantiene al descargar
     otra vez en la misma sesión (lo fija el juego al emitir).
   - Diseño sobrio con curvas de nivel e isotermas muy tenues,
     sello oficial de Manolit∞, firma original de Sandro y banda
     holográfica decorativa (símbolo de juego, no seguridad real).

   Dos formatos:
     - SVG vectorial (descarga directa, calidad infinita). Usa
       pilas de fuentes del sistema; el PDF rasteriza el texto a
       imagen, así que allí la tipografía queda incrustada siempre.
     - PDF de una página A4 apaisado, construido a mano (sin
       librerías) incrustando el certificado rasterizado a JPEG.
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

/* ---------------- textos del certificado, los 6 idiomas --------------
   Cada idioma lleva los dos mensajes (peque y ciudadano), con nombre
   y sin nombre. Nada de chistes: tono serio y cálido. Los euskera y
   georgiano son traducción propia, pendientes de revisión humana. */
export const TEXTOS_CERT = {
  es: {
    titulo: 'Certificado de Protección Climática',
    certifica: 'Manolit∞ certifica que',
    kicker: 'SELLOS DE PROTECCIÓN',
    sellos: { sol: 'sol', sombra: 'sombra', salud: 'salud', agua: 'agua', temp: 'temperatura', prevencion: 'prevención' },
    dia: 'Día', serie: 'Serie', firma: 'Firma',
    disc1: 'Certificado simbólico, sin validez oficial ni acreditación.',
    disc2: 'Generado en tu propio dispositivo. Tu nombre no sale de aquí. manolitoaire.com',
    msgPequeCon: (n, p) => `ha completado el juego «Atrapa a Manolit∞» y ha aprendido a protegerse del calor. Con ${n} sellos de protección y ${p} puntos, ya sabe que la sombra, el agua, el descanso y la prevención cuidan a las personas cuando el clima aprieta. Cuidar el clima también es cuidar de los demás.`,
    msgPequeSin: (n, p) => `Esta persona ha completado el juego «Atrapa a Manolit∞» y ha aprendido a protegerse del calor. Con ${n} sellos de protección y ${p} puntos, ya sabe que la sombra, el agua, el descanso y la prevención cuidan a las personas cuando el clima aprieta. Cuidar el clima también es cuidar de los demás.`,
    msgCiudCon: (n, p) => `ha completado el juego «Atrapa a Manolit∞» y ha adquirido conocimientos de protección frente al calor extremo, desde la exposición solar y la sombra hasta la salud, la hidratación, la temperatura y la prevención. Con ${n} sellos de protección y ${p} puntos, contribuye a una ciudad más preparada ante las olas de calor.`,
    msgCiudSin: (n, p) => `Esta persona ha completado el juego «Atrapa a Manolit∞» y ha adquirido conocimientos de protección frente al calor extremo, desde la exposición solar y la sombra hasta la salud, la hidratación, la temperatura y la prevención. Con ${n} sellos de protección y ${p} puntos, contribuye a una ciudad más preparada ante las olas de calor.`
  },
  ca: {
    titulo: 'Certificat de Protecció Climàtica',
    certifica: 'En Manolit∞ certifica que',
    kicker: 'SEGELLS DE PROTECCIÓ',
    sellos: { sol: 'sol', sombra: 'ombra', salud: 'salut', agua: 'aigua', temp: 'temperatura', prevencion: 'prevenció' },
    dia: 'Dia', serie: 'Sèrie', firma: 'Signatura',
    disc1: 'Certificat simbòlic, sense validesa oficial ni acreditació.',
    disc2: 'Generat al teu propi dispositiu. El teu nom no surt d\'aquí. manolitoaire.com',
    msgPequeCon: (n, p) => `ha completat el joc «Atrapa en Manolit∞» i ha après a protegir-se de la calor. Amb ${n} segells de protecció i ${p} punts, ja sap que l'ombra, l'aigua, el descans i la prevenció cuiden les persones quan el clima apreta. Cuidar el clima també és cuidar dels altres.`,
    msgPequeSin: (n, p) => `Aquesta persona ha completat el joc «Atrapa en Manolit∞» i ha après a protegir-se de la calor. Amb ${n} segells de protecció i ${p} punts, ja sap que l'ombra, l'aigua, el descans i la prevenció cuiden les persones quan el clima apreta. Cuidar el clima també és cuidar dels altres.`,
    msgCiudCon: (n, p) => `ha completat el joc «Atrapa en Manolit∞» i ha adquirit coneixements de protecció davant la calor extrema, des de l'exposició solar i l'ombra fins a la salut, la hidratació, la temperatura i la prevenció. Amb ${n} segells de protecció i ${p} punts, contribueix a una ciutat més preparada davant les onades de calor.`,
    msgCiudSin: (n, p) => `Aquesta persona ha completat el joc «Atrapa en Manolit∞» i ha adquirit coneixements de protecció davant la calor extrema, des de l'exposició solar i l'ombra fins a la salut, la hidratació, la temperatura i la prevenció. Amb ${n} segells de protecció i ${p} punts, contribueix a una ciutat més preparada davant les onades de calor.`
  },
  eu: {
    titulo: 'Klima Babes Ziurtagiria',
    certifica: 'Manolit∞-ek ziurtatzen du',
    kicker: 'BABES ZIGILUAK',
    sellos: { sol: 'eguzkia', sombra: 'itzala', salud: 'osasuna', agua: 'ura', temp: 'tenperatura', prevencion: 'prebentzioa' },
    dia: 'Eguna', serie: 'Seriea', firma: 'Sinadura',
    disc1: 'Ziurtagiri sinbolikoa, balio ofizialik edo akreditaziorik gabe.',
    disc2: 'Zure gailuan bertan sortua. Zure izena ez da hemendik ateratzen. manolitoaire.com',
    msgPequeCon: (n, p) => `«Harrapatu Manolit∞» jokoa osatu du eta berotik babestea ikasi du. ${n} babes zigilu eta ${p} punturekin, badaki itzalak, urak, atsedenak eta prebentzioak pertsonak zaintzen dituztela klimak estutzen duenean. Klima zaintzea besteak zaintzea ere bada.`,
    msgPequeSin: (n, p) => `Pertsona honek «Harrapatu Manolit∞» jokoa osatu du eta berotik babestea ikasi du. ${n} babes zigilu eta ${p} punturekin, badaki itzalak, urak, atsedenak eta prebentzioak pertsonak zaintzen dituztela klimak estutzen duenean. Klima zaintzea besteak zaintzea ere bada.`,
    msgCiudCon: (n, p) => `«Harrapatu Manolit∞» jokoa osatu du eta bero muturraren aurkako babes-ezagutzak eskuratu ditu, eguzki-esposiziotik eta itzalatik osasunera, hidrataziora, tenperaturara eta prebentziora. ${n} babes zigilu eta ${p} punturekin, bero-uhinen aurrean hobeto prestatutako hiri batean laguntzen du.`,
    msgCiudSin: (n, p) => `Pertsona honek «Harrapatu Manolit∞» jokoa osatu du eta bero muturraren aurkako babes-ezagutzak eskuratu ditu, eguzki-esposiziotik eta itzalatik osasunera, hidrataziora, tenperaturara eta prebentziora. ${n} babes zigilu eta ${p} punturekin, bero-uhinen aurrean hobeto prestatutako hiri batean laguntzen du.`
  },
  gl: {
    titulo: 'Certificado de Protección Climática',
    certifica: 'Manolit∞ certifica que',
    kicker: 'SELOS DE PROTECCIÓN',
    sellos: { sol: 'sol', sombra: 'sombra', salud: 'saúde', agua: 'auga', temp: 'temperatura', prevencion: 'prevención' },
    dia: 'Día', serie: 'Serie', firma: 'Sinatura',
    disc1: 'Certificado simbólico, sen validez oficial nin acreditación.',
    disc2: 'Xerado no teu propio dispositivo. O teu nome non sae de aquí. manolitoaire.com',
    msgPequeCon: (n, p) => `completou o xogo «Atrapa a Manolit∞» e aprendeu a protexerse da calor. Con ${n} selos de protección e ${p} puntos, xa sabe que a sombra, a auga, o descanso e a prevención coidan as persoas cando o clima aperta. Coidar o clima tamén é coidar dos demais.`,
    msgPequeSin: (n, p) => `Esta persoa completou o xogo «Atrapa a Manolit∞» e aprendeu a protexerse da calor. Con ${n} selos de protección e ${p} puntos, xa sabe que a sombra, a auga, o descanso e a prevención coidan as persoas cando o clima aperta. Coidar o clima tamén é coidar dos demais.`,
    msgCiudCon: (n, p) => `completou o xogo «Atrapa a Manolit∞» e adquiriu coñecementos de protección fronte á calor extrema, desde a exposición solar e a sombra ata a saúde, a hidratación, a temperatura e a prevención. Con ${n} selos de protección e ${p} puntos, contribúe a unha cidade máis preparada fronte ás ondas de calor.`,
    msgCiudSin: (n, p) => `Esta persoa completou o xogo «Atrapa a Manolit∞» e adquiriu coñecementos de protección fronte á calor extrema, desde a exposición solar e a sombra ata a saúde, a hidratación, a temperatura e a prevención. Con ${n} selos de protección e ${p} puntos, contribúe a unha cidade máis preparada fronte ás ondas de calor.`
  },
  en: {
    titulo: 'Climate Protection Certificate',
    certifica: 'Manolit∞ certifies that',
    kicker: 'PROTECTION SEALS',
    sellos: { sol: 'sun', sombra: 'shade', salud: 'health', agua: 'water', temp: 'temperature', prevencion: 'prevention' },
    dia: 'Date', serie: 'Serial', firma: 'Signature',
    disc1: 'A symbolic certificate, with no official validity or accreditation.',
    disc2: 'Generated on your own device. Your name never leaves it. manolitoaire.com',
    msgPequeCon: (n, p) => `has completed the game «Catch Manolit∞» and has learned to protect themselves from the heat. With ${n} protection seals and ${p} points, they know that shade, water, rest and prevention take care of people when the climate presses. Caring for the climate is also caring for others.`,
    msgPequeSin: (n, p) => `This person has completed the game «Catch Manolit∞» and has learned to protect themselves from the heat. With ${n} protection seals and ${p} points, they know that shade, water, rest and prevention take care of people when the climate presses. Caring for the climate is also caring for others.`,
    msgCiudCon: (n, p) => `has completed the game «Catch Manolit∞» and has gained knowledge of protection against extreme heat, from sun exposure and shade to health, hydration, temperature and prevention. With ${n} protection seals and ${p} points, they contribute to a city better prepared for heat waves.`,
    msgCiudSin: (n, p) => `This person has completed the game «Catch Manolit∞» and has gained knowledge of protection against extreme heat, from sun exposure and shade to health, hydration, temperature and prevention. With ${n} protection seals and ${p} points, they contribute to a city better prepared for heat waves.`
  },
  ka: {
    titulo: 'კლიმატისგან დაცვის სერტიფიკატი',
    certifica: 'მანოლიტ∞ ადასტურებს, რომ',
    kicker: 'დაცვის ბეჭდები',
    sellos: { sol: 'მზე', sombra: 'ჩრდილი', salud: 'ჯანმრთელობა', agua: 'წყალი', temp: 'ტემპერატურა', prevencion: 'პრევენცია' },
    dia: 'თარიღი', serie: 'სერია', firma: 'ხელმოწერა',
    disc1: 'სიმბოლური სერტიფიკატი, ოფიციალური ძალისა და აკრედიტაციის გარეშე.',
    disc2: 'შექმნილია შენს მოწყობილობაში. შენი სახელი აქედან არ გადის. manolitoaire.com',
    msgPequeCon: (n, p) => `დაასრულა თამაში «დაიჭირე მანოლიტ∞» და ისწავლა სითბოსგან თავის დაცვა. ${n} დამცავი ბეჭდით და ${p} ქულით ის უკვე იცის, რომ ჩრდილი, წყალი, დასვენება და პრევენცია იცავს ადამიანებს, როცა კლიმატი იმწუხრება. კლიმატის ზრუნვა სხვების ზრუნვაცაა.`,
    msgPequeSin: (n, p) => `ამ პიროვნებამ დაასრულა თამაში «დაიჭირე მანოლიტ∞» და ისწავლა სითბოსგან თავის დაცვა. ${n} დამცავი ბეჭდით და ${p} ქულით ის უკვე იცის, რომ ჩრდილი, წყალი, დასვენება და პრევენცია იცავს ადამიანებს, როცა კლიმატი იმწუხრება. კლიმატის ზრუნვა სხვების ზრუნვაცაა.`,
    msgCiudCon: (n, p) => `დაასრულა თამაში «დაიჭირე მანოლიტ∞» და მოიპოვა ცეცხლოვანი სითბოსგან დაცვის ცოდნა, მზის ზემოქმედებიდან და ჩრდილიდან ჯანმრთელობამდე, ჰიდრატაციამდე, ტემპერატურამდე და პრევენციამდე. ${n} დამცავი ბეჭდით და ${p} ქულით ის უწყობს ხელს ქალაქს უკეთ მოემზადოს სითბოს ტალღებისთვის.`,
    msgCiudSin: (n, p) => `ამ პიროვნებამ დაასრულა თამაში «დაიჭირე მანოლიტ∞» და მოიპოვა ცეცხლოვანი სითბოსგან დაცვის ცოდნა, მზის ზემოქმედებიდან და ჩრდილიდან ჯანმრთელობამდე, ჰიდრატაციამდე, ტემპერატურამდე და პრევენციამდე. ${n} დამცავი ბეჭდით და ${p} ქულით ის უწყობს ხელს ქალაქს უკეთ მოემზადოს სითბოს ტალღებისთვის.`
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
   Número de serie MANOLIT∞-AAAA-XXXX-XXXX. Sale de
   crypto.getRandomValues, con un alfabeto sin caracteres que se
   confunden (sin 0/O ni 1/I). El Set evita repetidos dentro de la
   sesión; sin almacenamiento no se puede garantizar unicidad
   eterna entre dispositivos, y así se dice en la entrega.
   Es simbólico y solo vive en el dispositivo: no es verificable
   ni está registrado en ningún sitio, y el certificado nunca lo
   insinúa.
   ============================================================ */
const credencialesUsadas = new Set();
const ALFABETO_SERIE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function nuevaCredencial() {
  const anio = new Date().getFullYear();
  let c = '';
  do {
    const b = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (let i = 0; i < 8; i++) b[i] = Math.floor(Math.random() * 256);
    const cuerpo = Array.from(b, x => ALFABETO_SERIE[x % ALFABETO_SERIE.length]).join('');
    c = 'MANOLIT∞-' + anio + '-' + cuerpo.slice(0, 4) + '-' + cuerpo.slice(4, 8);
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
      /* Glifo de sombra ORIGINAL DE VERDAD, copiado carácter a
         carácter del diploma original que Sandro ha subido
         (diploma-manolit.svg): la forma blanca con contorno teal
         sobre su sombra gris. Este y ningún otro. */
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

/* Sello de protección conseguido: solo se dibujan los ganados,
   nunca los que faltan apagados. */
function miniSello(id, nombre, cx, cy) {
  return `
  <g>
    <circle cx="${cx}" cy="${cy}" r="50" fill="#FFFFFF" stroke="${GRANATE}" stroke-width="4"/>
    <circle cx="${cx}" cy="${cy}" r="43" fill="none" stroke="${GRANATE}" stroke-width="1.5" stroke-dasharray="4 3"/>
    ${glifoSello(id, cx, cy)}
    <text x="${cx}" y="${cy + 72}" text-anchor="middle" font-family="monospace" font-size="15" fill="${TINTA}">${escXml(nombre)}</text>
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

/* Parte un texto en líneas de como máximo maxCar caracteres
   cortando por palabras. Devuelve array de líneas. */
function partirLineas(texto, maxCar) {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? actual + ' ' + p : p;
    if (prueba.length > maxCar && actual) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/* ============================================================
   construirCertificadoSVG({ nombre, puntos, sellos, fecha, lang,
   credencial, modo })
   - nombre: string (ya recortado) o '' si no se quiso poner
   - puntos: número entero
   - sellos: array de ids conseguidos, p. ej. ['sol','sombra',...]
   - fecha: string ya formateada por el llamador (locale activo)
   - lang: idioma de la plataforma ('es','ca','eu','gl','en','ka');
           cualquier otra cosa cae al español sin romperse
   - credencial: string MANOLIT∞-AAAA-XXXX-XXXX (si falta se genera)
   - modo: 'peque' | 'ciudadano' (cambia solo el mensaje)
   Devuelve el SVG como string (A4 apaisado, 1123x794).

   Coherencia garantizada: el número que dice el texto, los sellos
   dibujados y los datos del juego salen todos del mismo array
   `sellos`; nada se escribe a mano. Solo se dibujan los sellos
   conseguidos. El sello final va aparte, con su propia etiqueta.
   ============================================================ */
export function construirCertificadoSVG({ nombre = '', puntos = 0, sellos = [], fecha = '', lang = 'es', credencial = '', modo = 'peque' } = {}) {
  const tc = textosCertDe(lang);
  const SELLOS = ['sol', 'sombra', 'salud', 'agua', 'temp', 'prevencion'];
  const ganados = SELLOS.filter(id => sellos.includes(id));
  const cred = credencial || nuevaCredencial();

  /* Nombre con auto-ajuste: cuanto más largo, más pequeño, y como
     red de seguridad final textLength lo comprime al hueco. */
  const hayNombre = Boolean(nombre && nombre.trim());
  const nLen = (nombre || '').trim().length;
  const nombreSize = nLen > 30 ? 22 : nLen > 22 ? 27 : 34;
  const ajuste = nLen > 22 ? ' textLength="700" lengthAdjust="spacingAndGlyphs"' : '';
  const nombreTxt = hayNombre
    ? `<text x="610" y="252" text-anchor="middle" font-size="${nombreSize}" font-weight="700" fill="${GRANATE}"${ajuste}>${escXml(nombre.trim())}</text>`
    : '';

  /* Mensaje según modo y según haya nombre o no. */
  const msg = modo === 'ciudadano'
    ? (hayNombre ? tc.msgCiudCon : tc.msgCiudSin)(ganados.length, puntos)
    : (hayNombre ? tc.msgPequeCon : tc.msgPequeSin)(ganados.length, puntos);
  const lineasMsg = partirLineas(msg, 88);
  let msgSVG = '';
  lineasMsg.forEach((l, i) => {
    msgSVG += `<text x="610" y="${308 + i * 24}" text-anchor="middle" font-size="18" fill="${TINTA}">${escXml(l)}</text>`;
  });

  /* Fila de sellos conseguidos, centrada. */
  let fila = '';
  ganados.forEach((id, i) => {
    const cx = 610 + (i - (ganados.length - 1) / 2) * 128;
    fila += miniSello(id, tc.sellos[id] || id, cx, 496);
  });


  return `<svg xmlns="http://www.w3.org/2000/svg" width="1123" height="794" viewBox="0 0 1123 794" font-family="'Segoe UI', system-ui, sans-serif">
  <rect width="1123" height="794" fill="${PAPEL}"/>

  <!-- Fondo: isolíneas de mapa térmico muy tenues y una onda de aire -->
  <g fill="none" stroke="${TEAL}" stroke-width="1.2" opacity="0.06">
    <path d="M-40 120 C 240 40, 520 200, 800 110 S 1180 160, 1200 120"/>
    <path d="M-40 220 C 260 150, 540 300, 830 210 S 1180 260, 1200 220"/>
    <path d="M-40 560 C 240 480, 520 640, 800 550 S 1180 600, 1200 560"/>
    <path d="M-40 660 C 260 590, 540 740, 830 650 S 1180 700, 1200 660"/>
    <circle cx="200" cy="640" r="90"/>
    <circle cx="200" cy="640" r="140"/>
    <circle cx="960" cy="150" r="80"/>
    <circle cx="960" cy="150" r="125"/>
  </g>
  <g fill="none" stroke="${DORADO}" stroke-width="1.4" opacity="0.08">
    <path d="M-40 340 C 200 300, 420 380, 640 340 S 1000 300, 1200 350" stroke-linecap="round"/>
    <path d="M-40 370 C 200 330, 420 410, 640 370 S 1000 330, 1200 380" stroke-linecap="round"/>
  </g>

  <rect x="18" y="18" width="1087" height="758" fill="none" stroke="${GRANATE}" stroke-width="5"/>
  <rect x="30" y="30" width="1063" height="734" fill="none" stroke="${GRANATE}" stroke-width="1.5" stroke-dasharray="8 5"/>

  <text x="610" y="96" text-anchor="middle" font-family="monospace" font-size="22" letter-spacing="6" fill="${GRANATE}">MANOLIT∞ AIRE</text>
  <text x="610" y="150" text-anchor="middle" font-size="42" font-weight="800" fill="${TINTA}">${escXml(tc.titulo)}</text>

  <text x="610" y="205" text-anchor="middle" font-size="22" fill="${TINTA}">${escXml(tc.certifica)}</text>
  ${nombreTxt}
  ${hayNombre ? '<line x1="360" y1="268" x2="860" y2="268" stroke="' + DORADO + '" stroke-width="3"/>' : ''}

  ${msgSVG}

  ${selloOficial(44, 64, 0.47)}

  <text x="610" y="424" text-anchor="middle" font-family="monospace" font-size="15" letter-spacing="3" fill="${TEAL}">${escXml(tc.kicker)}</text>
  ${fila}

  ${bandaHolo()}

  <text x="92" y="690" font-family="monospace" font-size="16" fill="${TINTA}">${escXml(tc.dia)} · ${escXml(fecha)}</text>
  <text x="92" y="712" font-family="monospace" font-size="14" fill="${TEAL}">${escXml(tc.serie)} · ${escXml(cred)}</text>
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
