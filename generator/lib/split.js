const bracketsRegex = /\(([^()]+)\)/;
const spacesRegex = /\s{2,}/g;

const process = (str, output = []) => {
    let match = bracketsRegex.exec(str);

    if (!match) {
        output.indexOf(str) === -1 && output.push(str);
        return;
    }

    match[1].split('|').forEach(part => {
        process(str.replace(match[0], part)
            .replace(spacesRegex, ' ')
            .trim()
        , output);
    });

    return output;
};

const processArray = (arr, output = []) => {
    arr.forEach(str => {
        process(str, output);
    });

    return output;
};

module.exports = {
    process,
    processArray
};