import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  assertServerEnv,
  findMissingServerEnv,
  MissingServerEnvError,
  REQUIRED_SERVER_ENV,
  requireServerEnv,
} from '@/services/env.server';

function completeEnv(): Record<string, string> {
  return Object.fromEntries(
    REQUIRED_SERVER_ENV.map(name => [name, `valor-${name}`]),
  );
}

describe('services/env.server', () => {
  it('accepts an environment with every required variable', () => {
    expect(findMissingServerEnv(completeEnv())).toEqual([]);
    expect(() => assertServerEnv(completeEnv())).not.toThrow();
  });

  it('reports every missing variable at once, not just the first', () => {
    const env = completeEnv();
    delete env.CLIENT_ACCESS_SECRET;
    delete env.FIREBASE_PRIVATE_KEY;

    expect(findMissingServerEnv(env).sort()).toEqual([
      'CLIENT_ACCESS_SECRET',
      'FIREBASE_PRIVATE_KEY',
    ]);
    expect(() => assertServerEnv(env)).toThrow(MissingServerEnvError);
    expect(() => assertServerEnv(env)).toThrow(/CLIENT_ACCESS_SECRET/);
    expect(() => assertServerEnv(env)).toThrow(/FIREBASE_PRIVATE_KEY/);
  });

  it('treats blank values as missing, since .env.example ships empty keys', () => {
    const blank = { ...completeEnv(), CLIENT_ACCESS_SECRET: '' };
    const whitespace = { ...completeEnv(), CLIENT_ACCESS_SECRET: '   ' };

    expect(findMissingServerEnv(blank)).toEqual(['CLIENT_ACCESS_SECRET']);
    expect(findMissingServerEnv(whitespace)).toEqual(['CLIENT_ACCESS_SECRET']);
  });

  it('exposes the missing names on the error for callers that inspect it', () => {
    const env = completeEnv();
    delete env.FIREBASE_CLIENT_EMAIL;

    try {
      assertServerEnv(env);
      throw new Error('assertServerEnv deveria ter lancado');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingServerEnvError);
      expect((error as MissingServerEnvError).missing).toEqual([
        'FIREBASE_CLIENT_EMAIL',
      ]);
    }
  });

  describe('requireServerEnv', () => {
    it('returns the trimmed value when present', () => {
      expect(
        requireServerEnv('CLIENT_ACCESS_SECRET', {
          CLIENT_ACCESS_SECRET: '  segredo  ',
        }),
      ).toBe('segredo');
    });

    it('throws naming the variable when absent or blank', () => {
      expect(() => requireServerEnv('CLIENT_ACCESS_SECRET', {})).toThrow(
        /CLIENT_ACCESS_SECRET/,
      );
      expect(() =>
        requireServerEnv('CLIENT_ACCESS_SECRET', { CLIENT_ACCESS_SECRET: '' }),
      ).toThrow(MissingServerEnvError);
    });

    it('reads from process.env by default', () => {
      const original = process.env.CLIENT_ACCESS_SECRET;
      process.env.CLIENT_ACCESS_SECRET = 'do-process-env';

      try {
        expect(requireServerEnv('CLIENT_ACCESS_SECRET')).toBe('do-process-env');
      } finally {
        process.env.CLIENT_ACCESS_SECRET = original;
      }
    });
  });

  // Este e o teste que teria evitado o bug de producao: garante que o contrato
  // entre codigo e documentacao de setup nao saia de sincronia.
  it('documents every required variable in .env.example', () => {
    const example = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
    const documented = new Set(
      example
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split('=')[0].trim()),
    );

    const undocumented = REQUIRED_SERVER_ENV.filter(
      name => !documented.has(name),
    );

    expect(undocumented).toEqual([]);
  });
});
