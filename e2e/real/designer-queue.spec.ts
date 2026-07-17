import './testEnv';

import { adminAuth } from '@/services/firebaseAdmin';
import { ensureAuthUser } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD } from '@/tests/helpers/seedEmulator';

import { expect, expectPath, loginAs, test } from './fixtures';

const OTHER_DESIGNER_UID = 'outro-desenhista';

test.describe('fila compartilhada de desenhos', () => {
  test.beforeEach(async ({ adminDb }) => {
    // Um segundo desenhista, com um item proprio ja assumido, para testar a fila.
    await ensureAuthUser({
      uid: OTHER_DESIGNER_UID,
      email: 'outro.desenhista@seed.jrm',
      password: SEED_USER_PASSWORD,
      displayName: 'Outro Desenhista',
    });
    await adminDb.doc(`users/${OTHER_DESIGNER_UID}`).set({
      name: 'Outro Desenhista',
      email: 'outro.desenhista@seed.jrm',
      roles: ['designer'],
      active: true,
    });

    await adminDb.doc('projects/seed-project-1/items/seed-item-1').update({
      status: 'aguardando_desenho',
      designerId: null,
      designerName: null,
    });
    await adminDb.doc('projects/seed-project-2/items/seed-item-3').update({
      designerId: OTHER_DESIGNER_UID,
      designerName: 'Outro Desenhista',
      status: 'aguardando_desenho',
    });
  });

  test.afterEach(async () => {
    await adminAuth.deleteUser(OTHER_DESIGNER_UID).catch(() => undefined);
  });

  test('o desenhista ve a fila toda, com "Atribuído a" nos itens ja assumidos', async ({
    page,
  }) => {
    await loginAs(page, 'designer');
    await expectPath(page, '/desenhista');

    await expect(page.getByText('Fila de desenhos').first()).toBeVisible();
    await expect(page.getByText('Cozinha planejada')).toBeVisible();
    await expect(page.getByText('Rack de sala')).toBeVisible();
    await expect(page.getByText('Atribuído a Outro Desenhista')).toBeVisible();
  });

  test('item de outro desenhista fica acessivel por URL direta (fila compartilhada)', async ({
    page,
  }) => {
    await loginAs(page, 'designer');

    await page.goto('/projetos/seed-project-2/itens/seed-item-3');

    await expect(page.getByText('Rack de sala').first()).toBeVisible();
  });

  test('o desenhista consegue abrir o proprio item pela fila', async ({ page }) => {
    await loginAs(page, 'designer');

    await page.getByText('Cozinha planejada').click();

    await expectPath(page, '/projetos/seed-project-1/itens/seed-item-1');
    await expect(page.getByText('Cozinha planejada').first()).toBeVisible();
  });

  test('o desenhista assume um item sem desenhista atribuido', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'designer');
    await expectPath(page, '/desenhista');

    const queueRow = page
      .locator('div', { has: page.getByText('Cozinha planejada') })
      .first();
    await queueRow.getByRole('button', { name: 'Assumir' }).click();

    await expect(page.getByText('Atribuído a você')).toBeVisible();

    const snap = await adminDb
      .doc('projects/seed-project-1/items/seed-item-1')
      .get();
    expect(snap.data()).toMatchObject({ designerId: 'seed-designer' });
  });
});
