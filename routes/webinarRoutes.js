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

// User Routes

// Register user for a webinar (protected route)
router.post('/:webinarId/register', protect, registerForWebinar);

// Mark user as attended for a webinar (protected route)
router.post('/:webinarId/attend', protect, markAsAttended);

// Admin Routes

// Admin creates a new webinar (protected & authorized for admin only)
router.post('/admin/create', protect, authorize('admin'), createWebinar);

// Admin updates an existing webinar (protected & authorized for admin only)
router.put('/admin/:webinarId/update', protect, authorize('admin'), updateWebinar);

// Admin deletes a webinar (protected & authorized for admin only)
router.delete('/admin/:webinarId/delete', protect, authorize('admin'), deleteWebinar);


// Admin views all attendees for a specific webinar (protected & authorized for admin only)
router.get('/admin/:webinarId/attendees', protect, authorize('admin'), viewAttendees);

// Admin marks a user as attended for a specific webinar (protected & authorized for admin only)
router.post('/admin/:webinarId/user/:userId/attend', protect, authorize('admin'), adminMarkAsAttended);

export default router; // Use export default here
