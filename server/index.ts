import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './app.ts';
if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.PORT ?? 4310),
  host = process.env.HOST ?? '127.0.0.1';
const { app, store, runner } = createApp({
  dbPath: resolve(process.env.DATA_DIR ?? 'data', 'agentscope.sqlite'),
  allowedOrigins: process.env.AGENT_ALLOWED_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});
const server = app.listen(port, host, () => console.log(`AgentScope Lab: http://${host}:${port}`));
async function stop() {
  server.close();
  await runner.shutdown();
  store.close();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
