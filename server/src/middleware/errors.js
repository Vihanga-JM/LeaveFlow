const asyncHandler = (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function errorHandler(err, req, res, next) {
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