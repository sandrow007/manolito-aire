/* ============================================================
   MANOLIT∞ — Aire + Sombra
   Único endpoint: Cloudflare Worker (API keys y LLM en backend)
   ============================================================ */
const CLOUDFLARE_WORKER_URL = "https://manolito-aire.sandro-a007.workers.dev/manolito";

// Fallback de emergencia. Solo se dispara si Cloudflare falla o no hay internet.
// Cero bucles, cero falsas IA. Si el server cae, da la info mínima o avisa del error.
const cannedFallback = {
  aire: "Error de servidor IA. Datos offline: PM2.5 < 10 es ideal. Verde = Bueno, Rojo = Malo.",
  sombra: "Error de servidor IA. Regla offline: por la mañana camina por la acera este, por la tarde por la oeste.",
  error: "Error de conexión. La inteligencia artificial de Manolit∞ está inaccesible en este momento."
};

function getRobustLang() {
  if (typeof currentLang !== 'undefined' && currentLang) return currentLang;
  const htmlLang = document.documentElement.getAttribute('lang');
  if (htmlLang) return htmlLang.split('-')[0];
  try {
    const storedLang = localStorage.getItem('manolito_lang') || localStorage.getItem('lang');
    if (storedLang) return storedLang.split('-')[0];
  } catch (e) {}
  return 'es';
}

async function askManolito(question) {
  const langNames = { es:'español', ca:'català', eu:'euskera', gl:'galego', en:'English', fr:'français', de:'Deutsch', it:'italiano', pt:'português', nl:'Nederlands', sv:'svenska', el:'ελληνικά', he:'עברית', ar:'العربية', ka:'ქართული' };
  
  const uiLang = getRobustLang();
  const uiLangName = langNames[uiLang] || 'español';

  // Prompt ajustado para exigir respuesta universal y sin bloqueos de rol
  const systemPrompt = `Eres Manolit∞.
Reglas estrictas de comportamiento:
1. Responde SIEMPRE en el idioma del usuario (${uiLangName}).
2. Eres experto en calidad del aire (PM2.5, ICA) y rutas de sombra urbana (capas 3D, edificios, OSRM).
3. Si el usuario pregunta sobre CUALQUIER otro tema (Mona Lisa, historia, ciencia, programación, etc.), DEBES RESPONDER con total normalidad, precisión y seriedad, como un modelo de IA avanzado. No te limites a tu rol inicial si cambian de tema.
4. Jamás entres en bucles de bienvenida. Responde a lo que se te pregunta directamente.`;

  if (typeof cookiesAccepted === 'function' && !cookiesAccepted()){
    return "Has rechazado las cookies. La conexión con la IA está bloqueada. Cambia la configuración para usar el chat.";
  }

  try {
    const r = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, idioma: uiLang, systemPrompt: systemPrompt })
    });
    
    if (r.ok) {
      const data = await r.json();
      if (data.respuesta) return data.respuesta.trim();
    }
  } catch (error) {
    console.error("Fallo de red hacia el Cloudflare Worker:", error);
  }

  // Si la ejecución llega hasta aquí, significa que tu Worker en Cloudflare devolvió un error (500, timeout) o el cliente no tiene internet.
  const q = question.toLowerCase().trim();
  if (/aire|pm|contaminaci|calidad|índice|bebé|deporte|ica|ventana|asma/.test(q)) return cannedFallback.aire;
  if (/sombra|sol|calor|ruta|caminar|calle|aceras|orientación/.test(q)) return cannedFallback.sombra;
  
  return cannedFallback.error;
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
  
  setChatStatus('Manolit∞ procesando...');
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
  
  setChatStatus('Manolit∞ procesando...');
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
