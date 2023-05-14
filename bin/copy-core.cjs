#!/usr/bin/env node

const path = require('path')
const copyDir = require('./copy.cjs')

const srcPath = path.resolve(__dirname, '../live2d')
console.log(process.env)
copyDir(srcPath, 'live2d')
