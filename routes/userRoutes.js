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
  // migrateHubSpotContacts, // Commented out - feature disabled
} from '../controllers/userController.js';
import { protect, authorize, authorizeSupaadmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Migrate HubSpot contacts to database (Supaadmin only) - SSE endpoint
// Commented out - feature disabled
// router.get('/migrate/hubspot', authorizeSupaadmin(), migrateHubSpotContacts);
// router.get('/migrate/hubspot/pause', authorizeSupaadmin(), migrateHubSpotContacts);
// router.get('/migrate/hubspot/resume', authorizeSupaadmin(), migrateHubSpotContacts);
// router.get('/migrate/hubspot/status', authorizeSupaadmin(), migrateHubSpotContacts);

// Statistics route (Supaadmin only)
router.get('/statistics', authorizeSupaadmin(), getUserStatistics);

// Get all users with pagination, filtering, and sorting (Supaadmin only)
router.get('/', authorizeSupaadmin(), getAllUsers);

// Get user by ID (Supaadmin can get any, user can get own)
router.get('/:userId', (req, res, next) => {
  // Allow users to get their own profile, or supaadmin to get any
  if (req.user.id === req.params.userId || (req.user && req.user.supaadmin === true)) {
    return getUserById(req, res, next);
  }
  return res.status(403).json({ message: 'Forbidden: insufficient rights' });
});

// Create new user (Supaadmin only)
router.post('/', authorizeSupaadmin(), createUser);

// Update user (Supaadmin can update any, user can update own)
router.put('/:userId', updateUser);

// Delete user (Supaadmin only)
router.delete('/:userId', authorizeSupaadmin(), deleteUser);

// Reset user password (Supaadmin only)
router.post('/:userId/reset-password', authorizeSupaadmin(), resetUserPassword);

// Toggle user verification status (Supaadmin only)
router.patch('/:userId/verification', authorizeSupaadmin(), toggleUserVerification);

// Change user role (Supaadmin only)
router.patch('/:userId/role', authorizeSupaadmin(), changeUserRole);

// Bulk operations (Supaadmin only)
router.post('/bulk/update', authorizeSupaadmin(), bulkUpdateUsers);
router.post('/bulk/delete', authorizeSupaadmin(), bulkDeleteUsers);



export default router;

