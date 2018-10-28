module.exports = {
    a: (name) => {
        return (['a','e','i','o','u'].indexOf(name.substr(0,1).toLowerCase()) > -1 ? 'an ': 'a ') + name;
    },
    join: (arr, join = 'and') => {
        arr = arr.slice();
        const last = arr.pop();
        return [arr.join(', '), last].filter(Boolean).join(`, ${join} `);
    },
    plural: (word) => {
        if (word.match(/y$/)) return word.replace(/y$/,'ies');
        if (word.match(/ch$/)) return word.replace(/ch$/,'ches');
        if (word.match(/sh$/)) return word.replace(/sh$/,'shes');
        return word + 's';
    }
};