/* ============================================================
   MANOLIT∞ — Aire + Sombras 3D
   VERSIÓN CORREGIDA: CONTEXTO SEPARADO + MEMORIA COHERENTE
   ============================================================ */

const CLOUDFLARE_WORKER_URL = "https://manolito-aire.sandro-a007.workers.dev/manolito";
const OPENROUTER_API_KEY = ""; // Respaldo opcional
const OPENROUTER_MODEL = "google/gemma-3-27b-it";

// HISTORIAL PERSISTENTE - Se mantiene entre preguntas
let chatHistory = [];
const MAX_HISTORY = 10; // Aumentamos para mejor contexto

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

function parseMarkdownToHTML(text) {
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

// ====== SYSTEM PROMPT SEPARADO Y CLARO ======
const SYSTEM_PROMPT = `Eres Manolit∞, asistente de la web manolitoaire.com y también un asistente universal.

SOBRE LA WEB manolitoaire.com:
- Mapas 3D con cálculo de sombras solares en tiempo real (OpenStreetMap + Three.js)
- Rutas peatonales bajo sombra (OSRM)
- Irradiación solar (NASA POWER API)
- Calidad del aire en tiempo real (Copernicus CAMS)
- Árboles 3D como reguladores térmicos
- "Manolit∞ Cuántico" = simulador probabilístico (no hardware cuántico real)

COMPORTAMIENTO:
1. Responde en el mismo idioma del usuario
2. Si te preguntan sobre la web, usa el conocimiento técnico de arriba
3. Si te preguntan sobre OTROS temas (música, historia, ciencia, etc.), responde como experto universal
4. MANTÉN EL CONTEXTO de la conversación: si hablan de Lady Gaga y luego preguntan "¿qué otras canciones tiene?", responde sobre Lady Gaga, NO cambies de tema
5. Deduce siempre la intención del usuario
6. Nunca digas "no entiendo" - deduce y responde`;

async function askManolito(question) {
  const uiLang = getRobustLang();

  if (typeof cookiesAccepted === 'function' && !cookiesAccepted()) {
    return "Conexión bloqueada. Acepta las cookies para interactuar con la IA.";
  }

  // AGREGAR pregunta al historial ANTES de construir el contexto
  chatHistory.push({ role: 'user', content: question });
  
  // Mantener solo los últimos mensajes para no exceder tokens
  while (chatHistory.length > MAX_HISTORY) {
    chatHistory.shift();
  }

  let finalAnswer = "";

  // 1) Cloudflare Worker - Enviar estructura correcta
  if (CLOUDFLARE_WORKER_URL) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // ESTRUCTURA CORRECTA: system + historial completo (incluyendo pregunta actual)
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory // Esto incluye TODA la conversación previa + pregunta actual
      ];
      
      const res = await fetch(CLOUDFLARE_WORKER_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({ 
          messages: messages, // <-- CAMBIO CLAVE: enviar estructura messages completa
          idioma: uiLang,
          systemPrompt: SYSTEM_PROMPT
        })
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        if (data.respuesta && data.respuesta.trim().length > 0) {
          finalAnswer = data.respuesta.trim();
        }
      }
    } catch (e) {
      console.warn("Fallo Worker:", e.message);
    }
  }

  // 2) Fallback OpenRouter - Estructura correcta de messages
  if (!finalAnswer && OPENROUTER_API_KEY) {
    try {
      // ESTRUCTURA CORRECTA PARA OPENROUTER
      const messagesForOR = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory // Historial completo con contexto
      ];
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({ 
          model: OPENROUTER_MODEL, 
          messages: messagesForOR, // <-- Estructura correcta
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          finalAnswer = data.choices[0].message.content.trim();
        }
      }
    } catch (e) {
      console.error("Fallo OpenRouter:", e.message);
    }
  }

  // 3) Manejar respuesta
  if (!finalAnswer) {
    finalAnswer = "Error de conexión. Reformula tu pregunta en un momento.";
    chatHistory.pop(); // Quitar pregunta sin respuesta del historial
  } else {
    // AGREGAR respuesta al historial - CRÍTICO para mantener contexto
    chatHistory.push({ role: 'assistant', content: finalAnswer });
    
    // Mantener límite después de agregar respuesta
    while (chatHistory.length > MAX_HISTORY) {
      chatHistory.shift();
    }
  }

  return finalAnswer;
}

// ========================== INTERFAZ UI ==========================
function openChat() {
  const overlay = document.getElementById('chatOverlay');
  if (overlay) {
    overlay.classList.add('open');
    setTimeout(() => {
      const input = document.getElementById('chatInputField');
      if (input) input.focus();
    }, 300);
  }
}

function closeChat() {
  const overlay = document.getElementById('chatOverlay');
  if (overlay) overlay.classList.remove('open');
}

function addBubble(text, who) {
  const body = document.getElementById('chatBody');
  if (!body) return;
  
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (who === 'user' ? 'user' : 'mano');
  
  if (who === 'mano') {
    div.innerHTML = parseMarkdownToHTML(text);
  } else {
    div.textContent = text;
  }
  
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function setChatStatus(text) {
  const el = document.getElementById('chatStatus');
  if (el) {
    el.textContent = text;
    el.style.opacity = text ? '1' : '0';
  }
}

function toggleInputState(disabled) {
  const input = document.getElementById('chatInputField');
  const sendBtn = document.getElementById('chatSendBtn');
  if (input) input.disabled = disabled;
  if (sendBtn) sendBtn.disabled = disabled;
}

async function askQuick(key) {
  const btn = document.querySelector(`[data-quick="${key}"]`);
  const questionText = btn ? btn.textContent : key;
  if (!questionText) return;
  await sendQuestion(questionText);
}

async function askCustom() {
  const input = document.getElementById('chatInputField');
  if (!input) return;
  const question = input.value.trim();
  if (!question) return;
  
  input.value = '';
  await sendQuestion(question);
  if (input) input.focus();
}

async function sendQuestion(question) {
  toggleInputState(true);
  addBubble(question, 'user');
  setChatStatus('Manolit∞ procesando...');
  
  try {
    const answer = await askManolito(question);
    addBubble(answer, 'mano');
  } catch (e) {
    addBubble("Error inesperado. Reinténtalo.", 'mano');
    console.error("Error:", e);
  } finally {
    setChatStatus('');
    toggleInputState(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chatInputField');
  if (input) {
    input.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter' && !input.disabled) {
        e.preventDefault();
        askCustom();
      } 
    });
  }
});

// Mensaje inicial
function initWelcomeMessage() {
  const lang = getRobustLang();
  const welcome = lang === 'en' 
    ? "Hola! Soy Manolit∞. Pregúntame sobre manolitoaire.com (sombras 3D, irradiación solar, calidad del aire) o sobre cualquier tema. ¿Qué necesitas?"
    : "¡Hola! Soy Manolit∞. Pregúntame sobre manolitoaire.com (sombras 3D, irradiación solar, calidad del aire) o sobre cualquier otro tema. ¿En qué puedo ayudarte?";
  
  const body = document.getElementById('chatBody');
  if (body && body.children.length === 0) {
    addBubble(welcome, 'mano');
  }
}

setTimeout(initWelcomeMessage, 500);
