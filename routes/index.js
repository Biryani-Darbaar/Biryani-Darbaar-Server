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
// ── New routes ────────────────────────────────────────────────────────────────
const contactRoutes = require("./contact.routes");         // POST /contact (public)
const walletRoutes = require("./wallet.routes");           // /wallet/* (auth required)
const adminRoutes = require("./admin.routes");             // /admin/* (auth + admin role)
const { getSpecialOfferMedia } = require("../controllers/specialOfferMedia.controller");
const { asyncHandler } = require("../utils/response.util");

/**
 * Initialize all routes
 */
const initRoutes = (app) => {
  // ── Existing user-facing routes (unchanged) ──────────────────────────────
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

  // ── New public routes ─────────────────────────────────────────────────────
  // Contact / catering enquiry form submission
  app.use(contactRoutes);

  // Wallet (spin wheel + coin redemption) — JWT required inside walletRoutes
  app.use(walletRoutes);

  // Special offer media — public read so user app can fetch without auth
  app.get("/special-offer-media", asyncHandler(getSpecialOfferMedia));

  // ── Admin routes (JWT + admin role required — enforced inside adminRoutes) ─
  app.use("/admin", adminRoutes);

  // ── Root health check ─────────────────────────────────────────────────────
  app.get("/", (req, res) => {
    res.json({ message: "Biryani Darbaar API is running" });
  });
};

module.exports = initRoutes;
