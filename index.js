export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/chat') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      try {
        const body = await request.json();
        const message = body.message;
        const system = body.system || 'You are a helpful AI assistant for Manolito Aire, an air conditioning company. Answer in Spanish.';
        if (!message) {
          return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const messages = [{ role: 'system', content: system }, { role: 'user', content: message }];
        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', { messages });
        const aiResponse = typeof response === 'string' ? response : (response.response || JSON.stringify(response));
        return new Response(JSON.stringify({ response: aiResponse }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return env.ASSETS.fetch(request);
  }
};
