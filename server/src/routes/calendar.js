const express = require("express");
const pool = require("../db/pool");

const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");

const router = express.Router();

router.use(requireAuth);

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// US-7: who is off in a month, plus that month's public holidays.
// Same visibility as the rest of the app: employees see their own leave,
// managers see themselves and their reports, HR sees everyone. Only PENDING and
// APPROVED requests are shown — cancelled and rejected leave isn't absence.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const month = req.query.month || currentMonth();
    const m = MONTH.exec(month);
    if (!m) {
      return res.status(400).json({
        error: { code: "VALIDATION", message: "month must be YYYY-MM" },
      });
    }

    const year = Number(m[1]);
    const monthIndex = Number(m[2]);
    const first = `${month}-01`;
    const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
    const last = `${month}-${String(lastDay).padStart(2, "0")}`;

    const [leave, holidays] = await Promise.all([
      pool.query(
        `SELECT lr.id, lr.user_id, u.name AS employee_name, lt.name AS leave_type,
                lr.start_date, lr.end_date, lr.day_part, lr.days, lr.status
         FROM leave_requests lr
         JOIN users u ON u.id = lr.user_id
         JOIN leave_types lt ON lt.id = lr.leave_type_id
         WHERE lr.status IN ('PENDING', 'APPROVED')
           AND lr.start_date <= $2
           AND lr.end_date >= $1
           AND ($3 = 'HR_ADMIN' OR u.id = $4 OR ($3 = 'MANAGER' AND u.manager_id = $4))
         ORDER BY lr.start_date, u.name`,
        [first, last, req.user.role, req.user.id],
      ),
      pool.query(
        `SELECT holiday_date, name FROM public_holidays
         WHERE holiday_date BETWEEN $1 AND $2
         ORDER BY holiday_date`,
        [first, last],
      ),
    ]);

    res.json({ month, first, last, leave: leave.rows, holidays: holidays.rows });
  }),
);

module.exports = router;
