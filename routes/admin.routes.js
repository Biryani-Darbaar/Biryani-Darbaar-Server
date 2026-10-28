/**
 * Admin Routes — all endpoints are prefixed with /admin
 * Every route requires a valid JWT (authenticateJWT) and admin role (requireAdmin).
 *
 * Route map:
 *  GET    /admin/dashboard                       – stats overview
 *  GET    /admin/orders                          – all orders (filterable)
 *  GET    /admin/orders/live                     – active/in-progress orders
 *  PATCH  /admin/orders/:id                      – update order status
 *  GET    /admin/orders/pos-failed               – orders whose POS push failed
 *  POST   /admin/orders/:id/pos-sync             – manually (re)push an order to the POS
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
 *  GET    /admin/special-offer-media             – list all special-offer media items
 *  POST   /admin/special-offer-media             – upload new special-offer media (multipart/form-data)
 *  DELETE /admin/special-offer-media/:id         – delete media item
 *  PUT    /admin/special-offer-media/reorder     – reorder special-offer media items
 *  GET    /admin/menu-media                      – list all menu media items
 *  POST   /admin/menu-media                      – upload new menu media (multipart/form-data)
 *  DELETE /admin/menu-media/:id                  – delete media item
 *  PUT    /admin/menu-media/reorder              – reorder menu media items
 *  GET    /admin/contact-responses               – list all contact/catering responses
 *  PATCH  /admin/contact-responses/:id/read      – mark response as read
 *  DELETE /admin/contact-responses/:id           – delete response
 */

const express = require("express");
const router = express.Router();

// ── Middleware ────────────────────────────────────────────────────────────────
const { authenticateJWT, requireAdmin } = require("../middlewares/auth.middleware");
const upload      = require("../config/multer.config");              // standard image upload
const { videoUpload } = require("../config/multer.config");          // 52 MB cap for video/media

// ── Controllers ───────────────────────────────────────────────────────────────
const {
  getDashboardStats,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  getAllUsersAdmin,
  getUserOrdersAdmin,
  getPosFailedOrders,
  retryPosSync,
} = require("../controllers/adminDashboard.controller");

const { updateUserWallet } = require("../controllers/wallet.controller");

const {
  SECTIONS,
  getMediaList,
  uploadMedia,
  deleteMedia,
  reorderMedia,
} = require("../controllers/media.controller");

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
router.get("/orders/pos-failed", asyncHandler(getPosFailedOrders));
router.post("/orders/:id/pos-sync", asyncHandler(retryPosSync));
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
router.get("/special-offer-media", asyncHandler(getMediaList(SECTIONS.SPECIAL_OFFER)));
router.post("/special-offer-media", videoUpload.single("media"), asyncHandler(uploadMedia(SECTIONS.SPECIAL_OFFER)));
router.delete("/special-offer-media/:id", asyncHandler(deleteMedia));

// ── Menu Media ────────────────────────────────────────────────────────────────
router.put("/menu-media/reorder", asyncHandler(reorderMedia));
router.get("/menu-media", asyncHandler(getMediaList(SECTIONS.MENU)));
router.post("/menu-media", videoUpload.single("media"), asyncHandler(uploadMedia(SECTIONS.MENU)));
router.delete("/menu-media/:id", asyncHandler(deleteMedia));

// ── Contact / Catering Responses ──────────────────────────────────────────────
router.get("/contact-responses", asyncHandler(getContactResponses));
router.patch("/contact-responses/:id/read", asyncHandler(markResponseRead));
router.delete("/contact-responses/:id", asyncHandler(deleteContactResponse));

module.exports = router;
