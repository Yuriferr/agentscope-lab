import { z } from 'zod';
import { agentInputSchema } from '../shared/schema.ts';
import { connectionError, createProvider, validateEndpoint } from './providers.ts';

export const keySchema = z.string().trim().min(1).max(4096).optional();
export const modelRequestSchema = z.object({
  provider: z.enum(['ollama', 'openai-compatible']),
  endpoint: z.string().url(),
  apiKey: keySchema,
});
export async function testConnection(body: unknown, allowedOrigins: string[]) {
  const input = agentInputSchema.parse(body);
  const apiKey = keySchema.parse((body as { apiKey?: string }).apiKey);
  const agent = {
    ...input,
    sessionKeyRequired: Boolean(apiKey) || input.sessionKeyRequired,
    id: 'connection-test',
    createdAt: new Date().toISOString(),
  };
  const start = performance.now();
  const output = await createProvider(allowedOrigins, () => apiKey)(
    agent,
    'Responda somente: conexão funcionando',
    new AbortController().signal,
  );
  // Never reflect the temporary credential, even if a nonstandard service echoes headers.
  const response = apiKey
    ? output.response.replaceAll(apiKey, '[chave ocultada]')
    : output.response;
  return { ok: true, response, latencyMs: Math.round(performance.now() - start) };
}
export async function listModels(body: unknown, allowedOrigins: string[]) {
  const input = modelRequestSchema.parse(body);
  const endpoint = validateEndpoint(input.endpoint, allowedOrigins);
  if (input.provider === 'ollama') endpoint.pathname = '/api/tags';
  else {
    if (!endpoint.pathname.endsWith('/chat/completions'))
      throw new Error('Informe o endereço completo terminado em /chat/completions.');
    endpoint.pathname = endpoint.pathname.replace(/chat\/completions$/, 'models');
  }
  let response: Response;
  try {
    response = await fetch(endpoint, {
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
      headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
    });
  } catch {
    throw new Error(
      input.provider === 'ollama'
        ? 'Não encontrei o Ollama. Abra o aplicativo e tente novamente. Se estiver em outro computador, confira o endereço.'
        : 'Não consegui listar os modelos. Confira a conexão e o endereço. Você também pode digitar o nome do modelo.',
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(connectionError(response.status));
  }
  const reader = response.body!.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.length;
    if (size > 1024 * 1024) {
      await reader.cancel();
      throw new Error('A lista de modelos excedeu o limite de tamanho.');
    }
    chunks.push(item.value);
  }
  let payload: { models?: { name: string }[]; data?: { id: string }[] };
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('O serviço não devolveu uma lista de modelos válida.');
  }
  const values =
    input.provider === 'ollama'
      ? payload.models?.map((m) => m.name)
      : payload.data?.map((m) => m.id);
  if (!Array.isArray(values))
    throw new Error(
      'O serviço não oferece a listagem esperada. Digite o nome do modelo manualmente.',
    );
  return {
    models: values
      .filter((v) => typeof v === 'string' && v.length <= 100)
      .slice(0, 500)
      .sort(),
  };
}
