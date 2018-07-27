const name = '<interval>';
const description = 'Amount of minutes to wait between bumps';
const validator = (arg) => {
  if (!/^\d+(\.\d+)?$/.test(arg)) {
    throw new Error('Interval must be a number or decimal')
  }
  return arg;
};

module.exports = { name, description, validator };
