
const { Pool } = require("pg");

module.exports = new Pool({ connectionString: process.env.DATABASE_URL });
require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;

