const dayjs = require('dayjs');
const ora = require('ora');
const puppeteer = require('puppeteer');

class Dodgem {
  /**
   * Stores target, interval, credentials & headless against the object.
   *
   * @param {String} target
   * @param {Number} interval
   * @param {Object} credentials
   * @param {Boolean} nonHeadless
   */
  constructor(target, interval, credentials, nonHeadless) {
    this.target = target;
    this.interval = interval;
    this.credentials = credentials;
    this.headless = !nonHeadless;
  }

  async init() {
    const browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: this.headless
    });
    this.page = await browser.newPage();
    this.page.setViewport({ width: 1920, height: 1080 });

    const target = this.target === 'oldest' ? 'the oldest trade' : 'all trades';
    ora(`Bumping ${target} every ${this.interval} minutes`).info();
  }

  async login() {
    const { emailAddress, password } = this.credentials;

    const spinner = ora({
      text: `Logging in as: ${emailAddress}`,
      color: 'yellow'
    }).start();

    try {
      await this.page.goto('https://rocket-league.com/login');
      await this.page.type('.rlg-form .rlg-input[type="email"]', emailAddress);
      await this.page.type('.rlg-form .rlg-input[type="password"]', password);
      await this.clickAndWaitForNavigation(
        '.rlg-form .rlg-btn-primary[type="submit"]'
      );
      spinner.succeed(`Logged in as: ${emailAddress}`);
    } catch (error) {
      spinner.fail(`Failed to login in as: ${emailAddress}`);
      throw new Error('Run `dodgem login` to update login details.');
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
    await this.clickAndWaitForNavigation('[href^="/trades"]');

    // Scrape trade URLs
    let tradeUrls = await this.page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll('.rlg-trade-display-header > a')
      );
      return anchors.map(anchor => anchor.href);
    });
    const trades = tradeUrls.length === 1 ? 'trade' : 'trades';
    spinner.succeed(`Found ${tradeUrls.length} active ${trades}`);

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
      const bumpSpinner = ora({
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
        await this.clickAndWaitForNavigation('[href^="/trade/edit"]');
        // Save trade
        await this.clickAndWaitForNavigation('.rlg-btn-primary[type="submit"]');
        bumpSpinner.succeed(
          this.target === 'oldest'
            ? 'Bumped oldest active trade'
            : `Bumped trade ${humanIndex}/${tradeUrls.length}`
        );
        if (
          this.target === 'all' &&
          (index !== 0 || humanIndex !== tradeUrls.length)
        ) {
          const delaySpinner = ora({
            text: 'Waiting 3 second bump cooldown',
            spinner: 'dots4'
          }).start();
          await this.delay(1000 * 3);
          delaySpinner.stop();
        }
      } catch (error) {
        bumpSpinner.fail(
          this.target === 'oldest'
            ? `Failed to bump oldest active trade`
            : `Failed to bump trade ${humanIndex}/${tradeUrls.length}`
        );
      }
    }
  }

  async delayBumpTrades() {
    const nextRunTs = dayjs()
      .add(this.interval, 'minutes')
      .format('HH:mm:ss');

    ora(`Dodgem will run again at: ${nextRunTs}`).info();
    await this.delay(1000 * 60 * this.interval);

    const tradeUrls = await this.scrapeTrades();
    await this.bumpTrades(tradeUrls);
    await this.delayBumpTrades();
  }

  /**
   * Asynchronous delay helper method
   *
   * @param {Number} timeout
   * @returns {Promise}
   */
  async delay(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

  /**
   * Click and wait for navigation helper method
   *
   * @link https://github.com/GoogleChrome/puppeteer/pull/1792/files
   * @param {String} selector
   */
  async clickAndWaitForNavigation(selector) {
    return Promise.all([
      this.page.waitForNavigation(),
      this.page.click(selector)
    ]);
  }
}

module.exports = Dodgem;
