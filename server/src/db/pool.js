require("dotenv").config({ quiet: true });

const fs = require("fs");
const { Pool, types } = require("pg");

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates.
// A JS Date is created at local midnight, so in Colombo (UTC+5:30)
// 2026-09-25 serialises as "2026-09-24T18:30:00.000Z" — the wrong day.
types.setTypeParser(1082, (value) => value);

// Managed databases (AWS RDS, Render external URLs) require TLS.
// DATABASE_SSL=true turns it on; DATABASE_SSL_CA points at the provider's CA
// bundle (e.g. AWS's global-bundle.pem) so the server certificate is verified.
function sslConfig() {
  if (process.env.DATABASE_SSL !== "true") return undefined;
  if (process.env.DATABASE_SSL_CA) {
    return { ca: fs.readFileSync(process.env.DATABASE_SSL_CA, "utf8") };
  }
  return { rejectUnauthorized: false }; // encrypted, but not verified — prefer the CA bundle
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig(),
});

module.exports = pool;
