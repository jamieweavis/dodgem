const Ora = require('ora');
const chalk = require('chalk');
const moment = require('moment');
const inquirer = require('inquirer');
const puppeteer = require('puppeteer');

class Dodgem {
  /**
   * Stores saved credentials against the instance
   *
   * @param {Object} credentials
   */
  constructor(credentials) {
    this.credentials = credentials;
    this.interval = null;
    this.target = null;
    this.page = null;
  }

  /**
   * Prompt the user for bump target & interval then initialize Puppeteer browser & page
   */
  async init() {
    // Bump target & interval prompt
    await inquirer
      .prompt([
        {
          type: 'list',
          name: 'target',
          message: 'Bump target:',
          choices: [
            { name: 'All trades', value: 'all' },
            { name: 'Oldest trade', value: 'oldest' }
          ]
        },
        {
          name: 'interval',
          message: 'Repeat Interval (minutes):',
          validate: input => {
            if (!input || !input.match(/^\d{0,2}(\.\d{1,2})?$/)) {
              return 'Please enter a valid number';
            }
            return true;
          }
        }
      ])
      .then(async data => {
        this.target = data.target;
        this.interval = data.interval;
      });

    // Launch Puppeteer
    const browser = await puppeteer.launch();
    this.page = await browser.newPage();

    // Spinner
    const target = this.target === 'oldest' ? 'the oldest trade' : 'all trades';
    new Ora(
      `Bumping ${chalk.blue(target)} every ${chalk.blue(this.interval)} minutes`
    ).info();
  }

  /**
   * Log in to Rocket League Garage with stored credentials
   */
  async login() {
    // Spinner
    const spinner = new Ora({
      text: `Logging in as: ${chalk.blue(this.credentials.emailAddress)}`,
      color: 'yellow'
    }).start();

    try {
      // Login page
      await this.page.goto('https://rocket-league.com/login');

      // Email Address
      await this.page.focus('.rlg-form .rlg-input[type="email"]');
      await this.page.type(this.credentials.emailAddress);

      // Password
      await this.page.focus('.rlg-form .rlg-input[type="password"]');
      await this.page.type(this.credentials.password);

      // Submit
      await this.page.click('.rlg-form .rlg-btn-primary[type="submit"]');
      await this.page.waitForSelector('.rlg-header-main-welcome-user');

      spinner.succeed(
        `Logged in as: ${chalk.blue(this.credentials.emailAddress)}`
      );
    } catch (error) {
      spinner.fail(
        `Failed to login in as: ${chalk.blue(this.credentials.emailAddress)}`
      );
      throw new Error(
        chalk.red(
          'Login failed - please ensure login details are correct. Run `dodgem login` to update login details.'
        )
      );
    }
  }

  /**
   * Scrape active trade offers
   */
  async scrapeTrades() {
    // Spinner
    const spinner = new Ora({
      text: 'Finding active trades',
      color: 'yellow'
    }).start();

    // Navigate to active trades
    await this.page.goto('https://rocket-league.com/trading');
    await this.page.hover('.rlg-header-main-welcome-user');
    await this.page.click("[href^='/trades']");
    await this.page.waitForNavigation();

    // Scrape trade URLs
    let tradeUrls = await this.page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll('.rlg-trade-display-header > a')
      );
      return anchors.map(anchor => anchor.href);
    });
    spinner.succeed(
      `Found ${chalk.blue(tradeUrls.length)} active trade${
        tradeUrls.length === 1 ? '' : 's'
      }`
    );

    // @TODO: Filter out trades that are not editable due to 15 minute cooldown period

    if (this.target === 'oldest') tradeUrls = [tradeUrls[tradeUrls.length - 1]];
    return tradeUrls;
  }

  /**
   * Bump array of trade URLs
   *
   * @param {Object[]} tradeUrls
   */
  async bumpTrades(tradeUrls) {
    /* eslint-disable */
    // TODO: Rethink this method if we want eslint to be happy about it
    for (let [index, tradeUrl] of tradeUrls.entries()) {
      const humanIndex = index + 1;
      const start = moment();

      const spinner = new Ora({
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
        await this.page.click("[href^='/trade/edit']");
        await this.page.waitForNavigation();

        // Save
        await this.page.click('.rlg-btn-primary[type="submit"]');
        await this.page.waitForNavigation();

        if (this.target === 'all') {
          // Wait for bump cooldown between bumps
          await this.delay(1000 * 10);
        }

        const secondsElapsed = moment().diff(start, 'seconds');
        spinner.succeed(
          this.target === 'oldest'
            ? `Bumped oldest active trade ${chalk.dim(
                `(${secondsElapsed} seconds)`
              )}`
            : `Bumped trade ${humanIndex}/${tradeUrls.length} ${chalk.dim(
                `(${secondsElapsed} seconds)`
              )}`
        );
      } catch (error) {
        const secondsElapsed = moment().diff(start, 'seconds');
        spinner.fail(
          this.target === 'oldest'
            ? `Failed to bump oldest active trade ${chalk.dim(
                `(${secondsElapsed} seconds)`
              )}`
            : `Failed to bump trade ${humanIndex}/${
                tradeUrls.length
              } ${chalk.dim(`(${secondsElapsed} seconds)`)}`
        );
      }
    }
  }

  /**
   * Delay the specified interval and then begin bumping again
   */
  async delayBumpTrades() {
    const minutes = 1000 * 60 * this.interval;
    const nextRunTs = moment()
      .add(this.interval, 'minutes')
      .format('HH:mm:ss');

    new Ora(`Dodgem will run again at: ${chalk.green(nextRunTs)}`).info();

    await this.delay(minutes);
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
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }
}

module.exports = Dodgem;
