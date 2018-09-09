var express = require('express');
var router = express.Router();
var verifier = require('alexa-verifier-middleware');

module.exports = bot => {
    // attach the verifier middleware first because it needs the entire
    // request body, and express doesn't expose this on the request object
    router.use(verifier);
    router.use(express.json());

    router.post('/', bot.listen());

    return router;
}
