import express from 'express';
import { createType, getAllTypes, getTypeById, updateType, deleteType } from '../controllers/typeController.js';

const router = express.Router();

router.post('/', createType);  // Create a new type
router.get('/', getAllTypes);  // Get all types
router.get('/:typeId', getTypeById);  // Get a type by ID
router.put('/:typeId', updateType);  // Update a type
router.delete('/:typeId', deleteType);  // Delete a type

export default router;
