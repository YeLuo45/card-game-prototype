module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/performance-metrics-collector.js',
    'src/efficiency-analyzer.js',
    'src/battle-optimizer.js',
    'src/performance-report-generator.js',
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
    'src/crafting-ui.js',
    'src/duel-room-manager.js',
    'src/duel-rules-engine.js',
    'src/duel-score-tracker.js',
    'src/duel-ui.js'
  ],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 65,
      functions: 75,
      lines: 75
    },
    './src/performance-metrics-collector.js': {
      statements: 75,
      branches: 60,
      functions: 70,
      lines: 80
    },
    './src/efficiency-analyzer.js': {
      statements: 75,
      branches: 60,
      functions: 70,
      lines: 80
    },
    './src/battle-optimizer.js': {
      statements: 75,
      branches: 60,
      functions: 75,
      lines: 75
    },
    './src/performance-report-generator.js': {
      statements: 70,
      branches: 70,
      functions: 50,
      lines: 70
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