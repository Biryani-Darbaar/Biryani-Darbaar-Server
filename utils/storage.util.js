const { bucket } = require("../config/firebase.config");

/**
 * Upload a file to Firebase Storage
 */
const uploadFile = async (file, directory, fileName) => {
  const filePath = `${directory}/${Date.now()}-${fileName}`;
  const fileUpload = bucket.file(filePath);

  await fileUpload.save(file.buffer, {
    contentType: file.mimetype,
  });

  await fileUpload.makePublic();

  const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  return imageUrl;
};

/**
 * Delete a file from Firebase Storage
 */
const deleteFile = async (imageUrl) => {
  if (!imageUrl) return;

  const fileName = imageUrl.split("/").slice(4).join("/");
  const file = bucket.file(fileName);
  await file.delete();
};

/**
 * Get all files from a directory in Firebase Storage
 */
const getFiles = async (prefix) => {
  const [files] = await bucket.getFiles({ prefix });
  return files.map((file) => ({
    name: file.name,
    url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
  }));
};

/**
 * Delete all files from Firebase Storage
 */
const deleteAllFiles = async () => {
  const [files] = await bucket.getFiles({ prefix: "" });

  if (files.length === 0) {
    throw new Error("No images found");
  }

  for (const file of files) {
    await file.delete();
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  getFiles,
  deleteAllFiles,
};
