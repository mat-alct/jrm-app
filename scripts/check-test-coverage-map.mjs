#!/usr/bin/env node
/**
 * Guard-rail de CI (PLANO-DE-TESTES.md, fase 8):
 *
 * 1. Todo arquivo em `src/services/**` e `src/pages/api/**` precisa ser importado
 *    por pelo menos um spec — caso contrário alguém adicionou código que fala com
 *    o Firebase sem rede de proteção.
 * 2. Testes não podem usar `waitForTimeout`, `test.only`/`it.only`/`describe.only`,
 *    nem `page.route` fora de `e2e/real/error-paths.spec.ts`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

/**
 * Isenções de spec DEDICADO, cada uma com o motivo. Não é permissão para não
 * testar: todo item abaixo é exercitado por outra suíte.
 */
const EXEMPT = new Map([
  ['src/services/firebase.ts', 'inicialização do SDK; exercitada por toda a integração'],
  ['src/services/firebaseAdmin.ts', 'inicialização do Admin SDK; idem'],
  [
    'src/services/projects/clientActionRoute.server.ts',
    'wrapper das rotas approve-item/reject-item/request-change, cobertas em tests/integration/api/clientAccess.spec.ts',
  ],
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(relative(ROOT, full));
    }
  }
  return out;
}

function readAll(dirs) {
  return dirs
    .flatMap(dir => walk(join(ROOT, dir)))
    .map(file => ({ file, content: readFileSync(join(ROOT, file), 'utf8') }));
}

const specs = readAll(['src/tests', 'e2e']);
const specBlob = specs.map(spec => spec.content).join('\n');

const sources = [...walk(join(ROOT, 'src/services')), ...walk(join(ROOT, 'src/pages/api'))]
  .filter(file => !file.endsWith('.d.ts'))
  .filter(file => !EXEMPT.has(file));

const errors = [];

for (const file of sources) {
  // `src/services/projects/status.service.ts` → `projects/status.service`
  const withoutExt = file.replace(/\.tsx?$/, '');
  const importPath = withoutExt
    .replace(/^src\/pages\/api\//, '')
    .replace(/^src\/services\//, '');
  const moduleName = importPath.split('/').pop();

  const referenced =
    specBlob.includes(withoutExt.replace('src/', '@/')) ||
    specBlob.includes(`/${importPath}'`) ||
    specBlob.includes(`/${moduleName}'`);

  if (!referenced) {
    errors.push(`sem spec correspondente: ${file}`);
  }
}

const FORBIDDEN = [
  { pattern: /waitForTimeout/, message: 'waitForTimeout é proibido (use asserções web-first)' },
  { pattern: /\b(test|it|describe)\.only\b/, message: '.only não pode ir para o repositório' },
];

for (const { file, content } of specs) {
  for (const { pattern, message } of FORBIDDEN) {
    if (pattern.test(content)) errors.push(`${file}: ${message}`);
  }

  if (/page\.route\(/.test(content) && !file.endsWith('e2e/real/error-paths.spec.ts')) {
    errors.push(`${file}: page.route só é permitido em e2e/real/error-paths.spec.ts`);
  }
}

if (errors.length > 0) {
  console.error('Guard-rails de teste falharam:\n');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `OK: ${sources.length} arquivos de service/API com spec; nenhum padrão proibido nos testes.`,
);
