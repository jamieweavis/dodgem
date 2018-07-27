const name = '<target>';
const description = 'Can be `all` for all trades or `oldest` for only the oldest trade';
const validator = (arg) => {
  if (!['all', 'oldest'].includes(arg)) {
    throw new Error('Target must be `all` or `oldest`')
  }
  return arg;
};
module.exports = { name, description, validator };
