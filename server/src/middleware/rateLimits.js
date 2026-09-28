const net = require("net");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const TOO_MANY = {
  error: {
    code: "TOO_MANY_ATTEMPTS",
    message: "Too many login attempts. Try again in a minute.",
  },
};

// Behind a CDN, req.ip is often one of many rotating edge addresses rather than
// the visitor. On Render (Cloudflare in front), X-Forwarded-For looks like
// "client, cloudflare-edge, render-internal", so TRUST_PROXY=1 picks the
// rotating internal hop and one attacker is spread across many keys.
// CLIENT_IP_HEADER names a header the CDN overwrites with the real client IP
// (Cloudflare: cf-connecting-ip). Leave it unset where no CDN sets it — anyone
// could send it themselves.
function clientIp(req) {
  const header = process.env.CLIENT_IP_HEADER;
  if (header) {
    const value = String(req.get(header) || "").trim();
    if (net.isIP(value)) return value;
  }
  return req.ip;
}

// Brute-force guard per client: 10 attempts a minute (configurable so the test
// suite, which logs in dozens of times, isn't throttled).
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT || 10),
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: TOO_MANY,
});

// Brute-force guard per account, independent of IP: an attacker rotating
// addresses still gets only 10 wrong guesses per email per 15 minutes.
// Successful logins don't count, so the real user isn't locked out by using
// the app normally.
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ACCOUNT_LOGIN_LIMIT || 10),
  keyGenerator: (req) => `account:${String(req.body?.email || "").trim().toLowerCase()}`,
  skipSuccessfulRequests: true,
  standardHeaders: false,
  legacyHeaders: false,
  message: TOO_MANY,
});

module.exports = { loginLimiter, accountLimiter, clientIp };
