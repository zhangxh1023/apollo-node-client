import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2018',
  platform: 'node',
  dts: {
    cjsReexport: true
  }
});
