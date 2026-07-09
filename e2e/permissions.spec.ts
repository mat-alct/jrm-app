import { expect, Page, test } from '@playwright/test';

type E2ERole = 'admin' | 'seller' | 'designer' | 'assembler' | 'woodworker';

async function signInAs(page: Page, role: E2ERole, path = '/') {
  await page.addInitScript(selectedRole => {
    window.localStorage.setItem('jrm:e2e-role', selectedRole);
  }, role);
  await page.goto(path);
}

async function expectPath(page: Page, path: string) {
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(path);
}

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

test.describe('permissões por perfil', () => {
  test('administrador vê a sidebar completa e acessa áreas restritas', async ({
    page,
  }) => {
    await signInAs(page, 'admin');
    await expectPath(page, '/');

    await expectVisibleLinks(page, [
      '/',
      '/cortes/novoservico',
      '/cortes/listadecortes',
      '/cortes/materiais',
      '/projetos/novo',
      '/projetos',
      '/projetos/dashboard',
      '/desenhista',
      '/montador',
      '/montador/financeiro',
      '/administracao/vendedores',
      '/administracao/fretes',
      '/administracao/usuarios',
      '/administracao/configuracoes-prazos',
      '/administracao/financeiro-montadores',
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
    await signInAs(page, 'seller');
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
      '/projetos/dashboard',
      '/desenhista',
      '/montador',
      '/montador/financeiro',
      '/administracao/vendedores',
      '/administracao/usuarios',
      '/administracao/configuracoes-prazos',
      '/administracao/financeiro-montadores',
    ]);

    await page.goto('/cortes/novoservico');
    await expectPath(page, '/cortes/novoservico');
    await expect(page.getByText('Novo Serviço').first()).toBeVisible();

    await page.goto('/administracao/usuarios');
    await expectPath(page, '/');

    await page.goto('/projetos/dashboard');
    await expectPath(page, '/');
  });

  test('marceneiro vê apenas início e lista de serviços de corte', async ({
    page,
  }) => {
    await signInAs(page, 'woodworker');
    await expectPath(page, '/');

    await expectVisibleLinks(page, ['/', '/cortes/listadecortes']);
    await expectMissingLinks(page, [
      '/cortes/novoservico',
      '/cortes/materiais',
      '/projetos/novo',
      '/projetos',
      '/projetos/dashboard',
      '/desenhista',
      '/montador',
      '/montador/financeiro',
      '/administracao/vendedores',
      '/administracao/fretes',
      '/administracao/usuarios',
      '/administracao/configuracoes-prazos',
      '/administracao/financeiro-montadores',
    ]);

    await page.goto('/cortes/listadecortes');
    await expectPath(page, '/cortes/listadecortes');
    await expect(page.getByText('Lista de Cortes').first()).toBeVisible();

    await page.goto('/cortes/novoservico');
    await expectPath(page, '/');

    await page.goto('/administracao/fretes');
    await expectPath(page, '/');
  });

  test('desenhista acessa somente sua fila e itens de projeto permitidos', async ({
    page,
  }) => {
    await signInAs(page, 'designer', '/desenhista');
    await expectPath(page, '/desenhista');

    await expectVisibleLinks(page, ['/desenhista']);
    await expectMissingLinks(page, [
      '/',
      '/cortes/novoservico',
      '/cortes/listadecortes',
      '/cortes/materiais',
      '/projetos/novo',
      '/projetos',
      '/projetos/dashboard',
      '/montador',
      '/montador/financeiro',
      '/administracao/fretes',
      '/administracao/usuarios',
    ]);

    await expect(page.getByText('Minha Fila').first()).toBeVisible();
    await expect(page.getByText('Armario da suite')).toBeVisible();

    await page.goto('/projetos/e2e-projeto-alpha/itens/e2e-item-suite');
    await expectPath(page, '/projetos/e2e-projeto-alpha/itens/e2e-item-suite');
    await expect(page.getByText('Armario da suite').first()).toBeVisible();

    await page.goto('/');
    await expectPath(page, '/desenhista');

    await page.goto('/projetos');
    await expectPath(page, '/desenhista');
  });

  test('montador acessa somente seus dashboards específicos', async ({
    page,
  }) => {
    await signInAs(page, 'assembler', '/montador');
    await expectPath(page, '/montador');

    await expectVisibleLinks(page, ['/montador', '/montador/financeiro']);
    await expectMissingLinks(page, [
      '/',
      '/cortes/novoservico',
      '/cortes/listadecortes',
      '/cortes/materiais',
      '/projetos/novo',
      '/projetos',
      '/projetos/dashboard',
      '/desenhista',
      '/administracao/fretes',
      '/administracao/usuarios',
    ]);

    await expect(page.getByText('Minha montagem').first()).toBeVisible();
    await expect(page.getByText('Painel ripado')).toBeVisible();

    await page.goto('/montador/financeiro');
    await expectPath(page, '/montador/financeiro');
    await expect(page.getByText('Meu financeiro').first()).toBeVisible();

    await page.goto('/');
    await expectPath(page, '/montador');

    await page.goto('/projetos/dashboard');
    await expectPath(page, '/montador');
  });
});
