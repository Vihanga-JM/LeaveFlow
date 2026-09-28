const fs = require('fs');
const path = require('path');
const { defineConfig } = require('@playwright/test');

// The E2E suite runs against the *test* database on its own ports, so it never
// touches your dev data or collides with a dev server already running on 4000/5173.
function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .filter((line) => line.includes('='))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  );
}

const testEnv = { ...readEnv(path.join(__dirname, 'server', '.env.test')), ...process.env };
const API_PORT = 4001;
const WEB_PORT = 5174;

module.exports = defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  workers: 1,
  use: { baseURL: `http://localhost:${WEB_PORT}` },
  webServer: [
    {
      command: 'npm run start --prefix server',
      port: API_PORT,
      reuseExistingServer: false,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: testEnv.DATABASE_URL,
        JWT_SECRET: testEnv.JWT_SECRET || 'e2e-secret',
      },
    },
    {
      command: `npm run dev --prefix client -- --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: false,
      env: { API_URL: `http://localhost:${API_PORT}` },
    },
  ],
});
