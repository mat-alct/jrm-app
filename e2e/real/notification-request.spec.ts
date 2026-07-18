import './testEnv';

import { expect, loginAs, logout, test } from './fixtures';

const PROJECT_ID = 'seed-project-1';
const ITEM_ID = 'seed-item-1';

test.describe('desenhista pede informacoes ao vendedor', () => {
  test.beforeEach(async ({ adminDb }) => {
    await adminDb.doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`).update({
      status: 'aguardando_desenho',
      designerId: 'seed-designer',
      designerName: 'Desenhista Seed',
    });
  });

  test('ciclo completo: pedido de informacoes, anexo, reaprovacao e badge de notificacao', async ({
    page,
    adminDb,
  }) => {
    // ---------- 1. desenhista pede mais informacoes ----------
    await loginAs(page, 'designer');
    await page.goto(`/projetos/${PROJECT_ID}/itens/${ITEM_ID}`);

    await page
      .getByPlaceholder('O que falta para você conseguir desenhar este item?')
      .fill('Falta a medida do vão da cozinha');
    await page.getByRole('button', { name: 'Pedir mais informações' }).click();

    await expect(
      page.getByText('Pedido de informações enviado ao vendedor.'),
    ).toBeVisible();

    // Verificação dupla (a): item muda de status mas mantém o mesmo desenhista.
    await expect
      .poll(async () => {
        const snap = await adminDb
          .doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`)
          .get();
        return snap.data()?.status;
      })
      .toBe('aguardando_informacoes');

    const itemAfterRequest = await adminDb
      .doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`)
      .get();
    expect(itemAfterRequest.data()).toMatchObject({
      designerId: 'seed-designer',
      designerName: 'Desenhista Seed',
    });

    // Verificação dupla (b): notificação criada e não resolvida.
    const notificationsSnap = await adminDb
      .collection(`projects/${PROJECT_ID}/notifications`)
      .get();
    expect(notificationsSnap.size).toBe(1);
    expect(notificationsSnap.docs[0].data()).toMatchObject({
      itemId: ITEM_ID,
      message: 'Falta a medida do vão da cozinha',
      resolvedAt: null,
    });

    // ---------- 2. vendedor vê a notificação na aba do projeto ----------
    await logout(page);
    await loginAs(page, 'seller');
    await page.goto(`/projetos/${PROJECT_ID}`);

    await expect(
      page.getByRole('tab', { name: 'Notificações 1' }),
    ).toBeVisible();
    await page.getByRole('tab', { name: 'Notificações 1' }).click();
    await expect(
      page.getByText('Falta a medida do vão da cozinha'),
    ).toBeVisible();

    // ---------- 3. vendedor anexa documento e reaprova para desenho ----------
    await page.goto(`/projetos/${PROJECT_ID}/itens/${ITEM_ID}`);

    await page.getByPlaceholder('Ex: fotos do ambiente').fill('medidas');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'medidas-vao.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF medidas'),
    });
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('medidas-vao.pdf')).toBeVisible();

    await page.getByRole('button', { name: 'Aprovar para desenho' }).click();
    await expect(page.getByText('Item aprovado para desenho.')).toBeVisible();

    // Verificação dupla (c): item volta à fila com o MESMO desenhista atribuído.
    await expect
      .poll(async () => {
        const snap = await adminDb
          .doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`)
          .get();
        return snap.data()?.status;
      })
      .toBe('aguardando_desenho');

    const itemAfterApprove = await adminDb
      .doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`)
      .get();
    expect(itemAfterApprove.data()).toMatchObject({
      designerId: 'seed-designer',
      designerName: 'Desenhista Seed',
    });

    // Verificação dupla (d): a notificação foi resolvida.
    await expect
      .poll(async () => {
        const snap = await adminDb
          .collection(`projects/${PROJECT_ID}/notifications`)
          .get();
        return snap.docs[0].data().resolvedAt !== null;
      })
      .toBe(true);

    // ---------- 4. badge some da aba de notificações ----------
    await page.goto(`/projetos/${PROJECT_ID}`);
    await expect(page.getByRole('tab', { name: 'Notificações' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Notificações 1' })).toHaveCount(
      0,
    );
  });
});
