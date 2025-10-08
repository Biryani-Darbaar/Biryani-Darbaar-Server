# Authentication API Documentation
**Biryani Darbar Backend - Complete Authentication Guide**

> 📅 Last Updated: October 8, 2025  
> 🔒 Version: 2.0.0

---

## Table of Contents
1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Error Handling](#error-handling)
6. [Frontend Integration Guide](#frontend-integration-guide)
7. [Security Best Practices](#security-best-practices)

---

## Overview

### Authentication Methods
The backend supports **TWO authentication methods**:

1. **JWT-Based Authentication** (Recommended for most use cases)
   - Email/Password registration and login
   - Access tokens (7 days expiry)
   - Refresh tokens (30 days expiry)

2. **Firebase ID Token Authentication** (Optional)
   - For apps already using Firebase Auth on frontend
   - Supports social logins (Google, Facebook, etc.)

### Base URL
```
Development: http://localhost:4200
Production: [Your production URL]
```

### Required Environment Variables
Make sure these are set in your `.env` file:
```bash
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_change_in_production
JWT_REFRESH_EXPIRES_IN=30d
SESSION_SECRET=your_session_secret_change_in_production
```

---

## Authentication Flow

### 1. Registration Flow (JWT Method)
```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│   Firebase   │
│             │  POST   │              │  Create │   Auth +     │
│ Register    │ /register│  Validate   │  User   │  Firestore   │
│  Form       │         │   + Hash     │         │              │
└─────────────┘         └──────────────┘         └──────────────┘
       ▲                                                 │
       │                 ┌───────────────────────────────┘
       │                 │  Return: userId, tokens
       └─────────────────┘
```

### 2. Login Flow (JWT Method)
```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│  Firestore   │
│             │  POST   │              │  Query  │              │
│   Login     │ /login  │  Verify      │  User   │  Validate    │
│   Form      │         │  Password    │  Data   │  Password    │
└─────────────┘         └──────────────┘         └──────────────┘
       ▲                                                 │
       │                 ┌───────────────────────────────┘
       │                 │  Return: user data + tokens
       └─────────────────┘
```

### 3. Protected Route Access Flow
```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│   Resource   │
│             │  GET    │              │  Verify │              │
│   Request   │ /api/*  │  Middleware  │  Token  │   Access     │
│ + Bearer    │         │  Check JWT   │         │   Granted    │
│  Token      │         │              │         │              │
└─────────────┘         └──────────────┘         └──────────────┘
```

### 4. Token Refresh Flow
```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│   Return     │
│             │  POST   │              │  Verify │   New        │
│  Token      │ /refresh│  Refresh     │  Token  │   Access     │
│  Expired    │  -token │  Token       │         │   Token      │
└─────────────┘         └──────────────┘         └──────────────┘
```

---

## API Endpoints

### 1. User Registration

**Endpoint:** `POST /auth/register`  
**Authentication:** None (Public)  
**Purpose:** Create a new user account

#### Request Body
```json
{
  "userName": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+919876543210"
}
```

#### Field Requirements
| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| `userName` | String | ✅ Yes | Min 2 characters |
| `email` | String | ✅ Yes | Valid email format |
| `password` | String | ✅ Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |
| `phoneNumber` | String | ✅ Yes | Min 10 characters, auto-adds `+` if missing |

#### Password Requirements
- ✅ At least 8 characters long
- ✅ Contains at least 1 uppercase letter (A-Z)
- ✅ Contains at least 1 lowercase letter (a-z)
- ✅ Contains at least 1 number (0-9)

**Example Valid Passwords:** 
- `MyPass123`
- `SecurePass2024`
- `BestFood99`

**Example Invalid Passwords:**
- `password` (no uppercase, no number)
- `Pass123` (too short)
- `PASSWORD123` (no lowercase)

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "userId": "firebase_generated_uid_here",
      "userName": "John Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+919876543210",
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    }
  }
}
```

#### Error Responses
```json
// Validation Error (400)
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

// User Already Exists (409)
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

### 2. User Login

**Endpoint:** `POST /auth/login`  
**Authentication:** None (Public)  
**Purpose:** Authenticate user and receive tokens

#### Method 1: Email/Password Login (Recommended)

##### Request Body
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "userId": "firebase_generated_uid_here",
      "userName": "John Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+919876543210",
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

#### Method 2: Firebase ID Token Login (Optional)

##### Request Body
```json
{
  "idToken": "firebase_id_token_here"
}
```

##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "userId": "firebase_generated_uid_here",
      "userName": "John Doe",
      "email": "john.doe@example.com",
      "emailVerified": true,
      "phoneNumber": "+919876543210"
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

#### Error Responses
```json
// Invalid Credentials (401)
{
  "success": false,
  "message": "Invalid email or password"
}

// Validation Error (400)
{
  "success": false,
  "message": "Email and password, or ID token required"
}
```

---

### 3. Refresh Access Token

**Endpoint:** `POST /auth/refresh-token`  
**Authentication:** None (but requires valid refresh token)  
**Purpose:** Get a new access token when the current one expires

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response (200 OK)
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

#### Error Responses
```json
// Token Expired (401)
{
  "success": false,
  "message": "Refresh token has expired"
}

// Invalid Token (401)
{
  "success": false,
  "message": "Invalid refresh token"
}
```

---

### 4. User Logout

**Endpoint:** `POST /auth/logout`  
**Authentication:** Optional (will work with or without token)  
**Purpose:** Invalidate user session

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

---

### 5. Change Password

**Endpoint:** `POST /auth/change-password`  
**Authentication:** Required (JWT)  
**Purpose:** Allow authenticated users to change their password

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Request Body
```json
{
  "currentPassword": "OldSecurePass123",
  "newPassword": "NewSecurePass456"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

#### Error Responses
```json
// Wrong Current Password (401)
{
  "success": false,
  "message": "Current password is incorrect"
}

// Invalid New Password (400)
{
  "success": false,
  "message": "New password must be at least 8 characters with uppercase, lowercase, and number"
}
```

---

### 6. Get User by ID

**Endpoint:** `GET /auth/user/:id`  
**Authentication:** None (Public)  
**Purpose:** Retrieve user information by user ID

#### URL Parameters
- `id` - Firebase User UID

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "firebase_generated_uid_here",
    "userName": "John Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+919876543210",
    "emailVerified": false,
    "goldMember": false,
    "rewards": 0,
    "createdAt": {
      "_seconds": 1696789123,
      "_nanoseconds": 456000000
    },
    "updatedAt": {
      "_seconds": 1696789123,
      "_nanoseconds": 456000000
    }
  }
}
```

---

### 7. Update User

**Endpoint:** `PUT /auth/user/:id`  
**Authentication:** Required (JWT)  
**Purpose:** Update user profile information

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### URL Parameters
- `id` - Firebase User UID

#### Request Body (All fields optional)
```json
{
  "userName": "John Updated Doe",
  "phoneNumber": "+919876543211",
  "goldMember": false
}
```

#### Fields That CANNOT Be Updated
- ❌ `email` - Cannot be changed
- ❌ `hashedPassword` - Use `/change-password` endpoint
- ❌ `createdAt` - System field

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": null
}
```

---

### 8. Upload User Profile Image

**Endpoint:** `POST /auth/userImg`  
**Authentication:** Required (JWT)  
**Purpose:** Upload user profile picture

#### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)
```
image: [File]
```

#### Supported File Types
- ✅ JPEG (.jpg, .jpeg)
- ✅ PNG (.png)
- ✅ WebP (.webp)
- ✅ GIF (.gif)

#### Success Response (201 Created)
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

### 9. Get User Reward

**Endpoint:** `GET /auth/userReward`  
**Authentication:** Required (JWT)  
**Purpose:** Get current user's reward points

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "firebase_generated_uid_here",
    "rewards": 150
  }
}
```

---

### 10. Get All Users (Admin)

**Endpoint:** `GET /auth/getUsers`  
**Authentication:** None (Should be protected - see notes below)  
**Purpose:** Retrieve all users in the system

⚠️ **Security Warning:** This endpoint is currently public. Should be protected with admin middleware.

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "userId": "user_id_1",
      "userName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+919876543210",
      "goldMember": false,
      "rewards": 100
    },
    {
      "userId": "user_id_2",
      "userName": "Jane Smith",
      "email": "jane@example.com",
      "phoneNumber": "+919876543211",
      "goldMember": true,
      "rewards": 250
    }
  ]
}
```

---

### 11. Update to Gold Member

**Endpoint:** `PUT /auth/user/goldMember/:id`  
**Authentication:** None (Should be protected - see notes below)  
**Purpose:** Upgrade user to gold membership status

⚠️ **Security Warning:** This endpoint is currently public. Should be protected with admin middleware.

#### URL Parameters
- `id` - Firebase User UID

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "User updated to gold member successfully",
  "data": null
}
```

---

## Request/Response Examples

### Complete Registration + Login Flow

#### Step 1: Register New User
```javascript
// Frontend Code Example (JavaScript/Fetch)
const registerUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:4200/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userName: userData.name,
        email: userData.email,
        password: userData.password,
        phoneNumber: userData.phone
      })
    });

    const data = await response.json();

    if (data.success) {
      // Store tokens securely
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      localStorage.setItem('userId', data.data.user.userId);
      
      return data.data.user;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

// Usage
const newUser = await registerUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'SecurePass123',
  phone: '+919876543210'
});
```

#### Step 2: Login Existing User
```javascript
// Frontend Code Example (JavaScript/Fetch)
const loginUser = async (email, password) => {
  try {
    const response = await fetch('http://localhost:4200/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      // Store tokens and user data
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      localStorage.setItem('userId', data.data.user.userId);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Usage
const userData = await loginUser('john@example.com', 'SecurePass123');
```

#### Step 3: Make Authenticated Request
```javascript
// Frontend Code Example (JavaScript/Fetch)
const makeAuthenticatedRequest = async (endpoint) => {
  const accessToken = localStorage.getItem('accessToken');
  
  try {
    const response = await fetch(`http://localhost:4200${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (response.status === 401) {
      // Token expired, try to refresh
      await refreshAccessToken();
      // Retry the request
      return makeAuthenticatedRequest(endpoint);
    }

    return data;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};

// Usage
const userRewards = await makeAuthenticatedRequest('/auth/userReward');
```

#### Step 4: Refresh Token When Expired
```javascript
// Frontend Code Example (JavaScript/Fetch)
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  try {
    const response = await fetch('http://localhost:4200/auth/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();

    if (data.success) {
      // Update access token
      localStorage.setItem('accessToken', data.data.accessToken);
      return data.data.accessToken;
    } else {
      // Refresh token also expired, redirect to login
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Session expired, please login again');
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
};
```

#### Step 5: Logout User
```javascript
// Frontend Code Example (JavaScript/Fetch)
const logoutUser = async () => {
  const accessToken = localStorage.getItem('accessToken');
  
  try {
    await fetch('http://localhost:4200/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    // Clear all stored data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    
    // Redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
    // Clear local data anyway
    localStorage.clear();
  }
};

// Usage
await logoutUser();
```

---

## Error Handling

### Standard Error Response Format
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
| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully (registration, upload) |
| 400 | Bad Request | Validation failed, invalid input |
| 401 | Unauthorized | Invalid credentials, expired token, missing auth |
| 404 | Not Found | User or resource not found |
| 409 | Conflict | User already exists, duplicate entry |
| 500 | Internal Server Error | Server-side error |

### Common Error Messages

#### Authentication Errors (401)
```json
{
  "success": false,
  "message": "No authentication token provided"
}

{
  "success": false,
  "message": "Access token has expired"
}

{
  "success": false,
  "message": "Invalid access token"
}

{
  "success": false,
  "message": "Invalid email or password"
}
```

#### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "userName",
      "message": "Name must be at least 2 characters"
    },
    {
      "field": "email",
      "message": "Valid email is required"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters with uppercase, lowercase, and number"
    }
  ]
}
```

#### Not Found Errors (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

#### Conflict Errors (409)
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

## Frontend Integration Guide

### React/Next.js Example

#### 1. Create Auth Context
```javascript
// contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    
    if (storedUser && accessToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const register = async (userData) => {
    const response = await fetch('http://localhost:4200/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setUser(data.data.user);
    }
    
    return data;
  };

  const login = async (email, password) => {
    const response = await fetch('http://localhost:4200/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setUser(data.data.user);
    }
    
    return data;
  };

  const logout = async () => {
    const accessToken = localStorage.getItem('accessToken');
    
    await fetch('http://localhost:4200/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### 2. Create API Client with Auto Token Refresh
```javascript
// utils/apiClient.js
const API_BASE_URL = 'http://localhost:4200';

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    return data.data.accessToken;
  } else {
    // Refresh failed, logout user
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
};

export const apiClient = async (endpoint, options = {}) => {
  const accessToken = localStorage.getItem('accessToken');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
  }
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    }
  };
  
  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  // If unauthorized, try to refresh token
  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      
      // Retry request with new token
      config.headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch (error) {
      throw error;
    }
  }
  
  return response.json();
};
```

#### 3. Create Login Component
```javascript
// components/LoginForm.js
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Redirect to dashboard or home
        window.location.href = '/dashboard';
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

#### 4. Create Register Component
```javascript
// components/RegisterForm.js
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const RegisterForm = () => {
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    phoneNumber: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Client-side validation
    const newErrors = {};
    
    if (formData.userName.length < 2) {
      newErrors.userName = 'Name must be at least 2 characters';
    }
    
    if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }
    
    if (formData.phoneNumber.length < 10) {
      newErrors.phoneNumber = 'Phone number must be at least 10 digits';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);

    try {
      const result = await register(formData);
      
      if (result.success) {
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        if (result.errors) {
          const errorObj = {};
          result.errors.forEach(err => {
            errorObj[err.field] = err.message;
          });
          setErrors(errorObj);
        } else {
          setErrors({ general: result.message });
        }
      }
    } catch (err) {
      setErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name:</label>
        <input
          type="text"
          name="userName"
          value={formData.userName}
          onChange={handleChange}
          required
        />
        {errors.userName && <span className="error">{errors.userName}</span>}
      </div>
      
      <div>
        <label>Email:</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>
      
      <div>
        <label>Password:</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        {errors.password && <span className="error">{errors.password}</span>}
        <small>Min 8 chars, 1 uppercase, 1 lowercase, 1 number</small>
      </div>
      
      <div>
        <label>Phone Number:</label>
        <input
          type="tel"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="+919876543210"
          required
        />
        {errors.phoneNumber && <span className="error">{errors.phoneNumber}</span>}
      </div>
      
      {errors.general && <div className="error">{errors.general}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Register'}
      </button>
    </form>
  );
};
```

#### 5. Protected Route Component
```javascript
// components/ProtectedRoute.js
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
```

---

## Security Best Practices

### For Frontend Developers

#### 1. Token Storage
```javascript
// ✅ GOOD: Store in localStorage (acceptable for most cases)
localStorage.setItem('accessToken', token);

// ✅ BETTER: Store in httpOnly cookies (requires backend changes)
// This prevents XSS attacks from accessing tokens

// ❌ BAD: Store in global variables or state only
window.accessToken = token; // Can be accessed by any script
```

#### 2. Token Transmission
```javascript
// ✅ ALWAYS use Bearer token format
headers: {
  'Authorization': `Bearer ${accessToken}`
}

// ❌ NEVER send tokens in URL
// Bad: /api/user?token=xyz123
```

#### 3. Password Validation
```javascript
// ✅ Client-side validation (for UX)
const validatePassword = (password) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
};

// Note: Server also validates, client validation is for better UX
```

#### 4. Error Handling
```javascript
// ✅ Handle different error types appropriately
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (response.status === 401) {
    // Unauthorized - redirect to login
    handleLogout();
  } else if (response.status === 400) {
    // Validation error - show to user
    displayErrors(data.errors);
  } else if (response.status === 500) {
    // Server error - generic message
    showError('Something went wrong. Please try again later.');
  }
} catch (error) {
  // Network error
  showError('Network error. Please check your connection.');
}
```

#### 5. Auto Logout on Token Expiry
```javascript
// ✅ Implement automatic logout when refresh token expires
const setupAutoLogout = () => {
  // Check token validity periodically
  setInterval(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      handleLogout();
      return;
    }
    
    try {
      await refreshAccessToken();
    } catch (error) {
      // Refresh failed, logout user
      handleLogout();
    }
  }, 60000); // Check every minute
};
```

### For Backend (Current Implementation)

#### ✅ What's Already Implemented
- ✅ Password hashing with bcrypt (12 salt rounds)
- ✅ JWT token generation and verification
- ✅ Token expiry (7 days for access, 30 days for refresh)
- ✅ Email format validation
- ✅ Password strength validation
- ✅ CORS configuration
- ✅ HTTPS-only cookies in production
- ✅ Input sanitization

#### ⚠️ What Needs Improvement
1. **Session Store**: Currently using memory store (won't work in production with multiple instances)
   - **Recommended**: Use Redis or MongoDB session store

2. **Rate Limiting**: No rate limiting on auth endpoints
   - **Recommended**: Add express-rate-limit middleware

3. **Admin Protection**: Some endpoints should be admin-only
   - `/auth/getUsers` - Should require admin role
   - `/auth/user/goldMember/:id` - Should require admin role

4. **Email Verification**: System tracks `emailVerified` but doesn't enforce it
   - **Recommended**: Send verification emails on registration

5. **Password Reset**: No forgot password functionality
   - **Recommended**: Implement password reset via email

---

## Missing Features to Add

### 1. Email Verification System
**Status:** 🟡 Tracked but not enforced  
**Priority:** High

**What's Needed:**
- Send verification email on registration
- Create email verification endpoint
- Restrict certain actions until email verified

### 2. Forgot Password / Password Reset
**Status:** ❌ Not implemented  
**Priority:** High

**What's Needed:**
- Generate password reset tokens
- Send reset link via email
- Create password reset endpoint

### 3. Admin Role System
**Status:** ❌ Not implemented  
**Priority:** Medium

**What's Needed:**
- Add role field to user model
- Create admin middleware
- Protect admin-only endpoints

### 4. Rate Limiting
**Status:** ❌ Not implemented  
**Priority:** High (Security)

**What's Needed:**
- Install `express-rate-limit`
- Apply to auth endpoints
- Configure appropriate limits

### 5. Account Deletion
**Status:** ❌ Not implemented  
**Priority:** Low

**What's Needed:**
- Delete user endpoint
- Cascade delete user data
- GDPR compliance

---

## Quick Reference

### Token Lifetimes
| Token Type | Lifetime | Purpose |
|------------|----------|---------|
| Access Token | 7 days | API requests |
| Refresh Token | 30 days | Get new access token |
| Session | 24 hours | Server-side session |

### Authentication Headers
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### User Object Structure
```javascript
{
  userId: "firebase_uid",
  userName: "John Doe",
  email: "john@example.com",
  phoneNumber: "+919876543210",
  emailVerified: false,
  goldMember: false,
  rewards: 0,
  imageUrl: "https://...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Token Response Structure
```javascript
{
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  expiresIn: "7d"
}
```

---

## Support & Contact

For backend issues or questions:
- Check error responses for detailed messages
- Verify environment variables are set correctly
- Ensure tokens are sent in correct format
- Check CORS configuration for cross-origin requests

---

**Document Version:** 1.0  
**Last Updated:** October 8, 2025  
**Maintained By:** Backend Team
