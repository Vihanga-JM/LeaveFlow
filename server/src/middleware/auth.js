const jwt = require("jsonwebtoken");

//Authentication
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token)
    return res
      .status(401)
      .json({ error: { code: "NO_TOKEN", message: "Log in first" } });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch (err) {
    // "invalid signature" (wrong/rotated secret) vs "jwt expired" (normal) —
    // the distinction is what makes a secret-rotation incident diagnosable.
    req.log?.warn({ jwtError: err.name, reason: err.message }, "token rejected");
    res
      .status(401)
      .json({
        error: { code: "BAD_TOKEN", message: "Invalid or expired token" },
      });
  }
}

//Authorization
const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : res
          .status(403)
          .json({
            error: { code: "FORBIDDEN", message: "Your role cannot do this" },
          });

module.exports = { requireAuth, requireRole };
