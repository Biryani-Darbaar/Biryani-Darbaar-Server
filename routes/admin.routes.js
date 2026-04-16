/**
 * Admin Routes — all endpoints are prefixed with /admin
 * Every route requires a valid JWT (authenticateJWT) and admin role (requireAdmin).
 *
 * Route map:
 *  GET    /admin/dashboard                       – stats overview
 *  GET    /admin/orders                          – all orders (filterable)
 *  GET    /admin/orders/live                     – active/in-progress orders
 *  PATCH  /admin/orders/:id                      – update order status
 *  GET    /admin/users                           – all users
 *  GET    /admin/users/:id/orders               – single user + their orders
 *  PATCH  /admin/users/:id/wallet               – increase / decrease / reset wallet balance
 *  GET    /admin/dishes/categories               – all categories
 *  POST   /admin/dishes/categories               – create category
 *  DELETE /admin/dishes/categories/:name         – delete category
 *  GET    /admin/dishes/:category                – dishes in category (incl. unavailable)
 *  POST   /admin/dishes                          – add new dish (multipart/form-data)
 *  PUT    /admin/dishes/:category/:id            – update dish (multipart/form-data)
 *  DELETE /admin/dishes/:category/:id            – delete dish
 *  GET    /admin/special-offer-media             – list all media items
 *  POST   /admin/special-offer-media             – upload new media (multipart/form-data)
 *  DELETE /admin/special-offer-media/:id         – delete media item
 *  PUT    /admin/special-offer-media/reorder     – reorder media items
 *  GET    /admin/contact-responses               – list all contact/catering responses
 *  PATCH  /admin/contact-responses/:id/read      – mark response as read
 *  DELETE /admin/contact-responses/:id           – delete response
 */

const express = require("express");
const router = express.Router();

// ── Middleware ────────────────────────────────────────────────────────────────
const { authenticateJWT, requireAdmin } = require("../middlewares/auth.middleware");
const upload = require("../config/multer.config");   // multer instance

// ── Controllers ───────────────────────────────────────────────────────────────
const {
  getDashboardStats,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  getAllUsersAdmin,
  getUserOrdersAdmin,
} = require("../controllers/adminDashboard.controller");

const { updateUserWallet } = require("../controllers/wallet.controller");

const {
  getSpecialOfferMedia,
  uploadMedia,
  deleteMedia,
  reorderMedia,
} = require("../controllers/specialOfferMedia.controller");

const {
  getContactResponses,
  markResponseRead,
  deleteContactResponse,
} = require("../controllers/contact.controller");

// Reuse existing dish / category controllers
const {
  addDish,
  getDishesByCategoryAdmin,
  updateDishAdmin,
  deleteDish,
} = require("../controllers/dish.controller");

const {
  getCategories,
  createCategory,
  deleteCategory,
} = require("../controllers/category.controller");

const { asyncHandler } = require("../utils/response.util");

// ── Guard: every admin route requires authentication + admin role ─────────────
router.use(authenticateJWT, requireAdmin);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard", asyncHandler(getDashboardStats));

// ── Orders ────────────────────────────────────────────────────────────────────
// NOTE: /orders/live must be declared BEFORE /orders/:id to avoid param collision
router.get("/orders", asyncHandler(getAllOrdersAdmin));
router.patch("/orders/:id", asyncHandler(updateOrderStatusAdmin));

// ── Users ─────────────────────────────────────────────────────────────────────
router.get("/users",                     asyncHandler(getAllUsersAdmin));
router.get("/users/:id/orders",          asyncHandler(getUserOrdersAdmin));
router.patch("/users/:id/wallet",        asyncHandler(updateUserWallet));

// ── Dishes & Categories ───────────────────────────────────────────────────────
router.get("/dishes/categories", asyncHandler(getCategories));
router.post("/dishes/categories", asyncHandler(createCategory));
router.delete("/dishes/categories/:category", asyncHandler(deleteCategory));

// NOTE: /dishes/categories must be declared BEFORE /dishes/:category
router.get("/dishes/:category", asyncHandler(getDishesByCategoryAdmin));
router.post("/dishes", upload.single("image"), asyncHandler(addDish));
router.put("/dishes/:category/:id", upload.single("image"), asyncHandler(updateDishAdmin));
router.delete("/dishes/:category/:id", asyncHandler(deleteDish));

// ── Special Offer Media ───────────────────────────────────────────────────────
// NOTE: /reorder must come BEFORE /:id to avoid treating "reorder" as an id
router.put("/special-offer-media/reorder", asyncHandler(reorderMedia));
router.get("/special-offer-media", asyncHandler(getSpecialOfferMedia));
router.post("/special-offer-media", upload.single("media"), asyncHandler(uploadMedia));
router.delete("/special-offer-media/:id", asyncHandler(deleteMedia));

// ── Contact / Catering Responses ──────────────────────────────────────────────
router.get("/contact-responses", asyncHandler(getContactResponses));
router.patch("/contact-responses/:id/read", asyncHandler(markResponseRead));
router.delete("/contact-responses/:id", asyncHandler(deleteContactResponse));

module.exports = router;
