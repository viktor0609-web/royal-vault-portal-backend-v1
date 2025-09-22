import express from 'express';
import webinarRoutes from './webinarRoutes.js';
import authRoutes from './authRoutes.js';
import courseRoutes from './courseRoute.js';

import dealRoutes from './dealRoutes.js';
import requirementRoutes from './requirementRoutes.js';
import sourceRoutes from './sourceRoutes.js';
import strategyRoutes from './strategyRoutes.js';
import typeRoutes from './typeRoutes.js';   
import categoryRoutes from './categoryRoutes.js'; // Import category routes
import subCategoryRoutes from './subCategoryRoutes.js'; // Import sub-category routes
import uploadRoutes from './uploadRoutes.js'; // Import upload routes

const router = express.Router();

// Use the routes for different API endpoints
router.use('/auth', authRoutes);          // All authentication-related routes

router.use('/webinars', webinarRoutes);  // All webinar-related routes
router.use('/courses', courseRoutes); // Course-related routes
router.use('/deals', dealRoutes); // Deal-related routes

// I must fix this part of the code but it is not important for now
router.use('/categories', categoryRoutes); // Category-related routes
router.use('/sub-categories', subCategoryRoutes); // Sub-category-related routes    
router.use('/types', typeRoutes); // Type-related routes
router.use('/sources', sourceRoutes); // Source-related routes
router.use('/requirements', requirementRoutes); // Requirement-related routes
router.use('/strategies', strategyRoutes); // Strategy-related routes

router.use('/upload', uploadRoutes); // Upload-related routes

export default router;
