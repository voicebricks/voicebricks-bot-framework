var path = require('path');
var config = require(path.join(process.cwd(), 'config/main')) || {appName: 'App Name not defined'};

const bot = require('../index')({
    appName: config.appName,
    debug: true
});

module.exports = bot;