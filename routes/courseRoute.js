import express from 'express';
import {
  createCourseGroup,
  getAllCourseGroups,
  getCourseGroupById,
  updateCourseGroup,
  deleteCourseGroup,
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  createLecture,
  getAllLectures,
  getLectureById,
  updateLecture,
  deleteLecture,
  completeLecture,
  saveYouTubeVideo,
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// CourseGroup routes
router.get('/groups', getAllCourseGroups); // Get all course groups
router.get('/groups/:id', getCourseGroupById); // Get a course group by ID
router.post('/groups', protect, authorize('admin'), createCourseGroup); // Create a new course group
router.put('/groups/:id', protect, authorize('admin'), updateCourseGroup); // Update a course group
router.delete('/groups/:id', protect, authorize('admin'), deleteCourseGroup); // Delete a course group

// Course routes
router.get('/courses', getAllCourses); // Get all courses
router.get('/courses/:id', getCourseById); // Get a course by ID
router.post('/courses/:groupId', protect, authorize('admin'), createCourse); // Create a new course
router.put('/courses/:id', protect, authorize('admin'), updateCourse); // Update a course
router.delete('/courses/:id', protect, authorize('admin'), deleteCourse); // Delete a course

// Lecture routes
router.get('/lectures', protect, getAllLectures); // Get all lectures
router.get('/lectures/:id', protect, getLectureById); // Get a lecture by ID
router.post('/lectures', protect, authorize('admin'), createLecture); // Create a new lecture
router.put('/lectures/:id', protect, authorize('admin'), updateLecture); // Update a lecture
router.delete('/lectures/:id', protect, authorize('admin'), deleteLecture); // Delete a lecture
router.post('/lectures/:id/complete', protect, completeLecture); // Mark a lecture as completed
router.post('/lectures/:lectureId/youtube', protect, authorize('admin'), saveYouTubeVideo); // Save a YouTube video URL to a lecture

export default router;