/* ============================================================
   MANOLIT∞ — Aire + Sombra
   Cascada: 1) Cloudflare Worker -> 2) OpenRouter -> 3) Error
   ============================================================ */
const CLOUDFLARE_WORKER_URL = "https://manolito-aire.sandro-a007.workers.dev/manolito";
const OPENROUTER_API_KEY = ""; // <- Si Cloudflare falla, necesita esta clave para el fallback
const OPENROUTER_MODEL = "google/gemma-3-27b-it";

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

  const systemPrompt = `Eres Manolit∞.
Reglas estrictas:
1. Responde SIEMPRE en ${uiLangName}.
2. Eres experto en calidad del aire y rutas de sombra urbana.
3. Si el usuario pregunta sobre cualquier otro tema fuera de tu especialidad, DEBES RESPONDER con total normalidad, precisión y seriedad (actúa como un LLM general de alta calidad).
4. Jamás repitas frases de presentación ni entres en bucles de bienvenida.`;

  if (typeof cookiesAccepted === 'function' && !cookiesAccepted()){
    return "Conexión a la IA bloqueada por falta de permisos. Acepta las cookies para usar el chat.";
  }

  // 1) Intentar Cloudflare AI (Worker)
  if (CLOUDFLARE_WORKER_URL) {
    try {
      const resCF = await fetch(CLOUDFLARE_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, idioma: uiLang, systemPrompt: systemPrompt })
      });
      
      if (resCF.ok) {
        const dataCF = await resCF.json();
        if (dataCF.respuesta) return dataCF.respuesta.trim();
      }
    } catch (error) {
      console.warn("Cloudflare Worker falló. Pasando al fallback de OpenRouter...");
    }
  }

  // 2) Intentar OpenRouter (Fallback)
  if (OPENROUTER_API_KEY) {
    try {
      const resOR = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "Manolito Aire"
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question }
          ]
        })
      });

      if (resOR.ok) {
        const dataOR = await resOR.json();
        const msgOR = dataOR.choices?.[0]?.message?.content;
        if (msgOR) return msgOR.trim();
      }
    } catch (error) {
      console.error("OpenRouter falló.");
    }
  }

  // 3) Caída total del sistema
  return "Error de conexión. Los servidores de IA están inaccesibles en este momento.";
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
  
  setChatStatus('Manolit∞ analizando...');
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
  
  setChatStatus('Manolit∞ analizando...');
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