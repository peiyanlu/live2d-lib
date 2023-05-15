import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import { readFileSync } from 'fs'
import { defineConfig, RollupOptions } from 'rollup'
import dts from 'rollup-plugin-dts'
import esbuild, { minify } from 'rollup-plugin-esbuild'
import nodePolyfills from 'rollup-plugin-polyfill-node'

const start = process.hrtime()

const input = './src/main.ts'
const inputIife = './src/main.iife.ts'
const iifeExternal = readFileSync('./live2d/core/live2dCubismCore.min.js')
const plugins = [
  alias({
    entries: [
      {
        find: '@framework',
        replacement: '../framework',
      },
    ],
  }),
  nodeResolve(),
  commonjs(),
  esbuild(),
  nodePolyfills(),
  minify(),
  json(),
]

const { author, description, name, version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

const banner = `/**\n * name: ${ name }\n * version: v${ version }\n * description: ${ description }\n * author: ${ author }\n * Copyright 2023-present\n * Released under the MIT License.\n */`

export default defineConfig([
  {
    input,
    output: [
      {
        file: 'lib/live2dWidget.esm.js',
        format: 'esm',
        exports: 'named',
        // intro: iifeExternal,
        banner: banner,
        sourcemap: true,
      },
    ],
    plugins,
  },
  {
    input: inputIife,
    output: [
      {
        file: 'lib/live2dWidget.iife.js',
        format: 'iife',
        name: 'Live2dWidget',
        intro: iifeExternal,
        banner: banner,
        sourcemap: true,
      },
    ],
    plugins,
  },
  {
    input,
    output: {
      file: 'lib/live2dWidget.d.ts',
      format: 'esm',
    },
    plugins: [
      dts(),
    ],
  },
] as RollupOptions[])

process.on('beforeExit', () => {
  const [ s, ns ] = process.hrtime(start)
  console.log(`build complete in ${ (s + ns / 1000000000).toFixed(2) }s`)
})
