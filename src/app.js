#!/usr/bin/env node

const app = require('caporal');
const Ora = require('ora');
const pjson = require('../package.json');
const Dodgem = require('./Dodgem');
const inquirer = require('inquirer');
const Preferences = require('preferences');

const credentials = new Preferences('com.jamieweavis.dodgem');

async function login() {
  new Ora('Please enter login credentials for Rocket League Garage').info();
  await inquirer
    .prompt([
      {
        name: 'emailAddress',
        message: 'Email Address:'
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:'
      }
    ])
    .then(async data => {
      credentials.emailAddress = data.emailAddress;
      credentials.password = data.password;
      credentials.save();
      new Ora('Rocket League Garage login credentials saved').succeed();
    });
}

async function start() {
  if (!credentials.emailAddress || !credentials.password) {
    await login();
  }
  const dodgem = new Dodgem(credentials);
  await dodgem.init();
  await dodgem.login();
  const tradeUrls = await dodgem.scrapeTrades();
  await dodgem.bumpTrades(tradeUrls);
  await dodgem.delayBumpTrades();
}

app
  .version(pjson.version)
  .help(`🎪  Dodgem - ${pjson.description} - v${pjson.version}`)

  // Bump command
  .command('start', 'Start bumping the specified target every interval')
  .action(start)

  // Login command
  .command('login', 'Set login credentials for Rocket League Garage')
  .action(login);

app.parse(process.argv);
