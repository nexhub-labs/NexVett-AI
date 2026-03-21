import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['api/index.ts'],
    format: ['esm'],
    target: 'node22',
    bundle: true,
    splitting: false,
    sourcemap: false,
    clean: true,
    outDir: 'dist',
    noExternal: [/^(?!node:).*/],  // bundle everything except Node built-ins
})
