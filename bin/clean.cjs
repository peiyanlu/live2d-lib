#!/usr/bin/env node

const chalk = require('chalk')
const fs = require('fs')
const path = require('path')

const argv = process.argv.slice(2)

switch (argv[0]) {
  case '--dir':
    rmdirSync(argv[1])
    break
  default:
    rmdirSync('lib')
    break
}

/**
 * 删除文件夹
 * @param {*} url
 */
function rmdirSync(url) {
  const log = () => console.log(chalk.green('clean complete'), chalk.gray(`> ${ url }`))

  url = path.resolve(__dirname, '../', url)
  let files = []
  /**
   * 判断给定的路径是否存在
   */
  const exists = fs.existsSync(url)
  if (!exists) return log()

  /**
   * 返回文件和子目录的数组
   */
  files = fs.readdirSync(url)
  files.forEach((file) => {
    const curPath = path.join(url, file)
    /**
     * fs.statSync同步读取文件夹文件，如果是文件夹，在重复触发函数
     */
    const st = fs.statSync(curPath)
    if (st.isDirectory()) { // recurse
      rmdirSync(curPath)
    } else {
      fs.unlinkSync(curPath)
    }
  })
  /**
   * 清除文件夹
   */
  fs.rmdirSync(url)

  log()
}
