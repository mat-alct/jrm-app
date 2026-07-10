const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/integration/**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['<rootDir>/src/tests/helpers/jestEmulatorEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/helpers/jestIntegrationTeardown.ts'],
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/pages/api/**/*.ts',
    '!src/**/*.spec.ts',
  ],
  coverageReporters: ['json-summary', 'text-summary'],
  coverageDirectory: 'coverage-integration',
  // Piso da camada que fala com Firestore/Storage/Auth de verdade.
  coverageThreshold: {
    global: {
      lines: 75,
      branches: 60,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
