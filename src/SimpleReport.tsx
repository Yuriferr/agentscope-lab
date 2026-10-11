import { useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Download, LoaderCircle, X } from 'lucide-react';
import type { Check as Criterion, Result, Run } from '../shared/schema';
import { ms } from './api';
function expected(check: Criterion) {
  if (check.type === 'not_contains')
    return `Não incluir “${String(check.expected).replace('Ausência de: ', '')}”`;
  if (check.type === 'max_latency') return `Responder em até ${ms(Number(check.expected))}`;
  if (check.type === 'route_equals') return `Encaminhar para ${check.expected}`;
  if (check.type === 'contains') return `Incluir “${check.expected}” na resposta`;
  return typeof check.expected === 'object'
    ? 'Receber uma resposta válida da IA'
    : String(check.expected);
}
export function explanation(result: Result) {
  if (result.error)
    return {
      title: 'Não foi possível avaliar a resposta',
      detail: result.error,
      next: 'Confira a conexão em Minhas IAs e tente novamente. Isso não significa que a IA errou a pergunta.',
    };
  if (result.passed)
    return {
      title: 'Respondeu como esperado',
      detail: 'A resposta atendeu às regras desta pergunta.',
      next: '',
    };
  const failed = result.checks.filter((c) => !c.passed);
  if (failed.some((c) => c.type === 'response_equals'))
    return {
      title: 'A resposta foi diferente do esperado',
      detail:
        'Este teste pede uma resposta específica. Texto extra ou outro conteúdo também contam como diferença.',
      next: 'Compare a resposta recebida com a esperada. Se a resposta fizer sentido, ajuste o teste; se não, tente instruções mais claras para a IA.',
    };
  if (failed.some((c) => c.type === 'max_latency'))
    return {
      title: 'A resposta demorou mais que o limite',
      detail: 'A IA não respondeu dentro do tempo definido para este teste.',
      next: 'Tente novamente ou ajuste o tempo esperado, considerando o modelo e seu computador.',
    };
  return {
    title: 'Uma regra do teste não foi atendida',
    detail: 'Compare a resposta com o que o teste esperava.',
    next: 'Revise a pergunta e a regra. Um teste isolado não determina a qualidade geral da IA.',
  };
}
export default function SimpleReport({
  run,
  onBack,
  onCancel,
}: {
  run: Run;
  onBack: () => void;
  onCancel: () => void;
}) {
  const [onlyIssues, setOnlyIssues] = useState(false);
  const running = run.status === 'running',
    incomplete = run.status !== 'completed';
  const issues = run.metrics.failed - run.metrics.errors;
  return (
    <section className="simple-report">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={16} />
        Voltar
      </button>
      <div className="report-title">
        <div>
          <div className="eyebrow">RESULTADO DO TESTE</div>
          <h1>
            {running
              ? 'Sua IA está respondendo…'
              : incomplete
                ? 'O teste não foi concluído'
                : 'Agora ficou mais fácil entender.'}
          </h1>
          <p>
            {run.agent.name} · {run.suite.name}
          </p>
        </div>
        <a className="button secondary" href={`/api/runs/${run.id}/export?format=csv`}>
          <Download size={16} />
          Baixar resultados
        </a>
      </div>
      {run.agent.provider === 'demo' && (
        <p className="simple-notice">
          Exemplo demonstrativo: estas respostas são simuladas. Conecte sua IA para obter resultados
          reais.
        </p>
      )}
      <div className="result-summary">
        <div className="summary-score">
          <strong>
            {run.metrics.passed}
            <span> / {running || incomplete ? run.results.length : run.total}</span>
          </strong>
          <p>respostas como esperado</p>
        </div>
        <div className="summary-text">
          <h2>
            {running
              ? `${run.results.length} de ${run.total} perguntas respondidas`
              : incomplete
                ? `${run.results.length} de ${run.total} perguntas foram avaliadas`
                : issues || run.metrics.errors
                  ? 'Há pontos para você conferir.'
                  : 'Tudo certo nestas perguntas.'}
          </h2>
          <p>
            {issues > 0 ? `${issues} resposta(s) diferente(s) do esperado. ` : ''}
            {run.metrics.errors > 0
              ? `${run.metrics.errors} pergunta(s) sem resposta por falha de conexão ou formato. `
              : ''}
            {!running && !incomplete && issues === 0 && run.metrics.errors === 0
              ? 'A IA atendeu às regras do conjunto escolhido. Experimente também perguntas parecidas com as do seu dia a dia.'
              : 'Abra cada pergunta abaixo para entender o que aconteceu.'}
          </p>
          <span>
            Tempo médio de espera:{' '}
            {run.results.length ? ms(run.metrics.meanLatency) : 'aguardando a primeira resposta'}
          </span>
        </div>
      </div>
      {running && (
        <div className="simple-progress">
          <div>
            <i style={{ width: `${(run.results.length / run.total) * 100}%` }} />
          </div>
          <span>
            <LoaderCircle size={14} className="spin" />
            Esperando as próximas respostas
          </span>
          <button className="text-button" onClick={onCancel}>
            Parar teste
          </button>
        </div>
      )}
      <div className="result-list-heading">
        <h2>Pergunta por pergunta</h2>
        <label>
          <input
            type="checkbox"
            checked={onlyIssues}
            onChange={(e) => setOnlyIssues(e.target.checked)}
          />
          Mostrar só o que precisa de atenção
        </label>
      </div>
      <div className="simple-results">
        {run.results
          .filter((r) => !onlyIssues || !r.passed)
          .map((r) => {
            const reason = explanation(r);
            return (
              <details
                key={r.id}
                className={`simple-result ${r.passed ? 'passed' : 'needs-attention'}`}
              >
                <summary>
                  <span className="answer-icon">
                    {r.passed ? <Check size={19} /> : <X size={19} />}
                  </span>
                  <div>
                    <strong>{r.name}</strong>
                    <span>
                      {r.error
                        ? 'Não avaliado · falha na chamada'
                        : r.passed
                          ? 'Como esperado'
                          : 'Precisa de atenção'}
                      {run.repetitions > 1 ? ` · tentativa ${r.repetition}` : ''}
                    </span>
                  </div>
                  <ChevronDown size={17} />
                </summary>
                <div className="answer-body">
                  <p className="question-label">O que perguntamos</p>
                  <blockquote>{r.prompt}</blockquote>
                  <div className="answer-columns">
                    <div>
                      <h3>O que esperávamos</h3>
                      {r.checks.map((c, i) => (
                        <p key={i}>{expected(c)}</p>
                      ))}
                    </div>
                    <div>
                      <h3>O que a IA respondeu</h3>
                      <p>
                        {r.error
                          ? 'Não recebemos uma resposta válida.'
                          : r.output?.response || '(resposta vazia)'}
                      </p>
                    </div>
                  </div>
                  <div className="answer-explanation">
                    <strong>{reason.title}</strong>
                    <p>{reason.detail}</p>
                    {reason.next && (
                      <p>
                        <b>O que fazer agora:</b> {reason.next}
                      </p>
                    )}
                  </div>
                  <details className="technical-details">
                    <summary>Ver detalhes técnicos</summary>
                    <pre>
                      {JSON.stringify(
                        {
                          checks: r.checks,
                          output: r.output,
                          latencyMs: r.latencyMs,
                          error: r.error,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </div>
              </details>
            );
          })}
      </div>
      {onlyIssues && !run.results.some((r) => !r.passed) && (
        <p className="simple-notice">Nenhum ponto de atenção entre as respostas recebidas.</p>
      )}
      <p className="report-footnote">
        Este resultado vale para estas perguntas e suas regras. Não é uma nota geral de
        inteligência, precisão ou segurança. As explicações descrevem as verificações, sem um
        segundo modelo julgando a resposta.
      </p>
    </section>
  );
}
