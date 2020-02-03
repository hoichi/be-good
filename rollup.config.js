import typescript from '@rollup/plugin-node-resolve'
import resolve from '@rollup/plugin-typescript'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/be-good.js',
    name: 'BeGood',
    sourceMap: true,
    format: 'umd',
  },
  plugins: [
    typescript(),
    resolve(),
  ]
}
