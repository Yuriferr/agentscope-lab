import express, { type ErrorRequestHandler } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { agentInputSchema, runInputSchema, suiteInputSchema } from '../shared/schema.ts';
import { compare, csv } from './evaluation.ts';
import { createProvider, validateEndpoint, standardOrigins, type Provider } from './providers.ts';
import { keySchema, listModels, testConnection } from './connections.ts';
import { Runner } from './runner.ts';
import { Store } from './store.ts';
export function createApp(options: {
  dbPath: string;
  allowedOrigins?: string[];
  provider?: Provider;
  staticDir?: string;
}) {
  const store = new Store(options.dbPath);
  const allowedOrigins = [...new Set([...standardOrigins, ...(options.allowedOrigins ?? [])])];
  const sessionKeys = new Map<string, string>();
  const runner = new Runner(
    store,
    options.provider ?? createProvider(allowedOrigins, (id) => sessionKeys.get(id)),
  );
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.headers.origin;
    const own = new Set([
      `http://${req.headers.host}`,
      `https://${req.headers.host}`,
      'http://127.0.0.1:5173',
      'http://localhost:5173',
    ]);
    if ((origin && !own.has(origin)) || req.headers['sec-fetch-site'] === 'cross-site') {
      res.status(403).json({ error: 'Origem não permitida.' });
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method) && !req.is('application/json')) {
      res.status(415).json({ error: 'Envie application/json.' });
      return;
    }
    next();
  });
  app.use(express.json({ limit: '2mb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '1.1.0' }));
  app.get('/api/agents', (_req, res) =>
    res.json(
      store
        .agents()
        .map((a) => ({ ...a, needsKey: Boolean(a.sessionKeyRequired && !sessionKeys.has(a.id)) })),
    ),
  );
  app.post('/api/connections/models', async (req, res) =>
    res.json(await listModels(req.body, allowedOrigins)),
  );
  app.post('/api/connections/test', async (req, res) =>
    res.json(await testConnection(req.body, allowedOrigins)),
  );
  app.post('/api/agents', (req, res) => {
    const input = agentInputSchema.parse(req.body);
    const apiKey = keySchema.parse(req.body.apiKey);
    if (input.endpoint) validateEndpoint(input.endpoint, allowedOrigins);
    const agent = {
      ...input,
      sessionKeyRequired: Boolean(apiKey) || input.sessionKeyRequired,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    if (apiKey) sessionKeys.set(agent.id, apiKey);
    store.saveAgent(agent);
    res.status(201).json(agent);
  });
  app.post('/api/agents/:id/key', async (req, res) => {
    const agent = store.agent(req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'IA não encontrada.' });
      return;
    }
    const apiKey = keySchema.parse(req.body.apiKey);
    if (!apiKey) throw new Error('Informe a chave de API.');
    await testConnection({ ...agent, apiKey }, allowedOrigins);
    sessionKeys.set(agent.id, apiKey);
    store.saveAgent({ ...agent, sessionKeyRequired: true });
    res.json({ ok: true });
  });
  app.get('/api/suites', (_req, res) => res.json(store.suites()));
  app.post('/api/suites', (req, res) => {
    const input = suiteInputSchema.parse(req.body);
    const suite = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    store.saveSuite(suite);
    res.status(201).json(suite);
  });
  app.get('/api/runs', (_req, res) => res.json(store.runs()));
  app.post('/api/runs', (req, res) => {
    const input = runInputSchema.parse(req.body);
    const agent = store.agent(input.agentId);
    if (agent?.sessionKeyRequired && !sessionKeys.has(agent.id))
      throw new Error('Informe sua chave novamente em Minhas IAs antes de iniciar.');
    res.status(202).json(runner.start(input.agentId, input.suiteId, input.name, input.repetitions));
  });
  app.get('/api/runs/:id', (req, res) => {
    const run = store.run(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Execução não encontrada.' });
      return;
    }
    res.json(run);
  });
  app.post('/api/runs/:id/cancel', (req, res) => {
    const run = store.run(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Execução não encontrada.' });
      return;
    }
    runner.cancel(run.id);
    res.json({ ok: true });
  });
  app.get('/api/runs/:id/export', (req, res) => {
    const run = store.run(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Execução não encontrada.' });
      return;
    }
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    res
      .attachment(`agentscope-${run.id}.${format}`)
      .type(format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json')
      .send(format === 'csv' ? csv(run) : JSON.stringify(run, null, 2));
  });
  app.get('/api/compare', (req, res) => {
    const a = store.run(String(req.query.baseline)),
      b = store.run(String(req.query.candidate));
    if (!a || !b) {
      res.status(404).json({ error: 'Execução não encontrada.' });
      return;
    }
    res.json(compare(a, b));
  });
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint não encontrado.' });
  });
  const staticDir = options.staticDir ?? resolve('dist');
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(staticDir, 'index.html')));
  }
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error.name === 'ZodError') {
      res.status(400).json({
        error: error.issues
          .map((i: { message: string; path: string[] }) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      });
      return;
    }
    const status = error.status === 413 ? 413 : 400;
    res.status(status).json({
      error:
        error instanceof SyntaxError ? 'JSON inválido.' : error.message || 'Requisição inválida.',
    });
  };
  app.use(errors);
  return { app, store, runner };
}
