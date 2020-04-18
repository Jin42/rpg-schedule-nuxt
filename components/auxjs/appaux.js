const moment = require("moment");
const { toPairs } = require("lodash");

const log = (...content) => {
  console.log(moment().format("lll") + ":", ...content);
};

const parseConfigURLs = (paths) => {
  let urls = [];
  toPairs(paths).forEach((entry) => {
    const [id, path] = entry;
    if (path.hasOwnProperty("path")) {
      urls.push(path);
    } else if (path instanceof Object) {
      urls = [...urls, ...parseConfigURLs(path)];
    }
    return [id, path];
  });
  return urls;
};

module.exports = {
  log: log,
  parseConfigURLs: parseConfigURLs
};