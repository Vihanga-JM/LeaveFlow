const express = require("express");
const morgan = require("morgan");

const { errorHandler } = require("./middleware/errors");

const app = express();

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "0.5.0",
  });
});

app.use("/api", require("./routes/auth"));
app.use("/api/leave-requests", require("./routes/leaveRequests"));
app.use("/api/balances", require("./routes/balances"));
app.use("/api/team", require("./routes/team"));
app.use("/api/admin", require("./routes/admin"));

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "No such endpoint",
    },
  });
});

app.use(errorHandler);

module.exports = app;
