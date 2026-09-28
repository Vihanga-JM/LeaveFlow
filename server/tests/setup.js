const pool = require("../src/db/pool");

beforeEach(async () => {
  await pool.query("TRUNCATE leave_requests, leave_balances RESTART IDENTITY CASCADE");
  // users and leave_types come from 002_seed.sql and are never truncated:
  // every test relies on the same Ruwan / Ishara / Dilini fixtures.
});

afterAll(async () => {
  await pool.end();
});
