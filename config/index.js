const corsConfig = require("./cors.config");
const firebaseConfig = require("./firebase.config");
const multerConfig = require("./multer.config");
const pushyConfig = require("./pushy.config");
const stripeConfig = require("./stripe.config");
const appConfig = require("./app.config");
const sessionConfig = require("./session.config");
const jwtConfig = require("./jwt.config");

module.exports = {
  cors: corsConfig,
  firebase: firebaseConfig,
  multer: multerConfig,
  pushy: pushyConfig,
  stripe: stripeConfig,
  app: appConfig,
  session: sessionConfig,
  jwt: jwtConfig,
};
