const ora = require('ora');
const inquirer = require('inquirer');
const Preferences = require('preferences');

const credentials = new Preferences('com.jamieweavis.dodgem');
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

const loginCommand = () => {
  ora('Please enter login credentials for Rocket League Garage').info();
  inquirer.prompt(questions).then(data => {
    Object.assign(credentials, data);
    credentials.save();
    ora('Rocket League Garage login credentials saved').succeed();
  });
};

module.exports = {
  action: loginCommand,
  name: 'login',
  description: 'Set login credentials for Rocket League Garage'
};
