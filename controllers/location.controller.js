const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { uploadFile, deleteFile } = require("../utils/storage.util");
const { errorResponse, successResponse } = require("../utils/response.util");

/**
 * Create a new location
 */
const createLocation = async (req, res) => {
  const { name, address } = req.body;
  const file = req.file;

  if (!name || !address) {
    return errorResponse(res, 400, "Location name and address are required");
  }

  try {
    let imageUrl = "";

    if (file) {
      imageUrl = await uploadFile(file, "locations", file.originalname);
    }

    const locationRef = db.collection(COLLECTION_NAMES.LOCATION).doc();
    await locationRef.set({ name, address, image: imageUrl });

    successResponse(res, 201, {
      message: "Location created successfully",
      locationId: locationRef.id,
      name,
      address,
      imageUrl,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to create location", error);
  }
};

/**
 * Get all locations
 */
const getLocations = async (req, res) => {
  try {
    const locationsSnapshot = await db
      .collection(COLLECTION_NAMES.LOCATION)
      .get();
    const locations = [];

    locationsSnapshot.forEach((doc) => {
      locations.push({ locationId: doc.id, ...doc.data() });
    });

    successResponse(res, 200, locations);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch locations", error);
  }
};

/**
 * Update a location by ID
 */
const updateLocation = async (req, res) => {
  const locationId = req.params.id;
  const { name, address } = req.body;
  const file = req.file;

  if (!name || !address) {
    return errorResponse(res, 400, "Location name and address are required");
  }

  try {
    const locationRef = db
      .collection(COLLECTION_NAMES.LOCATION)
      .doc(locationId);
    const locationDoc = await locationRef.get();

    if (!locationDoc.exists) {
      return errorResponse(res, 404, "Location not found");
    }

    let imageUrl = locationDoc.data().image;

    if (file) {
      // Delete the old image
      if (imageUrl) {
        await deleteFile(imageUrl);
      }

      // Upload the new image
      imageUrl = await uploadFile(file, "locations", file.originalname);
    }

    await locationRef.update({ name, address, image: imageUrl });

    successResponse(res, 200, {
      message: "Location updated successfully",
      locationId,
      name,
      address,
      imageUrl,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to update location", error);
  }
};

/**
 * Delete a location by ID
 */
const deleteLocation = async (req, res) => {
  const locationId = req.params.id;

  try {
    const locationRef = db
      .collection(COLLECTION_NAMES.LOCATION)
      .doc(locationId);
    const locationDoc = await locationRef.get();

    if (!locationDoc.exists) {
      return errorResponse(res, 404, "Location not found");
    }

    const locationData = locationDoc.data();
    const imageUrl = locationData.image;

    // Delete the location document
    await locationRef.delete();

    // If an image URL exists, delete the image from Firebase Storage
    if (imageUrl) {
      await deleteFile(imageUrl);
    }

    successResponse(res, 200, { message: "Location deleted successfully" });
  } catch (error) {
    errorResponse(res, 500, "Failed to delete location", error);
  }
};

module.exports = {
  createLocation,
  getLocations,
  updateLocation,
  deleteLocation,
};
