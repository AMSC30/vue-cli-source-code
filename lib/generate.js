const chalk = require('chalk')
// 静态网页生成
const Metalsmith = require('metalsmith')
// 模板引擎
const Handlebars = require('handlebars')
const async = require('async')
// 模板引擎解析渲染器
const render = require('consolidate').handlebars.render
const path = require('path')
// 多个条件匹配
const multimatch = require('multimatch')
const getOptions = require('./options')
const ask = require('./ask')
const filter = require('./filter')
const logger = require('./logger')

// register handlebars helper
Handlebars.registerHelper('if_eq', function (a, b, opts) {
  return a === b
    ? opts.fn(this)
    : opts.inverse(this)
})

Handlebars.registerHelper('unless_eq', function (a, b, opts) {
  return a === b
    ? opts.inverse(this)
    : opts.fn(this)
})

/**
 * Generate a template given a `src` and `dest`.
 *
 * @param {String} name
 * @param {String} src
 * @param {String} dest
 * @param {Function} done
 */

module.exports = function generate (name, src, dest, done) {
  // 读取配置项入口
  const opts = getOptions(name, src)
  console.log('getOptions', opts)
  // metalsmith初始化
  const metalsmith = Metalsmith(path.join(src, 'template'))

  // 配置项合并
  const data = Object.assign(metalsmith.metadata(), {
    destDirName: name,
    inPlace: dest === process.cwd(),
    noEscape: true
  })

  // 配置对象
  opts.helpers && Object.keys(opts.helpers).map(key => {
    Handlebars.registerHelper(key, opts.helpers[key])
  })

  const helpers = { chalk, logger }

  // 调用before钩子
  if (opts.metalsmith && typeof opts.metalsmith.before === 'function') {
    opts.metalsmith.before(metalsmith, opts, helpers)
    console.log('metalsmith before')
  }

  // 询问
  metalsmith.use(askQuestions(opts.prompts))
    // 配置过滤
    .use(filterFiles(opts.filters))
    .use(renderTemplateFiles(opts.skipInterpolation))


  // 直接执行（ms为函数，直接执行）
  // 有after配置的 执行after钩子
  if (typeof opts.metalsmith === 'function') {
    opts.metalsmith(metalsmith, opts, helpers)
    console.log('metalsmith exec')
  } else if (opts.metalsmith && typeof opts.metalsmith.after === 'function') {
    opts.metalsmith.after(metalsmith, opts, helpers)
    console.log('metalsmith after')
  }

  metalsmith.clean(false)
    .source('.') // start from template root instead of `./src` which is Metalsmith's default for `source`
    .destination(dest)
    .build((err, files) => {
      done(err)
      // 结尾后执行complete回调
      if (typeof opts.complete === 'function') {
        const helpers = { chalk, logger, files }
        opts.complete(data, helpers)
        console.log('metalsmith complete')
      } else {
        // 有completeMessage 完成调用logMessage
        logMessage(opts.completeMessage, data)
      }
    })

  return data
}

/**
 * Create a middleware for asking questions.
 *
 * @param {Object} prompts
 * @return {Function}
 */

// 用户交互入口
function askQuestions (prompts) {
  return (files, metalsmith, done) => {
    // 自定义函数
    ask(prompts, metalsmith.metadata(), done)
  }
}

/**
 * Create a middleware for filtering files.
 *
 * @param {Object} filters
 * @return {Function}
 */

function filterFiles (filters) {
  return (files, metalsmith, done) => {
    // 过滤自定义函数
    filter(files, filters, metalsmith.metadata(), done)
  }
}

/**
 * Template in place plugin.
 *
 * @param {Object} files
 * @param {Metalsmith} metalsmith
 * @param {Function} done
 */

function renderTemplateFiles (skipInterpolation) {
  // 确保传入数组
  skipInterpolation = typeof skipInterpolation === 'string'
    ? [skipInterpolation]
    : skipInterpolation
  return (files, metalsmith, done) => {
    const keys = Object.keys(files)
    const metalsmithMetadata = metalsmith.metadata()
    async.each(keys, (file, next) => {
      // 进入异步处理每个文件
      // skipInterpolation - 要跳过的文件
      // skipping files with skipInterpolation option
      if (skipInterpolation && multimatch([file], skipInterpolation, { dot: true }).length) {
        return next()
      }
      // 内容字符串
      const str = files[file].contents.toString()
      // do not attempt to render files that do not have mustaches
      if (!/{{([^{}]+)}}/g.test(str)) {
        return next()
      }

      // 渲染文件
      render(str, metalsmithMetadata, (err, res) => {
        if (err) {
          err.message = `[${file}] ${err.message}`
          return next(err)
        }
        files[file].contents = new Buffer(res)
        next()
      })
    }, done)
  }
}

/**
 * Display template complete message.
 *
 * @param {String} message
 * @param {Object} data
 */

function logMessage (message, data) {
  if (!message) return
  render(message, data, (err, res) => {
    if (err) {
      console.error('\n   Error when rendering template complete message: ' + err.message.trim())
    } else {
      console.log('\n' + res.split(/\r?\n/g).map(line => '   ' + line).join('\n'))
    }
  })
}
