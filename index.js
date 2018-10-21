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
        this.middlewareFuncs = [];
    }

    addMiddleware(func) {
        this.middlewareFuncs.push(func);
    }

    middleware() {
        return (req, res, next) => {
            let stack = [next];
            for (let i = this.middlewareFuncs.length - 1; i >= 0 ; i--) {
                ((next, func) => {
                    stack.push(() => {
                        func.call(this, req, res, next)
                    })
                })(stack[stack.length - 1], this.middlewareFuncs[i])
            }
            stack[stack.length - 1]();
        }
    }

    startSession(agent) {
        const session = new Session(this, agent, this.config);

        return session.init().then(() => session.toIntent());
    }

    listen() {
        return (req, res) => {
            try {
                if (req.isGoogle) {
                    const dialogflowApp = dialogflow({debug: /*Boolean(this.config.debug)*/false});
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