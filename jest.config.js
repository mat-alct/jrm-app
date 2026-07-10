const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/e2e/',
    '<rootDir>/src/tests/integration/',
    '<rootDir>/src/tests/rules/',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
    '!src/**/_app.tsx',
    '!src/**/_document.tsx',
  ],
  coverageReporters: ['lcov', 'json', 'json-summary', 'text-summary'],
  // Pisos, nunca tetos: sobem, nunca descem (secao 12 do PLANO-DE-TESTES.md).
  //
  // Atencao: quando existem thresholds por path, o `global` do Jest cobre apenas
  // o que NAO cai nos grupos abaixo — aqui, essencialmente `src/pages/**` (coberto
  // pelo e2e) e `src/services/**` (coberto pela integracao). Por isso o piso global
  // desta suite e baixo: a cobertura real dessas camadas e cobrada no
  // `jest.integration.config.js` e nas jornadas do Playwright.
  coverageThreshold: {
    global: {
      lines: 35,
      branches: 25,
    },
    './src/utils/': {
      lines: 90,
      branches: 95,
    },
    './src/components/': {
      lines: 80,
      branches: 65,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
