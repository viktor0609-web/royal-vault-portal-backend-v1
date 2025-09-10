import express from 'express';
import {
  createDeal,
  getAllDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  filterDeals,
} from '../controllers/dealController.js';

const router = express.Router();

router.post('/', createDeal); // Create a new deal
router.get('/', getAllDeals); // Get all deals
router.get('/filter', filterDeals); // Filter deals
router.get('/:dealId', getDealById); // Get a deal by ID
router.put('/:dealId', updateDeal); // Update a deal
router.delete('/:dealId', deleteDeal); // Delete a deal

export default router;
