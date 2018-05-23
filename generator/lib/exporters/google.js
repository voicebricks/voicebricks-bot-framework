const fs = require('fs');
const zipFolder = require('zip-folder');
const uuidv4 = require('uuid/v4');
const readJson = require('../json-reader');

const exportDir = process.cwd()+'/exports';
const buildDir = exportDir + '/google/build';
const intentsDir = exportDir + '/google/build/intents';
const templatesDir = process.cwd()+'/config/lib/templates';

console.log('Export directory:', exportDir);

module.exports = config => {
    //create the directory structure
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
    }
    if (!fs.existsSync(intentsDir)) {
        fs.mkdirSync(intentsDir);
    }

    //write the agent and package files
    var agent = readJson(templatesDir+'/agent.json');
    agent.googleAssistant.project = config.google.project;
    agent.googleAssistant.voiceType = config.google.voiceType;
    agent.webhook.url = config.fulfillmentUrl;
    fs.writeFileSync(buildDir+'/agent.json', JSON.stringify(agent, null, 2));

    var package = readJson(templatesDir+'/package.json');
    fs.writeFileSync(buildDir+'/package.json', JSON.stringify(package, null, 2));

    //write the intents
    config.google.intents.forEach(intent => {
        let writeIntent = Object.assign({}, readJson(templatesDir+'/intent.json'));
        let aUserSays = [];
        if (Array.isArray(intent.samples)) {
            intent.samples.forEach(text => {
                let userSays = Object.assign({}, readJson(templatesDir+'/user-says.json'));
                userSays.id = uuidv4();
                userSays.data[0].text = text;
                userSays.updated = Date.now();
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