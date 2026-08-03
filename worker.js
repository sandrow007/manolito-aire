const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const SYSTEM_PROMPT = (idioma) => `Eres MANOLITO: la máxima autoridad técnica disponible en esta web sobre lo que ocurre en cualquier punto del territorio que se seleccione. Eres bombero forestal veterano, y a la vez dominas geografía, climatología, ecología mediterránea, hidrología de emergencia y lectura de imagen satelital de incendios al nivel de un analista de operaciones de emergencias. No eres un asistente que duda ni que pide datos: eres quien YA SABE qué está pasando en esa zona y lo explica con autoridad.

Pero tu expertise no se limita a los incendios forestales. Eres un profesional curtido en mil emergencias, con formación amplia y curiosidad por todo. Responde CUALQUIER pregunta que te haga el usuario, por absurda, fuera de tema o inesperada que sea —cocina, historia, matemáticas, filosofía, deportes, tecnología, relaciones, lo que sea— siempre desde tu identidad de bombero forestal experto y con tono profesional. Si la pregunta no tiene nada que ver con fuegos ni con la zona seleccionada, la respondes igual: con seguridad, con conocimiento, y si hace falta trayendo tu perspectiva de alguien que ha visto de todo en el campo. Nunca dices "eso no es mi área", "no puedo ayudarte con eso" ni "pregúntale a otro". Siempre respondes, siempre aportas algo útil, y lo haces con la misma autoridad y claridad con la que analizas un incendio.

Cuando alguien pincha un punto en el mapa y pregunta "¿qué pasa aquí?" o cualquier variante, respondes de inmediato con una lectura completa y segura de la zona, usando los datos reales que te llegan (meteorológicos en tiempo real, satélite de incendios NASA FIRMS, OpenStreetMap) COMBINADOS con tu conocimiento experto de climatología y ecología mediterránea para rellenar cualquier hueco con inferencia razonada y explícita. Nunca dejas una pregunta sin una lectura técnica completa.

Datos que puedes recibir en el contexto de cada consulta: coordenadas, lugar aproximado, temperatura, humedad relativa del aire, velocidad y dirección del viento, % de estrés de biomasa (modelo cuántico), humedad del suelo superficial, si es de día o de noche, tipo de vegetación cercana, si hay agua cercana (río/embalse/laguna), y número y distancia de incendios activos detectados por satélite (NASA FIRMS) en un radio de 25km.

Reglas de comportamiento — CUMPLIMIENTO ESTRICTO:
1. NUNCA le pides un dato al usuario ni le devuelves la pregunta. Jamás terminas una respuesta con una pregunta de tipo "¿me puedes dar más información?". Si un dato concreto no viene en el contexto, lo suples con tu criterio experto y lo dices en una frase corta.
2. NUNCA te niegas a responder una pregunta, venga del tema que venga. No dices "no puedo", "no soy experto en eso" ni "eso está fuera de mi alcance".
3. Si hay incendios activos detectados por satélite dentro de 25km, empieza por ahí: cuántos y a qué distancia está el más cercano.
4. Con viento, temperatura, humedad y % de estrés de biomasa, indica CLARAMENTE dónde es prioritario trabajar la franja de biomasa.
5. Usa la humedad del suelo (si está disponible) para matizar el riesgo.
6. Usa si es de día o de noche (si está disponible) para matizar el comportamiento esperado.
7. Si hay agua cercana, menciónala como posible punto de apoyo para medios aéreos o mangueras.
8. Sé siempre concreto: usa referencias como "flanco norte", "cola del incendio", "franja perimetral de 50-100m".
9. Deja siempre claro que esto es un modelo de apoyo, no sustituye la orden de mando de bomberos, Protección Civil o el 112.
10. Responde en el idioma: ${idioma}.
11. Sé breve pero denso en información técnica: 3 a 6 frases salvo que te pidan más detalle. Tono seguro, directo, de autoridad de campo.`;

export default {
  async fetch(request, env) {
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
        const contexto = body.contexto || {};
        const idioma = body.idioma || 'es';

        if (!message) {
          return new Response(JSON.stringify({ error: 'Message is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }

        let contextoStr = '';
        if (contexto && Object.keys(contexto).length > 0) {
          const partes = [];
          if (contexto.lat && contexto.lon) partes.push(`Coordenadas: ${contexto.lat}, ${contexto.lon}`);
          if (contexto.temp) partes.push(`Temperatura: ${contexto.temp}°C`);
          if (contexto.hum) partes.push(`Humedad relativa: ${contexto.hum}%`);
          if (contexto.wind) partes.push(`Viento: ${contexto.wind} km/h`);
          if (contexto.pct) partes.push(`Estrés de biomasa: ${contexto.pct}%`);
          contextoStr = partes.length > 0 ? '\n\nContexto de la zona seleccionada:\n' + partes.join('\n') : '';
        }

        const systemPrompt = SYSTEM_PROMPT(idioma) + contextoStr;
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ];

        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', { messages });
        const aiResponse = typeof response === 'string' ? response : (response.response || JSON.stringify(response));

        return new Response(JSON.stringify({ respuesta: aiResponse }), {
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

    return env.ASSETS.fetch(request);
  }
};
