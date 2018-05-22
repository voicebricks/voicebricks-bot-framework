const fs = require('fs');

module.exports = filePath => {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};