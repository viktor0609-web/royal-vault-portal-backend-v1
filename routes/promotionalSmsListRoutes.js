import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getAllPromotionalSmsLists,
  createPromotionalSmsList,
  updatePromotionalSmsList,
  deletePromotionalSmsList,
} from '../controllers/promotionalSmsListController.js';

const router = express.Router();

// Public route to get all active promotional SMS lists (for dropdowns)
router.get('/', getAllPromotionalSmsLists);

// Admin routes
router.post('/', protect, authorize('admin'), createPromotionalSmsList);
router.put('/:listId', protect, authorize('admin'), updatePromotionalSmsList);
router.delete('/:listId', protect, authorize('admin'), deletePromotionalSmsList);

export default router;
