import './testEnv';

import { verifyAccessCode } from '@/services/projects/clientAccess.service';

import { expect, loginAs, test } from './fixtures';

const PROJECT_ID = 'seed-project-1';
/** Item em `aguardando_aprovacao_cliente` no seed. */
const PENDING_ITEM = 'seed-item-1';

/**
 * Gera o acesso do cliente pela UI do admin e devolve as credenciais.
 * A senha só aparece uma vez, então é lida da tela.
 */
async function provisionClientAccess(page: import('@playwright/test').Page) {
  await loginAs(page, 'admin');
  await page.goto(`/projetos/${PROJECT_ID}`);
  await page.getByRole('button', { name: /Gerar senha|Regenerar senha/ }).click();
  await expect(page.getByRole('button', { name: 'Copiar link' })).toBeVisible();

  const link = await page.getByText(/\/cliente\//).first().textContent();
  const publicId = link!.trim().split('/cliente/')[1];
  const accessCode = (await page
    .getByText(/^[2-9A-HJ-NP-Z]{6}$/)
    .first()
    .textContent())!.trim();

  return { publicId, accessCode };
}

test.describe('portal do cliente', () => {
  test.beforeEach(async ({ adminDb }) => {
    // Anexo interno: NUNCA pode aparecer para o cliente.
    await adminDb
      .doc(`projects/${PROJECT_ID}/items/${PENDING_ITEM}/attachments/anexo-interno`)
      .set({
        fileName: 'custos-internos.pdf',
        originalFileName: 'custos-internos.pdf',
        mimeType: 'application/pdf',
        audience: {
          seller: true,
          designer: true,
          assembler: true,
          client: false,
        },
        storagePath: `projects/${PROJECT_ID}/items/${PENDING_ITEM}/desenho/custos-internos.pdf`,
      });
  });

  test('a senha gerada é persistida como hash, não em texto', async ({
    page,
    adminDb,
  }) => {
    const { publicId, accessCode } = await provisionClientAccess(page);

    const project = (await adminDb.doc(`projects/${PROJECT_ID}`).get()).data()!;
    expect(project.clientAccessPublicId).toBe(publicId);
    expect(project.clientAccessCodeHash).not.toContain(accessCode);
    expect(verifyAccessCode(accessCode, project.clientAccessCodeHash)).toBe(true);
  });

  test('código errado é recusado e o certo abre o projeto', async ({
    browser,
    page,
  }) => {
    const { publicId, accessCode } = await provisionClientAccess(page);

    // Contexto anônimo: o cliente não tem sessão interna.
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();

    await clientPage.goto(`/cliente/${publicId}`);
    await clientPage.getByPlaceholder('Ex.: A2B3C4').fill('ZZZZZZ');
    await clientPage.getByRole('button', { name: 'Entrar' }).click();
    await expect(clientPage.getByText(/inv[aá]lid/i)).toBeVisible();

    await clientPage.getByPlaceholder('Ex.: A2B3C4').fill(accessCode);
    await clientPage.getByRole('button', { name: 'Entrar' }).click();

    await expect(clientPage.getByText('Cliente Seed 1')).toBeVisible();
    await expect(clientPage.getByText('Cozinha planejada')).toBeVisible();

    // O anexo interno não vaza para o portal.
    await expect(clientPage.getByText('custos-internos.pdf')).toHaveCount(0);

    await clientContext.close();
  });

  test('o cliente aprova um item e o Firestore registra o histórico com papel client', async ({
    browser,
    page,
    adminDb,
  }) => {
    const { publicId, accessCode } = await provisionClientAccess(page);

    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    clientPage.on('dialog', dialog => dialog.accept());

    await clientPage.goto(`/cliente/${publicId}`);
    await clientPage.getByPlaceholder('Ex.: A2B3C4').fill(accessCode);
    await clientPage.getByRole('button', { name: 'Entrar' }).click();
    await expect(clientPage.getByText('Cozinha planejada')).toBeVisible();

    await clientPage.getByRole('button', { name: 'Aprovar item' }).first().click();

    await expect
      .poll(async () => {
        const snap = await adminDb
          .doc(`projects/${PROJECT_ID}/items/${PENDING_ITEM}`)
          .get();
        return snap.data()?.status;
      })
      .toBe('aguardando_atribuicao_montador');

    const history = await adminDb
      .collection(`projects/${PROJECT_ID}/items/${PENDING_ITEM}/statusHistory`)
      .get();
    expect(history.size).toBe(1);
    expect(history.docs[0].data()).toMatchObject({
      toStatus: 'aguardando_atribuicao_montador',
      changedBy: 'client',
      changedByRole: 'client',
    });

    await clientContext.close();
  });

  test('o cliente recusa um item e o status reflete a recusa', async ({
    browser,
    page,
    adminDb,
  }) => {
    const { publicId, accessCode } = await provisionClientAccess(page);

    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    clientPage.on('dialog', dialog => dialog.accept());

    await clientPage.goto(`/cliente/${publicId}`);
    await clientPage.getByPlaceholder('Ex.: A2B3C4').fill(accessCode);
    await clientPage.getByRole('button', { name: 'Entrar' }).click();
    await expect(clientPage.getByText('Cozinha planejada')).toBeVisible();

    await clientPage.getByRole('button', { name: 'Recusar' }).first().click();

    await expect
      .poll(async () => {
        const snap = await adminDb
          .doc(`projects/${PROJECT_ID}/items/${PENDING_ITEM}`)
          .get();
        return snap.data()?.clientApprovalStatus;
      })
      .toBe('recusado');

    await clientContext.close();
  });

  test('a timeline de acompanhamento reflete o status do item', async ({
    browser,
    page,
  }) => {
    const { publicId, accessCode } = await provisionClientAccess(page);

    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();

    await clientPage.goto(`/cliente/${publicId}`);
    await clientPage.getByPlaceholder('Ex.: A2B3C4').fill(accessCode);
    await clientPage.getByRole('button', { name: 'Entrar' }).click();
    await expect(clientPage.getByText('Cozinha planejada')).toBeVisible();

    await clientPage.goto(`/cliente/${publicId}/acompanhar`);
    await expect(clientPage.getByText('Aguardando sua aprovação')).toBeVisible();

    await clientPage.getByRole('button', { name: 'Voltar para aprovação' }).click();
    await expect(clientPage).toHaveURL(new RegExp(`/cliente/${publicId}$`));

    await clientContext.close();
  });

  test('sem sessão de cliente o portal pede a senha', async ({ browser, page }) => {
    const { publicId } = await provisionClientAccess(page);

    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();

    await clientPage.goto(`/cliente/${publicId}/acompanhar`);
    await expect(clientPage.getByText(/Sessao do cliente invalida|sessão/i)).toBeVisible();

    await clientContext.close();
  });
});
