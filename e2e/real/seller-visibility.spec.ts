import './testEnv';

import { expect, loginAs, logout, test } from './fixtures';

const PROJECT_ID = 'seed-project-1';
const ITEM_ID = 'seed-item-1';

test.describe('visibilidade do vendedor apos atribuicao do montador', () => {
  test.beforeEach(async ({ adminDb }) => {
    await adminDb.doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`).update({
      status: 'aguardando_atribuicao_montador',
    });

    const sourceProject = await adminDb.doc(`projects/${PROJECT_ID}`).get();
    await adminDb.doc('projects/project-from-another-seller').set({
      ...sourceProject.data(),
      customerName: 'Cliente de Outro Vendedor',
      sellerId: 'another-seller',
      sellerName: 'Outro Vendedor',
    });
  });

  test('admin atribui montador; vendedor ve so status e todos os cadastros', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await page.goto(`/projetos/${PROJECT_ID}/itens/${ITEM_ID}`);

    await page.getByRole('button', { name: 'Atribuir montador' }).click();
    await expect(page.getByText('Atribuir montadores')).toBeVisible();
    await page
      .getByRole('combobox', { name: 'Montador' })
      .selectOption('seed-assembler');
    await page.getByLabel('Valor a receber').fill('350');
    await page.getByRole('button', { name: 'Salvar atribuições' }).click();
    await expect(page.getByText('Montadores atribuídos.')).toBeVisible();

    await expect
      .poll(async () => {
        const snap = await adminDb
          .doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`)
          .get();
        return snap.data()?.assemblerAssignedAt != null;
      })
      .toBe(true);

    await logout(page);
    await loginAs(page, 'seller');
    await page.goto(`/projetos/${PROJECT_ID}/itens/${ITEM_ID}`);

    await expect(page.getByText('Ambiente: Cozinha')).toBeVisible();
    await expect(page.getByText('Em produção')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Orçamento' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('heading', { name: 'Desenho' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Montadores' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('heading', { name: 'Histórico' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('heading', { name: 'Anexos do item' }),
    ).toHaveCount(0);

    await page.goto('/projetos');
    await expect(page.getByText('Cliente de Outro Vendedor')).toBeVisible();
  });
});
