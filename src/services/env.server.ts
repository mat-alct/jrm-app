import requiredServerEnv from './required-server-env.json';

/**
 * Validacao das variaveis de ambiente exigidas pelo servidor.
 *
 * Um segredo ausente so aparecia quando um cliente tentava entrar no portal:
 * o request estourava 500 no meio do fluxo. `assertServerEnv` roda no boot
 * (via `src/instrumentation.ts`) para o processo falhar antes de servir.
 */

export type ServerEnv = Record<string, string | undefined>;

/**
 * Toda chave aqui precisa existir tambem no `.env.example` — o contrato e
 * verificado em `src/tests/services/env.server.spec.ts`.
 */
export const REQUIRED_SERVER_ENV = requiredServerEnv;

export type RequiredServerEnvKey = (typeof REQUIRED_SERVER_ENV)[number];

export class MissingServerEnvError extends Error {
  missing: string[];

  constructor(missing: string[]) {
    super(
      `Variaveis de ambiente obrigatorias ausentes: ${missing.join(', ')}. ` +
        'Defina-as no .env (veja .env.example).',
    );
    this.name = 'MissingServerEnvError';
    this.missing = missing;
  }
}

/**
 * `.env.example` traz as chaves com valor vazio, e um `.env` copiado dele
 * mantem esse vazio. String em branco conta como ausente.
 */
function readEnv(name: string, env: ServerEnv): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

export function requireServerEnv(
  name: string,
  env: ServerEnv = process.env,
): string {
  const value = readEnv(name, env);
  if (!value) {
    throw new MissingServerEnvError([name]);
  }
  return value;
}

export function findMissingServerEnv(env: ServerEnv = process.env): string[] {
  return REQUIRED_SERVER_ENV.filter(name => !readEnv(name, env));
}

export function assertServerEnv(env: ServerEnv = process.env): void {
  const missing = findMissingServerEnv(env);
  if (missing.length > 0) {
    throw new MissingServerEnvError(missing);
  }
}
