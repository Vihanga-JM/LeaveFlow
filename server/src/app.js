const express = require("express");

const { cors } = require("./middleware/cors");
const { errorHandler } = require("./middleware/errors");
const { httpLogger } = require("./middleware/logging");

const app = express();

// Behind nginx / CloudFront every request arrives from the proxy's IP. Tell
// Express how many proxy hops to trust so req.ip (and the login rate limit)
// sees the real client instead of lumping everyone together.
app.set("trust proxy", Number(process.env.TRUST_PROXY || 0));

app.use(httpLogger);
app.use(cors);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "0.6.0",
  });
});

app.use("/api", require("./routes/auth"));
app.use("/api/leave-requests", require("./routes/leaveRequests"));
app.use("/api/balances", require("./routes/balances"));
app.use("/api/team", require("./routes/team"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/holidays", require("./routes/holidays"));
app.use("/api/calendar", require("./routes/calendar"));
app.use("/api/notifications", require("./routes/notifications"));

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
