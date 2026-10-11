import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FlaskConical,
  GitCompareArrows,
  Github,
  Layers3,
  LayoutDashboard,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Terminal,
  X,
} from 'lucide-react';
import type { Agent, Comparison, Result, Run, RunSummary, Suite } from '../shared/schema';
import { api, date, download, ms, pct } from './api';
import { Badge, Empty, Modal, Pass, RunTable, Status } from './components';
import { AgentForm, RunForm, SuiteForm } from './forms';

type View = 'overview' | 'runs' | 'compare' | 'suites' | 'agents' | 'guide';
const nav = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'runs', label: 'Execuções', icon: Activity },
  { id: 'compare', label: 'Comparar versões', icon: GitCompareArrows },
  { id: 'suites', label: 'Suítes de testes', icon: Layers3 },
  { id: 'agents', label: 'Agentes', icon: Bot },
] as const;
export default function App() {
  const [view, setView] = useState<View>('overview'),
    [agents, setAgents] = useState<Agent[]>([]),
    [suites, setSuites] = useState<Suite[]>([]),
    [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null),
    [modal, setModal] = useState<'run' | 'agent' | 'suite' | null>(null),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false),
    [search, setSearch] = useState('');
  const [initialAgentId, setInitialAgentId] = useState<string | undefined>();
  const refresh = useCallback(async () => {
    try {
      const [a, s, r] = await Promise.all([
        api<Agent[]>('/agents'),
        api<Suite[]>('/suites'),
        api<RunSummary[]>('/runs'),
      ]);
      setAgents(a);
      setSuites(s);
      setRuns(r);
      setError('');
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!runs.some((r) => r.status === 'running')) return;
    const timer = setInterval(() => void refresh(), 1000);
    return () => clearInterval(timer);
  }, [runs, refresh]);
  useEffect(() => {
    if (selectedRun?.status !== 'running') return;
    const timer = setInterval(() => {
      void api<Run>(`/runs/${selectedRun.id}`)
        .then(setSelectedRun)
        .catch((e) => setError(e.message));
    }, 700);
    return () => clearInterval(timer);
  }, [selectedRun?.id, selectedRun?.status]);
  const openRun = async (id: string) => {
    try {
      setSelectedRun(await api<Run>(`/runs/${id}`));
      setView('runs');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const navigate = (next: View) => {
    setView(next);
    setSelectedRun(null);
    setSearch('');
  };
  const recent = runs.find((r) => r.status === 'completed');
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('overview');
          }}
        >
          <div className="brand-symbol">
            <FlaskConical size={21} />
          </div>
          <span>
            AgentScope<span className="brand-lab">LAB</span>
          </span>
        </a>
        <div className="workspace">
          <div className="workspace-avatar">YF</div>
          <div>
            <strong>Yuri Fernandes</strong>
            <span>Laboratório de agentes</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Menu principal">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'runs' && runs.length > 0 && <small>{runs.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="status-light" />
            <strong>Seu laboratório, local.</strong>
            <p>
              Dados sob seu controle.
              <br />
              Experimentos reproduzíveis.
            </p>
            <span className="mono">v1.0.0</span>
          </div>
          <button
            className={`nav-item ${view === 'guide' ? 'active' : ''}`}
            onClick={() => navigate('guide')}
          >
            <BookOpen size={17} />
            Guia do laboratório
          </button>
          <a
            className="nav-item"
            href="https://github.com/Yuriferr/agentscope-lab"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={17} />
            Ver no GitHub
            <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{view === 'guide' ? 'Guia' : nav.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-badge">
              <span className="status-light" />
              Ambiente local
            </span>
            <span className="avatar">YF</span>
          </div>
        </header>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button className="text-button" onClick={() => void refresh()}>
                Tentar novamente
              </button>
            </div>
          )}
          {!loaded ? (
            <Empty
              title={error ? 'Não foi possível conectar' : 'Preparando seu laboratório…'}
              text="A API local mantém seus agentes e resultados."
            />
          ) : selectedRun ? (
            <RunDetail
              run={selectedRun}
              onBack={() => setSelectedRun(null)}
              onCancel={async () => {
                await api(`/runs/${selectedRun.id}/cancel`, {});
                await refresh();
              }}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />
                    AGENT EVALUATION LAB
                  </div>
                  <h1>
                    {
                      {
                        overview: 'Confiança se constrói com testes.',
                        runs: 'Cada execução conta uma história.',
                        compare: 'Evolução, colocada à prova.',
                        suites: 'Boas perguntas. Testes melhores.',
                        agents: 'Seus agentes, sob a mesma lente.',
                        guide: 'Do primeiro teste à evidência.',
                      }[view]
                    }
                  </h1>
                  <p>
                    {
                      {
                        overview:
                          'Avalie o comportamento dos seus agentes. Encontre falhas. Evolua com evidências.',
                        runs: 'Acompanhe resultados, investigue falhas e reproduza seus experimentos.',
                        compare: 'Compare os mesmos cenários e encontre melhorias e regressões.',
                        suites:
                          'Cenários organizados e critérios explícitos para cada comportamento.',
                        agents: 'Conecte endpoints HTTP, modelos locais ou explore a demonstração.',
                        guide:
                          'Um laboratório transparente, com critérios que você consegue inspecionar.',
                      }[view]
                    }
                  </p>
                </div>
                {view !== 'guide' && (
                  <button
                    className="button primary"
                    onClick={() =>
                      setModal(view === 'agents' ? 'agent' : view === 'suites' ? 'suite' : 'run')
                    }
                  >
                    <Plus size={17} />
                    {view === 'agents'
                      ? 'Conectar agente'
                      : view === 'suites'
                        ? 'Nova suíte'
                        : 'Nova avaliação'}
                  </button>
                )}
              </div>
              {view === 'overview' && (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <Badge tone="green">
                        <Sparkles size={12} />
                        DO PROMPT À EVIDÊNCIA
                      </Badge>
                      <h2>
                        Seu agente está pronto
                        <br />
                        para o inesperado?
                      </h2>
                      <p>
                        Erros de digitação, pedidos ambíguos, instruções maliciosas.
                        <br className="desktop-break" /> Descubra como ele responde antes de
                        colocá-lo em produção.
                      </p>
                      <button className="button lime" onClick={() => setModal('run')}>
                        Executar uma avaliação
                        <ArrowRight size={16} />
                      </button>
                      <span className="hero-foot">
                        16 cenários iniciais · 4 dimensões de avaliação
                      </span>
                    </div>
                    <div className="hero-visual" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="orbit orbit-three" />
                      <div className="orbital-label label-one">
                        <ShieldCheck size={15} /> Segurança
                      </div>
                      <div className="orbital-label label-two">
                        <Activity size={15} /> Robustez
                      </div>
                      <div className="orbital-label label-three">
                        <GitCompareArrows size={15} /> Roteamento
                      </div>
                      <div className="visual-core">
                        <FlaskConical size={48} strokeWidth={1.3} />
                        <span>
                          AGENT
                          <br />
                          UNDER TEST
                        </span>
                      </div>
                      <span className="orbit-point p1" />
                      <span className="orbit-point p2" />
                    </div>
                  </section>
                  <div className="section-line">
                    <h2>Última avaliação concluída</h2>
                    {recent && (
                      <Badge>
                        {recent.agent.provider === 'demo'
                          ? 'Simulação determinística'
                          : recent.agent.provider}
                      </Badge>
                    )}
                  </div>
                  <div className="stats-grid">
                    <Stat
                      label="Taxa de aprovação"
                      value={recent ? pct(recent.metrics.passRate) : '—'}
                      note={
                        recent
                          ? `${recent.metrics.passed} de ${recent.total} testes aprovados`
                          : 'Execute sua primeira avaliação'
                      }
                      icon={<ShieldCheck size={18} />}
                    />
                    <Stat
                      label="Latência média"
                      value={recent ? ms(recent.metrics.meanLatency) : '—'}
                      note={
                        recent
                          ? `P95: ${ms(recent.metrics.p95Latency)}`
                          : 'Tempo real de cada chamada'
                      }
                      icon={<Clock3 size={18} />}
                    />
                    <Stat
                      label="Cenários reprovados"
                      value={recent ? String(recent.metrics.failed) : '—'}
                      note={
                        recent
                          ? `${recent.metrics.errors} erros de execução`
                          : 'Falhas de critérios ou conexão'
                      }
                      icon={<FlaskConical size={18} />}
                    />
                    <Stat
                      label="Experimentos realizados"
                      value={String(runs.filter((r) => r.status === 'completed').length)}
                      note={`${agents.length} agentes · ${suites.length} suítes`}
                      icon={<BarChart3 size={18} />}
                    />
                  </div>
                  <div className="overview-bottom">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Resultados por dimensão</h2>
                          <p>{recent ? recent.name : 'O que será avaliado'}</p>
                        </div>
                        <span className="icon-muted">
                          <Layers3 size={19} />
                        </span>
                      </div>
                      <div className="dimensions">
                        {['Roteamento', 'Robustez', 'Segurança', 'Extração'].map((name, i) => {
                          const metric = recent?.metrics.categories.find((c) => c.name === name);
                          return (
                            <div className="dimension" key={name}>
                              <div>
                                <span className={`dimension-dot d${i}`} />
                                <strong>{name}</strong>
                                <span>{metric ? pct(metric.rate) : 'Sem resultados'}</span>
                              </div>
                              <div className="track">
                                <i style={{ width: `${metric?.rate ?? 0}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                    <section className="panel experiment-tip">
                      <span className="tip-icon">
                        <GitCompareArrows size={23} />
                      </span>
                      <span className="eyebrow">PRÓXIMO EXPERIMENTO</span>
                      <h2>
                        Uma mudança no prompt.
                        <br />
                        Qual foi o impacto?
                      </h2>
                      <p>
                        Execute a baseline e o candidato com a mesma suíte. Veja exatamente o que
                        melhorou e o que regrediu.
                      </p>
                      <button className="text-button" onClick={() => navigate('compare')}>
                        Comparar versões
                        <ArrowRight size={16} />
                      </button>
                    </section>
                  </div>
                  <section className="panel recent-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Execuções recentes</h2>
                        <p>Seu histórico de experimentos, em um só lugar.</p>
                      </div>
                      <button className="text-button" onClick={() => navigate('runs')}>
                        Ver todas
                        <ArrowRight size={15} />
                      </button>
                    </div>
                    {runs.length ? (
                      <RunTable runs={runs.slice(0, 5)} onSelect={(id) => void openRun(id)} />
                    ) : (
                      <Empty
                        title="Seu primeiro experimento começa aqui"
                        text="Os resultados aparecerão assim que você executar uma avaliação."
                        action={
                          <button className="button secondary" onClick={() => setModal('run')}>
                            <Play size={15} />
                            Começar avaliação
                          </button>
                        }
                      />
                    )}
                  </section>
                </>
              )}
              {view === 'runs' && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      Histórico <span className="count">{runs.length}</span>
                    </h2>
                    <label className="search">
                      <Search size={16} />
                      <input
                        aria-label="Buscar execuções"
                        placeholder="Buscar execução ou agente"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  {runs.filter((r) =>
                    `${r.name} ${r.agent.name} ${r.agent.version}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  ).length ? (
                    <RunTable
                      runs={runs.filter((r) =>
                        `${r.name} ${r.agent.name} ${r.agent.version}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )}
                      onSelect={(id) => void openRun(id)}
                    />
                  ) : (
                    <Empty
                      title="Nenhuma execução encontrada"
                      text="Inicie uma avaliação ou ajuste a busca."
                    />
                  )}
                </section>
              )}
              {view === 'compare' && (
                <CompareView
                  runs={runs}
                  onOpen={(id) => void openRun(id)}
                  onNew={() => setModal('run')}
                />
              )}
              {view === 'suites' && <SuiteView suites={suites} />}
              {view === 'agents' && (
                <div className="cards-grid">
                  {agents.map((a) => (
                    <section className="panel agent-card" key={a.id}>
                      <div className="card-top">
                        <span className="agent-icon">
                          <Bot size={23} />
                        </span>
                        <Badge tone={a.provider === 'demo' ? 'amber' : 'green'}>
                          {a.provider === 'demo'
                            ? 'Simulação'
                            : a.provider === 'ollama'
                              ? 'Ollama'
                              : 'HTTP'}
                        </Badge>
                      </div>
                      <h2>{a.name}</h2>
                      <p>{a.version}</p>
                      <dl>
                        <div>
                          <dt>Provedor</dt>
                          <dd>
                            {a.provider === 'demo'
                              ? 'Fixture determinística'
                              : (a.model ?? 'Endpoint próprio')}
                          </dd>
                        </div>
                        <div>
                          <dt>Timeout</dt>
                          <dd>{ms(a.timeoutMs)}</dd>
                        </div>
                      </dl>
                      {a.endpoint && <p className="endpoint mono">{a.endpoint}</p>}
                      <div className="card-footer">
                        <span className="subtle">
                          {a.provider === 'demo'
                            ? 'Não utiliza um modelo de IA'
                            : 'Pronto para uma avaliação'}
                        </span>
                        <button
                          className="icon-button"
                          aria-label={`Avaliar ${a.name} ${a.version}`}
                          onClick={() => {
                            setInitialAgentId(a.id);
                            setModal('run');
                          }}
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      </div>
                    </section>
                  ))}
                </div>
              )}
              {view === 'guide' && <Guide />}
            </>
          )}
          <footer className="page-footer">
            <span>
              AgentScope Lab <span className="footer-dot">/</span> Construído para experimentar com
              rigor.
            </span>
            <span>Por Yuri Fernandes</span>
          </footer>
        </main>
      </div>
      {modal === 'run' && (
        <RunForm
          agents={agents}
          suites={suites}
          initialAgentId={initialAgentId}
          onClose={() => {
            setModal(null);
            setInitialAgentId(undefined);
          }}
          onCreated={(run) => {
            setModal(null);
            setInitialAgentId(undefined);
            setSelectedRun(run);
            setView('runs');
            void refresh();
          }}
        />
      )}
      {modal === 'agent' && (
        <AgentForm
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null);
            void refresh();
          }}
        />
      )}
      {modal === 'suite' && (
        <SuiteForm
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="stat">
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </section>
  );
}
function RunDetail({
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
function CompareView({
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
function SuiteView({ suites }: { suites: Suite[] }) {
  const [selected, setSelected] = useState(suites[0]?.id ?? '');
  const suite = suites.find((s) => s.id === selected) ?? suites[0];
  return (
    <>
      <div className="suite-tabs">
        {suites.map((s) => (
          <button
            key={s.id}
            className={suite?.id === s.id ? 'selected' : ''}
            onClick={() => setSelected(s.id)}
          >
            <Layers3 size={16} />
            {s.name}
            <span>{s.cases.length}</span>
          </button>
        ))}
      </div>
      {suite && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{suite.name}</h2>
              <p>{suite.description}</p>
            </div>
            <button
              className="button secondary"
              onClick={() =>
                download(`${suite.id}.json`, {
                  name: suite.name,
                  description: suite.description,
                  cases: suite.cases,
                })
              }
            >
              <ArrowDownToLine size={16} />
              Exportar JSON
            </button>
          </div>
          <div className="scenario-list">
            {suite.cases.map((c, i) => (
              <details className="scenario" key={c.id}>
                <summary>
                  <span className="scenario-number">{String(i + 1).padStart(2, '0')}</span>
                  <strong>{c.name}</strong>
                  <Badge>{c.category}</Badge>
                  <span className="caption">{c.assertions.length} critérios</span>
                  <ChevronRight size={16} />
                </summary>
                <div className="scenario-body">
                  <blockquote>{c.prompt}</blockquote>
                  <pre>{JSON.stringify(c.assertions, null, 2)}</pre>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
function Guide() {
  return (
    <div className="guide-grid">
      <section className="panel guide">
        <div className="guide-icon">
          <FlaskConical size={24} />
        </div>
        <h2>Seu primeiro experimento</h2>
        <ol>
          <li>
            Execute <strong>Banco Ágil v1 · baseline</strong> com a suíte inicial.
          </li>
          <li>
            Repita com <strong>Banco Ágil v2 · candidato</strong> e a mesma suíte.
          </li>
          <li>
            Abra <strong>Comparar versões</strong> e investigue cada melhoria.
          </li>
          <li>Conecte um agente real e crie seus próprios cenários.</li>
        </ol>
        <p>
          Os dois agentes demonstrativos são programas de regras simples. Eles ajudam a entender o
          laboratório e não comprovam a qualidade de nenhum LLM.
        </p>
      </section>
      <section className="panel guide">
        <div className="guide-icon">
          <Terminal size={24} />
        </div>
        <h2>Contrato de integração HTTP</h2>
        <p>O laboratório envia um POST com uma sessão nova por cenário:</p>
        <pre>
          {'{ "prompt": "Quero aumentar meu limite",\n  "sessionId": "uuid-independente" }'}
        </pre>
        <p>Seu endpoint deve responder:</p>
        <pre>
          {
            '{ "response": "Vamos analisar sua solicitação.",\n  "route": "credito",\n  "data": {} }'
          }
        </pre>
        <p>
          Rota e dados são opcionais no contrato, mas necessários quando a suíte verifica esses
          campos.
        </p>
      </section>
      <section className="panel guide">
        <div className="guide-icon">
          <BarChart3 size={24} />
        </div>
        <h2>Métricas transparentes</h2>
        <p>
          <strong>Aprovação:</strong> um cenário passa quando todos os seus critérios passam. Erros
          de conexão, JSON ou timeout reprovam o cenário.
        </p>
        <p>
          <strong>Critérios atendidos:</strong> verificações aprovadas divididas por todas as
          verificações executadas.
        </p>
        <p>
          <strong>Latência:</strong> tempo de parede por chamada, incluindo leitura da resposta. P95
          usa o percentil por posto mais próximo.
        </p>
        <p>
          Execuções parciais mostram apenas chamadas concluídas. Cancelamentos e interrupções ficam
          fora das comparações.
        </p>
      </section>
      <section className="panel guide">
        <div className="guide-icon">
          <CircleHelp size={24} />
        </div>
        <h2>O que os testes demonstram</h2>
        <p>
          Os critérios são determinísticos. Procurar uma palavra não garante correção semântica, e
          passar nesta suíte não certifica segurança.
        </p>
        <p>
          O cenário de indisponibilidade informa um timeout no prompt. Para testar falhas reais de
          ferramentas, seu endpoint precisa reproduzir essas falhas em um ambiente controlado.
        </p>
        <p>
          As execuções são sequenciais. Este laboratório avalia respostas por cenário; não é um
          teste de carga nem um benchmark estatístico.
        </p>
        <p>
          Use dados sintéticos: prompts e respostas ficam no histórico local e nos relatórios
          exportados.
        </p>
      </section>
    </div>
  );
}
