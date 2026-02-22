import express from 'express';
import {
  createCourseGroup,
  getAllCourseGroups,
  getCourseGroupById,
  reorderCourseGroups,
  updateCourseGroup,
  deleteCourseGroup,
  reorderCoursesInGroup,
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  moveCourseToGroup,
  deleteCourse,
  reorderLecturesInCourse,
  createLecture,
  getAllLectures,
  getLectureById,
  updateLecture,
  deleteLecture,
  moveLectureToCourse,
  completeLecture,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../controllers/courseController.js';
import { protect, authorize, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Course categories (for grouping course groups)
router.get('/categories', getAllCategories);
router.post('/categories', protect, authorize('admin'), createCategory);
router.put('/categories/reorder', protect, authorize('admin'), reorderCategories);
router.put('/categories/:id', protect, authorize('admin'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);

// CourseGroup routes
router.get('/groups', optionalProtect, getAllCourseGroups); // Get all course groups (optional auth for HubSpot list filtering)
router.get('/groups/:id', optionalProtect, getCourseGroupById); // Get a course group by ID (optional auth for HubSpot list filtering)
router.post('/groups', protect, authorize('admin'), createCourseGroup); // Create a new course group
router.put('/groups/reorder', protect, authorize('admin'), reorderCourseGroups); // Reorder groups (public display)
router.put('/groups/:id', protect, authorize('admin'), updateCourseGroup); // Update a course group
router.put('/groups/:id/courses/reorder', protect, authorize('admin'), reorderCoursesInGroup); // Reorder courses (public display)
router.delete('/groups/:id', protect, authorize('admin'), deleteCourseGroup); // Delete a course group

// Course routes
router.get('/courses', getAllCourses); // Get all courses
router.get('/courses/:id', getCourseById); // Get a course by ID
router.post('/courses/:groupId', protect, authorize('admin'), createCourse); // Create a new course
router.put('/courses/:id', protect, authorize('admin'), updateCourse); // Update a course
router.post('/courses/:id/move', protect, authorize('admin'), moveCourseToGroup); // Move course to another group
router.put('/courses/:id/lectures/reorder', protect, authorize('admin'), reorderLecturesInCourse); // Reorder lectures (public display)
router.delete('/courses/:id', protect, authorize('admin'), deleteCourse); // Delete a course

// Lecture routes
router.get('/lectures', protect, getAllLectures); // Get all lectures
router.get('/lectures/:id', protect, getLectureById); // Get a lecture by ID
router.post('/lectures', protect, authorize('admin'), createLecture); // Create a new lecture
router.put('/lectures/:id', protect, authorize('admin'), updateLecture); // Update a lecture
router.delete('/lectures/:id', protect, authorize('admin'), deleteLecture); // Delete a lecture
router.post('/lectures/:id/move', protect, authorize('admin'), moveLectureToCourse); // Move lecture to another course
router.post('/lectures/:id/complete', protect, completeLecture); // Mark a lecture as completed

export default router;