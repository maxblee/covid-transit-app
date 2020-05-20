// Update with your config settings.
if (process.env.NODE_ENV !== "production") {
  const dotenv = require("dotenv")
  dotenv.config();
}

module.exports = {

  development: {
    client: "pg",
    connection: {
        host: "localhost",
        user: process.env.COVID_USER,
        password: process.env.COVID_PWD,
        database: process.env.COVID_DB,
        port: process.env.COVID_PORT
    }
},

  staging: {
    client: "pg",
    connection: {
        host: "localhost",
        user: process.env.COVID_USER,
        password: process.env.COVID_PWD,
        database: process.env.COVID_DB,
        port: process.env.COVID_PORT
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: "pg",
    connection: {
        host: "localhost",
        user: process.env.COVID_USER,
        password: process.env.COVID_PWD,
        database: process.env.COVID_DB,
        port: process.env.COVID_PORT
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
