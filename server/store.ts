import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Agent, Run, RunSummary, Suite } from '../shared/schema.ts';
import { bankingSuite, demoAgents, quickSuite } from './seed.ts';
export class Store {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      'PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS suites (id TEXT PRIMARY KEY, json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, json TEXT NOT NULL);',
    );
    for (const agent of demoAgents) if (!this.agent(agent.id)) this.saveAgent(agent);
    if (!this.suite(bankingSuite.id)) this.saveSuite(bankingSuite);
    if (!this.suite(quickSuite.id)) this.saveSuite(quickSuite);
    for (const run of this.all<Run>('runs'))
      if (run.status === 'running')
        this.saveRun({ ...run, status: 'interrupted', finishedAt: new Date().toISOString() });
  }
  private all<T>(table: 'agents' | 'suites' | 'runs'): T[] {
    return this.db
      .prepare(`SELECT json FROM ${table} ORDER BY rowid DESC`)
      .all()
      .map((r) => JSON.parse(r.json as string) as T);
  }
  private get<T>(table: 'agents' | 'suites' | 'runs', id: string): T | undefined {
    const row = this.db.prepare(`SELECT json FROM ${table} WHERE id = ?`).get(id);
    return row ? (JSON.parse(row.json as string) as T) : undefined;
  }
  private put(table: 'agents' | 'suites' | 'runs', value: { id: string }) {
    this.db
      .prepare(
        `INSERT INTO ${table} (id,json) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json`,
      )
      .run(value.id, JSON.stringify(value));
  }
  agents() {
    return this.all<Agent>('agents');
  }
  suites() {
    return this.all<Suite>('suites');
  }
  agent(id: string) {
    return this.get<Agent>('agents', id);
  }
  suite(id: string) {
    return this.get<Suite>('suites', id);
  }
  run(id: string) {
    return this.get<Run>('runs', id);
  }
  saveAgent(agent: Agent) {
    this.put('agents', agent);
  }
  saveSuite(suite: Suite) {
    this.put('suites', suite);
  }
  saveRun(run: Run) {
    this.put('runs', run);
  }
  runs(): RunSummary[] {
    return this.all<Run>('runs').map(({ results: _results, suite, ...run }) => ({
      ...run,
      suite: { id: suite.id, name: suite.name },
    }));
  }
  close() {
    this.db.close();
  }
}
