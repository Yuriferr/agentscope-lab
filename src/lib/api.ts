export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Serviço indisponível.' }));
    throw new Error(error.error ?? 'Não foi possível concluir a operação.');
  }
  return response.json() as Promise<T>;
}
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
export const ms = (n: number) =>
  n >= 1000
    ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} s`
    : `${Math.round(n)} ms`;
export const date = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
