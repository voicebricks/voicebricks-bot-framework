module.exports = class AlexaAgent {
    constructor(alexa, handlerInput) {
        this.alexa = alexa;
        this.req = this.alexa._event;
    }

    bindData() {
        console.log('Alexa attributes', Object.assign({}, this.alexa._event));
        return this.alexa._event.session.attributes;
    }

    data(key, value) {
        if (typeof value === 'undefined') {
            if (this.req.session.attributes) {
                return this.req.session.attributes[key];
            }
        } else {
            this.alexa.setAttribute(key, value);
        }
    }

    ask(message, reprompts) {
        this.alexa.emit(':ask', message, reprompts ? reprompts[0] : 'I\'ll say that again. ' + message);
    }

    close(message) {
        this.alexa.emit(':tell', message);
    }

    getIntent() {
        console.log('Alexa req:', Object.assign({},this.req));
        let intent = 'Unknown';
        if (this.req.request.type === 'LaunchRequest') {
            intent = 'Welcome';
        } else if (this.req.request.type === 'IntentRequest') {
            intent = this.req.request.intent.name.replace(/(AMAZON\.)?(\w+?)(Intent)?$/, '$2');
        }

        if (intent == 'Fallback') {
            intent = 'Unknown';
        }

        return intent;
    }

    getParams() {
        var params = {};
        const request = this.req.request;
        const slots = request.intent && request.intent.slots;

        if (slots) {
            for (const slot in slots) {
                params[slot] = slots[slot].value;
            }
        }

        return params;
    }
}