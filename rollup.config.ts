import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import { readFileSync } from 'fs'
import { defineConfig, RollupOptions } from 'rollup'
import dts from 'rollup-plugin-dts'
import esbuild, { minify } from 'rollup-plugin-esbuild'
import nodePolyfills from 'rollup-plugin-polyfill-node'


const input = './src/main.ts'
const inputIife = './src/main.iife.ts'
const iifeExternal = readFileSync('./live2d/core/live2dCubismCore.min.js', 'utf-8')

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

const { author, description, name, version } = JSON.parse(readFileSync(
  new URL('./package.json', import.meta.url),
  'utf8',
))

const banner = `/**\n * name: ${ name }\n * version: v${ version }\n * description: ${ description }\n * author: ${ author }\n * Copyright 2023-present\n * Released under the MIT License.\n */`


const esm: RollupOptions = {
  input,
  output: [
    {
      file: 'lib/live2dWidget.esm.js',
      format: 'esm',
      exports: 'named',
      banner: banner,
      sourcemap: true,
    },
  ],
  plugins,
}

const iife: RollupOptions = {
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
}

const types: RollupOptions = {
  input,
  output: {
    file: 'lib/live2dWidget.d.ts',
    format: 'esm',
  },
  plugins: [
    dts(),
  ],
}


const config = defineConfig([])

config.push(esm)

config.push(iife)

config.push(types)


export default config


process.on('beforeExit', () => {
  console.log(`${ name }(${ version }) build complete in ${ (process.uptime()).toFixed(2) }s`)
})
