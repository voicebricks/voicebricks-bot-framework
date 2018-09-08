const { Suggestions } = require('actions-on-google');
const debug = require('debug')('app:agents:google');

module.exports = class GoogleAgent {
    constructor(conv) {
        this.name = 'Google';
        this.conv = conv;
        this.suggestions = [];
    }

    bindData() {
        return this.conv.data;
    }

    data(key, value) {
        if (typeof value === 'undefined') {
            return this.conv.data[key];
        } else {
            this.conv.data[key] = value;
        }
    }

    _beforeResponse() {
        if (this.suggestions.length) {
            this.conv.ask(new Suggestions(this.suggestions));
        }
    }

    ask(message) {
        this._beforeResponse();
        this.conv.ask(message);
    }

    close(message) {
        this._beforeResponse();
        this.conv.close(message);
    }

    suggestion() {
        let args = [].slice.call(arguments);
        this.suggestions = this.suggestions.concat(typeof args[0] == 'array' ? args[0] : args);
    }

    getIntent() {
        return this.conv.action || 'Unknown';
    }

    getParams() {
        return this.conv.parameters;
    }

    getAppIdFilter() {
        return {
            googleProjectId: this.conv.contexts._session.match(new RegExp('^projects/([^\/]+)'))[1]
        }
    }
}