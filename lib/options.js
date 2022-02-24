const path = require('path')
// 读取元数据参数
const metadata = require('read-metadata')
const exists = require('fs').existsSync
// 获取本地git配置
const getGitUser = require('./git-user')
// npm包校验器
const validateName = require('validate-npm-package-name')

/**
 * Read prompts metadata.
 *
 * @param {String} dir
 * @return {Object}
 */

// 获取元配置文件 => name设置校验 => 和本地git作者信息做合并

module.exports = function options(name, dir) {
    // 获取配置元数据
    const opts = getMetadata(dir)

    setDefault(opts, 'name', name)
    setValidateName(opts)

    const author = getGitUser()
    if (author) {
        setDefault(opts, 'author', author)
    }

    return opts
}

/**
 * Gets the metadata from either a meta.json or meta.js file.
 *
 * @param  {String} dir
 * @return {Object}
 */

function getMetadata(dir) {
    const json = path.join(dir, 'meta.json')
    const js = path.join(dir, 'meta.js')
    let opts = {}

    if (exists(json)) {
        // 如果存在json，优先使用json
        opts = metadata.sync(json)
    } else if (exists(js)) {
        const req = require(path.resolve(js))
        if (req !== Object(req)) {
            throw new Error('meta.js needs to expose an object')
        }
        opts = req
    }

    return opts
}

/**
 * Set the default value for a prompt question
 *
 * @param {Object} opts
 * @param {String} key
 * @param {String} val
 */

function setDefault(opts, key, val) {
    if (opts.schema) {
        opts.prompts = opts.schema
        delete opts.schema
    }
    const prompts = opts.prompts || (opts.prompts = {})
    // 如果不存在指定的prompt，重新定义
    if (!prompts[key] || typeof prompts[key] !== 'object') {
        prompts[key] = {
            type: 'string',
            default: val
        }
    } else {
        // 如果存在，将传入的作为默认值
        prompts[key]['default'] = val
    }
}

function setValidateName(opts) {
    const name = opts.prompts.name
    const customValidate = name.validate
    name.validate = name => {
        const its = validateName(name)
        if (!its.validForNewPackages) {
            const errors = (its.errors || []).concat(its.warnings || [])
            return 'Sorry, ' + errors.join(' and ') + '.'
        }
        if (typeof customValidate === 'function') return customValidate(name)
        return true
    }
}
