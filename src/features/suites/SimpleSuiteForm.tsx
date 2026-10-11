import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Suite } from '../../../shared/schema';
import { Modal } from '../../components/ui';
import { api } from '../../lib/api';
type Question = {
  id: string;
  prompt: string;
  value: string;
  type: 'contains' | 'response_equals' | 'not_contains';
};
const newQuestion = (): Question => ({
  id: crypto.randomUUID(),
  prompt: '',
  value: '',
  type: 'contains',
});
export default function SimpleSuiteForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (suite: Suite) => void;
}) {
  const [name, setName] = useState('Minhas perguntas'),
    [questions, setQuestions] = useState<Question[]>([newQuestion()]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const update = (id: string, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  return (
    <Modal title="Crie seu próprio teste" onClose={onClose} wide>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const suite = await api<Suite>('/suites', {
              name,
              description: 'Perguntas criadas no modo simples.',
              cases: questions.map((q, i) => ({
                id: q.id,
                name: `Pergunta ${i + 1}`,
                category: 'Compreensão',
                prompt: q.prompt,
                assertions: [{ type: q.type, value: q.value }],
              })),
            });
            onSaved(suite);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="subtle">
          Escreva o que você quer perguntar e uma regra simples para conferir a resposta.
        </p>
        <label>
          Nome do teste
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} />
        </label>
        {questions.map((q, i) => (
          <div className="question-builder" key={q.id}>
            <div className="model-header">
              <strong>Pergunta {i + 1}</strong>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover pergunta ${i + 1}`}
                  onClick={() => setQuestions((qs) => qs.filter((item) => item.id !== q.id))}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <label>
              O que perguntar à IA?
              <textarea
                value={q.prompt}
                onChange={(e) => update(q.id, { prompt: e.target.value })}
                required
                rows={2}
                maxLength={12000}
                placeholder="Ex.: Em qual cidade fica a Torre Eiffel?"
              />
            </label>
            <label>
              Como conferir a resposta?
              <select
                value={q.type}
                onChange={(e) => update(q.id, { type: e.target.value as Question['type'] })}
              >
                <option value="contains">Deve incluir uma palavra ou frase</option>
                <option value="response_equals">
                  Deve ser exatamente a resposta que eu escrever
                </option>
                <option value="not_contains">Não deve incluir uma palavra ou frase</option>
              </select>
            </label>
            <label>
              {q.type === 'not_contains'
                ? 'O que não pode aparecer?'
                : 'Qual resposta você espera?'}
              <input
                value={q.value}
                onChange={(e) => update(q.id, { value: e.target.value })}
                required
                maxLength={160}
                placeholder="Ex.: Paris"
              />
            </label>
          </div>
        ))}
        <p className="caption">
          A conferência procura o texto que você definiu, ignorando maiúsculas e acentos. Ela não
          interpreta sinônimos nem substitui uma revisão humana.
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={questions.length >= 20}
          onClick={() => setQuestions((qs) => [...qs, newQuestion()])}
        >
          <Plus size={16} />
          Adicionar pergunta
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Voltar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar meu teste'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
