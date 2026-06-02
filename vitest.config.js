import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['**/*.js'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.js',
        'sw.js',
        'manifest.json'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    },
    include: ['**/*.test.js'],
    testTimeout: 30000
  }
});