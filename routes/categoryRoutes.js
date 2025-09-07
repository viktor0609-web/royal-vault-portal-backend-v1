import express from 'express';
import { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory } from '../controllers/categoryController.js';

const router = express.Router();

router.post('/', createCategory);  // Create a new category
router.get('/', getAllCategories);  // Get all categories
router.get('/:categoryId', getCategoryById);  // Get a category by ID
router.put('/:categoryId', updateCategory);  // Update a category
router.delete('/:categoryId', deleteCategory);  // Delete a category

export default router;
