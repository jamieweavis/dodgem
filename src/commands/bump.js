const Conf = require('conf');
const Dodgem = require('../Dodgem');
const ora = require('ora');

const config = new Conf();

const name = 'bump';
const description = 'Start bumping without prompt for target & interval';
const action = async (args, options) => {
  if (!config.get('emailAddress') || !config.get('password')) {
    ora('Please set login credentials with `dodgem login`').fail();
    return;
  }
  const dodgem = new Dodgem(
    args.target,
    args.interval,
    config.store,
    options.nonHeadless
  );
  await dodgem.init();
  await dodgem.login();
  const tradeUrls = await dodgem.scrapeTrades();
  await dodgem.bumpTrades(tradeUrls);
  await dodgem.delayBumpTrades();
};

module.exports = { name, description, action };
