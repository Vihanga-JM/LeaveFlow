// Lets a browser on another origin (the Render static site) call the API
// directly. The alternative, a same-origin rewrite through the static site,
// makes every visitor arrive from a handful of Render addresses, which defeats
// the per-client login limit. Only origins listed in CORS_ORIGIN (comma-
// separated) are allowed; unset means same-origin only, as in dev and compose.
// Auth is a bearer header, not a cookie, so no credentials mode is needed.
function cors(req, res, next) {
  const allowed = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = req.get("Origin");

  res.vary("Origin");
  if (!origin || !allowed.includes(origin)) return next();

  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Expose-Headers", "RateLimit, RateLimit-Policy, Retry-After, X-Request-Id");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "600");
    return res.status(204).end();
  }
  next();
}

module.exports = { cors };
