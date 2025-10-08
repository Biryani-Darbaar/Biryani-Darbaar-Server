const { admin, db } = require("../config/firebase.config");
const bcrypt = require("bcryptjs");
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
 * Register a new user with email and password
 */
const register = asyncHandler(async (req, res) => {
  const { userName, email, password, phoneNumber } = req.body;

  // Validation
  const errors = [];
  if (!userName || userName.trim().length < 2) {
    errors.push({
      field: "userName",
      message: "Name must be at least 2 characters",
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
  if (!phoneNumber || phoneNumber.trim().length < 10) {
    errors.push({
      field: "phoneNumber",
      message: "Valid phone number is required",
    });
  }

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  // Check if user already exists
  const usersRef = db.collection(COLLECTION_NAMES.USERS);
  const existingUser = await usersRef
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existingUser.empty) {
    throw new ConflictError("User with this email already exists");
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user in Firebase Auth
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: userName,
    phoneNumber: phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`,
  });

  // Store user data in Firestore
  await usersRef.doc(userRecord.uid).set({
    userName: userName.trim(),
    email: email.toLowerCase(),
    phoneNumber,
    hashedPassword, // Store hashed password for additional security layer
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    emailVerified: false,
    goldMember: false,
    rewards: 0,
  });

  // Generate tokens
  const tokens = generateTokens(userRecord.uid, email);

  successResponse(
    res,
    201,
    {
      user: {
        userId: userRecord.uid,
        userName,
        email,
        phoneNumber,
        emailVerified: false,
      },
      tokens,
    },
    "Registration successful"
  );
});

/**
 * Login with email and password
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, idToken } = req.body;

  // Support both Firebase ID token and email/password login
  if (idToken) {
    // Firebase ID token login
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Set session data
    req.session.userId = decodedToken.uid;
    req.session.loginTimestamp = Date.now();
    setUserId(decodedToken.uid);

    // Get user data
    const userDoc = await db
      .collection(COLLECTION_NAMES.USERS)
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      throw new NotFoundError("User");
    }

    const userData = userDoc.data();

    // Generate JWT tokens
    const tokens = generateTokens(decodedToken.uid, decodedToken.email);

    successResponse(
      res,
      200,
      {
        user: {
          userId: decodedToken.uid,
          userName: userData.userName,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          phoneNumber: decodedToken.phone_number,
        },
        tokens,
        sessionId: req.session.loginTimestamp,
      },
      "Login successful"
    );
  } else if (email && password) {
    // Email/password login
    if (!isValidEmail(email)) {
      throw new ValidationError("Invalid email format");
    }

    // Find user by email
    const usersRef = db.collection(COLLECTION_NAMES.USERS);
    const userSnapshot = await usersRef
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      throw new AuthenticationError("Invalid email or password");
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      userData.hashedPassword
    );

    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    const userId = userDoc.id;

    // Update last login
    await usersRef.doc(userId).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    });

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
          userName: userData.userName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          emailVerified: userData.emailVerified || false,
          goldMember: userData.goldMember || false,
        },
        tokens,
        sessionId: req.session.loginTimestamp,
      },
      "Login successful"
    );
  } else {
    throw new ValidationError("Email and password, or ID token required");
  }
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

  // Get user data
  const userDoc = await db.collection(COLLECTION_NAMES.USERS).doc(userId).get();

  if (!userDoc.exists) {
    throw new NotFoundError("User");
  }

  const userData = userDoc.data();

  // Verify current password
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    userData.hashedPassword
  );

  if (!isPasswordValid) {
    throw new AuthenticationError("Current password is incorrect");
  }

  // Hash new password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password in Firestore
  await db.collection(COLLECTION_NAMES.USERS).doc(userId).update({
    hashedPassword,
    passwordChangedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update password in Firebase Auth
  await admin.auth().updateUser(userId, { password: newPassword });

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
  delete userData.hashedPassword; // Don't send password hash

  successResponse(res, 200, { userId: userDoc.id, ...userData });
});

/**
 * Update user
 */
const updateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const updatedUserData = req.body;

  // Remove sensitive fields that shouldn't be updated directly
  delete updatedUserData.hashedPassword;
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
    delete data.hashedPassword; // Don't send password hashes
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
