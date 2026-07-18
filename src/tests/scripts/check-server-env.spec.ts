import { REQUIRED_SERVER_ENV as runtimeRequiredEnv } from '@/services/env.server';

const {
  REQUIRED_SERVER_ENV: buildRequiredEnv,
  assertBuildServerEnv,
  findMissingServerEnv,
} = require('../../../scripts/check-server-env.cjs') as {
  REQUIRED_SERVER_ENV: string[];
  assertBuildServerEnv: (env: Record<string, string | undefined>) => void;
  findMissingServerEnv: (
    env: Record<string, string | undefined>,
  ) => string[];
};

function completeEnv(): Record<string, string> {
  return Object.fromEntries(
    buildRequiredEnv.map(name => [name, `valor-${name}`]),
  );
}

describe('scripts/check-server-env', () => {
  it('usa o mesmo contrato de variaveis validado no runtime', () => {
    expect(buildRequiredEnv).toEqual(runtimeRequiredEnv);
  });

  it('bloqueia o build quando CLIENT_ACCESS_SECRET nao existe', () => {
    const env = completeEnv();
    delete env.CLIENT_ACCESS_SECRET;

    expect(findMissingServerEnv(env)).toEqual(['CLIENT_ACCESS_SECRET']);
    expect(() => assertBuildServerEnv(env)).toThrow(/CLIENT_ACCESS_SECRET/);
  });

  it('permite o build quando todas as variaveis existem', () => {
    expect(() => assertBuildServerEnv(completeEnv())).not.toThrow();
  });
});
