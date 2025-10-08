# Production-Ready Backend Configuration Guide

## 🎯 Overview

This document describes all the production-level configurations and improvements implemented in the backend codebase.

---

## 1. ✅ CORS Configuration

### Location: `config/index.js`

**Features:**

- Dynamic origin validation
- Support for multiple origins (comma-separated in `.env`)
- Credentials support
- Comprehensive HTTP methods
- Custom headers configuration
- 24-hour max age for preflight requests

**Environment Variables:**

```bash
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,https://yourapp.com
CORS_CREDENTIALS=true
```

**Usage in app.js:**

```javascript
const { corsOptions } = require("./config");
app.use(cors(corsOptions));
```

---

## 2. ✅ Axios Interceptors

### Location: `lib/axios.lib.js`

**Features:**

- Automatic request/response logging
- Request duration tracking
- Enhanced error normalization
- Network error detection
- 30-second timeout
- Automatic metadata attachment

**Usage:**

```javascript
const axios = require("../lib/axios.lib");

// Use it like normal axios
const response = await axios.get("https://api.example.com/data");
const result = await axios.post("https://api.example.com/users", userData);
```

**Error Handling:**

```javascript
try {
  const response = await axios.get("https://api.example.com/data");
} catch (error) {
  // error.status - HTTP status code
  // error.data - Response data
  // error.isAxiosError - true if axios error
  // error.isNetworkError - true if network issue
}
```

---

## 3. ✅ Environment Variables (dotenv)

### Configuration: Root level in all files

All configuration files and app.js start with:

```javascript
require("dotenv").config();
```

### Environment Variables:

#### Server

- `PORT` - Server port (default: 4200)
- `NODE_ENV` - Environment (development/production)

#### CORS

- `CORS_ORIGIN` - Allowed origins (comma-separated)
- `CORS_CREDENTIALS` - Enable credentials (true/false)

#### JWT

- `JWT_SECRET` - Access token secret key
- `JWT_EXPIRES_IN` - Access token expiration (e.g., 7d)
- `JWT_REFRESH_SECRET` - Refresh token secret key
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (e.g., 30d)

#### Firebase

- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_STORAGE_BUCKET` - Storage bucket name
- `FIREBASE_SERVICE_ACCOUNT_PATH` - Path to service account JSON

#### Payment & Services

- `STRIPE_SECRET_KEY` - Stripe API key
- `PUSHY_API_KEY` - Pushy notification key

#### Session

- `SESSION_SECRET` - Express session secret

---

## 4. ✅ Authentication with bcryptjs & JWT

### Password Hashing (`bcryptjs`)

**Location:** `controllers/auth.controller.js`

```javascript
// Hash password on registration
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Verify password on login
const isValid = await bcrypt.compare(password, hashedPassword);
```

### JWT Token Management

**Location:** `utils/jwt.util.js`

**Features:**

- Access tokens (short-lived)
- Refresh tokens (long-lived)
- Token verification
- Automatic expiration handling
- Bearer token extraction

**Generate Tokens:**

```javascript
const { generateTokens } = require("../utils/jwt.util");

const tokens = generateTokens(userId, email);
// Returns: { accessToken, refreshToken, expiresIn }
```

**Verify Tokens:**

```javascript
const { verifyAccessToken } = require("../utils/jwt.util");

const decoded = verifyAccessToken(token);
// Returns: { userId, email, type: "access" }
```

### Authentication Middleware

**Location:** `middlewares/auth.middleware.js`

**Three types:**

1. **JWT Authentication** (required)

```javascript
router.post("/userImg", authenticateJWT, controller.uploadUserImage);
```

2. **Firebase Authentication** (for Firebase ID tokens)

```javascript
router.post("/orders", authenticateFirebase, controller.createOrder);
```

3. **Optional Authentication** (user context if available)

```javascript
router.post("/logout", optionalAuthenticate, controller.logout);
```

### Robust Authentication Flow

#### Registration (`POST /api/register`)

```javascript
{
  "userName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",  // Min 8 chars, uppercase, lowercase, number
  "phoneNumber": "+1234567890"
}
```

**Response:**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Registration successful",
  "data": {
    "user": {
      "userId": "uid123",
      "userName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": "7d"
    }
  }
}
```

#### Login (`POST /api/login`)

**With Email/Password:**

```javascript
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**With Firebase ID Token:**

```javascript
{
  "idToken": "firebase_id_token_here"
}
```

**Response:** Same as registration

#### Change Password (`POST /api/change-password`)

```javascript
{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass123"
}
```

**Headers:**

```
Authorization: Bearer <access_token>
```

#### Refresh Token (`POST /api/refresh-token`)

```javascript
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "new_access_token",
    "expiresIn": "7d"
  }
}
```

---

## 5. ✅ Morgan Logging

### Location: `middlewares/index.js`

**Two Loggers:**

1. **File Logger** (Always active)

   - Logs to `combined.log`
   - Combined format
   - Persistent logging

2. **Console Logger** (Development only)
   - Colorful dev format
   - Active when `NODE_ENV=development`

**Usage in app.js:**

```javascript
// Console logging (development)
if (process.env.NODE_ENV === "development") {
  app.use(consoleLogger);
}

// File logging (always)
app.use(loggerMiddleware);
```

---

## 6. ✅ Robust Error Handling

### Custom Error Classes

**Location:** `utils/errors.util.js`

**Error Types:**

- `AppError` - Base error class
- `ValidationError` - Invalid input (400)
- `AuthenticationError` - Auth failed (401)
- `AuthorizationError` - Insufficient permissions (403)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource exists (409)
- `PaymentError` - Payment issues (402)
- `DatabaseError` - DB operations (500)
- `ExternalServiceError` - Third-party failures (502)
- `RateLimitError` - Too many requests (429)

**Usage:**

```javascript
const { ValidationError, NotFoundError } = require("../utils/errors.util");

// Throw errors
if (!email) {
  throw new ValidationError("Email is required");
}

if (!userDoc.exists) {
  throw new NotFoundError("User");
}
```

### Error Response Format

**Structure:**

```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Email is required",
  "timestamp": "2025-10-08T00:00:00.000Z",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

### Global Error Handler

**Location:** `middlewares/error.middleware.js`

**Features:**

- Automatic error type detection
- Firebase error handling
- Stripe error handling
- JSON parse error handling
- MongoDB error handling
- Production/development modes
- Stack trace in development only

**Usage in app.js:**

```javascript
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");

// 404 handler (after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);
```

### Async Handler Wrapper

**Location:** `utils/response.util.js`

**Eliminates try-catch blocks:**

```javascript
const { asyncHandler } = require("../utils/response.util");

// Old way (manual try-catch)
const getUser = async (req, res) => {
  try {
    const user = await db.collection("users").doc(req.params.id).get();
    res.json(user.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// New way (automatic error handling)
const getUser = asyncHandler(async (req, res) => {
  const user = await db.collection("users").doc(req.params.id).get();

  if (!user.exists) {
    throw new NotFoundError("User");
  }

  successResponse(res, 200, user.data());
});
```

### Success Response Format

**Structure:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {
    "userId": "123",
    "userName": "John Doe"
  }
}
```

**Usage:**

```javascript
const { successResponse } = require("../utils/response.util");

successResponse(res, 200, data, "Optional message");
```

### Validation Utilities

**Location:** `utils/validation.util.js`

**Available Validators:**

- `validateEmail(email)` - Email format
- `validatePassword(password)` - Password strength
- `validatePhoneNumber(phone)` - Phone format
- `validateRequired(fields, data)` - Required fields
- `validateLength(value, min, max, fieldName)` - String length
- `validateRange(value, min, max, fieldName)` - Number range
- `validateArray(value, minLength, fieldName)` - Array validation
- `validateId(id, fieldName)` - ID validation
- `sanitizeString(str)` - Remove XSS
- `sanitizeObject(obj)` - Sanitize all fields

**Usage:**

```javascript
const { validateEmail, validateRequired } = require("../utils/validation.util");

// Validate single field
validateEmail(email); // Throws ValidationError if invalid

// Validate multiple required fields
validateRequired(["email", "password", "userName"], req.body);

// Sanitize input
const clean = sanitizeString(userInput);
```

---

## 7. ✅ Enhanced Payment Controller

**Location:** `controllers/payment.controller.js`

**Features:**

- Input validation
- Stripe error handling
- User metadata tracking
- Payment confirmation
- Payment details retrieval

**Endpoints:**

1. **Create Payment Intent** (`POST /api/create-payment-intent`)

```javascript
{
  "amount": 5000,  // In cents
  "currency": "usd"
}
```

2. **Confirm Payment** (`POST /api/confirm-payment`)

```javascript
{
  "paymentIntentId": "pi_xxx"
}
```

3. **Get Payment Details** (`GET /api/payment/:paymentIntentId`)

---

## 8. ✅ App.js Improvements

**Features:**

- Proxy trust for correct client IP
- Increased body size limit (10mb)
- CORS with options from config
- Console logger in development
- File logger always active
- Secure session cookies in production
- HTTP-only session cookies
- SameSite strict cookies
- Health check endpoint
- 404 handler
- Global error handler
- Graceful shutdown handling
- Environment logging

**Health Check:**

```
GET /health

Response:
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2025-10-08T00:00:00.000Z",
  "environment": "development"
}
```

---

## 9. Installation & Setup

### Install Dependencies

```bash
cd backend
pnpm install bcryptjs jsonwebtoken axios
```

### Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### Required .env Values

```bash
# Must change these in production
JWT_SECRET=your_strong_random_secret_key_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_key_here
SESSION_SECRET=your_session_secret_here

# Configure based on your setup
CORS_ORIGIN=http://localhost:3000
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
STRIPE_SECRET_KEY=sk_live_xxxxx
PUSHY_API_KEY=your_pushy_key
```

### Run Server

```bash
pnpm dev      # Development
pnpm start    # Production
```

---

## 10. Security Best Practices Implemented

✅ **Password Security**

- bcryptjs with 12 salt rounds
- Password strength validation
- Secure password storage in Firestore

✅ **Token Security**

- Separate access and refresh tokens
- Short-lived access tokens (7 days default)
- Long-lived refresh tokens (30 days default)
- JWT secret keys from environment

✅ **Session Security**

- HTTP-only cookies
- Secure cookies in production (HTTPS)
- SameSite strict
- Custom session name

✅ **CORS Security**

- Origin validation
- Credentials handling
- Limited HTTP methods
- Exposed headers control

✅ **Input Validation**

- Comprehensive validation utilities
- XSS prevention
- SQL injection prevention (via Firestore)
- Type checking

✅ **Error Handling**

- No stack traces in production
- Sanitized error messages
- Proper status codes
- Error categorization

✅ **Logging**

- Request logging
- Error logging
- User action tracking
- Performance monitoring

---

## 11. Migration Guide for Existing Controllers

**Pattern to follow:**

### Old Controller

```javascript
const controller = async (req, res) => {
  try {
    const data = await doSomething();
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### New Controller

```javascript
const { asyncHandler } = require("../utils/response.util");
const { successResponse } = require("../utils/response.util");
const { ValidationError, NotFoundError } = require("../utils/errors.util");

const controller = asyncHandler(async (req, res) => {
  // Validate inputs
  if (!req.body.requiredField) {
    throw new ValidationError("Required field is missing");
  }

  // Do work
  const data = await doSomething();

  // Check results
  if (!data) {
    throw new NotFoundError("Resource");
  }

  // Send success response
  successResponse(res, 200, data, "Operation successful");
});
```

---

## 12. Testing Endpoints

### Test Authentication

```bash
# Register
curl -X POST http://localhost:4200/api/register \
  -H "Content-Type: application/json" \
  -d '{"userName":"John","email":"john@example.com","password":"SecurePass123","phoneNumber":"+1234567890"}'

# Login
curl -X POST http://localhost:4200/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123"}'

# Use token
curl -X GET http://localhost:4200/api/userReward \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🎉 Summary

All major production-ready features have been implemented:

1. ✅ CORS configured with environment variables
2. ✅ Axios interceptors for consistent API calls
3. ✅ dotenv configured across all files
4. ✅ bcryptjs for secure password hashing
5. ✅ JWT for stateless authentication
6. ✅ Morgan for comprehensive logging
7. ✅ Robust error handling with custom error classes
8. ✅ Proper HTTP status codes and error messages
9. ✅ Input validation utilities
10. ✅ Enhanced security features
11. ✅ Graceful shutdown handling
12. ✅ Health check endpoint

The backend is now production-ready with enterprise-level error handling, logging, and security!
