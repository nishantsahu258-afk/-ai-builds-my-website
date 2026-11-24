/**
 * Send a successful JSON response.
 *
 * @param {import('express').Response} res
 * @param {*} data         - Payload to include under `data`
 * @param {string} message - Human-readable success message
 * @param {number} statusCode - HTTP status (default 200)
 */
export const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error JSON response.
 *
 * @param {import('express').Response} res
 * @param {string} message   - Human-readable error message
 * @param {number} statusCode - HTTP status (default 400)
 * @param {Array|null} errors - Optional field-level error array
 */
export const error = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
};
