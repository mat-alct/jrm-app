export async function register() {
  // register() tambem roda no runtime edge, onde os segredos do servidor nao
  // sao injetados; o modo de mocks do e2e nao fala com backend real.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PUBLIC_E2E_USE_MOCKS === '1') return;

  const { assertServerEnv } = await import('./services/env.server');
  assertServerEnv();
}
