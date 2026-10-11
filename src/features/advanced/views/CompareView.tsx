import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  BarChart3,
  CircleHelp,
  Clock3,
  GitCompareArrows,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Comparison, RunSummary } from '../../../../shared/schema';
import { api, date, download, ms, pct } from '../../../lib/api';
import { Badge, Empty } from '../../../components/ui';
import { Stat } from './Stat';

export function CompareView({
  runs,
  onOpen,
  onNew,
}: {
  runs: RunSummary[];
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const complete = runs.filter((r) => r.status === 'completed');
  const [baseline, setBaseline] = useState(complete[1]?.id ?? ''),
    [candidate, setCandidate] = useState(complete[0]?.id ?? ''),
    [comparison, setComparison] = useState<Comparison | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setComparison(null);
    setError('');
    if (baseline && candidate)
      void api<Comparison>(
        `/compare?baseline=${encodeURIComponent(baseline)}&candidate=${encodeURIComponent(candidate)}`,
      )
        .then((c) => {
          if (active) setComparison(c);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [baseline, candidate]);
  if (complete.length < 2)
    return (
      <section className="panel">
        <Empty
          title="Dois experimentos. Uma comparação."
          text="Execute a baseline e o candidato com a mesma suíte e o mesmo número de repetições para descobrir o impacto das mudanças."
          action={
            <button className="button primary" onClick={onNew}>
              <Plus size={16} />
              Nova avaliação
            </button>
          }
        />
      </section>
    );
  const a = complete.find((r) => r.id === baseline),
    b = complete.find((r) => r.id === candidate);
  return (
    <>
      <section className="panel compare-controls">
        <label>
          <span className="eyebrow">A · BASELINE</span>
          <select
            aria-label="Execução baseline"
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
          >
            <option value="">Selecione uma execução</option>
            {complete.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {date(r.createdAt)} · {r.id.slice(0, 6)}
              </option>
            ))}
          </select>
        </label>
        <span className="compare-icon">
          <GitCompareArrows size={24} />
        </span>
        <label>
          <span className="eyebrow">B · CANDIDATO</span>
          <select
            aria-label="Execução candidata"
            value={candidate}
            onChange={(e) => setCandidate(e.target.value)}
          >
            <option value="">Selecione uma execução</option>
            {complete.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {date(r.createdAt)} · {r.id.slice(0, 6)}
              </option>
            ))}
          </select>
        </label>
      </section>
      {error && (
        <div className="notice warning" role="alert">
          <CircleHelp size={18} />
          {error}
        </div>
      )}
      {comparison && a && b && (
        <>
          {(a.agent.provider === 'demo' || b.agent.provider === 'demo') && (
            <div className="notice">
              <CircleHelp size={17} />
              Esta comparação contém uma simulação determinística. Resultados e latências não são
              benchmarks de LLMs.
            </div>
          )}
          <div className="stats-grid">
            <Stat
              label="Variação na aprovação"
              value={`${comparison.passRateDelta >= 0 ? '+' : ''}${comparison.passRateDelta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`}
              note={`${pct(a.metrics.passRate)} → ${pct(b.metrics.passRate)}`}
              icon={<BarChart3 size={18} />}
            />
            <Stat
              label="Cenários que melhoraram"
              value={String(comparison.improvements.length)}
              note="Maior taxa de aprovação no candidato"
              icon={<Sparkles size={18} />}
            />
            <Stat
              label="Regressões detectadas"
              value={String(comparison.regressions.length)}
              note="Menor taxa de aprovação no candidato"
              icon={<ShieldCheck size={18} />}
            />
            <Stat
              label="Variação na latência"
              value={`${comparison.latencyDelta >= 0 ? '+' : '−'}${ms(Math.abs(comparison.latencyDelta))}`}
              note="Candidato menos baseline"
              icon={<Clock3 size={18} />}
            />
          </div>
          <section className="panel comparison-chart">
            <div className="panel-heading">
              <div>
                <h2>Aprovação por dimensão</h2>
                <p>Percentual de testes que atenderam todos os critérios.</p>
              </div>
              <div className="legend">
                <span>
                  <i />
                  Baseline
                </span>
                <span>
                  <i />
                  Candidato
                </span>
              </div>
            </div>
            {a.metrics.categories.map((c) => {
              const other = b.metrics.categories.find((x) => x.name === c.name);
              return (
                <div className="comparison-row" key={c.name}>
                  <strong>{c.name}</strong>
                  <div>
                    <div>
                      <i className="baseline-bar" style={{ width: `${c.rate}%` }} />
                      <span>{pct(c.rate)}</span>
                    </div>
                    <div>
                      <i className="candidate-bar" style={{ width: `${other?.rate ?? 0}%` }} />
                      <span>{pct(other?.rate ?? 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
          <div className="overview-bottom">
            {[
              { title: 'Melhorias', rows: comparison.improvements, tone: 'green' as const },
              { title: 'Regressões', rows: comparison.regressions, tone: 'red' as const },
            ].map((group) => (
              <section className="panel change-panel" key={group.title}>
                <h2>
                  {group.title}
                  <Badge tone={group.tone}>{group.rows.length}</Badge>
                </h2>
                {group.rows.length ? (
                  group.rows.map((row) => (
                    <div className="change-row" key={row.caseId}>
                      <span>{row.name}</span>
                      <strong>
                        {pct(row.baselineRate)} → {pct(row.candidateRate)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p className="subtle">
                    {group.title === 'Melhorias' ? 'Nenhuma melhoria' : 'Nenhuma regressão'}{' '}
                    detectada nesta comparação.
                  </p>
                )}
              </section>
            ))}
          </div>
          <p className="caption">
            {comparison.unchanged} cenários sem mudança na taxa de aprovação. Variações observadas
            não demonstram significância estatística.
          </p>
          <div className="action-row">
            <button className="button secondary" onClick={() => onOpen(baseline)}>
              Inspecionar baseline
            </button>
            <button className="button secondary" onClick={() => onOpen(candidate)}>
              Inspecionar candidato
            </button>
            <button
              className="button secondary"
              onClick={() => download('agentscope-comparacao.json', comparison)}
            >
              <ArrowDownToLine size={16} />
              Exportar comparação
            </button>
          </div>
        </>
      )}
    </>
  );
}
