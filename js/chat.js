/* ============================================================
   MANOLIT∞ — Aire + Sombra
   Cascada: 1) Cloudflare Worker -> 2) OpenRouter -> 3) Error
   Motor con Memoria de Contexto y Procesado Markdown
   ============================================================ */
const CLOUDFLARE_WORKER_URL = "https://manolito-aire.sandro-a007.workers.dev/manolito";
const OPENROUTER_API_KEY = ""; // <- Obligatorio rellenar para el fallback
const OPENROUTER_MODEL = "google/gemma-3-27b-it";

// Memoria de la sesión para que la IA entienda el contexto continuado
let chatHistory = [];

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

// Pequeño parser para que las negritas (**) y saltos de línea de la IA se vean bien en HTML
function parseMarkdownToHTML(text) {
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

async function askManolito(question) {
  const uiLang = getRobustLang();

  const systemPrompt = `Eres Manolit∞, asistente experto de "Manolit∞ Aire". 
Misión: Supervivencia climática urbana (calor y contaminación).

CONTEXTO TÉCNICO DE LA WEB (DOMINIO ABSOLUTO):
- Rutas y Sombras 3D: Traza rutas a pie reales (OSRM). Las sombras NO son de videojuegos; se calculan proyectando luz sobre edificios 3D de OpenStreetMap según la posición astronómica exacta del sol.
- Alcance Global: Calcula sombras en CUALQUIER LUGAR DEL MUNDO donde OpenStreetMap tenga edificios 3D.
- Árboles: De OpenStreetMap. Si faltan datos, simulas un árbol de 6m alto y 2.2m copa.
- Irradiación Solar (NASA): Cruza datos históricos de la API NASA POWER con la altura solar real.
- Calidad de Aire y Cuántico: Datos Copernicus. Simulador estadístico cuántico en servidores clásicos (NO es ordenador cuántico).

REGLAS DE INTELIGENCIA Y COMPORTAMIENTO (ESTRICTAS):
1. IDIOMA DINÁMICO: Detecta el idioma exacto de la pregunta del usuario y RESPONDE SIEMPRE EN ESE MISMO IDIOMA (si te escriben en georgiano, responde en georgiano; si en inglés, en inglés).
2. DEDUCCIÓN AVANZADA: Los usuarios tendrán faltas de ortografía y escribirán rápido. Deduce el contexto siempre. JAMÁS digas "no entiendo la pregunta" ni pidas aclaraciones por errores tipográficos. Usa tu inteligencia para inferir qué quieren.
3. CONVERSACIÓN NATURAL: Conoces el historial de la conversación. No repitas saludos, mantén el hilo.
4. EXPERTO UNIVERSAL: Si preguntan cosas ajenas a la web (historia, política, países, arte, código), responde con precisión, seriedad y profundidad como un modelo de lenguaje avanzado.
5. TONO: Directo, empático pero basado estrictamente en ciencia y realidad. Cero fantasía. Cero rodeos.`;

  if (typeof cookiesAccepted === 'function' && !cookiesAccepted()){
    return "Conexión a la IA bloqueada. Acepta las cookies para usar el chat.";
  }

  // Preparamos el contexto para el Worker de Cloudflare
  let promptForWorker = question;
  if (chatHistory.length > 0) {
    const historyText = chatHistory.map(m => `${m.role === 'user' ? 'Usuario' : 'Manolit∞'}: ${m.content}`).join("\n");
    promptForWorker = `[Historial de la conversación:\n${historyText}]\n\nPregunta actual del usuario: ${question}`;
  }

  // Actualizamos el historial propio con la pregunta
  chatHistory.push({ role: 'user', content: question });
  if (chatHistory.length > 8) chatHistory = chatHistory.slice(-8); // Mantiene últimos 8 mensajes

  let finalAnswer = "";

  // 1) Intentar Cloudflare AI (Worker)
  if (CLOUDFLARE_WORKER_URL) {
    try {
      const resCF = await fetch(CLOUDFLARE_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: promptForWorker, idioma: uiLang, systemPrompt: systemPrompt })
      });
      
      if (resCF.ok) {
        const dataCF = await resCF.json();
        if (dataCF.respuesta) finalAnswer = dataCF.respuesta.trim();
      }
    } catch (error) {
      console.warn("Worker falló. Pasando a OpenRouter...");
    }
  }

  // 2) Intentar OpenRouter (Fallback si CF falla)
  if (!finalAnswer && OPENROUTER_API_KEY) {
    try {
      const messagesForOR = [{ role: "system", content: systemPrompt }, ...chatHistory];
      
      const resOR = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "Manolito Aire"
        },
        body: JSON.stringify({ model: OPENROUTER_MODEL, messages: messagesForOR })
      });

      if (resOR.ok) {
        const dataOR = await resOR.json();
        const msgOR = dataOR.choices?.[0]?.message?.content;
        if (msgOR) finalAnswer = msgOR.trim();
      }
    } catch (error) {
      console.error("OpenRouter falló.");
    }
  }

  // 3) Resolución
  if (!finalAnswer) {
    finalAnswer = "Error de conexión. Los servidores de IA están inaccesibles.";
    chatHistory.pop(); // Borra la última pregunta si falló todo para no corromper la memoria
  } else {
    chatHistory.push({ role: 'assistant', content: finalAnswer });
  }

  return finalAnswer;
}

// Funciones de UI
function openChat(){ document.getElementById('chatOverlay').classList.add('open'); }
function closeChat(){ document.getElementById('chatOverlay').classList.remove('open'); }

function addBubble(text, who){
  const body = document.getElementById('chatBody');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (who === 'user' ? 'user' : 'mano');
  
  if (who === 'mano') {
    div.innerHTML = parseMarkdownToHTML(text); // Procesa negritas y saltos de línea de la IA
  } else {
    div.textContent = text; // Texto plano para el usuario (seguridad anti-XSS)
  }
  
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function setChatStatus(text){
  const el = document.getElementById('chatStatus');
  if (el) el.textContent = text;
}

function toggleInputState(disabled) {
  const input = document.getElementById('chatInputField');
  if (input) input.disabled = disabled;
}

async function askQuick(key){
  const btn = document.querySelector(`[data-quick="${key}"]`);
  const questionText = btn ? btn.textContent : key;
  if (!questionText) return;

  toggleInputState(true);
  addBubble(questionText, 'user');
  setChatStatus('Analizando...');
  
  const answer = await askManolito(questionText);
  addBubble(answer, 'mano');
  
  setChatStatus('');
  toggleInputState(false);
}

async function askCustom(){
  const input = document.getElementById('chatInputField');
  if (!input) return;
  const question = input.value.trim();
  if (!question) return;
  
  toggleInputState(true);
  addBubble(question, 'user');
  input.value = '';
  
  setChatStatus('Analizando...');
  
  const answer = await askManolito(question);
  addBubble(answer, 'mano');
  
  setChatStatus('');
  toggleInputState(false);
  input.focus();
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chatInputField');
  if (input){
    input.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter' && !input.disabled) askCustom(); 
    });
  }
});