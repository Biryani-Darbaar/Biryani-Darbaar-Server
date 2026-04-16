# Biryani Darbaar Server — Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Configuration](#configuration)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Reference](#api-reference)
   - [Auth & User Management](#auth--user-management)
   - [Cart](#cart)
   - [Categories](#categories)
   - [Dishes](#dishes)
   - [Gold Pricing](#gold-pricing)
   - [Images](#images)
   - [Locations](#locations)
   - [Mini Games](#mini-games)
   - [Notifications](#notifications)
   - [Orders](#orders)
   - [Payments](#payments)
   - [Promo Codes](#promo-codes)
   - [Rewards](#rewards)
7. [Business Logic](#business-logic)
8. [Data Models](#data-models)
9. [Utilities & Libraries](#utilities--libraries)
10. [Error Handling](#error-handling)
11. [Environment Variables](#environment-variables)

---

## Overview

**Biryani Darbaar Server** is a production-grade REST API (v2.0.0) for a food delivery and restaurant management platform. It handles the full lifecycle of customer interactions — from user registration and browsing the menu, to placing orders, processing payments, and tracking loyalty rewards. The server is built on **Node.js + Express** and uses **Firebase/Firestore** as its primary database, with **Stripe** for payment processing and **Pushy** for push notifications.

---

## Technology Stack

| Layer              | Technology                            |
| ------------------ | ------------------------------------- |
| Runtime            | Node.js (ESM modules)                 |
| Framework          | Express v4                            |
| Database           | Firebase Firestore                    |
| Authentication     | Firebase Auth + custom JWT            |
| File Storage       | Firebase Storage                      |
| Payments           | Stripe                                |
| Push Notifications | Pushy SDK                             |
| Image Handling     | Multer (in-memory buffer)             |
| Password Hashing   | bcryptjs (12 rounds)                  |
| Session Management | express-session + node-sessionstorage |
| HTTP Client        | Axios (pre-configured instance)       |
| Process Management | PM2 (ecosystem.config.cjs)            |

---

## Architecture

```
index.js
  └─ config/            — SDK initialization, feature flags, CORS, JWT, session
  └─ routes/index.js    — Mounts all 13 route modules directly on the Express app
       └─ middlewares/  — Auth (JWT / Firebase / Admin), validation, caching, logging
            └─ controllers/ — Business logic per domain
                 └─ utils/  — Pure helpers: calculations, storage, JWT, validation
                 └─ lib/    — Pre-configured clients: Axios, Pushy notification sender
```

**Request flow:**

```
Client → Express → Middleware (auth / validation) → Controller → Firestore / Firebase Storage / Stripe → Response
```

**Firestore Collections:**

| Collection                  | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| `users/{uid}`               | User profiles                              |
| `users/{uid}/orders/{id}`   | Per-user order history (subcollection)     |
| `users/{uid}/cart/{id}`     | Per-user shopping cart (subcollection)     |
| `category/{id}`             | Dish categories                            |
| `category/{id}/dishes/{id}` | Dishes under a category (subcollection)    |
| `order/{id}`                | Global order mirror (admin view)           |
| `goldprice/current`         | Active gold member discount percentage     |
| `promoCodes/{id}`           | Promotional discount codes                 |
| `rewards/rewardDoc`         | Global reward programme configuration      |
| `miniGames/{id}`            | Mini game definitions                      |
| `notifications/{id}`        | Broadcast notification history             |
| `userTokens/{id}`           | Pushy device tokens for push notifications |
| `location/{id}`             | Restaurant/branch location records         |

---

## Configuration

All config is initialized at startup via `config/index.js`, which re-exports the following modules:

### App Config (`config/app.config.js`)

- **Rate limit window:** 15 minutes / 5 requests
- **Max mini games:** 6 (configurable via `MAX_MINI_GAMES` env var)

### CORS (`config/cors.config.js`)

- Reads allowed origins from `ALLOWED_ORIGINS` (comma-separated)
- Requests with no origin (mobile apps, Postman) are always allowed
- `credentials: true`, all HTTP methods, 24-hour preflight cache

### Firebase (`config/firebase.config.js`)

- Initialises `firebase-admin` with a service account JSON file
- Path is set via `FIREBASE_SERVICE_ACCOUNT_PATH` (defaults to `../serviceAccountKey.json`)
- Exits the process immediately if credentials are missing

### JWT (`config/jwt.config.js`)

- Access token: signed with `JWT_SECRET`, default 7-day expiry
- Refresh token: signed with `JWT_REFRESH_SECRET`, default 30-day expiry
- Issuer/Audience: `biryani-darbaar-api` / `biryani-darbaar-clients`

### Multer (`config/multer.config.js`)

- In-memory storage — files are buffered in RAM before being streamed to Firebase Storage

### Session (`config/session.config.js`)

- `secure: true` in production (HTTPS-only cookies)
- `httpOnly: true`, `rolling: true` (session expiry resets on activity)
- `saveUninitialized: false`

### Stripe (`config/stripe.config.js`)

- Instantiated with `STRIPE_SECRET_KEY`

---

## Authentication & Authorization

The server uses **two parallel authentication systems** that can be used independently:

### 1. Custom JWT (primary)

- **`authenticateJWT`** — Verifies a Bearer token from the `Authorization` header. Attaches `{ userId, email }` to `req.user`. Used on all user-facing protected routes.
- **`optionalAuthenticate`** — Same as above, but silently continues if no token is present (sets `req.user = null`). Used where a response differs between guests and logged-in users (e.g. gold member pricing).
- **`refreshToken` endpoint** — Issues a new access token using a valid refresh token.

### 2. Firebase ID Token

- **`authenticateFirebase`** — Verifies a Firebase ID token via `admin.auth().verifyIdToken()`. Attaches `{ userId, email, emailVerified, phoneNumber }` to `req.user`.

### Role-Based Access

- **`requireAdmin`** — Looks up the user's Firestore record and checks that `role === 'admin'`. Used to gate admin-only endpoints.

### Session

- `express-session` is used in parallel with JWT for stateful session management (logout, `lastLogin`/`lastLogout` tracking).

---

## API Reference

> All routes are mounted directly (no `/api` prefix). All protected routes require `Authorization: Bearer <accessToken>`.

---

### Auth & User Management

**Base path:** `/auth`, `/user`

| Method | Path                    | Auth         | Description                                                              |
| ------ | ----------------------- | ------------ | ------------------------------------------------------------------------ |
| `POST` | `/auth/register`        | Public       | Register a new user                                                      |
| `POST` | `/auth/signup`          | Public       | Alias for register                                                       |
| `POST` | `/auth/login`           | Public       | Log in, returns JWT pair                                                 |
| `POST` | `/auth/refresh-token`   | Public       | Exchange refresh token for a new access token                            |
| `POST` | `/auth/logout`          | Optional JWT | Destroys session + clears in-memory storage                              |
| `POST` | `/auth/change-password` | JWT          | Verify current password, set new one (Firestore + Firebase Auth)         |
| `GET`  | `/user/:id`             | Public       | Get a user's profile (password hash stripped)                            |
| `PUT`  | `/user/:id`             | JWT          | Update profile (cannot overwrite `email`, `hashedPassword`, `createdAt`) |
| `GET`  | `/getUsers`             | JWT + Admin  | List all users (password hashes stripped)                                |
| `POST` | `/userImg`              | JWT + Multer | Upload a profile photo to Firebase Storage                               |
| `PUT`  | `/user/goldMember/:id`  | JWT + Admin  | Promote a user to Gold Member status                                     |
| `GET`  | `/userReward`           | JWT          | Get the authenticated user's reward point balance                        |

**Registration validation rules:**

- Email must be valid format
- Password: minimum 8 chars, at least one uppercase, one digit, one special character
- Phone number: must match a valid format
- Address: minimum length enforced
- Duplicate email check before Firebase Auth user creation

---

### Cart

**Base path:** `/cart`
All routes require `authenticateJWT`. Cart items are stored in the `users/{uid}/cart` subcollection.

| Method   | Path        | Description                                                                    |
| -------- | ----------- | ------------------------------------------------------------------------------ |
| `POST`   | `/cart`     | Add a dish to cart; if `dishId` already present, increments `quantity` instead |
| `POST`   | `/getCart`  | Retrieve all cart items for the authenticated user                             |
| `PUT`    | `/cart/:id` | Partially update a cart item (e.g. change quantity)                            |
| `DELETE` | `/cart/:id` | Remove a specific item from the cart                                           |

---

### Categories

**Base path:** `/categories`

| Method   | Path                    | Description                                                      |
| -------- | ----------------------- | ---------------------------------------------------------------- |
| `GET`    | `/categories`           | List all dish categories                                         |
| `POST`   | `/categories`           | Create a new category (duplicate name check)                     |
| `DELETE` | `/categories/:category` | Delete a category and all its dishes + images (parallel cleanup) |

---

### Dishes

**Base path:** `/dishes`

| Method   | Path                             | Auth         | Description                                                                  |
| -------- | -------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `POST`   | `/dishes`                        | Public       | Add a new dish with image upload                                             |
| `GET`    | `/dishes/category/:category`     | Optional JWT | Get available dishes in a category; Gold Member prices applied automatically |
| `GET`    | `/dishes/:cat`                   | Optional JWT | Get all dishes across all categories                                         |
| `PUT`    | `/dishes/:category/:id`          | Public       | Update a dish (replaces image if new file provided)                          |
| `DELETE` | `/dishes/:category/:id`          | Public       | Delete a dish and its storage image                                          |
| `GET`    | `/dishes/admin/:category`        | Public       | Get all dishes including unavailable ones                                    |
| `PATCH`  | `/dishes/admin/:category/:id`    | Public       | Admin update on a dish                                                       |
| `PUT`    | `/dishes/discount/:category/:id` | Public       | Apply a percentage discount to a dish (`offerAvailable: true`)               |
| `GET`    | `/specialOffers`                 | Public       | All dishes where `offerAvailable == true`, with discounted price             |
| `PATCH`  | `/availability`                  | Public       | Toggle a dish's `available` boolean                                          |

**Dish creation detail:**

- Accepts multipart form data with a `dishData` JSON field and an image file
- Auto-creates the parent category document if it doesn't exist
- Reads current `goldprice/current` and computes `goldPrice = price × (goldPricePercentage / 100)` at insertion time
- New dishes default to `available: true`

---

### Gold Pricing

**Base path:** `/goldPrice`

The Gold Pricing system applies a store-wide discount to all dishes for Gold Member users. The percentage is stored once and pre-computed onto every dish.

| Method | Path                     | Description                                                                                       |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `POST` | `/goldPrice`             | Set a new gold price percentage (0–100); recalculates `goldPrice` on every dish in every category |
| `GET`  | `/goldPrice`             | Get the current gold price percentage                                                             |
| `PUT`  | `/goldDiscountApply`     | Re-apply the current gold discount to all dishes (re-sync)                                        |
| `PUT`  | `/updateDishesGoldPrice` | Apply a discount to all dishes in a specific category only                                        |

---

### Images

**Base path:** `/img`

| Method   | Path   | Description                                                           |
| -------- | ------ | --------------------------------------------------------------------- |
| `POST`   | `/img` | Upload up to 50 images to a specified `directory` in Firebase Storage |
| `GET`    | `/img` | List all files under the `images/` prefix                             |
| `DELETE` | `/img` | **Delete ALL files in the storage bucket** (destructive)              |

---

### Locations

**Base path:** `/locations`

Manages restaurant/branch locations with optional images.

| Method   | Path             | Description                                                      |
| -------- | ---------------- | ---------------------------------------------------------------- |
| `POST`   | `/locations`     | Create a new location (with optional image upload)               |
| `GET`    | `/locations`     | List all locations                                               |
| `PUT`    | `/locations/:id` | Update a location (old image deleted before new one is uploaded) |
| `DELETE` | `/locations/:id` | Delete a location and its associated image from storage          |

---

### Mini Games

**Base path:** `/miniGames`

Mini games are capped at **6** by the `checkCollectionLimit` middleware (configurable via `MAX_MINI_GAMES`).

| Method   | Path             | Description                                   |
| -------- | ---------------- | --------------------------------------------- |
| `POST`   | `/miniGames`     | Create a mini game (blocked if limit reached) |
| `GET`    | `/miniGames`     | List all mini games                           |
| `PUT`    | `/miniGames/:id` | Update a mini game                            |
| `DELETE` | `/miniGames/:id` | Delete a mini game                            |

**Mini game fields:** `name`, `value`, `type`

---

### Notifications

**Base path:** `/notifications`, `/send-notification`, `/store-token`

| Method | Path                 | Description                                                                                         |
| ------ | -------------------- | --------------------------------------------------------------------------------------------------- |
| `POST` | `/send-notification` | Broadcast a push notification to **all** registered Pushy device tokens; also persists to Firestore |
| `GET`  | `/notifications`     | List all notifications (newest first)                                                               |
| `POST` | `/store-token`       | Register a Pushy device token for push notification delivery                                        |

**Push notification payload:** includes title, body, badge count, and `ping.aiff` sound.

---

### Orders

**Base path:** `/orders`

All routes require `authenticateJWT`. Orders are **dual-written** to both `users/{uid}/orders/{id}` (user-scoped) and the global `order/{id}` collection (admin view).

| Method  | Path                  | Description                                                             |
| ------- | --------------------- | ----------------------------------------------------------------------- |
| `POST`  | `/orders`             | Place an order; calculates and adds reward points to the user's balance |
| `GET`   | `/orders`             | Admin: get all orders from the global collection                        |
| `GET`   | `/ordersByUser/:id`   | Get all orders for a specific user                                      |
| `GET`   | `/orders/:id`         | Get a single order                                                      |
| `PATCH` | `/orders/:id`         | Update order status (user-initiated; updates both copies)               |
| `PATCH` | `/ordersAdmin/:id`    | Update order status (admin; requires `userId` in request body)          |
| `PUT`   | `/order/status/:id`   | Alias for admin status update                                           |
| `GET`   | `/orders/total-count` | Total order count across all users                                      |
| `GET`   | `/daily-summary`      | Global orders grouped by ISO date                                       |

---

### Payments

**Base path:** `/payment`, `/create-payment-intent`, `/confirm-payment`

All routes require `authenticateJWT`.

| Method | Path                        | Description                                                                                |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------ |
| `POST` | `/create-payment-intent`    | Create a Stripe PaymentIntent (amount in cents); stores `userId` and timestamp in metadata |
| `POST` | `/confirm-payment`          | Retrieve a PaymentIntent to check its current status                                       |
| `GET`  | `/payment/:paymentIntentId` | Retrieve full PaymentIntent details from Stripe                                            |

---

### Promo Codes

**Base path:** `/create-promo`, `/validate-promo`, `/get-all-promos`

| Method | Path              | Description                                                                                                      |
| ------ | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `POST` | `/create-promo`   | Create a new promo code; discount is stored as a decimal (e.g. 20% → `0.20`). Duplicate code check enforced.     |
| `POST` | `/validate-promo` | Validate a promo code and check expiry (stored as a Unix timestamp). Returns `finalDiscount` decimal on success. |
| `GET`  | `/get-all-promos` | List all promo codes with discount converted back to a percentage for display                                    |

---

### Rewards

**Base path:** `/rewards`, `/apply-reward`

The reward system is configured by a single document (`rewards/rewardDoc`) that defines the earning rate and dollar equivalent.

| Method | Path            | Description                                                                               |
| ------ | --------------- | ----------------------------------------------------------------------------------------- |
| `POST` | `/rewards`      | Create or update the global reward configuration                                          |
| `GET`  | `/rewards`      | Get the current reward configuration                                                      |
| `POST` | `/apply-reward` | Redeem a reward: deducts 10 points from the user, returns the equivalent dollar deduction |

---

## Business Logic

### Gold Membership

- Users can be promoted to Gold Member status by an admin via `PUT /user/goldMember/:id`.
- When a Gold Member is identified (via `optionalAuthenticate`), all dish `price` fields in responses are replaced with the pre-calculated `goldPrice` field.
- The `goldPrice` for every dish is stored in Firestore and is recalculated whenever the admin updates the global gold price percentage via `POST /goldPrice`.
- Formula: `goldPrice = price × (goldPricePercentage / 100)`

### Reward Points

- On every successful order, reward points are earned: `floor(totalPrice / dollar)` where `dollar` comes from the global `rewards/rewardDoc` config.
- Points are added to the user's `reward` field in Firestore.
- Redeeming rewards (via `POST /apply-reward`) costs **10 points** and returns a corresponding dollar deduction to be applied to the order total.

### Dual-Write Orders

- Every order is written to two Firestore paths:
  1. `users/{uid}/orders/{id}` — for efficient per-user queries.
  2. `order/{id}` — for admin-wide views and analytics.
- Status updates must update both copies to maintain consistency.

### Image Lifecycle

- All images are uploaded to **Firebase Storage** via an in-memory Multer buffer.
- Uploaded files are made publicly accessible and a CDN URL (`https://storage.googleapis.com/...`) is stored in Firestore.
- When a dish, location, or user image is replaced or deleted, the old file is explicitly removed from Firebase Storage to prevent orphaned files.

### Promo Codes

- Discount percentages are stored as decimals in Firestore (20% → `0.20`) and converted back to percentages for display in the `GET /get-all-promos` response.
- Expiry is stored as a Unix timestamp and compared to the current time at validation.

### Mini Game Cap

- The `checkCollectionLimit` middleware queries Firestore on every create request and blocks creation if the `miniGames` collection already has `maxMiniGames` (default: 6) documents.

---

## Data Models

### User

```json
{
  "uid": "string",
  "email": "string",
  "name": "string",
  "phone": "string",
  "address": "string",
  "role": "user | admin",
  "goldMember": false,
  "goldMemberSince": "Timestamp | null",
  "rewards": 0,
  "imageUrl": "string | null",
  "lastLogin": "Timestamp",
  "lastLogout": "Timestamp | null",
  "createdAt": "Timestamp"
}
```

### Dish

```json
{
  "name": "string",
  "description": "string",
  "price": "number",
  "goldPrice": "number",
  "category": "string",
  "imageUrl": "string",
  "available": true,
  "offerAvailable": false,
  "discount": "number | null"
}
```

### Order

```json
{
  "userId": "string",
  "items": [
    {
      "dishId": "string",
      "name": "string",
      "price": "number",
      "quantity": "number"
    }
  ],
  "totalPrice": "number",
  "status": "string",
  "createdAt": "Timestamp"
}
```

### Reward Config (`rewards/rewardDoc`)

```json
{
  "reward": "number",
  "dollar": "number"
}
```

### Promo Code

```json
{
  "code": "string",
  "discount": "number (decimal)",
  "expiresAt": "number (Unix timestamp)"
}
```

### Mini Game

```json
{
  "name": "string",
  "value": "number",
  "type": "string"
}
```

### Notification

```json
{
  "title": "string",
  "body": "string",
  "timestamp": "Timestamp"
}
```

---

## Utilities & Libraries

### `utils/errors.util.js` — Custom Error Classes

All extend `AppError` with `statusCode`, `errorCode`, `isOperational`, and `timestamp`:

| Class                  | HTTP Status | Use Case                                        |
| ---------------------- | ----------- | ----------------------------------------------- |
| `ValidationError`      | 400         | Input validation failures (includes `errors[]`) |
| `AuthenticationError`  | 401         | Invalid or expired tokens                       |
| `AuthorizationError`   | 403         | Insufficient permissions                        |
| `NotFoundError`        | 404         | Resource not found                              |
| `ConflictError`        | 409         | Duplicate resource (e.g. existing email/promo)  |
| `RateLimitError`       | 429         | Rate limit exceeded                             |
| `PaymentError`         | 402         | Payment processing failures                     |
| `DatabaseError`        | 500         | Non-operational database error                  |
| `ExternalServiceError` | 502         | Non-operational third-party error               |

### `utils/response.util.js` — Standardised Responses

- `successResponse(res, statusCode, data, message)` → `{ success: true, statusCode, data, message? }`
- `errorResponse(res, errorOrStatusCode, message?, error?)` — Dual-signature; handles Firebase Auth error codes with human-readable messages
- `asyncHandler(fn)` — Try/catch wrapper for async controller functions, forwards errors to Express error handler

### `utils/jwt.util.js`

- `generateAccessToken(userId, email)` / `generateRefreshToken(userId)` / `generateTokens(userId, email)`
- `verifyAccessToken(token)` / `verifyRefreshToken(token)` — type-checked; throws `AuthenticationError`
- `extractTokenFromHeader(req)` — Parses `Authorization: Bearer <token>`

### `utils/calculations.util.js`

- `calculateGoldPrice(price, goldPricePercentage)` → `price × (pct / 100)`
- `calculateDiscountedPrice(price, discountPercentage)` → rounded to 2 decimal places
- `calculateRewards(totalPrice, dollarValue)` → `floor(totalPrice / dollarValue)`
- `calculateDollarValue(rewardData)` → dollar deduction from reward config

### `utils/storage.util.js`

- `uploadFile(file, directory, fileName)` — Uploads buffer to Firebase Storage, makes public, returns CDN URL
- `deleteFile(imageUrl)` — Parses path from URL and deletes from bucket
- `getFiles(prefix)` — Lists files under a storage prefix
- `deleteAllFiles()` — Deletes everything in the bucket

### `utils/validation.util.js`

- `validateEmail`, `validatePassword`, `validatePhoneNumber`
- `validateRequired(fields, data)` — Multi-field presence check
- `validateLength(value, min, max, fieldName)`

### `lib/notification.lib.js`

- `sendPushNotifications(title, body)` — Reads all tokens from `userTokens`, fans out to all devices via Pushy SDK using `Promise.all`

### `lib/axios.lib.js`

- Pre-configured Axios instance with 30s timeout, JSON headers
- In development: logs outgoing requests and response times

---

## Error Handling

Errors propagate through Express's standard `next(error)` mechanism.

- **Controller errors** are caught by `asyncHandler` wrappers and forwarded to the global handler.
- **`errorHandler` middleware** (`middlewares/error.middleware.js`) logs context (URL, method, IP, userId) and formats the response using `errorResponse()`.
- **`notFoundHandler`** catches all unmatched routes and generates a 404 error.
- **Process-level safety nets:** `uncaughtException` and `unhandledRejection` handlers are registered to prevent silent crashes.
- **Graceful shutdown:** `SIGTERM`/`SIGINT` signals trigger a clean shutdown with a 10-second forced-exit fallback.

---

## Environment Variables

| Variable                        | Required | Description                                  |
| ------------------------------- | -------- | -------------------------------------------- |
| `NODE_ENV`                      | Yes      | `development`, `qa`, or `production`         |
| `PORT`                          | Yes      | Port the server listens on                   |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Yes      | Path to Firebase Admin service account JSON  |
| `JWT_SECRET`                    | Yes      | Secret for signing access tokens             |
| `JWT_REFRESH_SECRET`            | Yes      | Secret for signing refresh tokens            |
| `JWT_EXPIRES_IN`                | No       | Access token expiry (default: `7d`)          |
| `JWT_REFRESH_EXPIRES_IN`        | No       | Refresh token expiry (default: `30d`)        |
| `STRIPE_SECRET_KEY`             | Yes      | Stripe secret key                            |
| `PUSHY_API_KEY`                 | Yes      | Pushy SDK API key                            |
| `SESSION_SECRET`                | Yes      | Secret for express-session                   |
| `SESSION_MAX_AGE`               | No       | Session max age in ms                        |
| `SESSION_SAME_SITE`             | No       | SameSite cookie attribute                    |
| `ALLOWED_ORIGINS`               | Yes      | Comma-separated list of allowed CORS origins |
| `MAX_MINI_GAMES`                | No       | Maximum number of mini games (default: 6)    |
