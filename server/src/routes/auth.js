const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");

const router = express.Router();

router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const q = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    const user = q.rows[0];

    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
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
