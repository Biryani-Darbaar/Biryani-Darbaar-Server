const { db } = require("../config/firebase.config");
const { admin } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { uploadFile, deleteFile } = require("../utils/storage.util");
const { successResponse, errorResponse } = require("../utils/response.util");

// Shared media collection — items are distinguished by a "section" field so
// Special Offer media (Home / /SpecialOffer carousel) and Menu media
// (/Menu carousel) can be managed independently while reusing the same
// upload/reorder/delete plumbing.
const SECTIONS = {
  SPECIAL_OFFER: "special-offer",
  MENU: "menu",
};

const MAX_MEDIA_ITEMS = 20;

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

// ── In-process cache for the public media list, keyed by section ─────────────
// The list only changes when an admin uploads, deletes, or reorders — cache is
// invalidated on every write operation so users see changes within seconds.
const _cache = {}; // { [section]: { data, ts } }
const MEDIA_TTL_MS = 60 * 1000; // 60 seconds

const invalidateMediaCache = (section) => {
  if (section) delete _cache[section];
  else Object.keys(_cache).forEach((key) => delete _cache[key]);
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUBLIC/ADMIN — GET /special-offer-media | /menu-media
 * Returns the ordered list of media items for the given section.
 *
 * NOTE: queries filter by "section" only (no orderBy) and sort in memory —
 * this avoids requiring a Firestore composite index for section+order.
 */
const getMediaList = (section) => async (req, res) => {
  try {
    const now = Date.now();
    const cached = _cache[section];
    if (cached && now - cached.ts < MEDIA_TTL_MS) {
      return successResponse(res, 200, { media: cached.data, total: cached.data.length });
    }

    const snap = await db
      .collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA)
      .where("section", "==", section)
      .get();

    const media = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
        uploadedAt: d.data().uploadedAt?.toDate?.()?.toISOString() ?? null,
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    _cache[section] = { data: media, ts: now };

    return successResponse(res, 200, { media, total: media.length });
  } catch (error) {
    console.error("getMediaList error:", error);
    return errorResponse(res, 500, "Failed to fetch media", error);
  }
};

/**
 * ADMIN — POST /admin/special-offer-media | /admin/menu-media
 * Upload a new media file. Enforces MAX_MEDIA_ITEMS limit per section.
 */
const uploadMedia = (section) => async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, "No file provided. Please upload an image or video.");
    }

    const { mimetype, size, originalname } = req.file;
    const { title = "" } = req.body;

    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      return errorResponse(
        res,
        400,
        `Unsupported file format "${mimetype}". Allowed: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV.`
      );
    }

    if (size > MAX_FILE_SIZE_BYTES) {
      return errorResponse(
        res,
        400,
        `File too large (${(size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 50 MB.`
      );
    }

    const existingSnap = await db
      .collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA)
      .where("section", "==", section)
      .get();

    if (existingSnap.size >= MAX_MEDIA_ITEMS) {
      return errorResponse(
        res,
        400,
        `Maximum of ${MAX_MEDIA_ITEMS} media items allowed. Please delete an existing item before uploading.`
      );
    }

    const mediaType = mimetype.startsWith("video/") ? "video" : "image";
    const folder = section === SECTIONS.MENU ? "menu-media" : "special-offers";

    // Write to local disk: public/assets/{folder}/{timestamp}-{filename}
    const url = await uploadFile(req.file, folder, originalname);

    const maxOrder = existingSnap.docs.reduce(
      (max, doc) => Math.max(max, doc.data().order || 0),
      0
    );
    const nextOrder = maxOrder + 1;

    const docRef = await db.collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA).add({
      url,
      type:       mediaType,
      title:      title.trim() || originalname,
      fileName:   originalname,
      mimeType:   mimetype,
      sizeBytes:  size,
      order:      nextOrder,
      section,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      uploadedBy: req.user?.userId || "admin",
    });

    invalidateMediaCache(section);

    return successResponse(
      res,
      201,
      {
        id:    docRef.id,
        url,
        type:  mediaType,
        title: title.trim() || originalname,
        order: nextOrder,
        section,
      },
      "Media uploaded successfully"
    );
  } catch (error) {
    console.error("uploadMedia error:", error);
    return errorResponse(res, 500, "Failed to upload media", error);
  }
};

/**
 * ADMIN — DELETE /admin/special-offer-media/:id | /admin/menu-media/:id
 * Deletes the Firestore document and the file from local disk.
 */
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = db.collection(COLLECTION_NAMES.SPECIAL_OFFER_MEDIA).doc(id);
    const doc    = await docRef.get();

    if (!doc.exists) {
      return errorResponse(res, 404, "Media item not found");
    }

    const { url, section } = doc.data();

    // Delete the physical file from local disk (non-blocking — stale refs are harmless)
    try {
      await deleteFile(url);
    } catch (storageErr) {
      console.warn("Could not delete file from disk:", storageErr.message);
    }

    await docRef.delete();

    invalidateMediaCache(section);

    return successResponse(res, 200, { id }, "Media deleted successfully");
  } catch (error) {
    console.error("deleteMedia error:", error);
    return errorResponse(res, 500, "Failed to delete media", error);
  }
};

/**
 * ADMIN — PUT /admin/special-offer-media/reorder | /admin/menu-media/reorder
 * Body: { items: [{ id, order }] }
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

    // Reordering can only happen within one section at a time client-side,
    // but invalidating everything is cheap and avoids an extra read to find
    // out which section these ids belong to.
    invalidateMediaCache();

    return successResponse(res, 200, null, "Media order updated successfully");
  } catch (error) {
    console.error("reorderMedia error:", error);
    return errorResponse(res, 500, "Failed to reorder media", error);
  }
};

module.exports = {
  SECTIONS,
  getMediaList,
  uploadMedia,
  deleteMedia,
  reorderMedia,
};
