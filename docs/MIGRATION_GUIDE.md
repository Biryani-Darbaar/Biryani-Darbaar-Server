# Migration Guide: From Monolithic to Modular Backend

## 🎯 Overview

This guide helps you migrate from the old monolithic `server.js` to the new modular backend structure.

## 📊 What Changed

### Before (Monolithic)

```
server.js (2000+ lines)
├── All configurations
├── All routes
├── All business logic
├── All utilities
└── Everything mixed together
```

### After (Modular)

```
backend/
├── config/           # Separated configurations
├── controllers/      # Business logic handlers
├── routes/          # API endpoint definitions
├── middlewares/     # Custom middleware
├── utils/           # Helper functions
├── lib/             # Business logic libraries
├── constants/       # App constants
└── app.js          # Main app setup
```

## 🚀 Migration Steps

### Step 1: Install Dependencies

The backend has its own package.json. Install dependencies:

```bash
cd backend
npm install
```

### Step 2: Configuration

1. Ensure `serviceAccountKey.json` is in the project root (one level up from backend/)
2. Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

3. Update environment variables in `.env`:

```env
PORT=4200
STRIPE_SECRET_KEY=your_stripe_key
PUSHY_API_KEY=your_pushy_key
SESSION_SECRET=your_session_secret
```

### Step 3: Running the New Backend

**Option 1: Run directly**

```bash
cd backend
node index.js
```

**Option 2: Run with nodemon (development)**

```bash
cd backend
npm run dev
```

**Option 3: Run from root directory**

```bash
node backend/index.js
```

### Step 4: Testing

The new backend maintains **100% API compatibility** with the old one. All endpoints work exactly the same:

#### Test Basic Endpoints:

```bash
# Health check
curl http://localhost:4200/

# Get categories
curl http://localhost:4200/categories

# Get dishes
curl http://localhost:4200/dishes/category/biryani
```

## 📝 Key Changes & Improvements

### 1. **File Organization**

| Old Location                  | New Location                  | Description      |
| ----------------------------- | ----------------------------- | ---------------- |
| `server.js` lines 1-50        | `config/*.config.js`          | Configurations   |
| `server.js` lines 50-100      | `middlewares/*.middleware.js` | Middleware       |
| `server.js` route handlers    | `controllers/*.controller.js` | Business logic   |
| `server.js` route definitions | `routes/*.routes.js`          | API routes       |
| Scattered utilities           | `utils/*.util.js`             | Helper functions |
| Hardcoded values              | `constants/index.js`          | Constants        |

### 2. **Code Organization**

**Old way (Monolithic):**

```javascript
// Everything in one file
app.post("/dishes", upload.single("image"), async (req, res) => {
  // 50+ lines of business logic here
});
```

**New way (Modular):**

```javascript
// routes/dish.routes.js
router.post("/dishes", upload.single("image"), dishController.addDish);

// controllers/dish.controller.js
const addDish = async (req, res) => {
  // Clean, organized business logic
};
```

### 3. **Error Handling**

**Old way:**

```javascript
catch (error) {
  logger.error("Error uploading image or saving data:", error);
  res.status(500).json({ error: "Failed to add dish" });
}
```

**New way:**

```javascript
catch (error) {
  errorResponse(res, 500, "Failed to add dish", error);
}
```

### 4. **Reusability**

**Old way:** Code duplication everywhere

```javascript
// Same code repeated 50+ times
const userId = storage.getItem("userId");
if (!userId) {
  userId = req.body.userId;
}
```

**New way:** Centralized utilities

```javascript
const userId = getUserId(req);
```

## 🔄 API Endpoint Mapping

All endpoints remain **exactly the same**. Here's the mapping to help you understand where each endpoint lives:

### Authentication & Users

| Endpoint        | File Location                    |
| --------------- | -------------------------------- |
| `POST /signup`  | `controllers/auth.controller.js` |
| `POST /login`   | `controllers/auth.controller.js` |
| `POST /logout`  | `controllers/auth.controller.js` |
| `GET /user/:id` | `controllers/auth.controller.js` |
| `PUT /user/:id` | `controllers/auth.controller.js` |
| `GET /getUsers` | `controllers/auth.controller.js` |

### Dishes

| Endpoint                         | File Location                    |
| -------------------------------- | -------------------------------- |
| `POST /dishes`                   | `controllers/dish.controller.js` |
| `GET /dishes/category/:category` | `controllers/dish.controller.js` |
| `GET /dishes/:cat`               | `controllers/dish.controller.js` |
| `PUT /dishes/:category/:id`      | `controllers/dish.controller.js` |
| `DELETE /dishes/:category/:id`   | `controllers/dish.controller.js` |

### Orders

| Endpoint                | File Location                     |
| ----------------------- | --------------------------------- |
| `POST /orders`          | `controllers/order.controller.js` |
| `GET /orders`           | `controllers/order.controller.js` |
| `GET /ordersByUser/:id` | `controllers/order.controller.js` |
| `GET /orders/:id`       | `controllers/order.controller.js` |
| `PATCH /orders/:id`     | `controllers/order.controller.js` |

### Categories

| Endpoint                       | File Location                        |
| ------------------------------ | ------------------------------------ |
| `GET /categories`              | `controllers/category.controller.js` |
| `POST /categories`             | `controllers/category.controller.js` |
| `DELETE /categories/:category` | `controllers/category.controller.js` |

### Cart

| Endpoint           | File Location                    |
| ------------------ | -------------------------------- |
| `POST /cart`       | `controllers/cart.controller.js` |
| `POST /getCart`    | `controllers/cart.controller.js` |
| `PUT /cart/:id`    | `controllers/cart.controller.js` |
| `DELETE /cart/:id` | `controllers/cart.controller.js` |

### Locations

| Endpoint                | File Location                        |
| ----------------------- | ------------------------------------ |
| `POST /locations`       | `controllers/location.controller.js` |
| `GET /locations`        | `controllers/location.controller.js` |
| `PUT /locations/:id`    | `controllers/location.controller.js` |
| `DELETE /locations/:id` | `controllers/location.controller.js` |

### Promo Codes

| Endpoint               | File Location                     |
| ---------------------- | --------------------------------- |
| `POST /create-promo`   | `controllers/promo.controller.js` |
| `POST /validate-promo` | `controllers/promo.controller.js` |
| `GET /get-all-promos`  | `controllers/promo.controller.js` |

### Payment

| Endpoint                      | File Location                       |
| ----------------------------- | ----------------------------------- |
| `POST /create-payment-intent` | `controllers/payment.controller.js` |

### Rewards

| Endpoint             | File Location                      |
| -------------------- | ---------------------------------- |
| `POST /rewards`      | `controllers/reward.controller.js` |
| `GET /rewards`       | `controllers/reward.controller.js` |
| `POST /apply-reward` | `controllers/reward.controller.js` |

### Mini Games

| Endpoint                | File Location                        |
| ----------------------- | ------------------------------------ |
| `POST /miniGames`       | `controllers/miniGame.controller.js` |
| `GET /miniGames`        | `controllers/miniGame.controller.js` |
| `PUT /miniGames/:id`    | `controllers/miniGame.controller.js` |
| `DELETE /miniGames/:id` | `controllers/miniGame.controller.js` |

### Gold Price

| Endpoint                     | File Location                         |
| ---------------------------- | ------------------------------------- |
| `POST /goldPrice`            | `controllers/goldPrice.controller.js` |
| `GET /goldPrice`             | `controllers/goldPrice.controller.js` |
| `PUT /goldDiscountApply`     | `controllers/goldPrice.controller.js` |
| `PUT /updateDishesGoldPrice` | `controllers/goldPrice.controller.js` |

### Notifications

| Endpoint                  | File Location                            |
| ------------------------- | ---------------------------------------- |
| `POST /send-notification` | `controllers/notification.controller.js` |
| `GET /notifications`      | `controllers/notification.controller.js` |
| `POST /store-token`       | `controllers/notification.controller.js` |

### Images

| Endpoint      | File Location                     |
| ------------- | --------------------------------- |
| `POST /img`   | `controllers/image.controller.js` |
| `GET /img`    | `controllers/image.controller.js` |
| `DELETE /img` | `controllers/image.controller.js` |

## ✅ Verification Checklist

After migration, verify:

- [ ] Server starts without errors
- [ ] All endpoints respond correctly
- [ ] File uploads work (dishes, locations, user images)
- [ ] Firebase connection established
- [ ] Stripe payments work
- [ ] Push notifications send successfully
- [ ] Session management works
- [ ] Logging works (check combined.log and error.log)
- [ ] Cart functionality works
- [ ] Order placement works
- [ ] Rewards calculation works
- [ ] Gold member pricing applies correctly
- [ ] Promo codes validate correctly

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find module '../logger'"

**Solution:** Make sure logger.js is in the project root, not inside backend/

### Issue 2: "Firebase service account not found"

**Solution:** Ensure serviceAccountKey.json is in the project root (one level up from backend/)

### Issue 3: "Port 4200 already in use"

**Solution:** Stop the old server.js or change PORT in constants/index.js

### Issue 4: Session not persisting

**Solution:** Check that express-session is properly configured in app.js

### Issue 5: File uploads failing

**Solution:** Verify Firebase Storage bucket name in config/firebase.config.js

## 🎓 Understanding the New Structure

### Controllers

Controllers handle the business logic for each feature:

- Receive request from routes
- Process data
- Call utilities/services
- Return response

### Routes

Routes define API endpoints:

- Map HTTP methods to controller functions
- Apply middleware (upload, validation, etc.)
- Keep logic minimal

### Utils

Utilities are reusable helper functions:

- Calculations
- Response formatting
- Session management
- Storage operations

### Config

Configuration files:

- Firebase setup
- Stripe setup
- Pushy setup
- Multer setup

### Middlewares

Custom middleware for:

- Request logging
- Cache control
- Validation

## 📈 Benefits of New Structure

1. **Maintainability**: Easy to find and fix bugs
2. **Scalability**: Easy to add new features
3. **Testability**: Each module can be tested independently
4. **Readability**: Code is self-documenting
5. **Reusability**: No code duplication
6. **Team Collaboration**: Multiple developers can work simultaneously
7. **Performance**: Better code organization leads to better performance

## 🔜 Next Steps

1. **Add Tests**: Create unit tests for controllers
2. **Environment Variables**: Move all secrets to .env
3. **Error Handling**: Add global error handler
4. **Validation**: Add input validation middleware
5. **Documentation**: Use Swagger/OpenAPI for API docs
6. **Rate Limiting**: Add rate limiting middleware
7. **Authentication**: Add JWT-based auth
8. **Monitoring**: Add APM tools like New Relic

## 📞 Support

If you encounter issues during migration, check:

1. Console errors for specific error messages
2. Log files (combined.log, error.log)
3. Firebase console for connection issues
4. Network tab in browser dev tools for API calls

## 🎉 Success!

Once everything is working, you can:

1. Remove or archive the old `server.js`
2. Update your deployment scripts to use `backend/index.js`
3. Update documentation to reference new structure
4. Train team members on new structure

---

**Remember:** The new backend is 100% compatible with the old one. All APIs work exactly the same way!
