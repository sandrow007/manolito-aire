/* ============================================================
   MANOLIT AIRE · js/juego-sol.js
   Licencia: AGPL-3.0, igual que el resto del proyecto.
   ------------------------------------------------------------
   «Atrapa el Sol»: el mini-juego del modo sol. Las piezas buenas
   son el propio Manolit con gafas de sol (la mascota oficial
   adaptada al juego, orden directa de Sandro) y las nubes,
   dibujadas con la misma familia visual (trazo granate, ondas
   teal y un toque dorado), quitan puntos.

   Accesibilidad WCAG 2.2: cada pieza es un <button> real de
   52px con aria-label, así que vale ratón, táctil y teclado
   (Tab para enfocar, Entrar o Espacio para atrapar). Con
   prefers-reduced-motion no hay animaciones.

   Batería y rendimiento (06-oct, revisión de Sandro):
   - Cero requestAnimationFrame y cero bucles ociosos: solo dos
     intervalos (piezas y reloj) mientras dura la partida.
   - Al ocultarse la pestaña el juego se PAUSA de verdad (se
     paran los intervalos y las animaciones CSS) y al volver se
     reanuda por donde iba: el reloj va por hora real, no por
     ticks, así que ni se dilata ni se acelera.
   - Las animaciones son siempre transform/opacity (baratas, van
     por GPU) y el marcador solo se repinta cuando cambia.
   - Puntuación solo en memoria: cero localStorage.

   06-oct-2026 · versión sin emojis (regla de la casa). Cambio
   único de interacción respecto al borrador: además de
   pointerdown las piezas escuchan teclado y clic, si no el
   juego no se podía jugar sin ratón.
   ============================================================ */

// Sol atrapable: la figura oficial de Manolit (gota granate, sol
// dorado, dos ondas teal, infinito granate) con gafas de sol y
// sus brazos (mismo trazo granate que las piernas, manos
// doradas). Los grupos de piernas y brazos llevan su punto de
// giro para el balanceo: brazos en contrafase con las piernas
// (brazo izquierdo con pierna derecha), como al caminar.
const SVG_SOL = `
<svg viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g>
    <g class="js-pierna-izq" style="transform-origin:60px 118px;">
      <line x1="60" y1="118" x2="45" y2="155" stroke="#7A0016" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="42" cy="158" rx="7" ry="4" fill="#7A0016"/>
    </g>
    <g class="js-pierna-der" style="transform-origin:60px 118px;">
      <line x1="60" y1="118" x2="75" y2="155" stroke="#7A0016" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="78" cy="158" rx="7" ry="4" fill="#7A0016"/>
    </g>
    <g class="js-brazo-izq" style="transform-origin:26px 76px;">
      <line x1="26" y1="76" x2="6" y2="104" stroke="#7A0016" stroke-width="5" stroke-linecap="round"/>
      <circle cx="5" cy="106" r="4.5" fill="#E6A100" stroke="#7A0016" stroke-width="2.5"/>
    </g>
    <g class="js-brazo-der" style="transform-origin:94px 76px;">
      <line x1="94" y1="76" x2="114" y2="104" stroke="#7A0016" stroke-width="5" stroke-linecap="round"/>
      <circle cx="115" cy="106" r="4.5" fill="#E6A100" stroke="#7A0016" stroke-width="2.5"/>
    </g>
    <path d="M 60,18 C 22,58 22,108 60,132 C 98,108 98,58 60,18 Z"
          fill="rgba(2,4,6,0.35)" stroke="#7A0016" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="60" cy="63" r="26" fill="#E6A100"/>
    <path d="M 40,68 Q 50,61 60,68 T 80,68" fill="none" stroke="#007A87" stroke-width="3" stroke-linecap="round"/>
    <path d="M 43,75 Q 51.5,69.5 60,75 T 77,75" fill="none" stroke="#007A87" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M 60,58 C 45,42 45,72 60,58 C 75,42 75,72 60,58 Z"
          fill="none" stroke="#7A0016" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <g>
      <rect x="36" y="54" width="21" height="15" rx="6" fill="#20242B"/>
      <rect x="63" y="54" width="21" height="15" rx="6" fill="#20242B"/>
      <path d="M 57,58 Q 60,55 63,58" fill="none" stroke="#20242B" stroke-width="2.4"/>
      <path d="M 36,58 L 28,54 M 84,58 L 92,54" fill="none" stroke="#20242B" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M 41,60 L 46,57.5 M 68,60 L 73,57.5" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="2" stroke-linecap="round"/>
    </g>
  </g>
</svg>`;

// Nube que quita puntos, de la familia Manolit: silueta con
// trazo granate del mismo grosor que el cuerpo del sol, el mismo
// relleno translúcido, las dos ondas teal de la marca dentro y
// una gota dorada cayendo. Sin cara y en horizontal: a 52px se
// distingue del sol por silueta, no solo por color.
const SVG_NUBE = `
<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <path d="M 34,72 A 16,16 0 0 1 36,42 A 20,20 0 0 1 72,28 A 17,17 0 0 1 102,46 A 13,13 0 0 1 98,72 Z"
        fill="rgba(2,4,6,0.35)" stroke="#7A0016" stroke-width="5" stroke-linejoin="round"/>
  <path d="M 44,56 Q 54,50 64,56 T 84,56" fill="none" stroke="#007A87" stroke-width="3" stroke-linecap="round"/>
  <path d="M 48,64 Q 56,59 64,64 T 80,64" fill="none" stroke="#007A87" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M 60,74 C 55,81 55,86 60,89 C 65,86 65,81 60,74 Z" fill="#E6A100"/>
</svg>`;

let estilosPuestos = false;
function ponerEstilos() {
  if (estilosPuestos || document.getElementById('jsSolEstilos')) { estilosPuestos = true; return; }
  estilosPuestos = true;
  const st = document.createElement('style');
  st.id = 'jsSolEstilos';
  st.textContent = `
    .js-caja{display:flex;flex-direction:column;gap:8px}
    .js-marc{font-weight:700;font-size:0.95rem}
    .js-campo{position:relative;height:260px;border-radius:16px;background:linear-gradient(#8fd3ff,#d7f1ff);overflow:hidden;touch-action:manipulation}
    .js-obj{position:absolute;width:52px;height:52px;border:none;border-radius:50%;background:transparent;padding:0;margin:0;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .js-obj svg{display:block;width:100%;height:100%;overflow:visible}
    .js-nube svg{width:48px;height:36px}
    .js-obj:focus-visible{outline:3px solid #7A0016;outline-offset:2px}
    @keyframes jsPop{to{transform:scale(1.6);opacity:0}}
    .js-pop{animation:jsPop 0.2s ease-out forwards;pointer-events:none}
    /* Balanceo suave en reposo: brazos en contrafase con las
       piernas (brazo izquierdo va con pierna derecha). Solo
       transform, y se pausa entero al ocultarse la pestaña. */
    @keyframes jsVaivenPierna{0%,100%{transform:rotate(7deg)}50%{transform:rotate(-7deg)}}
    @keyframes jsVaivenBrazo{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
    .js-sol .js-pierna-izq{animation:jsVaivenPierna 1.6s ease-in-out infinite}
    .js-sol .js-pierna-der{animation:jsVaivenPierna 1.6s ease-in-out -0.8s infinite}
    .js-sol .js-brazo-izq{animation:jsVaivenBrazo 1.6s ease-in-out -0.8s infinite}
    .js-sol .js-brazo-der{animation:jsVaivenBrazo 1.6s ease-in-out infinite}
    .js-pausa .js-obj, .js-pausa .js-obj *{animation-play-state:paused}
    .js-msg{font-size:0.9rem;min-height:1.2em}
    .js-btn{min-height:44px;min-width:44px;padding:0 18px;border:none;border-radius:12px;background:#ffb74d;color:#20242B;font-weight:700;font-size:0.95rem;cursor:pointer;align-self:flex-start;touch-action:manipulation}
    .js-btn:focus-visible{outline:3px solid #7A0016;outline-offset:2px}
    @media (prefers-reduced-motion: reduce){
      .js-pop{animation:none}
      .js-sol .js-pierna-izq, .js-sol .js-pierna-der,
      .js-sol .js-brazo-izq, .js-sol .js-brazo-der{animation:none}
    }
  `;
  document.head.appendChild(st);
}

// Monta el juego dentro de `contenedor` y devuelve { destruir }.
// opciones: duracion en segundos (30), decir(texto) para que la
// mascota lo suelte en su burbuja, onFin(puntos) al terminar.
export function iniciarJuegoSol(contenedor, { duracion = 30, decir = () => {}, onFin } = {}) {
  ponerEstilos();
  if (!contenedor) return { destruir() { } };

  contenedor.innerHTML = '';
  let puntos = 0;
  let tiempo = duracion;
  let acabado = false;
  let pausado = false;
  let restanteMs = duracion * 1000;
  let finEnMs = Date.now() + restanteMs;
  const temporizadores = new Set();

  const caja = document.createElement('div');
  caja.className = 'js-caja';
  const marc = document.createElement('div');
  marc.className = 'js-marc';
  const campo = document.createElement('div');
  campo.className = 'js-campo';
  const msg = document.createElement('div');
  msg.className = 'js-msg';
  msg.setAttribute('aria-live', 'polite');
  caja.append(marc, campo, msg);
  contenedor.appendChild(caja);

  // El marcador solo se repinta cuando el texto cambia de verdad.
  let ultimoTextoMarc = '';
  const pintarMarc = () => {
    const txt = `Puntos ${puntos} · Tiempo ${tiempo}`;
    if (txt !== ultimoTextoMarc) { ultimoTextoMarc = txt; marc.textContent = txt; }
  };
  pintarMarc();

  function temporizador(fn, ms) {
    const t = setTimeout(() => { temporizadores.delete(t); fn(); }, ms);
    temporizadores.add(t);
    return t;
  }

  function recoger(b, esSol) {
    return (ev) => {
      if (ev && ev.type === 'keydown') {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
      }
      if (acabado || pausado || b.dataset.cogido) return;
      b.dataset.cogido = '1';
      puntos = esSol ? puntos + 10 : Math.max(0, puntos - 5);
      b.classList.add('js-pop');
      pintarMarc();
      temporizador(() => { try { b.remove(); } catch (e) { } }, 180);
    };
  }

  function soltar() {
    if (acabado || pausado) return;
    const esSol = Math.random() < 0.7;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'js-obj' + (esSol ? ' js-sol' : ' js-nube');
    b.setAttribute('aria-label', esSol ? 'Manolit de sol, suma 10 puntos' : 'Nube, resta 5 puntos');
    b.innerHTML = esSol ? SVG_SOL : SVG_NUBE;
    // Posición en píxeles medida del campo real: la pieza nunca
    // sale cortada por el borde en pantallas estrechas ni sobra
    // hueco en las anchas. Respaldo en % si aún no hay layout.
    const ancho = campo.clientWidth || 0;
    const alto = campo.clientHeight || 260;
    if (ancho > 60) {
      b.style.left = Math.round(Math.random() * (ancho - 56)) + 'px';
      b.style.top = Math.round(Math.random() * (alto - 56)) + 'px';
    } else {
      b.style.left = (Math.random() * 80).toFixed(1) + '%';
      b.style.top = (Math.random() * 72).toFixed(1) + '%';
    }
    campo.appendChild(b);
    const fn = recoger(b, esSol);
    b.addEventListener('pointerdown', fn);
    b.addEventListener('keydown', fn);
    b.addEventListener('click', fn);
    // Si nadie la atrapa, la pieza se va sola.
    temporizador(() => { try { b.remove(); } catch (e) { } }, esSol ? 1400 : 1800);
  }

  // Pausa real al ocultar la pestaña (batería): se paran los
  // intervalos y las animaciones, y el reloj guarda lo que
  // quedaba por hora real. Al volver, sigue por donde iba.
  function pausar() {
    if (acabado || pausado) return;
    pausado = true;
    restanteMs = Math.max(0, finEnMs - Date.now());
    clearInterval(cuentaPiezas);
    clearInterval(cuentaReloj);
    caja.classList.add('js-pausa');
  }
  function reanudar() {
    if (acabado || !pausado) return;
    pausado = false;
    finEnMs = Date.now() + restanteMs;
    caja.classList.remove('js-pausa');
    armarIntervalos();
    tickReloj();
  }
  function alCambiarVisibilidad() {
    try { if (document.hidden) pausar(); else reanudar(); } catch (e) { }
  }

  function fin() {
    if (acabado) return;
    acabado = true;
    clearInterval(cuentaPiezas);
    clearInterval(cuentaReloj);
    temporizadores.forEach(clearTimeout);
    temporizadores.clear();
    try { document.removeEventListener('visibilitychange', alCambiarVisibilidad); } catch (e) { }
    campo.querySelectorAll('.js-obj').forEach((b) => { try { b.remove(); } catch (e) { } });
    msg.textContent = `Fin del juego. Has hecho ${puntos} puntos.`;
    try {
      decir(puntos >= 100
        ? `¡${puntos} puntos! Eres un soles, miarma.`
        : `Fin del juego con ${puntos} puntos. La próxima salen más, seguro.`);
    } catch (e) { }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'js-btn';
    btn.textContent = 'Jugar otra vez';
    btn.addEventListener('click', () => {
      try { destruir(); } catch (e) { }
      iniciarJuegoSol(contenedor, { duracion, decir, onFin });
    });
    caja.appendChild(btn);
    try { btn.focus(); } catch (e) { }
    try { if (onFin) onFin(puntos); } catch (e) { }
  }

  // El reloj va por hora real con una fecha de fin: si el
  // navegador retarda los intervalos el tiempo no se falsea, y
  // el repintado es de 4 veces por segundo como mucho (solo
  // escribe cuando cambia el segundo).
  function tickReloj() {
    if (acabado || pausado) return;
    tiempo = Math.max(0, Math.ceil((finEnMs - Date.now()) / 1000));
    pintarMarc();
    if (tiempo <= 0) fin();
  }

  let cuentaPiezas = null;
  let cuentaReloj = null;
  function armarIntervalos() {
    cuentaPiezas = setInterval(soltar, 700);
    cuentaReloj = setInterval(tickReloj, 250);
  }
  armarIntervalos();
  try { document.addEventListener('visibilitychange', alCambiarVisibilidad); } catch (e) { }

  function destruir() {
    acabado = true;
    clearInterval(cuentaPiezas);
    clearInterval(cuentaReloj);
    temporizadores.forEach(clearTimeout);
    temporizadores.clear();
    try { document.removeEventListener('visibilitychange', alCambiarVisibilidad); } catch (e) { }
    try { caja.remove(); } catch (e) { }
  }

  return { destruir };
}
