import express from 'express';
import {
  registerUser,
  verifyEmail,
  loginUser,
  logoutUser,
  getUser,
  getProfile,
  forgotPassword,
  resetPassword,
  updateProfile,
  exchangeViewAsCode,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify/:token', verifyEmail);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Exchange one-time "View as User" code for token (no auth - used by new tab)
router.post('/view-as/exchange', exchangeViewAsCode);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/user', protect, getUser); // MongoDB only - for AuthContext
router.get('/profile', protect, getProfile); // HubSpot + MongoDB - for Profile page
router.put('/profile', protect, updateProfile); // Update user profile
router.get('/admin', protect, authorize('admin'), (req, res) => {
  res.json({ message: 'Welcome Admin! You have special access.' });
});

export default router;
