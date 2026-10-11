import { BarChart3, CircleHelp, FlaskConical, Terminal } from 'lucide-react';

export function Guide() {
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
