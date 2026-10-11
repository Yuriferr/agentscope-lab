import { z } from 'zod';

export const categories = ['Roteamento', 'Robustez', 'Segurança', 'Extração'] as const;
const short = z.string().trim().min(1).max(160);
export const assertionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('route_equals'), value: short }),
  z.object({ type: z.literal('contains'), value: short }),
  z.object({ type: z.literal('not_contains'), value: short }),
  z.object({
    type: z.literal('data_equals'),
    key: short,
    value: z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()]),
  }),
  z.object({ type: z.literal('max_latency'), value: z.number().int().min(1).max(120000) }),
]);
export const caseSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  name: short,
  category: z.enum(categories),
  prompt: z.string().trim().min(1).max(12000),
  assertions: z.array(assertionSchema).min(1).max(20),
});
export const suiteInputSchema = z
  .object({
    name: short,
    description: z.string().max(1000).default(''),
    cases: z.array(caseSchema).min(1).max(100),
  })
  .refine((s) => new Set(s.cases.map((c) => c.id)).size === s.cases.length, {
    message: 'IDs de cenários devem ser únicos.',
  });
export const agentInputSchema = z
  .object({
    name: short,
    version: short,
    provider: z.enum(['demo', 'http', 'ollama']),
    demoVariant: z.enum(['baseline', 'candidate']).optional(),
    endpoint: z.string().url().max(2048).optional(),
    model: z.string().trim().min(1).max(100).optional(),
    systemPrompt: z.string().max(12000).optional(),
    tokenEnv: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]{0,79}$/)
      .optional(),
    timeoutMs: z.number().int().min(100).max(120000).default(30000),
  })
  .superRefine((a, ctx) => {
    if (a.provider !== 'demo' && !a.endpoint)
      ctx.addIssue({ code: 'custom', message: 'Informe o endpoint.', path: ['endpoint'] });
    if (a.provider === 'ollama' && !a.model)
      ctx.addIssue({ code: 'custom', message: 'Informe o modelo.', path: ['model'] });
    if (a.provider === 'demo' && !a.demoVariant)
      ctx.addIssue({
        code: 'custom',
        message: 'Informe a variante de demonstração.',
        path: ['demoVariant'],
      });
  });
export const runInputSchema = z.object({
  agentId: short,
  suiteId: short,
  name: short,
  repetitions: z.number().int().min(1).max(5).default(1),
});
export const outputSchema = z.object({
  response: z.string().max(100000),
  route: z.string().max(200).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type Assertion = z.infer<typeof assertionSchema>;
export type Scenario = z.infer<typeof caseSchema>;
export type Suite = z.infer<typeof suiteInputSchema> & { id: string; createdAt: string };
export type Agent = z.infer<typeof agentInputSchema> & { id: string; createdAt: string };
export type AgentOutput = z.infer<typeof outputSchema>;
export type Check = {
  type: Assertion['type'];
  label: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
};
export type Result = {
  id: string;
  caseId: string;
  name: string;
  category: Scenario['category'];
  prompt: string;
  repetition: number;
  latencyMs: number;
  passed: boolean;
  checks: Check[];
  output?: AgentOutput;
  error?: string;
};
export type Metrics = {
  completed: number;
  passed: number;
  failed: number;
  errors: number;
  passRate: number;
  assertionRate: number;
  meanLatency: number;
  p95Latency: number;
  categories: { name: string; passed: number; total: number; rate: number }[];
};
export type Run = {
  id: string;
  name: string;
  agent: Agent;
  suite: Suite;
  suiteHash: string;
  repetitions: number;
  total: number;
  status: 'running' | 'completed' | 'cancelled' | 'interrupted' | 'failed';
  createdAt: string;
  finishedAt?: string;
  results: Result[];
  metrics: Metrics;
};
export type RunSummary = Omit<Run, 'results' | 'suite'> & { suite: { id: string; name: string } };
export type Comparison = {
  baselineId: string;
  candidateId: string;
  passRateDelta: number;
  latencyDelta: number;
  regressions: { caseId: string; name: string; baselineRate: number; candidateRate: number }[];
  improvements: { caseId: string; name: string; baselineRate: number; candidateRate: number }[];
  unchanged: number;
};
