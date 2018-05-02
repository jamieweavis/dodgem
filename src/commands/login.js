const ora = require('ora');
const inquirer = require('inquirer');
const Conf = require('conf');

const config = new Conf();

const questions = [
  {
    name: 'emailAddress',
    message: 'Email Address:'
  },
  {
    name: 'password',
    message: 'Password:',
    type: 'password'
  }
];

const name = 'login';
const description = 'Set login credentials for Rocket League Garage';
const action = () => {
  ora('Please enter login credentials for Rocket League Garage').info();
  inquirer.prompt(questions).then(data => {
    config.set(data);
    ora('Rocket League Garage login credentials saved').succeed();
  });
};

module.exports = { name, description, action };
