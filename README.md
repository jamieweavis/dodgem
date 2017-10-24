# Dodgem

> 🎪 Rocket League Garage trade bumping automation CLI bot

[![node](https://img.shields.io/node/v/dodgem.svg)]() [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard) [![npm](https://img.shields.io/npm/dt/dodgem.svg)]() [![npm](https://img.shields.io/npm/v/dodgem.svg)]() [![license](https://img.shields.io/github/license/jamiestraw/dodgem.svg)](LICENSE.md)

## 📦 Install

**The minimum version of Node.js required to run Dodgem is `7.6.0`** - ensure that this version (or higher) is installed before installing Dodgem. To check which version of Node.js you have installed you can run: `node -v`.

Dodgem is installed globally via the command line from the npm registry with either [yarn](https://github.com/yarnpkg/yarn) or [npm](https://github.com/npm/npm).

```sh
# Via yarn (recommended)
$ yarn global add dodgem

# Via npm
$ npm install --global dodgem
```

## 🖥 Screenshots

Coming soon™

## 🚀 Usage

### `dodgem help`

Outputs detailed usage and help information.

### ``dodgem login``

Prompts you for your email address, username & password for Rocket League Garage. You can run this command again to update your login details.

*Note: Your login details are encrypted and stored locally*

### ``dodgem bump <target> <interval>``

Begins bumping the `<target>` every `<interval>`.

- `<target>` - Which trades to bump
 - `all` - Bumps all trades - most effective when you have a variety of different trades listed
 - `oldest` - most effective when you have lots of duplicate trades and you want to saturate the market.
- `<interval>` - How many minutes to wait before bumping again.

Examples:

```sh
$ dodgem bump all 15

$ dodgem bump oldest 3
```

## 📄 License

This project is licensed under the MIT License - see [LICENSE.md](LICENSE.md) for details.
