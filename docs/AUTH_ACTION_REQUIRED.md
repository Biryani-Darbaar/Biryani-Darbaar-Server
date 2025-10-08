# Authentication System - Action Required

## ✅ Fixes Applied

### 1. Admin Middleware Created
- ✅ Created `requireAdmin` middleware in `middlewares/auth.middleware.js`
- ✅ Exported from `middlewares/authMiddlewares.js`
- ✅ Exported from `middlewares/index.js`

### 2. Admin Routes Protected
- ✅ `GET /auth/getUsers` - Now requires authentication + admin role
- ✅ `PUT /auth/user/goldMember/:id` - Now requires authentication + admin role

### 3. User Role System
- ✅ Added `role: "user"` field to user registration
- ✅ Default role is "user" for all new registrations

### 4. Improved Phone Validation
- ✅ Created `isValidPhoneNumber()` function
- ✅ Validates 10-15 digits
- ✅ Removes non-digit characters before validation
- ✅ Updated validation error message

### 5. Documentation Created
- ✅ `docs/AUTH_API_DOCUMENTATION.md` - Complete API docs for frontend
- ✅ `docs/AUTH_ANALYSIS.md` - Technical analysis and recommendations
- ✅ `docs/AUTH_ACTION_REQUIRED.md` - This file

---

## 🔴 Critical - You Must Do These

### 1. Install Rate Limiting Package
**Status:** Not installed  
**Priority:** 🔴 CRITICAL - Security vulnerability

```bash
cd "c:\Users\Sarthak S Kumar\Downloads\Biriyani-Darbar-Server"
pnpm add express-rate-limit
```

Then add to `app.js`:
```javascript
const rateLimit = require('express-rate-limit');

// Auth endpoints rate limiter
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // 5 attempts
  message: {
    success: false,
    message: 'Too many attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

// Apply to routes (add BEFORE initRoutes)
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth/refresh-token', authLimiter);
app.use('/api/', apiLimiter);
```

### 2. Create Your First Admin User
**Status:** No admin users exist  
**Priority:** 🔴 CRITICAL - Cannot access admin endpoints

You need to manually create an admin user in Firebase Firestore:

**Option A: Via Firebase Console**
1. Go to Firebase Console → Firestore Database
2. Find the `users` collection
3. Select your user document
4. Click "Edit Field"
5. Add field: `role` = `"admin"` (string)

**Option B: Via Firebase Admin SDK (Recommended)**

Create a script `scripts/create-admin.js`:
```javascript
require('dotenv').config();
const { admin, db } = require('../config/firebase.config');
const { COLLECTION_NAMES } = require('../constants');

const createAdmin = async (email) => {
  try {
    // Find user by email
    const usersRef = db.collection(COLLECTION_NAMES.USERS);
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (snapshot.empty) {
      console.error(`User with email ${email} not found`);
      return;
    }
    
    const userDoc = snapshot.docs[0];
    
    // Update role to admin
    await usersRef.doc(userDoc.id).update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ User ${email} is now an admin`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

// Usage: node scripts/create-admin.js your-email@example.com
const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/create-admin.js <email>');
  process.exit(1);
}

createAdmin(email);
```

Then run:
```bash
mkdir scripts
# Create the file above, then run:
node scripts/create-admin.js your-email@example.com
```

### 3. Add Environment Variables
**Status:** Missing in `.env`  
**Priority:** 🟡 MEDIUM

Add to your `.env` file:
```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# Redis (for production)
# REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=
```

---

## 🟡 Recommended - Should Do Soon

### 4. Install Redis for Production Session Store
**Status:** Using memory store (not production-ready)  
**Priority:** 🟡 MEDIUM - Required for production

```bash
pnpm add connect-redis redis
```

Update `app.js`:
```javascript
// Only use Redis in production
if (process.env.NODE_ENV === 'production') {
  const RedisStore = require('connect-redis').default;
  const { createClient } = require('redis');

  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD
  });

  redisClient.connect().catch(console.error);

  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET || "secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "strict",
      },
      name: "sessionId",
    })
  );
} else {
  // Keep existing session config for development
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "strict",
      },
      name: "sessionId",
    })
  );
}
```

### 5. Test Admin Endpoints
**Status:** Not tested  
**Priority:** 🟡 MEDIUM

After creating an admin user, test:

```bash
# Get all users (should work with admin token)
curl -X GET http://localhost:4200/auth/getUsers \
  -H "Authorization: Bearer <admin_access_token>"

# Should return list of all users

# Try without token (should fail)
curl -X GET http://localhost:4200/auth/getUsers

# Should return 401 Unauthorized

# Try with regular user token (should fail)
curl -X GET http://localhost:4200/auth/getUsers \
  -H "Authorization: Bearer <regular_user_token>"

# Should return 401 "Admin access required"
```

---

## 🟢 Optional - Future Improvements

### 6. Implement Password Reset
**Status:** Not implemented  
**Priority:** 🟢 LOW

Features needed:
- Generate password reset tokens
- Send reset link via email
- Verify token and reset password

### 7. Implement Email Verification
**Status:** Field exists but not enforced  
**Priority:** 🟢 LOW

Features needed:
- Send verification email on registration
- Create email verification endpoint
- Optionally restrict features until verified

### 8. Add Audit Logging
**Status:** Not implemented  
**Priority:** 🟢 LOW

Log these events:
- Login attempts (success/failure)
- Password changes
- Admin actions
- Failed authentication attempts

---

## 📝 Testing Checklist

### Before Production Deployment

- [ ] Rate limiting installed and working
- [ ] At least one admin user created
- [ ] Admin endpoints reject non-admin users
- [ ] Admin endpoints work for admin users
- [ ] Redis session store configured for production
- [ ] All environment variables set in production
- [ ] CORS configured for production domain
- [ ] HTTPS enabled
- [ ] JWT secrets changed from defaults
- [ ] Session secret changed from default

### Test Scenarios

#### Admin Access
- [ ] Regular user cannot access `/auth/getUsers`
- [ ] Regular user cannot access `/auth/user/goldMember/:id`
- [ ] Admin user can access `/auth/getUsers`
- [ ] Admin user can upgrade users to gold member
- [ ] Unauthenticated requests rejected

#### Rate Limiting
- [ ] 6th login attempt within 15 minutes is rejected
- [ ] Rate limit resets after 15 minutes
- [ ] Rate limit error message is clear

#### Phone Validation
- [ ] Phone with 10 digits is accepted
- [ ] Phone with 15 digits is accepted
- [ ] Phone with 9 digits is rejected
- [ ] Phone with 16 digits is rejected
- [ ] Phone with letters is rejected (cleaned and validated)

#### User Registration
- [ ] New users get `role: "user"` by default
- [ ] Role cannot be set during registration
- [ ] All other registration flows still work

---

## 🚀 Quick Start Commands

```bash
# 1. Install rate limiting (CRITICAL)
cd "c:\Users\Sarthak S Kumar\Downloads\Biriyani-Darbar-Server"
pnpm add express-rate-limit

# 2. Create admin user script directory
mkdir scripts

# 3. Add rate limiter to app.js (see section 1 above)

# 4. Create admin user (see section 2 above)

# 5. Test the server
pnpm dev

# 6. Test admin endpoints (see section 5 above)
```

---

## 📚 Documentation References

1. **For Frontend Developers:**
   - Read: `docs/AUTH_API_DOCUMENTATION.md`
   - Complete API reference with examples
   - React integration code included

2. **For Backend Developers:**
   - Read: `docs/AUTH_ANALYSIS.md`
   - Technical analysis and recommendations
   - Security considerations

3. **For DevOps:**
   - This file contains deployment requirements
   - Environment variables needed
   - Production configuration notes

---

## 🔒 Security Notes

### What's Secured
- ✅ Password hashing (bcrypt with 12 rounds)
- ✅ JWT token validation
- ✅ Admin route protection
- ✅ Phone number validation
- ✅ CORS configuration
- ✅ HTTPS-only cookies in production

### What Needs Securing
- ❌ Rate limiting (install package)
- ❌ Redis session store (for production)
- ⚠️ Change JWT secrets in production
- ⚠️ Change session secret in production

---

## 📞 Support

If you encounter issues:

1. Check the logs in terminal
2. Verify environment variables are set
3. Ensure Firebase is configured correctly
4. Check that admin user was created successfully
5. Test with Postman or curl before testing in frontend

---

**Created:** October 8, 2025  
**Status:** ⚠️ Action Required  
**Next Steps:** Install rate limiting, create admin user
