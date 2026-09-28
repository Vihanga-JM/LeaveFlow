// This file loads the app with the production login limit (10/min).
process.env.LOGIN_RATE_LIMIT = "10";

const { app, request, ISHARA } = require("./helpers");

describe("login brute-force protection", () => {
  test("the 11th attempt within a minute gets 429 with the friendly message", async () => {
    const attempts = [];
    for (let i = 0; i < 10; i++) {
      attempts.push(await request(app).post("/api/auth/login").send({ email: ISHARA, password: "wrong" }));
    }
    expect(attempts.every((r) => r.status === 401)).toBe(true);

    const eleventh = await request(app).post("/api/auth/login").send({ email: ISHARA, password: "wrong" });
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe("TOO_MANY_ATTEMPTS");
  });
});

describe("request ids", () => {
  test("every response carries an x-request-id header", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
