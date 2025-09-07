import express from 'express';
import { createStrategy, getAllStrategies, getStrategyById, updateStrategy, deleteStrategy } from '../controllers/strategyController.js';

const router = express.Router();

router.post('/', createStrategy);  // Create a new strategy
router.get('/', getAllStrategies);  // Get all strategies
router.get('/:strategyId', getStrategyById);  // Get a strategy by ID
router.put('/:strategyId', updateStrategy);  // Update a strategy
router.delete('/:strategyId', deleteStrategy);  // Delete a strategy

export default router;
