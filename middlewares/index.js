const morgan = require("morgan");
const chalk = require("chalk");
const { COLLECTION_NAMES } = require("../constants");
const { app } = require("../config");
const {
  authenticateJWT,
  authenticateFirebase,
  optionalAuthenticate,
  requireAdmin,
} = require("./authMiddlewares");

morgan.token("statusColor", function (req, res) {
  const status = res.statusCode;
  if (status >= 500) return chalk.red(status);
  if (status >= 400) return chalk.yellow(status);
  if (status >= 300) return chalk.cyan(status);
  if (status >= 200) return chalk.green(status);
  return status;
});

morgan.token("methodColor", function (req) {
  const method = req.method;
  if (method === "GET") return chalk.green(method);
  if (method === "POST") return chalk.cyan(method);
  if (method === "PUT") return chalk.yellow(method);
  if (method === "DELETE") return chalk.red(method);
  return chalk.white(method);
});

const consoleFormat = ":methodColor :url :statusColor - :response-time ms";
const consoleLogger = morgan(consoleFormat, {
  skip: function (req, res) {
    return req.path === "/health";
  },
});

const cacheMiddleware = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
};

const checkCollectionLimit = async (req, res, next) => {
  const { db } = require("../config/firebase.config");
  try {
    const gamesSnapshot = await db
      .collection(COLLECTION_NAMES.MINI_GAMES)
      .get();
    if (gamesSnapshot.size >= app.features.maxMiniGames) {
      return res.status(400).json({ error: "Collection limit reached" });
    }
    next();
  } catch (error) {
    console.error("Error checking collection limit:", error);
    res.status(500).json({ error: "Failed to check collection limit" });
  }
};

module.exports = {
  consoleLogger,
  cacheMiddleware,
  checkCollectionLimit,
  authenticateJWT,
  authenticateFirebase,
  optionalAuthenticate,
  requireAdmin,
};
