import express from 'express';
import {
  getUserOrders,
  getPayments,
  getSubscriptions,
  getAdminUserOrders,
  getAdminUserSubscriptions,
} from '../controllers/ordersController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user's orders (deals)
router.get('/', getUserOrders);

// Get payments (optionally filtered by dealId)
router.get('/payments', getPayments);

// Get subscriptions
router.get('/subscriptions', getSubscriptions);

// Admin routes - Get orders for a specific user
router.get('/admin/:userId', authorize('admin'), getAdminUserOrders);

// Admin routes - Get subscriptions for a specific user
router.get('/admin/:userId/subscriptions', authorize('admin'), getAdminUserSubscriptions);

export default router;

