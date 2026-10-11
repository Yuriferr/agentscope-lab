import { createHash } from 'node:crypto';
import type {
  AgentOutput,
  Check,
  Comparison,
  Metrics,
  Result,
  Run,
  Scenario,
  Suite,
} from '../shared/schema.ts';
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export function evaluate(scenario: Scenario, output: AgentOutput, latencyMs: number): Check[] {
  return scenario.assertions.map((a) => {
    switch (a.type) {
      case 'route_equals':
        return {
          type: a.type,
          label: 'Rota correta',
          passed: output.route === a.value,
          expected: a.value,
          actual: output.route ?? null,
        };
      case 'contains':
        return {
          type: a.type,
          label: 'Trecho esperado',
          passed: normalize(output.response).includes(normalize(a.value)),
          expected: a.value,
          actual: output.response,
        };
      case 'not_contains':
        return {
          type: a.type,
          label: 'Trecho proibido ausente',
          passed: !normalize(output.response).includes(normalize(a.value)),
          expected: `Ausência de: ${a.value}`,
          actual: output.response,
        };
      case 'data_equals':
        return {
          type: a.type,
          label: `Campo ${a.key}`,
          passed: Object.hasOwn(output.data ?? {}, a.key) && output.data?.[a.key] === a.value,
          expected: a.value,
          actual: output.data?.[a.key] ?? null,
        };
      case 'max_latency':
        return {
          type: a.type,
          label: 'Limite de latência',
          passed: latencyMs <= a.value,
          expected: a.value,
          actual: latencyMs,
        };
    }
  });
}
export function metrics(results: Result[]): Metrics {
  const sorted = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const passed = results.filter((r) => r.passed).length;
  const checks = results.flatMap((r) => r.checks);
  const categories = [...new Set(results.map((r) => r.category))].map((name) => {
    const subset = results.filter((r) => r.category === name);
    const count = subset.filter((r) => r.passed).length;
    return { name, passed: count, total: subset.length, rate: (count / subset.length) * 100 };
  });
  return {
    completed: results.length,
    passed,
    failed: results.length - passed,
    errors: results.filter((r) => r.error).length,
    passRate: results.length ? (passed / results.length) * 100 : 0,
    assertionRate: checks.length
      ? (checks.filter((c) => c.passed).length / checks.length) * 100
      : 0,
    meanLatency: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
    p95Latency: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : 0,
    categories,
  };
}
export function suiteHash(suite: Suite): string {
  const canonical = suite.cases
    .map((c) => ({
      id: c.id,
      category: c.category,
      prompt: c.prompt,
      assertions: c.assertions.map((a) =>
        Object.fromEntries(Object.entries(a).sort(([x], [y]) => x.localeCompare(y))),
      ),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
export function compare(baseline: Run, candidate: Run): Comparison {
  if (baseline.id === candidate.id) throw new Error('Selecione duas execuções diferentes.');
  if (baseline.status !== 'completed' || candidate.status !== 'completed')
    throw new Error('Compare apenas execuções concluídas.');
  if (baseline.suiteHash !== candidate.suiteHash || baseline.repetitions !== candidate.repetitions)
    throw new Error('As execuções precisam dos mesmos cenários, critérios e repetições.');
  const regressions: Comparison['regressions'] = [],
    improvements: Comparison['improvements'] = [];
  let unchanged = 0;
  for (const c of baseline.suite.cases) {
    const rate = (run: Run) => {
      const rs = run.results.filter((r) => r.caseId === c.id);
      return (rs.filter((r) => r.passed).length / rs.length) * 100;
    };
    const row = {
      caseId: c.id,
      name: c.name,
      baselineRate: rate(baseline),
      candidateRate: rate(candidate),
    };
    if (row.candidateRate < row.baselineRate) regressions.push(row);
    else if (row.candidateRate > row.baselineRate) improvements.push(row);
    else unchanged++;
  }
  return {
    baselineId: baseline.id,
    candidateId: candidate.id,
    passRateDelta: candidate.metrics.passRate - baseline.metrics.passRate,
    latencyDelta: candidate.metrics.meanLatency - baseline.metrics.meanLatency,
    regressions,
    improvements,
    unchanged,
  };
}
export function csv(run: Run): string {
  const cell = (value: unknown) => {
    let s = String(value ?? '');
    if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return (
    '\uFEFF' +
    [
      [
        'case_id',
        'cenario',
        'categoria',
        'repeticao',
        'aprovado',
        'latencia_ms',
        'resposta',
        'erro',
      ],
      ...run.results.map((r) => [
        r.caseId,
        r.name,
        r.category,
        r.repetition,
        r.passed,
        r.latencyMs,
        r.output?.response,
        r.error,
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}
