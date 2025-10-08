const dishRoutes = require("./dish.routes");
const categoryRoutes = require("./category.routes");
const orderRoutes = require("./order.routes");
const cartRoutes = require("./cart.routes");
const authRoutes = require("./auth.routes");
const locationRoutes = require("./location.routes");
const promoRoutes = require("./promo.routes");
const paymentRoutes = require("./payment.routes");
const rewardRoutes = require("./reward.routes");
const miniGameRoutes = require("./miniGame.routes");
const goldPriceRoutes = require("./goldPrice.routes");
const notificationRoutes = require("./notification.routes");
const imageRoutes = require("./image.routes");

/**
 * Initialize all routes
 */
const initRoutes = (app) => {
  // Mount all routes (no /api prefix - routes are used directly as in original server.js)
  app.use(dishRoutes);
  app.use(categoryRoutes);
  app.use(orderRoutes);
  app.use(cartRoutes);
  app.use(authRoutes);
  app.use(locationRoutes);
  app.use(promoRoutes);
  app.use(paymentRoutes);
  app.use(rewardRoutes);
  app.use(miniGameRoutes);
  app.use(goldPriceRoutes);
  app.use(notificationRoutes);
  app.use(imageRoutes);

  // Health check route
  app.get("/", (req, res) => {
    res.json({ message: "Biryani Darbar API is running" });
  });
};

module.exports = initRoutes;
