import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../server/app.ts';
import { evaluate } from '../server/evaluation.ts';
import { quickSuite } from '../server/seed.ts';
import { demoResponse } from '../server/providers.ts';

test('plain-language tests check exact responses without accepting extra text', () => {
  const scenario = quickSuite.cases[0];
  assert.equal(evaluate(scenario, { response: '  BRASILIA  ' }, 1)[0].passed, true);
  assert.equal(evaluate(scenario, { response: 'Não é Brasília' }, 1)[0].passed, false);
  assert.equal(
    quickSuite.cases.filter((c) =>
      evaluate(c, demoResponse(c.prompt, 'baseline'), 1).every((x) => x.passed),
    ).length,
    3,
  );
});
test('guided connections: discover, probe, save key in memory, evaluate, restart and restore', async () => {
  const secret = 'only-for-this-test';
  const seen: { auth: string | undefined; body: Record<string, unknown> }[] = [];
  const fixture = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/models') {
      res.end(JSON.stringify({ data: [{ id: 'chat-test' }] }));
      return;
    }
    if (req.url === '/api/tags') {
      res.end(JSON.stringify({ models: [{ name: 'local-test' }] }));
      return;
    }
    let text = '';
    for await (const c of req) text += c;
    const body = JSON.parse(text);
    seen.push({ auth: req.headers.authorization, body });
    if (req.headers.authorization === 'Bearer rejected') {
      res.writeHead(401);
      res.end('{}');
      return;
    }
    const prompt = body.messages.at(-1).content;
    const answer = prompt.includes('conexão')
      ? 'conexão funcionando'
      : demoResponse(prompt, 'candidate').response;
    res.end(
      JSON.stringify(
        req.url === '/api/chat'
          ? { message: { content: answer } }
          : { choices: [{ message: { content: answer } }] },
      ),
    );
  });
  fixture.listen(0, '127.0.0.1');
  await new Promise<void>((r) => fixture.once('listening', r));
  const origin = `http://127.0.0.1:${(fixture.address() as { port: number }).port}`;
  const dir = mkdtempSync(join(tmpdir(), 'agentscope-keys-'));
  const dbPath = join(dir, 'test.sqlite');
  let setup = createApp({ dbPath, allowedOrigins: [origin] });
  let server = setup.app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  let base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const post = (path: string, data: unknown) =>
    fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  const config = {
    name: 'Test API',
    version: 'v1',
    provider: 'openai-compatible',
    responseMode: 'plain',
    model: 'chat-test',
    endpoint: origin + '/v1/chat/completions',
    apiKey: secret,
  };
  try {
    assert.deepEqual(await (await post('/connections/models', config)).json(), {
      models: ['chat-test'],
    });
    assert.deepEqual(
      await (
        await post('/connections/models', {
          ...config,
          provider: 'ollama',
          endpoint: origin + '/api/chat',
        })
      ).json(),
      { models: ['local-test'] },
    );
    assert.equal((await post('/connections/test', { ...config, apiKey: 'rejected' })).status, 400);
    assert.equal((await post('/connections/test', config)).status, 200);
    const agent = await (await post('/agents', config)).json();
    assert.equal(JSON.stringify(agent).includes(secret), false);
    const run = await (
      await post('/runs', { agentId: agent.id, suiteId: 'suite-quick', name: 'API run' })
    ).json();
    await setup.runner.settle(run.id);
    assert.equal(setup.store.run(run.id)?.metrics.passed, 6);
    assert.ok(seen.some((s) => s.auth === `Bearer ${secret}`));
    assert.ok(seen.every((s) => !('format' in s.body))); // Normal chat, no custom JSON needed.
    const exported = await (await fetch(`${base}/runs/${run.id}/export`)).text();
    assert.equal(exported.includes(secret), false);
    assert.equal(JSON.stringify(setup.store.agents()).includes(secret), false);
    await setup.runner.shutdown();
    await new Promise<void>((r) => server.close(() => r()));
    setup.store.close();
    assert.equal(readFileSync(dbPath).includes(Buffer.from(secret)), false);
    setup = createApp({ dbPath, allowedOrigins: [origin] });
    server = setup.app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
    const agents = await (await fetch(base + '/agents')).json();
    assert.equal(agents.find((a: { id: string }) => a.id === agent.id).needsKey, true);
    assert.equal(
      (await post('/runs', { agentId: agent.id, suiteId: 'suite-quick', name: 'Missing key' }))
        .status,
      400,
    );
    assert.equal((await post(`/agents/${agent.id}/key`, { apiKey: secret })).status, 200);
    const local = await post('/connections/test', {
      ...config,
      apiKey: undefined,
      provider: 'ollama',
      endpoint: origin + '/api/chat',
    });
    assert.equal(local.status, 200);
  } finally {
    await setup.runner.shutdown();
    await new Promise<void>((r) => server.close(() => r()));
    setup.store.close();
    fixture.closeAllConnections();
    await new Promise<void>((r) => fixture.close(() => r()));
    rmSync(dir, { recursive: true });
  }
});
