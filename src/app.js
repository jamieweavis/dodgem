#!/usr/bin/env node

const app = require('caporal');
const pjson = require('../package.json');
const startCommand = require('./commands/startCommand');
const loginCommand = require('./commands/loginCommand');

app
  // App data
  .version(pjson.version)
  .help(`🎪  Dodgem - ${pjson.description} - v${pjson.version}`)
  // Bump command
  .command(startCommand.name, startCommand.description)
  .action(startCommand.action)
  // Login command
  .command(loginCommand.name, loginCommand.description)
  .action(loginCommand.action);

app.parse(process.argv);
