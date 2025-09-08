import express from 'express';
import { createSubCategory, getAllSubCategories, getSubCategoryById, updateSubCategory, deleteSubCategory } from '../controllers/subCategoryController.js';

const router = express.Router();

router.post('/', createSubCategory);  // Create a new subcategory
router.get('/', getAllSubCategories);  // Get all subcategories
router.get('/:subCategoryId', getSubCategoryById);  // Get a subcategory by ID
router.put('/:subCategoryId', updateSubCategory);  // Update a subcategory
router.delete('/:subCategoryId', deleteSubCategory);  // Delete a subcategory

export default router;
