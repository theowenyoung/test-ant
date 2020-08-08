const chalk = require("chalk");
const Log = require("loglevel");
const prefix = require("loglevel-plugin-prefix");
const log = Log.getLogger("actions-plus");
const colors = {
  TRACE: chalk.magenta,
  DEBUG: chalk.cyan,
  INFO: chalk.blue,
  WARN: chalk.yellow,
  ERROR: chalk.red,
};
prefix.reg(Log);
log.setDefaultLevel("warn");
prefix.apply(log, {
  format(level, name, timestamp) {
    return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toUpperCase()](
      level
    )} ${chalk.green(`${name}:`)}`;
  },
});
module.exports = log;
