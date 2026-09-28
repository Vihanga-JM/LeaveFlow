-- Public holidays: never counted against a leave balance.
-- Primary key = the date (see docs/capstone/design.md, decision 3).
-- Down: DROP TABLE public_holidays;
CREATE TABLE public_holidays (
  holiday_date DATE PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2026 seed. Poya days sit on the full-moon dates; HR must confirm each against
-- the government gazette and correct them in the app (Holidays page).
INSERT INTO public_holidays (holiday_date, name) VALUES
  ('2026-01-03', 'Full Moon Poya Day'),
  ('2026-02-01', 'Full Moon Poya Day'),
  ('2026-02-04', 'Independence Day'),
  ('2026-03-03', 'Full Moon Poya Day'),
  ('2026-04-02', 'Full Moon Poya Day'),
  ('2026-04-13', 'Day before Sinhala & Tamil New Year'),
  ('2026-04-14', 'Sinhala & Tamil New Year'),
  ('2026-05-01', 'Vesak Full Moon Poya Day / May Day'),
  ('2026-05-31', 'Full Moon Poya Day'),
  ('2026-06-29', 'Full Moon Poya Day'),
  ('2026-07-29', 'Full Moon Poya Day'),
  ('2026-08-28', 'Full Moon Poya Day'),
  ('2026-09-26', 'Full Moon Poya Day'),
  ('2026-10-26', 'Full Moon Poya Day'),
  ('2026-11-24', 'Full Moon Poya Day'),
  ('2026-12-24', 'Full Moon Poya Day'),
  ('2026-12-25', 'Christmas Day');
