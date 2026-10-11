import { test, expect } from '@playwright/test';
test('complete evaluation, inspect failures, compare versions, export, import and responsive layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#advanced');
  await expect(
    page.getByRole('heading', { name: 'Confiança se constrói com testes.' }),
  ).toBeVisible();
  for (const [agent, name] of [
    ['demo-baseline', 'Baseline de demonstração'],
    ['demo-candidate', 'Candidato de demonstração'],
  ]) {
    await page.getByRole('button', { name: 'Nova avaliação', exact: true }).click();
    await page.getByLabel('Nome da execução').fill(name);
    await page.getByLabel('Agente / versão').selectOption(agent);
    await page.getByLabel('Suíte de testes').selectOption('suite-banco');
    await page.getByRole('button', { name: 'Iniciar avaliação' }).click();
    await expect(page.getByText('Concluída', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('16/16', { exact: true })).toBeVisible();
    if (agent === 'demo-baseline') {
      await page.getByRole('button', { name: 'Reprovados', exact: true }).click();
      await page.getByRole('button', { name: 'Erros de digitação', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Critérios de avaliação' })).toBeVisible();
      await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    }
    const exported = page.waitForEvent('download');
    await page.getByRole('link', { name: 'JSON', exact: true }).click();
    expect((await exported).suggestedFilename()).toMatch(/\.json$/);
    await page.getByRole('button', { name: 'Visão geral', exact: true }).click();
  }
  await page.screenshot({ path: 'docs/images/advanced-dashboard.png', fullPage: true });
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Comparar versões', exact: true })
    .click();
  await expect(page.getByText('+56,3 p.p.', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/images/comparison.png', fullPage: true });
  await page.getByRole('button', { name: 'Suítes de testes', exact: true }).click();
  await page.getByRole('button', { name: 'Nova suíte', exact: true }).click();
  await page.getByRole('button', { name: 'Validar e salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Criar suíte de testes' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Minha suíte/ })).toBeVisible();
  await page.getByRole('button', { name: 'Agentes', exact: true }).click();
  await page.getByRole('button', { name: 'Conectar agente', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('HTTP de exemplo');
  await page.getByLabel('Versão', { exact: true }).fill('v1');
  await page.getByRole('button', { name: 'Salvar agente' }).click();
  await expect(page.getByRole('heading', { name: 'HTTP de exemplo' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Agentes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'HTTP de exemplo' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Visão geral', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Confiança se constrói com testes.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'docs/images/advanced-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
