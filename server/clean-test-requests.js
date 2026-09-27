require("dotenv").config();

const pool = require("./src/db/pool");

async function clean() {
  try {
    await pool.query(`
      DELETE FROM leave_requests
      WHERE id IN (2, 3, 4, 5)
    `);

    console.log("Test leave requests deleted.");

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

clean();