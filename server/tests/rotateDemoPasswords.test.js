const bcrypt = require("bcrypt");
const pool = require("../src/db/pool");
const { rotateDemoPasswords } = require("../src/db/rotateDemoPasswords");
const { app, request, ISHARA, RUWAN, DILINI } = require("./helpers");

// The public seed password must not survive on a deployed stack.

const login = (email, password) => request(app).post("/api/auth/login").send({ email, password });

afterEach(async () => {
  // Other test files log in with the seed password; put it back. (afterEach,
  // not afterAll: tests/setup.js closes the pool in its own afterAll first.)
  const seedHash = await bcrypt.hash("password123", 10);
  await pool.query("UPDATE users SET password_hash = $1", [seedHash]);
});

describe("rotateDemoPasswords", () => {
  test("does nothing when no new password is set", async () => {
    expect(await rotateDemoPasswords(pool, undefined)).toBe(0);
    expect((await login(ISHARA, "password123")).status).toBe(200);
  });

  test("refuses a short password", async () => {
    await expect(rotateDemoPasswords(pool, "short")).rejects.toThrow(/at least 12/);
  });

  test("replaces the seed password, and leaves changed passwords alone", async () => {
    // Dilini already chose her own password.
    const own = await bcrypt.hash("dilini-own-password", 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [own, DILINI]);

    const changed = await rotateDemoPasswords(pool, "new-demo-password-2026");
    expect(changed).toBeGreaterThanOrEqual(2);

    expect((await login(ISHARA, "password123")).status).toBe(401);
    expect((await login(ISHARA, "new-demo-password-2026")).status).toBe(200);
    expect((await login(RUWAN, "new-demo-password-2026")).status).toBe(200);
    expect((await login(DILINI, "dilini-own-password")).status).toBe(200);

    // Running again on the next boot changes nothing.
    expect(await rotateDemoPasswords(pool, "new-demo-password-2026")).toBe(0);
  });
});
