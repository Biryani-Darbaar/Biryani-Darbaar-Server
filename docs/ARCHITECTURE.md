# Architecture Diagram

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                      │
│         (Web App, Mobile App, Admin Dashboard, etc.)            │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTP/HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS SERVER                           │
│                         (app.js)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Middleware Layer                                               │
│  ├─ CORS                                                        │
│  ├─ Body Parser                                                 │
│  ├─ Morgan Logger                                               │
│  ├─ Session Management                                          │
│  └─ Cache Controller                                            │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ROUTES LAYER                              │
│                      (routes/*.js)                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │  Dishes  │  │  Orders  │  │   Cart   │       │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │               │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐       │
│  │ Category │  │ Location │  │  Promo   │  │ Payment  │       │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │               │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐       │
│  │  Reward  │  │ MiniGame │  │GoldPrice │  │  Notify  │       │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLERS LAYER                            │
│                   (controllers/*.js)                             │
├─────────────────────────────────────────────────────────────────┤
│  Business Logic:                                                │
│  • Data validation                                              │
│  • Business rules enforcement                                   │
│  • Orchestrating operations                                     │
│  • Calling utilities and services                               │
│  • Response formatting                                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │   UTILITIES   │  │  LIBRARIES   │  │    CONFIG    │
        │  (utils/*.js) │  │ (lib/*.js)   │  │(config/*.js) │
        ├──────────────┤  ├──────────────┤  ├──────────────┤
        │• Calculations│  │• Notification│  │• Firebase    │
        │• Storage     │  │  Service     │  │• Stripe      │
        │• Session     │  │• Other Logic │  │• Pushy       │
        │• Response    │  │              │  │• Multer      │
        └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
               │                 │                 │
               └────────┬────────┴─────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Firebase   │  │    Stripe    │  │    Pushy     │         │
│  │  Firestore   │  │   Payments   │  │   Push       │         │
│  │   Storage    │  │              │  │ Notifications│         │
│  │     Auth     │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow

```
1. Client Request
   │
   ├──> 2. Express Middleware
   │       ├─ CORS Check
   │       ├─ Body Parser
   │       ├─ Logger
   │       └─ Session
   │
   ├──> 3. Route Handler
   │       └─ Maps URL to Controller
   │
   ├──> 4. Controller
   │       ├─ Validates Input
   │       ├─ Applies Business Logic
   │       ├─ Calls Utilities/Services
   │       └─ Calls Firebase/External APIs
   │
   ├──> 5. Response
   │       ├─ Format Data
   │       ├─ Log Result
   │       └─ Send to Client
   │
   └──> 6. Client Receives Response
```

## 📦 Module Dependencies

```
app.js
  │
  ├─> config/
  │     ├─> firebase.config.js
  │     ├─> stripe.config.js
  │     ├─> pushy.config.js
  │     └─> multer.config.js
  │
  ├─> middlewares/
  │     ├─> logger.middleware.js
  │     ├─> cache.middleware.js
  │     └─> validation.middleware.js
  │
  ├─> routes/
  │     ├─> index.js (Route Manager)
  │     │     │
  │     │     ├─> auth.routes.js ──────┐
  │     │     ├─> dish.routes.js ──────┤
  │     │     ├─> order.routes.js ─────┤
  │     │     ├─> cart.routes.js ──────┤
  │     │     └─> ... (other routes) ──┤
  │     │                               │
  │     └─────────────────────────────> controllers/
  │                                       ├─> auth.controller.js
  │                                       ├─> dish.controller.js
  │                                       ├─> order.controller.js
  │                                       └─> ... (other controllers)
  │                                              │
  │                                              ├─> utils/
  │                                              ├─> lib/
  │                                              └─> config/
  │
  └─> constants/
        └─> index.js
```

## 🗂️ File Relationships

```
dish.controller.js depends on:
  ├─ config/firebase.config.js (db, bucket)
  ├─ constants/index.js (COLLECTION_NAMES)
  ├─ utils/storage.util.js (uploadFile, deleteFile)
  ├─ utils/response.util.js (errorResponse, successResponse)
  └─ utils/session.util.js (getUserId)

order.controller.js depends on:
  ├─ config/firebase.config.js (db)
  ├─ constants/index.js (COLLECTION_NAMES)
  ├─ utils/session.util.js (getUserId)
  ├─ utils/calculations.util.js (calculateRewards)
  └─ utils/response.util.js (errorResponse, successResponse)

notification.controller.js depends on:
  ├─ config/firebase.config.js (admin, db)
  ├─ constants/index.js (COLLECTION_NAMES)
  ├─ lib/notification.lib.js (sendPushNotifications)
  └─ utils/response.util.js (errorResponse, successResponse)
```

## 🔐 Data Flow: User Authentication

```
Client
  │
  │ POST /login { idToken }
  │
  ▼
Express Middleware
  │
  ▼
auth.routes.js
  │
  ▼
auth.controller.login()
  │
  ├─> admin.auth().verifyIdToken(idToken)
  │     │
  │     ├─> Firebase Auth API
  │     │     └─> Returns decodedToken
  │     │
  │     └─> session.util.js
  │           └─> setUserId(decodedToken.uid)
  │
  └─> response.util.js
        └─> successResponse(200, { sessionId, userId })
              │
              ▼
            Client Receives Success Response
```

## 🛒 Data Flow: Adding Dish to Cart

```
Client
  │
  │ POST /cart { dishId, quantity, ... }
  │
  ▼
Express Middleware
  │
  ▼
cart.routes.js
  │
  ▼
cart.controller.addToCart()
  │
  ├─> session.util.getUserId(req)
  │     └─> Returns userId
  │
  ├─> Firebase Firestore
  │     ├─> Check if item exists
  │     ├─> Update quantity OR
  │     └─> Create new cart item
  │
  └─> response.util.successResponse()
        │
        ▼
      Client Receives Success Response
```

## 📦 Data Flow: Creating Order

```
Client
  │
  │ POST /orders { items, totalPrice, ... }
  │
  ▼
Express Middleware
  │
  ▼
order.routes.js
  │
  ▼
order.controller.createOrder()
  │
  ├─> session.util.getUserId(req)
  │     └─> Returns userId
  │
  ├─> Firebase Firestore
  │     ├─> Get user data
  │     ├─> Create order in user's collection
  │     ├─> Create order in global collection
  │     ├─> Get reward settings
  │     └─> Calculate rewards
  │
  ├─> calculations.util.calculateRewards()
  │     └─> Returns rewardsEarned
  │
  ├─> Firebase Firestore
  │     └─> Update user rewards
  │
  └─> response.util.successResponse()
        │
        ▼
      Client Receives { orderId, rewardsEarned, ... }
```

## 🎨 Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│                         (Routes)                             │
│  • Define endpoints                                          │
│  • Map HTTP methods                                          │
│  • Apply middleware                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      BUSINESS LAYER                          │
│                      (Controllers)                           │
│  • Validate input                                            │
│  • Apply business rules                                      │
│  • Orchestrate operations                                    │
│  • Handle errors                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                           │
│                   (Utils & Libraries)                        │
│  • Reusable functions                                        │
│  • Complex calculations                                      │
│  • External API calls                                        │
│  • File operations                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│              (Firebase Firestore & Storage)                  │
│  • Data persistence                                          │
│  • File storage                                              │
│  • Authentication                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Principles Applied

1. **Single Responsibility**: Each file has one job
2. **DRY (Don't Repeat Yourself)**: Utilities for common tasks
3. **Separation of Concerns**: Routes → Controllers → Services → Data
4. **Dependency Injection**: Configs are imported, not hardcoded
5. **Modularity**: Each module can work independently

---

This architecture makes the codebase:

- ✅ Easy to understand
- ✅ Easy to test
- ✅ Easy to maintain
- ✅ Easy to scale
- ✅ Easy to extend
