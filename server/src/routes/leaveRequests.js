const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");
const { validate, required, isDate } = require("../middleware/validate");

const { leaveDays } = require("../lib/leaveDays");
const { holidaysBetween } = require("../lib/holidays");

const router = express.Router();

router.use(requireAuth);

router.post(
  "/",
  validate([
    ["leave_type_id", required, "is required"],
    ["start_date", isDate, "must be YYYY-MM-DD"],
    ["end_date", isDate, "must be YYYY-MM-DD"],
    [
      "end_date",
      (value, req) => value >= req.body.start_date,
      "must be on or after start_date",
    ],
  ]),
  asyncHandler(async (req, res) => {
    const { leave_type_id, start_date, end_date, reason } = req.body;

    const userId = req.user.id;

    const year = Number(start_date.slice(0, 4));

    const lt = await pool.query(
      "SELECT annual_allocation FROM leave_types WHERE id=$1",
      [leave_type_id],
    );

    if (!lt.rowCount) {
      return res.status(400).json({
        error: {
          code: "BAD_TYPE",
          message: "Unknown leave type",
        },
      });
    }

    const bal = await pool.query(
      `
      SELECT used_days
      FROM leave_balances
      WHERE user_id=$1
      AND leave_type_id=$2
      AND year=$3
      `,
      [userId, leave_type_id, year],
    );

    const used = bal.rowCount ? Number(bal.rows[0].used_days) : 0;

    const holidays = await holidaysBetween(pool, start_date, end_date);

    if (used + leaveDays(start_date, end_date, holidays) > lt.rows[0].annual_allocation) {
      return res.status(409).json({
        error: {
          code: "INSUFFICIENT_BALANCE",
          message: "Insufficient balance",
        },
      });
    }

    const overlap = await pool.query(
      `
      SELECT 1
      FROM leave_requests
      WHERE user_id = $1
      AND status IN ('PENDING', 'APPROVED')
      AND start_date <= $3
      AND end_date >= $2
      `,
      [userId, start_date, end_date],
    );

    if (overlap.rowCount) {
      return res.status(409).json({
        error: {
          code: "OVERLAPPING_REQUEST",
          message: "You already have a pending or approved request on these dates",
        },
      });
    }

    const ins = await pool.query(
      `
      INSERT INTO leave_requests
      (
        user_id,
        leave_type_id,
        start_date,
        end_date,
        reason
      )
      VALUES($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [userId, leave_type_id, start_date, end_date, reason],
    );

    res.status(201).json(ins.rows[0]);
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result =
      req.user.role === "HR_ADMIN"
        ? await pool.query(
            "SELECT * FROM leave_requests ORDER BY created_at DESC",
          )
        : await pool.query(
            "SELECT * FROM leave_requests WHERE user_id=$1 ORDER BY created_at DESC",
            [req.user.id],
          );

    res.json(result.rows);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { action, decision_note } = req.body;
    if (!["approve", "reject", "cancel"].includes(action)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid action",
        },
      });
    }

    const q = await pool.query(
      `
      SELECT lr.user_id, u.manager_id
      FROM leave_requests lr
      JOIN users u ON u.id = lr.user_id
      WHERE lr.id=$1
      `,
      [req.params.id],
    );

    if (!q.rowCount) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "No such request",
        },
      });
    }

    const { user_id, manager_id } = q.rows[0];

    if (action === "cancel" && user_id !== req.user.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Only the owner can cancel",
        },
      });
    }

    if (action !== "cancel") {
      if (!["MANAGER", "HR_ADMIN"].includes(req.user.role)) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Managers only",
          },
        });
      }

      if (req.user.role === "MANAGER" && manager_id !== req.user.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Not your report",
          },
        });
      }
    }
    if (action === "reject" && !decision_note?.trim()) {
      return res.status(400).json({
        error: {
          code: "VALIDATION",
          message: "decision_note is required when rejecting",
        },
      });
    }
    const status =
      action === "approve"
        ? "APPROVED"
        : action === "reject"
          ? "REJECTED"
          : "CANCELLED";

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
        UPDATE leave_requests
        SET
          status = $1,
          decided_by = $2,
          decided_at = now(),
          decision_note = $4
        WHERE id = $3
        AND status = 'PENDING'
        RETURNING *
        `,
        [
          status,
          req.user.id,
          req.params.id,
          action === "reject" ? decision_note.trim() : null,
        ],
      );

      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: {
            code: "INVALID_STATE",
            message: "Request is not pending",
          },
        });
      }

      const r = result.rows[0];

      // Approval consumes balance: status and balance change together or not at all.
      if (status === "APPROVED") {
        await client.query(
          `
          INSERT INTO leave_balances (user_id, leave_type_id, year, used_days)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, leave_type_id, year)
          DO UPDATE SET used_days = leave_balances.used_days + EXCLUDED.used_days
          `,
          [
            r.user_id,
            r.leave_type_id,
            Number(r.start_date.slice(0, 4)),
            leaveDays(r.start_date, r.end_date, await holidaysBetween(client, r.start_date, r.end_date)),
          ],
        );
      }

      await client.query("COMMIT");
      res.json(r);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

module.exports = router;
