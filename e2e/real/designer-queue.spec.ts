import './testEnv';

import { adminAuth } from '@/services/firebaseAdmin';
import { ensureAuthUser } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD } from '@/tests/helpers/seedEmulator';

import { expect, expectPath, loginAs, test } from './fixtures';

const OTHER_DESIGNER_UID = 'outro-desenhista';

test.describe('fila do desenhista', () => {
  test.beforeEach(async ({ adminDb }) => {
    // Um segundo desenhista, com um item próprio, para provar o isolamento da fila.
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

  test('o desenhista vê apenas os itens atribuídos a ele', async ({ page }) => {
    await loginAs(page, 'designer');
    await expectPath(page, '/desenhista');

    await expect(page.getByText('Minha Fila').first()).toBeVisible();
    await expect(page.getByText('Cozinha planejada')).toBeVisible();

    // "Rack de sala" pertence ao outro desenhista.
    await expect(page.getByText('Rack de sala')).toHaveCount(0);
  });

  test('item de outro desenhista é inacessível por URL direta', async ({ page }) => {
    await loginAs(page, 'designer');

    await page.goto('/projetos/seed-project-2/itens/seed-item-3');

    // A regra do Firestore nega o get; a página não mostra o item.
    await expect(page.getByText('Rack de sala')).toHaveCount(0);
  });

  test('o desenhista consegue abrir o próprio item pela fila', async ({ page }) => {
    await loginAs(page, 'designer');

    await page.getByText('Cozinha planejada').click();

    await expectPath(page, '/projetos/seed-project-1/itens/seed-item-1');
    await expect(page.getByText('Cozinha planejada').first()).toBeVisible();
  });
});
