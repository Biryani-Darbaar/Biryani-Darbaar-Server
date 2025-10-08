#!/bin/bash

# Commit 1: Environment and documentation
git add .env .env.example && git commit -m "config: add environment configuration files"

# Commit 2: Root documentation
git add README.md && git commit -m "docs: update project README"

# Commit 3: Gitignore
git add .gitignore && git commit -m "chore: update gitignore rules"

# Commit 4: Package management
git add package.json pnpm-lock.yaml && git commit -m "deps: update project dependencies"

# Commit 5: Main app entry
git add app.js index.js && git commit -m "feat: add new application entry points"

# Commit 6: Cleanup documentation
git add CLEANUP_SUMMARY.md && git commit -m "docs: add cleanup summary documentation"

# Commit 7: Firebase config
git add config/firebase.config.js && git commit -m "config: add Firebase configuration module"

# Commit 8: Stripe config
git add config/stripe.config.js && git commit -m "config: add Stripe payment configuration"

# Commit 9: Pushy config
git add config/pushy.config.js && git commit -m "config: add Pushy notification configuration"

# Commit 10: Multer config
git add config/multer.config.js && git commit -m "config: add Multer file upload configuration"

# Commit 11: CORS config
git add config/cors.config.js && git commit -m "config: add CORS configuration"

# Commit 12: Constants
git add constants/index.js && git commit -m "feat: add application constants"

# Commit 13: Auth controller
git add controllers/auth.controller.js && git commit -m "feat(auth): add authentication controller"

# Commit 14: Cart controller
git add controllers/cart.controller.js && git commit -m "feat(cart): add cart management controller"

# Commit 15: Category controller
git add controllers/category.controller.js && git commit -m "feat(category): add category controller"

# Commit 16: Dish controller
git add controllers/dish.controller.js && git commit -m "feat(dish): add dish management controller"

# Commit 17: Gold price controller
git add controllers/goldPrice.controller.js && git commit -m "feat(goldPrice): add gold price controller"

# Commit 18: Image controller
git add controllers/image.controller.js && git commit -m "feat(image): add image upload controller"

# Commit 19: Location controller
git add controllers/location.controller.js && git commit -m "feat(location): add location controller"

# Commit 20: Mini game controller
git add controllers/miniGame.controller.js && git commit -m "feat(miniGame): add mini game controller"

# Commit 21: Notification controller
git add controllers/notification.controller.js && git commit -m "feat(notification): add notification controller"

# Commit 22: Order controller
git add controllers/order.controller.js && git commit -m "feat(order): add order management controller"

# Commit 23: Payment controller
git add controllers/payment.controller.js && git commit -m "feat(payment): add payment processing controller"

# Commit 24: Promo controller
git add controllers/promo.controller.js && git commit -m "feat(promo): add promo code controller"

# Commit 25: Reward controller
git add controllers/reward.controller.js && git commit -m "feat(reward): add reward system controller"

# Commit 26: Auth middleware
git add middlewares/auth.middleware.js && git commit -m "feat(auth): add authentication middleware"

# Commit 27: Auth middlewares grouping
git add middlewares/authMiddlewares.js && git commit -m "refactor(auth): group authentication middlewares"

# Commit 28: Cache middleware
git add middlewares/cache.middleware.js && git commit -m "feat(middleware): add cache middleware"

# Commit 29: Error middleware
git add middlewares/error.middleware.js && git commit -m "feat(middleware): add error handling middleware"

# Commit 30: Validation middleware
git add middlewares/validation.middleware.js && git commit -m "feat(middleware): add validation middleware"

# Commit 31: Middleware index
git add middlewares/index.js && git commit -m "refactor(middleware): update middleware exports"

# Commit 32: Auth routes
git add routes/auth.routes.js && git commit -m "feat(routes): add authentication routes"

# Commit 33: Cart routes
git add routes/cart.routes.js && git commit -m "feat(routes): add cart routes"

# Commit 34: Category routes
git add routes/category.routes.js && git commit -m "feat(routes): add category routes"

# Commit 35: Dish routes
git add routes/dish.routes.js && git commit -m "feat(routes): add dish routes"

# Commit 36: Gold price routes
git add routes/goldPrice.routes.js && git commit -m "feat(routes): add gold price routes"

# Commit 37: Image routes
git add routes/image.routes.js && git commit -m "feat(routes): add image upload routes"

# Commit 38: Location routes
git add routes/location.routes.js && git commit -m "feat(routes): add location routes"

# Commit 39: Mini game routes
git add routes/miniGame.routes.js && git commit -m "feat(routes): add mini game routes"

# Commit 40: Notification routes
git add routes/notification.routes.js && git commit -m "feat(routes): add notification routes"

# Commit 41: Order routes
git add routes/order.routes.js && git commit -m "feat(routes): add order routes"

# Commit 42: Payment routes
git add routes/payment.routes.js && git commit -m "feat(routes): add payment routes"

# Commit 43: Promo routes
git add routes/promo.routes.js && git commit -m "feat(routes): add promo routes"

# Commit 44: Reward routes
git add routes/reward.routes.js && git commit -m "feat(routes): add reward routes"

# Commit 45: Routes index
git add routes/index.js && git commit -m "feat(routes): add routes index"

# Commit 46: Axios library
git add lib/axios.lib.js && git commit -m "feat(lib): add axios library wrapper"

# Commit 47: Notification library
git add lib/notification.lib.js && git commit -m "feat(lib): add notification library"

# Commit 48: Calculations utility
git add utils/calculations.util.js && git commit -m "feat(utils): add calculations utility"

# Commit 49: Errors utility
git add utils/errors.util.js && git commit -m "feat(utils): add error handling utility"

# Commit 50: JWT utility
git add utils/jwt.util.js && git commit -m "feat(utils): add JWT utility"

# Commit 51: Response utility
git add utils/response.util.js && git commit -m "feat(utils): add response formatting utility"

# Commit 52: Session utility
git add utils/session.util.js && git commit -m "feat(utils): add session management utility"

# Commit 53: Storage and validation utilities
git add utils/storage.util.js utils/validation.util.js && git commit -m "feat(utils): add storage and validation utilities"

# Commit 54: Documentation files
git add docs/ && git commit -m "docs: add comprehensive project documentation"

# Commit 55: Remove old src directory structure
git add -A src/ && git commit -m "refactor: remove old src directory structure"

# Commit 56: Remove old service account key
git rm --cached serviceAccountKey.json 2>/dev/null || git add serviceAccountKey.json
git commit -m "security: remove service account key from repository" --allow-empty

# Commit 57: Update old folder
git add old/ && git commit -m "chore(old): update legacy files"

echo "All commits completed successfully!"
