import './testEnv';

import fs from 'node:fs';

import JSZip from 'jszip';

import {
  SEED_MATERIAL_NAME,
  SEED_SELLER_PASSWORD,
} from '@/tests/helpers/seedEmulator';
import { calculateCutlistPrice } from '@/utils/cutlist/calculatePrice';

import { expect, loginAs, test } from './fixtures';

/** Material do seed: chapa MDF 15mm 2750x1850, R$220. */
const MATERIAL = { width: 2750, height: 1850, price: 220 };

/** Clica na opcao visivel de um FormRadio (o layout renderiza mobile + desktop). */
async function chooseRadio(
  page: import('@playwright/test').Page,
  option: string,
) {
  await page
    .getByText(option, { exact: true })
    .filter({ visible: true })
    .first()
    .click();
}

async function addPiece(
  page: import('@playwright/test').Page,
  piece: { amount: number; sideA: number; sideB: number },
) {
  const materialInput = page.locator('#materialId');
  await materialInput.click();
  await page.getByRole('option', { name: SEED_MATERIAL_NAME }).click();

  await page.locator('#amount').fill(String(piece.amount));
  await page.locator('#sideA').fill(String(piece.sideA));
  await page.locator('#sideB').fill(String(piece.sideB));
  await page.getByRole('button', { name: /ADD/ }).click();
}

test.describe('cortes — novo serviço', () => {
  test('gera, aprova e persiste um plano de corte vinculado ao pedido', async ({
    page,
    context,
    adminDb,
  }) => {
    test.setTimeout(90_000);
    await loginAs(page, 'seller');
    await page.goto('/cortes/novoservico');

    await chooseRadio(page, 'Plano de corte');
    await expect(
      page.getByRole('radio', { name: 'Plano de corte' }),
    ).toBeChecked();
    await expect(
      page.getByRole('heading', { name: 'Plano de corte 2D' }),
    ).toBeVisible();

    await addPiece(page, { amount: 3, sideA: 900, sideB: 450 });
    await page.getByRole('button', { name: 'Gerar plano de corte' }).click();

    await expect(
      page.getByRole('heading', { name: 'Resultado do plano' }),
    ).toBeVisible({ timeout: 65_000 });
    await expect(page.getByText('Ordem sugerida dos cortes')).toHaveCount(0);
    await expect(page.getByText(/Rascunho · versão 1/)).toBeVisible();

    await page.getByRole('button', { name: 'Aprovar plano' }).click();
    await expect(page.getByText(/Aprovado · versão 1/)).toBeVisible();

    const viewerPromise = context.waitForEvent('page');
    await page
      .getByRole('button', { name: /Visualizar em nova aba/ })
      .click();
    const viewer = await viewerPromise;
    await expect(
      viewer.getByRole('heading', { name: 'Plano de corte 2D' }),
    ).toBeVisible();
    await viewer.locator('[data-piece-id]').first().click();
    await expect(viewer.getByTestId('selected-piece-info')).toContainText(
      'Peça 1',
    );
    await viewer.getByRole('button', { name: 'Aumentar zoom' }).click();
    await expect(viewer.getByText('125%')).toBeVisible();
    await viewer.close();

    await page.getByLabel('Nome', { exact: true }).first().fill('Maria');
    await page.getByLabel('Sobrenome', { exact: true }).first().fill('Plano');
    await page
      .getByLabel('Telefone', { exact: true })
      .first()
      .fill('(24) 99999-1111');
    await chooseRadio(page, 'Retirar na Loja');
    await chooseRadio(page, 'Pago');
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

    const snapshot = await adminDb
      .collection('orders')
      .where('serviceType', '==', 'cutting_plan')
      .get();
    expect(snapshot.docs).toHaveLength(1);

    const created = snapshot.docs[0];
    const data = created.data();
    expect(data.cuttingPlan).toMatchObject({
      orderId: created.id,
      status: 'approved',
      version: 1,
    });
    expect(data.cuttingPlan.cutSequence.length).toBeGreaterThan(0);
    expect(data.orderPrice).toBe(data.cuttingPlan.pricing.totalCost);

    const orderRow = page.getByRole('row').filter({ hasText: 'Maria Plano' });
    await expect(
      orderRow.getByRole('button', { name: 'Imprimir plano de corte' }),
    ).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await orderRow
      .getByRole('button', { name: 'Baixar arquivos AC e AD' })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/-arquivos-giben\.zip$/);
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const zip = await JSZip.loadAsync(fs.readFileSync(downloadPath!));
    const names = Object.keys(zip.files).sort();
    expect(names).toHaveLength(2);
    expect(names[0]).toMatch(/\.AC$/);
    expect(names[1]).toMatch(/\.AD$/);
    const ac = await zip.file(names[0])!.async('string');
    const ad = await zip.file(names[1])!.async('string');
    expect(ac.endsWith('\r\n')).toBe(true);
    expect(ad.endsWith('\r\n')).toBe(true);
  });

  test('cria pedido com preço igual ao calculateCutlistPrice e código sequencial', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'seller');
    await page.goto('/cortes/novoservico');
    await expect(page.getByText('Novo Serviço').first()).toBeVisible();

    const piece = { amount: 2, sideA: 1000, sideB: 500 };
    await addPiece(page, piece);

    // O preço na tela precisa bater com a função que cobra do cliente.
    const expectedPrice = calculateCutlistPrice(
      MATERIAL,
      { ...piece, borderA: 0, borderB: 0 },
      75,
    );
    await expect(page.getByRole('table')).toContainText(String(expectedPrice));

    await page.getByLabel('Nome', { exact: true }).first().fill('Pedro');
    await page.getByLabel('Sobrenome', { exact: true }).first().fill('Silva');
    await page
      .getByLabel('Telefone', { exact: true })
      .first()
      .fill('(24) 99999-0000');

    await chooseRadio(page, 'Retirar na Loja');
    await chooseRadio(page, 'Pago');

    await page
      .locator('input[name="sellerPassword"]')
      .fill(SEED_SELLER_PASSWORD);
    await page.getByRole('button', { name: 'CONFIRMAR PEDIDO' }).click();

    // Verificação dupla: o pedido foi gravado com código sequencial e preço certo.
    // Após o sucesso a UI navega para a lista; o write termina em background.
    await expect(page).toHaveURL(/\/cortes\/listadecortes/);
    await expect
      .poll(async () => (await adminDb.collection('orders').get()).size, {
        timeout: 15_000,
      })
      .toBe(2); // o seed já tem 1 pedido

    const orders = await adminDb
      .collection('orders')
      .orderBy('orderCode')
      .get();
    const created = orders.docs[orders.docs.length - 1].data();
    expect(created.orderCode).toBe(2);
    expect(created.customer).toMatchObject({ name: 'Pedro Silva' });
    expect(created.seller).toBe('Vendedor Seed');
    expect(created.cutlist).toHaveLength(1);
    expect(created.cutlist[0].price).toBe(expectedPrice);
  });

  test('senha de vendedor inválida bloqueia a criação', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'seller');
    await page.goto('/cortes/novoservico');

    await addPiece(page, { amount: 1, sideA: 800, sideB: 400 });

    await page.getByLabel('Nome', { exact: true }).first().fill('Pedro');
    await page.getByLabel('Sobrenome', { exact: true }).first().fill('Silva');
    await chooseRadio(page, 'Retirar na Loja');
    await chooseRadio(page, 'Pago');

    await page.locator('input[name="sellerPassword"]').fill('senha-errada');
    await page.getByRole('button', { name: 'CONFIRMAR PEDIDO' }).click();

    await expect(page.getByText('Senha inválida')).toBeVisible();

    // Nada foi gravado além do pedido do seed.
    expect((await adminDb.collection('orders').get()).size).toBe(1);
  });

  test('orçamento é salvo em `estimates`, não em `orders`', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'seller');
    await page.goto('/cortes/novoservico');

    // O radio do Chakra usa input escondido: clicamos no texto do item.
    await chooseRadio(page, 'Orçamento');
    await addPiece(page, { amount: 1, sideA: 600, sideB: 300 });

    await page.getByLabel('Nome', { exact: true }).first().fill('Ana');
    await page.getByLabel('Sobrenome', { exact: true }).first().fill('Souza');
    await page
      .locator('input[name="sellerPassword"]')
      .fill(SEED_SELLER_PASSWORD);
    await page.getByRole('button', { name: 'SALVAR ORÇAMENTO' }).click();

    await expect
      .poll(async () => (await adminDb.collection('estimates').get()).size)
      .toBe(1);

    const estimate = (
      await adminDb.collection('estimates').get()
    ).docs[0].data();
    expect(estimate.estimateCode).toBe(1);
    expect((await adminDb.collection('orders').get()).size).toBe(1);
  });

  test('a peça precisa respeitar os limites de medida', async ({ page }) => {
    await loginAs(page, 'seller');
    await page.goto('/cortes/novoservico');

    const materialInput = page.locator('#materialId');
    await materialInput.click();
    await page.getByRole('option', { name: SEED_MATERIAL_NAME }).click();

    await page.locator('#amount').fill('1');
    await page.locator('#sideA').fill('59');
    await page.locator('#sideB').fill('400');
    await page.getByRole('button', { name: /ADD/ }).click();

    await expect(page.getByText('Mín: 60mm')).toBeVisible();
  });
});
