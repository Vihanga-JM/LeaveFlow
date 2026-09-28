const express = require("express");
const pool = require("../db/pool");

const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");
const { isDate } = require("../middleware/validate");

const router = express.Router();

router.use(requireAuth, requireRole("MANAGER", "HR_ADMIN"));

router.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const q = await pool.query(
      `SELECT lr.*, u.name AS employee_name
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       WHERE lr.status = 'PENDING'
         AND (u.manager_id = $1 OR $2 = 'HR_ADMIN')
       ORDER BY lr.created_at`,
      [req.user.id, req.user.role],
    );

    res.json(q.rows);
  }),
);

// Who on my team is already off between ?from and ?to (inclusive)?
// Only APPROVED leave counts; managers see their reports, HR sees everyone.
router.get(
  "/absences",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;

    if (!isDate(from) || !isDate(to) || to < from) {
      return res.status(400).json({
        error: {
          code: "VALIDATION",
          message: "from and to must be YYYY-MM-DD dates with to >= from",
        },
      });
    }

    const q = await pool.query(
      `SELECT lr.id, lr.user_id, u.name AS employee_name,
              lr.start_date, lr.end_date, lr.leave_type_id
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       WHERE lr.status = 'APPROVED'
         AND lr.start_date <= $2
         AND lr.end_date >= $1
         AND ($3 > 0 OR $4 = 'HR_ADMIN')
       ORDER BY lr.start_date`,
      [from, to, req.user.id, req.user.role],
    );

    res.json(q.rows);
  }),
);

module.exports = router;
