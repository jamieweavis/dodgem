const ora = require('ora');
const chalk = require('chalk');
const moment = require('moment');
const puppeteer = require('puppeteer');

class Dodgem {
  /**
   * Stores target, interval and credentials against the object.
   *
   * @param {String} target
   * @param {Number} interval
   * @param {Object} credentials
   */
  constructor(target, interval, credentials) {
    this.credentials = credentials;
    this.interval = interval;
    this.target = target;
  }

  async init() {
    const browser = await puppeteer.launch({ ignoreHTTPSErrors: true });
    this.page = await browser.newPage();
    this.page.setViewport({ width: 1920, height: 1080 });

    const target = this.target === 'oldest' ? 'the oldest trade' : 'all trades';
    ora(`Bumping ${target} every ${this.interval} minutes`).info();
  }

  async login() {
    const { emailAddress, password } = this.credentials;

    const spinner = ora({
      text: `Logging in as: ${chalk.blue(emailAddress)}`,
      color: 'yellow'
    }).start();

    try {
      await this.page.goto('https://rocket-league.com/login');
      await this.page.type('.rlg-form .rlg-input[type="email"]', emailAddress);
      await this.page.type('.rlg-form .rlg-input[type="password"]', password);
      await this.page.click('.rlg-form .rlg-btn-primary[type="submit"]');
      await this.page.waitForSelector('.rlg-header-main-welcome-user');
      spinner.succeed(`Logged in as: ${chalk.blue(emailAddress)}`);
    } catch (error) {
      spinner.fail(`Failed to login in as: ${chalk.blue(emailAddress)}`);
      throw new Error(chalk.red('Run `dodgem login` to update login details.'));
    }
  }

  async scrapeTrades() {
    const spinner = ora({
      text: 'Finding active trades',
      color: 'yellow'
    }).start();

    // Navigate to active trades
    await this.page.goto('https://rocket-league.com/trading');
    await this.page.hover('.rlg-header-main-welcome-user');
    await this.page.click('[href^="/trades"]');
    await this.page.waitForSelector('.rlg-trade-display-container.is--user');

    // Scrape trade URLs
    let tradeUrls = await this.page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll('.rlg-trade-display-header > a')
      );
      return anchors.map(anchor => anchor.href);
    });
    const trades = tradeUrls.length === 1 ? 'trade' : 'trades';
    spinner.succeed(`Found ${chalk.blue(tradeUrls.length)} active ${trades}`);

    // TODO: Filter out trades that are not editable due to 15 minute cooldown period

    if (this.target === 'oldest') tradeUrls = tradeUrls.slice(-1);
    return tradeUrls;
  }

  /**
   * Bump array of trade URLs
   *
   * @param {Object[]} tradeUrls
   */
  async bumpTrades(tradeUrls) {
    // TODO: Rework this method if we want eslint & airbrb to be happy

    /* eslint-disable */
    for (let [index, tradeUrl] of tradeUrls.entries()) {
      const humanIndex = index + 1;
      const spinner = ora({
        text:
          this.target === 'oldest'
            ? 'Bumping oldest active trade'
            : `Bumping trade ${humanIndex}/${tradeUrls.length}`,
        color: 'yellow'
      }).start();

      try {
        // Navigate to trade
        await this.page.goto(tradeUrl);

        // Edit trade
        await this.page.click('[href^="/trade/edit"]');
        await this.page.waitForSelector('.rlg-btn-primary[type="submit"]');

        // Wait to avoid "invalid item selection" error on RLG
        await this.delay(10000);

        // Save trade
        await this.page.click('.rlg-btn-primary[type="submit"]');
        await this.page.waitForSelector('.rlg-site-popup.is--success.active');

        if (this.target === 'all') {
          // Wait for bump cooldown between bumps
          await this.delay(1000 * 10);
        }

        spinner.succeed(
          this.target === 'oldest'
            ? 'Bumped oldest active trade'
            : `Bumped trade ${humanIndex}/${tradeUrls.length}`
        );
      } catch (error) {
        spinner.fail(
          this.target === 'oldest'
            ? `Failed to bump oldest active trade`
            : `Failed to bump trade ${humanIndex}/${tradeUrls.length}`
        );
      }
    }
  }

  async delayBumpTrades() {
    const nextRunTs = moment()
      .add(this.interval, 'minutes')
      .format('HH:mm:ss');

    ora(`Dodgem will run again at: ${chalk.green(nextRunTs)}`).info();
    await this.delay(1000 * 60 * this.interval);

    const tradeUrls = await this.scrapeTrades();
    await this.bumpTrades(tradeUrls);
    await this.delayBumpTrades();
  }

  /**
   * Async delay helper function
   *
   * @param {Number} timeout
   * @returns {Promise}
   */
  async delay(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }
}

module.exports = Dodgem;
