module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/battle-simulator.js',
    'src/combat-strategy-optimizer.js',
    'metagame-evolution.js',
    'season-tournament.js',
    'synergy-cascade.js',
    'replay-analysis.js',
    'chronicle-campaign.js',
    'energy-tuning.js',
    'deck-archetype-evolution.js',
    'adaptive-difficulty.js'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './src/battle-simulator.js': {
      branches: 78,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/combat-strategy-optimizer.js': {
      branches: 78,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules/']
};