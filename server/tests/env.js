// Runs before every test file: point the app at the test database.
require("dotenv").config({ path: ".env.test", override: true, quiet: true });
