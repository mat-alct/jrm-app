export async function register() {
  // register() tambem roda no runtime edge, onde os segredos do servidor nao
  // sao injetados; contra o emulador nao existem credenciais de producao.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.USE_FIREBASE_EMULATORS === '1') return;

  const { assertServerEnv } = await import('./services/env.server');
  assertServerEnv();
}
