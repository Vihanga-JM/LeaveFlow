// Sri Lankan public holidays, 2026 — a hardcoded starting point.
// Poya days are placed on the 2026 full-moon dates; the gazetted poya can
// fall a day earlier. HR must confirm every entry against the government
// gazette before these are used for real balances.
const HOLIDAYS = [
  "2026-01-03", // Full Moon Poya Day
  "2026-02-01", // Full Moon Poya Day
  "2026-02-04", // Independence Day
  "2026-03-03", // Full Moon Poya Day
  "2026-04-02", // Full Moon Poya Day
  "2026-04-13", // Day before Sinhala & Tamil New Year
  "2026-04-14", // Sinhala & Tamil New Year
  "2026-05-01", // Vesak Full Moon Poya Day / May Day
  "2026-05-31", // Full Moon Poya Day
  "2026-06-29", // Full Moon Poya Day
  "2026-07-29", // Full Moon Poya Day
  "2026-08-28", // Full Moon Poya Day
  "2026-09-26", // Full Moon Poya Day
  "2026-10-26", // Full Moon Poya Day
  "2026-11-24", // Full Moon Poya Day
  "2026-12-24", // Full Moon Poya Day
  "2026-12-25", // Christmas Day
];

module.exports = { HOLIDAYS };
