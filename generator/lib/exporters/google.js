const fs = require('fs');
const zipFolder = require('zip-folder');
const uuidv4 = require('uuid/v4');
const readJson = require('../json-reader');

const exportDir = process.cwd()+'/exports';
const buildDir = exportDir + '/google/build';
const intentsDir = exportDir + '/google/build/intents';
const entitiesDir = exportDir + '/google/build/entities';
const templatesDir = __dirname+'/../templates';

console.log('Export directory:', exportDir);

module.exports = config => {
    //create the directory structure
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
    }
    if (!fs.existsSync(intentsDir)) {
        fs.mkdirSync(intentsDir);
    }
    if (!fs.existsSync(entitiesDir)) {
        fs.mkdirSync(entitiesDir);
    }

    //write the agent and package files
    var agent = readJson(templatesDir+'/agent.json');
    agent.googleAssistant.project = config.google.project;
    agent.googleAssistant.voiceType = config.google.voiceType;
    agent.webhook.url = config.fulfillmentUrl;
    fs.writeFileSync(buildDir+'/agent.json', JSON.stringify(agent, null, 2));

    var package = readJson(templatesDir+'/package.json');
    fs.writeFileSync(buildDir+'/package.json', JSON.stringify(package, null, 2));

    //write the entities
    let entities = {};
    config.google.entities.forEach(entity => {
        entities[entity.name] = entity.values;

        let writeEntity = Object.assign({}, readJson(templatesDir+'/entity.json'));

        //entries first
        let entries = [];
        entity.values.forEach(arr => {
            entries.push({
                value: arr[0],
                synonyms: arr
            });
        });
        fs.writeFileSync(entitiesDir+'/'+entity.name+'_entries_en.json', JSON.stringify(entries, null, 2));

        //then the entity file
        writeEntity.id = uuidv4();
        writeEntity.name = entity.name;
        fs.writeFileSync(entitiesDir+'/'+entity.name+'.json', JSON.stringify(writeEntity, null, 2));
    })

    //write the intents
    config.google.intents.forEach(intent => {
        let writeIntent = Object.assign({}, readJson(templatesDir+'/intent.json'));
        let aUserSays = [];
        if (Array.isArray(intent.samples)) {
            intent.samples.forEach(text => {
                let userSays = Object.assign({}, readJson(templatesDir+'/user-says.json'));
                userSays.id = uuidv4();
                userSays.updated = Date.now();

                //data is split by slots
                text.split(/\{|\}/).forEach((section, i) => {
                    if (!section) return;

                    let values = entities[section];
                    let data = {userDefined: false};
                    if (i % 2 === 0) {
                        //text
                        data.text = section;
                    } else {
                        //slot
                        data.text = values[Math.floor(Math.random() * values.length)][0];
                        data.meta = '@'+section;
                        data.alias = section;
                    }
                    userSays.data.push(data);
                });

                aUserSays.push(userSays);
            })
        }
        if (aUserSays.length) {
            fs.writeFileSync(intentsDir+'/'+intent.name+'_usersays_en.json', JSON.stringify(aUserSays, null, 2));
        }
        writeIntent.id = uuidv4();
        writeIntent.name = intent.name;
        writeIntent.events = intent.event ? [{name: intent.event}] : [];
        writeIntent.fallbackIntent = Boolean(intent.fallback);
        writeIntent.lastUpdate = Date.now();
        writeIntent.responses[0].action = intent.name;
        fs.writeFileSync(intentsDir+'/'+intent.name+'.json', JSON.stringify(writeIntent, null, 2));
    })

    //zip the build folder
    zipFolder(buildDir, exportDir+'/google/agent.zip', err => {
        if (err) console.error(err);
    });
};