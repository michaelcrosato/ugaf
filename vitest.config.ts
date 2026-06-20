import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@kernel': r('./src/kernel'),
      '@sdk': r('./src/sdk'),
      '@modules': r('./src/modules'),
      '@world': r('./src/world'),
      '@narrator': r('./src/narrator'),
      '@proctor': r('./src/proctor'),
      '@gates': r('./src/gates'),
    },
  },
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 20000,
  },
});
