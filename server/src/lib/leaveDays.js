const DAY_PARTS = ["FULL", "AM", "PM"];

// Working days between two dates, inclusive, excluding weekends and holidays.
// holidays: array of 'YYYY-MM-DD' strings.
// dayPart: 'FULL' (default), or 'AM' / 'PM' for a half day on a single date,
// which counts 0.5 on a working day and 0 on a weekend or holiday.
function leaveDays(startDate, endDate, holidays = [], dayPart = "FULL") {
  if (!DAY_PARTS.includes(dayPart)) {
    throw new Error("day_part must be FULL, AM or PM");
  }

  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date");
  }

  if (end < start) {
    throw new Error("end_date must not be before start_date");
  }

  if (dayPart !== "FULL" && startDate !== endDate) {
    throw new Error("a half day must be a single date");
  }

  let days = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const iso = cursor.toISOString().slice(0, 10);

    if (day !== 0 && day !== 6 && !holidays.includes(iso)) {
      days += 1;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dayPart === "FULL" ? days : days * 0.5;
}

module.exports = { leaveDays, DAY_PARTS };
