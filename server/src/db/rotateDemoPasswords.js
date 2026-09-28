const bcrypt = require("bcrypt");

// The seed users (002_seed.sql) share a password that is published in this
// public repo. On a deployed stack, set DEMO_USER_PASSWORD and every account
// still using the seed password gets the new one on the next start. Accounts
// that already have a different password are never touched, so running this
// on every boot is safe. To rotate again later, change the value and reset the
// affected hashes by hand — this only replaces the published default.
const SEED_PASSWORD = "password123";
const MIN_LENGTH = 12;

async function rotateDemoPasswords(pool, newPassword) {
  if (!newPassword) return 0;
  if (newPassword.length < MIN_LENGTH) {
    throw new Error(`DEMO_USER_PASSWORD must be at least ${MIN_LENGTH} characters`);
  }

  const users = await pool.query("SELECT id, password_hash FROM users");
  const newHash = await bcrypt.hash(newPassword, 10);

  let changed = 0;
  for (const u of users.rows) {
    if (await bcrypt.compare(SEED_PASSWORD, u.password_hash)) {
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, u.id]);
      changed++;
    }
  }
  return changed;
}

module.exports = { rotateDemoPasswords };

if (require.main === module) {
  const pool = require("./pool");

  rotateDemoPasswords(pool, process.env.DEMO_USER_PASSWORD)
    .then((n) => {
      if (n) console.log(`replaced the seed password on ${n} account(s)`);
      return pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
