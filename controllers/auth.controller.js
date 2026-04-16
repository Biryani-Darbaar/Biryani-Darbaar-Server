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
 * Validate and normalise an Australian phone number.
 * Accepted formats (spaces allowed):
 *   04XX XXX XXX  |  +61 4XX XXX XXX  |  02/03/07/08 XXXX XXXX  |  +61 2/3/7/8 XXXX XXXX
 * Regex (after stripping spaces): /^(\+61[2-9]\d{8}|0[2-9]\d{8})$/
 */
const isValidAustralianPhoneNumber = (phoneNumber) => {
  const stripped = phoneNumber.replace(/\s+/g, "");
  return /^(\+61[2-9]\d{8}|0[2-9]\d{8})$/.test(stripped);
};

/**
 * Normalise to E.164 format (+61XXXXXXXXX) for consistent Firestore storage.
 */
const normalizePhoneNumber = (phoneNumber) => {
  const stripped = phoneNumber.replace(/\s+/g, "");
  if (stripped.startsWith("+61")) return stripped;
  return "+61" + stripped.slice(1); // 0XXXXXXXXX → +61XXXXXXXXX
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
  if (!phoneNumber || !isValidAustralianPhoneNumber(phoneNumber)) {
    errors.push({
      field: "phoneNumber",
      message:
        "Valid Australian phone number required (e.g. 0412 345 678 or +61 412 345 678)",
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

  // Normalise email for consistent uniqueness check
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists in Firestore
  const usersRef = db.collection(COLLECTION_NAMES.USERS);
  const existingUser = await usersRef
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (!existingUser.empty) {
    throw new ConflictError("An account with this email already exists");
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user in Firebase Auth.
  // Phone number is stored only in Firestore — we omit it here to avoid
  // E.164 validation errors for local-format numbers (e.g. Australian 04xx).
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  const userRecord = await admin.auth().createUser({
    email: normalizedEmail,
    password,
    displayName: fullName,
  });

  // Normalise phone to E.164 before storing
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Store user data in Firestore
  await usersRef.doc(userRecord.uid).set({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    fullName,
    email: normalizedEmail,
    phoneNumber: normalizedPhone,
    address: address.trim(),
    hashedPassword, // Store hashed password for additional security layer
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        address: address.trim(),
        role: "user",
        isGoldMember: false,
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
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        address: userData.address,
        role: userData.role || "user",
        isGoldMember: userData.goldMember || false,
        emailVerified: userData.emailVerified || false,
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
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
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
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
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

/**
 * Generate a Firebase custom token for the currently authenticated user.
 * The frontend uses this to sign into the Firebase client SDK so it can
 * attach Firestore `onSnapshot` listeners for real-time order tracking.
 *
 * The custom token UID equals the user's backend userId, so Firestore security
 * rules can use `request.auth.uid == resource.data.userId` to restrict reads.
 */
const getFirebaseToken = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AuthenticationError("Authentication required");
  }

  // Verify the user still exists before issuing a token
  const userDoc = await db.collection(COLLECTION_NAMES.USERS).doc(userId).get();
  if (!userDoc.exists) {
    throw new AuthenticationError("User not found");
  }

  // Admin users receive an `admin: true` claim so Firestore security rules
  // can grant them collection-wide read access for Live Orders / onSnapshot.
  const additionalClaims = req.user?.role === "admin" ? { admin: true } : {};
  const customToken = await admin.auth().createCustomToken(userId, additionalClaims);

  successResponse(res, 200, { customToken }, "Firebase token generated");
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
  getFirebaseToken,
};
