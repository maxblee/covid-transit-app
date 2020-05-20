function setUpEnvironment() {
    if (process.env.NODE_ENV !== "production") {
        const dotenv = require("dotenv");
        dotenv.config();
    }
}

function db() {
    // https://frontend.turing.io/lessons/module-4/knex-postgres.html
    const environment = process.env.NODE_ENV || "development";
    const dbConfig = require("../knexfile")[environment];
    const db = require("knex")(dbConfig);
    return db; 
}

module.exports = {
    setUpEnvironment,
    db
}