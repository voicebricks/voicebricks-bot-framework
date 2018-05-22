const Session = require('./lib/session');
const debug = require('debug')('bot');
const { dialogflow } = require('actions-on-google');
const Alexa = require('alexa-sdk');
const responseWrapper = require('./lib/response-context-wrapper');

class Bot {
    constructor() {
        console.log(process.cwd()+'/handlers');
        this.handlers = Object.assign({
                Unknown: function() {
                    this.ask('What?');
                }
            },
            require(process.cwd()+'/handlers')
        );
    }

    middleware() {
        return (req, res, next) => {
            req.isGoogle = Boolean(req.body.queryResult);
            next();
        }
    }

    startSession(agent) {
        const session = new Session(this, agent, {
            appName: 'Voice Bricks Prototype'
        });

        return session.toIntent();
    }

    listen() {
        return (req, res) => {
            try {
                if (req.isGoogle) {
                    const dialogflowApp = dialogflow({debug: false});
                    dialogflowApp.fallback(conv => {
                        console.log('Dialogflow args', arguments);
                        const GoogleAgent = require('./lib/agents/google');
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

const bot = new Bot();

module.exports = bot;