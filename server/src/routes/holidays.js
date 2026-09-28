const express = require("express");
const pool = require("../db/pool");

const { requireAuth, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");
const { validate, required, isDate } = require("../middleware/validate");

const router = express.Router();

router.use(requireAuth);

// Anyone logged in may read the calendar (the apply form uses it).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const q = await pool.query(
      `SELECT holiday_date, name FROM public_holidays
       WHERE holiday_date BETWEEN $1 AND $2
       ORDER BY holiday_date`,
      [`${year}-01-01`, `${year}-12-31`],
    );
    res.json(q.rows);
  }),
);

router.post(
  "/",
  requireRole("HR_ADMIN"),
  validate([
    ["holiday_date", isDate, "must be YYYY-MM-DD"],
    ["name", (v) => required(v) && String(v).trim() !== "", "is required"],
  ]),
  asyncHandler(async (req, res) => {
    const q = await pool.query(
      `INSERT INTO public_holidays (holiday_date, name) VALUES ($1, $2)
       ON CONFLICT (holiday_date) DO NOTHING
       RETURNING holiday_date, name`,
      [req.body.holiday_date, req.body.name.trim()],
    );

    if (!q.rowCount) {
      return res.status(409).json({
        error: { code: "HOLIDAY_EXISTS", message: "There is already a holiday on that date" },
      });
    }

    res.status(201).json(q.rows[0]);
  }),
);

router.delete(
  "/:date",
  requireRole("HR_ADMIN"),
  asyncHandler(async (req, res) => {
    if (!isDate(req.params.date)) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "date must be YYYY-MM-DD" } });
    }

    const q = await pool.query("DELETE FROM public_holidays WHERE holiday_date = $1", [req.params.date]);

    if (!q.rowCount) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "No holiday on that date" } });
    }

    res.status(204).end();
  }),
);

module.exports = router;
