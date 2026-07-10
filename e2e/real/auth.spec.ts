import './testEnv';

import { expect, expectPath, loginAs, logout, SEED_USER_PASSWORD, test } from './fixtures';

test.describe('autenticação real', () => {
  test('login válido cria cookie de sessão e leva à home', async ({ page }) => {
    await loginAs(page, 'admin');

    await expectPath(page, '/');

    // Verificação dupla: além da UI, o cookie httpOnly de sessão precisa existir.
    const cookies = await page.context().cookies();
    const session = cookies.find(cookie => cookie.name === 'session');
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
  });

  test('credencial inválida mostra erro e não cria sessão', async ({
    page,
    consoleErrors,
  }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('admin@seed.jrm');
    await page.getByPlaceholder('Senha').fill('senha-errada-mesmo');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Email ou senha incorretos.')).toBeVisible();
    await expectPath(page, '/login');

    const cookies = await page.context().cookies();
    expect(cookies.find(cookie => cookie.name === 'session')).toBeUndefined();

    // O 400 do Auth emulator é o próprio efeito esperado aqui: consumimos a
    // entrada em vez de alargar a allowlist global de erros de console.
    const rejected = consoleErrors.filter(error => /400 \(Bad Request\)/.test(error));
    expect(rejected.length).toBeGreaterThan(0);
    consoleErrors.length = 0;
  });

  test('senha curta é barrada pelo schema antes de chamar o Firebase', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('admin@seed.jrm');
    await page.getByPlaceholder('Senha').fill('1234567');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Senha precisa de no mínimo 8 dígitos')).toBeVisible();
    await expectPath(page, '/login');
  });

  test('sessão persiste após recarregar a página', async ({ page }) => {
    await loginAs(page, 'admin');

    await page.reload();

    await expectPath(page, '/');
    await expect(page.getByRole('link', { name: 'Sair' })).toBeVisible();
  });

  test('logout volta ao login e bloqueia rota protegida', async ({ page }) => {
    await loginAs(page, 'admin');
    await logout(page);

    await expectPath(page, '/login');

    await page.goto('/projetos');
    await expectPath(page, '/login');
  });

  test('rota protegida sem sessão redireciona para o login', async ({ page }) => {
    await page.goto('/projetos/dashboard');

    await expectPath(page, '/login');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('usuário criado pelo seed consegue logar em cada papel', async ({ page }) => {
    for (const role of ['seller', 'designer', 'assembler', 'woodworker'] as const) {
      await loginAs(page, role);
      await expect(page.getByRole('link', { name: 'Sair' })).toBeVisible();
      await logout(page);
    }

    expect(SEED_USER_PASSWORD).toBe('Seed@12345');
  });
});
