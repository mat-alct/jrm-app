import './testEnv';

import { expect, loginAs, test } from './fixtures';

const SEED_ORDER = 'seed-order-1';

test.describe('cortes — lista de cortes', () => {
  test('lista o pedido do seed com cliente e status', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/cortes/listadecortes');

    await expect(page.getByText('Lista de Cortes').first()).toBeVisible();
    await expect(page.getByText('Cliente Corte Seed').first()).toBeVisible();
    await expect(page.getByText('Em Produção').first()).toBeVisible();
  });

  test('busca por nome do cliente, com capitalização diferente', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/cortes/listadecortes');
    await expect(page.getByText('Cliente Corte Seed').first()).toBeVisible();

    await page.getByPlaceholder(/Buscar/).fill('cliente corte seed');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(page.getByText('Cliente Corte Seed').first()).toBeVisible();

    await page.getByPlaceholder(/Buscar/).fill('inexistente');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(page.getByText('Nenhum registro encontrado')).toBeVisible();
  });

  test('avança o status com diálogo de confirmação e grava no Firestore', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await page.goto('/cortes/listadecortes');
    await expect(page.getByText('Cliente Corte Seed').first()).toBeVisible();

    await page.getByRole('button', { name: 'Concluir' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Confirmar alteração de status')).toBeVisible();
    await expect(dialog.getByText('liberar para transporte')).toBeVisible();
    await dialog.getByRole('button', { name: /Confirmar/ }).click();

    await expect
      .poll(async () => {
        const snap = await adminDb.doc(`orders/${SEED_ORDER}`).get();
        return snap.data()?.orderStatus;
      })
      .toBe('Liberado para Transporte');
  });

  test('cancelar o diálogo não altera o status', async ({ page, adminDb }) => {
    await loginAs(page, 'admin');
    await page.goto('/cortes/listadecortes');
    await expect(page.getByText('Cliente Corte Seed').first()).toBeVisible();

    await page.getByRole('button', { name: 'Concluir' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    const snap = await adminDb.doc(`orders/${SEED_ORDER}`).get();
    expect(snap.data()?.orderStatus).toBe('Em Produção');
  });

  test('desativa o pedido e ele some da lista padrão', async ({ page, adminDb }) => {
    await loginAs(page, 'admin');
    await page.goto('/cortes/listadecortes');
    await expect(page.getByText('Cliente Corte Seed').first()).toBeVisible();

    await page.getByRole('button', { name: 'Desativar' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Desativar/ }).click();

    await expect
      .poll(async () => {
        const snap = await adminDb.doc(`orders/${SEED_ORDER}`).get();
        return snap.data()?.isDeactivated;
      })
      .toBe(true);
  });

  test('o marceneiro vê a lista mas não pode editar', async ({ page }) => {
    await loginAs(page, 'woodworker');
    await page.goto('/cortes/listadecortes');

    await expect(page.getByText('Lista de Cortes').first()).toBeVisible();
    await expect(page.getByText('Cliente Corte Seed').first()).toBeVisible();
  });
});
