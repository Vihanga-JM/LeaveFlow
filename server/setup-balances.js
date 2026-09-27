require("dotenv").config();

const pool = require("./src/db/pool");

async function setup() {
  try {
    const year = new Date().getFullYear();

    await pool.query(`
      INSERT INTO leave_balances
        (user_id, leave_type_id, year, used_days)
      VALUES
        (1, 1, $1, 0),
        (1, 2, $1, 0),
        (1, 3, $1, 0),
        (2, 1, $1, 0),
        (2, 2, $1, 0),
        (2, 3, $1, 0),
        (3, 1, $1, 0),
        (3, 2, $1, 0),
        (3, 3, $1, 0)
      ON CONFLICT (user_id, leave_type_id, year)
      DO NOTHING
    `, [year]);

    console.log("Leave balances created successfully.");

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

setup();