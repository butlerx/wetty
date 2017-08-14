#! /usr/bin/env node
require('@std/esm');
require('./cli');
module.exports = require('./wetty').default;
