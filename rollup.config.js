import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import css from 'rollup-plugin-import-css';

export default {
  input: 'src/device-table-card.ts',
  output: {
    file: 'dist/device-table-card.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    css({
      minify: true,
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
};
