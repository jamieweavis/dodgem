const ora = require('ora');
const Dodgem = require('../Dodgem');
const inquirer = require('inquirer');
const Preferences = require('preferences');

const credentials = new Preferences('com.jamieweavis.dodgem');
const questions = [
  {
    name: 'target',
    message: 'Bump target:',
    type: 'list',
    choices: [
      { name: 'All trades', value: 'all' },
      { name: 'Oldest trade', value: 'oldest' }
    ]
  },
  {
    name: 'interval',
    message: 'Repeat interval (minutes):',
    validate: input => {
      if (!input || !input.match(/^\d{0,2}(\.\d{1,2})?$/)) {
        return 'Please enter a valid number';
      }
      return true;
    }
  }
];

const startCommand = () => {
  if (!credentials.emailAddress || !credentials.password) {
    ora('Please set login credentials with `dodgem login`').fail();
    return;
  }
  inquirer.prompt(questions).then(async data => {
    const dodgem = new Dodgem(data.target, data.interval, credentials);
    await dodgem.init();
    await dodgem.login();
    const tradeUrls = await dodgem.scrapeTrades();
    await dodgem.bumpTrades(tradeUrls);
    await dodgem.delayBumpTrades();
  });
};

module.exports = {
  action: startCommand,
  name: 'start',
  description: 'Start bumping for the stored account'
};
