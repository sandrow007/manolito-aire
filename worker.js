const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const SYSTEM_PROMPT_AIRE = (idioma) => `Eres Manolit, el asistente de Manolit∞ Aire y sombras 3D (manolitoaire.com). Tu personalidad es cercana, natural y con cultura general amplia: hablas de cualquier tema con soltura (música, historia, filosofía, arte, actualidad, objetos cotidianos, lo que sea) igual que lo haría un amigo con curiosidad. Nunca fuerces la conversación de vuelta al clima si el usuario está hablando de otra cosa; sigue su hilo con naturalidad. Responde SIEMPRE en el mismo idioma en el que la persona te escribe; si no puedes detectarlo con claridad, responde en ${idioma}. Si te hablan en español, a veces (no siempre) se te escapa alguna expresión andaluza, con gracia y sin abusar.

CONOCIMIENTO DE LA WEB — la web actual es la fuente de verdad, no una ficha externa ni una descripción antigua. Si preguntan por una sección concreta, explica lo que hace y sus límites; no digas que una función no existe solo porque no aparezca en AlternativeTo. AlternativeTo es un directorio externo que puede estar incompleto o desactualizado: no atribuyas a esa ficha funciones, opiniones ni datos que no hayas verificado.

1. CALIDAD DEL AIRE Y CLIMA: la página principal incluye mapa de calidad del aire para España, datos de contaminantes como PM2.5, PM10, NO2 y O3, gráficas/histórico y previsión cuando la API y los datos están disponibles. Hay modos de lectura ciudadano, científico, letra grande (yayo) e infantil (peque). La capa de calidad del aire del mapa tiene cobertura española; no prometas estaciones o datos locales en cualquier país. Las gráficas pueden quedar temporalmente sin datos si la API falla o limita peticiones. Microclima es una estimación, no una medición directa. La web también presenta nubes, previsión, irradiación solar histórica de NASA POWER y recursos sobre salud y clima.

2. SOMBRAS Y MAPA: edificios y árboles mapeados en OpenStreetMap se muestran en 3D y proyectan sombras calculadas según posición solar, fecha y hora; la cobertura y precisión dependen de los datos cartográficos disponibles en cada lugar. El usuario puede cambiar la hora, comparar verano/invierno y consultar sol, luna y planetario. Las nubes atenúan visualmente el contraste de sombra. No afirmes que el cálculo equivale a una medición física exacta en la calle.

3. RUTAS A PIE: el buscador admite lugares de origen y destino y puede trazar rutas peatonales; según la opción elegida, muestra una ruta normal o una alternativa que prioriza sombra/frescor. El análisis de sombra usa los edificios y árboles disponibles, con tramos e indicaciones; puede incluir lectura de indicaciones y guía durante el paseo. La disponibilidad y calidad dependen de la cartografía local. El modo de invierno puede priorizar el sol en lugar de evitarlo.

4. BÚSQUEDA DE AGUA: al solicitar la función «Búsqueda de agua», incluye siempre una sección destacada cuyo título exacto sea «Buscame fuente de agua más cercana». Si no recibes una ubicación conocida o resultados calculados por la aplicación, pide amablemente una ciudad, dirección o coordenadas; nunca inventes una fuente, distancia ni ruta. Si la aplicación entrega una fuente y una ruta verificadas, indica que el camino se ha calculado desde esa ubicación y que ya está dibujado en el mapa propio de Manolit. No generes enlaces a otros servicios de mapas. Las fuentes de agua cartografiadas pueden no estar disponibles o no ser potables.

5. APARCAMIENTO CON SOMBRA: Manolit busca aparcamientos cartografiados cerca del área visible del mapa y muestra sus datos de OpenStreetMap; cuando el motor de sombras está activo, marca cuáles aparecen bajo sombra en la fecha/hora seleccionada, según edificios/árboles y datos disponibles. Esto NO es un servicio de plazas libres en tiempo real, reserva ni garantía de acceso, precio o sombra física exacta. Tipo, acceso y tarifa solo se conocen cuando OpenStreetMap contiene esas etiquetas. La idea nació en la Feria de la Salud de Bollullos: Sandro presentó el mapa pensando en peatones y la gente le dijo que también quería aparcar el coche a la sombra; Manolit incorporó esa necesidad.

6. VIAJES LARGOS EN COCHE: el planificador permite indicar origen y destino, calcula y encuadra una ruta de carretera y, al llegar al destino en el mapa, facilita buscar aparcamientos cercanos y consultar su sombra. La búsqueda de lugares y rutas depende de la cobertura de geocodificación, OpenStreetMap y del servicio de rutas en cada país. Importante: NO calcula sombra a lo largo de cada tramo de autopista ni optimiza la carretera para ir a la sombra; la función de sombra/aparcamiento es para el destino y su entorno.

7. OTRAS FUNCIONES Y CONTENIDO: capas opcionales (incluidas cartografía/ortofoto del IGN y Catastro donde estén disponibles), árboles y palmeras, nubes, microclima estimado, irradiación NASA, planetario solar/lunar, paseo virtual 3D, captura de vista, accesibilidad/modos de lectura, idiomas y una experiencia web adaptable al móvil que puede añadirse a la pantalla de inicio. Hay un juego «Atrapa a Manolit∞» con un Certificado de Protección Climática generado en el navegador; no lo confundas con el distintivo Website Carbon. La web contiene presentación/manifiesto, comparativa, FAQ, privacidad, cookies, aviso legal, guía para añadir Manolit y páginas de salud/clima. En privacidad explica que las consultas al chat se procesan en servicios externos de IA, así que aconseja no escribir datos sensibles; las rutas y búsquedas usan servicios externos de mapas. Si preguntan por una cláusula o cifra legal exacta, resúmela solo si estás seguro y, si no, indica la página correspondiente sin inventar. Manolit∞ Forestal e Islas de Calor Sevilla son proyectos hermanos, no funciones dentro del mapa de Manolit Aire.

8. SELLOS, SOSTENIBILIDAD Y AFIRMACIONES: la portada muestra un distintivo Website Carbon Rating con calificación A+ y la medición indicada allí (0,015 g CO₂ por visita, 102,7 KB y fecha 16/09/2026). Descríbelo como lo que publica el distintivo de la web, no como certificación oficial independiente ni como dato vigente verificado por ti. La página también publica estimaciones sobre consumo de agua/tráfico publicitario; preséntalas como cálculos y supuestos explicados en esa página, no como mediciones universales independientes. La web se presenta como gratuita, sin registro ni publicidad.

9. TRANSPORTE PÚBLICO Y BICLETA (nuevo):
ES: la web tiene una capa de transporte público que muestra paradas cercanas cartografiadas en OpenStreetMap, servidas mediante Overpass. No ofrece horarios ni salidas GTFS. Al elegir una parada hay un botón «Dirección» que calcula a pie, con ruta saludable por sombra, cómo llegar hasta ella. Todo funciona según los datos disponibles en la zona; no afirmes que cubre todas las ciudades.
EN: the site has a public transport layer showing nearby stops mapped in OpenStreetMap and served through Overpass. It does not provide GTFS timetables or departures. When you choose a stop there is a «Directions» button that calculates a walking route, with a healthy shaded route, to reach it. Coverage depends on available data; do not claim every city is covered.

PRIVACIDAD Y VIGENCIA: no inventes qué datos conserva un servicio externo ni asegures que ninguna ubicación llega a ningún servidor; explica que la ubicación del dispositivo requiere permiso y que las funciones de mapa pueden consultar servicios de mapas/rutas. Distingue funciones del sitio de afirmaciones promocionales y de datos en tiempo real. Si una API, gráfica o cobertura falla, dilo con claridad; no simules una consulta ni inventes resultados actuales.

ESPECIALIDAD CATEDRÁTICA. Cuando la conversación SÍ toca clima urbano, sombras o salud solar, eres un experto genuino en:

- SOMBRAS Y LUZ NATURAL en general: cómo se proyectan, cómo cambian con la hora y la estación.
- ESTIMACIÓN DE ALTURAS por descripción: calculas los metros aproximados de edificios y árboles a partir de lo que cuenta el usuario. Ejemplo de razonamiento: "un edificio de 3 plantas son unos 9-10 metros; si ese árbol llega a la altura de la planta 2, serán unos 6 metros; a esta hora (00:00) la sombra cae hacia tal dirección y mide aproximadamente X metros". Da siempre cifras aproximadas y útiles, con sentido común.
- POSICIÓN SOLAR: cómo cambia la sombra según la hora del día y la estación del año (solsticios, equinoccios, hora dorada, hora azul).
- NUBOSIDAD: cómo afecta a la radiación solar y a la sensación térmica.
- MERCURIO RETRÓGRADO: sabes explicar qué es astronómicamente (un efecto óptico aparente) y su significado cultural/astrológico, con naturalidad y sin burlarte de quien pregunta.
- ÁRBOLES: especies comunes en las grandes ciudades de España (Sevilla, Madrid, Barcelona, Valencia, Córdoba, Jaén, Huelva, Jerez, Almería), en Tbilisi y del mundo en general: tipo de hoja, sombra que producen, alturas típicas y por qué varía entre especies y estaciones.
- POLEN Y AIRE: polen por época y zona, calidad del aire y contaminación de los coches detectable según la ubicación de la persona (tráfico, avenidas, horas punta).
- SALUD SOLAR: cómo la radiación solar afecta a la piel y a los ojos: tipos de UV (UVA, UVB), fototipos de piel y recomendaciones de protección. Por qué algunas personas son más sensibles (fotosensibilidad, lupus, medicación fotosensibilizante).
- PLAYA Y SOL: consejos para quien está cerca de la playa en verano Y en invierno, porque en invierno el sol también quema aunque no lo parezca (y la arena y el mar reflejan radiación).

EN TEMAS DE SALUD: da información educativa clara y consejos generales de sentido común (protección, horarios de riesgo, hidratación). No diagnostiques condiciones ni sustituyas a un médico. Si alguien describe un problema de piel u ojos concreto, sugiere con naturalidad que lo consulte con un dermatólogo u oftalmólogo, sin sonar a aviso legal.

SU CREADOR Y SU FAMILIA (si preguntan, cuenta esto tal cual; si no lo preguntan, no hace falta soltarlo):
- Manolit∞ Aire la creó Sandro, un georgiano-español (sevillano, andaluz) que se cansó de que nadie diera soluciones prácticas ante una crisis como el cambio climático y decidió construirlas él mismo.
- Esta web es libre y gratuita para todo el mundo, para siempre: nadie puede venderla ni ponerle suscripción.
- Tiene "hermanos": Manolit∞ Forestal (manolitoforestal.space, predictor de incendios forestales en tiempo real) e Islas de Calor Sevilla (islasdecalorsevilla.com, mapa de estrés térmico urbano).
- NO INVENTES: si te preguntan por Sandro o por los proyectos algo que no está aquí, di lo que sabes y reconoce con naturalidad que lo demás no lo sabes. Mejor un "eso no te lo sé decir" que un dato inventado.

REGLAS DE ORO:
- BREVEDAD ESTRICTA: responde en 2-4 frases cortas, máximo unas 60 palabras. Directo y específico, sin rodeos ni listas largas. Solo escribe más si el usuario pide explícitamente más detalle.
- Nunca fuerces una venta ni redirijas la conversación hacia "usa Manolit∞ para..." salvo que el usuario lo pida. Tu prioridad es ser útil y agradable, no vender.
- NO INVENTES datos concretos (cifras, fechas, nombres): si no lo sabes, dilo con naturalidad.
- Si te preguntan algo que no sea de esta web ni de aire/sol/sombras/clima urbano, responde igualmente con tu cultura general y sigue su hilo, igual de breve.`;

const langNames = { es:'español', ca:'català', eu:'euskera', gl:'galego', en:'English', ka:'ქართული', ar:'العربية' };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Redirect 301 a https y sin "www": evita que Google indexe la misma
    // página por varias URLs con el mismo título (http/https, con/sin www).
    if (url.protocol === 'http:' || url.hostname.startsWith('www.')) {
      url.protocol = 'https:';
      url.hostname = url.hostname.replace(/^www\./, '');
      return Response.redirect(url.toString(), 301);
    }

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
        const history = Array.isArray(body.history) ? body.history : [];
        const recentMessages = history
          .slice(-6)
          .filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
          .map(item => ({ role: item.role, content: item.content.slice(0, 1200) }));
        const lastMessage = recentMessages[recentMessages.length - 1];
        if (lastMessage?.role === 'user' && lastMessage.content.trim() === message.trim()) {
          recentMessages.pop();
        }

        let aiResponse = '';

        try {
          const messages = [
            { role: 'system', content: systemPrompt },
            ...recentMessages,
            { role: 'user', content: message }
          ];
          const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', { messages, max_tokens: 450 });
          aiResponse = typeof response === 'string' ? response : (response.response || '');
        } catch (e) {
          console.error("Cloudflare AI failed:", e);
        }

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
                "max_tokens": 450,
                "messages": [
                  { "role": "system", "content": systemPrompt },
                  ...recentMessages,
                  { "role": "user", "content": message }
                ]
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
      const vacio = () => new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
      });
      try {
        const resp = await fetch(targetUrl, {
          headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' },
          cf: { cacheTtl: 600, cacheEverything: true },
        });
        if (!resp.ok) return vacio();
        const data = await resp.text();
        return new Response(data, {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...CORS_HEADERS }
        });
      } catch (err) {
        return vacio();
      }
    }

    if (url.pathname === '/arboles') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
      }
      try {
        const rawBody = await request.text();
        let claveKv = null;
        try {
          const m = decodeURIComponent(rawBody).match(/\(([-\d.,\s]+)\)/);
          if (m) claveKv = 'arboles:' + m[1].split(',').map((n) => parseFloat(n).toFixed(3)).join(',');
        } catch (e) { }
        const kv = env.AIR_QUALITY_CACHE || null;
        const FRESCA_MS = 12 * 3600 * 1000;
        const forzarFresca = request.headers.get('X-Arboles-Fresca') === '1';
        let copiaKv = null;
        if (kv && claveKv) {
          try {
            const { value, metadata } = await kv.getWithMetadata(claveKv);
            copiaKv = value || null;
            if (!forzarFresca && value && metadata && metadata.ts && Date.now() - metadata.ts < FRESCA_MS) {
              return new Response(value, {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'fresca', ...CORS_HEADERS }
              });
            }
          } catch (e) { }
        }
        const espejos = [
          'https://lz4.overpass-api.de/api/interpreter',
          'https://z.overpass-api.de/api/interpreter',
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass.private.coffee/api/interpreter',
          'https://overpass.nchc.org.tw/api/interpreter',
        ];
        const obtenerBBoxConsulta = () => {
          const query = new URLSearchParams(rawBody).get('data') || '';
          const match = query.match(/\(([-\d.,\s]+)\)/);
          if (!match) return null;
          const valores = match[1].split(',').map((n) => Number(n.trim()));
          if (valores.length !== 4 || valores.some((n) => !Number.isFinite(n))) return null;
          const [south, west, north, east] = valores;
          if (south >= north || west >= east) return null;
          return { south, west, north, east };
        };
        const decodificarXml = (valor) => String(valor || '').replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (entidad) => {
          const entidades = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
          if (entidades[entidad]) return entidades[entidad];
          const codigo = entidad[2].toLowerCase() === 'x'
            ? parseInt(entidad.slice(3, -1), 16)
            : parseInt(entidad.slice(2, -1), 10);
          try { return String.fromCodePoint(codigo); } catch (e) { return entidad; }
        });
        const atributoXml = (atributos, nombre) => {
          const match = atributos.match(new RegExp('(?:^|\\s)' + nombre + '="([^"]*)"'));
          return match ? decodificarXml(match[1]) : null;
        };
        const intentarApiMapaOsm = async () => {
          const bbox = obtenerBBoxConsulta();
          if (!bbox) throw new Error('BBox OSM inválido');
          const controller = new AbortController();
          const temporizador = setTimeout(() => controller.abort(), 10000);
          try {
            const valores = [bbox.west, bbox.south, bbox.east, bbox.north]
              .map((n) => n.toFixed(6)).join(',');
            const urlMapa = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + valores;
            const r = await fetch(urlMapa, {
              headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' },
              signal: controller.signal,
            });
            if (!r.ok) throw new Error(`OSM API HTTP ${r.status}`);
            const xml = await r.text();
            const nodos = new Map();
            const filas = [];
            const elementos = [];
            const leerEtiquetas = (contenido) => {
              const tags = {};
              for (const tag of contenido.matchAll(/<tag\b([^>]*)\/?\s*>/g)) {
                const k = atributoXml(tag[1], 'k');
                const v = atributoXml(tag[1], 'v');
                if (k && v != null) tags[k] = v;
              }
              return tags;
            };
            for (const elemento of xml.matchAll(/<(node|way)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g)) {
              const tipo = elemento[1];
              const atributos = elemento[2];
              const contenido = elemento[3] || '';
              const id = Number(atributoXml(atributos, 'id'));
              const tags = leerEtiquetas(contenido);
              if (tipo === 'node') {
                const lat = Number(atributoXml(atributos, 'lat'));
                const lon = Number(atributoXml(atributos, 'lon'));
                if (Number.isFinite(id) && Number.isFinite(lat) && Number.isFinite(lon)) {
                  nodos.set(String(id), { lat, lon });
                  if (tags.natural === 'tree') elementos.push({ type: 'node', id, lat, lon, tags });
                }
              } else if (tags.natural === 'tree_row') {
                const refs = Array.from(contenido.matchAll(/<nd\b([^>]*)\/?\s*>/g))
                  .map((nd) => atributoXml(nd[1], 'ref'))
                  .filter(Boolean);
                filas.push({ id, refs, tags });
              }
            }
            for (const fila of filas) {
              const geometry = fila.refs.map((ref) => nodos.get(String(ref))).filter(Boolean);
              if (geometry.length >= 2) {
                elementos.push({ type: 'way', id: fila.id, tags: fila.tags, geometry });
              }
            }
            if (!elementos.length) throw new Error('La API OSM no devolvió árboles para esta vista');
            return JSON.stringify({ version: 0.6, generator: 'OpenStreetMap API', elements: elementos });
          } finally {
            clearTimeout(temporizador);
          }
        };
        const intentarEspejo = async (espejo) => {
          const controller = new AbortController();
          const temporizador = setTimeout(() => controller.abort(), 15000);
          try {
            const r = await fetch(espejo, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)',
              },
              body: rawBody,
              signal: controller.signal,
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const txt = await r.text();
            let datos = null;
            try { datos = JSON.parse(txt); } catch (e) { throw new Error('no JSON'); }
            const ts = datos?.osm3s?.timestamp_osm_base;
            const corrupto =
              Array.isArray(datos?.elements) && datos.elements.length === 0 &&
              typeof ts === 'string' && ts !== '' && !ts.includes('T');
            if (corrupto) throw new Error('espejo corrupto');
            if (!datos || !Array.isArray(datos.elements)) throw new Error('respuesta inválida');
            if (datos.elements.length === 0) throw new Error('el espejo no devolvió árboles');
            return txt;
          } finally {
            clearTimeout(temporizador);
          }
        };
        if (copiaKv && !forzarFresca) {
          if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(
              Promise.any(espejos.map(intentarEspejo))
                .then((nueva) => kv.put(claveKv, nueva, { expirationTtl: 2592000, metadata: { ts: Date.now() } }))
                .catch(() => { })
            );
          }
          return new Response(copiaKv, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'vieja-refrescando', ...CORS_HEADERS }
          });
        }
        let respuesta = null;
        try {
          respuesta = await Promise.any([
            ...espejos.map(intentarEspejo),
            intentarApiMapaOsm(),
          ]);
        } catch (e) { }
        if (respuesta) {
          if (kv && claveKv && ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(
              kv.put(claveKv, respuesta, { expirationTtl: 2592000, metadata: { ts: Date.now() } }).catch(() => {})
            );
          }
          return new Response(respuesta, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'nueva', ...CORS_HEADERS }
          });
        }
        if (copiaKv) {
          return new Response(copiaKv, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'X-Arboles-Cache': 'vieja', ...CORS_HEADERS }
          });
        }
        throw new Error('Overpass no disponible en ningún espejo');
      } catch (err) {
        return new Response(JSON.stringify({ elements: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      }
    }

    if (url.pathname === '/aparcamientos') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
      }
      try {
        const rawBody = await request.text();
        let claveKv = null;
        try {
          const m = decodeURIComponent(rawBody).match(/\(([-\d.,\s]+)\)/);
          if (m) claveKv = 'parking:' + m[1].split(',').map((n) => parseFloat(n).toFixed(3)).join(',');
        } catch (e) { }
        const kv = env.AIR_QUALITY_CACHE || null;
        const FRESCA_MS = 12 * 3600 * 1000;
        const forzarFresca = request.headers.get('X-Arboles-Fresca') === '1';
        let copiaKv = null;
        if (kv && claveKv) {
          try {
            const { value, metadata } = await kv.getWithMetadata(claveKv);
            copiaKv = value || null;
            if (!forzarFresca && value && metadata && metadata.ts && Date.now() - metadata.ts < FRESCA_MS) {
              return new Response(value, {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'fresca', ...CORS_HEADERS }
              });
            }
          } catch (e) { }
        }
        const espejos = [
          'https://lz4.overpass-api.de/api/interpreter',
          'https://z.overpass-api.de/api/interpreter',
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass.private.coffee/api/interpreter',
          'https://overpass.nchc.org.tw/api/interpreter',
        ];
        const intentarEspejo = async (espejo) => {
          const controller = new AbortController();
          const temporizador = setTimeout(() => controller.abort(), 15000);
          try {
            const r = await fetch(espejo, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)',
              },
              body: rawBody,
              signal: controller.signal,
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const txt = await r.text();
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
        if (copiaKv && !forzarFresca) {
          if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(
              Promise.any(espejos.map(intentarEspejo))
                .then((nueva) => kv.put(claveKv, nueva, { expirationTtl: 2592000, metadata: { ts: Date.now() } }))
                .catch(() => { })
            );
          }
          return new Response(copiaKv, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'vieja-refrescando', ...CORS_HEADERS }
          });
        }
        let respuesta = null;
        try {
          respuesta = await Promise.any(espejos.map(intentarEspejo));
        } catch (e) { }
        if (respuesta) {
          if (kv && claveKv && ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(
              kv.put(claveKv, respuesta, { expirationTtl: 2592000, metadata: { ts: Date.now() } }).catch(() => {})
            );
          }
          return new Response(respuesta, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'nueva', ...CORS_HEADERS }
          });
        }
        if (copiaKv) {
          return new Response(copiaKv, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'X-Arboles-Cache': 'vieja', ...CORS_HEADERS }
          });
        }
        throw new Error('Overpass no disponible en ningún espejo');
      } catch (err) {
        return new Response(JSON.stringify({ elements: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      }
    }

    if (url.pathname === '/carriles-bici') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
      }
      try {
        const rawBody = await request.text();
        let claveKv = null;
        try {
          const m = decodeURIComponent(rawBody).match(/\(([-\d.,\s]+)\)/);
          if (m) claveKv = 'carril:' + m[1].split(',').map((n) => parseFloat(n).toFixed(3)).join(',');
        } catch (e) { }
        const kv = env.AIR_QUALITY_CACHE || null;
        const FRESCA_MS = 12 * 3600 * 1000;
        const forzarFresca = request.headers.get('X-Arboles-Fresca') === '1';
        let copiaKv = null;
        if (kv && claveKv) {
          try {
            const { value, metadata } = await kv.getWithMetadata(claveKv);
            copiaKv = value || null;
            if (!forzarFresca && value && metadata && metadata.ts && Date.now() - metadata.ts < FRESCA_MS) {
              return new Response(value, {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'fresca', ...CORS_HEADERS }
              });
            }
          } catch (e) { }
        }
        const espejos = [
          'https://lz4.overpass-api.de/api/interpreter',
          'https://z.overpass-api.de/api/interpreter',
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass.private.coffee/api/interpreter',
          'https://overpass.nchc.org.tw/api/interpreter',
        ];
        const intentarEspejo = async (espejo) => {
          const controller = new AbortController();
          const temporizador = setTimeout(() => controller.abort(), 15000);
          try {
            const r = await fetch(espejo, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)',
              },
              body: rawBody,
              signal: controller.signal,
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const txt = await r.text();
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
        if (copiaKv && !forzarFresca) {
          if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(
              Promise.any(espejos.map(intentarEspejo))
                .then((nueva) => kv.put(claveKv, nueva, { expirationTtl: 2592000, metadata: { ts: Date.now() } }))
                .catch(() => { })
            );
          }
          return new Response(copiaKv, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'vieja-refrescando', ...CORS_HEADERS }
          });
        }
        let respuesta = null;
        try {
          respuesta = await Promise.any(espejos.map(intentarEspejo));
        } catch (e) { }
        if (respuesta) {
          if (kv && claveKv && ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(
              kv.put(claveKv, respuesta, { expirationTtl: 2592000, metadata: { ts: Date.now() } }).catch(() => {})
            );
          }
          return new Response(respuesta, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'X-Arboles-Cache': 'nueva', ...CORS_HEADERS }
          });
        }
        if (copiaKv) {
          return new Response(copiaKv, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'X-Arboles-Cache': 'vieja', ...CORS_HEADERS }
          });
        }
        throw new Error('Overpass no disponible en ningún espejo');
      } catch (err) {
        return new Response(JSON.stringify({ elements: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      }
    }

    // --- Proxy de paradas de transporte público desde OpenStreetMap/Overpass ---
    if (url.pathname === '/transporte-paradas') {
      try {
        const minParam = (url.searchParams.get('min') || '').split(',').map(Number);
        const maxParam = (url.searchParams.get('max') || '').split(',').map(Number);
        const south = minParam[0], west = minParam[1], north = maxParam[0], east = maxParam[1];
        if (![south, west, north, east].every(Number.isFinite) || south >= north || west >= east) {
          return new Response('[]', {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', ...CORS_HEADERS }
          });
        }

        if (south < -85 || north > 85 || west < -180 || east > 180) {
          return new Response('[]', {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS_HEADERS }
          });
        }

        const kv = env.AIR_QUALITY_CACHE || null;



        const bboxTxt = [south, west, north, east].map((v) => v.toFixed(6)).join(',');
        const claveKv = 'parada:osm:' + [south, west, north, east].map((v) => v.toFixed(3)).join(',');
        if (kv) {
          try {
            const { value, metadata } = await kv.getWithMetadata(claveKv);
            if (value && metadata && metadata.ts && Date.now() - metadata.ts < 12 * 3600 * 1000) {
              return new Response(value, {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', ...CORS_HEADERS }
              });
            }
          } catch (error) { }
        }
        const consulta = '[out:json][timeout:20];(' +
          'node["highway"="bus_stop"](' + bboxTxt + ');' +
          'node["public_transport"="platform"](' + bboxTxt + ');' +
          'way["public_transport"="platform"](' + bboxTxt + ');' +
          'relation["public_transport"="platform"](' + bboxTxt + ');' +
          'node["railway"="tram_stop"](' + bboxTxt + ');' +
          'nwr["public_transport"="station"](' + bboxTxt + ');' +
          'nwr["amenity"="bus_station"](' + bboxTxt + ');' +
          'nwr["railway"="station"](' + bboxTxt + ');' +
          ');out center qt;';

        const espejos = [
          'https://lz4.overpass-api.de/api/interpreter',
          'https://z.overpass-api.de/api/interpreter',
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass.private.coffee/api/interpreter',
          'https://overpass.nchc.org.tw/api/interpreter',
        ];
        const intentarEspejo = async (espejo) => {
          const controller = new AbortController();
          const temporizador = setTimeout(() => controller.abort(), 15000);
          try {
            const r = await fetch(espejo, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)',
                'Accept': 'application/json',
              },
              body: new URLSearchParams({ data: consulta }).toString(),
              signal: controller.signal,
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const datos = await r.json();
            if (!datos || !Array.isArray(datos.elements)) throw new Error('respuesta inválida');
            return datos;
          } finally {
            clearTimeout(temporizador);
          }
        };

        // Consulta OSM mediante Overpass, fuente única de las paradas.
        // Carrera escalonada: Promise.any esperaba a que todos los espejos
        // fallaran si alguno nunca resolvía, bloqueando la capa hasta timeout.
        let datos = null;
        for (const espejo of espejos) {
          try {
            datos = await intentarEspejo(espejo);
            if (datos) break;
          } catch (error) { }
        }
        if (datos) {
          const paradas = datos.elements.map((el) => {
            const punto = el.type === 'node' ? el : (el.center || (el.geometry && el.geometry.reduce((sum, p) => ({ lat: sum.lat + p.lat / el.geometry.length, lon: sum.lon + p.lon / el.geometry.length }), { lat: 0, lon: 0 })));
            if (!punto || !Number.isFinite(punto.lat) || !Number.isFinite(punto.lon)) return null;
            const tags = el.tags || {};
            return {
              name: tags.name || tags['name:es'] || 'Parada',
              lat: punto.lat,
              lon: punto.lon,
              id: el.type + ':' + el.id,
            };
          }).filter(Boolean);
          if (kv && ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(kv.put(claveKv, JSON.stringify(paradas), { expirationTtl: 2592000, metadata: { ts: Date.now() } }).catch(() => {}));
          }
          return new Response(JSON.stringify(paradas), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', 'X-Transit-Fuente': 'OpenStreetMap', ...CORS_HEADERS }
          });
        }

        return new Response('[]', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response('[]', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      }
    }

    // GET /transporte-salidas: OSM no incluye horarios GTFS; no se consulta otro proveedor.
    if (url.pathname === '/transporte-salidas') {
      try {
        return new Response(JSON.stringify({ stopTimes: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response(JSON.stringify({ stopTimes: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      }
    }

    if (url.pathname === '/clima') {
      const cieloDespejado = () => new Response(JSON.stringify({ nubes: 0, descripcion: '', humedad: null, amanecer: null, atardecer: null, temperatura: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
      });
      try {
        if (!env.OPENWEATHER_API_KEY) return cieloDespejado();
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
          temperatura: isFinite(Number(d?.main?.temp)) ? Number(d.main.temp) : null,
          amanecer: d?.sys?.sunrise ?? null,
          atardecer: d?.sys?.sunset ?? null,
        };
        return new Response(JSON.stringify(salida), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', ...CORS_HEADERS }
        });
      } catch (err) {
        return cieloDespejado();
      }
    }

    if (url.pathname === '/prevision') {
      const vacia = () => new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
      });
      try {
        const lat = parseFloat(url.searchParams.get('lat'));
        const lon = parseFloat(url.searchParams.get('lon'));
        if (!isFinite(lat) || !isFinite(lon)) {
          return new Response(JSON.stringify({ error: 'lat/lon requeridos' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
        const om = 'https://api.open-meteo.com/v1/forecast' +
          `?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
          '&current=temperature_2m,cloudcover,relative_humidity_2m,uv_index' +
          '&hourly=temperature_2m,cloudcover,relative_humidity_2m' +
          '&past_days=1&forecast_days=2&timezone=auto&timeformat=unixtime';
        const r = await fetch(om, {
          headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' },
          cf: { cacheTtl: 600, cacheEverything: true },
        });
        if (!r.ok) return vacia();
        return new Response(await r.text(), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', ...CORS_HEADERS }
        });
      } catch (err) {
        return vacia();
      }
    }

    const mNubes = url.pathname.match(/^\/tiles\/nubes\/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (mNubes) {
      const teselaVacia = () => {
        const transparente = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
        return new Response(transparente, {
          status: 200,
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60', ...CORS_HEADERS }
        });
      };
      try {
        if (!env.OPENWEATHER_API_KEY) return teselaVacia();
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
        return teselaVacia();
      }
    }

    if (url.pathname === '/geo' || url.pathname === '/geo-reverso') {
      const vacio = url.pathname === '/geo' ? '[]' : '{}';
      try {
        const destino = 'https://nominatim.openstreetmap.org' +
          (url.pathname === '/geo' ? '/search' : '/reverse') + url.search +
          (url.search ? '&' : '?') + 'accept-language=es';
        const r = await fetch(destino, { headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' } });
        if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
        return new Response(await r.text(), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response(vacio, {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      }
    }

    if (url.pathname.startsWith('/ruta/')) {
      try {
        const destino = 'https://routing.openstreetmap.de/routed-foot/route/v1' +
          url.pathname.slice('/ruta'.length) + url.search;
        const r = await fetch(destino, { headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' } });
        if (!r.ok) throw new Error(`OSRM HTTP ${r.status}`);
        return new Response(await r.text(), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response('{"code":"Error"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      }
    }

    if (url.pathname.startsWith('/ruta-coche/')) {
      try {
        const destino = 'https://routing.openstreetmap.de/routed-car/route/v1' +
          url.pathname.slice('/ruta-coche'.length) + url.search;
        const r = await fetch(destino, { headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' } });
        if (!r.ok) throw new Error(`OSRM car HTTP ${r.status}`);
        return new Response(await r.text(), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response('{"code":"Error"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      }
    }

    if (url.pathname.startsWith('/ruta-bici/')) {
      try {
        const destino = 'https://routing.openstreetmap.de/routed-bike/route/v1' +
          url.pathname.slice('/ruta-bici'.length) + url.search;
        const r = await fetch(destino, { headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' } });
        if (!r.ok) throw new Error(`OSRM bike HTTP ${r.status}`);
        return new Response(await r.text(), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response('{"code":"Error"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      }
    }

    if (url.pathname === '/ign-wms') {
      const teselaVaciaIGN = () => {
        const transparente = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
        return new Response(transparente, {
          status: 200,
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      };
      try {
        const destino = 'https://www.ign.es/wms-inspire/ign-base' + url.search;
        const r = await fetch(destino, {
          headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' },
          cf: { cacheTtl: 3600, cacheEverything: true },
        });
        if (!r.ok) throw new Error(`IGN WMS HTTP ${r.status}`);
        const ct = r.headers.get('Content-Type') || '';
        if (!ct.includes('image')) throw new Error('IGN no devolvió imagen');
        return new Response(r.body, {
          status: 200,
          headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=3600', ...CORS_HEADERS }
        });
      } catch (err) {
        return teselaVaciaIGN();
      }
    }

    if (url.pathname === '/catastro-wms') {
      const teselaVaciaCatastro = () => {
        const transparente = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
        return new Response(transparente, {
          status: 200,
          headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
        });
      };
      try {
        const destino = 'https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx' + url.search;
        const r = await fetch(destino, {
          headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' },
          cf: { cacheTtl: 3600, cacheEverything: true },
        });
        if (!r.ok) throw new Error(`Catastro WMS HTTP ${r.status}`);
        const ct = r.headers.get('Content-Type') || '';
        if (!ct.includes('image')) throw new Error('Catastro no devolvió imagen');
        return new Response(r.body, {
          status: 200,
          headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=3600', ...CORS_HEADERS }
        });
      } catch (err) {
        return teselaVaciaCatastro();
      }
    }

    if (url.pathname === '/traduce') {
      const neutra = () => new Response(JSON.stringify({ ok: false, texto: '' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Proxy-Aviso': 'sin-datos', ...CORS_HEADERS }
      });
      try {
        const q = (url.searchParams.get('q') || '').slice(0, 400);
        const a = url.searchParams.get('a') || '';
        if (!q.trim() || !/^(ca|eu|gl|en|ka|ar)$/.test(a)) return neutra();
        const destino = 'https://api.mymemory.translated.net/get?q=' +
          encodeURIComponent(q) + '&langpair=es|' + a;
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 6000);
        let r;
        try {
          r = await fetch(destino, {
            headers: { 'User-Agent': 'manolito-aire/1.0 (manolitoaire.com)' },
            signal: ctl.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        if (!r.ok) return neutra();
        const d = await r.json();
        const estado = Number(d && d.responseStatus);
        const txt = d && d.responseData && typeof d.responseData.translatedText === 'string'
          ? d.responseData.translatedText.trim() : '';
        if (!txt || (estado && estado !== 200)) return neutra();
        if (/QUOTA|LIMIT|INVALID|MYMEMORY WARNING|EMAIL/i.test(txt)) return neutra();
        return new Response(JSON.stringify({ ok: true, texto: txt }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400', ...CORS_HEADERS }
        });
      } catch (err) {
        return neutra();
      }
    }

    return env.ASSETS.fetch(request);
  }
};
