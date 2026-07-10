import './testEnv';

import { expect, loginAs, test } from './fixtures';

const PROJECT_ID = 'seed-project-1';

/**
 * Único spec autorizado a usar `page.route` (princípio 4 do plano): aqui a
 * interceptação simula falha de infraestrutura, não o caminho feliz.
 */
test.describe('caminhos de erro', () => {
  test('falha de rede no upload mostra erro e o estado é recuperável', async ({
    page,
    adminDb,
    consoleErrors,
  }) => {
    await loginAs(page, 'admin');
    await page.goto(`/projetos/${PROJECT_ID}`);

    // Falha de infraestrutura no Storage. Usamos 403 (erro definitivo) em vez de
    // `abort`: uma falha de rede faria o SDK do Firebase entrar em retry com
    // backoff de ~2 min, e o erro não chegaria à UI dentro do teste.
    await page.route('http://127.0.0.1:9199/**', route =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 403, message: 'Permission denied.' } }),
      }),
    );

    await page.getByPlaceholder('Ex: fotos do ambiente').fill('contrato');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'contrato.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF'),
    });
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(page.getByText('Erro ao enviar arquivo.')).toBeVisible();

    // Nada foi gravado: nem objeto no Storage, nem doc de anexo.
    expect((await adminDb.collection(`projects/${PROJECT_ID}/attachments`).get()).size).toBe(
      0,
    );

    // O upload volta a funcionar depois que a rede se recupera.
    await page.unroute('http://127.0.0.1:9199/**');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('contrato.pdf')).toBeVisible();

    await expect
      .poll(
        async () =>
          (await adminDb.collection(`projects/${PROJECT_ID}/attachments`).get()).size,
      )
      .toBe(1);

    consoleErrors.length = 0;
  });

  test('erro 500 na API de acesso do cliente mostra mensagem e não trava a tela', async ({
    page,
    consoleErrors,
  }) => {
    await loginAs(page, 'admin');
    await page.goto(`/projetos/${PROJECT_ID}`);

    await page.route('**/api/client-access/provision', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Erro inesperado.' }),
      }),
    );

    await page.getByRole('button', { name: /Gerar senha|Regenerar senha/ }).click();

    await expect(page.getByText('Erro inesperado.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar link' })).toHaveCount(0);

    consoleErrors.length = 0;
  });

  test('duplo clique no envio de anexo não cria documento duplicado', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await page.goto(`/projetos/${PROJECT_ID}`);

    await page.getByPlaceholder('Ex: fotos do ambiente').fill('contrato');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'contrato.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF'),
    });

    // Dois cliques reais em sequência, sem `force`: um usuário não consegue clicar
    // num botão desabilitado, então `force` mascararia a proteção do componente.
    const submit = page.getByRole('button', { name: 'Enviar' });
    await submit.dispatchEvent('click');
    await submit.dispatchEvent('click');

    await expect(page.getByText('contrato.pdf').first()).toBeVisible();

    // Um único anexo, mesmo com o segundo clique.
    await expect
      .poll(
        async () =>
          (await adminDb.collection(`projects/${PROJECT_ID}/attachments`).get()).size,
      )
      .toBe(1);
  });

  test('sessão de cliente inválida devolve 401 no portal', async ({ browser }) => {
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();

    await clientPage.goto('/cliente/publicid-inexistente/acompanhar');

    await expect(clientPage.getByText(/Sessao do cliente invalida|sessão/i)).toBeVisible();

    await clientContext.close();
  });
});
