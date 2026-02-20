const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { authStrictLimiter } = require('../middleware/security');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

    // Validation
    const errors = {};
    if (!name || name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters.';
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Validation failed.', errors });
    }

    // Check existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already registered.' });
    }

    const user = await User.create({ name: name.trim(), email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      token,
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
});

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

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
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
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
