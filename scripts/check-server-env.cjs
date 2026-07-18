const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const { loadEnvConfig } = require('@next/env');

const REQUIRED_SERVER_ENV = JSON.parse(
  readFileSync(
    join(__dirname, '../src/services/required-server-env.json'),
    'utf8',
  ),
);

function findMissingServerEnv(env) {
  return REQUIRED_SERVER_ENV.filter(name => !env[name]?.trim());
}

function assertBuildServerEnv(env) {
  const missing = findMissingServerEnv(env);
  if (missing.length > 0) {
    throw new Error(
      `Build bloqueado: variaveis de ambiente ausentes: ${missing.join(', ')}.`,
    );
  }
}

if (require.main === module) {
  loadEnvConfig(process.cwd());
  assertBuildServerEnv(process.env);
}

module.exports = {
  REQUIRED_SERVER_ENV,
  assertBuildServerEnv,
  findMissingServerEnv,
};
