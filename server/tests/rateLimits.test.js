// Render deploy finding: behind Cloudflare, req.ip rotated between edge
// addresses, so one client's attempts were spread over many limiter keys and
// never reached 429. These run with small limits and the Cloudflare header on.
process.env.LOGIN_RATE_LIMIT = "3";
process.env.ACCOUNT_LOGIN_LIMIT = "5";
process.env.CLIENT_IP_HEADER = "cf-connecting-ip";

const { app, request, ISHARA, DILINI } = require("./helpers");

const login = (ip, email, password = "wrong") => {
  const r = request(app).post("/api/auth/login");
  if (ip) r.set("CF-Connecting-IP", ip);
  return r.send({ email, password });
};

describe("per-client limit keyed on the CDN's client-IP header", () => {
  test("the same client is counted together; a different client is not", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await login("203.0.113.10", "nobody1@example.com")).status).toBe(401);
    }
    expect((await login("203.0.113.10", "nobody1@example.com")).status).toBe(429);
    expect((await login("203.0.113.11", "nobody1@example.com")).status).toBe(401);
  });

  test("a garbage header value falls back to req.ip instead of making a new key", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await login(`not-an-ip-${i}`, "nobody2@example.com")).status).toBe(401);
    }
    expect((await login("not-an-ip-x", "nobody2@example.com")).status).toBe(429);
  });
});

describe("per-account limit, independent of IP", () => {
  test("wrong passwords from many IPs against one email get 429 after 5", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await login(`198.51.100.${i}`, ISHARA)).status).toBe(401);
    }
    const sixth = await login("198.51.100.99", ISHARA);
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe("TOO_MANY_ATTEMPTS");

    // Email case doesn't create a fresh bucket.
    expect((await login("198.51.100.98", ISHARA.toUpperCase())).status).toBe(429);
  });

  test("another account is unaffected, and successful logins don't count", async () => {
    for (let i = 0; i < 8; i++) {
      expect((await login(`192.0.2.${i}`, DILINI, "password123")).status).toBe(200);
    }
    expect((await login("192.0.2.50", DILINI)).status).toBe(401);
  });
});
