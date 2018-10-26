const fs = require('fs');
const dialogflow = require('dialogflow');
const zipFolder = require('zip-folder');
const uuidv4 = require('uuid/v4');
const readJson = require('../json-reader');

const exportDir = process.cwd() + '/exports';
const credentialsDir = process.cwd() + '/credentials';
const buildDir = exportDir + '/google/build';
const intentsDir = exportDir + '/google/build/intents';
const entitiesDir = exportDir + '/google/build/entities';
const templatesDir = __dirname + '/../templates';

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
  var agent = readJson(templatesDir + '/agent.json');
  agent.googleAssistant.project = config.google.project;
  agent.googleAssistant.voiceType = config.google.voiceType;
  agent.webhook.url = config.fulfillmentUrl + '/bot/google';
  fs.writeFileSync(buildDir + '/agent.json', JSON.stringify(agent, null, 2));

  var package = readJson(templatesDir + '/package.json');
  fs.writeFileSync(buildDir + '/package.json', JSON.stringify(package, null, 2));

  //write the entities
  let entities = {};
  config.google.entities.forEach(entity => {
    entities[entity.name] = entity.values;

    let writeEntity = Object.assign({}, readJson(templatesDir + '/entity.json'));

    //entries first
    let entries = [];
    entity.values.forEach(arr => {
      entries.push({
        value: arr[0],
        synonyms: arr
      });
    });
    fs.writeFileSync(entitiesDir + '/' + entity.name + '_entries_en.json', JSON.stringify(entries, null, 2));

    //then the entity file
    writeEntity.id = uuidv4();
    writeEntity.name = entity.name;
    writeEntity.automatedExpansion = entity.automatedExpansion;
    fs.writeFileSync(entitiesDir + '/' + entity.name + '.json', JSON.stringify(writeEntity, null, 2));
  })

  //write the intents
  config.google.intents.forEach(intent => {
    let writeIntent = Object.assign({}, readJson(templatesDir + '/intent.json'));

    /*
     * User says samples
     */
    let aUserSays = [];
    if (Array.isArray(intent.samples)) {
      intent.samples.forEach(text => {
        let userSays = Object.assign({}, readJson(templatesDir + '/user-says.json'));
        userSays.id = uuidv4();
        userSays.updated = Date.now();

        //data is split by slots
        let sections = text.split(/\{|\}/);
        sections.forEach((section, i) => {
          if (!section) return;

          let data = {userDefined: false};
          if (i % 2 === 0) {
            //text
            data.text = section;
          } else {
            const parameter = intent.parameters[section];
            const type = typeof parameter === 'string' ? parameter : (parameter || {}).type;
            const values = entities[type];

            //slot
            data.alias = section;
            if (values) {
              //custom entity
              data.text = values[Math.floor(Math.random() * values.length)][0];
              data.meta = '@' + section;
            } else if (parameter) {
              //system entity
              switch (type) {
                case 'number-integer':
                  data.text = Math.ceil(Math.random(9));
                  data.meta = '@sys.number-integer';
              }
            }

            if (!data.meta) {
              throw new Error('Entity type is not defined for ' + type);
            }
          }
          userSays.data.push(data);
        });

        userSays.count = Math.max((sections.length - 1) / 2 - 1, 0);

        aUserSays.push(userSays);
      })
    }
    if (aUserSays.length) {
      fs.writeFileSync(intentsDir + '/' + intent.name + '_usersays_en.json', JSON.stringify(aUserSays, null, 2));
    }

    /*
     * Parameters
     */
    for (var paramName in intent.parameters) {
      let param = intent.parameters[paramName];
      let type = typeof param === 'string' ? param : (param || {}).type;

      writeIntent.responses[0].parameters.push({
        "id": uuidv4(),
        "required": false,
        "dataType": '@' + (entities[type] ? type : 'sys.' + type),
        "name": paramName,
        "value": "$" + paramName,
        "isList": false
      })
    }

    writeIntent.id = uuidv4();
    writeIntent.name = intent.name;
    writeIntent.events = intent.event ? [{name: intent.event}] : [];
    writeIntent.fallbackIntent = Boolean(intent.fallback);
    writeIntent.lastUpdate = Date.now();
    writeIntent.responses[0].action = intent.name;
    fs.writeFileSync(intentsDir + '/' + intent.name + '.json', JSON.stringify(writeIntent, null, 2));
  })

  //zip the build folder
  zipFolder(buildDir, exportDir + '/google/agent.zip', err => {
    if (err) console.error(err);
    else {
      try {
        const googleCreds = JSON.parse(fs.readFileSync(credentialsDir + '/google.json', 'utf8'));

        const client = new dialogflow.v2.AgentsClient({
          credentials: {
            client_email: googleCreds.client_email,
            private_key: googleCreds.private_key
          }
        });
        const formattedParent = client.projectPath('cocktailmate-58c1c');

        //import zip
        client.importAgent({
          parent: formattedParent,
          agentContent: Buffer.from(fs.readFileSync(exportDir + '/google/agent.zip')).toString('base64')
        }).then(response => {
          console.log('Dialogflow agent uploaded');

          client.trainAgent({parent: formattedParent})
          .then(([operation]) => {
            console.log('Dialogflow training started');
            return operation.promise()
          }, err => console.error(err))
          .then(([result, metadata, final]) => {
            console.log('Training complete');
          });
        }, err => {
          console.error(err);
        })
      } catch (err) {
        reject('Could not find or parse google credentials file at credentials/google.json');
      }
    }
  });
};