require("dotenv").config();

const express = require("express");
const morgan = require("morgan");

const { errorHandler } = require("./middleware/errors");

const app = express();

app.use(morgan("dev"));
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

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "No such endpoint",
    },
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
