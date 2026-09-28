const path = require('path');

// Start every E2E run from a clean slate: seeded users, no requests, no balances.
module.exports = async () => {
  require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
    path: path.join(__dirname, '..', 'server', '.env.test'),
    quiet: true,
  });
  const pool = require('../server/src/db/pool');
  const { migrate } = require('../server/src/db/migrate');
  await migrate(pool);
  await pool.query('TRUNCATE leave_requests, leave_balances RESTART IDENTITY CASCADE');
  await pool.end();
};
