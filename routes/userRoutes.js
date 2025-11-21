import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  toggleUserVerification,
  changeUserRole,
  getUserStatistics,
  bulkUpdateUsers,
  bulkDeleteUsers,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Statistics route (Admin only)
router.get('/statistics', authorize('admin'), getUserStatistics);

// Get all users with pagination, filtering, and sorting (Admin only)
router.get('/', authorize('admin'), getAllUsers);

// Get user by ID (Admin can get any, user can get own)
router.get('/:userId', (req, res, next) => {
  // Allow users to get their own profile
  if (req.user.id === req.params.userId || req.user.role === 'admin') {
    return getUserById(req, res, next);
  }
  return res.status(403).json({ message: 'Forbidden: insufficient rights' });
});

// Create new user (Admin only)
router.post('/', authorize('admin'), createUser);

// Update user (Admin can update any, user can update own)
router.put('/:userId', updateUser);

// Delete user (Admin only)
router.delete('/:userId', authorize('admin'), deleteUser);

// Reset user password (Admin only)
router.post('/:userId/reset-password', authorize('admin'), resetUserPassword);

// Toggle user verification status (Admin only)
router.patch('/:userId/verification', authorize('admin'), toggleUserVerification);

// Change user role (Admin only)
router.patch('/:userId/role', authorize('admin'), changeUserRole);

// Bulk operations (Admin only)
router.post('/bulk/update', authorize('admin'), bulkUpdateUsers);
router.post('/bulk/delete', authorize('admin'), bulkDeleteUsers);

export default router;

