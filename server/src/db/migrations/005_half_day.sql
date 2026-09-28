-- Half-day leave (docs/capstone/design.md, decisions 1 and 2).
--
-- Down path, only safe before any half day exists:
--   ALTER TABLE leave_requests DROP CONSTRAINT leave_requests_half_day_single_date,
--     DROP COLUMN day_part, DROP COLUMN days;
-- After real half days exist, dropping day_part turns every 0.5 request into an
-- apparent full day while balances keep the 0.5s — roll back by restoring the
-- pre-deploy snapshot, or fix forward.

ALTER TABLE leave_requests
  ADD COLUMN day_part TEXT NOT NULL DEFAULT 'FULL'
    CHECK (day_part IN ('FULL', 'AM', 'PM')),
  ADD COLUMN days NUMERIC(4,1);

-- A half day is always a single date — enforced even for direct SQL.
ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_half_day_single_date
    CHECK (day_part = 'FULL' OR start_date = end_date);

-- Backfill: existing requests are all full days; count weekdays that are not
-- public holidays, exactly as the API does.
UPDATE leave_requests lr
SET days = (
  SELECT count(*)
  FROM generate_series(lr.start_date, lr.end_date, interval '1 day') AS d
  WHERE extract(isodow FROM d) < 6
    AND d::date NOT IN (SELECT holiday_date FROM public_holidays)
);

ALTER TABLE leave_requests ALTER COLUMN days SET NOT NULL;
