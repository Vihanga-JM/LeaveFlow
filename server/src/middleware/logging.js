const crypto = require("crypto");
const pino = require("pino");
const pinoHttp = require("pino-http");

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "silent" : "info"),
});

const httpLogger = pinoHttp({
  logger,
  // Reuse an upstream id (nginx/CloudFront) when present, otherwise mint one.
  genReqId: (req, res) => {
    const id = req.headers["x-request-id"] || crypto.randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  // JWTs must never land in logs.
  redact: ["req.headers.authorization", "req.headers.cookie"],
});

module.exports = { logger, httpLogger };
