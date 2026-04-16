/**
 * storage.util.js — Local-disk file storage (replaces Firebase / GCS)
 *
 * Files are written to  <server-root>/public/assets/<directory>/<timestamp>-<name>
 * and served via Express static middleware as:
 *   GET  {SERVER_BASE_URL}/assets/<directory>/<timestamp>-<name>
 *
 * That URL is what gets stored in Firestore and used by both the admin
 * dashboard and the user-facing website.
 */

const fs   = require("fs");
const path = require("path");

// Absolute path to the Express static root — created on demand by uploadFile.
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

// Base URL of this server; strip any trailing slash.
// Set SERVER_BASE_URL in your .env (e.g. http://localhost:3000 or https://api.yourdomain.com).
const SERVER_BASE_URL = (
  process.env.SERVER_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitise a string for safe use as a filesystem path segment.
 * Preserves alphanumerics, dots, hyphens, and underscores; replaces the rest with "_".
 */
const sanitise = (str) => (str || "file").replace(/[^a-zA-Z0-9._-]/g, "_");

/**
 * Resolve and return the absolute path of a stored file given its public URL.
 * Returns null when the URL is not one of ours (e.g. an old Firebase Storage URL).
 */
const urlToAbsPath = (imageUrl) => {
  try {
    const { pathname } = new URL(imageUrl);
    if (!pathname.startsWith("/assets/")) return null;
    return path.join(PUBLIC_DIR, pathname);
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API  (same surface as the old Firebase-backed util)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save an uploaded file to disk and return its public URL.
 *
 * @param {Express.Multer.File} file       Multer file object (buffer must be present)
 * @param {string}              directory  Sub-folder under public/assets/ (e.g. "dishes/Biryani_s")
 * @param {string}              fileName   Original file name — will be sanitised
 * @returns {Promise<string>}              Full public URL, e.g.
 *                                         "http://localhost:3000/assets/dishes/Biryani_s/1713500000-img.jpg"
 */
const uploadFile = async (file, directory, fileName) => {
  if (!file || !file.buffer) {
    throw new Error("uploadFile: file or file.buffer is missing");
  }

  // Sanitise each path segment individually so that a caller passing
  // "dishes/Biryani's" produces "dishes/Biryani_s" — not "dishes_Biryani_s".
  const safeSegments = (directory || "misc")
    .split("/")
    .filter(Boolean)
    .map(sanitise);
  const safeName = sanitise(fileName);

  // Ensure the target directory exists (creates all intermediate dirs).
  const absDir = path.join(PUBLIC_DIR, "assets", ...safeSegments);
  await fs.promises.mkdir(absDir, { recursive: true });

  // Use a millisecond timestamp prefix to guarantee uniqueness.
  const baseName = `${Date.now()}-${safeName}`;
  const absPath  = path.join(absDir, baseName);
  const urlPath  = `/assets/${safeSegments.join("/")}/${baseName}`;

  await fs.promises.writeFile(absPath, file.buffer);

  return `${SERVER_BASE_URL}${urlPath}`;
};

/**
 * Delete a previously uploaded file by its public URL.
 * Silently no-ops when the URL is empty, not ours, or the file no longer exists.
 */
const deleteFile = async (imageUrl) => {
  if (!imageUrl) return;

  const absPath = urlToAbsPath(imageUrl);
  if (!absPath) {
    // URL belongs to a different host (e.g. an old Firebase Storage URL) — skip.
    return;
  }

  try {
    await fs.promises.unlink(absPath);
  } catch (err) {
    if (err.code === "ENOENT") return; // already gone — treat as success
    console.error("deleteFile: could not remove", absPath, "—", err.message);
    // Don't re-throw: a failed delete must not block the calling operation.
  }
};

/**
 * List every file under public/assets/{prefix} and return their public URLs.
 * Returns an empty array if the directory doesn't exist.
 */
const getFiles = async (prefix = "") => {
  const safePrefix = sanitise(prefix);
  const absDir     = path.join(PUBLIC_DIR, "assets", safePrefix);

  try {
    const entries = await fs.promises.readdir(absDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => ({
        name: e.name,
        url:  `${SERVER_BASE_URL}/assets/${safePrefix}/${e.name}`,
      }));
  } catch (err) {
    if (err.code === "ENOENT") return []; // directory doesn't exist yet
    throw err;
  }
};

/**
 * Delete every file inside public/assets/ (recursive).
 * Throws "No images found" when the directory is empty — matches old behaviour.
 */
const deleteAllFiles = async () => {
  const assetsDir = path.join(PUBLIC_DIR, "assets");

  let allFiles = [];
  const collect = async (dir) => {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await collect(full);
      } else {
        allFiles.push(full);
      }
    }
  };

  await collect(assetsDir);

  if (allFiles.length === 0) throw new Error("No images found");

  for (const f of allFiles) {
    try { await fs.promises.unlink(f); } catch { /* best-effort */ }
  }
};

module.exports = { uploadFile, deleteFile, getFiles, deleteAllFiles };
