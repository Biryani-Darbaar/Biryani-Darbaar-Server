# Biryani Darbar Backend API

A modular and well-structured Node.js/Express backend for the Biryani Darbar application.

## 📁 Project Structure

```
backend/
├── config/              # Configuration files
│   ├── firebase.config.js
│   ├── stripe.config.js
│   ├── pushy.config.js
│   └── multer.config.js
├── constants/           # Application constants
│   └── index.js
├── controllers/         # Request handlers
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
├── middlewares/         # Custom middleware
│   ├── cache.middleware.js
│   ├── logger.middleware.js
│   └── validation.middleware.js
├── routes/              # API routes
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
│   ├── reward.routes.js
│   └── index.js
├── utils/               # Utility functions
│   ├── calculations.util.js
│   ├── response.util.js
│   ├── session.util.js
│   └── storage.util.js
├── lib/                 # Business logic libraries
│   └── notification.lib.js
├── app.js               # Express app configuration
├── index.js             # Entry point
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Firebase project with Firestore and Storage
- Stripe account for payments
- Pushy account for push notifications

### Installation

1. Install dependencies:

```bash
npm install
```

2. Ensure you have the Firebase service account key file (`serviceAccountKey.json`) in the project root.

3. Update the configuration files in the `config/` directory with your credentials if needed.

### Running the Server

```bash
# Development
node backend/index.js

# Or from the root
node backend/app.js
```

The server will start on port 4200 (configurable in `constants/index.js`).

## 📡 API Endpoints

All endpoints are prefixed with `/api`

### Authentication

- `POST /api/signup` - Register a new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/user/:id` - Get user by ID
- `PUT /api/user/:id` - Update user
- `GET /api/getUsers` - Get all users
- `POST /api/userImg` - Upload user image
- `PUT /api/user/goldMember/:id` - Update user to gold member
- `GET /api/userReward` - Get user rewards

### Dishes

- `POST /api/dishes` - Add a new dish
- `GET /api/dishes/category/:category` - Get dishes by category
- `GET /api/dishes/:cat` - Get all dishes
- `PUT /api/dishes/:category/:id` - Update dish
- `DELETE /api/dishes/:category/:id` - Delete dish
- `GET /api/dishes/admin/:category` - Get dishes by category (admin)
- `PATCH /api/dishes/admin/:category/:id` - Update dish (admin)
- `PUT /api/dishes/discount/:category/:id` - Apply discount to dish
- `GET /api/specialOffers` - Get special offers
- `PATCH /api/availability` - Toggle dish availability

### Categories

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `DELETE /api/categories/:category` - Delete category

### Orders

- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders
- `GET /api/ordersByUser/:id` - Get orders by user
- `GET /api/orders/:id` - Get order by ID
- `PATCH /api/orders/:id` - Update order status
- `PATCH /api/ordersAdmin/:id` - Update order status (admin)
- `PUT /api/order/status/:id` - Update order status (alternative)
- `GET /api/orders/total-count` - Get total order count
- `GET /api/daily-summary` - Get daily order summary

### Cart

- `POST /api/cart` - Add item to cart
- `POST /api/getCart` - Get cart items
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Delete cart item

### Locations

- `POST /api/locations` - Create location
- `GET /api/locations` - Get all locations
- `PUT /api/locations/:id` - Update location
- `DELETE /api/locations/:id` - Delete location

### Promo Codes

- `POST /api/create-promo` - Create promo code
- `POST /api/validate-promo` - Validate promo code
- `GET /api/get-all-promos` - Get all promo codes

### Payment

- `POST /api/create-payment-intent` - Create Stripe payment intent

### Rewards

- `POST /api/rewards` - Create or update reward
- `GET /api/rewards` - Get all rewards
- `POST /api/apply-reward` - Apply reward to order

### Mini Games

- `POST /api/miniGames` - Create mini game
- `GET /api/miniGames` - Get all mini games
- `PUT /api/miniGames/:id` - Update mini game
- `DELETE /api/miniGames/:id` - Delete mini game

### Gold Price

- `POST /api/goldPrice` - Set gold price
- `GET /api/goldPrice` - Get gold price
- `PUT /api/goldDiscountApply` - Apply gold discount to all dishes
- `PUT /api/updateDishesGoldPrice` - Update dishes gold price by category

### Notifications

- `POST /api/send-notification` - Send notification to all users
- `GET /api/notifications` - Get all notifications
- `POST /api/store-token` - Store device token

### Images

- `POST /api/img` - Upload images
- `GET /api/img` - Get all images
- `DELETE /api/img` - Delete all images

## 🔧 Configuration

### Firebase

Update `config/firebase.config.js` with your Firebase credentials.

### Stripe

Update `config/stripe.config.js` with your Stripe API key.

### Pushy

Update `config/pushy.config.js` with your Pushy API key.

### Constants

Modify `constants/index.js` to change:

- Server port
- Collection names
- Other app constants

## 📝 Features

- ✅ Modular architecture
- ✅ Separation of concerns (routes, controllers, services)
- ✅ Centralized error handling
- ✅ Request logging
- ✅ Session management
- ✅ File upload support (images)
- ✅ Firebase integration (Auth, Firestore, Storage)
- ✅ Stripe payment integration
- ✅ Push notifications via Pushy
- ✅ Reward system
- ✅ Gold member pricing
- ✅ Promo code system
- ✅ Order management
- ✅ Cart functionality

## 🔐 Security Notes

**Important:** Before deploying to production:

1. Move all API keys and secrets to environment variables
2. Use `.env` file with `dotenv` package
3. Never commit sensitive credentials to version control
4. Update CORS settings for production
5. Implement proper authentication middleware
6. Add rate limiting
7. Enable HTTPS

## 📦 Dependencies

Key dependencies:

- `express` - Web framework
- `firebase-admin` - Firebase SDK
- `multer` - File upload handling
- `stripe` - Payment processing
- `pushy` - Push notifications
- `express-session` - Session management
- `morgan` - HTTP request logger
- `cors` - Cross-origin resource sharing

## 🤝 Contributing

This is a refactored version of a monolithic codebase. All functionality from the original `server.js` has been preserved and organized into a modular structure.

## 📄 License

[Add your license information here]
