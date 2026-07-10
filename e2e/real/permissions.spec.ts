import './testEnv';

import { Page } from '@playwright/test';

import { expect, expectPath, loginAs, test } from './fixtures';

function navLink(page: Page, href: string) {
  return page.locator(`a[href="${href}"]`);
}

async function expectVisibleLinks(page: Page, hrefs: string[]) {
  for (const href of hrefs) {
    await expect(navLink(page, href), href).toBeVisible();
  }
}

async function expectMissingLinks(page: Page, hrefs: string[]) {
  for (const href of hrefs) {
    await expect(navLink(page, href), href).toHaveCount(0);
  }
}

const ADMIN_ONLY_ROUTES = [
  '/projetos/dashboard',
  '/administracao/vendedores',
  '/administracao/usuarios',
  '/administracao/configuracoes-prazos',
  '/administracao/financeiro-montadores',
];

test.describe('permissões por perfil (usuários reais do seed)', () => {
  test('administrador vê a sidebar completa e acessa áreas restritas', async ({
    page,
  }) => {
    await loginAs(page, 'admin');
    await expectPath(page, '/');

    await expectVisibleLinks(page, [
      '/',
      '/cortes/novoservico',
      '/cortes/listadecortes',
      '/cortes/materiais',
      '/projetos/novo',
      '/projetos',
      '/desenhista',
      '/montador',
      '/montador/financeiro',
      ...ADMIN_ONLY_ROUTES,
    ]);

    await page.goto('/administracao/usuarios');
    await expectPath(page, '/administracao/usuarios');
    await expect(page.getByText('Usuários').first()).toBeVisible();

    await page.goto('/projetos/dashboard');
    await expectPath(page, '/projetos/dashboard');
    await expect(page.getByText('Dashboard de Projetos').first()).toBeVisible();
  });

  test('vendedor acessa cortes, projetos e fretes, mas não áreas administrativas', async ({
    page,
  }) => {
    await loginAs(page, 'seller');
    await expectPath(page, '/');

    await expectVisibleLinks(page, [
      '/',
      '/cortes/novoservico',
      '/cortes/listadecortes',
      '/cortes/materiais',
      '/projetos/novo',
      '/projetos',
      '/administracao/fretes',
    ]);
    await expectMissingLinks(page, [
      '/desenhista',
      '/montador',
      '/montador/financeiro',
      ...ADMIN_ONLY_ROUTES,
    ]);

    await page.goto('/cortes/novoservico');
    await expectPath(page, '/cortes/novoservico');
    await expect(page.getByText('Novo Serviço').first()).toBeVisible();

    // Acesso direto por URL às rotas de admin volta para a home do papel.
    for (const route of ADMIN_ONLY_ROUTES) {
      await page.goto(route);
      await expectPath(page, '/');
    }
  });

  test('marceneiro vê apenas início e lista de serviços de corte', async ({ page }) => {
    await loginAs(page, 'woodworker');
    await expectPath(page, '/');

    await expectVisibleLinks(page, ['/', '/cortes/listadecortes']);
    await expectMissingLinks(page, [
      '/cortes/novoservico',
      '/cortes/materiais',
      '/projetos/novo',
      '/projetos',
      '/desenhista',
      '/montador',
      '/administracao/fretes',
      ...ADMIN_ONLY_ROUTES,
    ]);

    await page.goto('/cortes/listadecortes');
    await expectPath(page, '/cortes/listadecortes');
    await expect(page.getByText('Lista de Cortes').first()).toBeVisible();

    await page.goto('/cortes/novoservico');
    await expectPath(page, '/');

    await page.goto('/administracao/fretes');
    await expectPath(page, '/');
  });

  test('desenhista cai na própria fila e não acessa projetos', async ({ page }) => {
    await loginAs(page, 'designer');
    await expectPath(page, '/desenhista');

    await expectVisibleLinks(page, ['/desenhista']);
    await expectMissingLinks(page, [
      '/',
      '/cortes/novoservico',
      '/cortes/listadecortes',
      '/projetos',
      '/montador',
      ...ADMIN_ONLY_ROUTES,
    ]);

    await expect(page.getByText('Minha Fila').first()).toBeVisible();

    await page.goto('/');
    await expectPath(page, '/desenhista');

    await page.goto('/projetos');
    await expectPath(page, '/desenhista');
  });

  test('montador acessa somente seus dashboards específicos', async ({ page }) => {
    await loginAs(page, 'assembler');
    await expectPath(page, '/montador');

    await expectVisibleLinks(page, ['/montador', '/montador/financeiro']);
    await expectMissingLinks(page, [
      '/',
      '/cortes/listadecortes',
      '/projetos',
      '/desenhista',
      ...ADMIN_ONLY_ROUTES,
    ]);

    await expect(page.getByText('Minha montagem').first()).toBeVisible();

    await page.goto('/montador/financeiro');
    await expectPath(page, '/montador/financeiro');
    await expect(page.getByText('Meu financeiro').first()).toBeVisible();

    await page.goto('/');
    await expectPath(page, '/montador');

    await page.goto('/projetos/dashboard');
    await expectPath(page, '/montador');
  });
});
