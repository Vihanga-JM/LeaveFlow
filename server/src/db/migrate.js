const fs = require("fs");
const path = require("path");

const pool = require("./pool");

const dir = path.join(__dirname, "migrations");

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const seen = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      [file],
    );

    if (seen.rowCount) continue;

    await pool.query(fs.readFileSync(path.join(dir, file), "utf8"));

    await pool.query("INSERT INTO schema_migrations(filename) VALUES($1)", [
      file,
    ]);

    console.log("applied", file);
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
