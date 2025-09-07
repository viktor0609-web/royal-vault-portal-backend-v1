import express from 'express';
import { createRequirement, getAllRequirements, getRequirementById, updateRequirement, deleteRequirement } from '../controllers/requirementController.js';

const router = express.Router();

router.post('/', createRequirement);  // Create a new requirement
router.get('/', getAllRequirements);  // Get all requirements
router.get('/:requirementId', getRequirementById);  // Get a requirement by ID
router.put('/:requirementId', updateRequirement);  // Update a requirement
router.delete('/:requirementId', deleteRequirement);  // Delete a requirement

export default router;
