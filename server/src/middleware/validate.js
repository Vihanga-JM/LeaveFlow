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

const isDate = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v || "");

module.exports = {
  validate,
  required,
  isDate,
};
