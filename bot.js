'use strict'

const ora = require('ora')
const mode = process.argv[2]
const modes = ['bulk', 'drip']
const pjson = require('./package.json')
const chalk = require('chalk')
const moment = require('moment')
const puppeteer = require('puppeteer')
const credentials = require('./credentials.json')

if (!modes.includes(mode)) {
  ora(`Invalid mode: \`${mode}\``).fail()
  ora(`See ${chalk.blue('README.md')} for mode information.`).info()
  process.exit()
}

/**
 * Initializes the headless browser and page
 *
 * @returns {Promise.<Page>}
 */
async function boot () {
  const spinner = ora(`Booting ${pjson.name} v${pjson.version}`).start()
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  page.setViewport({ width: 1920, height: 1080 })
  spinner.stopAndPersist({ symbol: chalk.blue('⚡'), text: `Booted ${pjson.name} v${pjson.version}` })
  return page
}

/**
 * Logs in to RLG using stored credentials
 *
 * @param {Page} page
 * @returns {Promise.<Page>}
 */
async function login (page) {
  const spinner = ora(`Logging in as: ${chalk.blue(credentials.emailAddress)}`).start()
  await page.goto('https://rocket-league.com/login', { timeout: 120000 })

  // Username
  await page.focus('.rlg-form .rlg-input[type="email"]')
  await page.type(credentials.emailAddress)

  // Password
  await page.focus('.rlg-form .rlg-input[type="password"]')
  await page.type(credentials.password)

  // Submit
  await page.click('.rlg-form .rlg-btn-primary[type="submit"]')
  await page.waitForNavigation({ timeout: 120000 })

  spinner.succeed(`Logged in as: ${chalk.blue(credentials.emailAddress)}`)
  return page
}

/**
 * Scrapes active trade listings
 *
 * @param {Page} page
 * @returns {Array}
 */
async function scrapeTrades (page) {
  // Navigate to trades
  const spinner = ora('Finding active trades').start()
  await page.goto(`https://rocket-league.com/trades/${credentials.username}`, { timeout: 120000 })

  // Scrape trades
  let tradeUrls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('.rlg-trade-display-header > a'))
    return anchors.map(anchor => anchor.href)
  })
  spinner.succeed(`Found ${chalk.blue(tradeUrls.length)} active trade${tradeUrls.length > 1 ? 's' : ''}`)

  // @TODO: Filter out trades that are not editable due to 15 minute cool-off period

  if (mode === 'drip') {
    tradeUrls = [tradeUrls[tradeUrls.length - 1]]
  }

  return [page, tradeUrls]
}

/**
 * Loop through trade URLs and update each trade listing
 *
 * @param {Page} page
 * @param {Object[]} tradeUrls
 * @returns {Promise.<Page>}
 */
async function updateTrades ([page, tradeUrls]) {
  for (let [index, tradeUrl] of tradeUrls.entries()) {
    const humanIndex = index + 1
    const start = moment()
    const spinner = ora(`Bumping trade ${humanIndex}/${tradeUrls.length}`).start()

    try {
      // Navigate to trade
      await page.goto(tradeUrl, { timeout: 120000 })

      // Edit trade
      await page.click('body > main > div > div > div > div:nth-child(2) > a:nth-child(1)') // @TODO: Tidy this selector
      await page.waitForNavigation({ timeout: 120000 })

      // Save
      await page.click('input.rlg-btn-primary')
      await page.waitForNavigation({ timeout: 120000 })

      const secondsElapsed = moment().diff(start, 'seconds')
      spinner.succeed(`Bumped trade ${humanIndex}/${tradeUrls.length} ${chalk.grey(`(${secondsElapsed} seconds)`)}`)
    } catch (error) {
      // @TODO: Add error logging to file
      spinner.fail(`Failed to bump trade ${humanIndex}/${tradeUrls.length}`)
    }
  }

  return page
}

/**
 * @TODO
 *
 * @param {Page} page
 */
function scheduleUpdateTrades (page) {
  const minutes = (mode === 'drip' ? 3 : 16)
  const nextRunTs = moment().add(minutes, 'minutes').format('HH:mm:ss')
  const timeout = 1000 * 60 * minutes

  ora().stopAndPersist({
    symbol: chalk.blue('⚡'),
    text: `${pjson.name} will run again at: ${chalk.green(nextRunTs)}`
  })

  setTimeout(() => {
    scrapeTrades(page)
      .then(updateTrades)
      .then(scheduleUpdateTrades)
  }, timeout)
}

// It's party time!
boot()
  .then(login)
  .then(scrapeTrades)
  .then(updateTrades)
  .then(scheduleUpdateTrades)
