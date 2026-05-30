module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    'metagame-evolution.js',
    'season-tournament.js',
    'synergy-cascade.js',
    'replay-analysis.js',
    'chronicle-campaign.js',
    'energy-tuning.js',
    'deck-archetype-evolution.js',
    'adaptive-difficulty.js',
    'card-portfolio-system.js'
  ],
  coverageThreshold: {
    global: {
      branches: 82,
      functions: 95,
      lines: 95,
      statements: 94
    }
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules/']
};