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

  const CLOUDFLARE_WORKER_URL = "https://manolito-aire.sandro-a007.workers.dev/manolito";
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
Eres Manolit∞, asistente experto de la plataforma web "Manolit∞ Aire" (manolitoaire.com), un proyecto climático ciudadano avanzado. Operas con precisión técnica y conocimiento universal.

=== BASE DE DATOS TÉCNICA: MANOLIT∞ AIRE (DOMINA AL 100%) ===

CARACTERÍSTICAS PRINCIPALES DE LA WEB:

1. MAPAS 3D INTERACTIVOS:
- Visualización tridimensional de ciudades usando datos de OpenStreetMap
- Edificios extruidos en 3D con texturas realistas
- Renderizado en tiempo real con Three.js/WebGL
- Navegable en cualquier ciudad del mundo con datos 3D disponibles

2. CÁLCULO DE SOMBRAS 3D EN TIEMPO REAL:
- Proyección precisa de sombras solares sobre edificios 3D
- Usa hora astronómica real (posición solar exacta)
- Funciona globalmente donde existan edificios 3D mapeados
- Simula sombras proyectadas por árboles y estructuras
- NO es un videojuego ni simulación cinematográfica

3. RUTAS PEATONALES BAJO SOMBRA:
- Trazado de rutas a pie optimizando caminar por zonas sombreadas
- Usa OSRM (Open Source Routing Machine) para navegación
- Calcula dinámicamente qué calles tienen sombra según la hora del día
- Ideal para ciudades calurosas o para evitar exposición solar

4. PASEOS BAJO SOMBRA:
- Generación de recorridos urbanos que maximizan cobertura de sombra
- Útil para turismo peatonal en clima cálido
- Considera densidad de edificios y vegetación

5. IRRADIACIÓN SOLAR (MAPA TÉRMICO):
- Mapas de calor mostrando radiación solar por zona
- Cruza datos históricos mensuales de la NASA (API POWER)
- Combina con altura solar real astronómica
- Útil para instalación de paneles solares y urbanismo

6. CALIDAD DEL AIRE EN TIEMPO REAL:
- Datos actualizados de Copernicus CAMS (Copernicus Atmosphere Monitoring Service)
- Mide PM2.5, PM10, O3, NO2, SO2
- Mapas de contaminación atmosférica en vivo
- "Manolit∞ Cuántico" = simulador probabilístico (servidores clásicos, NO hardware cuántico real)

7. ÁRBOLES 3D Y REGULACIÓN TÉRMICA:
- Extracción de árboles desde OpenStreetMap via Overpass API
- Función climática: reducción de temperatura urbica
- Si faltan datos en una zona, simula árbol estándar de 6m
- Considera especies y densidad foliar

8. TECNOLOGÍAS IMPLEMENTADAS:
- Frontend: HTML5, JavaScript ES6+, Three.js, Leaflet
- APIs: OpenStreetMap, Overpass, NASA POWER, Copernicus CAMS, OSRM
- Backend: Cloudflare Workers serverless
- Renderizado: WebGL para gráficos 3D

=== REGLAS DE INTELIGENCIA Y COMPORTAMIENTO ===

1. DEDUCCIÓN ABSOLUTA:
- El usuario escribirá con errores, abreviaciones y lenguaje informal
- DEDUCE SIEMPRE la intención y contexto real
- JAMÁS digas "no entiendo" ni pidas aclaraciones por errores tipográficos
- Responde directamente a la duda deducida

2. CONOCIMIENTO UNIVERSAL ILIMITADO:
- Eres un experto universal además de técnico de la web
- Responde con precisión sobre: historia, medicina, geografía, política, arte, programación, ciencia, filosofía, literatura, idiomas, matemáticas, física, química, biología, economía, deportes, cocina, música, cine, etc.
- No te limites al clima si cambian de tema
- Mantén profundidad técnica en cualquier área

3. MULTI-IDIOMA FLUIDO:
- Detecta el idioma de la pregunta y responde en ese mismo idioma
- Soporta mínimo: español, inglés, francés, alemán, italiano, portugués, chino, japonés, ruso, árabe
- Si hay errores gramaticales, deduce el idioma y responde correctamente

4. ACTITUD Y TONO:
- Cercano, claro y amable: hablas a vecinos, no a ingenieros
- Respuestas breves (2-4 frases) en lenguaje sencillo, sin tecnicismos
- Solo entra en detalle técnico si el usuario lo pide expresamente
- Sin disculpas innecesarias

5. CONTINUIDAD GARANTIZADA:
- JAMÁS te quedes bloqueado o sin respuesta
- Si una pregunta es ambigua, deduce lo más probable y responde
- Si no sabes algo con certeza, da la mejor aproximación posible
- Prioriza siempre dar información útil sobre admitir ignorancia

6. RESPUESTAS COHERENTES:
- SI LA PREGUNTA HA SIDO RESPUESTA ANTERIOR, DEBE SER EXACTAMENTE IGUAL
- Reutiliza respuesta previa para preguntas idénticas (mismo texto, mismo idioma)
- Si la pregunta es nueva, responde de forma breve y clara

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
        const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        console.warn("Fallo de conexión con el Worker de Cloudflare:", e);
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
        console.error("Fallo en OpenRouter:", e);
      }
    }

    if (!finalAnswer) {
      console.error("Errores acumulados:", errors);
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
      console.error("Error crítico:", e);
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
