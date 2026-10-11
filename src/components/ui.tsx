import { useEffect, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight, FlaskConical, Check, Minus, LoaderCircle } from 'lucide-react';
import type { Run, RunSummary } from '../../shared/schema';
import { date, ms, pct } from '../lib/api';
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const el = ref.current;
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'red' | 'amber';
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Status({ run }: { run: Run | RunSummary }) {
  const status = {
    completed: 'Concluída',
    running: 'Em execução',
    cancelled: 'Cancelada',
    interrupted: 'Interrompida',
    failed: 'Falha interna',
  }[run.status];
  return (
    <Badge
      tone={run.status === 'completed' ? 'green' : run.status === 'running' ? 'amber' : 'neutral'}
    >
      {run.status === 'running' ? (
        <LoaderCircle size={12} className="spin" />
      ) : (
        <span className="dot" />
      )}
      {status}
    </Badge>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FlaskConical size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function RunTable({
  runs,
  onSelect,
}: {
  runs: RunSummary[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Execução / agente</th>
            <th>Status</th>
            <th>Aprovação</th>
            <th>Latência média</th>
            <th>Data</th>
            <th>
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>
                <button className="table-link" onClick={() => onSelect(run.id)}>
                  {run.name}
                </button>
                <span className="subtext">
                  {run.agent.name} · {run.agent.version}
                  {run.agent.provider === 'demo' ? ' · simulação' : ''}
                </span>
              </td>
              <td>
                <Status run={run} />
              </td>
              <td>
                <div className="rate-cell">
                  <span>{run.metrics.completed ? pct(run.metrics.passRate) : '—'}</span>
                  <div className="mini-track">
                    <i style={{ width: `${run.metrics.passRate}%` }} />
                  </div>
                </div>
              </td>
              <td className="mono">{run.metrics.completed ? ms(run.metrics.meanLatency) : '—'}</td>
              <td className="subtle nowrap">{date(run.createdAt)}</td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Abrir ${run.name}`}
                  onClick={() => onSelect(run.id)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pass({ passed }: { passed: boolean }) {
  return (
    <Badge tone={passed ? 'green' : 'red'}>
      {passed ? <Check size={12} /> : <Minus size={12} />}
      {passed ? 'Aprovado' : 'Reprovado'}
    </Badge>
  );
}
