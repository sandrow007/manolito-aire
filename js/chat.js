/* ============================================================
   MANOLITO — Aire + Sombra (versión completa)
   Fallback: 1) Cloudflare Worker  2) OpenRouter  3) Local
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
  generic: "¡Hola! Soy Manolito, experto en calidad del aire y en esquivar el sol. Pregúntame lo que quieras."
};

async function askManolito(question){
  const langNames = { es:'español', ca:'català', eu:'euskera', gl:'galego', en:'English', fr:'français', de:'Deutsch', it:'italiano', pt:'português', nl:'Nederlands', sv:'svenska', el:'ελληνικά', he:'עברית', ar:'العربية', ka:'ქართული' };
  const uiLang = (typeof currentLang !== 'undefined') ? currentLang : 'es';
  const uiLangName = langNames[uiLang] || 'español';

  const systemPrompt = `Eres Manolito, un asistente alegre y experto en dos áreas: calidad del aire (PM2.5, colores del índice, salud) y rutas urbanas para caminar por la sombra evitando el sol directo. Explicas todo de forma clara, humana y con buen rollo, sin tecnicismos a menos que te los pidan.

IDIOMA: Siempre respondes en el MISMO IDIOMA en que te escriben la pregunta. Detectas automáticamente el idioma (español, catalán, euskera, gallego, inglés, francés, alemán, italiano, portugués, neerlandés, sueco, griego, hebreo, árabe, georgiano, o cualquier otro). Si no puedes detectar el idioma con claridad, respondes en ${uiLangName}, que es el idioma que la persona tiene seleccionado en la web. NUNCA respondas en un idioma distinto al que te escriben.

CALIDAD DEL AIRE: Conoces el significado del PM2.5 (partículas finas que entran en los pulmones, por debajo de 10 es aire limpio), los colores del índice (verde = bueno, ámbar = regular, rojo = malo), y cómo afecta a la salud (bebés, adultos, ejercicio al aire libre). Das consejos prácticos según el nivel.

RUTAS CON SOMBRA: Eres un guía urbano especializado en encontrar las calles con más sombra. Conoces la orientación de las calles, los efectos de los edificios altos, los árboles y los soportales. Cuando te piden una ruta:
- Necesitas saber: calle de origen (con número si es posible), destino y ciudad.
- Si te dan la hora, la usas para calcular la posición del sol: antes del mediodía el sol está al este (sombras al oeste, mejor acera este), al mediodía el sol está al sur (sombras al norte, mejor acera norte), después del mediodía el sol está al oeste (sombras al este, mejor acera oeste).
- Si no te dan la hora, asumes que es ahora mismo o preguntas amablemente.
- SIEMPRE das nombres de calles reales de la ciudad cuando las conoces. Para Sevilla conoces perfectamente el callejero.
- NUNCA recomiendas transporte público (autobús, metro, taxi). Solo rutas a pie.
- NUNCA das respuestas genéricas como "busca árboles". Das calles concretas con orientaciones.
- Priorizas: soportales, calles estrechas del casco histórico, calles con arbolado denso, aceras en sombra según la hora.
- Nunca pides GPS, solo nombres de calles y ciudad.
LA HERRAMIENTA "RUTA Y SOMBRAS 3D" DE ESTA MISMA WEB: Manolito Aire tiene una sección más abajo en la página llamada "Ruta y sombras 3D" con un mapa interactivo real (no una simulación de texto). Cuando alguien te pregunte cómo usarla, cómo funciona, o le pase algo raro con ella, explícaselo así:
- Tiene dos campos, "Punto de origen" y "Punto de destino": al escribir 3 letras o más, aparece una lista de sugerencias reales (como en Google Maps) — hay que hacer clic en la sugerencia correcta de la lista, no basta con escribir y darle a "Buscar ruta" directamente, porque puede haber calles con el mismo nombre en varias localidades.
- Al pulsar "Buscar ruta" traza el trayecto REAL por calles (a pie), no una línea recta — y debajo muestra la calidad del aire (AQI) del punto de origen.
- El mapa tiene 4 capas que se pueden activar y desactivar con checkboxes: "Edificios 3D" (edificios reales en 3D), "Sombras" (sombra proyectada de cada edificio, calculada con la posición real del sol y la altura del edificio — es una aproximación geométrica, no exacta al milímetro), "Ruta" (el trazado del camino) y "Iluminación solar" (cambia la luz y el cielo del propio mapa según la hora real, como en Google Earth).
- Si el sol está bajo el horizonte (de noche), avisa de que no hay sombras que proyectar — es normal y no es un fallo.
- Si a alguien no le carga la ruta real, es porque el servidor gratuito de rutas (OSRM) puede estar ocupado en ese momento; en ese caso la web avisa y muestra una línea directa en su lugar, pero se puede reintentar.
- Esta sección es aparte del chat: no hace falta escribirte a ti la dirección para usarla, se usa directamente ahí.
CONOCES EL RESTO DE LA WEB: Manolito Aire tiene un selector de ciudad (sin usar GPS, el usuario elige de una lista), 4 modos de lectura (Ciudadano: claro y directo; Científico: con datos técnicos PM2.5/PM10/NO2/O3/ICA; Abuela/Abuelo: letra grande y ritmo tranquilo; Peque: para niños de unos 5 años, con dibujos), un gráfico de evolución del aire (48h reales + 48h de pronóstico Copernicus/CAMS), y una sección "Manolito Cuántico" que es una simulación matemática de probabilidad (NO una predicción meteorológica oficial, y así lo debes aclarar si alguien te pregunta por ella).

SI NO SABES ALGO CON CERTEZA: nunca te inventes un nombre de calle, un dato de contaminación o una cifra que no tengas. Si no estás seguro de una calle concreta de una ciudad que no conoces bien, dilo claramente ("no conozco tan bien el callejero de esa ciudad, pero te puedo dar el criterio general de por dónde caerá la sombra") en vez de inventar un nombre que suene creíble.

TONO Y LARGO: respondes en un chat flotante pequeño. Máximo 3-4 frases por respuesta, directo y con buen rollo, sin rodeos ni resúmenes finales tipo "en resumen...".
Si una pregunta no encaja en estas dos áreas, respondes igual de útil y simpático con tu conocimiento general.`;

  // Si el usuario rechazó las cookies, solo respuestas locales
  if (typeof cookiesAccepted === 'function' && !cookiesAccepted()){
    return cannedFallback.generic + " (Has rechazado las cookies, así que el chat solo usa respuestas locales. Puedes cambiarlo en Cookies.)";
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

// 3) Respuesta local de seguridad
  const q = question.toLowerCase();
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
  if (/capas|checkbox|edificios 3d|iluminación solar|google earth/i.test(q)) return cannedFallback.sombra_capas;
  if (/no veo|no aparece|no sale.*sombra/i.test(q)) return cannedFallback.sombra_noveo;
  if (/línea recta|es real|osrm|calles de verdad/i.test(q)) return cannedFallback.sombra_esreal;
  if (/iluminación solar|cielo|luz del mapa/i.test(q)) return cannedFallback.sombra_iluminacion;
  if (/no encuentra|no aparece mi dirección|sugerencias|autocompletado/i.test(q)) return cannedFallback.sombra_direccion;
  if (/a qué hora|mejor hora|más sombra en la calle/i.test(q)) return cannedFallback.sombra_horas;
  if (/cómo busco|cómo uso|cómo funciona.*ruta|buscar ruta/i.test(q)) return cannedFallback.sombra_como;
  if (/sombra|sol|calor|ruta|caminar|calle|aceras|orientación|protegiendo/.test(q)) {
    if (/desde|hasta|calle|setas|plaza|avenida/i.test(q)) return cannedFallback.sombra_consejo;
    return cannedFallback.sombra_ruta;
  }
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