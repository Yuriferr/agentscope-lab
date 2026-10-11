import type { Run } from '../shared/schema.ts';
import { evaluate, metrics, suiteHash } from './evaluation.ts';
import type { Provider } from './providers.ts';
import type { Store } from './store.ts';
export class Runner {
  private controllers = new Map<string, AbortController>();
  private tasks = new Map<string, Promise<void>>();
  constructor(
    private store: Store,
    private provider: Provider,
  ) {}
  start(agentId: string, suiteId: string, name: string, repetitions: number): Run {
    if (this.controllers.size >= 2)
      throw new Error('Já existem duas execuções em andamento. Aguarde ou cancele uma.');
    const agent = this.store.agent(agentId),
      suite = this.store.suite(suiteId);
    if (!agent || !suite) throw new Error('Agente ou suíte não encontrado.');
    const run: Run = {
      id: crypto.randomUUID(),
      name,
      agent,
      suite,
      suiteHash: suiteHash(suite),
      repetitions,
      total: suite.cases.length * repetitions,
      status: 'running',
      createdAt: new Date().toISOString(),
      results: [],
      metrics: metrics([]),
    };
    this.store.saveRun(run);
    const controller = new AbortController();
    this.controllers.set(run.id, controller);
    const task = this.execute(run, controller.signal).finally(() => {
      this.controllers.delete(run.id);
      this.tasks.delete(run.id);
    });
    this.tasks.set(run.id, task);
    return run;
  }
  cancel(id: string) {
    this.controllers.get(id)?.abort();
  }
  async settle(id: string) {
    await this.tasks.get(id);
  }
  async shutdown() {
    for (const c of this.controllers.values()) c.abort();
    await Promise.allSettled(this.tasks.values());
  }
  private async execute(run: Run, signal: AbortSignal) {
    try {
      for (let repetition = 1; repetition <= run.repetitions; repetition++) {
        for (const scenario of run.suite.cases) {
          if (signal.aborted) break;
          const start = performance.now();
          let output, error: string | undefined;
          try {
            output = await this.provider(run.agent, scenario.prompt, signal);
          } catch (e) {
            error = e instanceof Error ? e.message : 'Falha do provedor.';
          }
          if (signal.aborted) break;
          const latencyMs = Math.round((performance.now() - start) * 100) / 100;
          const checks = output
            ? evaluate(scenario, output, latencyMs)
            : scenario.assertions.map((a) => ({
                type: a.type,
                label: 'Não avaliado: falha de execução',
                passed: false,
                expected: a,
                actual: null,
              }));
          run.results.push({
            id: `${scenario.id}-${repetition}`,
            caseId: scenario.id,
            name: scenario.name,
            category: scenario.category,
            prompt: scenario.prompt,
            repetition,
            latencyMs,
            passed: !error && checks.every((c) => c.passed),
            checks,
            output,
            error,
          });
          run.metrics = metrics(run.results);
          this.store.saveRun(run);
        }
        if (signal.aborted) break;
      }
      run.status = signal.aborted ? 'cancelled' : 'completed';
    } catch {
      run.status = 'failed';
    } finally {
      run.finishedAt = new Date().toISOString();
      this.store.saveRun(run);
    }
  }
}
