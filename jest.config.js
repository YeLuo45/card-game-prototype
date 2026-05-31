module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/battle-simulator.js',
    'src/battle-replay.js',
    'src/key-turn-marker.js',
    'src/tactical-analyzer.js',
    'src/replay-ui.js',
    'src/deck-evolution-tracker.js',
    'src/card-synergy-mapper.js',
    'src/meta-adaptation-engine.js',
    'src/deck-optimizer.js',
    'metagame-evolution.js',
    'season-tournament.js',
    'synergy-cascade.js',
    'replay-analysis.js',
    'chronicle-campaign.js',
    'energy-tuning.js',
    'deck-archetype-evolution.js',
    'adaptive-difficulty.js',
    'src/card-material-registry.js',
    'src/card-upgrader.js',
    'src/material-exchange.js',
    'src/crafting-ui.js'
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
    }
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules/']
};