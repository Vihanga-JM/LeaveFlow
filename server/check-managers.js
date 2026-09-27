require("dotenv").config();

const pool = require("./src/db/pool");

async function check() {
  try {
    const result = await pool.query(`
      SELECT id, name, email, role, manager_id
      FROM users
      ORDER BY id
    `);

    console.table(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();