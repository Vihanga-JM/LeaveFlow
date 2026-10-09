// Records who should hear about a change to a leave request (US-8).
// `db` is the transaction client, so a notification exists exactly when the
// change it describes was committed.
//
//   APPROVED / REJECTED  -> the requester
//   SUBMITTED / CANCELLED -> the approver: the requester's manager, or every
//                            HR admin when the requester has no manager
async function notify(db, leaveRequestId, kind, actorId) {
  if (kind === "APPROVED" || kind === "REJECTED") {
    await db.query(
      `INSERT INTO notifications (user_id, actor_id, leave_request_id, kind)
       SELECT user_id, $2, id, $3 FROM leave_requests WHERE id = $1`,
      [leaveRequestId, actorId, kind],
    );
    return;
  }

  await db.query(
    `INSERT INTO notifications (user_id, actor_id, leave_request_id, kind)
     SELECT a.id, $2, lr.id, $3
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     JOIN users a ON a.id = u.manager_id
                  OR (u.manager_id IS NULL AND a.role = 'HR_ADMIN')
     WHERE lr.id = $1 AND a.id <> lr.user_id`,
    [leaveRequestId, actorId, kind],
  );
}

module.exports = { notify };
