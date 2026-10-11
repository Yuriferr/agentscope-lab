import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createApp } from '../server/app.ts';
import { createProvider, validateEndpoint } from '../server/providers.ts';
import { Store } from '../server/store.ts';
import { demoAgents } from '../server/seed.ts';
import { metrics } from '../server/evaluation.ts';
import type { Agent, Run, Comparison } from '../shared/schema.ts';

test('API creates, persists, evaluates, compares and exports complete runs', async () => {
  const setup = createApp({ dbPath: ':memory:' });
  const server = setup.app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const post = (path: string, body: unknown, headers = {}) =>
    fetch(url + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await fetch(url + '/health')).status, 200);
    assert.equal((await post('/runs', {})).status, 400);
    assert.equal((await post('/runs', {}, { Origin: 'https://evil.example' })).status, 403);
    const ids: string[] = [];
    for (const agentId of ['demo-baseline', 'demo-candidate']) {
      const response = await post('/runs', {
        agentId,
        suiteId: 'suite-banco',
        name: agentId,
        repetitions: 2,
      });
      assert.equal(response.status, 202);
      const start = (await response.json()) as Run;
      ids.push(start.id);
      await setup.runner.settle(start.id);
      const run = (await (await fetch(url + '/runs/' + start.id)).json()) as Run;
      assert.equal(run.status, 'completed');
      assert.equal(run.results.length, 32);
      assert.equal(run.metrics.errors, 0);
    }
    const comparison = (await (
      await fetch(`${url}/compare?baseline=${ids[0]}&candidate=${ids[1]}`)
    ).json()) as Comparison;
    assert.equal(comparison.regressions.length, 0);
    assert.equal(comparison.improvements.length, 9);
    assert.equal(comparison.passRateDelta, 56.25);
    assert.equal(
      (await fetch(`${url}/runs/${ids[0]}/export?format=csv`)).headers.get('content-type'),
      'text/csv; charset=utf-8',
    );
    assert.equal((await fetch(`${url}/runs/missing`)).status, 404);
    const json = (await (await fetch(`${url}/runs/${ids[0]}/export`)).json()) as Run;
    assert.equal(json.results.length, 32);
  } finally {
    await setup.runner.shutdown();
    await new Promise<void>((r) => server.close(() => r()));
    setup.store.close();
  }
});
test('runner records provider errors, enforces concurrency and cancellation', async () => {
  const setup = createApp({
    dbPath: ':memory:',
    provider: async (_a, _p, signal) => {
      await delay(30, undefined, { signal });
      throw new Error('Connection test failure');
    },
  });
  try {
    const a = setup.runner.start('demo-baseline', 'suite-banco', 'errors', 1);
    const b = setup.runner.start('demo-candidate', 'suite-banco', 'cancel', 1);
    assert.throws(() => setup.runner.start('demo-candidate', 'suite-banco', 'third', 1));
    setup.runner.cancel(b.id);
    await setup.runner.settle(b.id);
    assert.equal(setup.store.run(b.id)?.status, 'cancelled');
    await setup.runner.settle(a.id);
    const run = setup.store.run(a.id)!;
    assert.equal(run.metrics.errors, 16);
    assert.equal(run.metrics.passRate, 0);
    assert.equal(run.metrics.assertionRate, 0);
  } finally {
    await setup.runner.shutdown();
    setup.store.close();
  }
});
test('restart preserves data and marks unfinished runs interrupted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentscope-'));
  const path = join(dir, 'test.sqlite');
  try {
    let store = new Store(path);
    store.saveRun({
      id: 'unfinished',
      status: 'running',
      results: [],
      metrics: metrics([]),
    } as unknown as Run);
    store.close();
    store = new Store(path);
    assert.equal(store.run('unfinished')?.status, 'interrupted');
    assert.equal(store.agents().length, 2);
    store.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test('HTTP and Ollama connectors validate contracts, timeout and blocked redirects', async () => {
  const requests: Record<string, unknown>[] = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push(JSON.parse(body));
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: 'http://blocked.example' });
      res.end();
      return;
    }
    if (req.url === '/slow') {
      await delay(200);
      res.end('{}');
      return;
    }
    if (req.url === '/bad') {
      res.end('not json');
      return;
    }
    if (req.url === '/shape') {
      res.end('{"foo":1}');
      return;
    }
    if (req.url === '/error') {
      res.writeHead(503);
      res.end('{}');
      return;
    }
    if (req.url === '/big') {
      res.end(JSON.stringify({ response: 'a'.repeat(1100000) }));
      return;
    }
    if (req.url === '/ollama') {
      res.end(
        JSON.stringify({
          message: { content: JSON.stringify({ response: 'OK', route: 'credito' }) },
        }),
      );
      return;
    }
    res.end(JSON.stringify({ response: 'OK', route: 'credito' }));
  });
  server.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const provider = createProvider([origin]);
  const agent: Agent = {
    ...demoAgents[0],
    provider: 'http',
    endpoint: origin + '/ok',
    timeoutMs: 100,
  };
  try {
    const output = await provider(agent, 'test', new AbortController().signal);
    assert.equal(output.route, 'credito');
    assert.deepEqual(Object.keys(requests[0]).sort(), ['prompt', 'sessionId']);
    for (const path of ['/redirect', '/slow', '/bad', '/shape', '/error', '/big'])
      await assert.rejects(
        provider({ ...agent, endpoint: origin + path }, 'test', new AbortController().signal),
      );
    const ollama = await provider(
      { ...agent, provider: 'ollama', model: 'example', endpoint: origin + '/ollama' },
      'test',
      new AbortController().signal,
    );
    assert.equal(ollama.route, 'credito');
    assert.equal(requests.at(-1)?.stream, false);
    assert.throws(() => validateEndpoint('http://blocked.example/eval', [origin]));
    assert.throws(() => validateEndpoint(origin + '/eval?token=secret', [origin]));
    await assert.rejects(
      provider(
        { ...agent, tokenEnv: 'AGENTSCOPE_TEST_MISSING_TOKEN' },
        'test',
        new AbortController().signal,
      ),
      /autenticação/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
