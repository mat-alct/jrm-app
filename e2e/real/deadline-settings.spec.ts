import './testEnv';

import { addDays, format } from 'date-fns';

import { expect, loginAs, test } from './fixtures';

const PROJECT_ID = 'seed-project-1';
const ITEM_ID = 'seed-item-1';

test.describe('configurações de prazo', () => {
  test('admin altera o prazo padrão e a nova aprovação para desenho usa o valor novo', async ({
    page,
    adminDb,
  }) => {
    await adminDb
      .doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`)
      .update({ status: 'projeto_criado', designerId: null, designerName: null });

    await loginAs(page, 'admin');
    await page.goto('/administracao/configuracoes-prazos');

    await page.getByLabel('Dias para desenho').fill('12');
    await page.getByRole('button', { name: 'Salvar' }).click();

    // Verificação dupla: o documento de settings recebeu o novo padrão.
    await expect
      .poll(async () => {
        const snap = await adminDb.doc('settings/deadlineDefaults').get();
        return snap.data()?.desenhoDias;
      })
      .toBe(12);

    // A aprovação para desenho deve calcular hoje + 12 dias.
    await page.goto(`/projetos/${PROJECT_ID}/itens/${ITEM_ID}`);
    await page.getByRole('button', { name: 'Aprovar para desenho' }).click();
    await expect(
      page.getByRole('button', { name: 'Aprovar para desenho' }),
    ).toHaveCount(0);

    const expected = format(addDays(new Date(), 12), 'yyyy-MM-dd');
    // A escrita e assincrona em relacao ao botao sumir: poll em vez de espera fixa.
    await expect
      .poll(async () => {
        const snap = await adminDb
          .doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`)
          .get();
        const deadline = snap.data()?.deadlineCurrent?.toDate() as
          | Date
          | undefined;
        return deadline && format(deadline, 'yyyy-MM-dd');
      })
      .toBe(expected);
  });

  test('o vendedor não acessa as configurações de prazo', async ({ page }) => {
    await loginAs(page, 'seller');
    await page.goto('/administracao/configuracoes-prazos');

    await expect(page).toHaveURL(/\/$/);
  });
});
