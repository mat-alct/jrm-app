import './testEnv';

import { expect, Page, test as base } from '@playwright/test';

import { adminDb, adminStorage } from '@/services/firebaseAdmin';
import { resetEmulator } from '@/tests/helpers/emulator';
import { seedEmulator, SEED_USER_PASSWORD } from '@/tests/helpers/seedEmulator';

export type SeedRole =
  | 'admin'
  | 'seller'
  | 'designer'
  | 'assembler'
  | 'woodworker';

export const SEED_EMAILS: Record<SeedRole, string> = {
  admin: 'admin@seed.jrm',
  seller: 'vendedor@seed.jrm',
  designer: 'desenhista@seed.jrm',
  assembler: 'montador@seed.jrm',
  woodworker: 'marceneiro@seed.jrm',
};

/**
 * Login real pela UI. Nao usamos `storageState` porque o fixture `resetAndSeed`
 * apaga as contas do Auth antes de cada teste, invalidando qualquer sessao salva
 * (ver docs/PLANO-DE-TESTES.md, secao 14.3).
 */
export async function loginAs(page: Page, role: SeedRole): Promise<void> {
  await page.goto('/login');

  // O AuthProvider mostra um loader antes de decidir. Esperamos o estado final:
  // ou o formulário de login, ou a home do papel já logado (troca de usuário).
  const emailField = page.getByPlaceholder('Email');
  const signOutLink = page.getByRole('link', { name: 'Sair' });
  await expect(emailField.or(signOutLink).first()).toBeVisible();

  if (await signOutLink.isVisible()) {
    await logout(page);
    await page.goto('/login');
  }

  await emailField.fill(SEED_EMAILS[role]);
  await page.getByPlaceholder('Senha').fill(SEED_USER_PASSWORD);

  // O redirect dispara assim que o onAuthStateChanged roda — antes de /api/login
  // terminar de gravar o cookie de sessão. Esperar a resposta evita a corrida.
  const sessionCreated = page.waitForResponse(
    response => response.url().includes('/api/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar' }).click();
  await sessionCreated;

  await expect(page).not.toHaveURL(/\/login$/);
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Sair' }).click();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
}

/** Caminho da URL atual, para asserções de redirect por papel. */
export function pathname(page: Page): string {
  return new URL(page.url()).pathname;
}

export async function expectPath(page: Page, expected: string): Promise<void> {
  await expect.poll(() => pathname(page)).toBe(expected);
}

type Fixtures = {
  resetAndSeed: void;
  adminDb: typeof adminDb;
  adminStorage: typeof adminStorage;
  /** Erros de console coletados; um teste pode limpar entradas esperadas. */
  consoleErrors: string[];
};

/**
 * Erros de console tolerados: ruido do Next em modo dev, que nao indica bug do app.
 * Manter a lista curta (principio 7 do plano).
 */
const ALLOWED_CONSOLE_ERRORS = [
  /Download the React DevTools/,
  /\[Fast Refresh\]/,
  // O reset do emulador entre testes derruba a conexão do Firestore por um instante;
  // o SDK reconecta sozinho. É ruído de infraestrutura do teste, não do app.
  /Could not reach Cloud Firestore backend/,
];

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  consoleErrors: async ({}, use) => {
    await use([]);
  },
  resetAndSeed: [
    async ({ page, consoleErrors }, use) => {
      page.on('pageerror', error => consoleErrors.push(error.message));
      page.on('console', message => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (ALLOWED_CONSOLE_ERRORS.some(pattern => pattern.test(text))) return;
        consoleErrors.push(text);
      });

      await resetEmulator();
      await seedEmulator();
      await use();

      expect(consoleErrors).toEqual([]);
    },
    { auto: true },
  ],
  adminDb: async ({}, use) => {
    await use(adminDb);
  },
  adminStorage: async ({}, use) => {
    await use(adminStorage);
  },
});

export { expect, SEED_USER_PASSWORD };
