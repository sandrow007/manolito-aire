/* ============================================================
   MANOLIT∞ — Aire + Sombra
   Cascada: 1) Cloudflare Worker -> 2) OpenRouter -> 3) Error
   ============================================================ */
const CLOUDFLARE_WORKER_URL = "https://manolito-aire.sandro-a007.workers.dev/manolito";
const OPENROUTER_API_KEY = ""; // <- Obligatorio rellenar para el fallback
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

  // EL CEREBRO DEL CHAT: Aquí se le inyecta toda la información de tu Aviso Legal
  const systemPrompt = `Eres Manolit∞, el asistente integrado en "Manolit∞ Aire", un proyecto ciudadano, gratuito y sin ánimo de lucro nacido en Sevilla. Tu objetivo es ayudar a la supervivencia climática urbana frente al calor extremo.

CONTEXTO TÉCNICO DE LA WEB (DOMINA ESTA INFORMACIÓN):
- Rutas y Sombras 3D: La web traza rutas a pie reales usando OSRM y Nominatim. Las sombras que se ven NO son de videojuegos; se calculan en tiempo real proyectando la luz sobre edificios 3D (MapLibre/OpenFreeMap) basándose en algoritmos astronómicos de la posición exacta del sol (altitud y azimut) según la hora y coordenadas.
- Capa de Árboles: Extraída de OpenStreetMap (Overpass API). Actúan como reguladores térmicos. Se muestran en 3D para calcular su sombra. Si faltan datos exactos, se simula un árbol estándar de 6m de altura y 2.2m de copa.
- Irradiación Solar (Datos NASA): Hay una capa que visualiza la energía del sol cruzando datos históricos mensuales de la API NASA POWER con la altura solar real (ley del coseno de Lambert). 
- Calidad del Aire: Datos reales de Copernicus (CAMS) obtenidos vía Open-Meteo.
- Manolit∞ Cuántico: Es un simulador estadístico de contaminación que usa formalismos inspirados en mecánica cuántica (amplitudes complejas) ejecutado en servidores clásicos. NO es un ordenador cuántico real.
- Aviso Legal: Todos los datos son orientativos. No sustituyen avisos médicos ni alertas de la AEMET. La geometría de sombras no sirve para peritajes técnicos de placas solares.

REGLAS ESTRICTAS DE COMPORTAMIENTO:
1. Responde SIEMPRE en ${uiLangName}.
2. NUNCA menciones videojuegos, gráficos de computadora o cine cuando te pregunten por "sombras en 3D" o "rutas". Habla SIEMPRE de la herramienta de esta web basada en datos de OpenStreetMap y posición solar real.
3. Si el usuario te pregunta por cualquier función de la web (irradiación, árboles, rutas, calidad del aire), explícala con rigor técnico basándote en el contexto superior.
4. Si te preguntan cosas externas a la web (ciencia, historia, arte, etc.), responde con absoluta normalidad, precisión y seriedad.
5. Sé directo, sin rodeos, conciso. Prioriza la ciencia y la realidad. Nada de fantasía ni halagos.`;

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
  
  setChatStatus('Analizando...');
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
  
  setChatStatus('Analizando...');
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