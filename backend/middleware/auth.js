const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token;
    
    // Try to get token from cookies first (for browser requests)
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }
    // Fall back to Bearer token from Authorization header (for API clients)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided. Authorization denied.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id name email');

    if (!user) {
      return res.status(401).json({ message: 'User not found. Token invalid.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired.' });
  }
};

module.exports = auth;

module.exports = auth;
