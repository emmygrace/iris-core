import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@gaia-tools/coeus-api-client',
    '@gaia-tools/aphrodite-core',
    '@gaia-tools/aphrodite-shared',
    'd3',
  ],
});

