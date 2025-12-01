import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let token;
export const protect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed or expired' });
    }
  }
  return res.status(401).json({ message: 'Not authorized, no token' });
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient rights' });
    }
    next();
  };
};

export const authorizeSupaadmin = () => {
  return (req, res, next) => {
    if (!req.user || !req.user.supaadmin) {
      return res.status(403).json({ message: 'Forbidden: Only supaadmin can perform this action' });
    }
    next();
  };
};

// Optional protect middleware - sets req.user if token is present, but doesn't block if token is missing
// Useful for routes that should work for both authenticated and unauthenticated users
export const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // If token is invalid, just continue without setting req.user
      // This allows the route to work for unauthenticated users
      req.user = null;
    }
  }
  // If no token, continue without setting req.user
  next();
};