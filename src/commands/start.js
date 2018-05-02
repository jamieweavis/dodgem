const ora = require('ora');
const Dodgem = require('../Dodgem');
const inquirer = require('inquirer');
const Conf = require('conf');

const config = new Conf();

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
      const parsed = Number.parseInt(input, 10);
      const error = 'Please enter a valid number';
      return Number.isNaN(parsed) ? error : true;
    }
  }
];

const name = 'start';
const description = 'Start bumping for the stored account';
const action = () => {
  if (!config.get('emailAddress') || !config.get('password')) {
    ora('Please set login credentials with `dodgem login`').fail();
    return;
  }
  inquirer.prompt(questions).then(async data => {
    const dodgem = new Dodgem(data.target, data.interval, config.store);
    await dodgem.init();
    await dodgem.login();
    const tradeUrls = await dodgem.scrapeTrades();
    await dodgem.bumpTrades(tradeUrls);
    await dodgem.delayBumpTrades();
  });
};

module.exports = { name, description, action };
