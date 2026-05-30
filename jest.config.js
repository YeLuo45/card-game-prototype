module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'metagame-evolution.js',
    'synergy-cascade.js',
    'replay-analysis.js'
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules/']
};