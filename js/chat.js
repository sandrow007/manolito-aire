/* ============================================================
   MANOLITO AIRE — chat "No lo entiendo"
   Cadena de fallback, igual filosofía que Manolito Forestal:
   1) Cloudflare Workers AI (tu propio endpoint — rellena la URL)
   2) Pollinations (gratis, sin clave, funciona ya tal cual)
   3) Respuesta local determinista (siempre funciona, es la red de seguridad)
   ============================================================ */

// PASO 1 — cuando tengas tu Worker de Cloudflare AI desplegado,
// pon aquí su URL. Mientras esté vacío, se salta directo a Pollinations.
const CLOUDFLARE_WORKER_URL = ""; // ej: "https://manolito-aire-ai.tu-usuario.workers.dev"

const cannedFallback = {
  pm25: "El PM2.5 son partículas tan pequeñas que entran hasta lo más hondo de tus pulmones. Cuanto más bajo el número, mejor. Por debajo de 10 se considera muy buen aire.",
  color: "El color del círculo cambia según lo bueno o malo que esté el aire ahora mismo: verde es buena señal, ámbar es \"ojo, cuidado\", y rojo ladrillo significa que hoy mejor evitas estar mucho tiempo fuera.",
  bebe: "Con bebés se recomienda ser más prudente que con adultos. Si el círculo está en verde, sin problema. Si está en ámbar o rojo, mejor paseos cortos y evitar horas de más tráfico.",
  generic: "Ahora mismo no puedo conectar con el motor de IA, pero por lo general: verde significa que puedes salir tranquilo, ámbar que tengas algo de cuidado si eres sensible, y rojo que es mejor quedarse dentro si puedes."
};

async function askManolito(question){
  const systemPrompt = "Eres Manolito, un asistente amable que explica la calidad del aire en España de forma clara y humana, en frases cortas, sin tecnicismos salvo que te los pidan.";

  // Si el usuario rechazó las cookies, no llamamos a ningún servicio externo —
  // solo respuestas locales, tal y como le prometimos en la puerta de consentimiento.
  if (typeof cookiesAccepted === 'function' && !cookiesAccepted()){
    return cannedFallback.generic + " (Has rechazado las cookies, así que el chat solo usa respuestas locales. Puedes cambiarlo en Cookies.)";
  }

  // 1) Cloudflare Workers AI
  if (CLOUDFLARE_WORKER_URL){
    try{
      const r = await fetch(CLOUDFLARE_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, question })
      });
      if (r.ok){
        const data = await r.json();
        if (data.response) return data.response;
      }
    } catch(e){ /* seguimos a Pollinations */ }
  }

  // 2) Pollinations — gratis, sin clave
  try{
    const prompt = encodeURIComponent(`${systemPrompt}\nPregunta del usuario: ${question}\nRespuesta breve en español:`);
    const r = await fetch(`https://text.pollinations.ai/${prompt}`);
    if (r.ok){
      const text = await r.text();
      if (text && text.trim().length > 0) return text.trim();
    }
  } catch(e){ /* seguimos a la respuesta local */ }

  // 3) Respuesta local determinista — siempre responde algo
  return cannedFallback.generic;
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
  if (btn) addBubble(btn.textContent, 'user');
  setChatStatus('Manolito está pensando...');
  const answer = cannedFallback[key] || await askManolito(key);
  addBubble(answer, 'mano');
  setChatStatus('');
}

async function askCustom(){
  const input = document.getElementById('chatInputField');
  const question = input.value.trim();
  if (!question) return;
  addBubble(question, 'user');
  input.value = '';
  setChatStatus('Manolito está pensando...');
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
