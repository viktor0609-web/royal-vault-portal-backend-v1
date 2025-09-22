import express from 'express';
import {
  createDeal,
  getAllDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  filterDeals,
} from '../controllers/dealController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
  
const router = express.Router();

router.get('/', protect, getAllDeals); // Get all deals
router.get('/filter', protect, filterDeals); // Filter deals
router.get('/:dealId', protect, getDealById); // Get a deal by ID


router.post('/', protect, authorize('admin'), createDeal); // Create a new deal
router.put('/:dealId', protect, authorize('admin'), updateDeal); // Update a deal
router.delete('/:dealId', protect, authorize('admin'), deleteDeal); // Delete a deal

export default router;
