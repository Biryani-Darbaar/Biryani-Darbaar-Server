/**
 * session.util.js
 *
 * Provides per-request user identification helpers.
 *
 * IMPORTANT: The old implementation used `node-sessionstorage`, which is a
 * process-level global singleton — shared across ALL concurrent HTTP requests.
 * A single login would write a userId that poisoned every subsequent request on
 * the server, causing every public dish/category endpoint to read that user's
 * Firestore document regardless of who made the request.
 *
 * This rewrite is purely request-local: it never touches any shared global state.
 */

/**
 * Extract the user ID from the current request, in priority order:
 *   1. JWT middleware (req.user.userId)  — most authoritative
 *   2. JSON body (req.body.userId)       — explicit caller-supplied value
 *   3. Route parameter (req.params.id)   — for ID-in-URL endpoints
 *
 * Returns null (never throws) when no ID is found.
 */
const getUserId = (req) => {
  return (
    req.user?.userId ||
    req.body?.userId ||
    req.params?.id ||
    null
  );
};

/**
 * No-op — kept for backward compatibility so callers don't need changing.
 * The old version wrote to a server-global store; this version does nothing.
 */
const setUserId = (_userId) => {
  // intentionally empty — writing to a global is always wrong in a concurrent server
};

/**
 * No-op — kept for backward compatibility.
 */
const clearUserId = () => {
  // intentionally empty
};

/**
 * Stub storage object — kept so any destructured `storage` imports don't crash.
 */
const storage = {
  getItem:    () => null,
  setItem:    () => {},
  removeItem: () => {},
};

module.exports = {
  getUserId,
  setUserId,
  clearUserId,
  storage,
};
