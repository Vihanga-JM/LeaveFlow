require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("./src/db/pool");

async function resetPassword() {
  try {
    const password = "Test1234!";
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2",
      [passwordHash, "ishara@ceylonroots.lk"]
    );

    console.log("Password reset successfully.");
    console.log("Email: ishara@ceylonroots.lk");
    console.log("Password: Test1234!");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

resetPassword();