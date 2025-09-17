import express from 'express';
import {
  // CourseGroup routes
  createCourseGroup,
  getAllCourseGroups,
  getCourseGroupById,
  updateCourseGroup,
  deleteCourseGroup,
  
  // Course routes
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  
  // Lecture routes
  createLecture,
  getAllLectures,
  getLectureById,
  updateLecture,
  deleteLecture,
  completeLecture,
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// ------------------ CourseGroup Routes ------------------

// Create a new CourseGroup (only admins)
router.post('/groups', protect, authorize('admin'), createCourseGroup);

// Get all CourseGroups (any logged-in user)
router.get('/groups', protect, getAllCourseGroups);

// Get a single CourseGroup by ID
router.get('/groups/:id', protect, getCourseGroupById);

// Update a CourseGroup (only admins)
router.put('/groups/:id', protect, authorize('admin'), updateCourseGroup);

// Delete a CourseGroup (only admins)
router.delete('/groups/:id', protect, authorize('admin'), deleteCourseGroup);

// ------------------ Course Routes ------------------

// Create a new Course (only admins)
router.post('/courses/:groupId', protect, authorize('admin'), createCourse);

// Get all Courses (any logged-in user)
router.get('/courses', protect, getAllCourses);

// Get a single Course by ID
router.get('/courses/:id', protect, getCourseById);

// Update a Course (only admins)
router.put('/courses/:id', protect, authorize('admin'), updateCourse);

// Delete a Course (only admins)
router.delete('/courses/:id', protect, authorize('admin'), deleteCourse);

// ------------------ Lecture Routes ------------------

// Create a new Lecture (only admins)
router.post('/lectures', protect, authorize('admin'), createLecture);

// Get all Lectures (any logged-in user)
router.get('/lectures', protect, getAllLectures);

// Get a single Lecture by ID
router.get('/lectures/:id', protect, getLectureById);

// Update a Lecture (only admins)
router.put('/lectures/:id', protect, authorize('admin'), updateLecture);

// Delete a Lecture (only admins)
router.delete('/lectures/:id', protect, authorize('admin'), deleteLecture);

// Mark Lecture as completed by a User (any logged-in user)
router.post('/lectures/:id/complete', protect, completeLecture);

export default router;