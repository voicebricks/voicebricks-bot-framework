const fs = require('fs');
const readJson = require('../json-reader');

const exportDir = process.cwd()+'/exports/alexa';
const templatesDir = __dirname+'/../templates';

module.exports = config => {
    var writeJson = readJson(templatesDir+'/alexa.json');
    writeJson.interactionModel.languageModel.invocationName = config.invocationName;

    config.alexa.intents.forEach(intent => {
        if (!intent.name) return;
        writeJson.interactionModel.languageModel.intents.push({
            name: intent.name,
            samples: intent.samples || [],
            slots: []
        })
    });

    config.alexa.entities.forEach(entity => {
        writeJson.interactionModel.languageModel.types.push({
            name: entity.name,
            values: entity.values.map(arr => {
                return {
                    name: {
                        value: arr[0],
                        synonyms: arr.slice(1)
                    }
                };
            })
        })
    });

    fs.writeFileSync(exportDir+'/alexa.json', JSON.stringify(writeJson, null, 2));
};