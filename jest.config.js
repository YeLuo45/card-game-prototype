module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '*.js',
    'card-packs/*.js',
    'plugins/*.js',
    'src/**/*.js',
    '!*.test.js',
    '!sw.js',
    '!manifest.json'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};