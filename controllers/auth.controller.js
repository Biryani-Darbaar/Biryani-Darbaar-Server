const { admin, db } = require("../config/firebase.config");
const axios = require("axios");
const { COLLECTION_NAMES } = require("../constants");
const { setUserId, storage, getUserId } = require("../utils/session.util");
const { uploadFile } = require("../utils/storage.util");
const { successResponse, asyncHandler } = require("../utils/response.util");
const {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
} = require("../utils/errors.util");
const {
  generateTokens,
  verifyRefreshToken,
  generateAccessToken,
} = require("../utils/jwt.util");

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Validate phone number format
 */
const isValidPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Check if it's a valid length (10-15 digits)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }

  return true;
};

/**
 * Register a new user with email and password
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phoneNumber, address } =
    req.body;

  // Validation
  const errors = [];
  if (!firstName || firstName.trim().length < 2) {
    errors.push({
      field: "firstName",
      message: "First name must be at least 2 characters",
    });
  }
  if (!lastName || lastName.trim().length < 2) {
    errors.push({
      field: "lastName",
      message: "Last name must be at least 2 characters",
    });
  }
  if (!email || !isValidEmail(email)) {
    errors.push({ field: "email", message: "Valid email is required" });
  }
  if (!password || !isValidPassword(password)) {
    errors.push({
      field: "password",
      message:
        "Password must be at least 8 characters with uppercase, lowercase, and number",
    });
  }
  if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
    errors.push({
      field: "phoneNumber",
      message: "Valid phone number is required (10-15 digits)",
    });
  }
  if (!address || address.trim().length < 10) {
    errors.push({
      field: "address",
      message: "Valid address is required (minimum 10 characters)",
    });
  }

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  // Create user in Firebase Auth (this will throw error if email already exists)
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  let userRecord;

  try {
    userRecord = await admin.auth().createUser({
      email: email.toLowerCase(),
      password,
      displayName: fullName,
      phoneNumber: phoneNumber.startsWith("+")
        ? phoneNumber
        : `+${phoneNumber}`,
    });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new ConflictError("User with this email already exists");
    }
    throw error;
  }

  // Store additional user data in Firestore (no password here!)
  const usersRef = db.collection(COLLECTION_NAMES.USERS);
  await usersRef.doc(userRecord.uid).set({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    fullName,
    email: email.toLowerCase(),
    phoneNumber,
    address: address.trim(),
    role: "user", // Default role for new users
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    emailVerified: false,
    goldMember: false,
    rewards: 0,
  });

  // Generate tokens
  const tokens = generateTokens(userRecord.uid, email);

  // Set session
  req.session.userId = userRecord.uid;
  req.session.loginTimestamp = Date.now();
  setUserId(userRecord.uid);

  successResponse(
    res,
    201,
    {
      user: {
        userId: userRecord.uid,
        firstName,
        lastName,
        fullName,
        email: email.toLowerCase(),
        phoneNumber,
        address,
        emailVerified: false,
      },
      tokens,
      sessionId: req.session.loginTimestamp,
    },
    "Registration successful"
  );
});

/**
 * Login with email and password
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }

  if (!isValidEmail(email)) {
    throw new ValidationError("Invalid email format");
  }

  // Verify credentials using Firebase Admin SDK
  // First, get the user by email to get the uid
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email.toLowerCase());
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new AuthenticationError("Invalid email or password");
    }
    throw error;
  }

  // Create a custom token for verification (Admin SDK doesn't have direct password verification)
  // So we need to use Firebase Client SDK approach via REST API
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

  if (!FIREBASE_API_KEY) {
    console.error("FIREBASE_API_KEY not set in environment variables");
    throw new Error("Authentication configuration error");
  }

  // Verify password using Firebase Auth REST API
  const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

  let authResponse;
  try {
    const axios = require("axios");
    authResponse = await axios.post(verifyUrl, {
      email: email.toLowerCase(),
      password,
      returnSecureToken: true,
    });
  } catch (error) {
    if (error.response && error.response.data) {
      const errorCode = error.response.data.error.message;
      if (
        errorCode === "INVALID_PASSWORD" ||
        errorCode === "EMAIL_NOT_FOUND" ||
        errorCode === "INVALID_LOGIN_CREDENTIALS"
      ) {
        throw new AuthenticationError("Invalid email or password");
      }
    }
    throw new AuthenticationError("Invalid email or password");
  }

  const userId = userRecord.uid;

  // Get user data from Firestore
  const usersRef = db.collection(COLLECTION_NAMES.USERS);
  const userDoc = await usersRef.doc(userId).get();

  let userData;
  if (userDoc.exists) {
    userData = userDoc.data();

    // Update last login
    await usersRef.doc(userId).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // If user doesn't exist in Firestore, create a basic profile
    userData = {
      email: userRecord.email,
      displayName: userRecord.displayName,
      phoneNumber: userRecord.phoneNumber,
      emailVerified: userRecord.emailVerified,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: "user",
      goldMember: false,
      rewards: 0,
    };

    await usersRef.doc(userId).set(userData);
  }

  // Set session
  req.session.userId = userId;
  req.session.loginTimestamp = Date.now();
  setUserId(userId);

  // Generate tokens
  const tokens = generateTokens(userId, email);

  successResponse(
    res,
    200,
    {
      user: {
        userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName || userRecord.displayName,
        email: userRecord.email,
        phoneNumber: userData.phoneNumber || userRecord.phoneNumber,
        address: userData.address,
        emailVerified:
          userData.emailVerified || userRecord.emailVerified || false,
        goldMember: userData.goldMember || false,
      },
      tokens,
      sessionId: req.session.loginTimestamp,
    },
    "Login successful"
  );
});

/**
 * Logout user
 */
const logout = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || getUserId(req);

  if (userId) {
    // Update logout timestamp
    try {
      await db.collection(COLLECTION_NAMES.USERS).doc(userId).update({
        lastLogout: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      // Continue even if update fails
    }
  }

  req.session.destroy((err) => {
    if (err) {
      throw new Error("Failed to destroy session");
    }
    storage.removeItem("userId");
    successResponse(res, 200, null, "Logout successful");
  });
});

/**
 * Refresh access token using refresh token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError("Refresh token is required");
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Get user to verify still exists
  const userDoc = await db
    .collection(COLLECTION_NAMES.USERS)
    .doc(decoded.userId)
    .get();

  if (!userDoc.exists) {
    throw new NotFoundError("User");
  }

  const userData = userDoc.data();

  // Generate new access token
  const accessToken = generateAccessToken(decoded.userId, userData.email);

  successResponse(
    res,
    200,
    {
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
    "Token refreshed successfully"
  );
});

/**
 * Change password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.userId || getUserId(req);

  if (!userId) {
    throw new AuthenticationError("User not authenticated");
  }

  if (!currentPassword || !newPassword) {
    throw new ValidationError("Current and new passwords are required");
  }

  if (!isValidPassword(newPassword)) {
    throw new ValidationError(
      "New password must be at least 8 characters with uppercase, lowercase, and number"
    );
  }

  // Get user from Firebase Auth
  const userRecord = await admin.auth().getUser(userId);

  // Verify current password using Firebase Auth REST API
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

  if (!FIREBASE_API_KEY) {
    console.error("FIREBASE_API_KEY not set in environment variables");
    throw new Error("Authentication configuration error");
  }

  const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

  try {
    const axios = require("axios");
    await axios.post(verifyUrl, {
      email: userRecord.email,
      password: currentPassword,
      returnSecureToken: true,
    });
  } catch (error) {
    if (error.response && error.response.data) {
      const errorCode = error.response.data.error.message;
      if (
        errorCode === "INVALID_PASSWORD" ||
        errorCode === "INVALID_LOGIN_CREDENTIALS"
      ) {
        throw new AuthenticationError("Current password is incorrect");
      }
    }
    throw new AuthenticationError("Current password is incorrect");
  }

  // Update password in Firebase Auth
  await admin.auth().updateUser(userId, { password: newPassword });

  // Update timestamp in Firestore
  await db.collection(COLLECTION_NAMES.USERS).doc(userId).update({
    passwordChangedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  successResponse(res, 200, null, "Password changed successfully");
});

/**
 * Get user by ID
 */
const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const userDoc = await db.collection(COLLECTION_NAMES.USERS).doc(userId).get();

  if (!userDoc.exists) {
    throw new NotFoundError("User");
  }

  const userData = userDoc.data();
  // No need to delete hashedPassword since we're not storing it anymore

  successResponse(res, 200, { userId: userDoc.id, ...userData });
});

/**
 * Update user
 */
const updateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const updatedUserData = req.body;

  // Remove sensitive fields that shouldn't be updated directly
  delete updatedUserData.email;
  delete updatedUserData.createdAt;

  updatedUserData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await db
    .collection(COLLECTION_NAMES.USERS)
    .doc(userId)
    .update(updatedUserData);

  successResponse(res, 200, null, "User updated successfully");
});

/**
 * Get all users (admin only)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const usersSnapshot = await db.collection(COLLECTION_NAMES.USERS).get();

  const users = usersSnapshot.docs.map((doc) => {
    const data = doc.data();
    // No need to delete hashedPassword since we're not storing it anymore
    return { userId: doc.id, ...data };
  });

  successResponse(res, 200, users);
});

/**
 * Upload user image
 */
const uploadUserImage = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || getUserId(req);
  const file = req.file;

  if (!file) {
    throw new ValidationError("No file uploaded");
  }

  if (!userId) {
    throw new AuthenticationError("User not authenticated");
  }

  const imageUrl = await uploadFile(file, `users/${userId}`, file.originalname);

  await db.collection(COLLECTION_NAMES.USERS).doc(userId).update({
    imageUrl,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  successResponse(res, 201, { imageUrl }, "Image uploaded successfully");
});

/**
 * Update user to gold member
 */
const updateToGoldMember = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  await db.collection(COLLECTION_NAMES.USERS).doc(userId).update({
    goldMember: true,
    goldMemberSince: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  successResponse(res, 200, null, "User updated to gold member successfully");
});

/**
 * Get user reward
 */
const getUserReward = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || getUserId(req);

  if (!userId) {
    throw new AuthenticationError("User not authenticated");
  }

  const userDoc = await db.collection(COLLECTION_NAMES.USERS).doc(userId).get();

  if (!userDoc.exists) {
    throw new NotFoundError("User");
  }

  const userData = userDoc.data();

  successResponse(res, 200, {
    userId: userDoc.id,
    rewards: userData.rewards || 0,
  });
});

// Legacy signup function (for backward compatibility)
const signup = register;

module.exports = {
  register,
  signup,
  login,
  logout,
  refreshToken,
  changePassword,
  getUserById,
  updateUser,
  getAllUsers,
  uploadUserImage,
  updateToGoldMember,
  getUserReward,
};
