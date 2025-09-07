import express from 'express';
import { createSource, getAllSources, getSourceById, updateSource, deleteSource } from '../controllers/sourceController.js';

const router = express.Router();

router.post('/', createSource);  // Create a new source
router.get('/', getAllSources);  // Get all sources
router.get('/:sourceId', getSourceById);  // Get a source by ID
router.put('/:sourceId', updateSource);  // Update a source
router.delete('/:sourceId', deleteSource);  // Delete a source

export default router;
