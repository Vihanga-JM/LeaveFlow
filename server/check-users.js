require("dotenv").config();

const pool = require("./src/db/pool");

async function checkUsers() {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM users"
    );

    console.table(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkUsers();