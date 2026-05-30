module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'metagame-evolution.js',
    'synergy-cascade.js',
    'replay-analysis.js',
    'chronicle-campaign.js',
    'energy-tuning.js'
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20
    },
    './chronicle-campaign.js': {
      branches: 75,
      functions: 95,
      lines: 88,
      statements: 87
    }
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules/']
};