import express from 'express';
import {
  getAllPromotionalSmsLists,
} from '../controllers/promotionalSmsListController.js';

const router = express.Router();

// Public route to get all active promotional SMS lists (for dropdowns)
router.get('/', getAllPromotionalSmsLists);

export default router;
