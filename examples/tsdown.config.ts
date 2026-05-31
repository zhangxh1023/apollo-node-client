import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./*.ts', '!./tsdown.config.ts'],
  format: ['esm', 'cjs'],
  target: 'es2018',
  platform: 'node',
  dts: false
});
