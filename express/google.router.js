var express = require('express');
var router = express.Router();

module.exports = bot => {
    router.use(express.json());
    router.use(function (req, res, next) {
        req.isGoogle = Boolean(req.body.queryResult);
        next();
    });

    router.post('/', bot.listen());

    return router;
}