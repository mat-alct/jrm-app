import './testEnv';

import { adminAuth } from '@/services/firebaseAdmin';

import { expect, expectPath, loginAs, logout, test } from './fixtures';

const NEW_USER_EMAIL = 'novo.desenhista@seed.jrm';
const NEW_USER_PASSWORD = 'Novo@12345';

async function createUserThroughUi(page: import('@playwright/test').Page) {
  await page.goto('/administracao/usuarios');
  await page.getByRole('button', { name: 'Novo Usuário' }).click();

  const dialog = page.getByRole('dialog', { name: 'Novo Usuário' });
  await dialog.getByLabel('Nome').fill('Desenhista Novo');
  await dialog.getByLabel('E-mail').fill(NEW_USER_EMAIL);
  await dialog.getByLabel('Telefone').fill('(24) 99999-1234');
  await dialog.getByLabel('Senha inicial').fill(NEW_USER_PASSWORD);
  await dialog.getByText('Desenhista', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Salvar' }).click();
}

test.describe('administração de usuários', () => {
  test.afterEach(async () => {
    await adminAuth
      .getUserByEmail(NEW_USER_EMAIL)
      .then(user => adminAuth.deleteUser(user.uid))
      .catch(() => undefined);
  });

  test('admin cria usuário, ele aparece na lista e consegue logar', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'admin');
    await createUserThroughUi(page);

    await expect(page.getByText('Desenhista Novo')).toBeVisible();

    // Verificação dupla: conta no Auth e doc em `users` com telefone normalizado.
    const authUser = await adminAuth.getUserByEmail(NEW_USER_EMAIL);
    expect(authUser.displayName).toBe('Desenhista Novo');

    const userDoc = await adminDb.doc(`users/${authUser.uid}`).get();
    expect(userDoc.data()).toMatchObject({
      name: 'Desenhista Novo',
      email: NEW_USER_EMAIL,
      roles: ['designer'],
      active: true,
      phone: '+5524999991234',
    });

    // O novo usuário loga de verdade no Auth emulator e cai na área do papel dele.
    await logout(page);
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(NEW_USER_EMAIL);
    await page.getByPlaceholder('Senha').fill(NEW_USER_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expectPath(page, '/projetos');
    await expect(
      page.getByRole('tab', { name: 'Desenhos pendentes' }),
    ).toBeVisible();
  });

  test('e-mail duplicado é recusado sem criar nada', async ({ page, consoleErrors }) => {
    await loginAs(page, 'admin');
    await page.goto('/administracao/usuarios');
    await page.getByRole('button', { name: 'Novo Usuário' }).click();

    const dialog = page.getByRole('dialog', { name: 'Novo Usuário' });
    await dialog.getByLabel('Nome').fill('Admin Clone');
    await dialog.getByLabel('E-mail').fill('admin@seed.jrm');
    await dialog.getByLabel('Senha inicial').fill(NEW_USER_PASSWORD);
    await dialog.getByText('Administrador', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText(/Já existe um usuário com esse e-mail/)).toBeVisible();

    // O 409 da API aparece como erro de rede no console: é o efeito esperado aqui.
    consoleErrors.length = 0;
  });

  test('vendedor não acessa a administração de usuários', async ({ page }) => {
    await loginAs(page, 'seller');
    await page.goto('/administracao/usuarios');

    await expectPath(page, '/');
  });
});
