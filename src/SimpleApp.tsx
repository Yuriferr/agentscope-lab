import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Cloud,
  FlaskConical,
  History,
  Laptop,
  Link2,
  LoaderCircle,
  Play,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { Agent, Run, RunSummary, Suite } from '../shared/schema';
import { presets, type PresetId } from '../shared/presets';
import { api, date } from './api';
import { Modal } from './components';
import ConnectForm from './ConnectForm';
import SimpleSuiteForm from './SimpleSuiteForm';
import SimpleReport from './SimpleReport';
import './simple.css';
type ConnectedAgent = Agent & { needsKey?: boolean };
export default function SimpleApp() {
  const [tab, setTab] = useState<'start' | 'agents' | 'history' | 'help'>('start');
  const [agents, setAgents] = useState<ConnectedAgent[]>([]),
    [suites, setSuites] = useState<Suite[]>([]),
    [runs, setRuns] = useState<RunSummary[]>([]);
  const [agentId, setAgentId] = useState(''),
    [suiteId, setSuiteId] = useState('suite-quick'),
    [run, setRun] = useState<Run | null>(null);
  const [connect, setConnect] = useState<PresetId | null>(null),
    [custom, setCustom] = useState(false),
    [restore, setRestore] = useState<ConnectedAgent | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const [a, s, r] = await Promise.all([
      api<ConnectedAgent[]>('/agents'),
      api<Suite[]>('/suites'),
      api<RunSummary[]>('/runs'),
    ]);
    setAgents(a);
    setSuites(s);
    setRuns(r);
    setLoaded(true);
  }, []);
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    if (run?.status !== 'running') return;
    let active = true;
    const timer = setInterval(() => {
      void api<Run>(`/runs/${run.id}`)
        .then((next) => {
          if (active) {
            setRun(next);
            if (next.status !== 'running') void refresh().catch((e) => setError(e.message));
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 700);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [run?.id, run?.status, refresh]);
  const agent = agents.find((a) => a.id === agentId),
    suite = suites.find((s) => s.id === suiteId);
  const textSuites = suites.filter((s) =>
    s.cases.every((c) =>
      c.assertions.every((a) =>
        ['contains', 'not_contains', 'response_equals', 'max_latency'].includes(a.type),
      ),
    ),
  );
  const navigate = (target: typeof tab) => {
    requestId.current++;
    setTab(target);
    setRun(null);
    setError('');
    void refresh().catch((e) => setError(e.message));
  };
  const choose = (a: ConnectedAgent) => {
    if (a.needsKey) {
      setRestore(a);
      return;
    }
    setAgentId(a.id);
    setTab('start');
    setRun(null);
  };
  async function start() {
    if (!agent || !suite) return;
    setBusy(true);
    setError('');
    const ticket = ++requestId.current;
    try {
      const result = await api<Run>('/runs', {
        agentId: agent.id,
        suiteId: suite.id,
        name: `${agent.name} · ${suite.name}`.slice(0, 160),
        repetitions: 1,
      });
      if (ticket === requestId.current) setRun(result);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    setError('');
    const ticket = ++requestId.current;
    try {
      const result = await api<Run>(`/runs/${id}`);
      if (ticket === requestId.current) setRun(result);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const picker = (
    <div className="provider-grid">
      {Object.entries(presets).map(([id, p]) => (
        <button key={id} className="provider-card" onClick={() => setConnect(id as PresetId)}>
          <span className={`provider-mark ${id}`}>
            {p.local ? <Laptop size={23} /> : <Cloud size={23} />}
          </span>
          <strong>{p.name}</strong>
          <span>{p.local ? 'No meu computador' : 'Com chave de API'}</span>
          <ChevronRight size={17} />
        </button>
      ))}
    </div>
  );
  return (
    <div className="simple-shell">
      <header className="simple-header">
        <a className="simple-brand" href="#" onClick={() => navigate('start')}>
          <span>
            <FlaskConical size={21} />
          </span>
          AgentScope <small>lab</small>
        </a>
        <nav aria-label="Navegação principal">
          {[
            ['start', 'Começar'],
            ['agents', 'Minhas IAs'],
            ['history', 'Resultados'],
            ['help', 'Como usar'],
          ].map(([id, label]) => (
            <button
              className={tab === id && !run ? 'selected' : ''}
              key={id}
              onClick={() => navigate(id as typeof tab)}
            >
              {label}
            </button>
          ))}
        </nav>
        <span className="simple-local">
          <i />
          No seu computador
        </span>
      </header>
      <main className="simple-main">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!loaded ? (
          <div className="empty">
            <p>{error ? 'Não foi possível abrir o laboratório.' : 'Abrindo seu laboratório…'}</p>
            <button
              className="button secondary"
              onClick={() =>
                void refresh()
                  .then(() => setError(''))
                  .catch((e) => setError(e.message))
              }
            >
              Tentar novamente
            </button>
          </div>
        ) : run ? (
          <SimpleReport
            run={run}
            onBack={() => {
              setRun(null);
              void refresh().catch((e) => setError(e.message));
            }}
            onCancel={() =>
              void api(`/runs/${run.id}/cancel`, {}).catch((e) => setError(e.message))
            }
          />
        ) : tab === 'start' ? (
          <>
            <div className="simple-intro">
              <span className="simple-kicker">
                <Sparkles size={14} />
                UM JEITO SIMPLES DE TESTAR IA
              </span>
              <h1>
                Entenda sua IA.
                <br />
                <span>Sem complicação.</span>
              </h1>
              <p>
                Faça perguntas, confira as respostas e descubra
                <br className="desktop-break" /> o que merece atenção. Você não precisa programar.
              </p>
            </div>
            <div className="journey" aria-label="Etapas do teste">
              <span className={agent ? 'done' : 'current'}>
                <b>{agent ? <Check size={16} /> : '1'}</b>Escolha sua IA
              </span>
              <i />
              <span className={agent ? 'current' : ''}>
                <b>2</b>Escolha o teste
              </span>
              <i />
              <span>
                <b>3</b>Entenda o resultado
              </span>
            </div>
            <div className="simple-workspace">
              <section className="start-card">
                <div className="step-heading">
                  <span>{agent ? '02' : '01'}</span>
                  <div>
                    <h2>
                      {agent ? 'O que você quer testar?' : 'Qual IA você quer conhecer melhor?'}
                    </h2>
                    <p>
                      {agent
                        ? 'Comece com perguntas prontas ou escreva as suas.'
                        : 'Escolha uma opção. Vamos ajudar você a conectar.'}
                    </p>
                  </div>
                </div>
                {!agent ? (
                  <>
                    {picker}
                    <div className="demo-start">
                      <div>
                        <strong>Quer ver como funciona primeiro?</strong>
                        <p>Explore um exemplo pronto. Sem conta, sem chave.</p>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => choose(agents.find((a) => a.id === 'demo-baseline')!)}
                      >
                        <Play size={14} />
                        Experimentar exemplo
                      </button>
                    </div>
                    {agents.some((a) => a.provider !== 'demo') && (
                      <label className="saved-agent-select">
                        Ou escolha uma IA já salva
                        <select
                          value=""
                          onChange={(e) => choose(agents.find((a) => a.id === e.target.value)!)}
                        >
                          <option value="">Escolha sua conexão</option>
                          {agents
                            .filter((a) => a.provider !== 'demo')
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                                {a.needsKey ? ' · informe a chave novamente' : ''}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                  </>
                ) : (
                  <>
                    <div className="chosen-agent">
                      <span>
                        <Link2 size={16} />
                        {agent.name}
                        {agent.provider === 'demo' ? ' · exemplo simulado' : ''}
                      </span>
                      <button className="text-button" onClick={() => setAgentId('')}>
                        Trocar IA
                      </button>
                    </div>
                    <div className="test-options">
                      {textSuites.map((s) => (
                        <label
                          key={s.id}
                          className={`test-option ${s.id === suiteId ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="suite"
                            checked={s.id === suiteId}
                            onChange={() => setSuiteId(s.id)}
                          />
                          <div>
                            <strong>{s.name}</strong>
                            <p>
                              {s.id === 'suite-quick'
                                ? 'Respostas diretas, contas simples e instruções. Um bom primeiro passo.'
                                : s.description}
                            </p>
                            <span>
                              {s.cases.length} pergunta{s.cases.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          {s.id === 'suite-quick' && <small>PARA COMEÇAR</small>}
                        </label>
                      ))}
                    </div>
                    <button className="new-question-button" onClick={() => setCustom(true)}>
                      <Plus size={18} />
                      Criar teste com minhas perguntas
                      <ArrowRight size={16} />
                    </button>
                    {suite && (
                      <details className="preview-questions">
                        <summary>Ver as {suite.cases.length} perguntas antes de começar</summary>
                        <ol>
                          {suite.cases.map((c) => (
                            <li key={c.id}>{c.prompt}</li>
                          ))}
                        </ol>
                      </details>
                    )}
                    <div className="start-action">
                      <p>
                        {agent.provider === 'demo'
                          ? 'Este exemplo não usa uma IA real.'
                          : agent.provider === 'ollama' ||
                              agent.endpoint?.includes('localhost') ||
                              agent.endpoint?.includes('127.0.0.1')
                            ? `${suite?.cases.length ?? 0} perguntas enviadas ao serviço local.`
                            : `${suite?.cases.length ?? 0} chamadas à sua API. Pode consumir créditos.`}
                      </p>
                      <button
                        className="button primary"
                        disabled={busy || !suite || agent.needsKey}
                        onClick={() => void start()}
                      >
                        {busy ? <LoaderCircle size={17} className="spin" /> : <Play size={17} />}
                        {busy ? 'Iniciando…' : 'Começar teste'}
                      </button>
                    </div>
                  </>
                )}
              </section>
              <aside className="simple-aside">
                <span className="aside-kicker">O QUE VOCÊ VAI DESCOBRIR</span>
                <h2>
                  Mais clareza.
                  <br />
                  Menos números soltos.
                </h2>
                <div className="example-answer">
                  <span>
                    <Check size={14} />
                    RESPONDEU COMO ESPERADO
                  </span>
                  <p>“Qual é a capital do Brasil?”</p>
                  <strong>Brasília</strong>
                  <small>A resposta corresponde ao que o teste esperava.</small>
                </div>
                <ul>
                  <li>
                    <Check size={16} />
                    <span>Veja a pergunta e a resposta lado a lado.</span>
                  </li>
                  <li>
                    <Check size={16} />
                    <span>Entenda o motivo de cada resultado.</span>
                  </li>
                  <li>
                    <Check size={16} />
                    <span>Saiba o que conferir ou ajustar depois.</span>
                  </li>
                </ul>
                <p className="aside-note">
                  Exemplo ilustrativo. Seus resultados aparecem depois que você iniciar um teste.
                </p>
              </aside>
            </div>
          </>
        ) : tab === 'agents' ? (
          <>
            <div className="simple-page-title">
              <span className="simple-kicker">SUAS CONEXÕES</span>
              <h1>Minhas IAs</h1>
              <p>Escolha uma conexão salva ou adicione outra abaixo.</p>
            </div>
            <div className="saved-agents">
              {agents.map((a) => (
                <article key={a.id}>
                  <span className="provider-mark">
                    {a.provider === 'demo' ? <FlaskConical size={22} /> : <Link2 size={22} />}
                  </span>
                  <div>
                    <h2>{a.name}</h2>
                    <p>
                      {a.model ?? a.version} ·{' '}
                      {a.provider === 'demo'
                        ? 'Simulação, sem IA real'
                        : a.needsKey
                          ? 'Informe a chave novamente'
                          : 'Conexão salva'}
                    </p>
                  </div>
                  <button className="button secondary" onClick={() => choose(a)}>
                    {a.needsKey ? 'Informar chave' : 'Usar esta IA'}
                    <ArrowRight size={15} />
                  </button>
                </article>
              ))}
            </div>
            <h2 className="connect-title">Conectar outra IA</h2>
            {picker}
            <p className="simple-notice">
              Tem um agente HTTP próprio? A integração com contrato JSON continua em{' '}
              <a href="#advanced">Ferramentas avançadas → Agentes</a>.
            </p>
          </>
        ) : tab === 'history' ? (
          <>
            <div className="simple-page-title">
              <span className="simple-kicker">SEU HISTÓRICO</span>
              <h1>Resultados para consultar de novo.</h1>
              <p>Abra um teste para rever as respostas e o que precisa de atenção.</p>
            </div>
            {runs.length ? (
              <div className="simple-history">
                {runs.map((r) => (
                  <button key={r.id} onClick={() => void open(r.id)}>
                    <span className="history-icon">
                      <History size={22} />
                    </span>
                    <div>
                      <strong>{r.agent.name}</strong>
                      <p>
                        {r.suite.name} · {date(r.createdAt)}
                      </p>
                      <span>
                        {r.status === 'completed'
                          ? `${r.metrics.passed} de ${r.total} respostas como esperado`
                          : r.status === 'running'
                            ? `Em andamento · ${r.metrics.completed} de ${r.total}`
                            : 'Teste incompleto'}
                        {r.agent.provider === 'demo' ? ' · simulação' : ''}
                      </span>
                    </div>
                    <ChevronRight size={19} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="simple-empty">
                <h2>Seu primeiro resultado começa com uma pergunta.</h2>
                <button className="button primary" onClick={() => navigate('start')}>
                  Começar meu primeiro teste
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <Help />
        )}
        <footer className="simple-footer">
          <span>AgentScope Lab · por Yuri Fernandes</span>
          <a href="#advanced">
            Ferramentas avançadas
            <ArrowRight size={13} />
          </a>
        </footer>
      </main>
      {connect && (
        <ConnectForm
          presetId={connect}
          onClose={() => setConnect(null)}
          onConnected={(a) => {
            setConnect(null);
            setAgents((items) => [a, ...items]);
            choose(a);
            void refresh().catch((e) => setError(e.message));
          }}
        />
      )}
      {custom && (
        <SimpleSuiteForm
          onClose={() => setCustom(false)}
          onSaved={(s) => {
            setCustom(false);
            setSuites((items) => [s, ...items]);
            setSuiteId(s.id);
          }}
        />
      )}
      {restore && (
        <RestoreKey
          agent={restore}
          onClose={() => setRestore(null)}
          onSaved={() => {
            const a = { ...restore, needsKey: false };
            setRestore(null);
            choose(a);
            void refresh().catch((e) => setError(e.message));
          }}
        />
      )}
    </div>
  );
}
function RestoreKey({
  agent,
  onClose,
  onSaved,
}: {
  agent: Agent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal title={`Reconectar ${agent.name}`} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api(`/agents/${agent.id}/key`, { apiKey: key });
            setKey('');
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>A chave não é salva no disco. Informe novamente após reiniciar o servidor.</p>
        <label>
          Chave de API
          <input
            type="password"
            autoComplete="off"
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>
        <p className="caption">
          Enviaremos uma mensagem curta para confirmar a conexão. Ela pode consumir créditos da API.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? 'Testando conexão…' : 'Testar e reconectar'}
        </button>
      </form>
    </Modal>
  );
}
function Help() {
  return (
    <>
      <div className="simple-page-title">
        <span className="simple-kicker">PASSO A PASSO</span>
        <h1>Do primeiro clique ao resultado.</h1>
        <p>Comece pelo exemplo pronto ou conecte uma IA que você já usa.</p>
      </div>
      <div className="simple-help">
        <article>
          <span>01</span>
          <h2>Conecte uma IA</h2>
          <p>
            <b>OpenAI ou Gemini:</b> abra a página de chaves pelo link do formulário, cole sua
            chave, busque os modelos e clique em Testar conexão. Só salve quando aparecer a
            resposta.
          </p>
          <p>
            <b>Ollama:</b> instale e abra o aplicativo, baixe um modelo e use Buscar modelos. O
            endereço padrão já vem preenchido.
          </p>
          <p>
            <b>LM Studio:</b> carregue um modelo e ative o servidor local na área de desenvolvedor.
            Depois busque os modelos e teste a conexão.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Escolha o que perguntar</h2>
          <p>O Teste rápido tem seis perguntas prontas. Você pode ler todas antes de começar.</p>
          <p>
            Em Criar teste com minhas perguntas, escreva uma pergunta e diga qual palavra deve
            aparecer, não pode aparecer ou qual deve ser a resposta exata. Não precisa escrever
            código.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Entenda o resultado</h2>
          <p>
            <b>Como esperado:</b> a resposta atendeu à regra que você escolheu.
          </p>
          <p>
            <b>Precisa de atenção:</b> o conteúdo ou o formato foi diferente do esperado. Abra para
            comparar os textos e decidir o que ajustar.
          </p>
          <p>
            <b>Não avaliado:</b> houve uma falha de conexão ou de formato. Confira a configuração e
            tente novamente.
          </p>
        </article>
      </div>
      <div className="simple-notice">
        <strong>Minha IA é boa ou ruim?</strong>
        <p>
          Este teste não dá uma nota geral à IA. Ele mostra como ela se saiu em perguntas
          específicas. Uma checagem de palavras também pode reprovar uma resposta aceitável: revise
          os casos e ajuste suas regras quando necessário.
        </p>
      </div>
    </>
  );
}
