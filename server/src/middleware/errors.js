const asyncHandler = (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Express only treats a middleware as an error handler when it declares all
// four parameters, so _next must stay even though it is unused.
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    error: {
      code: err.code || (status === 500 ? "INTERNAL" : "ERROR"),
      message:
        status === 500
          ? "Something went wrong"
          : err.message,
    },
  });
}

module.exports = {
  asyncHandler,
  errorHandler,
};