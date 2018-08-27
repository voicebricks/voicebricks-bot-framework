const Session = require('./lib/session');
const debug = require('debug')('bot');
const { dialogflow } = require('actions-on-google');
const Alexa = require('alexa-sdk');

const AlexaAgent = require('./lib/agents/alexa');
const GoogleAgent = require('./lib/agents/google');
const responseWrapper = require('./lib/response-context-wrapper');

class Bot {
    constructor(config) {
        this.config = config;
        this.handlers = Object.assign({
                Unknown: function() {
                    this.ask('What?');
                }
            },
            require(process.cwd()+'/handlers')
        );
        this.db = config.db;
    }

    middleware() {
        return (req, res, next) => {
            req.isGoogle = Boolean(req.body.queryResult);
            next();
        }
    }

    startSession(agent) {
        const session = new Session(this, agent, this.config);

        return session.toIntent();
    }

    listen() {
        return (req, res) => {
            try {
                if (req.isGoogle) {
                    const dialogflowApp = dialogflow({debug: Boolean(this.config.debug)});
                    dialogflowApp.fallback(conv => {
                        console.log('Dialogflow args', arguments);
                        return this.startSession(new GoogleAgent(conv));
                    });
                    dialogflowApp(req, responseWrapper(res));
                } else {
                    const alexa = Alexa.handler(req.body, responseWrapper(res));
                    alexa.appId = alexa._event.session.application.applicationId;

                    const AlexaAgent = require('./lib/agents/alexa');

                    this.startSession(new AlexaAgent(alexa));
                }
            } catch (err) {
                console.error(err);
            }
        }
    }
}

module.exports = config => {
    return new Bot(config);
};