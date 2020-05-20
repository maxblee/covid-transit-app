const fs = require("fs");
const filePattern = /^([^/]+)\.js$/;
const commonFiles = ["add", "common", "update"];
var excludeFiles = [];
excludeFiles.push(...commonFiles);
const regionFiles = fs.readdirSync("schedules")
    .filter(filePath => filePath.match(filePattern))
    .map(filePath => filePattern.exec(filePath)[1])
    .filter(filePath => !excludeFiles.includes(filePath));

regionFiles.forEach(item => require("./" + item).add());