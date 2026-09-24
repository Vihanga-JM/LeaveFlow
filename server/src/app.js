const express = require("express");
const db = require("./db");

const app = express();
app.use(express.json());

function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/leave-requests", (req, res, next) => {
  const status = req.query.status;

  const validStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

  if (status && !validStatuses.includes(status)) {
    return next(httpError(400, "VALIDATION_ERROR", "unknown status"));
  }

  if (status) {
    const rows = db
      .prepare("SELECT * FROM leave_requests WHERE status = ? ORDER BY id")
      .all(status);

    return res.json(rows);
  }

  const rows = db.prepare("SELECT * FROM leave_requests ORDER BY id").all();

  res.json(rows);
});

app.post("/api/leave-requests", (req, res, next) => {
  const { user_id, start_date, end_date, reason } = req.body;
  if (!user_id || !start_date || !end_date) {
    return next(
      httpError(
        400,
        "VALIDATION_ERROR",
        "user_id, start_date and end_date are required",
      ),
    );
  }
  if (end_date < start_date) {
    return next(
      httpError(
        400,
        "VALIDATION_ERROR",
        "end_date must be on or after start_date",
      ),
    );
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  const numberOfDays =
    (new Date(end_date) - new Date(start_date)) / millisecondsPerDay + 1;

  if (numberOfDays > 30) {
    return next(
      httpError(
        400,
        "VALIDATION_ERROR",
        "leave request cannot span more than 30 days",
      ),
    );
  }
  const result = db
    .prepare(
      `INSERT INTO leave_requests (user_id, start_date, end_date, reason)
     VALUES (?, ?, ?, ?)`,
    )
    .run(user_id, start_date, end_date, reason || null);
  const row = db
    .prepare("SELECT * FROM leave_requests WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(row);
});
app.patch("/api/leave-requests/:id", (req, res, next) => {
  const { action, decided_by } = req.body;

  if (
    action !== "approve" &&
    action !== "reject" &&
    action !== "cancel"
  ) {
    return next(
      httpError(
        400,
        "VALIDATION_ERROR",
        'action must be "approve", "reject" or "cancel"',
      ),
    );
  }

  const row = db
    .prepare("SELECT * FROM leave_requests WHERE id = ?")
    .get(req.params.id);

  if (!row) {
    return next(
      httpError(404, "NOT_FOUND", "no such leave request"),
    );
  }

  // Cancel action
  if (action === "cancel") {
    if (row.status !== "PENDING") {
      return next(
        httpError(
          409,
          "INVALID_STATE",
          "request is already " + row.status,
        ),
      );
    }

    db.prepare(
      "UPDATE leave_requests SET status = ? WHERE id = ?",
    ).run("CANCELLED", req.params.id);

    return res.json(
      db
        .prepare("SELECT * FROM leave_requests WHERE id = ?")
        .get(req.params.id),
    );
  }

  // Approve / reject only allowed while pending
  if (row.status !== "PENDING") {
    return next(
      httpError(
        409,
        "INVALID_STATE",
        "request is already " + row.status,
      ),
    );
  }

  const status =
    action === "approve" ? "APPROVED" : "REJECTED";

  db.prepare(
    `UPDATE leave_requests
     SET status = ?, decided_by = ?,
     decided_at = datetime('now')
     WHERE id = ?`,
  ).run(status, decided_by || null, req.params.id);

  res.json(
    db
      .prepare("SELECT * FROM leave_requests WHERE id = ?")
      .get(req.params.id),
  );
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      code: err.code || "INTERNAL",
      message: err.message,
    },
  });
});

app.listen(4000, () => {
  console.log("LeaveFlow v0 on http://localhost:4000");
});
