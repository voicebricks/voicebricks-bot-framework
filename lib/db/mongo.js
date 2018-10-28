var mongoose = require('mongoose');

const uri = process.env.MONGO_DSN;
//console.log('Connection to Mongo with URI ', uri);
let db = null;

module.exports = {schema: {}, db: null};

let connect = () => new Promise((resolve, reject) => {
    if (db) {
        resolve(db);
        return;
    }
    mongoose.connect(uri);
    mongoose.connection.on('error', err => reject('connection error: ' + err.message));
    mongoose.connection.once('open', function() {
        module.exports.db = db = mongoose.connection;
        resolve(module.exports);
    });
});

module.exports.close = () => db && db.close();
module.exports.connectMiddleware = bot => (req, res, next) => {
    //console.log('DB connect middleware');
    connect().catch(err => console.error(err)).then(db => {
        Object.assign(bot, db);
        next();
    });
};

/*
 * Schema definitions
 */
var Schema = mongoose.Schema;

var messageSchema = new Schema({
    appId:  String,
    key: String,
    message:   String
});

var appSchema = new Schema({
    name: String,
    dialogflowDeveloperAccessToken: String,
    googleProjectId: String,
    skillId:   String
});

var userSchema = new Schema({
    uuid: String,
    data: String,
});

module.exports.schema.Message = mongoose.model('messages', messageSchema);
module.exports.schema.App = mongoose.model('apps', appSchema);
module.exports.schema.User = mongoose.model('users', userSchema);
