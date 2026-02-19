const rateLimit = require('express-rate-limit');
const validator = require('validator');

// Rate limit configurations
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development'
  });
};

// API rate limiters
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many API requests');
const authLimiter = createRateLimiter(15 * 60 * 1000, 5, 'Too many auth attempts');
const uploadLimiter = createRateLimiter(60 * 60 * 1000, 10, 'Too many uploads');

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema(req.body);
      req.body = validated;
      next();
    } catch (err) {
      res.status(400).json({ message: 'Invalid input: ' + err.message });
    }
  };
};

// Sanitization schemas
const schemas = {
  summary: (data) => {
    if (!data.summary || typeof data.summary !== 'string') {
      throw new Error('Summary must be a non-empty string');
    }
    return {
      ...data,
      summary: validator.trim(data.summary).substring(0, 5000)
    };
  },

  task: (data) => {
    if (!data.description || typeof data.description !== 'string') {
      throw new Error('Task description required');
    }
    if (data.owner && !validator.isEmail(data.owner) && data.owner.length > 100) {
      throw new Error('Invalid owner');
    }
    if (data.deadline && !validator.isISO8601(data.deadline)) {
      throw new Error('Invalid deadline date');
    }
    if (data.priority && !['High', 'Medium', 'Low'].includes(data.priority)) {
      throw new Error('Invalid priority');
    }

    return {
      description: validator.trim(data.description).substring(0, 500),
      owner: data.owner ? validator.trim(data.owner).substring(0, 100) : '',
      deadline: data.deadline || null,
      priority: data.priority || 'Medium',
      status: data.status || 'Pending'
    };
  },

  email: (email) => {
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email address');
    }
    return validator.normalizeEmail(email);
  },

  rawText: (text) => {
    if (typeof text !== 'string' || text.length < 50) {
      throw new Error('Text must be at least 50 characters');
    }
    return validator.trim(text).substring(0, 100000);
  }
};

// CORS security headers
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'");
  next();
};

// API key validation
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  validateInput,
  schemas,
  securityHeaders,
  validateApiKey
};
