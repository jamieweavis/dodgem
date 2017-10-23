#!/usr/bin/env node
'use strict'

// Project Dependencies
const ora = require('ora')
const chalk = require('chalk')
const prompt = require('prompt')
const moment = require('moment')
const dodgem = require('caporal')
const puppeteer = require('puppeteer')
const capitalize = require('capitalize')
const Preferences = require('preferences')

// Files
const pjson = require('./package.json')
const credentials = require('./credentials.json')

let prefs = new Preferences('com.your.app.identifier', {
  username: null,
  emailAddress: null,
  password: null
})

/**
 * Initializes the headless browser and page
 *
 * @param {Object} args
 * @param {Object} opts
 * @returns {Promise.<Array>}
 */
async function boot (args, opts) {
  console.log(chalk.magenta(`
    ____            __
   / __ \\____  ____/ /___ ____  ____ ___ 
  / / / / __ \\/ __  / __ \`/ _ \\/ __ \`__ \\
 / /_/ / /_/ / /_/ / /_/ /  __/ / / / / /
/_____/\\____/\\__,_/\\__, /\\___/_/ /_/ /_/ 
                  /____/         ${chalk.yellow.italic(`v${pjson.version}`)}
  `))

  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  ora(`${capitalize(pjson.name)} is running in ${chalk.blue(args.mode)} mode with a ${chalk.blue(args.interval)} minute interval`).info()

  return [page, args, opts]
}

/**
 * Logs in to RLG using stored credentials
 *
 * @param {Page} page
 * @param {Object} args
 * @param {Object} opts
 * @returns {Promise.<Array>}
 */
async function login ([page, args, opts]) {
  const spinner = ora(`Logging in as: ${chalk.blue(credentials.emailAddress)}`).start()
  await page.goto('https://rocket-league.com/login')

  // Username
  await page.focus('.rlg-form .rlg-input[type="email"]')
  await page.type(credentials.emailAddress)

  // Password
  await page.focus('.rlg-form .rlg-input[type="password"]')
  await page.type(credentials.password)

  // Submit
  await page.click('.rlg-form .rlg-btn-primary[type="submit"]')
  await page.waitForNavigation()

  spinner.succeed(`Logged in as: ${chalk.blue(credentials.emailAddress)}`)
  return [page, args, opts]
}

/**
 * Scrapes active trade listings
 *
 * @param {Page} page
 * @param {Object} args
 * @param {Object} opts
 * @returns {Promise.<Array>}
 */
async function scrapeTrades ([page, args, opts]) {
  // Navigate to trades
  const spinner = ora('Finding active trades').start()
  await page.goto(`https://rocket-league.com/trades/${credentials.username}`)

  // Scrape trades
  let tradeUrls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('.rlg-trade-display-header > a'))
    return anchors.map(anchor => anchor.href)
  })
  spinner.succeed(`Found ${chalk.blue(tradeUrls.length)} active trade${tradeUrls.length === 1 ? '' : 's'}`)

  // @TODO: Filter out trades that are not editable due to 15 minute cool-off period

  if (args.mode === 'last') tradeUrls = [tradeUrls[tradeUrls.length - 1]]
  return [page, args, opts, tradeUrls]
}

/**
 * Loop through trade URLs and update each trade listing
 *
 * @param {Page} page
 * @param {Object} args
 * @param {Object} opts
 * @param {Object[]} tradeUrls
 * @returns {Promise.<Array>}
 */
async function updateTrades ([page, args, opts, tradeUrls]) {
  for (let [index, tradeUrl] of tradeUrls.entries()) {
    const humanIndex = index + 1
    const start = moment()
    const spinner = ora(args.mode === 'last'
      ? 'Bumping oldest active trade'
      : `Bumping trade ${humanIndex}/${tradeUrls.length}`
    ).start()

    try {
      // Navigate to trade
      await page.goto(tradeUrl)

      // Edit trade
      await page.click("[href^='/trade/edit']")
      await page.waitForNavigation()

      // Save
      await page.click('#rlg-addTradeForm input[type=submit]')
      await page.waitForNavigation()

      const secondsElapsed = moment().diff(start, 'seconds')
      spinner.succeed(args.mode === 'last'
        ? `Bumped oldest active trade ${chalk.dim(`(${secondsElapsed} seconds)`)}`
        : `Bumped trade ${humanIndex}/${tradeUrls.length} ${chalk.dim(`(${secondsElapsed} seconds)`)}`
      )
    } catch (error) {
      // @TODO: Add error logging to file

      const secondsElapsed = moment().diff(start, 'seconds')
      spinner.fail(args.mode === 'last'
        ? `Failed to bump oldest active trade ${chalk.dim(`(${secondsElapsed} seconds)`)}`
        : `Failed to bump trade ${humanIndex}/${tradeUrls.length} ${chalk.dim(`(${secondsElapsed} seconds)`)}`
      )
    }
  }

  return [page, args, opts]
}

/**
 * Schedule the next call to updateTrades
 *
 * @param {Page} page
 * @param {Object} args
 * @param {Object} opts
 */
function scheduleUpdateTrades ([page, args, opts]) {
  const minutes = args.interval
  const nextRunTs = moment().add(minutes, 'minutes').format('HH:mm:ss')

  ora(`${pjson.name} will run again at: ${chalk.green(nextRunTs)}`).info()

  setTimeout(() => {
    scrapeTrades([page, args, opts])
      .then(updateTrades)
      .then(scheduleUpdateTrades)
  }, 1000 * 60 * minutes)
}

/**
 * @TODO
 */
async function setLogin () {
  prompt.message = 'Rocket League Garage'
  prompt.delimiter = ' > '
  prompt.start()
  prompt.get({
    properties: {
      username: {
        description: 'Username',
        pattern: /^\S*$/,
        message: 'Please enter a username',
        required: true
      },
      emailAddress: {
        description: 'Email Address',
        pattern: /^\S*$/,
        message: 'Please enter a valid email address',
        required: true
      },
      password: {
        description: 'Password',
        hidden: true,
        replace: '*',
        pattern: /^\S*$/,
        message: 'Please enter a password',
        required: true
      }
    }
  }, (error, details) => {
    if (error) throw error
    console.log('Command-line input received:')
    console.log('  name: ' + details.username)
    console.log('  email address: ' + details.emailAddress)
    console.log('  password: ' + details.password)
  })
}

dodgem
  .version(pjson.version)
  .help(`🎪  ${capitalize(pjson.name)} - ${pjson.description} - v${pjson.version}`)

  // List Categories
  .command('bump', 'Begin the bumping process')
  .argument('[mode]', 'The mode in which to run - bulk or drip', ['all', 'last'], 'all')
  .argument('[interval]', 'How often to run', /^\d*$/, 15)
  .action((args, opts) => {
    boot(args, opts)
      .then(login)
      .then(scrapeTrades)
      .then(updateTrades)
      .then(scheduleUpdateTrades)
  })

  // Set login details
  .command('login', 'Login')
  .action(setLogin)

dodgem.parse(process.argv)
