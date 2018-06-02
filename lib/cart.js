const grammar = require('./grammar');

class Cart {
    constructor(session) {
        this.session = session;

        session.data.cart = session.data.cart || {
            lines: [],
            lastLine: null
        };

        this.lastLine = session.data.cart.lastLine;
        this.lines = session.data.cart.lines;
    }

    getCurrentLine() {
        return this.lastLine && Object.assign({
            productName: '',
            qty: 1,
            variations: []
        }, this.lastLine);
    }

    addLine(line) {
        let existingLine = this.getLineByProduct(line.productName);

        if (existingLine) {
            existingLine.qty += line.qty;
            this.lastLine = existingLine;
        } else {
            this.lines.push(line);
            this.lastLine = line;
        }

        this.save();
    }

    removeLineByProductName(productName) {
        this.lines = this.lines.filter(line => line.productName !== productName);
    }

    getLineByProduct(productName) {
        return this.lines.filter(line => line.productName === productName)[0];
    }

    getLinesDescription() {
        return grammar.join(this.lines.map(line => {
            return [
                line.description,
                grammar.join(line.variations || [], 'and')
            ].filter(Boolean).join(' ');
        }));
    }

    clear() {
        this.lastLine = null;
        this.lines = [];
        this.save();
    }

    save() {
        this.session.data.cart = {
            lastLine: this.lastLine,
            lines: this.lines
        }
    }
}

module.exports = Cart;