import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
  registerForWebinar, 
  markAsAttended 
} from '../controllers/userWebinarController.js';
import { 
  createWebinar, 
  updateWebinar, 
  deleteWebinar, 
  viewAttendees, 
  adminMarkAsAttended 
} from '../controllers/adminWebinarController.js';

const router = express.Router();

// User routes
router.post('/:webinarId/register', protect, registerForWebinar); // Register user for a webinar
router.post('/:webinarId/attend', protect, markAsAttended); // Mark user as attended for a webinar

// Admin routes
router.get('/admin/:webinarId/attendees', protect, authorize('admin'), viewAttendees); // View all attendees for a specific webinar
router.post('/admin/create', protect, authorize('admin'), createWebinar); // Create a new webinar
router.put('/admin/:webinarId/update', protect, authorize('admin'), updateWebinar); // Update an existing webinar
router.delete('/admin/:webinarId/delete', protect, authorize('admin'), deleteWebinar); // Delete a webinar
router.post('/admin/:webinarId/user/:userId/attend', protect, authorize('admin'), adminMarkAsAttended); // Mark a user as attended for a specific webinar

export default router;
