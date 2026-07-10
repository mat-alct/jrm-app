import './testEnv';

import {
  SEED_MATERIAL_NAME,
  SEED_SELLER_PASSWORD,
} from '@/tests/helpers/seedEmulator';

import { expect, loginAs, test } from './fixtures';

const ORDER_ID = 'seed-order-1';

/** Adiciona uma peça extra à cutlist do pedido em edição. */
async function addExtraPiece(page: import('@playwright/test').Page) {
  await page.locator('#materialId').click();
  await page.getByRole('option', { name: SEED_MATERIAL_NAME }).click();
  await page.locator('#amount').fill('1');
  await page.locator('#sideA').fill('900');
  await page.locator('#sideB').fill('450');
  await page.getByRole('button', { name: /ADD/ }).click();
}

test.describe('cortes — edição de pedido', () => {
  test('senha de vendedor errada bloqueia a edição e nada é gravado', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await page.goto(`/cortes/editar/${ORDER_ID}`);

    await addExtraPiece(page);

    // A diferença de preço exige decidir se será cobrada.
    await page.getByRole('button', { name: 'Sim', exact: true }).click();
    await page.locator('input[name="sellerPassword"]').fill('senha-errada');
    await page.getByRole('button', { name: 'ATUALIZAR PEDIDO' }).click();

    await expect(page.getByText('Senha inválida')).toBeVisible();

    const order = await adminDb.doc(`orders/${ORDER_ID}`).get();
    expect(order.data()?.cutlist).toHaveLength(1);
    expect(order.data()?.edits).toBeUndefined();
  });

  test('senha correta grava a nova cutlist, a diferença e o autor da edição', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await page.goto(`/cortes/editar/${ORDER_ID}`);

    const before = await adminDb.doc(`orders/${ORDER_ID}`).get();
    const previousPrice = before.data()!.orderPrice as number;

    await addExtraPiece(page);
    await page.getByRole('button', { name: 'Sim', exact: true }).click();
    await page
      .locator('input[name="sellerPassword"]')
      .fill(SEED_SELLER_PASSWORD);
    await page.getByRole('button', { name: 'ATUALIZAR PEDIDO' }).click();

    await expect
      .poll(
        async () => {
          const snap = await adminDb.doc(`orders/${ORDER_ID}`).get();
          return (snap.data()?.cutlist as unknown[])?.length;
        },
        { timeout: 15_000 },
      )
      .toBe(2);

    const after = (await adminDb.doc(`orders/${ORDER_ID}`).get()).data()!;
    expect(after.orderPrice).toBeGreaterThan(previousPrice);
    expect(after.edits).toHaveLength(1);
    expect(after.edits[0]).toMatchObject({
      editedBy: 'Vendedor Seed',
      shouldCharge: true,
    });
    expect(after.edits[0].priceDifference).toBe(
      after.orderPrice - previousPrice,
    );
    expect(after.edits[0].previousCutlist).toHaveLength(1);
  });

  test('sem senha o pedido não é atualizado', async ({ page, adminDb }) => {
    await loginAs(page, 'admin');
    await page.goto(`/cortes/editar/${ORDER_ID}`);

    await addExtraPiece(page);
    await page.getByRole('button', { name: 'Sim', exact: true }).click();
    await page.getByRole('button', { name: 'ATUALIZAR PEDIDO' }).click();

    await expect(page.getByText('Senha obrigatória')).toBeVisible();

    const order = await adminDb.doc(`orders/${ORDER_ID}`).get();
    expect(order.data()?.cutlist).toHaveLength(1);
  });

  test('havendo diferença é obrigatório decidir se será cobrada', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await page.goto(`/cortes/editar/${ORDER_ID}`);

    await addExtraPiece(page);
    await page
      .locator('input[name="sellerPassword"]')
      .fill(SEED_SELLER_PASSWORD);
    await page.getByRole('button', { name: 'ATUALIZAR PEDIDO' }).click();

    await expect(
      page.getByText('Selecione se a diferença deve ser cobrada.'),
    ).toBeVisible();

    const order = await adminDb.doc(`orders/${ORDER_ID}`).get();
    expect(order.data()?.cutlist).toHaveLength(1);
  });
});
