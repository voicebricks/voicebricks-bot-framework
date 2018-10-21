module.exports = {
    a: (name) => {
        return (['a','e','i','o','u'].indexOf(name.substr(0,1).toLowerCase()) > -1 ? 'an ': 'a ') + name;
    },
    join: (arr, join = 'and') => {
        arr = arr.slice();
        const last = arr.pop();
        return [arr.join(', '), last].filter(Boolean).join(` ${join} `);
    }
};