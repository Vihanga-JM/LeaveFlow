process.env.CORS_ORIGIN = "https://leaveflow-web.example.com";

const { app, request, ISHARA } = require("./helpers");

const WEB = "https://leaveflow-web.example.com";

describe("CORS for the static site calling the API directly", () => {
  test("preflight from the allowed origin gets 204 with the allowed headers", async () => {
    const res = await request(app)
      .options("/api/leave-requests")
      .set("Origin", WEB)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type, authorization");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(WEB);
    expect(res.headers["access-control-allow-headers"]).toMatch(/Authorization/);
  });

  test("a real request from the allowed origin is allowed, and exposes RateLimit", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", WEB)
      .send({ email: ISHARA, password: "password123" });

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(WEB);
    expect(res.headers["access-control-expose-headers"]).toMatch(/RateLimit/);
  });

  test("any other origin gets no CORS headers", async () => {
    const res = await request(app).get("/api/health").set("Origin", "https://evil.example.com");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
