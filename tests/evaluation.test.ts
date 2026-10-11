import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, metrics, suiteHash, compare, csv } from '../server/evaluation.ts';
import { bankingSuite } from '../server/seed.ts';
import { demoResponse } from '../server/providers.ts';
import { suiteInputSchema } from '../shared/schema.ts';
import type { Result, Run } from '../shared/schema.ts';

test('all assertions evaluate explicit output, preserving strict data types and accent-insensitive text', () => {
  const scenario = {
    ...bankingSuite.cases[0],
    assertions: [
      { type: 'route_equals' as const, value: 'credito' },
      { type: 'contains' as const, value: 'analise' },
      { type: 'not_contains' as const, value: 'aprovado' },
      { type: 'data_equals' as const, key: 'income', value: 4500 },
      { type: 'data_equals' as const, key: 'hasDebt', value: false },
      { type: 'max_latency' as const, value: 100 },
    ],
  };
  assert.ok(
    evaluate(
      scenario,
      { response: 'Depende de ANÁLISE.', route: 'credito', data: { income: 4500, hasDebt: false } },
      100,
    ).every((c) => c.passed),
  );
  const checks = evaluate(
    scenario,
    { response: 'aprovado', route: 'cambio', data: { income: '4500' } },
    101,
  );
  assert.ok(checks.every((c) => !c.passed));
});
test('missing field never equals explicit null and prototype fields are not data', () => {
  assert.equal(
    evaluate(
      {
        ...bankingSuite.cases[0],
        assertions: [{ type: 'data_equals', key: 'missing', value: null }],
      },
      { response: '' },
      0,
    )[0].passed,
    false,
  );
  assert.equal(
    evaluate(
      {
        ...bankingSuite.cases[0],
        assertions: [{ type: 'data_equals', key: 'toString', value: null }],
      },
      { response: '', data: {} },
      0,
    )[0].passed,
    false,
  );
});
test('demo improvement is derived from independent rule programs, not hard-coded scores', () => {
  const rates = ['baseline', 'candidate'].map(
    (variant) =>
      bankingSuite.cases.filter((c) =>
        evaluate(c, demoResponse(c.prompt, variant as 'baseline' | 'candidate'), 10).every(
          (x) => x.passed,
        ),
      ).length,
  );
  assert.equal(rates[0], 7);
  assert.equal(rates[1], 16);
  assert.equal(demoResponse('Pedido totalmente novo.', 'candidate').route, 'triagem');
});
test('metrics include errors as failures and calculate nearest-rank p95', () => {
  const results = Array.from({ length: 20 }, (_, i) => ({
    latencyMs: (i + 1) * 10,
    passed: i < 10,
    category: 'Robustez',
    checks: [{ passed: i < 10 }],
    error: i === 19 ? 'timeout' : undefined,
  })) as Result[];
  const m = metrics(results);
  assert.equal(m.passRate, 50);
  assert.equal(m.assertionRate, 50);
  assert.equal(m.p95Latency, 190);
  assert.equal(m.meanLatency, 105);
  assert.equal(m.errors, 1);
  assert.equal(metrics([]).p95Latency, 0);
});
test('fingerprint ignores labels and order but detects changed criteria', () => {
  const hash = suiteHash(bankingSuite);
  assert.equal(
    suiteHash({ ...bankingSuite, name: 'Renamed', cases: [...bankingSuite.cases].reverse() }),
    hash,
  );
  assert.notEqual(suiteHash({ ...bankingSuite, cases: bankingSuite.cases.slice(1) }), hash);
  assert.notEqual(
    suiteHash({
      ...bankingSuite,
      cases: bankingSuite.cases.map((c) => ({ ...c, prompt: c.prompt + '!' })),
    }),
    hash,
  );
});
test('suite validation rejects duplicate IDs and empty assertions', () => {
  assert.equal(
    suiteInputSchema.safeParse({
      ...bankingSuite,
      cases: [bankingSuite.cases[0], bankingSuite.cases[0]],
    }).success,
    false,
  );
  assert.equal(
    suiteInputSchema.safeParse({
      ...bankingSuite,
      cases: [{ ...bankingSuite.cases[0], assertions: [] }],
    }).success,
    false,
  );
});
test('comparison rejects partial, incompatible and identical runs', () => {
  const r = { id: 'a', status: 'completed', suiteHash: 'hash', repetitions: 1 } as Run;
  assert.throws(() => compare(r, r));
  assert.throws(() => compare(r, { ...r, id: 'b', status: 'cancelled' }));
  assert.throws(() => compare(r, { ...r, id: 'b', suiteHash: 'other' }));
  assert.throws(() => compare(r, { ...r, id: 'b', repetitions: 2 }));
});
test('CSV escapes quotes, multiline output and spreadsheet formula injection', () => {
  const output = csv({
    results: [
      {
        caseId: '=CMD()',
        name: '"quoted"',
        category: 'Robustez',
        repetition: 1,
        passed: false,
        latencyMs: 10,
        output: { response: 'line1\nline2' },
      },
    ],
  } as Run);
  assert.ok(output.includes('"\'=CMD()"'));
  assert.ok(output.includes('""quoted""'));
  assert.ok(output.includes('line1\nline2'));
});
