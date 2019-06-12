const grammar = require('./grammar');

const defaultLine = {
  productName: '',
  qty: 1,
  amount: 0,
  total: 0,
  variations: []
};

class Cart {
    constructor(session) {
        this.session = session;
        this._nextId = 1;

        session.data.cart = session.data.cart || {
            lines: [],
            lastLine: null
        };

        this.lastLine = session.data.cart.lastLine;
        this.lines = session.data.cart.lines;
    }

    nextId() {
        let nextId = this._nextId;
        this._nextId++;

        return nextId;
    }

    getCurrentLine() {
        return this.lastLine;
    }

    addLine(line) {
        let existingLine = this.getLineByProduct(line.productName);

        if (existingLine) {
            this.updateQty(existingLine, existingLine.qty + line.qty);
            this.lastLine = existingLine;
        } else {
            line = Object.assign({}, defaultLine, line);
            line.id = this.nextId();
            line.total = line.total || line.amount * line.qty;
            this.lines.push(line);
            this.lastLine = line;
        }

        this.save();
    }

    updateQty(line, qty) {
      let cartLine = this.lines.filter(cartLine => cartLine.id === line.id)[0];

      if (cartLine) {
          cartLine.qty = qty;
          cartLine.total = qty * cartLine.amount;
      } else {
          console.log('Line not found in cart', line);
          throw new Error('Line not found in cart');
      }
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

    getTotal() {
        let totalAmount = 0;
        this.lines.forEach(line => {
          totalAmount += line.total;
        });

        return {
            amount: totalAmount
        }
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