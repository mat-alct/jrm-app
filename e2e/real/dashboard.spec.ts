import './testEnv';

import { expect, loginAs, test } from './fixtures';

/**
 * O seed usa prazos fixos em janeiro/2026, todos no passado, então todo item
 * não finalizado está atrasado: seed-item-1..4 (o 5 está `finalizado`).
 */
const DELAYED_ITEM_NAMES = [
  'Cozinha planejada',
  'Armario de quarto',
  'Rack de sala',
  'Bancada de lavanderia',
];

function cardValue(page: import('@playwright/test').Page, label: string) {
  return page.getByText(label, { exact: true }).locator('..');
}

test.describe('dashboard de projetos', () => {
  test('mostra as contagens do seed determinístico', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/projetos/dashboard');

    await expect(page.getByText('Dashboard de Projetos').first()).toBeVisible();

    // 2 projetos com itens em aberto.
    await expect(cardValue(page, 'Projetos em aberto')).toContainText('2');
    // 4 itens não finalizados com prazo vencido.
    await expect(cardValue(page, 'Itens atrasados')).toContainText('4');
  });

  test('lista os itens atrasados com cliente e prazo', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/projetos/dashboard');

    for (const name of DELAYED_ITEM_NAMES) {
      await expect(page.getByRole('cell', { name })).toBeVisible();
    }

    await expect(page.getByRole('cell', { name: 'Guarda-roupa planejado' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('cell', { name: 'Cliente Seed 1' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Cliente Seed 2' }).first()).toBeVisible();
  });

  test('filtra a tabela de atrasados por cliente', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/projetos/dashboard');

    await page.getByPlaceholder('Buscar cliente...').fill('Seed 2');

    await expect(page.getByRole('cell', { name: 'Rack de sala' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Cozinha planejada' })).toHaveCount(0);
  });

  test('filtra por status e chega ao estado vazio', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/projetos/dashboard');

    // Nenhum item atrasado está em `aguardando_orcamento`.
    await page.locator('select').nth(2).selectOption('aguardando_orcamento');

    await expect(page.getByText('Nenhum item atrasado.')).toBeVisible();
  });

  test('o vendedor não acessa o dashboard', async ({ page }) => {
    await loginAs(page, 'seller');
    await page.goto('/projetos/dashboard');

    await expect(page).toHaveURL(/\/$/);
  });
});
