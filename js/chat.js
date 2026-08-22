/* ============================================================
   MANOLIT∞ — Aire + Sombra (versión completa y robusta)
   Fallback: 1) Cloudflare Worker  2) OpenRouter  3) Local Inteligente
   ============================================================ */
const CLOUDFLARE_WORKER_URL = "https://manolito-aire.sandro-a007.workers.dev/manolito";
const OPENROUTER_API_KEY = "";
const OPENROUTER_MODEL = "google/gemma-3-27b-it";

const cannedFallback = {
  aire_pm25: "El PM2.5 son partículas muy finas que entran hasta los pulmones. Por debajo de 10 se considera aire muy limpio. Si el círculo está verde, respira tranquilo.",
  aire_color: "El color del círculo cambia según la calidad del aire: verde = bueno, ámbar = regular, rojo = malo. Mejor evitar actividades intensas si está rojo.",
  aire_bebe: "Con bebés, si el círculo está verde no hay problema. En ámbar o rojo, mejor paseos cortos y evitar horas punta de tráfico.",
  aire_deporte: "Con el círculo verde, deporte sin problema, incluso intenso. En ámbar, mejor bajar la intensidad o entrenar en zonas con menos tráfico. En rojo, mejor mover el entrenamiento a un espacio interior.",
  aire_ica: "El ICA (Índice de Calidad del Aire) resume varios contaminantes en un solo número fácil de leer: cuanto más bajo, mejor aire. Nosotros lo traducimos directamente al color del círculo para que no haga falta interpretar cifras.",
  aire_ventanas: "Con el círculo verde, ventanas abiertas sin problema. En ámbar o rojo, mejor ventilar en ratos cortos y evitar las horas de más tráfico (normalmente primera hora de la mañana y última de la tarde).",
  aire_asma: "Con asma, presta especial atención cuando el círculo esté en ámbar o rojo: mejor llevar la medicación de rescate a mano, evitar ejercicio intenso al aire libre y, si tienes dudas sobre tu caso concreto, coméntaselo a tu médico.",
  sombra_ruta: "Para buscar la calle con más sombra necesito que me digas desde dónde sales, a dónde vas y en qué ciudad. Si me dices la hora, mejor aún.",
  sombra_consejo: "Truco solar: por la mañana las sombras caen hacia el oeste, así que camina por la acera este. Por la tarde, al revés. Las calles estrechas y los soportales son tus aliados.",
  sombra_capas: "El mapa tiene 4 capas: Edificios 3D (para ver la ciudad), Sombras (calculadas con la posición real del sol), Ruta (tu camino a pie) y Posición del sol. Puedes activarlas o desactivarlas.",
  sombra_noveo: "Si es de noche (el sol está bajo el horizonte), no hay sombras que proyectar. También asegúrate de que la capa 'Sombras' esté activada.",
  sombra_esreal: "Sí, traza el trayecto real a pie por calles usando el sistema OSRM. Si el servidor falla, mostrará una línea recta por defecto, pero puedes reintentar.",
  sombra_iluminacion: "Es una simulación de la luz y el cielo que cambia en tiempo real según la hora del día, parecido a lo que hace Google Earth.",
  sombra_direccion: "Para buscar la ruta tienes que elegir una de las sugerencias que aparecen en la lista desplegable al escribir 3 letras. No le des a buscar sin elegir una.",
  sombra_horas: "Depende de la orientación de la calle. Al mediodía el sol está alto y hay menos sombra. Por la mañana busca la acera este, por la tarde la oeste.",
  sombra_como: "Usa los recuadros de la sección 'Ruta y sombras 3D' abajo. Escribe origen y destino, elige de la lista y dale a 'Buscar ruta'.",
  irradiacion: "La irradiación solar mide cuánta energía del sol llega por metro cuadrado. En verano o al mediodía los valores disparan el calor, de ahí la importancia de buscar sombra o soportales.",
  arboles: "Los árboles urbanos y la masa forestal actúan como reguladores térmicos naturales, bajando varios grados la temperatura ambiente y generando microclimas de sombra.",
  generic: "¡Hola! Soy Manolit∞, experto en calidad del aire y en esquivar el sol. Pregúntame lo que quieras."
};

function getRobustLang() {
  if (typeof currentLang !== 'undefined' && currentLang) {
    return currentLang;
  }
  const htmlLang = document.documentElement.getAttribute('lang');
  if (htmlLang) {
    return htmlLang.split('-')[0];
  }
  try {
    const storedLang = localStorage.getItem('manolito_lang') || localStorage.getItem('lang');
    if (storedLang) return storedLang.split('-')[0];
  } catch (e) {}
  return 'es';
}

async function askManolito(question){
  const langNames = { es:'español', ca:'català', eu:'euskera', gl:'galego', en:'English', fr:'français', de:'Deutsch', it:'italiano', pt:'português', nl:'Nederlands', sv:'svenska', el:'ελληνικά', he:'עברית', ar:'العربية', ka:'ქართული' };
  
  const uiLang = getRobustLang();
  const uiLangName = langNames[uiLang] || 'español';

  const systemPrompt = `Eres Manolit∞, un asistente alegre y experto en dos áreas: calidad del aire (PM2.5, colores del índice, salud) y rutas urbanas para caminar por la sombra evitando el sol directo. Explicas todo de forma clara, humana y con buen rollo, sin tecnicismos a menos que te los pidan.

IDIOMA: Siempre respondes en el MISMO IDIOMA en que te escriben la pregunta. Detectas automáticamente el idioma. Si no puedes detectarlo con claridad, respondes en ${uiLangName}. NUNCA respondas en un idioma distinto al que te escriben.

CALIDAD DEL AIRE: Conoces el significado del PM2.5, los colores del índice y cómo afecta a la salud.

RUTAS CON SOMBRA: Guía urbano especializado en encontrar calles con sombra, orientación de edificios, árboles, soportales y posición solar según la hora.

INTEGRACIÓN TOTAL DE LA WEB: Conoces todas las secciones técnicas de Manolit∞ (calidad del aire, selector de ciudad, 4 modos de lectura, gráficos Copernicus/CAMS, Manolit∞ Cuántico, capas 3D de edificios, sombras, OSRM, e irradiación solar).

PREGUNTAS GENERALES O FUERA DE ÁMBITO: Si te preguntan sobre cualquier otro tema general (historia, arte, ciencia, cultura, etc.), respondes con total normalidad, seriedad y precisión, sin bucles ni repeticiones de la intro.

TONO Y LARGO: Directo, sin rodeos, máximo 3-4 frases por respuesta.`;

  if (typeof cookiesAccepted === 'function' && !cookiesAccepted()){
    return cannedFallback.generic + " (Has rechazado las cookies, chat en modo local).";
  }

  // 1) Cloudflare Worker
  if (CLOUDFLARE_WORKER_URL){
    try{
      const r = await fetch(CLOUDFLARE_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, idioma: uiLang, systemPrompt: systemPrompt })
      });
      if (r.ok){
        const data = await r.json();
        if (data.respuesta) return data.respuesta;
      }
    } catch(e){}
  }

  // 2) OpenRouter
  if (OPENROUTER_API_KEY){
    try{
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question }
          ]
        })
      });
      if (r.ok){
        const data = await r.json();
        const msg = data.choices?.[0]?.message?.content;
        if (msg) return msg.trim();
      }
    } catch(e){}
  }

  // 3) Respuesta local inteligente (robusta, sin bucles de bienvenida)
  const q = question.toLowerCase().trim();

  // Saludos puros estrictos para evitar falsos positivos
  if (/^(hola|hi|hello|bonjour|ciao|hei|hey|qué tal|buenas|hpola)\b/.test(q) && q.length < 15) {
    return cannedFallback.generic;
  }

  // Calidad de aire
  if (/aire|pm|contaminaci|calidad|índice|bebé|bebe|bebés|deporte|ejercicio|ica|ventana|asma/.test(q)) {
    if (/pm|partículas/i.test(q)) return cannedFallback.aire_pm25;
    if (/color|círculo/i.test(q)) return cannedFallback.aire_color;
    if (/beb[eé]/.test(q)) return cannedFallback.aire_bebe;
    if (/deporte|ejercicio|correr|entrenar/i.test(q)) return cannedFallback.aire_deporte;
    if (/ica\b/i.test(q)) return cannedFallback.aire_ica;
    if (/ventana/i.test(q)) return cannedFallback.aire_ventanas;
    if (/asma/i.test(q)) return cannedFallback.aire_asma;
    return cannedFallback.aire_pm25 + " " + cannedFallback.aire_color;
  }

  // Capas 3D y Mapa
  if (/capas|checkbox|edificios 3d|iluminación solar|google earth/.test(q)) return cannedFallback.sombra_capas;
  if (/no veo|no aparece|no sale.*sombra/.test(q)) return cannedFallback.sombra_noveo;
  if (/línea recta|es real|osrm|calles de verdad/.test(q)) return cannedFallback.sombra_esreal;
  if (/iluminación solar|cielo|luz del mapa/.test(q)) return cannedFallback.sombra_iluminacion;
  if (/no encuentra|no aparece mi dirección|sugerencias|autocompletado/.test(q)) return cannedFallback.sombra_direccion;
  if (/cómo busco|cómo uso|cómo funciona.*ruta|buscar ruta/.test(q)) return cannedFallback.sombra_como;

  // Horas, sol, sombra, rutas, irradiación y árboles
  if (/hora|cuando|cuándo|salgo|salir|mediodía|mañana|tarde|ora/.test(q) && /sombra|sol|calle|ruta|caminar|hoy/.test(q)) {
    return cannedFallback.sombra_horas;
  }
  if (/irradiación|luz solar|energía sol|radiación/.test(q)) return cannedFallback.irradiacion;
  if (/árbol|arboles|parque|vegetación|masa forestal/.test(q)) return cannedFallback.arboles;

  if (/sombra|sol|calor|ruta|caminar|calle|aceras|orientación|protegiendo|desde|hasta|plaza|avenida/.test(q)) {
    return cannedFallback.sombra_consejo;
  }

  // Si es cualquier otra pregunta general o externa (Mona Lisa, historia, ciencia, etc.), responde de forma útil sin repetir el saludo inicial.
  return `Sobre "${question}": aunque mi especialidad en Manolit∞ son la calidad del aire y las rutas de sombra urbana, te diré que es un tema interesante. Si necesitas calcular trayectos evitando el sol o revisar datos de PM2.5, dime tu origen y destino.`;
}

function openChat(){ document.getElementById('chatOverlay').classList.add('open'); }
function closeChat(){ document.getElementById('chatOverlay').classList.remove('open'); }

function addBubble(text, who){
  const body = document.getElementById('chatBody');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (who === 'user' ? 'user' : 'mano');
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function setChatStatus(text){
  const el = document.getElementById('chatStatus');
  if (el) el.textContent = text;
}

async function askQuick(key){
  const btn = document.querySelector(`[data-quick="${key}"]`);
  const questionText = btn ? btn.textContent : key;
  if (btn) addBubble(questionText, 'user');
  setChatStatus('Manolito está pensando...');
  const answer = await askManolito(questionText);
  addBubble(answer, 'mano');
  setChatStatus('');
}

async function askCustom(){
  const input = document.getElementById('chatInputField');
  const question = input.value.trim();
  if (!question) return;
  addBubble(question, 'user');
  input.value = '';
  setChatStatus('Manolito busca la respuesta más fresca...');

  const answer = await askManolito(question);
  addBubble(answer, 'mano');
  setChatStatus('');
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chatInputField');
  if (input){
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') askCustom(); });
  }
});