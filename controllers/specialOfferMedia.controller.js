const { db } = require("../config/firebase.config");
const { admin } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { uploadFile, deleteFile } = require("../utils/storage.util");
const { successResponse, errorResponse } = require("../utils/response.util");

const MAX_MEDIA_ITEMS = 3;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * PUBLIC — GET /special-offer-media
 * Returns the ordered list of media items for the user-facing app.
 */
const getSpecialOfferMedia = async (req, res) => {
  try {
    const snap = await db
      .collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA)
      .orderBy("order", "asc")
      .get();

    const media = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      uploadedAt: d.data().uploadedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return successResponse(res, 200, { media, total: media.length });
  } catch (error) {
    console.error("getSpecialOfferMedia error:", error);
    return errorResponse(res, 500, "Failed to fetch special offer media", error);
  }
};

/**
 * ADMIN — POST /admin/special-offer-media
 * Upload a new media file. Enforces MAX_MEDIA_ITEMS limit.
 */
const uploadMedia = async (req, res) => {
  try {
    // Validate file presence
    if (!req.file) {
      return errorResponse(res, 400, "No file provided. Please upload an image or video.");
    }

    const { mimetype, size, originalname, buffer } = req.file;
    const { title = "" } = req.body;

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      return errorResponse(
        res,
        400,
        `Unsupported file format "${mimetype}". Allowed: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV.`
      );
    }

    // Validate file size
    if (size > MAX_FILE_SIZE_BYTES) {
      return errorResponse(
        res,
        400,
        `File too large (${(size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 50 MB.`
      );
    }

    // Enforce max 3 items
    const countSnap = await db
      .collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA)
      .count()
      .get();

    if (countSnap.data().count >= MAX_MEDIA_ITEMS) {
      return errorResponse(
        res,
        400,
        `Maximum of ${MAX_MEDIA_ITEMS} special offer media items allowed. Please delete an existing item before uploading.`
      );
    }

    // Determine media type
    const mediaType = mimetype.startsWith("video/") ? "video" : "image";

    // Upload to Firebase Storage under 'special-offers/' folder
    const url = await uploadFile(req.file, "special-offers", originalname);

    // Determine next order number
    const existing = await db
      .collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA)
      .orderBy("order", "desc")
      .limit(1)
      .get();

    const nextOrder = existing.empty ? 1 : (existing.docs[0].data().order || 0) + 1;

    // Save metadata to Firestore
    const docRef = await db.collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA).add({
      url,
      type: mediaType,
      title: title.trim() || originalname,
      fileName: originalname,
      mimeType: mimetype,
      sizeBytes: size,
      order: nextOrder,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      uploadedBy: req.user?.userId || "admin",
    });

    return successResponse(
      res,
      201,
      {
        id: docRef.id,
        url,
        type: mediaType,
        title: title.trim() || originalname,
        order: nextOrder,
      },
      "Media uploaded successfully"
    );
  } catch (error) {
    console.error("uploadMedia error:", error);
    return errorResponse(res, 500, "Failed to upload media", error);
  }
};

/**
 * ADMIN — DELETE /admin/special-offer-media/:id
 * Deletes the Firestore document and the file from Firebase Storage.
 */
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = db.collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse(res, 404, "Media item not found");
    }

    const { url } = doc.data();

    // Delete from Firebase Storage
    try {
      await deleteFile(url);
    } catch (storageErr) {
      // Log but don't block deletion of Firestore record
      console.warn("Could not delete file from Storage:", storageErr.message);
    }

    // Delete from Firestore
    await docRef.delete();

    return successResponse(res, 200, { id }, "Media deleted successfully");
  } catch (error) {
    console.error("deleteMedia error:", error);
    return errorResponse(res, 500, "Failed to delete media", error);
  }
};

/**
 * ADMIN — PUT /admin/special-offer-media/reorder
 * Body: { items: [{ id, order }] }
 * Updates the display order of media items.
 */
const reorderMedia = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, "items array is required");
    }

    const batch = db.batch();

    for (const { id, order } of items) {
      if (!id || typeof order !== "number") continue;
      const ref = db.collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA).doc(id);
      batch.update(ref, { order });
    }

    await batch.commit();

    return successResponse(res, 200, null, "Media order updated successfully");
  } catch (error) {
    console.error("reorderMedia error:", error);
    return errorResponse(res, 500, "Failed to reorder media", error);
  }
};

module.exports = {
  getSpecialOfferMedia,
  uploadMedia,
  deleteMedia,
  reorderMedia,
};
