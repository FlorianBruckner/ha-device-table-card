import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { rollupAdapter } from '@web/dev-server-rollup';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
  files: 'src/**/*.test.ts',
  nodeResolve: true,
  browsers: [playwrightLauncher({ product: 'chromium' })],
  plugins: [
    rollupAdapter(
      commonjs({
        include: /node_modules/,
      }),
    ),
    rollupAdapter(
      nodeResolve({
        browser: true,
        preferBuiltins: false,
      }),
    ),
    esbuildPlugin({
      ts: true,
      target: 'auto',
      tsconfig: './tsconfig.json',
      loaders: { '.css': 'text' },
    }),
  ],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '2000',
    },
  },
};
