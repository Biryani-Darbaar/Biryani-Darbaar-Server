const {
  uploadFile,
  getFiles,
  deleteAllFiles,
} = require("../utils/storage.util");
const { errorResponse, successResponse } = require("../utils/response.util");

/**
 * Upload multiple images
 */
const uploadImages = async (req, res) => {
  const files = req.files;
  const { directory } = req.body;

  try {
    if (!files || files.length === 0) {
      return errorResponse(res, 400, "No files uploaded");
    }

    if (!directory) {
      return errorResponse(res, 400, "No directory specified");
    }

    const imageUrls = [];

    for (const file of files) {
      const imageUrl = await uploadFile(file, directory, file.originalname);
      imageUrls.push(imageUrl);
    }

    successResponse(res, 201, {
      message: "Images uploaded successfully",
      imageUrls,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to upload images", error);
  }
};

/**
 * Get all images
 */
const getImages = async (req, res) => {
  try {
    const images = await getFiles("images/");
    successResponse(res, 200, images);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch images", error);
  }
};

/**
 * Delete all images
 */
const deleteImages = async (req, res) => {
  try {
    await deleteAllFiles();
    successResponse(res, 200, { message: "All images deleted successfully" });
  } catch (error) {
    if (error.message === "No images found") {
      return errorResponse(res, 404, "No images found");
    }
    errorResponse(res, 500, "Failed to delete images", error);
  }
};

module.exports = {
  uploadImages,
  getImages,
  deleteImages,
};
