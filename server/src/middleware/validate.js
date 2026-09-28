const validate = (rules) => (req, res, next) => {
  for (const [field, check, message] of rules) {
    if (!check(req.body[field], req)) {
      return res.status(400).json({
        error: {
          code: "VALIDATION",
          message: `${field}: ${message}`,
        },
      });
    }
  }

  next();
};

const required = (v) =>
  v !== undefined &&
  v !== null &&
  v !== "";

// YYYY-MM-DD *and* a real calendar day: JavaScript rolls "2026-02-30" over to
// 2 March, so the parsed date must round-trip to the same string.
const isDate = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v || "") &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;

module.exports = {
  validate,
  required,
  isDate,
};
