import express from 'express';
import {
  createSubCategory,
  getAllSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
} from '../controllers/subcategoryController.js';

const router = express.Router();

// Create a new subcategory
router.post('/', createSubCategory);

// Get all subcategories
router.get('/', getAllSubCategories);

// Get a single subcategory by ID
router.get('/:subCategoryId', getSubCategoryById);

// Update a subcategory by ID
router.put('/:subCategoryId', updateSubCategory);

// Delete a subcategory by ID
router.delete('/:subCategoryId', deleteSubCategory);

export default router;
