# Error Response Signature Fix

## Problem

The `errorResponse` function signature was changed from:

```javascript
// OLD (used everywhere in controllers)
errorResponse(res, statusCode, message, error);
```

To:

```javascript
// NEW (error middleware expects this)
errorResponse(res, error);
```

This caused ALL endpoints to fail with 500 errors.

## Solution

Created a **backward-compatible wrapper** that supports BOTH signatures:

### Implementation

```javascript
/**
 * Error response handler - Supports both old and new signatures
 */
const errorResponse = (
  res,
  statusCodeOrError,
  message = null,
  error = null
) => {
  // New signature: errorResponse(res, error)
  if (
    typeof statusCodeOrError === "object" &&
    statusCodeOrError instanceof Error
  ) {
    const err = statusCodeOrError;
    return handleErrorResponse(res, err);
  }

  // Old signature: errorResponse(res, statusCode, message, error)
  // Convert to AppError and handle
  const statusCode = statusCodeOrError;
  const actualError = error || new Error(message);

  // Create appropriate AppError based on status code
  let appError;
  if (statusCode === 400) {
    appError = new (require("./errors.util").ValidationError)(message);
  } else if (statusCode === 401) {
    appError = new (require("./errors.util").AuthenticationError)(message);
  } else if (statusCode === 404) {
    appError = new (require("./errors.util").NotFoundError)(message);
  } else if (statusCode === 409) {
    appError = new (require("./errors.util").ConflictError)(message);
  } else {
    appError = new AppError(message, statusCode, "INTERNAL_SERVER_ERROR");
  }

  // Log the original error if provided
  if (error) {
    console.error(`[Error Context]`, {
      originalError: error.message,
      stack: error.stack,
    });
  }

  return handleErrorResponse(res, appError);
};
```

## How It Works

### Case 1: New Signature (from error middleware)

```javascript
// Error middleware calls
errorResponse(res, new ValidationError("Something went wrong"));
// ✅ Detected as Error object, handled correctly
```

### Case 2: Old Signature (from controllers)

```javascript
// Controllers call
errorResponse(res, 400, "Bad request", error);
// ✅ Converted to ValidationError, handled correctly

errorResponse(res, 404, "Not found");
// ✅ Converted to NotFoundError, handled correctly

errorResponse(res, 500, "Server error", actualError);
// ✅ Converted to AppError with context, handled correctly
```

## Status Code → Error Type Mapping

| Status Code | Error Type          | Use Case                      |
| ----------- | ------------------- | ----------------------------- |
| 400         | ValidationError     | Invalid input, missing fields |
| 401         | AuthenticationError | Login failed, invalid token   |
| 404         | NotFoundError       | Resource not found            |
| 409         | ConflictError       | Duplicate entry, conflict     |
| Other       | AppError            | Generic server errors         |

## Benefits

1. ✅ **Zero Breaking Changes** - All existing controller code works
2. ✅ **Modern Error Handling** - Converts to proper AppError classes
3. ✅ **Better Logging** - Context from original errors preserved
4. ✅ **Type Safety** - Detects signature by checking Error instance
5. ✅ **Future Proof** - Easy to migrate controllers gradually

## Controllers Using Old Signature

All these controllers will now work correctly:

- ✅ `auth.controller.js` (uses asyncHandler, throws AppError)
- ✅ `cart.controller.js` (uses old signature)
- ✅ `category.controller.js` (uses old signature)
- ✅ `dish.controller.js` (uses old signature)
- ✅ `goldPrice.controller.js` (uses old signature)
- ✅ `image.controller.js` (uses old signature)
- ✅ `location.controller.js` (uses old signature)
- ✅ `miniGame.controller.js` (uses old signature)
- ✅ `notification.controller.js` (uses old signature)
- ✅ `order.controller.js` (uses old signature)
- ✅ `payment.controller.js` (uses old signature)
- ✅ `promo.controller.js` (uses old signature)
- ✅ `reward.controller.js` (uses old signature)

## Testing

### Test Login Endpoint

```bash
curl -X POST http://localhost:4200/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

**Expected:**

- ✅ Proper error response with status code
- ✅ No "undefined" errors
- ✅ Error messages are clear

### Test Other Endpoints

```bash
# Categories
curl http://localhost:4200/categories

# Dishes
curl http://localhost:4200/dishes

# Special Offers
curl http://localhost:4200/specialOffers
```

**Expected:**

- ✅ Either success response OR
- ✅ Proper error response (not "undefined")

## Migration Path (Optional - Future)

To gradually migrate controllers to the new signature:

### Step 1: Update imports

```javascript
// Add AppError classes
const { ValidationError, NotFoundError } = require("../utils/errors.util");
```

### Step 2: Throw errors instead of calling errorResponse

```javascript
// OLD
if (!data) {
  return errorResponse(res, 404, "Data not found");
}

// NEW
if (!data) {
  throw new NotFoundError("Data not found");
}
```

### Step 3: Use asyncHandler

```javascript
// OLD
const getData = async (req, res) => {
  try {
    // ... code
  } catch (error) {
    errorResponse(res, 500, "Failed", error);
  }
};

// NEW
const getData = asyncHandler(async (req, res) => {
  // ... code (errors caught automatically)
});
```

## Files Modified

- ✅ `utils/response.util.js` - Added backward compatibility

## No Changes Needed

- ✅ All controllers - Work with old signature
- ✅ Error middleware - Works with new signature
- ✅ Routes - No changes needed

---

**Status:** ✅ Fixed - All endpoints should now work correctly
