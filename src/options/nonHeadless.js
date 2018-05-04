const app = require('caporal');

module.exports = {
  synopsis: '--non-headless',
  description: 'Whether to run browser in non-headless mode',
  validator: app.BOOL
};
