# dodgem

> 🎪 Rocket League Garage trade bumping automation CLI bot

![node-version](https://img.shields.io/node/v/dodgem.svg) [![npm-downloads](https://img.shields.io/npm/dt/dodgem.svg)](https://www.npmjs.com/package/dodgem) [![npm-version](https://img.shields.io/npm/v/dodgem.svg)](https://www.npmjs.com/package/dodgem) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/jamieweavis/contribution/master/LICENSE.md) [![prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

## Installation

**The minimum version of Node.js required to run Dodgem is `7.6.0`** - ensure that this version (or higher) is installed before installing Dodgem. To check which version of Node.js you have installed you can run: `node -v`.

Dodgem is installed globally via the command line from the npm registry with either [yarn](https://github.com/yarnpkg/yarn) or [npm](https://github.com/npm/npm).

```sh
# Via yarn
$ yarn global add dodgem

# Via npm
$ npm install --global dodgem
```

## Screenshots

Coming soon.

## Usage

Dodgem is run globally from the command line with the `dodgem` command.

### `dodgem`

Display help and usage information.

### `dodgem login`

Set login credentials for Rocket League Garage.

You will be prompted for your Rocket League Garage email address and password.

**Note: Your login credentials are encrypted and stored locally**

### `dodgem start`

Begin the bumping process - you will be prompted for a target and an interval.

Target can be all of your trades _or_ your oldest trade.

All trades is most effective when you have a variety of different active trades - this will bump _all_ of your trades one by one every interval. Oldest trade is most effective when you have lots of duplicate trades and you want to saturate the market - this will bump only your _oldest_ trade every interval.

Interval is the amount of time to wait between bumping. It is recommended to have _atleast_ a 15 minute interval when bumping all trades to prevent bumping too frequently and hitting the 15 minute cooldown timer. When bumping the oldest trade it is recommended to use the following calculation `(15 / amountOfTrades) = interval`.

## Related

* [prosper](https://github.com/jamieweavis/prosper) - 💎 Rocket League Garage trade aggregation & reporting CLI tool

## License

This project is licensed under the MIT License - see [LICENSE.md](LICENSE.md) for details.

## Disclaimer

The author and any contributors associated with this project are not resposible for the consequences that may occur from the use of this tool.

Users of this tool do so entirely at their own risk - abusing this tool _could_ get you permanently banned from Rocket League Garage.
