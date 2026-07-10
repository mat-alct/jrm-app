import './testEnv';

import {
  SEED_MATERIAL_NAME,
  SEED_SELLER_PASSWORD,
} from '@/tests/helpers/seedEmulator';
import { calculateCutlistPrice } from '@/utils/cutlist/calculatePrice';

import { expect, loginAs, test } from './fixtures';

const NEW_MATERIAL_NAME = '341 - 00000000000731 - MDF Preto 18mm';

test.describe('cortes — materiais', () => {
  test('lista o material do seed', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/cortes/materiais');

    await expect(page.getByText(SEED_MATERIAL_NAME).first()).toBeVisible();
  });

  test('cria um material novo e ele é persistido', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await page.goto('/cortes/materiais');

    await page.getByRole('button', { name: 'Novo Material' }).click();
    const dialog = page.getByRole('dialog', { name: 'Novo Material' });

    await dialog.getByLabel('Material').fill(NEW_MATERIAL_NAME);
    await dialog.getByLabel('Largura').fill('2750');
    await dialog.getByLabel('Altura').fill('1850');
    await dialog.getByLabel('Preço').fill('300');
    await dialog.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText(NEW_MATERIAL_NAME)).toBeVisible();

    await expect
      .poll(async () => (await adminDb.collection('materials').get()).size)
      .toBe(2);

    const materials = await adminDb.collection('materials').get();
    const created = materials.docs
      .map(doc => doc.data())
      .find(data => data.name === NEW_MATERIAL_NAME);
    expect(created).toMatchObject({ width: 2750, height: 1850, price: 300 });
  });

  test('remove um material', async ({ page, adminDb }) => {
    await loginAs(page, 'admin');
    await page.goto('/cortes/materiais');
    await expect(page.getByText(SEED_MATERIAL_NAME).first()).toBeVisible();

    // A remoção é imediata: não há diálogo de confirmação nesta tela.
    await page.getByRole('button', { name: 'Remover' }).first().click();

    await expect(page.getByText(SEED_MATERIAL_NAME)).toHaveCount(0);
    await expect
      .poll(async () => (await adminDb.collection('materials').get()).size)
      .toBe(0);
  });

  test('o preço do material alimenta o cálculo do novo serviço', async ({
    page,
    adminDb,
  }) => {
    // Dobra o preço do material e confere que o novo serviço cobra o dobro.
    await adminDb.doc('materials/seed-material-1').update({ price: 440 });

    await loginAs(page, 'seller');
    await page.goto('/cortes/novoservico');

    await page.locator('#materialId').click();
    await page.getByRole('option', { name: SEED_MATERIAL_NAME }).click();
    await page.locator('#amount').fill('1');
    await page.locator('#sideA').fill('1000');
    await page.locator('#sideB').fill('500');
    await page.getByRole('button', { name: /ADD/ }).click();

    const expectedPrice = calculateCutlistPrice(
      { width: 2750, height: 1850, price: 440 },
      { amount: 1, sideA: 1000, sideB: 500, borderA: 0, borderB: 0 },
      75,
    );
    await expect(page.getByRole('table')).toContainText(String(expectedPrice));

    // E o valor gravado no pedido é o mesmo que a tela mostrou.
    await page.getByLabel('Nome', { exact: true }).first().fill('Pedro');
    await page.getByLabel('Sobrenome', { exact: true }).first().fill('Silva');
    await page
      .getByText('Retirar na Loja', { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await page
      .getByText('Pago', { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await page
      .locator('input[name="sellerPassword"]')
      .fill(SEED_SELLER_PASSWORD);
    await page.getByRole('button', { name: 'CONFIRMAR PEDIDO' }).click();

    await expect(page).toHaveURL(/\/cortes\/listadecortes/);
    await expect
      .poll(async () => (await adminDb.collection('orders').get()).size, {
        timeout: 15_000,
      })
      .toBe(2);

    const orders = await adminDb
      .collection('orders')
      .orderBy('orderCode')
      .get();
    const created = orders.docs[orders.docs.length - 1].data();
    expect(created.cutlist[0].price).toBe(expectedPrice);
  });

  test('o marceneiro não acessa a página de materiais', async ({ page }) => {
    await loginAs(page, 'woodworker');
    await page.goto('/cortes/materiais');

    await expect(page).toHaveURL(/\/$/);
  });
});
