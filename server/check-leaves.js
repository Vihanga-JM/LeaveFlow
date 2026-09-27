require("dotenv").config();

const pool = require("./src/db/pool");

async function check() {
  try {
    const balances = await pool.query(`
      SELECT *
      FROM leave_balances
      ORDER BY user_id, leave_type_id, year
    `);

    console.log("\nLEAVE BALANCES:");
    console.table(balances.rows);

    const requests = await pool.query(`
      SELECT
        id,
        user_id,
        leave_type_id,
        start_date,
        end_date,
        status,
        reason
      FROM leave_requests
      ORDER BY id
    `);

    console.log("\nLEAVE REQUESTS:");
    console.table(requests.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();