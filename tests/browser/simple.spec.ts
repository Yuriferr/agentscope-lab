import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { demoResponse } from '../../server/providers';
let fixture: Server;
test.beforeAll(async () => {
  fixture = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization === 'Bearer bad-key') {
      res.writeHead(401);
      res.end('{}');
      return;
    }
    if (req.url === '/v1/models') {
      res.end(JSON.stringify({ data: [{ id: 'modelo-de-teste' }] }));
      return;
    }
    if (req.url === '/api/tags') {
      res.end(JSON.stringify({ models: [{ name: 'modelo-local-teste' }] }));
      return;
    }
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    const prompt = body.messages.at(-1).content as string;
    const response = prompt.includes('conexão funcionando')
      ? 'conexão funcionando'
      : demoResponse(prompt, 'candidate').response;
    res.end(
      JSON.stringify(
        req.url === '/api/chat'
          ? { message: { content: response } }
          : { choices: [{ message: { content: response } }] },
      ),
    );
  });
  await new Promise<void>((resolve, reject) => {
    fixture.once('error', reject);
    fixture.listen(4312, '127.0.0.1', resolve);
  });
});
test.afterAll(async () => {
  fixture?.closeAllConnections();
  await new Promise<void>((r) => fixture?.close(() => r()));
});

test('simple journey explains results and creates questions without JSON', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Entenda sua IA/ })).toBeVisible();
  await page.screenshot({ path: 'docs/images/dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'Experimentar exemplo' }).click();
  await page.getByRole('button', { name: 'Começar teste' }).click();
  await expect(
    page.getByRole('heading', { name: 'Agora ficou mais fácil entender.' }),
  ).toBeVisible();
  await expect(page.getByText('3 resposta(s) diferente(s)', { exact: false })).toBeVisible();
  await page.getByText('Fazer uma conta', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'O que esperávamos' })).toBeVisible();
  await expect(page.getByText('391', { exact: true })).toBeVisible();
  await expect(page.getByText('390', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/images/simple-result.png', fullPage: true });
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('button', { name: 'Criar teste com minhas perguntas' }).click();
  await page.getByLabel('Nome do teste').fill('Meu primeiro teste');
  await page.getByLabel('O que perguntar à IA?').fill('Qual a capital do Brasil?');
  await page.getByLabel('Qual resposta você espera?').fill('Brasília');
  await page.getByRole('button', { name: 'Salvar meu teste' }).click();
  await expect(page.getByText('Meu primeiro teste', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Começar teste' }).click();
  await expect(page.getByRole('heading', { name: 'Tudo certo nestas perguntas.' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.getByRole('button', { name: 'Trocar IA' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/images/mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('API connection discovers models, verifies credentials and runs a real HTTP evaluation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /OpenAI Com chave de API/ }).click();
  await expect(page.getByRole('button', { name: 'Usar esta IA' })).toBeDisabled();
  await page.getByText('Nome da conexão e opções de endereço').click();
  await page.getByLabel('Endereço do serviço').fill('http://127.0.0.1:4312/v1/chat/completions');
  await page.getByLabel('Nome para identificar esta IA').fill('API de teste guiado');
  await page.getByLabel('Chave de API', { exact: true }).fill('bad-key');
  await page.getByRole('button', { name: 'Buscar modelos' }).click();
  await expect(page.getByRole('alert')).toContainText('A chave foi recusada');
  await page.getByLabel('Chave de API', { exact: true }).fill('test-only-key');
  await page.getByRole('button', { name: 'Buscar modelos' }).click();
  await expect(page.getByRole('combobox', { name: 'Modelo', exact: true })).toHaveValue('modelo-de-teste');
  await page.getByRole('button', { name: 'Testar conexão', exact: true }).click();
  await expect(page.getByText('Conexão funcionando!', { exact: true })).toBeVisible();
  // A changed credential invalidates the successful probe.
  await page.getByLabel('Chave de API', { exact: true }).fill('another-test-only-key');
  await expect(page.getByRole('button', { name: 'Usar esta IA' })).toBeDisabled();
  await page.getByRole('button', { name: 'Buscar modelos' }).click();
  await page.getByRole('button', { name: 'Testar conexão', exact: true }).click();
  await expect(page.getByText('Conexão funcionando!', { exact: true })).toBeVisible();
  await page.getByText('Nome da conexão e opções de endereço').click();
  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.screenshot({ path: 'docs/images/connect-api.png', fullPage: true });
  await page.getByRole('button', { name: 'Usar esta IA' }).click();
  await page.getByRole('button', { name: 'Começar teste' }).click();
  await expect(page.getByRole('heading', { name: 'Tudo certo nestas perguntas.' })).toBeVisible();
  const history = await (await page.request.get('/api/runs')).json();
  expect(JSON.stringify(history)).not.toContain('test-only-key');
});
test('Ollama setup discovers local models and accepts normal text', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Ollama No meu computador/ }).click();
  await expect(page.getByText('Não precisa de chave no uso local padrão.')).toBeVisible();
  await page.getByText('Nome da conexão e opções de endereço').click();
  await page.getByLabel('Endereço do serviço').fill('http://127.0.0.1:4312/api/chat');
  await page.getByRole('button', { name: 'Buscar modelos' }).click();
  await expect(page.getByRole('combobox', { name: 'Modelo', exact: true })).toHaveValue('modelo-local-teste');
  await page.getByRole('button', { name: 'Testar conexão', exact: true }).click();
  await expect(page.getByText('Conexão funcionando!', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Usar esta IA' }).click();
  await page.getByRole('button', { name: 'Começar teste' }).click();
  await expect(page.getByRole('heading', { name: 'Tudo certo nestas perguntas.' })).toBeVisible();
});
