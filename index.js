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
const regex = require('./regex')

// Convenience
const projectName = capitalize(pjson.name)

// Preferences
let prefs = new Preferences('com.jamiestraw.dodgem')

/**
 * Initialize puppeteer & display splash screen
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

  const target = args.target === 'oldest' ? 'the oldest trade' : 'all trades'
  ora(`${projectName} will bump ${chalk.blue(target)} every ${chalk.blue(args.interval)} minutes`).info()

  return [page, args, opts]
}

/**
 * Log in to Rocket League Garage using stored account credentials
 *
 * @param {Page} page
 * @param {Object} args
 * @param {Object} opts
 * @returns {Promise.<Array>}
 */
async function login ([page, args, opts]) {
  const spinner = ora(`Logging in as: ${chalk.blue(prefs.emailAddress)}`).start()
  await page.goto('https://rocket-league.com/login')

  // Email Address
  await page.focus('.rlg-form .rlg-input[type="email"]')
  await page.type(prefs.emailAddress)

  // Password
  await page.focus('.rlg-form .rlg-input[type="password"]')
  await page.type(prefs.password)

  // Submit
  await page.click('.rlg-form .rlg-btn-primary[type="submit"]')
  await page.waitForNavigation()

  spinner.succeed(`Logged in as: ${chalk.blue(prefs.emailAddress)}`)
  return [page, args, opts]
}

/**
 * Scrape active trades
 *
 * @param {Page} page
 * @param {Object} args
 * @param {Object} opts
 * @returns {Promise.<Array>}
 */
async function scrapeTrades ([page, args, opts]) {
  const spinner = ora('Finding active trades').start()

  // Navigate to active trades
  await page.goto('https://rocket-league.com/trading')
  await page.hover('.rlg-header-main-welcome-user')
  await page.click("[href^='/trades']")
  await page.waitForNavigation()

  // Scrape trade URLs
  let tradeUrls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('.rlg-trade-display-header > a'))
    return anchors.map(anchor => anchor.href)
  })
  spinner.succeed(`Found ${chalk.blue(tradeUrls.length)} active trade${tradeUrls.length === 1 ? '' : 's'}`)

  // @TODO: Filter out trades that are not editable due to 15 minute cool-off period

  if (args.target === 'oldest') tradeUrls = [tradeUrls[tradeUrls.length - 1]]
  return [page, args, opts, tradeUrls]
}

/**
 * Bump active trades
 *
 * @param {Page} page
 * @param {Object} args
 * @param {Object} opts
 * @param {Object[]} tradeUrls
 * @returns {Promise.<Array>}
 */
async function bumpTrades ([page, args, opts, tradeUrls]) {
  for (let [index, tradeUrl] of tradeUrls.entries()) {
    const humanIndex = index + 1
    const start = moment()
    const spinner = ora(args.target === 'oldest'
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
      spinner.succeed(args.target === 'oldest'
        ? `Bumped oldest active trade ${chalk.dim(`(${secondsElapsed} seconds)`)}`
        : `Bumped trade ${humanIndex}/${tradeUrls.length} ${chalk.dim(`(${secondsElapsed} seconds)`)}`
      )
    } catch (error) {
      // @TODO: Add error logging to file

      const secondsElapsed = moment().diff(start, 'seconds')
      spinner.fail(args.target === 'oldest'
        ? `Failed to bump oldest active trade ${chalk.dim(`(${secondsElapsed} seconds)`)}`
        : `Failed to bump trade ${humanIndex}/${tradeUrls.length} ${chalk.dim(`(${secondsElapsed} seconds)`)}`
      )
    }
  }

  return [page, args, opts]
}

/**
 * Schedule next bump
 *
 * @param {Page} page
 * @param {Object} args
 * @param {Object} opts
 */
function scheduleBumpTrades ([page, args, opts]) {
  const minutes = args.interval
  const nextRunTs = moment().add(minutes, 'minutes').format('HH:mm:ss')

  ora(`${projectName} will run again at: ${chalk.green(nextRunTs)}`).info()

  setTimeout(() => {
    scrapeTrades([page, args, opts])
      .then(bumpTrades)
      .then(scheduleBumpTrades)
  }, 1000 * 60 * minutes)
}

/**
 * Prompt user for Rocket League Garage account credentials, verify & save
 */
async function setLogin () {
  console.log('')
  ora('Please enter login credentials for Rocket League Garage').info()

  prompt.message = 'Rocket League Garage'
  prompt.delimiter = ' > '
  prompt.start()
  prompt.get({
    properties: {
      emailAddress: {
        description: 'Email Address',
        pattern: regex.emailAddress,
        message: 'Please enter a valid email address',
        required: true
      },
      password: {
        description: 'Password',
        hidden: true,
        replace: '*',
        pattern: regex.nonWhiteSpace,
        message: 'Please enter a valid password',
        required: true
      }
    }
  }, (error, credentials) => {
    if (error) return console.log(chalk.red('\n\nLog in aborted'))

    const spinner = ora(`Saving credentials for: ${chalk.blue(credentials.emailAddress)}`).start()
    spinner.succeed(`Credentials verified and saved for: ${chalk.blue(credentials.emailAddress)}`)

    prefs.emailAddress = credentials.emailAddress
    prefs.password = credentials.password
  })
}

dodgem
  .version(pjson.version)
  .help(`🎪  ${projectName} - ${pjson.description} - v${pjson.version}`)

  // Bump
  .command('bump', 'Start bumping the specified target every interval')
  .argument('<target>', `Which trades to bump - ${chalk.blue('all')} or ${chalk.blue('oldest')}`, ['all', 'oldest'], 'all')
  .argument('<interval>', 'How many minutes to wait before bumping again', regex.interval, 15)
  .action((args, opts) => {
    boot(args, opts)
      .then(login)
      .then(scrapeTrades)
      .then(bumpTrades)
      .then(scheduleBumpTrades)
  })

  // Login
  .command('login', 'Set login credentials for Rocket League Garage')
  .action(setLogin)

dodgem.parse(process.argv)
