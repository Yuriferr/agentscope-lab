import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { agentInputSchema, suiteInputSchema } from '../shared/schema.ts';
import { Store } from '../server/store.ts';
import { Runner } from '../server/runner.ts';
import { createProvider, standardOrigins } from '../server/providers.ts';
if (existsSync('.env')) process.loadEnvFile('.env');
const { values } = parseArgs({
  options: {
    agent: { type: 'string', default: 'demo-candidate' },
    'agent-file': { type: 'string' },
    'suite-file': { type: 'string' },
    repetitions: { type: 'string', default: '1' },
    'min-pass-rate': { type: 'string', default: '100' },
    output: { type: 'string' },
  },
});
const repetitions = Number(values.repetitions),
  minPassRate = Number(values['min-pass-rate']);
if (
  !Number.isInteger(repetitions) ||
  repetitions < 1 ||
  repetitions > 5 ||
  !Number.isFinite(minPassRate) ||
  minPassRate < 0 ||
  minPassRate > 100
)
  throw new Error('Repetições: 1–5. Taxa mínima: 0–100.');
const store = new Store(':memory:');
let agentId = values.agent!,
  suiteId = 'suite-banco';
if (values['agent-file']) {
  const input = agentInputSchema.parse(JSON.parse(readFileSync(values['agent-file'], 'utf8')));
  agentId = 'cli-agent';
  store.saveAgent({ ...input, id: agentId, createdAt: new Date().toISOString() });
}
if (values['suite-file']) {
  const input = suiteInputSchema.parse(JSON.parse(readFileSync(values['suite-file'], 'utf8')));
  suiteId = 'cli-suite';
  store.saveSuite({ ...input, id: suiteId, createdAt: new Date().toISOString() });
}
const origins = [
  ...standardOrigins,
  ...(process.env.AGENT_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()) ?? []),
];
const runner = new Runner(store, createProvider(origins));
try {
  const start = runner.start(agentId, suiteId, 'Avaliação via CLI', repetitions);
  await runner.settle(start.id);
  const run = store.run(start.id)!;
  console.log(
    JSON.stringify(
      {
        status: run.status,
        provider: run.agent.provider,
        simulation: run.agent.provider === 'demo',
        ...run.metrics,
      },
      null,
      2,
    ),
  );
  if (values.output) writeFileSync(values.output, JSON.stringify(run, null, 2));
  process.exitCode = run.status === 'completed' && run.metrics.passRate >= minPassRate ? 0 : 1;
} finally {
  await runner.shutdown();
  store.close();
}
