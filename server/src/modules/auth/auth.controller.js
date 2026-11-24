import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../../config/index.js';
import { success } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

/** @returns {import('mongoose').Model} */
const getUserModel = () => mongoose.model('User');

/**
 * Sign a JWT for the given user payload.
 * @param {{ id: string, email: string }} payload
 * @returns {string}
 */
const signToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

/**
 * Write the auth token as an httpOnly cookie.
 * @param {import('express').Response} res
 * @param {string} token
 */
const setCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: config.cookie.maxAge,
  });
};

// ── POST /auth/register ───────────────────────────────────────────────────────

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const User = getUserModel();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with that email already exists',
      });
    }

    const user = await User.create({ name, email, password });

    const token = signToken({ id: user._id.toString(), email: user.email });
    setCookie(res, token);

    logger.info(`New user registered: ${user.email}`);

    return success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
      'Account created successfully',
      201,
    );
  } catch (err) {
    next(err);
  }
};

// ── POST /auth/login ──────────────────────────────────────────────────────────

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const User = getUserModel();

    // Select passwordHash explicitly since it's likely hidden by default
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = signToken({ id: user._id.toString(), email: user.email });
    setCookie(res, token);

    logger.info(`User logged in: ${user.email}`);

    return success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
      'Logged in successfully',
    );
  } catch (err) {
    next(err);
  }
};

// ── POST /auth/logout ─────────────────────────────────────────────────────────

export const logout = (req, res, next) => {
  try {
    res.clearCookie('token', {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
    });
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// ── GET /auth/me ──────────────────────────────────────────────────────────────

export const getMe = async (req, res, next) => {
  try {
    const User = getUserModel();
    const user = await User.findById(req.user.id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      'User retrieved successfully',
    );
  } catch (err) {
    next(err);
  }
};
