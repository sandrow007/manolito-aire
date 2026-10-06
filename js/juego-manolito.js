/* ============================================================
   «ATRAPA A MANOLIT∞» (07-oct-2026, orden directa de Sandro)
   Juego educativo de la sección de niños (modo peque). Sustituye
   al antiguo «Atrapa el Sol»: ahora se atrapa a Manolit∞, no al
   sol, y cada nivel enseña de verdad uno de los 6 sellos de
   protección del calor que ya existen en la web (sol, sombra,
   salud, agua, temp y prevención). Con los 6 se desbloquea el
   sello final de Simulador de Sombras y el diploma descargable.

   Decisiones de calidad (batería, memoria, accesibilidad):
     - Sin requestAnimationFrame: un solo setInterval de 250 ms
       gobierna spawns, caducidades, marcador y fin de nivel.
     - La caída de las piezas es animación CSS con transform
       (GPU), pausable entera con una clase y animation-play-state.
     - Pausa total con la pestaña oculta: intervalo parado, CSS
       pausado y relojes por hora real desplazados al volver, así
       ningún temporizador se "adelanta" ni se acumula trabajo.
     - Sin localStorage: puntos y sellos viven solo en memoria y
       mueren al cerrar. El diploma se genera en el dispositivo.
     - Piezas y botones de 56/44 px mínimo, foco visible, Escape
       cierra, aria-live para consejos y resultados, y con
       prefers-reduced-motion las piezas no caen: aparecen quietas.
     - destruir() lo deja todo limpio: intervalo, listeners y DOM.
   ============================================================ */

/* ---------------- contenido educativo (español) ----------------
   Tono de peque con gracia andaluza, ciencia correcta y cero
   cifras inventadas. La traducción a los otros 5 idiomas está
   pendiente de decisión de Sandro: los textos de interfaz sí van
   por i18n.js (claves game*), este corpus educativo va en español
   hasta que él diga. */
export const INTRO_QUE_ES = [
  'Manolit∞ Aire es una web que te enseña cómo está el aire de tu ciudad ahora mismo. Si está limpio o suceao, si hace calor y por dónde hay sombra.',
  'Dibuja en el mapa las sombras de los edificios y los árboles, como un simulador. Así ves qué calles van a la sombra y cuáles van al sol.',
  'Sirve para ir al cole o al parque sin achicharrarte. Pones de dónde sales y a dónde vas, y te busca el camino con más sombrita.',
  'La sombra importa un montón. Cuando aprieta el calor, andar por la sombra es la diferencia entre un paseo bueno y un paseo malo.',
  'Puedes usarlo con un mayor. Eliges tu ciudad, miras el mapa y le das al botón de la ruta. Es gratis, sin anuncios, y tu nombre no sale de aquí.'
];

export const NIVELES = [
  {
    id: 'sol', nombre: 'El sol', sello: 'sol',
    duracion: 28, objetivo: 8, spawnMs: 750, caidaMs: 2600, probTema: 0.30, temaPuntos: 0,
    consejoCampo: 'Atrapa a los Manolit∞ y esquiva los soles, que a estas horas achicharran.',
    lecciones: [
      'El sol nos da luz y calorcito, pero entre las 12 y las 5 de la tarde pega tan fuerte que puede quemar la piel aunque no te des cuenta.',
      'La radiación UV no se ve ni se nota al momento. Por eso existe el índice UV, un número que avisa de cuándo aprieta de verdad.',
      'Cuando el UV pasa de 6 toca crema, sombrero y sombrita cada rato. El sol no perdona, miarma.'
    ],
    pregunta: '¿A qué horas aprieta más el sol en verano?',
    opciones: ['Por la mañana tempranito', 'Entre las 12 y las 5 de la tarde', 'Cuando se hace de noche'],
    correcta: 1,
    fbOk: '¡Eso es! A esas horas el sol cae casi de plano y es cuando más quema.',
    fbNo: 'Casi, miarma. A esas horas el sol está bajito y calienta poquito. La hora mala es del mediodía a la tarde.'
  },
  {
    id: 'sombra', nombre: 'La sombra', sello: 'sombra',
    duracion: 28, objetivo: 9, spawnMs: 720, caidaMs: 2400, probTema: 0.30, temaPuntos: 15,
    consejoCampo: 'Las nubes dan sombrita. Atrápalas también, que valen más puntos.',
    lecciones: [
      'Pasar del sol a la sombra refresca un montón y se nota enseguida. No es un capricho, es protección de verdad.',
      'Los árboles, los toldos, los porches y las calles estrechas son sombras que ya existen. Usarlas es cuidarte.',
      'Manolit∞ Aire dibuja las sombras en el mapa para que sepas por dónde ir fresquito.'
    ],
    pregunta: '¿Dónde se está más fresquito en verano?',
    opciones: ['En medio de la plaza al sol', 'Debajo de un árbol o un toldo', 'Encima del asfalto'],
    correcta: 1,
    fbOk: '¡Olé! La sombra es como un techo que te regala la calle.',
    fbNo: 'Mira, miarma. Al sol o en el asfalto el calor se acumula. La fresquita está debajo de un árbol o un toldo.'
  },
  {
    id: 'salud', nombre: 'Tu cuerpo', sello: 'salud',
    duracion: 28, objetivo: 10, spawnMs: 690, caidaMs: 2250, probTema: 0.28, temaPuntos: 15,
    consejoCampo: 'Los corazones son tu cuerpo diciéndote gracias. Cógelos.',
    lecciones: [
      'El calor fuerte no afecta igual a todo el mundo. A los peques, a los yayos y a quien trabaja en la calle les pega antes y más fuerte.',
      'Si te duele la cabeza o te mareas con calor, tu cuerpo te está pidiendo sombra y agua a gritos.',
      'Cuidarse empieza por saber escucharse. Y por cuidar también a quien tienes al lado.'
    ],
    pregunta: 'Si un amigo se marea con calor, ¿qué hacemos?',
    opciones: ['Seguir jugando al sol', 'Darle un abrigo bien gordo', 'Llevarlo a la sombra y avisar a un mayor'],
    correcta: 2,
    fbOk: '¡Perfecto! Sombra, agüita y un mayor. Así se cuida a la gente.',
    fbNo: 'No, miarma. Con mareo hay que ir a la sombra, darle agua y avisar a un mayor.'
  },
  {
    id: 'agua', nombre: 'El agua', sello: 'agua',
    duracion: 26, objetivo: 11, spawnMs: 660, caidaMs: 2100, probTema: 0.28, temaPuntos: 15,
    consejoCampo: 'Las gotas son agüita fresca. Atrápate unas cuantas.',
    lecciones: [
      'Con calor el cuerpo pierde agua más rápido de lo que crees, aunque no tengas sed.',
      'El truco es beber a traguitos muchas veces durante el día. Esperar a tener sed es llegar tarde.',
      'Las fuentes y el agua fresquita en la calle también son salud para todo el barrio.'
    ],
    pregunta: '¿Cuándo hay que beber agua con calor?',
    opciones: ['Solo cuando tenga mucha sed', 'A traguitos y muchas veces, aunque no tenga sed', 'Solo antes de dormir'],
    correcta: 1,
    fbOk: '¡Eso es! A traguitos y a menudo, que el cuerpo lo agradece.',
    fbNo: 'Casi. Cuando tienes mucha sed el cuerpo ya va con retraso. Mejor a traguitos todo el día.'
  },
  {
    id: 'temp', nombre: 'Cada calle es un mundo', sello: 'temp',
    duracion: 26, objetivo: 12, spawnMs: 620, caidaMs: 1950, probTema: 0.26, temaPuntos: 15,
    consejoCampo: 'Los termómetros cuentan el calor de cada calle. Cógelos.',
    lecciones: [
      'Dos calles del mismo barrio pueden tener temperaturas muy distintas. El asfalto guarda el calor y los parques lo sueltan.',
      'A eso se le llama isla de calor. No es un cuento, es tu propio barrio.',
      'Por eso unas calles achicharran y otras no. Elegir calle es elegir temperatura.'
    ],
    pregunta: '¿Qué calle estará más fresquita?',
    opciones: ['La ancha de asfalto sin árboles', 'El aparcamiento al sol', 'La estrecha y con árboles'],
    correcta: 2,
    fbOk: '¡Claro que sí! Estrecha y con árboles, sombra casi segura.',
    fbNo: 'Esa no, miarma. El asfalto ancho y sin árboles guarda el calor como una sartén.'
  },
  {
    id: 'prevencion', nombre: 'Prepararse antes', sello: 'prevencion',
    duracion: 25, objetivo: 13, spawnMs: 580, caidaMs: 1800, probTema: 0.26, temaPuntos: 15,
    consejoCampo: 'Los escudos son de quien se prepara. A por ellos.',
    lecciones: [
      'Las olas de calor se anuncian días antes. Prepararse es ganar.',
      'Busca tu refugio fresquito. Una biblioteca, un centro cívico o tu casa con las persianas bajadas en las horas malas.',
      'Y esos días mira cómo están los yayos y los peques de tu barrio. Es lo más efectivo que existe.'
    ],
    pregunta: 'Si anuncian ola de calor para mañana, ¿qué es lo listo?',
    opciones: ['No hacer nada, que ya pasará', 'Salir a correr al mediodía', 'Preparar agua, bajar persianas y localizar un sitio fresco'],
    correcta: 2,
    fbOk: '¡Esa es la actitud! Quien se prepara se ríe del calor.',
    fbNo: 'Qué va. Lo listo es prepararse antes. Agua, persianas y un sitio fresco localizado.'
  }
];

/* ---------------- sprites SVG (lenguaje Manolit) ---------------- */
const GRANATE = '#7A0016', DORADO = '#E6A100', TEAL = '#007A87';

/* La mascota Manolit∞: cuerpo de gota con su infinito, ondas teal,
   círculo dorado, piernas y brazos que andan en contrafase. */
const SVG_MASCOTA = `<svg viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="overflow:visible">
  <g class="jm-pierna-izq" style="transform-origin:60px 118px">
    <path d="M 60,118 L 45,155" stroke="${GRANATE}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <ellipse cx="43" cy="158" rx="7" ry="4.5" fill="${GRANATE}"/>
  </g>
  <g class="jm-pierna-der" style="transform-origin:60px 118px">
    <path d="M 60,118 L 75,155" stroke="${GRANATE}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <ellipse cx="77" cy="158" rx="7" ry="4.5" fill="${GRANATE}"/>
  </g>
  <g class="jm-brazo-izq" style="transform-origin:26px 76px">
    <path d="M 26,76 L 6,104" stroke="${GRANATE}" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="5" cy="106" r="4.5" fill="${DORADO}" stroke="${GRANATE}" stroke-width="2.5"/>
  </g>
  <g class="jm-brazo-der" style="transform-origin:94px 76px">
    <path d="M 94,76 L 114,104" stroke="${GRANATE}" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="115" cy="106" r="4.5" fill="${DORADO}" stroke="${GRANATE}" stroke-width="2.5"/>
  </g>
  <path d="M 60,18 C 22,58 22,108 60,132 C 98,108 98,58 60,18 Z" fill="rgba(2,4,6,0.35)" stroke="${GRANATE}" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="60" cy="63" r="26" fill="${DORADO}"/>
  <path d="M 40,68 Q 50,61 60,68 T 80,68" fill="none" stroke="${TEAL}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 43,75 Q 51.5,69.5 60,75 T 77,75" fill="none" stroke="${TEAL}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M 60,58 C 45,42 45,72 60,58 C 75,42 75,72 60,58 Z" fill="none" stroke="${GRANATE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SVG_NUBE = `<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="overflow:visible">
  <path d="M 34,72 A 16,16 0 0 1 36,42 A 20,20 0 0 1 72,28 A 17,17 0 0 1 102,46 A 13,13 0 0 1 98,72 Z" fill="rgba(2,4,6,0.35)" stroke="${GRANATE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M 44,56 Q 54,50 64,56 T 84,56" fill="none" stroke="${TEAL}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 48,64 Q 56,59 64,64 T 80,64" fill="none" stroke="${TEAL}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M 60,74 C 55,81 55,86 60,89 C 65,86 65,81 60,74 Z" fill="${DORADO}"/>
</svg>`;

const SVG_SOL = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="${DORADO}" stroke-width="4" stroke-linecap="round">
    <line x1="45" y1="6" x2="45" y2="16"/><line x1="45" y1="74" x2="45" y2="84"/>
    <line x1="6" y1="45" x2="16" y2="45"/><line x1="74" y1="45" x2="84" y2="45"/>
    <line x1="17" y1="17" x2="24" y2="24"/><line x1="66" y1="66" x2="73" y2="73"/>
    <line x1="73" y1="17" x2="66" y2="24"/><line x1="24" y1="66" x2="17" y2="73"/>
  </g>
  <circle cx="45" cy="45" r="19" fill="${DORADO}" stroke="${GRANATE}" stroke-width="4"/>
</svg>`;

const SVG_CORAZON = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M45 76 C22 58 12 44 12 30 C12 19 21 12 30 12 C37 12 42 16 45 22 C48 16 53 12 60 12 C69 12 78 19 78 30 C78 44 68 58 45 76 Z" fill="${GRANATE}"/>
  <line x1="45" y1="32" x2="45" y2="52" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
  <line x1="35" y1="42" x2="55" y2="42" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
</svg>`;

const SVG_GOTA = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M45 10 C45 10 22 40 22 56 C22 70 32 80 45 80 C58 80 68 70 68 56 C68 40 45 10 45 10 Z" fill="${TEAL}"/>
  <ellipse cx="37" cy="52" rx="5" ry="9" fill="#FFFFFF" opacity="0.5"/>
</svg>`;

const SVG_TERMO = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="39" y="8" width="12" height="46" rx="6" fill="#FFFFFF" stroke="${GRANATE}" stroke-width="4"/>
  <circle cx="45" cy="66" r="15" fill="${GRANATE}"/>
  <rect x="41" y="30" width="8" height="34" fill="${GRANATE}"/>
</svg>`;

const SVG_ESCUDO = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M45 8 L76 20 L76 44 C76 63 63 75 45 82 C27 75 14 63 14 44 L14 20 Z" fill="${DORADO}"/>
  <path d="M32 44 L41 54 L60 32" stroke="${GRANATE}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SPRITES = { mascota: SVG_MASCOTA, sol: SVG_SOL, sombra: SVG_NUBE, salud: SVG_CORAZON, agua: SVG_GOTA, temp: SVG_TERMO, prevencion: SVG_ESCUDO };
const NOMBRES_PIEZA = { mascota: 'Manolit∞', sol: 'sol, de los que achicharran', sombra: 'nube de sombra', salud: 'corazón', agua: 'gota de agua', temp: 'termómetro', prevencion: 'escudo' };

/* ---------------- estilos del juego (se inyectan una vez) ---------------- */
function ponerEstilos() {
  if (document.getElementById('jmEstilos')) return;
  const st = document.createElement('style');
  st.id = 'jmEstilos';
  st.textContent = `
.jm-panel{ width:min(680px,100%); margin:14px auto 0; padding:14px 14px 18px; box-sizing:border-box;
  background:var(--surface, rgba(255,255,255,0.92)); border:2px solid ${GRANATE}; border-radius:18px;
  color:var(--ink, #0D1F26); font-family:var(--font-body, system-ui, sans-serif); }
.jm-cab{ display:flex; align-items:center; gap:10px; }
.jm-cab-mascota{ width:44px; flex:none; }
.jm-cab-mascota svg{ width:100%; height:auto; display:block; }
.jm-titulo{ font-size:1.25rem; font-weight:800; margin:0; color:${GRANATE}; flex:1; }
.jm-x{ min-width:44px; min-height:44px; border-radius:12px; border:2px solid ${GRANATE}; background:#fff;
  color:${GRANATE}; font-size:1.15rem; font-weight:700; cursor:pointer; }
.jm-sellos{ display:flex; gap:6px; justify-content:center; margin:10px 0 4px; flex-wrap:wrap; }
.jm-sello{ width:44px; text-align:center; font-family:var(--font-mono, monospace); font-size:11px;
  color:${GRANATE}; opacity:0.3; }
.jm-sello svg{ width:40px; height:40px; display:block; margin:0 auto; }
.jm-sello.jm-ok{ opacity:1; }
.jm-burbuja{ position:relative; background:#fff; border:2px solid ${GRANATE}; border-radius:14px;
  padding:10px 12px; margin:8px 0 10px; font-size:0.98rem; line-height:1.45; min-height:44px; }
.jm-burbuja::before{ content:''; position:absolute; top:-9px; left:26px; width:14px; height:14px;
  background:#fff; border-left:2px solid ${GRANATE}; border-top:2px solid ${GRANATE};
  transform:rotate(45deg); }
.jm-cuerpo{ min-height:220px; }
.jm-leccion{ font-size:1rem; line-height:1.5; margin:0 0 10px; }
.jm-kicker{ font-family:var(--font-mono, monospace); font-size:0.8rem; letter-spacing:0.08em;
  color:${TEAL}; text-transform:uppercase; margin:0 0 6px; }
.jm-h3{ font-size:1.3rem; color:${GRANATE}; margin:2px 0 8px; }
.jm-marc{ display:flex; justify-content:space-between; gap:8px; font-family:var(--font-mono, monospace);
  font-size:0.95rem; margin:0 0 8px; }
.jm-campo{ position:relative; height:clamp(240px, 42vh, 400px); overflow:hidden; border-radius:14px;
  border:2px solid ${GRANATE};
  background:linear-gradient(180deg, #8fd3ff 0%, #d7f1ff 70%, #eafaf1 100%); touch-action:manipulation; }
.jm-pieza{ position:absolute; top:-72px; left:0; width:56px; height:56px; padding:0; border:none;
  background:transparent; cursor:pointer; will-change:transform;
  animation:jmCae var(--jm-caida, 2400ms) linear forwards; }
.jm-pieza svg{ width:100%; height:100%; display:block; overflow:visible; pointer-events:none; }
.jm-pieza:focus-visible{ outline:3px solid ${GRANATE}; outline-offset:2px; border-radius:12px; }
.jm-pieza.jm-cogida{ animation:none; transition:opacity .18s ease, transform .18s ease; opacity:0; }
.jm-pop{ position:absolute; font-family:var(--font-mono, monospace); font-weight:700; color:${GRANATE};
  pointer-events:none; animation:jmPop .5s ease-out forwards; }
.jm-campo.jm-pausa .jm-pieza, .jm-campo.jm-pausa .jm-pop{ animation-play-state:paused; }
.jm-campo.jm-pausa .jm-pieza *, .jm-campo.jm-pausa svg *{ animation-play-state:paused !important; }
.jm-btn{ display:inline-block; min-height:44px; padding:10px 18px; margin:8px 8px 0 0; border-radius:12px;
  border:2px solid ${GRANATE}; background:${DORADO}; color:#2A1A05; font-weight:700; font-size:1rem;
  cursor:pointer; }
.jm-btn.jm-sec{ background:#fff; color:${GRANATE}; }
.jm-btn:focus-visible{ outline:3px solid ${TEAL}; outline-offset:2px; }
.jm-ops{ display:flex; flex-direction:column; gap:8px; margin-top:8px; }
.jm-ops .jm-btn{ width:100%; margin:0; text-align:left; }
.jm-fb{ font-weight:700; margin-top:10px; }
.jm-fb.jm-bien{ color:#0B6B44; }
.jm-fb.jm-casi{ color:${GRANATE}; }
.jm-res{ list-style:none; padding:0; margin:8px 0; }
.jm-res li{ padding:4px 0; font-size:1rem; }
.jm-nombre{ width:100%; max-width:320px; min-height:44px; font-size:1rem; padding:8px 10px;
  border:2px solid ${GRANATE}; border-radius:10px; margin-top:6px; }
.jm-nota{ font-size:0.85rem; color:${TEAL}; margin-top:6px; }
.jm-puntos-intro{ display:flex; gap:6px; justify-content:center; margin:6px 0 2px; }
.jm-punto{ width:10px; height:10px; border-radius:50%; background:${GRANATE}; opacity:0.25; }
.jm-punto.jm-act{ opacity:1; }
@keyframes jmCae{ to{ transform:translateY(720px); } }
@keyframes jmPop{ 0%{ opacity:0; transform:translateY(6px); } 25%{ opacity:1; } 100%{ opacity:0; transform:translateY(-16px); } }
@keyframes jmVaivenPierna{ 0%,100%{ transform:rotate(7deg); } 50%{ transform:rotate(-7deg); } }
@keyframes jmVaivenBrazo{ 0%,100%{ transform:rotate(8deg); } 50%{ transform:rotate(-8deg); } }
.jm-pieza .jm-pierna-izq, .jm-cab-mascota .jm-pierna-izq{ animation:jmVaivenPierna 1.6s ease-in-out infinite; }
.jm-pieza .jm-pierna-der, .jm-cab-mascota .jm-pierna-der{ animation:jmVaivenPierna 1.6s ease-in-out -0.8s infinite; }
.jm-pieza .jm-brazo-izq, .jm-cab-mascota .jm-brazo-izq{ animation:jmVaivenBrazo 1.6s ease-in-out -0.8s infinite; }
.jm-pieza .jm-brazo-der, .jm-cab-mascota .jm-brazo-der{ animation:jmVaivenBrazo 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce){
  .jm-pieza{ animation:none; }
  .jm-pieza *, .jm-cab-mascota *{ animation:none !important; }
  .jm-pop{ animation-duration:0.001s; }
}`;
  document.head.appendChild(st);
}

/* ---------------- utilidades ---------------- */
function nodo(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto != null) el.textContent = texto;
  return el;
}

let introVista = false; // solo en memoria: la intro se ve una vez por visita

/* ============================================================
   iniciarJuegoManolit(contenedor, opciones)
   opciones:
     - t: función i18n (clave, respaldo) para los textos de interfaz
     - decir: función opcional para leer en voz alta (solo si la
       voz ya tiene permiso, lo decide quien la pasa)
     - onCerrar: callback al cerrar el panel (para devolver el foco)
     - cargarCertificado: función que importa js/certificado-manolito.js
   Devuelve { destruir }.
   ============================================================ */
export function iniciarJuegoManolit(contenedor, opciones = {}) {
  const t = typeof opciones.t === 'function' ? opciones.t : (k, fb) => fb;
  const decir = typeof opciones.decir === 'function' ? opciones.decir : () => {};
  const onCerrar = typeof opciones.onCerrar === 'function' ? opciones.onCerrar : () => {};
  const cargarCert = opciones.cargarCertificado || (() => import('./certificado-manolito.js'));
  const reduceMov = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  ponerEstilos();

  /* ---- estado de la partida (solo memoria) ---- */
  const estado = {
    pantalla: 'intro', pasoIntro: 0, nivel: 0,
    puntos: 0, atrapados: 0, sellos: [],
    enJuego: false, pausado: false,
    finEnMs: 0, ultimoSpawnMs: 0, piezas: [], llevadas: 0,
    intervalo: null, pausaEnMs: 0, ultimoTextoMarc: ''
  };

  /* ---- esqueleto del panel ---- */
  contenedor.innerHTML = '';
  const panel = nodo('div', 'jm-panel');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', t('gameTitle', 'Atrapa a Manolit∞'));

  const cab = nodo('div', 'jm-cab');
  const mascotaCab = nodo('div', 'jm-cab-mascota');
  mascotaCab.innerHTML = SVG_MASCOTA;
  const titulo = nodo('h3', 'jm-titulo', t('gameTitle', 'Atrapa a Manolit∞'));
  titulo.id = 'jmTitulo';
  const btnX = nodo('button', 'jm-x', '✕');
  btnX.type = 'button';
  btnX.setAttribute('aria-label', t('gameCloseAria', 'Cerrar el juego de Manolit∞'));
  cab.append(mascotaCab, titulo, btnX);

  const muro = nodo('div', 'jm-sellos');
  muro.setAttribute('aria-label', 'Sellos de protección');

  const burbuja = nodo('div', 'jm-burbuja');
  burbuja.setAttribute('aria-live', 'polite');

  const cuerpo = nodo('div', 'jm-cuerpo');

  panel.append(cab, muro, burbuja, cuerpo);
  contenedor.appendChild(panel);

  function pintarMuro() {
    muro.innerHTML = '';
    for (const nv of NIVELES) {
      const s = nodo('span', 'jm-sello' + (estado.sellos.includes(nv.sello) ? ' jm-ok' : ''));
      s.innerHTML = SPRITES[nv.sello];
      s.appendChild(nodo('span', null, nv.sello === 'temp' ? 'temp.' : nv.sello === 'prevencion' ? 'prev.' : nv.sello));
      muro.appendChild(s);
    }
    const fin = nodo('span', 'jm-sello' + (estado.sellos.length === NIVELES.length ? ' jm-ok' : ''));
    fin.innerHTML = SVG_MASCOTA;
    fin.appendChild(nodo('span', null, 'final'));
    muro.appendChild(fin);
  }

  function ponerBurbuja(txt) {
    // si el texto es idéntico al anterior, un espacio duro al final
    // fuerza el cambio y el lector de pantalla lo vuelve a anunciar
    burbuja.textContent = (burbuja.textContent === txt) ? txt + '\u00A0' : txt;
  }

  function cerrar() {
    destruir();
    onCerrar();
  }

  /* ---------------- motor del campo de juego ---------------- */
  function pararReloj() {
    if (estado.intervalo) { clearInterval(estado.intervalo); estado.intervalo = null; }
  }

  function quitarPiezas() {
    for (const p of estado.piezas) p.el.remove();
    estado.piezas = [];
  }

  function pausarJuego() {
    if (!estado.enJuego || estado.pausado) return;
    estado.pausado = true;
    estado.pausaEnMs = Date.now();
    pararReloj();
    const campo = cuerpo.querySelector('.jm-campo');
    if (campo) campo.classList.add('jm-pausa');
  }

  function reanudarJuego() {
    if (!estado.enJuego || !estado.pausado) return;
    estado.pausado = false;
    const delta = Date.now() - estado.pausaEnMs;
    estado.finEnMs += delta;
    estado.ultimoSpawnMs += delta;
    for (const p of estado.piezas) p.nacidaEnMs += delta;
    const campo = cuerpo.querySelector('.jm-campo');
    if (campo) campo.classList.remove('jm-pausa');
    estado.intervalo = setInterval(tick, 250);
  }

  const alVisibilidad = () => {
    if (document.hidden) pausarJuego(); else reanudarJuego();
  };
  document.addEventListener('visibilitychange', alVisibilidad);

  const alEscape = (e) => {
    if (e.key !== 'Escape') return;
    if (e.target && e.target.id === 'jmNombre') return; // escribir el nombre no cierra
    e.preventDefault();
    cerrar();
  };
  document.addEventListener('keydown', alEscape);

  function spawnPieza(nv, campo) {
    const esTema = Math.random() < nv.probTema;
    const tipo = esTema ? nv.sello : 'mascota';
    const b = nodo('button', 'jm-pieza');
    b.type = 'button';
    b.innerHTML = SPRITES[tipo];
    b.setAttribute('aria-label', NOMBRES_PIEZA[tipo]);
    b.style.setProperty('--jm-caida', nv.caidaMs + 'ms');
    const ancho = campo.clientWidth || 300;
    b.style.left = Math.floor(Math.random() * Math.max(1, ancho - 60)) + 'px';
    if (reduceMov) {
      const alto = campo.clientHeight || 260;
      b.style.top = Math.floor(Math.random() * Math.max(1, alto - 130)) + 'px';
    }
    const pieza = { el: b, tipo, nacidaEnMs: Date.now(), vidaMs: nv.caidaMs + 350 };
    const coger = (ev) => {
      if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      if (b.dataset.cogida) return;
      b.dataset.cogida = '1';
      let topPx = null;
      try {
        if (typeof ev.clientY === 'number') {
          const r = campo.getBoundingClientRect();
          topPx = Math.max(4, Math.min(ev.clientY - r.top, (campo.clientHeight || 260) - 24));
        }
      } catch (e2) { }
      if (tipo === 'mascota') {
        estado.puntos += 10; estado.atrapados += 1; estado.llevadas += 1;
        pop(campo, b, '+10', topPx);
      } else if (nv.temaPuntos > 0) {
        estado.puntos += nv.temaPuntos;
        pop(campo, b, '+' + nv.temaPuntos, topPx);
      } else {
        ponerBurbuja('¡Uy, ese sol achicharra! Mejor esquivarlo, miarma.');
      }
      b.classList.add('jm-cogida');
      estado.piezas = estado.piezas.filter(p => p !== pieza);
      setTimeout(() => b.remove(), 220);
      pintarMarcador(campo, nv, true);
    };
    b.addEventListener('pointerdown', coger);
    b.addEventListener('keydown', coger);
    campo.appendChild(b);
    estado.piezas.push(pieza);
  }

  function pop(campo, piezaEl, txt, topPx) {
    const p = nodo('span', 'jm-pop', txt);
    p.style.left = piezaEl.style.left;
    p.style.top = Math.max(4, topPx != null ? topPx : 60) + 'px';
    campo.appendChild(p);
    setTimeout(() => p.remove(), 550);
  }

  function pintarMarcador(campo, nv, forzar) {
    const restante = Math.max(0, Math.ceil((estado.finEnMs - Date.now()) / 1000));
    const txt = `${restante}s · ${estado.llevadas}/${nv.objetivo} Manolit∞ · ${estado.puntos} pts`;
    if (forzar || txt !== estado.ultimoTextoMarc) {
      estado.ultimoTextoMarc = txt;
      const m = campo.parentNode.querySelector('.jm-marc');
      if (m) m.textContent = txt;
    }
  }

  function tick() {
    if (!estado.enJuego || estado.pausado) return;
    const ahora = Date.now();
    const nv = NIVELES[estado.nivel];
    const campo = cuerpo.querySelector('.jm-campo');
    if (!campo) { pararReloj(); return; }
    for (const p of [...estado.piezas]) {
      if (ahora - p.nacidaEnMs > p.vidaMs) {
        p.el.remove();
        estado.piezas = estado.piezas.filter(x => x !== p);
      }
    }
    if (ahora - estado.ultimoSpawnMs >= nv.spawnMs && estado.piezas.length < 7) {
      estado.ultimoSpawnMs = ahora;
      spawnPieza(nv, campo);
    }
    pintarMarcador(campo, nv, false);
    if (ahora >= estado.finEnMs) {
      pararReloj();
      estado.enJuego = false;
      const conseguido = estado.llevadas >= nv.objetivo;
      if (conseguido) pintarPregunta(); else pintarCasi();
    }
  }

  /* ---------------- pantallas ---------------- */
  function pintarIntro() {
    estado.pantalla = 'intro';
    pintarMuro();
    cuerpo.innerHTML = '';
    const kicker = nodo('p', 'jm-kicker', t('gameWhatTitle', '¿Qué es Manolit∞ Aire?'));
    const txt = nodo('p', 'jm-leccion', INTRO_QUE_ES[estado.pasoIntro]);
    txt.setAttribute('tabindex', '-1');
    const puntos = nodo('div', 'jm-puntos-intro');
    INTRO_QUE_ES.forEach((_, i) => {
      puntos.appendChild(nodo('span', 'jm-punto' + (i === estado.pasoIntro ? ' jm-act' : '')));
    });
    const btnSi = nodo('button', 'jm-btn', estado.pasoIntro < INTRO_QUE_ES.length - 1
      ? t('gameNext', 'Siguiente') : t('gamePlay', '¡A jugar!'));
    btnSi.type = 'button';
    btnSi.addEventListener('click', () => {
      if (estado.pasoIntro < INTRO_QUE_ES.length - 1) { estado.pasoIntro += 1; pintarIntro(); }
      else { introVista = true; pintarNivelInfo(); }
    });
    const btnNo = nodo('button', 'jm-btn jm-sec', t('gameSkip', 'Saltar la intro'));
    btnNo.type = 'button';
    btnNo.addEventListener('click', () => { introVista = true; pintarNivelInfo(); });
    cuerpo.append(kicker, txt, puntos, btnSi, btnNo);
    ponerBurbuja('¡Hola, miarma! Soy Manolit∞. Antes de jugar te cuento qué es esto, en cuatro trocitos.');
    txt.focus();
  }

  function pintarNivelInfo() {
    estado.pantalla = 'nivel';
    pintarMuro();
    const nv = NIVELES[estado.nivel];
    cuerpo.innerHTML = '';
    const kicker = nodo('p', 'jm-kicker', `Nivel ${estado.nivel + 1} de ${NIVELES.length} · Sello «${nv.sello}»`);
    const h = nodo('h4', 'jm-h3', nv.nombre);
    h.setAttribute('tabindex', '-1');
    cuerpo.append(kicker, h);
    for (const lec of nv.lecciones) cuerpo.appendChild(nodo('p', 'jm-leccion', lec));
    const uv = uvDeLaWeb();
    if (estado.nivel === 0 && uv != null && uv >= 6) {
      cuerpo.appendChild(nodo('p', 'jm-leccion', `Mira, ahora mismo el índice UV es ${Math.round(uv)}. Crema, sombrero y sombrita, que hoy el sol no perdona.`));
    }
    const btn = nodo('button', 'jm-btn', t('gamePlay', '¡A jugar!'));
    btn.type = 'button';
    btn.addEventListener('click', pintarJuego);
    cuerpo.appendChild(btn);
    ponerBurbuja(`Nivel ${estado.nivel + 1}. ${nv.consejoCampo}`);
    h.focus();
  }

  function pintarJuego() {
    estado.pantalla = 'juego';
    pararReloj(); // guardia: ni doble clic ni doble Enter arma dos relojes
    const nv = NIVELES[estado.nivel];
    cuerpo.innerHTML = '';
    const marc = nodo('div', 'jm-marc');
    const campo = nodo('div', 'jm-campo');
    campo.setAttribute('role', 'group');
    campo.setAttribute('aria-label', `Campo de juego del nivel ${estado.nivel + 1}`);
    cuerpo.append(marc, campo);
    estado.enJuego = true; estado.pausado = false;
    estado.llevadas = 0; estado.piezas = [];
    estado.finEnMs = Date.now() + nv.duracion * 1000;
    estado.ultimoSpawnMs = Date.now() - nv.spawnMs + 350;
    estado.ultimoTextoMarc = '';
    pintarMarcador(campo, nv, true);
    ponerBurbuja(nv.consejoCampo);
    if (document.hidden) { pausarJuego(); return; }
    estado.intervalo = setInterval(tick, 250);
  }

  function pintarPregunta() {
    estado.pantalla = 'pregunta';
    const nv = NIVELES[estado.nivel];
    quitarPiezas();
    cuerpo.innerHTML = '';
    const h = nodo('h4', 'jm-h3', 'Pregunta rápida');
    h.setAttribute('tabindex', '-1');
    const q = nodo('p', 'jm-leccion', nv.pregunta);
    const ops = nodo('div', 'jm-ops');
    nv.opciones.forEach((op, i) => {
      const b = nodo('button', 'jm-btn', op);
      b.type = 'button';
      b.addEventListener('click', () => {
        for (const x of ops.querySelectorAll('button')) x.disabled = true;
        const bien = i === nv.correcta;
        const fb = nodo('p', 'jm-fb ' + (bien ? 'jm-bien' : 'jm-casi'), bien ? nv.fbOk : nv.fbNo);
        cuerpo.appendChild(fb);
        ponerBurbuja(bien ? nv.fbOk : nv.fbNo);
        decir(bien ? nv.fbOk : nv.fbNo);
        if (!estado.sellos.includes(nv.sello)) estado.sellos.push(nv.sello);
        pintarMuro();
        const btnSeguir = nodo('button', 'jm-btn', estado.nivel < NIVELES.length - 1
          ? t('gameNext', 'Siguiente') : 'Ver mi diploma');
        btnSeguir.type = 'button';
        btnSeguir.addEventListener('click', () => {
          if (estado.nivel < NIVELES.length - 1) { estado.nivel += 1; pintarNivelInfo(); }
          else pintarFin(true);
        });
        cuerpo.appendChild(btnSeguir);
        btnSeguir.focus();
      });
      ops.appendChild(b);
    });
    cuerpo.append(h, q, ops);
    ponerBurbuja(`¡Nivel superado! A ver esta pregunta. ${nv.pregunta}`);
    h.focus();
  }

  function pintarCasi() {
    estado.pantalla = 'casi';
    const nv = NIVELES[estado.nivel];
    quitarPiezas();
    cuerpo.innerHTML = '';
    const h = nodo('h4', 'jm-h3', '¡Casi lo tienes!');
    h.setAttribute('tabindex', '-1');
    const txt = nodo('p', 'jm-leccion',
      `Has atrapado ${estado.llevadas} de ${nv.objetivo} Manolit∞. No pasa nada, miarma, que nadie nace sabiendo. ¿Le damos otra vez?`);
    const btnRe = nodo('button', 'jm-btn', t('gameRetry', 'Repetir nivel'));
    btnRe.type = 'button';
    btnRe.addEventListener('click', pintarNivelInfo);
    const btnFin = nodo('button', 'jm-btn jm-sec', t('gameEndBtn', 'Terminar y ver mi resumen'));
    btnFin.type = 'button';
    btnFin.addEventListener('click', () => pintarFin(false));
    cuerpo.append(h, txt, btnRe, btnFin);
    ponerBurbuja('Casi, casi. Repite el nivel cuando quieras, que aquí nadie castiga.');
    h.focus();
  }

  function pintarFin(completo) {
    estado.pantalla = 'fin';
    estado.enJuego = false;
    pararReloj();
    quitarPiezas();
    pintarMuro();
    cuerpo.innerHTML = '';
    const h = nodo('h4', 'jm-h3', completo ? '¡Los 6 sellos son tuyos!' : 'Tu resumen de hoy');
    h.setAttribute('tabindex', '-1');
    const lista = nodo('ul', 'jm-res');
    const datos = [
      `Puntos conseguidos · ${estado.puntos}`,
      `Manolit∞ atrapados · ${estado.atrapados}`,
      `Nivel alcanzado · ${Math.min(estado.nivel + (completo ? 1 : 0), NIVELES.length)} de ${NIVELES.length}`,
      `Sellos de protección · ${estado.sellos.length} de ${NIVELES.length}${estado.sellos.length ? ' (' + estado.sellos.join(', ') + ')' : ''}`
    ];
    if (completo) datos.push('Sello final · Simulador de Sombras. ¡Desbloqueado!');
    for (const d of datos) lista.appendChild(nodo('li', null, d));
    const aprendido = nodo('p', 'jm-leccion',
      'Y una cosa que te llevas para siempre. ' + NIVELES[Math.max(0, estado.sellos.length - 1)].lecciones[0]);
    cuerpo.append(h, lista, aprendido);

    if (completo) {
      const cajaCert = nodo('div');
      const lab = nodo('label', 'jm-leccion', t('gameNameLabel', 'Tu nombre, solo si quieres ponerlo'));
      const inp = nodo('input', 'jm-nombre');
      inp.type = 'text';
      inp.id = 'jmNombre';
      inp.maxLength = 24;
      inp.autocomplete = 'off';
      lab.setAttribute('for', 'jmNombre');
      const nota = nodo('p', 'jm-nota',
        'El diploma se fabrica aquí mismo, en tu dispositivo. Tu nombre no se guarda ni viaja a ningún sitio.');
      const btnSvg = nodo('button', 'jm-btn', t('gameCertSvg', 'Descargar diploma SVG'));
      btnSvg.type = 'button';
      const btnPdf = nodo('button', 'jm-btn', t('gameCertPdf', 'Descargar diploma PDF'));
      btnPdf.type = 'button';
      const hacer = () => ({
        nombre: inp.value.trim().slice(0, 24),
        puntos: estado.puntos,
        sellos: [...estado.sellos],
        fecha: new Date().toLocaleDateString(document.documentElement.lang || 'es')
      });
      btnSvg.addEventListener('click', async () => {
        btnSvg.disabled = true;
        try {
          const cert = await cargarCert();
          cert.descargarSVG('diploma-manolit.svg', cert.construirCertificadoSVG(hacer()));
          ponerBurbuja('¡Diploma SVG descargado! Guárdalo bien, campeón.');
        } catch (e) {
          ponerBurbuja('Uy, no he podido fabricar el diploma. Prueba otra vez en un ratito.');
        } finally { btnSvg.disabled = false; }
      });
      btnPdf.addEventListener('click', async () => {
        btnPdf.disabled = true;
        try {
          const cert = await cargarCert();
          cert.descargarPDF('diploma-manolit.pdf', cert.construirCertificadoSVG(hacer()));
          ponerBurbuja('¡Diploma PDF descargado! Ya puedes enseñarlo en casa.');
        } catch (e) {
          ponerBurbuja('Uy, el PDF no ha salido. Prueba con el SVG, que vale igual de bien.');
        } finally { btnPdf.disabled = false; }
      });
      cajaCert.append(lab, inp, nota, btnSvg, btnPdf);
      cuerpo.appendChild(cajaCert);
      ponerBurbuja('¡Enhorabuena, miarma! Has completado el juego de Manolit∞ con los 6 sellos.');
      decir('Enhorabuena. Has conseguido los seis sellos de protección del calor y el sello de simulador de sombras.');
    } else {
      const btnMas = nodo('button', 'jm-btn', 'Seguir jugando');
      btnMas.type = 'button';
      btnMas.addEventListener('click', pintarNivelInfo);
      cuerpo.appendChild(btnMas);
      ponerBurbuja(`Llevas ${estado.sellos.length} de 6 sellos. Cuando quieras seguimos, que el diploma te espera.`);
    }
    h.focus();
  }

  /* Lee el UV que ya muestra la propia web (sin pedir nada a la red). */
  function uvDeLaWeb() {
    const el = document.getElementById('sciUV');
    if (!el) return null;
    const n = parseFloat(String(el.textContent).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  btnX.addEventListener('click', cerrar);

  /* ---------------- arranque y limpieza ---------------- */
  if (introVista) pintarNivelInfo(); else pintarIntro();

  function destruir() {
    estado.enJuego = false;
    pararReloj();
    quitarPiezas();
    document.removeEventListener('visibilitychange', alVisibilidad);
    document.removeEventListener('keydown', alEscape);
    contenedor.innerHTML = '';
  }

  return { destruir };
}
