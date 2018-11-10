const Events = require('events');
const debug = require('debug')('app:session');
const crypto = require('crypto');
const HandlersHelper = require('./handlers-helper');
const Cart = require('./cart');

let appIdCache = {};

class Session extends Events {
    constructor(bot, agent, appConfig) {
        super();

        this.constants = require('./constants');
        this.bot = bot;
        this.agent = agent;
        this.appConfig = appConfig;

        this.data = this.agent.bindData();
        this.userId = this.agent.userId();

        //fallback count
        this.data.unknownCount = this.data.unknownCount || 0;

        // Confirm text is not repeated and can be used to confirm an action before
        // asking the user for something else
        this._confirmTexts = [];

        this.handlers = new HandlersHelper(this, this.bot.handlers);

        this.cart = new Cart(this);
        this.grammar = require('./grammar');
    }

    init() {
        //user defaults to what is stored in conversation
        this.user = this.data.user;

        this.on('beforeResponse', () => {
            const userHash = crypto.createHash('md5').update(JSON.stringify(this.user)).digest("hex");
            if (userHash !== this.data.userHash) {
                this.bot.schema.User.findOneAndUpdate({uuid: this.userId}, {
                    data: JSON.stringify(this.user)
                }, {upsert:true}, (err, doc) => {
                    if (err) return console.error(err);
                    else {
                        //console.log('User saved', this.user);
                    }
                });
            }
        });

        return this.user ?
            Promise.resolve(this.user) :
            new Promise((resolve, reject) => {
                this.userData().then(data => {
                    console.log('User:', data);
                    this.data.newUser = !data;
                    this.user = data || {};
                    this.data.user = this.user;
                    this.data.userHash = crypto.createHash('md5').update(JSON.stringify(data)).digest("hex");
                    resolve();
                }, err => reject(err));
            });
    }

    setFollowupIntent(intent) {
        //console.log('Setting followup intent', intent);
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
    toIntent(intent, params, global) {
        intent = intent || this.getIntent() || 'Welcome';
        if (typeof params == 'boolean' || !params) {
            global = Boolean(params);
            params = this.getParams();
        }

        const followUpPath = global ? [] : this.getFollowupIntent();

        let handler = this.handlers.findIntentHandler(intent, followUpPath);

        if (handler.type === 'default') {
            this.setFollowupIntent(handler.foundAtPath);
        } else if (handler.type === 'unknown') {
            this.data.unknownCount++;
        } else {
            this.data.unknownCount = 0;
        }

        //console.log('Handler', handler, this.data, this.user);

        try {
            return new Promise((resolve, reject) => {
                resolve(handler.handler.call(this, params, this.data, this.user));
            }).catch(err => console.error(err));
        } catch (err) {
            console.error(err);
        }
    }

    toGlobalIntent(intent, params) {
        this.setFollowupIntent(null);
        return this.toIntent(intent, params, true);
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

    getParam(key) {
        const params = this.agent.getParams();
        return params[key];
    }

    getParams() {
        return this.agent.getParams();
    }

    getAppId() {
        return new Promise((resolve, reject) => {
            const appIdFilter = this.agent.getAppIdFilter();
            const cacheKey = JSON.stringify(appIdFilter);
            
            // Check cache first
            if (appIdCache[cacheKey]) {
                resolve(appIdCache[cacheKey]);
                return;
            }
            
            this.bot.schema.App.findOne(appIdFilter, '_id', (err, result) => {
                if (err) {
                    reject(new Error('Could not load app id: '+err.message));
                    return;
                }
                appIdCache[cacheKey] = result._id;
                resolve(result._id);
            })
        })
    }

    message(key) {
        return new Promise((resolve, reject) => {
            this.getAppId().then(appId => {
                this.bot.schema.Message.findOne({ appId, key }, 'message', (err, result) => {
                    if (err) {
                        console.error('Errored getting message for '+key, err.message);
                        reject(err);
                        return;
                    }
                    //console.log('Message for '+key, result);
                    resolve(result.message);
                })
            }, reject)
        })
    }

    userData() {
        return new Promise((resolve, reject) => {
            this.bot.schema.User.findOne({ uuid: this.userId }, 'data', (err, result) => {
                if (err) {
                    console.error('Errored getting user data for '+this.userId, err.message);
                    reject(err);
                    return;
                }
                //g('User result', result);
                resolve(result && result.data ? JSON.parse(result.data) : null);
            }, err => console.error(err))
        })
    }

    /* Array of strings, or 1+ strings as arguments */
    suggestion() {
        this.agent.suggestion.apply(this.agent, arguments);
    }

    _beforeResponse() {
        this.emit('beforeResponse');
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

        this._afterResponse();
    }

    close(message) {
        this._beforeResponse();

        this.agent.close(message);

        this._afterResponse();
    }

    _afterResponse() {
        this.emit('afterResponse');
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

    expect() {
        //TODO: to be implemented
    }

    setConfirmIntent(intent, opts) {
        this.data.confirmIntent = Object.assign({
            intent: intent,
            lifetime: 3
        }, opts || {});
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