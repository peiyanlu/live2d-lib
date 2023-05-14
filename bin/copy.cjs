const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const mkdirp = require('mkdirp')

const count = process.cwd().includes('node_modules') ? process.cwd().includes('.pnpm') ? 5 : 2 : 0
const distPath = (dir) => path.resolve(process.cwd(), '../'.repeat(count), 'public', dir)

const task = []

const readDir = (src, dst) => {
  const exists = fs.existsSync(dst)
  if (!exists) mkdirp.sync(dst)

  // 读取目录
  const paths = fs.readdirSync(src)

  paths.forEach((path) => {
    const _src = src + '/' + path
    const _dist = dst + '/' + path

    const st = fs.statSync(_src)

    if (st.isFile()) {
      task.push({ _src, _dist })
    } else if (st.isDirectory()) {
      readDir(_src, _dist)
    }
  })
}

const copyFile = (dir) => {
  const { _src, _dist: _dist } = dir
  return new Promise((resolve, reject) => {
    const readable = fs.createReadStream(_src)// 创建读取流
    const writable = fs.createWriteStream(_dist)// 创建写入流
    readable.pipe(writable)
    writable.on('finish', () => resolve('finish'))
    writable.on('error', () => reject('error'))
  })
}

const copyDir = (srcDir, distDir) => {
  readDir(srcDir, distPath(distDir))
  Promise.all(task.map(item => copyFile(item)))
    .then(_ => console.log(chalk.green('copy complete'), chalk.gray(`> ${ srcDir } --> ${ distPath(distDir) }`)))
    .catch(_ => console.log(chalk.red('copy unfinished'), chalk.gray(`> ${ srcDir } --> ${ distPath(distDir) }`)))
}

module.exports = copyDir
