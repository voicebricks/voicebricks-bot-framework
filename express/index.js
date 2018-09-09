var path = require('path');
var express = require('express');
var router = express.Router();
var mongo = require('../lib/db/mongo');
var config = require(path.join(process.cwd(), 'config/main')) || {appName: 'App Name not defined'};

const bot = require('../index')({
    appName: config.appName,
    debug: true
});

router.use(mongo.connectMiddleware(bot));
router.use(bot.middleware());

router.use('/bot/alexa', require('./alexa.router')(bot));
router.use('/bot/google', require('./google.router')(bot));
//to be deprecated
router.use('/', require('./google.router')(bot));

module.exports = router;