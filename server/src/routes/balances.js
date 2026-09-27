const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        lt.id,
        lt.name,
        lt.annual_allocation,
        COALESCE(lb.used_days, 0) AS used_days
      FROM leave_types lt
      LEFT JOIN leave_balances lb
        ON lb.leave_type_id = lt.id
        AND lb.user_id = $1
        AND lb.year = $2
      `,
      [userId, new Date().getFullYear()],
    );

    res.json(result.rows);
  }),
);

module.exports = router;
