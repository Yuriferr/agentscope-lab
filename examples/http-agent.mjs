// A minimal HTTP adapter fixture. Replace respond() with your agent invocation.
// This example is intentionally deterministic and does not call a language model.
import { createServer } from 'node:http';
function respond(prompt) {
  return /cr[eé]dito|limite/i.test(prompt)
    ? { response: 'Sua solicitação depende de análise.', route: 'credito', data: {} }
    : { response: 'Pode detalhar o que precisa?', route: 'triagem', data: {} };
}
createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST' || req.url !== '/evaluate') {
    res.writeHead(404);
    res.end('{}');
    return;
  }
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 100000) throw new Error('Too large');
    }
    const { prompt, sessionId } = JSON.parse(body);
    if (typeof prompt !== 'string' || typeof sessionId !== 'string')
      throw new Error('Invalid input');
    res.end(JSON.stringify(respond(prompt)));
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Expected prompt and sessionId.' }));
  }
}).listen(8000, '127.0.0.1', () => console.log('Example agent: http://127.0.0.1:8000/evaluate'));
