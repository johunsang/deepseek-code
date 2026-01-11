import { defineConfig } from 'tsup';

export default defineConfig([
  // 라이브러리 빌드
  {
    entry: {
      index: 'src/index.ts',
      types: 'src/types.ts',
      llm: 'src/llm.ts',
      'tools/index': 'src/tools/index.ts',
      'agent/index': 'src/agent/index.ts',
      models: 'src/models.ts',
      server: 'src/server.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['@anthropic-ai/sdk'],
  },
  // CLI 빌드
  {
    entry: {
      cli: 'src/cli.ts',
    },
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  // Worker 빌드
  {
    entry: {
      worker: 'src/worker.ts',
    },
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: false,
  },
]);
