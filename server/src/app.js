const express = require("express");

const leaveRequestsRouter = require("./routes/leaveRequests");
const balancesRouter = require("./routes/balances");

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "0.4.0",
    uptime: process.uptime(),
  });
});

app.use("/api/leave-requests", leaveRequestsRouter);

app.use("/api/balances", balancesRouter);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      code: err.code || "INTERNAL",
      message: err.message,
    },
  });
});

module.exports = app;
