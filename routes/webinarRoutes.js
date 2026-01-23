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
  // User functions
  getPublicWebinars,
  getPublicWebinarById,
  registerForWebinar,
  markAsAttended,
  markAsWatched,
  unregisterFromWebinar,
  isValidEmailAddress,
  setWebinarOnRecording,
  getDownloadLink,
  // CTA functions
  activateCta,
  deactivateCta,
  getActiveCtas,
  testSendReminder
} from '../controllers/webinarController.js';
import {
  saveMessage,
  getMessages,
  clearMessages,
  pinMessage,
  unpinMessage,
  getPinnedMessages
} from '../controllers/chatController.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.get('/public', getPublicWebinars); // Get all public webinars
router.get('/public/:webinarId', getPublicWebinarById); // Get public webinar by ID
router.post('/isValidEmailAddress', isValidEmailAddress);

// ==================== USER ROUTES ====================
router.post('/:webinarId/register', protect, registerForWebinar); // Register user for a webinar
router.post('/:webinarId/attend', protect, markAsAttended); // Mark user as attended for a webinar
router.post('/:webinarId/watch', protect, markAsWatched); // Mark user as watched for a webinar (only if not already attended)
router.delete('/:webinarId/unregister', protect, unregisterFromWebinar); // Unregister user from a webinar

// ==================== CHAT ROUTES ====================
router.post('/:webinarId/chat', saveMessage); // Save a chat message (public, but should include sender info)
router.get('/:webinarId/chat', getMessages); // Get all chat messages for a webinar (public)
router.delete('/:webinarId/chat', clearMessages); // Clear chat messages (admin only) but currently public
router.get('/:webinarId/chat/pinned', getPinnedMessages); // Get all pinned messages for a webinar (public)
router.post('/:webinarId/chat/:messageId/pin', pinMessage); // Pin a chat message (public)
router.post('/:webinarId/chat/:messageId/unpin', unpinMessage); // Unpin a chat message (public)

// ==================== CTA ROUTES ====================
router.get('/:webinarId/cta/active', getActiveCtas); // Get active CTA indices for a webinar (public)
router.post('/:webinarId/cta/:ctaIndex/activate', activateCta); // Activate a CTA (public)
router.post('/:webinarId/cta/:ctaIndex/deactivate', deactivateCta); // Deactivate a CTA (public)

// ==================== ADMIN ROUTES ====================
router.get('/admin', protect, authorize('admin'), getAllWebinars); // Get all webinars for admin
router.get('/admin/:webinarId', getWebinarById); // Get webinar by ID for admin
router.post('/admin', protect, authorize('admin'), createWebinar); // Create a new webinar
router.put('/admin/:webinarId', protect, authorize('admin'), updateWebinar); // Update an existing webinar
router.delete('/admin/:webinarId', protect, authorize('admin'), deleteWebinar); // Delete a webinar
router.post('/admin/:webinarId/end', protect, authorize('admin'), endWebinar); // End/Finish a webinar
router.get('/admin/:webinarId/attendees', protect, authorize('admin'), viewAttendees); // View all attendees for a specific webinar
router.post('/admin/:webinarId/user/:userId/attend', protect, authorize('admin'), adminMarkAsAttended); // Mark a user as attended for a specific webinar
router.post('/admin/:webinarId/test-reminder', protect, authorize('admin'), testSendReminder); // Test reminder email (admin only)
router.post('/admin/:slug/on-recording', setWebinarOnRecording); // Set webinar on recording
router.get('/admin/:rawRecordingId/download-link', getDownloadLink); // Get download link for a recording

export default router;
