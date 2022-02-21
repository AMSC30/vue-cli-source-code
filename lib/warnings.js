const chalk = require('chalk')

module.exports = {
  // 官方目前默认2.0 故不用强制定义-2.0
  v2SuffixTemplatesDeprecated (template, name) {
    const initCommand = 'vue init ' + template.replace('-2.0', '') + ' ' + name

    console.log(chalk.red('  This template is deprecated, as the original template now uses Vue 2.0 by default.'))
    console.log()
    console.log(chalk.yellow('  Please use this command instead: ') + chalk.green(initCommand))
    console.log()
  },
  // 提示默认2.0模板
  v2BranchIsNowDefault (template, name) {
    const vue1InitCommand = 'vue init ' + template + '#1.0' + ' ' + name

    console.log(chalk.green('  This will install Vue 2.x version of the template.'))
    console.log()
    console.log(chalk.yellow('  For Vue 1.x use: ') + chalk.green(vue1InitCommand))
    console.log()
  }
}
