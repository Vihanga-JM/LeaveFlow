// Runs before every test file: point the app at the test database.
require("dotenv").config({ path: ".env.test", override: true, quiet: true });

// The suite logs in dozens of times a minute; security.test.js re-enables the real limit.
process.env.LOGIN_RATE_LIMIT = process.env.LOGIN_RATE_LIMIT || "1000";
