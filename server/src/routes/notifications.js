const express = require("express");
const pool = require("../db/pool");

const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errors");

const router = express.Router();

router.use(requireAuth);

// US-8: your latest notifications, newest first, with everything the client
// needs to write the sentence ("Ruwan approved your Annual leave ...").
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([
      pool.query(
        `SELECT n.id, n.kind, n.read_at, n.created_at, n.leave_request_id,
                actor.name AS actor_name, owner.name AS employee_name,
                lt.name AS leave_type, lr.start_date, lr.end_date, lr.day_part,
                lr.days, lr.decision_note
         FROM notifications n
         JOIN users actor ON actor.id = n.actor_id
         JOIN leave_requests lr ON lr.id = n.leave_request_id
         JOIN users owner ON owner.id = lr.user_id
         JOIN leave_types lt ON lt.id = lr.leave_type_id
         WHERE n.user_id = $1
         ORDER BY n.created_at DESC, n.id DESC
         LIMIT 30`,
        [req.user.id],
      ),
      pool.query(
        "SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL",
        [req.user.id],
      ),
    ]);

    res.json({ unread: unread.rows[0].n, items: items.rows });
  }),
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await pool.query(
      "UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL",
      [req.user.id],
    );
    res.status(204).end();
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({
        error: { code: "VALIDATION", message: "id must be a number" },
      });
    }

    // Someone else's notification is a 404, not a 403: don't confirm it exists.
    const result = await pool.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, now())
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "No such notification" },
      });
    }
    res.status(204).end();
  }),
);

module.exports = router;
