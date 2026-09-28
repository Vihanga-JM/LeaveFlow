require("dotenv").config({ quiet: true });

const { Pool, types } = require("pg");

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates.
// A JS Date is created at local midnight, so in Colombo (UTC+5:30)
// 2026-09-25 serialises as "2026-09-24T18:30:00.000Z" — the wrong day.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
