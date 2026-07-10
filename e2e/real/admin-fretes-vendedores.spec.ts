import './testEnv';

import { expect, expectPath, loginAs, test } from './fixtures';

test.describe('administração — vendedores', () => {
  test('admin cadastra um vendedor e ele passa a valer como senha em cortes', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await page.goto('/administracao/vendedores');

    await page.getByRole('button', { name: 'Novo Vendedor' }).click();
    const dialog = page.getByRole('dialog', { name: 'Novo Vendedor' });
    await dialog.getByLabel('Nome do Vendedor').fill('Vendedor Novo');
    await dialog.getByLabel('Senha (ID)').fill('senha-nova');
    await dialog.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Vendedor Novo')).toBeVisible();

    // A "senha" é o id do documento em `sellers`.
    await expect
      .poll(async () => (await adminDb.doc('sellers/senha-nova').get()).exists)
      .toBe(true);
    expect((await adminDb.doc('sellers/senha-nova').get()).data()).toMatchObject({
      name: 'Vendedor Novo',
    });
  });

  test('vendedor não acessa a página de vendedores', async ({ page }) => {
    await loginAs(page, 'seller');
    await page.goto('/administracao/vendedores');

    await expectPath(page, '/');
  });
});

test.describe('administração — fretes por bairro', () => {
  test('admin altera o frete de um bairro e o valor é persistido', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await page.goto('/administracao/fretes');

    await expect(page.getByText('Fretes por Bairro').first()).toBeVisible();

    await page.getByPlaceholder('Buscar bairro...').fill('Centro');
    const freightInput = page.getByPlaceholder('0,00').first();
    await freightInput.fill('45');
    await page.getByRole('button', { name: 'Salvar' }).first().click();

    await expect
      .poll(async () => {
        const snap = await adminDb.doc('config/areas').get();
        const list = (snap.data()?.list ?? []) as Array<{
          name: string;
          freight: number;
        }>;
        return list.find(area => area.name === 'Centro')?.freight;
      })
      .toBe(45);
  });

  test('vendedor acessa fretes, marceneiro não', async ({ page }) => {
    await loginAs(page, 'seller');
    await page.goto('/administracao/fretes');
    await expectPath(page, '/administracao/fretes');

    await loginAs(page, 'woodworker');
    await page.goto('/administracao/fretes');
    await expectPath(page, '/');
  });
});
