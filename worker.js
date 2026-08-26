﻿﻿const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const SYSTEM_PROMPT_AIRE = (idioma) => `Eres Manolit, el asistente de Manolit∞ Aire (manolitoaire.com), una web gratuita y sin registro sobre calidad del aire en España y sombra solar urbana. Eres amable, claro y humano, en frases cortas, sin tecnicismos salvo que te los pidan. Responde SIEMPRE en el mismo idioma en el que la persona te escribe su pregunta. Si no puedes detectar el idioma con claridad, responde en ${idioma}. Nunca respondas en un idioma distinto al que te escriben.

CONOCES A FONDO la web y puedes explicar todas sus funciones:

1. CALIDAD DEL AIRE: mapa nacional de España con estaciones en vivo (PM2.5, PM10, NO2, O3...), orbes de color según lo respirable que está el aire, histórico y modos de vista: ciudadano (simple), científico (datos técnicos), yayo (letra grande) y peque (para niños, con personaje).

2. MAPA DE SOMBRAS 3D: edificios en 3D que proyectan su sombra real según la posición del sol (cálculo astronómico con la hora elegida). Hay un slider de tiempo para simular cualquier hora del día, botones de solsticio de verano/invierno, hora dorada y hora azul, y un modo oscuro del mapa.

3. ÁRBOLES Y PALMERAS: árboles reales de OpenStreetMap con volumen 3D y su sombra proyectada. Las palmeras proyectan también la sombra fina y alargada de su tronco, no solo la de la copa. Las sombras de árboles se recortan para no entrar nunca dentro de los edificios.

4. RUTAS CON SOMBRA: buscas origen y destino (o tocas el mapa, o usas tu ubicación GPS) y la ruta se calcula sobre la red peatonal real. El porcentaje de sombra cuenta TODAS las sombras: edificios Y árboles. Los tramos en sombra se pintan en cian y un badge muestra el % del trayecto en sombra, que se actualiza en vivo al mover la hora. Existe una ruta "fresca" (Dijkstra térmico) que prefiere calles con sombra. Cada ruta genera además INDICACIONES PASO A PASO en texto (calle por calle, giros, metros y si cada tramo va al sol o a la sombra, con consejos), pensadas para personas ciegas o con baja visión: aparecen en una lista accesible y hay un botón "Escuchar indicaciones" que las lee en voz alta con la voz del propio dispositivo (Web Speech API, sin enviar nada a servidores). Y si pulsas "Iniciar caminata", la GUIA POR VOZ te sigue por GPS y te va diciendo cada paso en voz alta justo al llegar a cada punto (giro, calle, sombra), hasta avisarte de que has llegado.

5. NUBES REALES: capa de nubes en vivo de OpenWeatherMap sobre el mapa (se puede activar/ocultar). Además la nubosidad real atenúa las sombras con física de luz difusa: con nubes las sombras pierden contraste pero NUNCA desaparecen, y un velo suave de sombra de nube envuelve la escena. La iluminación y el color del cielo también cambian con la nubosidad.

6. IRRADIACIÓN SOLAR: histórico hora a hora con datos reales de la NASA (POWER), con atenuación por umbra/penumbra de edificios y árboles.

7. EXTRAS: modo caminata (te sigue por GPS), paseo virtual 3D con joystick (WASD/flechas, Esc para salir), captura de vista, cambio de idioma (español, catalán, euskera, gallego e inglés), modo oscuro y paletas de color.

PRIVACIDAD: la web no usa rastreadores ni publicidad; tu ubicación solo se usa si tú la compartes y no se guarda en ningún servidor.

Si te preguntan algo que no sea de esta web o de aire/sol/sombras/clima urbano, responde brevemente y redirige con amabilidad al tema de la web.`;

const langNames = { es:'español', ca:'català', eu:'euskera', gl:'galego', en:'English' };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/manolito' || url.pathname === '/api/chat') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
      }
      try {
        const body = await request.json();
        const message = body.message || body.prompt || '';
        const idioma = body.idioma || 'es';

        if (!message) {
          return new Response(JSON.stringify({ error: 'Message is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }

        const uiLangName = langNames[idioma] || 'español';
        const systemPrompt = SYSTEM_PROMPT_AIRE(uiLangName);

        // --- Cadena de Fallback: Cloudflare AI -> OpenRouter ---

        let aiResponse = '';

        // 1. Intentar con Cloudflare Workers AI
        try {
          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ];
          const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', { messages });
          aiResponse = typeof response === 'string' ? response : (response.response || '');
        } catch (e) {
          console.error("Cloudflare AI failed:", e);
          // Si falla, no hacemos nada y dejamos que el código siga hacia OpenRouter
        }

        // 2. Si Cloudflare falló Y tenemos una clave de OpenRouter, usarla
        if (!aiResponse && env.OPENROUTER_API_KEY) {
          try {
            const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                "model": "mistralai/mistral-7b-instruct:free",
                "messages": [{ "role": "system", "content": systemPrompt }, { "role": "user", "content": message }]
              })
            });
            if (orResponse.ok) {
              const orData = await orResponse.json();
              aiResponse = orData.choices?.[0]?.message?.content.trim() || '';
            }
          } catch (e) {
            console.error("OpenRouter fallback failed:", e);
          }
        }

        return new Response(JSON.stringify({ respuesta: aiResponse || '' }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err.message || err) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    if (url.pathname.startsWith('/api/air-quality')) {
      const params = url.search || '';
      const targetUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality' + params;
      try {
        const resp = await fetch(targetUrl, { headers: { 'User-Agent': 'manolito-aire/1.0' } });
        const data = await resp.text();
        return new Response(data, {
          status: resp.status,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err.message || err) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // --- Proxy anti-CORS + caché KV para los árboles (Overpass / OpenStreetMap) ---
    // Los espejos públicos de Overpass se caen a menudo (502/504/silencio
    // total), así que la defensa va en tres capas:
    //   1) KV: si esta misma zona se pidió hace <6 h, se sirve al instante
    //      sin tocar Overpass (rápido y además protege los espejos).
    //   2) Carrera de espejos: se lanzan todos EN PARALELO con 15 s de
    //      timeout cada uno y gana el primero que responda bien. El Worker
    //      nunca se cuelga (15 s máx.) ni espera a espejos muertos.
    //   3) Si todos los espejos fallan, se sirve la copia del KV aunque sea
    //      vieja (los árboles no se mueven: un dato de hace 2 días es
    //      infinitamente mejor que ningún dato).
    if (url.pathname === '/arboles') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
      }
      try {
        const rawBody = await request.text();

        // Clave de caché = bbox de la consulta Overpass, redondeado a 3
        // decimales (~100 m): la misma calle comparte caché entre usuarios.
        let claveKv = null;
        try {
          const m = decodeURIComponent(rawBody).match(/\(([-\d.,\s]+)\)/);
          if (m) claveKv = 'arboles:' + m[1].split(',').map((n) => parseFloat(n).toFixed(3)).join(',');
        } catch (e) { /* sin clave: seguimos sin caché */ }

        const kv = env.AIR_QUALITY_CACHE || null;
        const FRESCA_MS = 6 * 3600 * 1000; // 6 h = "fresca", se sirve directa

        if (kv && claveKv) {
          try {
            const { value, metadata } = await kv.getWithMetadata(claveKv);
            if (value && metadata && metadata.ts && Date.now() - metadata.ts < FRESCA_MS) {
              return new Response(value, {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'fresca', ...CORS_HEADERS }
              });
            }
          } catch (e) { /* KV inaccesible: seguimos a los espejos */ }
        }

        const espejos = [
          // Espejos públicos de Overpass en Europa y Taiwán (nada de
          // infraestructura rusa). DA IGUAL el orden: se lanzan TODOS EN
          // PARALELO y gana el primero que responda con datos válidos
          // (carrera), con 15 s de timeout por espejo. Así el Worker nunca
          // se cuelga ni espera a un espejo muerto. Los tres dominios
          // *.overpass-api.de son colas independientes del mismo operador
          // alemán (el principal suele ser el más saturado).
          'https://lz4.overpass-api.de/api/interpreter',
          'https://z.overpass-api.de/api/interpreter',
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass.private.coffee/api/interpreter',
          'https://overpass.nchc.org.tw/api/interpreter',
          // OJO: overpass.osm.ch devuelve 200 con elements vacío y fecha
          // basura (timestamp_osm_base:"116617") — corrupto, fuera.
        ];
        const intentarEspejo = async (espejo) => {
          const controller = new AbortController();
          const temporizador = setTimeout(() => controller.abort(), 15000);
          try {
            const r = await fetch(espejo, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
              body: rawBody,
              signal: controller.signal,
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const txt = await r.text();
            // Validar el contenido: un 200 con JSON vacío corrupto no vale.
            let datos = null;
            try { datos = JSON.parse(txt); } catch (e) { throw new Error('no JSON'); }
            const ts = datos?.osm3s?.timestamp_osm_base;
            const corrupto =
              Array.isArray(datos?.elements) && datos.elements.length === 0 &&
              typeof ts === 'string' && ts !== '' && !ts.includes('T');
            if (corrupto) throw new Error('espejo corrupto');
            if (!datos || !Array.isArray(datos.elements)) throw new Error('respuesta inválida');
            return txt;
          } finally {
            clearTimeout(temporizador);
          }
        };
        // Promise.any: el primer espejo bueno gana al instante; solo se
        // espera a todos (máx. 15 s) si TODOS fallan.
        let respuesta = null;
        try {
          respuesta = await Promise.any(espejos.map(intentarEspejo));
        } catch (e) { /* AggregateError: todos fallaron */ }

        if (respuesta) {
          // Guardamos en KV en segundo plano (7 días de vida) sin retrasar
          // la respuesta al navegador.
          if (kv && claveKv && ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(
              kv.put(claveKv, respuesta, { expirationTtl: 604800, metadata: { ts: Date.now() } }).catch(() => {})
            );
          }
          return new Response(respuesta, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'nueva', ...CORS_HEADERS }
          });
        }

        // Todos los espejos caídos: servimos la copia del KV aunque esté vieja.
        if (kv && claveKv) {
          try {
            const vieja = await kv.get(claveKv);
            if (vieja) {
              return new Response(vieja, {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'X-Arboles-Cache': 'vieja', ...CORS_HEADERS }
              });
            }
          } catch (e) { /* sin copia: error abajo */ }
        }

        throw new Error('Overpass no disponible en ningún espejo');
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err.message || err) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // --- Nubosidad en tiempo real (OpenWeatherMap) para la luz difusa ---
    // GET /clima?lat=..&lon=.. -> { nubes: 0-100, descripcion, humedad }
    // La API key vive SOLO aquí, como secret del Worker (nunca en el cliente):
    //   npx wrangler secret put OPENWEATHER_API_KEY
    if (url.pathname === '/clima') {
      try {
        if (!env.OPENWEATHER_API_KEY) {
          return new Response(JSON.stringify({ error: 'OPENWEATHER_API_KEY no configurada' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
        const lat = parseFloat(url.searchParams.get('lat'));
        const lon = parseFloat(url.searchParams.get('lon'));
        if (!isFinite(lat) || !isFinite(lon)) {
          return new Response(JSON.stringify({ error: 'lat/lon requeridos' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
        const owm = `https://api.openweathermap.org/data/2.5/weather?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}&appid=${env.OPENWEATHER_API_KEY}&units=metric&lang=es`;
        const r = await fetch(owm, { headers: { 'User-Agent': 'manolito-aire/1.0' } });
        if (!r.ok) throw new Error(`OpenWeatherMap HTTP ${r.status}`);
        const d = await r.json();
        const salida = {
          nubes: Math.max(0, Math.min(100, Number(d?.clouds?.all ?? 0))),
          descripcion: d?.weather?.[0]?.description || '',
          humedad: d?.main?.humidity ?? null,
          amanecer: d?.sys?.sunrise ?? null,
          atardecer: d?.sys?.sunset ?? null,
        };
        return new Response(JSON.stringify(salida), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err.message || err) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // --- Tiles de nubes reales (OpenWeatherMap) para pintarlas sobre el mapa ---
    // GET /tiles/nubes/{z}/{x}/{y}.png -> PNG de la capa clouds_new de OWM.
    // La API key vive SOLO aquí (secret del Worker): el navegador jamás la ve.
    // Cloudflare edge cachea cada tesela 10 min (OWM las renueva ~cada 10 min),
    // así que miles de visitas a la misma zona cuestan UNA llamada a OWM.
    const mNubes = url.pathname.match(/^\/tiles\/nubes\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (mNubes) {
      try {
        if (!env.OPENWEATHER_API_KEY) {
          return new Response(JSON.stringify({ error: 'OPENWEATHER_API_KEY no configurada' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
        const z = parseInt(mNubes[1], 10), x = parseInt(mNubes[2], 10), y = parseInt(mNubes[3], 10);
        const max = 2 ** z;
        if (!(z >= 0 && z <= 19) || !(x >= 0 && x < max) || !(y >= 0 && y < max)) {
          return new Response(JSON.stringify({ error: 'z/x/y fuera de rango' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
        const owm = `https://tile.openweathermap.org/map/clouds_new/${z}/${x}/${y}.png?appid=${env.OPENWEATHER_API_KEY}`;
        const r = await fetch(owm, {
          headers: { 'User-Agent': 'manolito-aire/1.0' },
          cf: { cacheTtl: 600, cacheEverything: true },
        });
        if (!r.ok) throw new Error(`OpenWeatherMap tiles HTTP ${r.status}`);
        return new Response(r.body, {
          headers: {
            'Content-Type': r.headers.get('Content-Type') || 'image/png',
            'Cache-Control': 'public, max-age=600',
            ...CORS_HEADERS
          }
        });
      } catch (err) {
        // Tesela transparente de 1×1: el mapa simplemente no pinta nubes ahí
        // y no ensucia la consola con errores de imagen rotos.
        const transparente = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
        return new Response(transparente, {
          status: 200,
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60', ...CORS_HEADERS }
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};