import { useState } from 'react';
import { ArrowDownToLine, ChevronRight, Layers3 } from 'lucide-react';
import type { Suite } from '../../../../shared/schema';
import { download } from '../../../lib/api';
import { Badge } from '../../../components/ui';

export function SuiteView({ suites }: { suites: Suite[] }) {
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
