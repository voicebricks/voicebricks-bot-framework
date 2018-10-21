var express = require('express');
var bot = require('../lib/bot');
var router = express.Router();
var mongo = require('../lib/db/mongo');

router.use(mongo.connectMiddleware(bot));
router.use(bot.middleware());

router.use('/bot/alexa', require('./alexa.router')(bot));
router.use('/bot/google', require('./google.router')(bot));
//to be deprecated
router.use('/', require('./google.router')(bot));

module.exports = router;