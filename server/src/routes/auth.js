const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");

const router = express.Router();

// Brute-force guard: 10 attempts per minute per client IP (configurable so the
// test suite, which logs in dozens of times, isn't throttled).
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT || 10),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many login attempts. Try again in a minute.",
    },
  },
});

// A real bcrypt hash of a random string. Comparing against it when the email is
// unknown makes both failure paths take the same ~100 ms, so response time no
// longer reveals which emails have accounts (BUG-006).
const DUMMY_HASH = bcrypt.hashSync(require("crypto").randomUUID(), 10);

router.post(
  "/auth/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const q = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    const user = q.rows[0];

    const passwordOk = await bcrypt.compare(
      password || "",
      user ? user.password_hash : DUMMY_HASH,
    );

    if (!user || !passwordOk) {
      return res.status(401).json({
        error: {
          code: "BAD_CREDENTIALS",
          message: "Wrong email or password",
        },
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      },
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [req.user.id],
    );

    res.json(q.rows[0]);
  }),
);

module.exports = router;
