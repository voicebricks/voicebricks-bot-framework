const fs = require('fs');

const dirIntents = process.cwd()+'config/intents';

var config = require(process.cwd()+'config/main');

var entities = [];

const pause = (time) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time);
    });
};

//load intents
const getIntents = () => {
    var intents = [];
    return new Promise((resolve, reject) => {
        fs.readdir(dirIntents, (err, files) => {
            if (err) {
                reject(err);
            } else {
                files.forEach(fileName => {
                    try {
                        const intent = JSON.parse(fs.readFileSync(dirIntents + '/' + fileName, 'utf8'));
                        intents.push(intent);
                    } catch (err) {
                        reject('Could not parse JSON for intent ' + fileName + ': ' + err.message);
                    }
                });
            }
            resolve(intents);
        });
    })
};

getIntents().then(intents => {
    ['google', 'alexa'].forEach(key => {
        config[key].intents = intents.map(intent => {
            let copy = Object.assign({}, intent);
            delete copy.google;
            delete copy.alexa;
            return Object.assign(copy, intent[key] || {});
        });

        require('./lib/exporters/'+key)(config);
    });
}).catch(err => {
    console.log(err);
});
