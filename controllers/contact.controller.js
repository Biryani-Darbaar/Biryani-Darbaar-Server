const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { successResponse, errorResponse } = require("../utils/response.util");
const { admin } = require("../config/firebase.config");

/**
 * Submit a contact / catering enquiry form (public endpoint)
 */
const submitContactForm = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, email, description } = req.body;

    // Basic field validation
    if (!firstName || !lastName || !email || !description) {
      return errorResponse(res, 400, "firstName, lastName, email and description are required");
    }

    const docRef = await db.collection(COLLECTION_NAMES.CONTACT_RESPONSES).add({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      phoneNumber: phoneNumber?.trim() || "",
      email: email.trim().toLowerCase(),
      description: description.trim(),
      read: false,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return successResponse(res, 201, { id: docRef.id }, "Message submitted successfully");
  } catch (error) {
    console.error("submitContactForm error:", error);
    return errorResponse(res, 500, "Failed to submit contact form", error);
  }
};

/**
 * [Admin] Get all contact / catering responses — sorted newest first
 */
const getContactResponses = async (req, res) => {
  try {
    const { read, limit = 50, page = 1 } = req.query;

    let query = db
      .collection(COLLECTION_NAMES.CONTACT_RESPONSES)
      .orderBy("submittedAt", "desc");

    if (read !== undefined) {
      query = query.where("read", "==", read === "true");
    }

    const snapshot = await query.limit(parseInt(limit)).get();

    const responses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() ?? null,
    }));

    // Count unread
    const unreadSnapshot = await db
      .collection(COLLECTION_NAMES.CONTACT_RESPONSES)
      .where("read", "==", false)
      .count()
      .get();

    return successResponse(res, 200, {
      responses,
      total: responses.length,
      unread: unreadSnapshot.data().count,
    });
  } catch (error) {
    console.error("getContactResponses error:", error);
    return errorResponse(res, 500, "Failed to fetch contact responses", error);
  }
};

/**
 * [Admin] Mark a contact response as read
 */
const markResponseRead = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(COLLECTION_NAMES.CONTACT_RESPONSES).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse(res, 404, "Response not found");
    }

    await docRef.update({ read: true, readAt: admin.firestore.FieldValue.serverTimestamp() });

    return successResponse(res, 200, { id }, "Response marked as read");
  } catch (error) {
    console.error("markResponseRead error:", error);
    return errorResponse(res, 500, "Failed to update response", error);
  }
};

/**
 * [Admin] Delete a contact response
 */
const deleteContactResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(COLLECTION_NAMES.CONTACT_RESPONSES).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse(res, 404, "Response not found");
    }

    await docRef.delete();

    return successResponse(res, 200, { id }, "Response deleted successfully");
  } catch (error) {
    console.error("deleteContactResponse error:", error);
    return errorResponse(res, 500, "Failed to delete response", error);
  }
};

module.exports = {
  submitContactForm,
  getContactResponses,
  markResponseRead,
  deleteContactResponse,
};
