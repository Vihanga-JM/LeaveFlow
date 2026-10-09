-- In-app notifications (US-8). The requester hears when their leave is
-- decided; the approver hears when a request arrives or is withdrawn.
-- Text is composed at read time from the request, so a notification never
-- disagrees with the request it points at.
--
-- Down path: DROP TABLE notifications;

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_request_id INTEGER NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created ON notifications (user_id, created_at DESC);
