module.exports = {
    join: (arr, join) => {
        arr = arr.slice();
        const last = arr.pop();
        return [arr.join(', '), last].filter(Boolean).join(` ${join} `);
    }
};