/* ============================================================
   MANOLIT∞ — Aire + Sombras 3D
   VERSIÓN DEFINITIVA: CONTEXTO TÉCNICO ROBUSTO + IA UNIVERSAL

   FIX: este archivo declaraba "let currentLang = '';" en la
   primera línea, pero i18n.js ya declara esa misma variable a
   nivel global con let/const. Dos <script> normales comparten el
   mismo ámbito léxico para let/const, así que la segunda
   declaración lanzaba:
     "Uncaught SyntaxError: Identifier 'currentLang' has already
      been declared (at chat.js:1:1)"
   y eso abortaba TODO el archivo (nada de lo que hay aquí se
   llegaba a ejecutar: ni el chat, ni sus botones).

   Se quita esa redeclaración (este script ya sabía leer la
   variable global de i18n.js vía "typeof currentLang") y además
   se envuelve todo en una IIFE para que nada de lo que declaremos
   aquí pueda volver a chocar con otro script en el futuro. Las
   funciones que el HTML pueda llamar directamente (onclick="...")
   se exponen explícitamente en window al final.
   ============================================================ */

(function () {
  'use strict';

  // MISMO DOMINIO: el chat llama a manolitoaire.com/manolito (el Worker que
  // ya sirve la propia web). Antes apuntaba a la URL workers.dev, que está
  // desactivada en este proyecto: el chat se quedaba sin servidor y moría.
  // Al ser same-origin además desaparece cualquier problema de CORS.
  const CLOUDFLARE_WORKER_URL = "/manolito";
  const OPENROUTER_API_KEY = "";
  const OPENROUTER_MODEL = "google/gemma-3-27b-it";

  let chatHistory = [];
  const QUESTION_CACHE = new Map();

  function getRobustLang() {
    // OJO: "currentLang" aquí NO se declara en este archivo — se lee la
    // variable global que ya crea i18n.js. Si i18n.js aún no ha cargado,
    // "typeof" no revienta y caemos a los siguientes métodos.
    try {
      if (typeof currentLang !== 'undefined' && currentLang) return currentLang;
    } catch (e) { /* currentLang no existe todavía, seguimos */ }
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
    html = html.replace(/^### (.*$)/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  const MANOLITO_SYSTEM_CONTEXT = `[INSTRUCCIONES SISTEMA - CUMPLIR ESTRICTAMENTE]

IDENTIDAD:
Eres Manolit∞, asistente de "Manolit∞ Aire" (manolitoaire.com), web de calidad del aire y sombras 3D. Tu personalidad es cercana, natural y con cultura general amplia: hablas de cualquier tema con soltura (música, historia, filosofía, arte, actualidad...) igual que un amigo con curiosidad. Nunca fuerces la conversación de vuelta al clima si el usuario habla de otra cosa; sigue su hilo. Nunca fuerces una venta ni redirijas hacia "usa Manolit∞ para..." salvo que lo pidan. Si te hablan en español, a veces (no siempre) se te escapa alguna expresión andaluza, con gracia y sin abusar.

=== CONOCIMIENTO DE LA WEB (ESTADO ACTUAL) ===
- Calidad del aire en vivo (Open-Meteo/Copernicus CAMS): PM2.5, PM10, NO2, O3, histórico y pronóstico 48 h, modos ciudadano/científico/yayo/peque.
- Mapa de sombras 3D con MapLibre GL: TODOS los edificios visibles proyectan sombra real según la posición del sol (SunCalc); slider de hora, solsticios, hora dorada/azul, modo oscuro.
- Árboles y palmeras 3D reales de OpenStreetMap con su sombra (la palmera también proyecta la del tronco).
- Rutas con sombra sobre red peatonal real: % de sombra (edificios+árboles) en vivo, ruta "fresca" (Dijkstra térmico), indicaciones paso a paso plegables con lectura por voz y guía por voz GPS ("Iniciar caminata"). Buscador de calles centrado en España.
- Nubes reales (OpenWeatherMap) que atenúan las sombras con luz difusa: pierden contraste pero nunca desaparecen.
- Irradiación solar hora a hora con datos NASA POWER y atenuación umbra/penumbra.
- Extras: planetario sol/luna en vivo, pantalla completa también en iPhone, paseo virtual 3D, captura, capas IGN y Catastro, idiomas es/ca/eu/gl/en/ka.
- Gratis, sin registro, sin publicidad; la ubicación solo si se comparte.

=== ESPECIALIDAD CATEDRÁTICA (clima urbano y salud solar) ===
- Sombras y luz natural en general; posición solar según hora y estación.
- Estimación de alturas por descripción: "edificio de 3 plantas ≈ 9-10 m; un árbol que llega a la planta 2 ≈ 6 m; a las 00:00 la sombra cae hacia X y mide aproximadamente Y metros". Cifras aproximadas y útiles.
- Nubosidad: efecto en la radiación solar y la sensación térmica.
- Mercurio retrógrado: qué es astronómicamente (efecto óptico aparente) y su significado cultural, con naturalidad.
- Árboles urbanos: especies comunes en Sevilla, Madrid, Barcelona, Valencia, Córdoba, Jaén, Huelva, Jerez, Almería, Tbilisi y el mundo; hoja, sombra que producen, alturas típicas, variación por especie y estación.
- Polen por época y zona; calidad del aire y contaminación de coches según la ubicación de la persona.
- Salud solar: tipos de UV, fototipos, protección, fotosensibilidad (lupus, medicación fotosensibilizante); consejos de playa en verano Y en invierno (el sol de invierno también quema).

SALUD: información educativa y sentido común (protección, horarios, hidratación). No diagnostiques ni sustituyas al médico; si describen un problema concreto de piel u ojos, sugiere con naturalidad dermatólogo u oftalmólogo sin sonar a aviso legal.

=== REGLAS ===
1. DEDUCCIÓN ABSOLUTA: el usuario escribirá con errores e informalidad; deduce la intención y responde directo, jamás digas "no entiendo".
2. CONOCIMIENTO UNIVERSAL: cualquier tema (historia, ciencia, cocina, música...), con profundidad si la piden.
3. MULTI-IDIOMA: responde en el idioma de la pregunta (es, en, fr, de, it, pt, zh, ja, ru, ar...).
4. TONO: cercano y claro, BREVEDAD ESTRICTA (2-4 frases cortas, máximo ~60 palabras) salvo que pidan más detalle.
7. CREADOR Y FAMILIA (si preguntan): la creó Sandro, georgiano-español (sevillano, andaluz), cansado de la falta de soluciones ante el cambio climático. Es libre y gratis para siempre: nadie puede venderla ni ponerle suscripción. Hermanos: Manolit∞ Forestal (manolitoforestal.space, incendios forestales en tiempo real) e Islas de Calor Sevilla (islasdecalorsevilla.com, estrés térmico urbano).
8. NO INVENTES datos concretos (cifras, fechas, nombres): si no lo sabes, dilo con naturalidad.
5. CONTINUIDAD: nunca te quedes sin respuesta; da la mejor aproximación posible.
6. COHERENCIA: si la pregunta ya fue respondida, usa exactamente la respuesta previa.

[FIN DE INSTRUCCIONES SISTEMA]`;

  async function askManolito(question) {
    const uiLang = getRobustLang();

    if (typeof cookiesAccepted === 'function' && !cookiesAccepted()) {
      return "Conexión bloqueada. Acepta las cookies para interactuar con la IA.";
    }

    let historyText = "";
    if (chatHistory.length > 0) {
      historyText = "\n--- HISTORIAL DE CONVERSACIÓN ---\n";
      chatHistory.forEach(m => {
        historyText += `🔹 ${m.role === 'user' ? "TÚ" : "MANOLIT∞"}: ${m.content}\n`;
      });
      historyText += "-------------------------\n";
    }

    const fullContext = `${MANOLITO_SYSTEM_CONTEXT}

${historyText}

=== PREGUNTA ENTRANTE ===
Idioma detectado: ${uiLang}
Pregunta: "${question}"

INSTRUCCIÓN FINAL: 
1. Si esta pregunta ya fue respondida antes, usa la respuesta previa.
2. Si la pregunta es nueva, responde de forma breve y clara.
3. Si es sobre manolitoaire.com, usa tu conocimiento específico. 
4. Si es sobre otro tema, responde como experto universal.
5. JAMÁS inventes información nueva si ya existe en la historia.

RESPUESTA REQUERIDA: En el mismo idioma del usuario. 
=== FIN PREGUNTA ===`;

    chatHistory.push({ role: 'user', content: question });
    if (chatHistory.length > 8) chatHistory.shift();

    let finalAnswer = "";
    let errors = [];

    if (CLOUDFLARE_WORKER_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const res = await fetch(CLOUDFLARE_WORKER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify({
            message: question,
            idioma: uiLang,
            systemPrompt: MANOLITO_SYSTEM_CONTEXT,
            history: chatHistory.slice(-6)
          })
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.respuesta && data.respuesta.trim().length > 0) {
            finalAnswer = data.respuesta.trim();
          } else if (data.error) {
            errors.push(`Worker: ${data.error}`);
          }
        } else {
          errors.push(`Worker HTTP ${res.status}`);
        }
      } catch (e) {
        errors.push(`Worker: ${e.name === 'AbortError' ? 'Timeout' : e.message}`);
        console.debug("Fallo de conexión con el Worker de Cloudflare:", e);
      }
    }

    if (!finalAnswer && OPENROUTER_API_KEY) {
      try {
        const messagesForOR = [
          { role: "system", content: MANOLITO_SYSTEM_CONTEXT },
          ...chatHistory.map(m => ({
            role: m.role,
            content: m.content
          }))
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://manolitoaire.com",
            "X-Title": "Manolit∞ Aire"
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: messagesForOR,
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
        } else {
          errors.push(`OpenRouter HTTP ${res.status}`);
        }
      } catch (e) {
        errors.push(`OpenRouter: ${e.name === 'AbortError' ? 'Timeout' : e.message}`);
        console.debug("Fallo en OpenRouter:", e);
      }
    }

    if (!finalAnswer) {
      console.debug("Errores acumulados:", errors);
      finalAnswer = `⚠️ Ahora mismo no puedo conectar con el servidor de Manolit∞.

Inténtalo de nuevo en unos segundos. Mientras tanto, las preguntas rápidas de abajo tienen respuesta inmediata.`;
      chatHistory.pop();
    }

    if (finalAnswer) {
      const normalizedQuestion = question.trim().toLowerCase();
      QUESTION_CACHE.set(normalizedQuestion, finalAnswer);
    }

    return finalAnswer;
  }

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
    const questionText = btn ? btn.textContent.trim() : key;
    if (!questionText) return;

    // Respuesta local inmediata: las preguntas rápidas tienen respuesta
    // fija en i18n.js (quick_aN), así que funcionan siempre, incluso sin
    // conexión, y no hace falta llamar al servidor.
    try {
      const msgs = (typeof window.getMessages === 'function') ? window.getMessages(getRobustLang()) : null;
      const aKey = 'quick_a' + String(key).replace(/^q/, '');
      const canned = msgs && msgs[aKey];
      if (canned) {
        addBubble(questionText, 'user');
        addBubble(canned, 'mano');
        return;
      }
    } catch (e) { /* si falla, seguimos con la IA */ }

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
    setChatStatus('Manolit∞ analizando contexto...');

    try {
      const answer = await askManolito(question);
      addBubble(answer, 'mano');
    } catch (e) {
      addBubble("Error inesperado. Reinténtalo en un momento.", 'mano');
      console.debug("Error crítico:", e);
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

    const chatTrigger = document.querySelector('[data-chat-trigger]');
    if (chatTrigger) {
      chatTrigger.addEventListener('click', () => {
        setTimeout(openChat, 100);
      });
    }

    // El chat NO es modal: no hay fondo que intercepte clics, así que se
    // puede navegar por la web con el chat abierto. Se cierra con la X
    // del panel o con la tecla Escape.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeChat();
    });

    initLogoVariantes();
  });

  /* ---- Logo M∞: 7 combinaciones de color que rotan en cada carga ----
     Cada vez que alguien entra a la web, el anillo del widget estrena
     paleta (se guarda el índice y avanza de uno en uno). */
  const LOGO_VARIANTES = [
    { ring: 'conic-gradient(from 0deg,#00f0ff,#7b2fff,#ff00e5,#ff8800,#ffee00,#00ffc8,#00f0ff)',  ink: 'linear-gradient(100deg,#00f0ff,#7b2fff,#ff00e5)' },
    { ring: 'conic-gradient(from 40deg,#ff6b1a,#ffee00,#00ffc8,#00f0ff,#7b2fff,#ff00e5,#ff6b1a)', ink: 'linear-gradient(100deg,#ffee00,#ff6b1a,#ff00e5)' },
    { ring: 'conic-gradient(from 90deg,#00ffc8,#00f0ff,#7b2fff,#ff00e5,#ff3366,#ffee00,#00ffc8)', ink: 'linear-gradient(100deg,#00ffc8,#00f0ff,#7b2fff)' },
    { ring: 'conic-gradient(from 160deg,#ffee00,#00ff88,#00f0ff,#7b2fff,#ff00e5,#ff4400,#ffee00)', ink: 'linear-gradient(100deg,#00ff88,#00f0ff,#ffee00)' },
    { ring: 'conic-gradient(from 220deg,#7b2fff,#ff00e5,#ff4400,#ffee00,#00ffc8,#00f0ff,#7b2fff)', ink: 'linear-gradient(100deg,#ff00e5,#7b2fff,#00f0ff)' },
    { ring: 'conic-gradient(from 300deg,#00f0ff,#00ff88,#ffee00,#ff8800,#ff00e5,#7b2fff,#00f0ff)', ink: 'linear-gradient(100deg,#00f0ff,#00ff88,#ffee00)' },
    { ring: 'conic-gradient(from 120deg,#ff3366,#ff8800,#ffee00,#00ffc8,#00f0ff,#7b2fff,#ff3366)', ink: 'linear-gradient(100deg,#ff8800,#ff3366,#7b2fff)' }
  ];

  function initLogoVariantes() {
    let i = parseInt(localStorage.getItem('manolito_logo_variant') || '-1', 10);
    i = (isNaN(i) ? 0 : i + 1) % LOGO_VARIANTES.length;
    localStorage.setItem('manolito_logo_variant', String(i));
    const v = LOGO_VARIANTES[i];
    document.documentElement.style.setProperty('--chat-ring', v.ring);
    document.documentElement.style.setProperty('--chat-ink', v.ink);
  }

  function initWelcomeMessage() {
    const lang = getRobustLang();
    const welcome = lang === 'en'
      ? "Hola! Soy Manolit∞, asistente de manolitoaire.com. Pregúntame sobre sombras 3D, irradiación solar, calidad del aire, rutas bajo sombra... o cualquier otro tema. ¿En qué puedo ayudarte?"
      : "¡Hola! Soy Manolit∞, asistente de manolitoaire.com. Pregúntame sobre sombras 3D, irradiación solar, calidad del aire, rutas bajo sombra... o sobre cualquier otro tema. ¿En qué puedo ayudarte?";

    const body = document.getElementById('chatBody');
    if (body && body.children.length === 0) {
      addBubble(welcome, 'mano');
    }
  }

  setTimeout(initWelcomeMessage, 500);

  // Si tu HTML llama a estas funciones con onclick="askCustom()", etc.,
  // necesitan existir en window porque ahora viven dentro de una IIFE.
  window.openChat = openChat;
  window.closeChat = closeChat;
  window.askQuick = askQuick;
  window.askCustom = askCustom;
})();