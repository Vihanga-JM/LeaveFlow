-- Replace the estimated 2026 holidays from 004 with the official list published
-- by the Government Printing Department (26 holidays; Vesak and International
-- Labour Day share 1 May, so 25 dates). Five poya dates in 004 were off by a
-- day and seven holidays were missing.
-- Sources, checked 2026-09-28 (two independent lists agree):
--   https://www.adaderana.lk/news/116465/sri-lankas-2026-holiday-calendar-heres-the-full-list-
--   https://publicholidays.lk/poya-day/
--
-- Existing requests keep the `days` they were created with (design doc, Q5).
-- Targeted on purpose: only the six estimated dates from 004 that are wrong are
-- removed, and the official list is upserted — so a holiday HR added on any
-- other date through the Holidays page survives this migration.
-- Down: delete the dates inserted here and re-insert the six removed below.

DELETE FROM public_holidays
WHERE holiday_date IN (
  '2026-03-03', '2026-04-02', '2026-05-31',
  '2026-08-28', '2026-10-26', '2026-12-24'
);

INSERT INTO public_holidays (holiday_date, name) VALUES
  ('2026-01-03', 'Duruthu Full Moon Poya Day'),
  ('2026-01-15', 'Tamil Thai Pongal Day'),
  ('2026-02-01', 'Navam Full Moon Poya Day'),
  ('2026-02-04', 'Independence Day'),
  ('2026-02-15', 'Maha Shivaratri Day'),
  ('2026-03-02', 'Medin Full Moon Poya Day'),
  ('2026-03-21', 'Eid-ul-Fitr'),
  ('2026-04-01', 'Bak Full Moon Poya Day'),
  ('2026-04-03', 'Good Friday'),
  ('2026-04-13', 'Day before Sinhala and Tamil New Year'),
  ('2026-04-14', 'Sinhala and Tamil New Year Day'),
  ('2026-05-01', 'Vesak Full Moon Poya Day / International Labour Day'),
  ('2026-05-02', 'Day after Vesak Full Moon Poya Day'),
  ('2026-05-28', 'Eid al-Adha'),
  ('2026-05-30', 'Adhi Poson Full Moon Poya Day'),
  ('2026-06-29', 'Poson Full Moon Poya Day'),
  ('2026-07-29', 'Esala Full Moon Poya Day'),
  ('2026-08-26', 'Milad-un-Nabi'),
  ('2026-08-27', 'Nikini Full Moon Poya Day'),
  ('2026-09-26', 'Binara Full Moon Poya Day'),
  ('2026-10-25', 'Vap Full Moon Poya Day'),
  ('2026-11-08', 'Deepavali Festival Day'),
  ('2026-11-24', 'Ill Full Moon Poya Day'),
  ('2026-12-23', 'Unduvap Full Moon Poya Day'),
  ('2026-12-25', 'Christmas Day')
ON CONFLICT (holiday_date) DO UPDATE SET name = EXCLUDED.name;
