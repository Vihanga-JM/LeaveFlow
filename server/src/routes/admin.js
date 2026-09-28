const express = require("express");
const pool = require("../db/pool");

const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");

const router = express.Router();

router.use(requireAuth, requireRole("HR_ADMIN"));

router.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const q = await pool.query(
      `SELECT lr.*, u.name AS employee_name, lt.name AS leave_type
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       ORDER BY lr.created_at DESC`,
    );

    res.json(q.rows);
  }),
);

module.exports = router;
