// Working days between two dates, inclusive, excluding weekends.
// holidays: array of 'YYYY-MM-DD' strings — excluded too.
function leaveDays(startDate, endDate, holidays = []) {
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date');
  }

  if (end < start) {
    throw new Error('end_date must not be before start_date');
  }

  let days = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);

    if (day !== 0 && day !== 6 && !holidays.includes(iso)) {
      days += 1;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

module.exports = { leaveDays };