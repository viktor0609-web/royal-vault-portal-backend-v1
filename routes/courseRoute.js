import express from 'express';
import {
  createCourseGroup,
  getAllCourseGroups,
  createCourse,
  getCoursesByGroup,
  getCourse,
  updateCourse,
  deleteCourse,
  markCourseAsCompleted,
  getUsersCompletedCourse
} from '../controllers/courseController.js'; // Import controller functions

import { protect } from '../middleware/authMiddleware.js'; // Assuming you have some auth middleware

const router = express.Router();

// Course Group Routes
router.post('/course-group', protect, createCourseGroup); // Create a new Course Group
router.get('/course-groups', getAllCourseGroups); // Get all Course Groups

// Course Routes
router.post('/', protect, createCourse); // Create a new Course
router.get('/group/:groupId', getCoursesByGroup); // Get all courses for a group
router.get('/:courseId', getCourse); // Get a specific course by ID
router.put('/:courseId', protect, updateCourse); // Update a course
router.delete('/:courseId', protect, deleteCourse); // Delete a course

// Mark Course as Completed
router.post('/:courseId/complete', protect, markCourseAsCompleted); // Mark course as completed

// Get users who completed a specific course
router.get('/:courseId/completed-users', getUsersCompletedCourse); // Get all users who completed the course

export default router;
