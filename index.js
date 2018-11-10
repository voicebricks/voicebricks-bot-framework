const Session = require('./lib/session');
const debug = require('debug')('bot');
const { dialogflow } = require('actions-on-google');
const Alexa = require('alexa-sdk');

const AlexaAgent = require('./lib/agents/alexa');
const GoogleAgent = require('./lib/agents/google');
const responseWrapper = require('./lib/response-context-wrapper');

// Bind arguments starting after however many are passed in.
function bind_trailing_args(fn, ...bound_args) {
  return function(...args) {
    return fn(...args, ...bound_args);
  };
}

class Bot {
    constructor(config) {
        this.config = config;
        const handlers = require(process.cwd()+'/handlers');

        this.handlers = this.combineHandlers({
            Unknown: function() {
                this.ask('I don\'t understand.');
            }
        }, handlers);

        this.db = config.db;
        this.middlewareFuncs = [];
    }

    combineHandlers() {
        let handlers = [];
        [].forEach.call(arguments, arg => {
          if (Array.isArray(arg)) {
            handlers = handlers.concat(arg);
          } else {
            handlers.push(arg);
          }
        });

        let ret = {};
        handlers.forEach(handler => {
            for (let key in handler) {
                if (key === '_Middleware' && ret._Middleware) {
                    let prevMiddleware = ret._Middleware;
                    let newMiddleware = handler[key];

                    //new middleware should call prev middleware as next fn
                    console.log('Merging middleware');
                    ret._Middleware = function(intent, next) {
                      return newMiddleware.call(this, intent, prevMiddleware.bind(this, intent, next))
                    }
                } else {
                    ret[key] && key !== 'Unknown' && console.warn('Duplicate handler for intent '+key+'. Overwriting.');
                    ret[key] = handler[key];
                }
            }
        })

      return ret;
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