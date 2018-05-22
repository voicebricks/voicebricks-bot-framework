const debug = require('debug')('app:session');
const crypto = require('crypto');
const HandlersHelper = require('./handlers-helper');

class Session {
    constructor(bot, agent, appConfig) {
        this.constants = require('./constants');
        this.bot = bot;
        this.agent = agent;
        this.appConfig = appConfig;

        this.data = this.agent.bindData();

        //fallback count
        this.data.unknownCount = this.data.unknownCount || 0;

        // Confirm text is not repeated and can be used to confirm an action before
        // asking the user for something else
        this._confirmTexts = [];

        this.handlers = new HandlersHelper(
            this.bot.handlers,
            this.getRequestHandlers()
        );
    }

    setFollowupIntent(intent) {
        console.log('Setting followup intent', intent);
        this.data.followupIntent = intent;
    }

    /*
     * Should always return an array
     */
    getFollowupIntent() {
        if (Array.isArray(this.data.followupIntent)) {
            return this.data.followupIntent;
        } else if (this.data.followupIntent) {
            return [this.data.followupIntent];
        }
        return [];
    }

    /*
     * Routing. Should return a promise for Google's sake
     */
    toIntent(intent, global) {
        intent = intent || this.getIntent() || 'Welcome';

        const followUpPath = global ? [] : this.getFollowupIntent();

        let handler = this.handlers.findIntentHandler(intent, followUpPath);

        console.log('Handler', handler);

        if (handler.type === 'default') {
            this.setFollowupIntent(handler.foundAtPath);
        } else if (handler.type === 'unknown') {
            this.data.unknownCount++;
        } else {
            this.data.unknownCount = 0;
        }

        try {
            return new Promise((resolve, reject) => {
                resolve(handler.handler.call(this));
            }).catch(err => console.error(err));
        } catch (err) {
            console.error(err);
        }
    }

    toGlobalIntent(intent) {
        this.setFollowupIntent(null);
        return this.toIntent(intent, true);
    }

    getIntent() {
        return this.agent.getIntent();
    }

    confirm(text, repeatable) {
        this._confirmTexts.push({
            text: text,
            repeat: Boolean(repeatable)
        });
    }

    getRequestHandlers() {
        let handlers = {};
        let level = handlers;
        //get a set of handlers that are only applicable for this request
        if (this.data.confirmIntent) {
            //add Yes and No to follow up handlers
            this.getFollowupIntent().forEach(intent => {
                //assign an empty object for this level
                level[intent] = {};
                //move up a level
                level = level[intent]
            });
            Object.assign(level, {
                Yes: function () {
                    let intent = this.data.confirmIntent.intent;
                    delete this.data.confirmIntent;
                    this.toIntent(intent);
                },
                No: function () {
                    delete this.data.confirmIntent;
                    this.confirm('Okay, I won\'t.');
                    this.ask();
                }
            });

            //reduce lifetime
            this.data.confirmIntent.lifetime--;
            if (this.data.confirmIntent.lifetime < 1) {
                delete this.data.confirmIntent;
            }
        }

        console.log('Request handlers based on data', this.data, handlers);
        return handlers;
    }

    _beforeResponse() {
        //nothing here yet
    }

    ask(message, reprompts = []) {
        let noRepeat = this._confirmTexts.filter(item => !item.repeat).map(item => item.text);
        let repeat = this._confirmTexts.filter(item => item.repeat).map(item => item.text);
        message && repeat.push(message);

        if (repeat.length) {
            this.data.lastMessage = repeat.join(' ');
        }
        this.data.reprompts = reprompts;

        this._beforeResponse();

        this.agent.ask(
            noRepeat.concat(repeat).join(' '),
            reprompts
        );
    }

    reprompt() {
        let reprompts = this.data.reprompts || [];
        const reprompt = reprompts.shift();
        if (!reprompt) {
            this.close('I guess I can\'t help you this time. Let\'s talk again soon.');
        } else {
            this.agent[!reprompts.length ? 'close' : 'ask'](reprompt);
        }
    }

    close(message) {
        this.agent.close(message);
    }

    expect() {
        //TODO: to be implemented
    }

    setConfirmIntent(intent) {
        this.data.confirmIntent = {
            intent: intent,
            lifetime: 3
        };
    }

    iterate(arrString) {
        this.data.iterators = this.data.iterators || {};
        let key = md5Array(arrString);
        let index = this.data.iterators[key] || 0;
        if (index > arrString.length - 1) index = 0;

        //store next index
        this.data.iterators[key] = index + 1;

        //return the next string
        return arrString[index];
    }

    random(arrString) {
        this.data.random = this.data.random || {};
        let key = md5Array(arrString);
        let lastIndex = this.data.random[key];

        //choose an index at random, but not the same as the last one
        let index = Math.floor(Math.random() * arrString.length);
        let count = 0;
        while (index === lastIndex && count++ < 5) {
            let index = Math.floor(Math.random() * arrString.length);
        }
        this.data.random[key] = index;

        //return the randomly chosen item
        return arrString[index];
    }
};

function md5Array(arr) {
    return crypto.createHash('md5').update(arr.join('')).digest('hex');
}

module.exports = Session;