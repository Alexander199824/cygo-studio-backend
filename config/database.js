require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME || 'pruevascygo_studio_user',
    password: process.env.DB_PASSWORD || 'h71nSsmNt55SfDKoLacCdgslF3VRpAsk',
    database: process.env.DB_NAME || 'cygo_studio_dev',
    host: process.env.DB_HOST || 'dpg-d0ee7f3e5dus73fg2i70-a.oregon-postgres.render.com',
    dialect: 'postgres',
    logging: console.log
  },
  test: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_TEST_NAME || 'cygo_studio_test',
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
};