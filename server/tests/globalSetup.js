// Runs once before the whole suite: bring leaveflow_test up to the latest schema.
module.exports = async () => {
  require("dotenv").config({ path: ".env.test", override: true, quiet: true });
  const pool = require("../src/db/pool");
  const { migrate } = require("../src/db/migrate");
  await migrate(pool);
  await pool.end();
};
