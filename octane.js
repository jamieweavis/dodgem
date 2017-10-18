#!/usr/bin/env node
'use strict'

const ora = require('ora')
const chalk = require('chalk')
const moment = require('moment')
const octane = require('commander')
const puppeteer = require('puppeteer')

const pjson = require('./package.json')
const credentials = require('./credentials.json')

octane
  .version(pjson.version)
  .option('-m, --mode [mode]', `set the running mode [bulk|drip]`, /^(bulk|drip)$/i, 'bulk')
  .option('-i, --interval [minutes]', `how often the program will loop`, /^(\d*)$/i, 15)
  .parse(process.argv)

/**
 * Initializes the headless browser and page
 *
 * @returns {Promise.<Page>}
 */
async function boot () {
  console.log(chalk.magenta(`
   ____       __                 
  / __ \\_____/ /_____ _____  ___ 
 / / / / ___/ __/ __ '/ __ \\/ _ \\
/ /_/ / /__/ /_/ /_/ / / / /  __/
\\____/\\___/\\__/\\__,_/_/ /_/\\___/  ${chalk.green(`v${pjson.version}`)}

  `))

  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  ora(`${pjson.name} is running in ${chalk.blue(octane.mode)} mode with an interval of ` +
    `${chalk.blue(octane.interval)} minutes`).info()
  if (octane.mode === 'bulk' && octane.interval < 15) {
    ora(`Running in ${chalk.blue('bulk')} mode with an interval less than 15 minutes is not possible, ` +
      'please try again - this is due to the 15 minute cool-off period when updating trades on Rocket League Garage.').fail()
    process.exit(1)
  }
  if (octane.mode === 'drip') {
    ora(`When running in ${chalk.blue('drip')} mode it is recommended to have a trade to interval ratio ` +
      'that will exceed the 15 minute cool-off period on Rocket League Garage to avoid failures').warn()
  }

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
  spinner.succeed(`Found ${chalk.blue(tradeUrls.length)} active trade${tradeUrls.length === 1 ? '' : 's'}`)

  // @TODO: Filter out trades that are not editable due to 15 minute cool-off period

  if (octane.mode === 'drip') tradeUrls = [tradeUrls[tradeUrls.length - 1]]
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
    const spinner = ora(octane.mode === 'drip'
      ? `Bumping oldest active trade`
      : `Bumping trade ${humanIndex}/${tradeUrls.length}`
    ).start()

    try {
      // Navigate to trade
      await page.goto(tradeUrl, { timeout: 120000 })

      // Edit trade
      await page.click("[href^='/trade/edit']")
      await page.waitForNavigation({ timeout: 120000 })

      // Save
      await page.click('#rlg-addTradeForm input[type=submit]')
      await page.waitForNavigation({ timeout: 120000 })

      const secondsElapsed = moment().diff(start, 'seconds')
      spinner.succeed(octane.mode === 'drip'
        ? `Bumped oldest active trade ${chalk.grey(`(${secondsElapsed} seconds)`)}`
        : `Bumped trade ${humanIndex}/${tradeUrls.length} ${chalk.grey(`(${secondsElapsed} seconds)`)}`
      )
    } catch (error) {
      // @TODO: Add error logging to file

      const secondsElapsed = moment().diff(start, 'seconds')
      spinner.fail(octane.mode === 'drip'
        ? `Failed to bump oldest active trade ${chalk.grey(`(${secondsElapsed} seconds)`)}`
        : `Failed to bump trade ${humanIndex}/${tradeUrls.length} ${chalk.grey(`(${secondsElapsed} seconds)`)}`
      )
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
  const minutes = octane.interval
  const nextRunTs = moment().add(minutes, 'minutes').format('HH:mm:ss')

  ora(`${pjson.name} will run again at: ${chalk.green(nextRunTs)}`).info()

  setTimeout(() => {
    scrapeTrades(page)
      .then(updateTrades)
      .then(scheduleUpdateTrades)
  }, 1000 * 60 * minutes)
}

boot()
  .then(login)
  .then(scrapeTrades)
  .then(updateTrades)
  .then(scheduleUpdateTrades)
