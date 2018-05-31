module.exports = class GoogleAgent {
    constructor(conv) {
        this.conv = conv;
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

    ask(message) {
        this.conv.ask(message);
    }

    close(message) {
        this.conv.close(message);
    }

    getIntent() {
        return this.conv.action || 'Unknown';
    }

    getParams() {
        return this.conv.parameters;
    }
}