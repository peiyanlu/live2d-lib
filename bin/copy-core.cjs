#!/usr/bin/env node

const path = require('path')
const copyDir = require('./copy.cjs')

const srcPath = path.resolve(__dirname, '../live2d')

copyDir(srcPath, 'live2d')
