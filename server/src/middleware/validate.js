/**
 * Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), controller)
 *
 * On parse failure the ZodError is passed to next(), which the centralized
 * errorHandler converts to a structured 400 response.
 */
const validate = (schema) => (req, res, next) => {
  try {
    // Replace req.body with the coerced/validated value from Zod.
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    next(err); // ZodError → errorHandler
  }
};

export default validate;
