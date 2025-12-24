import express from 'express';
import {
  getUserOrders,
  getPayments,
  getSubscriptions,
} from '../controllers/ordersController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user's orders (deals)
router.get('/', getUserOrders);

// Get payments (optionally filtered by dealId)
router.get('/payments', getPayments);

// Get subscriptions
router.get('/subscriptions', getSubscriptions);

export default router;

