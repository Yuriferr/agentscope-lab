import { useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleHelp,
  Clock3,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react';
import type { Result, Run } from '../../../../shared/schema';
import { date, ms, pct } from '../../../lib/api';
import { Badge, Empty, Modal, Pass, Status } from '../../../components/ui';
import { Stat } from './Stat';

export function RunDetail({
  run,
  onBack,
  onCancel,
}: {
  run: Run;
  onBack: () => void;
  onCancel: () => Promise<void>;
}) {
  const [filter, setFilter] = useState('all'),
    [result, setResult] = useState<Result | null>(null),
    [cancelError, setCancelError] = useState('');
  const rows = run.results.filter(
    (r) => filter === 'all' || (filter === 'failed' ? !r.passed : r.passed),
  );
  return (
    <>
      <button className="text-button back" onClick={onBack}>
        <ArrowLeft size={16} />
        Voltar para execuções
      </button>
      <div className="page-heading detail-heading">
        <div>
          <div className="eyebrow">RELATÓRIO DE AVALIAÇÃO</div>
          <h1>{run.name}</h1>
          <p>
            {run.agent.name} · {run.agent.version} <span className="footer-dot">/</span>{' '}
            {date(run.createdAt)}
          </p>
        </div>
        <div className="action-row">
          <a className="button secondary" href={`/api/runs/${run.id}/export?format=json`}>
            <ArrowDownToLine size={16} />
            JSON
          </a>
          <a className="button secondary" href={`/api/runs/${run.id}/export?format=csv`}>
            CSV
          </a>
          {run.status === 'running' && (
            <button
              className="button secondary"
              onClick={() => void onCancel().catch((e) => setCancelError(e.message))}
            >
              <Square size={14} />
              Cancelar
            </button>
          )}
        </div>
      </div>
      {cancelError && (
        <p className="error" role="alert">
          {cancelError}
        </p>
      )}
      <div className="run-context">
        <Status run={run} />
        <span>{run.suite.name}</span>
        <span>{run.repetitions}× por cenário</span>
        {run.agent.provider === 'demo' && <Badge tone="amber">Simulação · sem LLM</Badge>}
      </div>
      {run.agent.provider === 'demo' && (
        <div className="notice">
          <CircleHelp size={17} />
          <span>
            Estes resultados avaliam programas demonstrativos. A latência inclui uma espera
            artificial; não representa a velocidade de um modelo real.
          </span>
        </div>
      )}
      <div className="stats-grid">
        <Stat
          label="Taxa de aprovação"
          value={pct(run.metrics.passRate)}
          note={`${run.metrics.passed} aprovados · ${run.metrics.failed} reprovados`}
          icon={<ShieldCheck size={18} />}
        />
        <Stat
          label="Critérios atendidos"
          value={pct(run.metrics.assertionRate)}
          note="Verificações individuais aprovadas"
          icon={<Check size={18} />}
        />
        <Stat
          label="Latência média / P95"
          value={ms(run.metrics.meanLatency)}
          note={`95% das chamadas em até ${ms(run.metrics.p95Latency)}`}
          icon={<Clock3 size={18} />}
        />
        <Stat
          label="Progresso"
          value={`${run.results.length}/${run.total}`}
          note={
            run.status === 'running'
              ? 'A avaliação está em andamento'
              : `${run.metrics.errors} erros de execução`
          }
          icon={<Activity size={18} />}
        />
      </div>
      <div className="progress-track">
        <i style={{ width: `${(run.results.length / run.total) * 100}%` }} />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Inspeção dos cenários</h2>
            <p>Abra um cenário para ver entrada, resposta e cada critério.</p>
          </div>
          <div className="segmented">
            {[
              ['all', 'Todos'],
              ['failed', 'Reprovados'],
              ['passed', 'Aprovados'],
            ].map(([id, label]) => (
              <button
                key={id}
                className={filter === id ? 'selected' : ''}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cenário</th>
                  <th>Dimensão</th>
                  <th>Resultado</th>
                  <th>Latência</th>
                  <th>Critérios</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button className="table-link" onClick={() => setResult(r)}>
                        {r.name}
                      </button>
                      <span className="subtext">
                        {r.caseId} · repetição {r.repetition}
                      </span>
                    </td>
                    <td>
                      <Badge>{r.category}</Badge>
                    </td>
                    <td>
                      <Pass passed={r.passed} />
                    </td>
                    <td className="mono">{ms(r.latencyMs)}</td>
                    <td className="mono">
                      {r.checks.filter((c) => c.passed).length}/{r.checks.length}
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Inspecionar ${r.name}`}
                        onClick={() => setResult(r)}
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              run.status === 'running' ? 'Aguardando respostas…' : 'Nenhum cenário neste filtro'
            }
            text="As verificações serão mostradas nesta tabela."
          />
        )}
      </section>
      {result && (
        <Modal title={result.name} onClose={() => setResult(null)} wide>
          <div className="result-detail">
            <div className="action-row">
              <Pass passed={result.passed} />
              <Badge>{result.category}</Badge>
              <span className="mono">{ms(result.latencyMs)}</span>
            </div>
            <h3>Entrada enviada ao agente</h3>
            <blockquote>{result.prompt}</blockquote>
            <h3>Resposta recebida</h3>
            {result.error ? (
              <p className="error">{result.error}</p>
            ) : (
              <pre>{JSON.stringify(result.output, null, 2)}</pre>
            )}
            <h3>Critérios de avaliação</h3>
            {result.checks.map((c, i) => (
              <div className="check-row" key={i}>
                <span className={c.passed ? 'check-icon success' : 'check-icon failure'}>
                  {c.passed ? <Check size={15} /> : <X size={15} />}
                </span>
                <div>
                  <strong>{c.label}</strong>
                  <span>
                    Esperado: <code>{JSON.stringify(c.expected)}</code>
                  </span>
                  <span>
                    Recebido: <code>{JSON.stringify(c.actual)}</code>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
