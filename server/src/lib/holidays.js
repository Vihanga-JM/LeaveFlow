// Holiday dates ('YYYY-MM-DD') between two dates, inclusive, from the
// public_holidays table. `db` is the pool or a transaction client.
async function holidaysBetween(db, startDate, endDate) {
  const q = await db.query(
    "SELECT holiday_date FROM public_holidays WHERE holiday_date BETWEEN $1 AND $2",
    [startDate, endDate],
  );
  return q.rows.map((r) => r.holiday_date);
}

module.exports = { holidaysBetween };
