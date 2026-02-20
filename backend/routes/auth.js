const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { authStrictLimiter, csrfTokenHandler } = require('../middleware/security');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Token generation and hashing helpers
const generateToken = (id, secret, expiresIn) => {
  return jwt.sign({ id }, secret, { expiresIn });
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const accessTokenSecret = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// POST /api/auth/signup
router.post(
  '/signup',
  authStrictLimiter,
  [
    body('name').trim().notEmpty().isLength({ min: 3 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check existing user
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ message: 'This email is already registered.' });
      }

      const user = await User.create({ name: name.trim(), email, password });
      
      // Generate tokens
      const accessToken = generateToken(user._id, accessTokenSecret, '15m');
      const refreshToken = generateToken(user._id, refreshTokenSecret, '7d');
      
      // Store refresh token hash server-side
      user.refreshTokenHash = hashToken(refreshToken);
      user.refreshTokenIssuedAt = new Date();
      await user.save();

      setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authStrictLimiter,
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      // Generate tokens
      const accessToken = generateToken(user._id, accessTokenSecret, '15m');
      const refreshToken = generateToken(user._id, refreshTokenSecret, '7d');
      
      // Store refresh token hash server-side
      user.refreshTokenHash = hashToken(refreshToken);
      user.refreshTokenIssuedAt = new Date();
      await user.save();

      setAuthCookies(res, accessToken, refreshToken);

      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    }
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing.' });
    }

    // Verify refresh token signature
    const decoded = jwt.verify(refreshToken, refreshTokenSecret);
    
    // Find user and verify token hash
    const user = await User.findById(decoded.id).select('+refreshTokenHash +refreshTokenIssuedAt');
    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({ message: 'Refresh token invalid or expired.' });
    }

    // Verify token hash matches
    if (user.refreshTokenHash !== hashToken(refreshToken)) {
      return res.status(401).json({ message: 'Refresh token invalid.' });
    }

    // Generate new tokens
    const newAccess = generateToken(user._id, accessTokenSecret, '15m');
    const newRefresh = generateToken(user._id, refreshTokenSecret, '7d');

    // Rotate refresh token (update hash)
    await User.updateOne(
      { _id: user._id },
      {
        refreshTokenHash: hashToken(newRefresh),
        refreshTokenIssuedAt: new Date()
      }
    );

    setAuthCookies(res, newAccess, newRefresh);
    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (err) {
    clearAuthCookies(res);
    return res.status(401).json({ message: 'Refresh token invalid or expired.' });
  }
});

// POST /api/auth/logout
const clearAuthCookies = (res) => {
  res.cookie('access_token', '', { maxAge: 0, httpOnly: true });
  res.cookie('refresh_token', '', { maxAge: 0, httpOnly: true });
};

router.post('/logout', (req, res) => {
  clearAuthCookies(res);
  res.json({ message: 'Logged out.' });
});

module.exports = router;
