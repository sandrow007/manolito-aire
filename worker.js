﻿const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const SYSTEM_PROMPT_AIRE = (idioma) => `Eres Manolit, un asistente amable que explica la calidad del aire en España de forma clara y humana, en frases cortas, sin tecnicismos salvo que te los pidan. Responde SIEMPRE en el mismo idioma en el que la persona te escribe su pregunta. Si no puedes detectar el idioma con claridad, responde en ${idioma}. Nunca respondas en un idioma distinto al que te escriben.`;

const langNames = { es:'español', ca:'català', eu:'euskera', gl:'galego', en:'English' };

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

    return env.ASSETS.fetch(request);
  }
};
