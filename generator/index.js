const fs = require('fs');
const { processArray } = require('./lib/split');

const dirIntents = process.cwd()+'/config/intents';
const dirEntities = process.cwd()+'/config/entities';

var config = require(process.cwd()+'/config/main');

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

//load entities
const getEntities = () => {
    var entities = [];
    return new Promise((resolve, reject) => {
        fs.readdir(dirEntities, (err, files) => {
            if (err) {
                reject(err);
            } else {
                files.forEach(fileName => {
                    try {
                        const entity = JSON.parse(fs.readFileSync(dirEntities + '/' + fileName, 'utf8'));
                        entities.push(entity);
                    } catch (err) {
                        reject('Could not parse JSON for entity ' + fileName + ': ' + err.message);
                    }
                });
            }
            resolve(entities);
        });
    })
};

getIntents().then(intents => {
    ['google', 'alexa'].forEach(key => {
        config[key].intents = intents.map(intent => {
            let copy = Object.assign({}, intent);
            delete copy.google;
            delete copy.alexa;
            copy.samples && (copy.samples = processArray(copy.samples));

            return Object.assign(copy, intent[key] || {});
        });
    });

    return getEntities();
}).then(entities => {
    ['google', 'alexa'].forEach(key => {
        config[key].entities = entities;

        require('./lib/exporters/'+key)(config);
    });
}).catch(err => {
    console.log(err);
});
