import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * JWT authentication middleware.
 * Reads the token from the httpOnly cookie named 'token',
 * verifies it, and attaches { id, email } to req.user.
 */
const authenticate = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }
};

export default authenticate;
