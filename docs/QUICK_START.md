# Quick Start Guide - Updated Backend

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

### 2. Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials
# Update these values:
# - FIREBASE_STORAGE_BUCKET
# - STRIPE_SECRET_KEY
# - PUSHY_API_KEY
# - SESSION_SECRET
```

### 3. Start Development Server

```bash
pnpm dev
```

Server will start on `http://localhost:4200`

---

## 📦 New Consolidated Imports

### Using Config

```javascript
// Import all config at once
const { admin, db, bucket, stripe, pushyAPI, upload } = require("./config");

// Or import only what you need
const { db } = require("./config");
const { stripe } = require("./config");
```

### Using Middleware

```javascript
// Import middleware
const {
  loggerMiddleware,
  cacheMiddleware,
  checkCollectionLimit,
} = require("./middlewares");

// Use in routes
app.use(loggerMiddleware);
app.use(cacheMiddleware);
router.post("/miniGames", checkCollectionLimit, controller.create);
```

---

## 🔐 Environment Variables

### Required Variables:

- `PORT` - Server port (default: 4200)
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket name
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `PUSHY_API_KEY` - Pushy notification service key
- `SESSION_SECRET` - Express session secret

### Optional Variables:

- `NODE_ENV` - Environment (development/production)
- `MAX_MINI_GAMES` - Max mini games limit (default: 6)

---

## 📁 Project Structure

```
backend/
├── config/
│   └── index.js                    ← All config consolidated
├── controllers/                     ← Business logic (13 files)
│   ├── auth.controller.js
│   ├── cart.controller.js
│   ├── category.controller.js
│   ├── dish.controller.js
│   ├── goldPrice.controller.js
│   ├── image.controller.js
│   ├── location.controller.js
│   ├── miniGame.controller.js
│   ├── notification.controller.js
│   ├── order.controller.js
│   ├── payment.controller.js
│   ├── promo.controller.js
│   └── reward.controller.js
├── routes/                          ← Route definitions (14 files)
│   ├── index.js                     ← Main router
│   ├── auth.routes.js
│   ├── cart.routes.js
│   ├── category.routes.js
│   ├── dish.routes.js
│   ├── goldPrice.routes.js
│   ├── image.routes.js
│   ├── location.routes.js
│   ├── miniGame.routes.js
│   ├── notification.routes.js
│   ├── order.routes.js
│   ├── payment.routes.js
│   ├── promo.routes.js
│   └── reward.routes.js
├── middlewares/
│   └── index.js                     ← All middleware consolidated
├── utils/                           ← Helper functions (4 files)
│   ├── calculations.util.js
│   ├── response.util.js
│   ├── session.util.js
│   └── storage.util.js
├── lib/
│   └── notification.lib.js          ← Notification service
├── constants/
│   └── index.js                     ← Constants & collection names
├── models/                          ← Empty (not needed for Firestore)
├── app.js                           ← Express app setup
├── index.js                         ← Server entry point
├── .env                             ← Your environment variables
├── .env.example                     ← Environment template
└── package.json                     ← Dependencies

```

---

## 🛠️ Available Scripts

```bash
# Development with auto-reload
pnpm dev

# Production start
pnpm start

# Install dependencies
pnpm install
```

---

## 🌐 API Endpoints (59 total)

### Authentication (6 endpoints)

- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/verifyPhoneNumber` - Verify phone number
- `GET /api/userData` - Get user data
- `PUT /api/updateUserData` - Update user data

### Dishes (7 endpoints)

- `POST /api/addDish` - Add new dish
- `GET /api/dishes` - Get all dishes
- `GET /api/dishById/:dishId` - Get dish by ID
- `PUT /api/updateDish/:dishId` - Update dish
- `DELETE /api/deleteDish/:dishId` - Delete dish
- `GET /api/dishesByCategory/:categoryId` - Get dishes by category
- `GET /api/searchDishes` - Search dishes

### Categories (4 endpoints)

- `POST /api/category` - Create category
- `GET /api/categories` - Get all categories
- `PUT /api/category/:categoryId` - Update category
- `DELETE /api/category/:categoryId` - Delete category

### Cart (5 endpoints)

- `POST /api/addToCart` - Add item to cart
- `GET /api/cart` - Get cart items
- `PUT /api/updateCart` - Update cart item
- `DELETE /api/deleteCart` - Clear cart
- `DELETE /api/removeFromCart/:itemId` - Remove specific item

### Orders (7 endpoints)

- `POST /api/orders` - Create order
- `GET /api/orders` - Get all orders (admin)
- `GET /api/userorders` - Get user orders
- `GET /api/orders/:orderId` - Get order by ID
- `PUT /api/orders/:orderId` - Update order
- `DELETE /api/orders/:orderId` - Delete order
- `GET /api/orderHistory` - Get order history

### Locations (4 endpoints)

- `POST /api/locations` - Add location
- `GET /api/locations` - Get all locations
- `PUT /api/locations/:locationId` - Update location
- `DELETE /api/locations/:locationId` - Delete location

### Promo Codes (6 endpoints)

- `POST /api/promoCodes` - Create promo code
- `GET /api/promoCodes` - Get all promo codes
- `POST /api/validatePromoCode` - Validate promo code
- `PUT /api/promoCodes/:promoId` - Update promo code
- `DELETE /api/promoCodes/:promoId` - Delete promo code
- `GET /api/promoCodes/:promoId` - Get promo code by ID

### Payments (3 endpoints)

- `POST /api/create-payment-intent` - Create Stripe payment intent
- `GET /api/payment/:paymentIntentId` - Get payment details
- `POST /api/confirm-payment` - Confirm payment

### Notifications (5 endpoints)

- `POST /api/notifications` - Send notification
- `GET /api/notifications` - Get all notifications
- `POST /api/saveDeviceToken` - Save device token
- `POST /api/sendNotificationToUser` - Send to specific user
- `POST /api/sendNotificationToAll` - Send to all users

### Rewards (4 endpoints)

- `POST /api/rewards` - Create reward
- `GET /api/rewards` - Get all rewards
- `PUT /api/rewards/:rewardId` - Update reward
- `DELETE /api/rewards/:rewardId` - Delete reward

### Mini Games (4 endpoints)

- `POST /api/miniGames` - Create mini game
- `GET /api/miniGames` - Get all mini games
- `PUT /api/miniGames/:id` - Update mini game
- `DELETE /api/miniGames/:id` - Delete mini game

### Gold Price (3 endpoints)

- `POST /api/goldPrice` - Set gold price
- `GET /api/goldPrice` - Get gold price
- `PUT /api/goldPrice/:id` - Update gold price

### Images (1 endpoint)

- `POST /api/uploadImage` - Upload image to Firebase Storage

---

## 🔍 Testing

### Test Server:

```bash
curl http://localhost:4200/api/dishes
```

### Test Environment Variables:

```javascript
console.log(process.env.PORT); // Should print 4200
console.log(process.env.FIREBASE_STORAGE_BUCKET); // Should print your bucket name
```

---

## ⚠️ Important Notes

1. **Security:**

   - Never commit `.env` file to Git
   - Add `.env` to `.gitignore`
   - Use different credentials for production

2. **Firebase:**

   - Ensure `serviceAccountKey.json` exists in parent directory
   - Update `FIREBASE_STORAGE_BUCKET` with your actual bucket

3. **Stripe:**

   - Use test keys for development
   - Use live keys only in production

4. **Dependencies:**
   - Run `pnpm install` after pulling latest code
   - Keep dependencies updated regularly

---

## 🐛 Common Issues

### Issue: "Module not found"

**Solution:** Run `pnpm install`

### Issue: "Cannot find serviceAccountKey.json"

**Solution:** Ensure file exists at `../serviceAccountKey.json` relative to backend folder

### Issue: "Port already in use"

**Solution:** Change `PORT` in `.env` file or kill process on port 4200

### Issue: "Firebase authentication failed"

**Solution:** Verify `serviceAccountKey.json` is correct and has proper permissions

---

## 📚 Additional Documentation

- `REFACTORING_COMPLETE.md` - Detailed refactoring summary
- `ARCHITECTURE.md` - System architecture overview
- `TESTING_GUIDE.md` - Testing instructions
- `MIGRATION_GUIDE.md` - Migration from old to new structure

---

## 🎉 You're Ready!

Your backend is now:

- ✅ Fully modular and organized
- ✅ Using environment variables for security
- ✅ Easy to maintain and scale
- ✅ Ready for production deployment

Happy coding! 🚀
