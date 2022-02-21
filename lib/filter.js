const match = require('minimatch')
const evaluate = require('./eval')

// 经过ask获取用户需求之后 => metadata => 过滤掉不需要的模板文件

// files 模板内所有文件
// filters - 配置中的filters字段
// metadata
// done => next

module.exports = (files, filters, data, done) => {
  if (!filters) {
    return done()
  }
  const fileNames = Object.keys(files)
  Object.keys(filters).forEach(glob => {
    fileNames.forEach(file => {
      // 匹配文件名
      if (match(file, glob, { dot: true })) {
        const condition = filters[glob]
        // condition表达式不成立就删除文件
        if (!evaluate(condition, data)) {
          delete files[file]
        }
      }
    })
  })
  done()
}
