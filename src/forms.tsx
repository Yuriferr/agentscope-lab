import { useState, type FormEvent } from 'react';
import { ArrowRight, Plus, Upload } from 'lucide-react';
import type { Agent, Run, Suite } from '../shared/schema';
import { api } from './api';
import { Modal } from './components';

export function RunForm({
  agents,
  suites,
  initialAgentId,
  onClose,
  onCreated,
}: {
  agents: Agent[];
  suites: Suite[];
  initialAgentId?: string;
  onClose: () => void;
  onCreated: (run: Run) => void;
}) {
  const [agentId, setAgent] = useState(
    initialAgentId ?? agents.find((a) => a.id === 'demo-candidate')?.id ?? agents[0]?.id ?? '',
  );
  const [suiteId, setSuite] = useState(suites[0]?.id ?? '');
  const [name, setName] = useState(''),
    [repetitions, setRepetitions] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const agent = agents.find((a) => a.id === agentId),
    suite = suites.find((s) => s.id === suiteId);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onCreated(
        await api<Run>('/runs', {
          agentId,
          suiteId,
          name: name.trim() || `${agent?.name} · ${agent?.version}`,
          repetitions,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Nova avaliação" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <p className="subtle">
          Escolha um agente e execute a mesma bateria de testes, de forma reproduzível.
        </p>
        <label>
          Nome da execução
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Validação do novo prompt"
            maxLength={160}
          />
        </label>
        <label>
          Agente / versão
          <select value={agentId} onChange={(e) => setAgent(e.target.value)}>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.version} ({a.provider === 'demo' ? 'simulação' : a.provider})
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Suíte de testes
            <select value={suiteId} onChange={(e) => setSuite(e.target.value)}>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Repetições
            <select value={repetitions} onChange={(e) => setRepetitions(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}× por cenário
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="info-box">
          <strong>{(suite?.cases.length ?? 0) * repetitions} chamadas ao agente</strong>
          <span>
            {agent?.provider === 'demo'
              ? 'Simulação determinística local. Não utiliza LLM nem representa desempenho de modelos reais.'
              : 'O endpoint configurado receberá os prompts da suíte. Serviços externos podem cobrar por chamada.'}
          </span>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={busy || !agent || !suite}>
            {busy ? 'Iniciando…' : 'Iniciar avaliação'}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function AgentForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [provider, setProvider] = useState<'http' | 'ollama'>('http'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      await api('/agents', {
        ...values,
        provider,
        timeoutMs: Number(values.timeoutMs),
        tokenEnv: values.tokenEnv || undefined,
        systemPrompt: values.systemPrompt || undefined,
        model: values.model || undefined,
      });
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Conectar agente" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="subtle">
          Cada configuração é uma versão imutável. Cadastre uma nova versão para comparar mudanças.
        </p>
        <div className="form-grid">
          <label>
            Nome
            <input name="name" required maxLength={160} placeholder="Meu assistente" />
          </label>
          <label>
            Versão
            <input name="version" required maxLength={160} placeholder="v1.0" />
          </label>
        </div>
        <label>
          Conector
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'http' | 'ollama')}
          >
            <option value="http">Agente HTTP · contrato JSON</option>
            <option value="ollama">Ollama · modelo local</option>
          </select>
        </label>
        <label>
          Endpoint completo
          <input
            key={provider}
            name="endpoint"
            type="url"
            required
            defaultValue={
              provider === 'ollama'
                ? 'http://localhost:11434/api/chat'
                : 'http://localhost:8000/evaluate'
            }
          />
        </label>
        {provider === 'ollama' && (
          <>
            <label>
              Modelo instalado
              <input name="model" required placeholder="Ex.: llama3.2" />
            </label>
            <label>
              Instruções do sistema (opcional)
              <textarea
                name="systemPrompt"
                rows={3}
                placeholder="Em branco: usa o prompt bancário documentado no projeto."
              />
            </label>
          </>
        )}
        <div className="form-grid">
          <label>
            Timeout (ms)
            <input
              name="timeoutMs"
              type="number"
              min={100}
              max={120000}
              defaultValue={30000}
              required
            />
          </label>
          <label>
            Variável do token (opcional)
            <input name="tokenEnv" placeholder="MY_AGENT_TOKEN" pattern="[A-Z][A-Z0-9_]{0,79}" />
          </label>
        </div>
        <div className="info-box">
          <span>
            Credenciais ficam nas variáveis do servidor. Para outro host, adicione sua origem a
            AGENT_ALLOWED_ORIGINS no arquivo .env.
          </span>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            <Plus size={16} />
            {busy ? 'Salvando…' : 'Salvar agente'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function SuiteForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [source, setSource] = useState(
    JSON.stringify(
      {
        name: 'Minha suíte',
        description: 'Cenários personalizados',
        cases: [
          {
            id: 'primeiro-caso',
            name: 'Solicitação de crédito',
            category: 'Roteamento',
            prompt: 'Quero aumentar meu limite.',
            assertions: [{ type: 'route_equals', value: 'credito' }],
          },
        ],
      },
      null,
      2,
    ),
  );
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/suites', JSON.parse(source));
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Criar suíte de testes" onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <p className="subtle">
          Edite os cenários ou importe um JSON. Os critérios ficam registrados junto a cada
          execução.
        </p>
        <label className="file-button">
          <Upload size={16} /> Importar arquivo JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 2 * 1024 * 1024) {
                  setError('O arquivo deve ter no máximo 2 MB.');
                  return;
                }
                setSource(await file.text());
              }
            }}
          />
        </label>
        <label>
          Definição da suíte
          <textarea
            className="code-editor"
            rows={17}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
          />
        </label>
        <p className="caption">
          Critérios: route_equals, contains, not_contains, data_equals e max_latency. Categorias:
          Roteamento, Robustez, Segurança e Extração.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Validando…' : 'Validar e salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
