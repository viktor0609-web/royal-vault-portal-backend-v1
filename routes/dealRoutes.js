import express from 'express';
import {
  createDeal,
  getAllDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  filterDeals,
  getStarredDeals,
  starDeal,
  unstarDeal,
} from '../controllers/dealController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllDeals); // Get all deals
router.get('/filter', filterDeals); // Filter deals
router.get('/starred', protect, getStarredDeals); // Get user's starred deals
router.get('/:dealId', protect, getDealById); // Get a deal by ID

router.post('/', protect, authorize('admin'), createDeal); // Create a new deal
router.post('/star/:dealId', protect, starDeal); // Star a deal
router.put('/:dealId', protect, authorize('admin'), updateDeal); // Update a deal
router.delete('/star/:dealId', protect, unstarDeal); // Unstar a deal
router.delete('/:dealId', protect, authorize('admin'), deleteDeal); // Delete a deal

export default router;
