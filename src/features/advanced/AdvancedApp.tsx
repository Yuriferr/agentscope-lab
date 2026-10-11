import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  ChevronRight,
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
} from 'lucide-react';
import type { Agent, Run, RunSummary, Suite } from '../../../shared/schema';
import { api, ms, pct } from '../../lib/api';
import { Badge, Empty, RunTable } from '../../components/ui';
import { AgentForm, RunForm, SuiteForm } from './forms';
import { Stat } from './views/Stat';
import { RunDetail } from './views/RunDetail';
import { CompareView } from './views/CompareView';
import { SuiteView } from './views/SuiteView';
import { Guide } from './views/Guide';

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
            <span className="mono">v1.2.0</span>
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
                        {(
                          recent?.metrics.categories.map((c) => c.name) ?? [
                            'Roteamento',
                            'Robustez',
                            'Segurança',
                            'Extração',
                          ]
                        ).map((name, i) => {
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
