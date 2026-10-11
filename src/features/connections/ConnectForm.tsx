import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react';
import { presets, type PresetId } from '../../../shared/presets';
import type { Agent } from '../../../shared/schema';
import { Modal } from '../../components/ui';
import { api } from '../../lib/api';
export default function ConnectForm({
  presetId,
  onClose,
  onConnected,
}: {
  presetId: PresetId;
  onClose: () => void;
  onConnected: (agent: Agent) => void;
}) {
  const preset = presets[presetId];
  const revision = useRef(0);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [apiKey, setKey] = useState(''),
    [endpoint, setEndpoint] = useState<string>(preset.endpoint),
    [model, setModel] = useState(''),
    [models, setModels] = useState<string[]>([]),
    [name, setName] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(''),
    [tested, setTested] = useState(false),
    [response, setResponse] = useState('');
  const config = {
    name: name.trim() || `${preset.name} · ${model}`,
    version: 'Minha conexão',
    provider: preset.provider,
    endpoint,
    model,
    systemPrompt: systemPrompt.trim() || undefined,
    responseMode: 'plain',
    timeoutMs: 120000,
    apiKey: apiKey.trim() || undefined,
  };
  const changed = () => {
    revision.current++;
    setTested(false);
    setError('');
    setResponse('');
  };
  async function findModels() {
    setBusy('models');
    changed();
    const ticket = revision.current;
    try {
      const data = await api<{ models: string[] }>('/connections/models', {
        provider: preset.provider,
        endpoint,
        apiKey: apiKey.trim() || undefined,
      });
      if (ticket !== revision.current) return;
      setModels(data.models);
      setModel(data.models.includes(model) ? model : (data.models[0] ?? ''));
      if (!data.models.length)
        setError(
          preset.local
            ? 'Nenhum modelo encontrado. Instale ou carregue um modelo no aplicativo e tente novamente.'
            : 'Nenhum modelo disponível para esta chave. Confira o acesso na sua conta.',
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function test() {
    setBusy('test');
    setError('');
    setTested(false);
    const ticket = revision.current;
    try {
      const result = await api<{ response: string }>('/connections/test', config);
      if (ticket !== revision.current) return;
      setResponse(result.response);
      setTested(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function save() {
    setBusy('save');
    setError('');
    try {
      const agent = await api<Agent>('/agents', config);
      setKey('');
      onConnected(agent);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <Modal title={`Conectar ${preset.name}`} onClose={onClose}>
      <div className="form connect-form">
        <p>{preset.description}</p>
        {preset.local ? (
          <div className="setup-guide">
            <strong>Antes de começar</strong>
            {presetId === 'ollama' ? (
              <ol>
                <li>
                  <a href={preset.keyLink} target="_blank" rel="noreferrer">
                    Instale e abra o Ollama <ExternalLink size={12} />
                  </a>
                  .
                </li>
                <li>
                  Baixe um modelo no aplicativo. Pelo terminal, um exemplo é{' '}
                  <code>ollama pull llama3.2</code>.
                </li>
                <li>Deixe o Ollama aberto e clique em “Buscar modelos”.</li>
              </ol>
            ) : (
              <ol>
                <li>
                  <a href={preset.keyLink} target="_blank" rel="noreferrer">
                    Abra o LM Studio <ExternalLink size={12} />
                  </a>{' '}
                  e carregue um modelo.
                </li>
                <li>Na área de desenvolvedor, inicie o servidor local.</li>
                <li>Confirme a porta 1234 e clique em “Buscar modelos”.</li>
              </ol>
            )}
            <span>Não precisa de chave no uso local padrão.</span>
          </div>
        ) : (
          <>
            <div className="setup-guide">
              <strong>1. Pegue sua chave de API</strong>
              <p>
                Abra sua conta, crie uma chave e cole abaixo. A chave é diferente da senha de login.
              </p>
              <a className="text-button" href={preset.keyLink} target="_blank" rel="noreferrer">
                Abrir página de chaves <ExternalLink size={13} />
              </a>
              {presetId === 'openai' && (
                <p>Uma assinatura do ChatGPT não substitui créditos da API.</p>
              )}
            </div>
            <label>
              Chave de API
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => {
                  setKey(e.target.value);
                  changed();
                  setModels([]);
                  setModel('');
                }}
                placeholder="Cole sua chave aqui"
              />
            </label>
            <p className="caption">
              A chave fica apenas na memória do servidor enquanto ele estiver aberto. Não vai para o
              histórico nem para o GitHub. Depois de reiniciar o servidor, informe novamente.
            </p>
          </>
        )}
        <div className="model-header">
          <strong>{preset.local ? 'Escolha um modelo instalado' : '2. Escolha o modelo'}</strong>
          <button
            className="button secondary"
            disabled={!!busy || (!preset.local && !apiKey.trim())}
            onClick={() => void findModels()}
          >
            {busy === 'models' ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <RefreshCw size={15} />
            )}
            Buscar modelos
          </button>
        </div>
        {models.length > 0 ? (
          <label>
            Modelo
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                changed();
              }}
            >
              {models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Nome do modelo
            <input
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                changed();
              }}
              placeholder="Busque os modelos ou digite o nome exato"
            />
          </label>
        )}
        {!preset.local && (
          <p className="caption">
            Use um modelo que aceite conversas por texto. A listagem pode incluir modelos para
            outras tarefas; o teste abaixo verifica a compatibilidade.
          </p>
        )}
        <details className="connection-options">
          <summary>Nome da conexão e opções de endereço</summary>
          <label>
            Instruções para a IA (opcional)
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value);
                changed();
              }}
              placeholder="Ex.: responda de forma curta e direta."
              maxLength={12000}
            />
          </label>
          <label>
            Nome para identificar esta IA
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Ex.: ${preset.name} para atendimento`}
              maxLength={160}
            />
          </label>
          <label>
            Endereço do serviço
            <input
              type="url"
              value={endpoint}
              onChange={(e) => {
                setEndpoint(e.target.value);
                changed();
                setModels([]);
                setModel('');
                setKey('');
              }}
            />
          </label>
          <p className="caption">
            O endereço padrão já está pronto. Para Docker, use host.docker.internal. Outros
            endereços precisam estar autorizados no servidor.
          </p>
          {preset.local && (
            <label>
              Chave do servidor local (se exigida)
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => {
                  setKey(e.target.value);
                  changed();
                }}
              />
            </label>
          )}
        </details>
        <div className="setup-guide">
          <strong>{preset.local ? 'Confirme que está funcionando' : '3. Teste a conexão'}</strong>
          <p>
            Vamos enviar uma mensagem curta e mostrar a resposta.{' '}
            {preset.local
              ? 'O primeiro carregamento pode levar até 2 minutos.'
              : 'Essa chamada usa sua API e pode consumir créditos.'}
          </p>
          <button
            className="button secondary"
            disabled={!!busy || !model.trim() || (!preset.local && !apiKey.trim())}
            onClick={() => void test()}
          >
            {busy === 'test' && <LoaderCircle size={15} className="spin" />}
            {busy === 'test' ? 'Esperando a IA responder…' : 'Testar conexão'}
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {tested && (
          <div className="connection-success" role="status">
            <CheckCircle2 size={20} />
            <div>
              <strong>Conexão funcionando!</strong>
              <p>A IA respondeu: “{response.slice(0, 200)}”</p>
            </div>
          </div>
        )}
        <div className="form-actions">
          <button className="button secondary" disabled={!!busy} onClick={onClose}>
            Voltar
          </button>
          <button
            className="button primary"
            disabled={!tested || !!busy}
            onClick={() => void save()}
          >
            {busy === 'save' ? 'Salvando…' : 'Usar esta IA'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
