const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { errorResponse, successResponse } = require("../utils/response.util");

/**
 * Create a new promo code
 */
const createPromo = async (req, res) => {
  const { code, discount, expirationDate } = req.body;

  if (!code || !discount || !expirationDate) {
    return errorResponse(
      res,
      400,
      "Code, discount, and expiration date are required"
    );
  }

  try {
    // Check if promo code already exists in Firestore
    const promoRef = db.collection(COLLECTION_NAMES.PROMO_CODES).doc(code);
    const doc = await promoRef.get();

    if (doc.exists) {
      return errorResponse(res, 409, "Promo code already exists");
    }

    // Store promo code in Firestore
    await promoRef.set({
      discount: discount / 100, // Convert percentage to decimal
      expirationDate: new Date(expirationDate),
    });

    successResponse(res, 201, { message: "Promo code created successfully" });
  } catch (error) {
    errorResponse(res, 500, "Internal Server Error", error);
  }
};

/**
 * Validate promo code
 */
const validatePromo = async (req, res) => {
  const { promoCode } = req.body;

  try {
    // Get promo code from Firestore
    const promoRef = db.collection(COLLECTION_NAMES.PROMO_CODES).doc(promoCode);
    const doc = await promoRef.get();

    if (!doc.exists) {
      return successResponse(res, 200, {
        success: false,
        message: "Invalid promo code",
      });
    }

    const promo = doc.data();
    const currentDate = new Date();
    const currentDateUnix = Math.floor(currentDate.getTime() / 1000);

    // Check if the promo code is expired
    if (currentDateUnix > promo.expirationDate._seconds) {
      return successResponse(res, 200, {
        success: false,
        message: "Promo code expired",
      });
    }

    // Calculate the final amount after applying the discount
    const finalDiscount = promo.discount;
    successResponse(res, 200, { success: true, finalDiscount });
  } catch (error) {
    errorResponse(res, 500, "Internal Server Error", error);
  }
};

/**
 * Get all promo codes
 */
const getAllPromos = async (req, res) => {
  try {
    // Get all promo codes from Firestore
    const promoSnapshot = await db
      .collection(COLLECTION_NAMES.PROMO_CODES)
      .get();

    if (promoSnapshot.empty) {
      return errorResponse(res, 404, "No promo codes found");
    }

    const promoCodes = [];
    promoSnapshot.forEach((doc) => {
      const promoData = doc.data();
      promoCodes.push({
        code: doc.id,
        discount: promoData.discount * 100, // Convert decimal back to percentage
        expirationDate: new Date(
          promoData.expirationDate._seconds * 1000
        ).toISOString(),
      });
    });

    successResponse(res, 200, promoCodes);
  } catch (error) {
    errorResponse(res, 500, "Internal Server Error", error);
  }
};

module.exports = {
  createPromo,
  validatePromo,
  getAllPromos,
};
