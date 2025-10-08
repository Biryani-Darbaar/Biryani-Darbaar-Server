# Biryani Darbar API - Authentication Documentation

**Version:** 2.0.0  
**Last Updated:** October 8, 2025  
**Base URL:** `http://localhost:4200` (Development)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication System](#authentication-system)
3. [Public Endpoints](#public-endpoints)
4. [Protected Endpoints](#protected-endpoints)
5. [Error Responses](#error-responses)
6. [Session & Token Management](#session--token-management)

---

## Overview

### What's Implemented

✅ **Registration** - Users can create accounts with email/password  
✅ **Login** - Email and password authentication  
✅ **JWT Tokens** - Access tokens (7 days) and refresh tokens (30 days)  
✅ **Session Management** - Server-side session tracking  
✅ **Password Security** - Bcrypt hashing with 12 salt rounds  
✅ **Token Refresh** - Automatic access token renewal  
✅ **Protected Routes** - Middleware for authenticated-only endpoints  
✅ **Admin Roles** - Role-based access control

### Authentication Flow

```
Register → Get Tokens → Store Tokens → Make Requests with Bearer Token
```

When access token expires → Use refresh token → Get new access token

---

## Authentication System

### How It Works

1. **User registers** or **logs in** → Receives `accessToken` and `refreshToken`
2. **Frontend stores tokens** (localStorage recommended)
3. **For protected endpoints** → Send `Authorization: Bearer <accessToken>` header
4. **When token expires** → Use refresh token to get new access token
5. **Logout** → Clear tokens from storage

### Token Lifetimes

| Token Type    | Expires In | Used For               |
| ------------- | ---------- | ---------------------- |
| Access Token  | 7 days     | API requests           |
| Refresh Token | 30 days    | Renewing access tokens |
| Session       | 24 hours   | Server-side tracking   |

---

## Public Endpoints

These endpoints **DO NOT** require authentication.

### 1. Register User

**`POST /auth/register`**

Creates a new user account.

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+919876543210",
  "address": "123 Main Street, City, State, 12345"
}
```

**Field Requirements:**

| Field       | Type   | Required | Validation                                      |
| ----------- | ------ | -------- | ----------------------------------------------- |
| firstName   | String | ✅       | Min 2 characters                                |
| lastName    | String | ✅       | Min 2 characters                                |
| email       | String | ✅       | Valid email format                              |
| password    | String | ✅       | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |
| phoneNumber | String | ✅       | 10-15 digits                                    |
| address     | String | ✅       | Min 10 characters                               |

**Password Rules:**

- At least 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)

✅ Valid: `SecurePass123`, `MyFood2024`, `BestBiryani99`  
❌ Invalid: `password`, `Pass123`, `PASSWORD123`

**Success Response (201):**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "userId": "firebase_uid_here",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+919876543210",
      "address": "123 Main Street, City, State, 12345",
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    },
    "sessionId": 1696789123456
  }
}
```

**Error Response (400 - Validation Failed):**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters with uppercase, lowercase, and number"
    }
  ]
}
```

**Error Response (409 - User Exists):**

```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

### 2. Login User

**`POST /auth/login`**

Authenticate user with email and password only.

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "userId": "firebase_uid_here",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+919876543210",
      "address": "123 Main Street, City, State, 12345",
      "emailVerified": false,
      "goldMember": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    },
    "sessionId": 1696789123456
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Refresh Access Token

**`POST /auth/refresh-token`**

Get a new access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Refresh token has expired"
}
```

---

### 4. Get User by ID

**`GET /auth/user/:id`**

Retrieve user information. **Public endpoint** - no authentication required.

**URL Parameters:**

- `id` - User ID

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "userId": "firebase_uid_here",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+919876543210",
    "address": "123 Main Street, City, State, 12345",
    "emailVerified": false,
    "goldMember": false,
    "rewards": 0,
    "createdAt": { "_seconds": 1696789123, "_nanoseconds": 456000000 },
    "updatedAt": { "_seconds": 1696789123, "_nanoseconds": 456000000 }
  }
}
```

---

## Protected Endpoints

These endpoints **REQUIRE** authentication. You must include the access token in the request header.

### Authorization Header Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Authentication Endpoints

#### 1. Logout User

**`POST /auth/logout`**  
**Auth:** Optional (works with or without token)

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

---

#### 2. Change Password

**`POST /auth/change-password`**  
**Auth:** Required (JWT)

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "currentPassword": "OldSecurePass123",
  "newPassword": "NewSecurePass456"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

---

#### 3. Update User

**`PUT /auth/user/:id`**  
**Auth:** Required (JWT)

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body (all fields optional):**

```json
{
  "firstName": "John",
  "lastName": "Updated",
  "phoneNumber": "+919876543211",
  "address": "New Address Here"
}
```

**Cannot Update:**

- ❌ email
- ❌ password (use `/change-password`)
- ❌ createdAt

**Success Response (200):**

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": null
}
```

---

#### 4. Upload User Image

**`POST /auth/userImg`**  
**Auth:** Required (JWT)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

```
image: [File]
```

**Supported File Types:** JPEG, PNG, WebP, GIF

**Success Response (201):**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "imageUrl": "https://storage.googleapis.com/bucket-name/users/user-id/filename.jpg"
  }
}
```

---

#### 5. Get User Reward

**`GET /auth/userReward`**  
**Auth:** Required (JWT)

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "userId": "firebase_uid_here",
    "rewards": 150
  }
}
```

---

#### 6. Get All Users (Admin Only)

**`GET /auth/getUsers`**  
**Auth:** Required (JWT) + Admin Role

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "userId": "user_id_1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phoneNumber": "+919876543210",
      "goldMember": false,
      "rewards": 100
    }
  ]
}
```

**Error Response (401 - Not Admin):**

```json
{
  "success": false,
  "message": "Admin access required"
}
```

---

#### 7. Update to Gold Member (Admin Only)

**`PUT /auth/user/goldMember/:id`**  
**Auth:** Required (JWT) + Admin Role

**Request Headers:**

```
Authorization: Bearer <access_token>
```

**URL Parameters:**

- `id` - User ID

**Success Response (200):**

```json
{
  "success": true,
  "message": "User updated to gold member successfully",
  "data": null
}
```

---

### Order Endpoints (All Require Authentication)

All order operations require the user to be logged in and send a valid access token.

#### Create Order

**`POST /orders`**  
**Auth:** Required (JWT)

#### Get All Orders

**`GET /orders`**  
**Auth:** Required (JWT)

#### Get Orders by User

**`GET /ordersByUser/:id`**  
**Auth:** Required (JWT)

#### Get Order by ID

**`GET /orders/:id`**  
**Auth:** Required (JWT)

#### Update Order Status

**`PATCH /orders/:id`**  
**Auth:** Required (JWT)

#### Update Order Status (Admin)

**`PATCH /ordersAdmin/:id`**  
**Auth:** Required (JWT)

#### Get Total Order Count

**`GET /orders/total-count`**  
**Auth:** Required (JWT)

#### Get Daily Summary

**`GET /daily-summary`**  
**Auth:** Required (JWT)

---

### Cart Endpoints (All Require Authentication)

All cart operations require authentication.

#### Add to Cart

**`POST /cart`**  
**Auth:** Required (JWT)

#### Get Cart

**`POST /getCart`**  
**Auth:** Required (JWT)

#### Update Cart Item

**`PUT /cart/:id`**  
**Auth:** Required (JWT)

#### Delete Cart Item

**`DELETE /cart/:id`**  
**Auth:** Required (JWT)

---

### Payment Endpoints (All Require Authentication)

All payment operations require authentication.

#### Create Payment Intent

**`POST /create-payment-intent`**  
**Auth:** Required (JWT)

#### Confirm Payment

**`POST /confirm-payment`**  
**Auth:** Required (JWT)

#### Get Payment Details

**`GET /payment/:paymentIntentId`**  
**Auth:** Required (JWT)

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "message": "Error message here",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error for this field"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning               | When It Occurs                             |
| ---- | --------------------- | ------------------------------------------ |
| 200  | OK                    | Request successful                         |
| 201  | Created               | Resource created (registration, upload)    |
| 400  | Bad Request           | Validation failed, invalid input           |
| 401  | Unauthorized          | Invalid credentials, expired/missing token |
| 404  | Not Found             | User or resource not found                 |
| 409  | Conflict              | User already exists                        |
| 500  | Internal Server Error | Server-side error                          |

### Common Error Messages

**Authentication Errors (401):**

```json
{ "success": false, "message": "No authentication token provided" }
{ "success": false, "message": "Access token has expired" }
{ "success": false, "message": "Invalid access token" }
{ "success": false, "message": "Admin access required" }
```

**Validation Errors (400):**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "firstName",
      "message": "First name must be at least 2 characters"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters with uppercase, lowercase, and number"
    }
  ]
}
```

---

## Session & Token Management

### Token Expiry Handling

**When Access Token Expires:**

1. Frontend receives 401 error with message "Access token has expired"
2. Use refresh token to get new access token
3. Retry the original request with new access token

**When Refresh Token Expires:**

1. Frontend receives 401 error with message "Refresh token has expired"
2. Clear all tokens from storage
3. Redirect user to login page

### Implementation Example (JavaScript)

```javascript
// Store tokens after login/register
localStorage.setItem("accessToken", data.tokens.accessToken);
localStorage.setItem("refreshToken", data.tokens.refreshToken);
localStorage.setItem("userId", data.user.userId);

// Make authenticated request
const makeRequest = async (url, options = {}) => {
  const accessToken = localStorage.getItem("accessToken");

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401) {
    // Token expired, try refresh
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry with new token
      return makeRequest(url, options);
    } else {
      // Refresh failed, logout
      handleLogout();
    }
  }

  return response.json();
};

// Refresh access token
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    const response = await fetch("http://localhost:4200/auth/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("accessToken", data.data.accessToken);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Logout
const handleLogout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
  window.location.href = "/login";
};
```

---

## Quick Reference

### Registration Flow

```
POST /auth/register
→ Receive tokens
→ Store tokens
→ User is logged in
```

### Login Flow

```
POST /auth/login
→ Receive tokens
→ Store tokens
→ User is logged in
```

### Protected Request Flow

```
GET /cart (or any protected endpoint)
→ Include: Authorization: Bearer <accessToken>
→ If 401: Refresh token
→ Retry request
```

### Logout Flow

```
POST /auth/logout
→ Clear tokens from storage
→ Redirect to login page
```

---

## Important Notes

### ✅ What's Ready to Use

- User registration with firstName, lastName, email, password, phone, address
- User login with email and password only
- JWT-based authentication with auto-refresh
- Protected routes for orders, cart, and payments
- Session management with 24-hour expiry
- Password security with bcrypt
- Admin role system

### ⚠️ What You Need to Do

1. **Store tokens securely** in localStorage or cookies
2. **Include Authorization header** in all protected endpoint requests
3. **Handle token expiry** by implementing refresh logic
4. **Clear tokens on logout** to prevent unauthorized access
5. **Validate user input** on frontend before sending to backend (better UX)

### 🔒 Security Best Practices

- Never expose tokens in URLs
- Always use HTTPS in production
- Implement token refresh logic
- Clear tokens on logout
- Handle 401 errors properly
- Don't store sensitive data in tokens

---

**End of Documentation**

For questions or issues, contact the backend team.

**Version:** 2.0.0  
**Last Updated:** October 8, 2025
