import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  // Admin functions
  getAllWebinars,
  getWebinarById,
  createWebinar,
  updateWebinar,
  deleteWebinar,
  endWebinar,
  viewAttendees,
  adminMarkAsAttended,
  adminMarkAsMissed,
  // User functions
  getPublicWebinars,
  getPublicWebinarById,
  registerForWebinar,
  markAsAttended,
  unregisterFromWebinar,
  isValidEmailAddress
} from '../controllers/webinarController.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.get('/public', getPublicWebinars); // Get all public webinars
router.get('/public/:webinarId', getPublicWebinarById); // Get public webinar by ID
router.post('/isValidEmailAddress', isValidEmailAddress);

// ==================== USER ROUTES ====================
router.post('/:webinarId/register', protect, registerForWebinar); // Register user for a webinar
router.post('/:webinarId/attend', protect, markAsAttended); // Mark user as attended for a webinar
router.delete('/:webinarId/unregister', protect, unregisterFromWebinar); // Unregister user from a webinar

// ==================== ADMIN ROUTES ====================
router.get('/admin', protect, authorize('admin'), getAllWebinars); // Get all webinars for admin
router.get('/user/:webinarId', getWebinarById); // Get webinar by ID for admin
router.post('/admin', protect, authorize('admin'), createWebinar); // Create a new webinar
router.put('/admin/:webinarId', protect, authorize('admin'), updateWebinar); // Update an existing webinar
router.delete('/admin/:webinarId', protect, authorize('admin'), deleteWebinar); // Delete a webinar
router.post('/admin/:webinarId/end', protect, authorize('admin'), endWebinar); // End/Finish a webinar
router.get('/admin/:webinarId/attendees', viewAttendees); // View all attendees for a specific webinar
router.post('/admin/:webinarId/user/:userId/attend', protect, authorize('admin'), adminMarkAsAttended); // Mark a user as attended for a specific webinar
router.post('/admin/:webinarId/user/:userId/missed', protect, authorize('admin'), adminMarkAsMissed); // Mark a user as missed for a specific webinar

export default router;
