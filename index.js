/* eslint-disable */
require = require('@std/esm')(module, {
  cjs: 'true',
  esm: 'js',
});
const wetty = require('./lib/index.mjs').default;
module.exports = wetty.wetty;

/**
 * Check if being run by cli or require
 */
if (require.main === module) wetty.init();
