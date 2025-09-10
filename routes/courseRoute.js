import express from 'express';
import {
  createCourseGroup,
  getAllCourseGroups,
  getCourseGroupById,
  addCourseToGroup,
  addLectureToCourse,
  completeLecture,
  updateCourseGroup,
  updateCourse,
  updateLecture,
  deleteCourseGroup,
  deleteCourse,
  deleteLecture,
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js'; // your JWT + role middleware

const router = express.Router();

// ------------------ CourseGroup APIs ------------------

// Create a new CourseGroup (only admins)
router.post('/', protect, authorize('admin'), createCourseGroup);

// Get all CourseGroups (any logged-in user)
router.get('/', protect, getAllCourseGroups);

// Get a single CourseGroup by ID
router.get('/:id', protect, getCourseGroupById);

// Update a CourseGroup (only admins)
router.put('/:id', protect, authorize('admin'), updateCourseGroup);

// Delete a CourseGroup (only admins)
router.delete('/:id', protect, authorize('admin'), deleteCourseGroup);

// ------------------ Course APIs ------------------

// Add a Course to a CourseGroup (only admins)
router.post('/:id/courses', protect, authorize('admin'), addCourseToGroup);

// Update a Course inside a CourseGroup (only admins)
router.put('/:courseId/courses', protect, authorize('admin'), updateCourse);

// Delete a Course (only admins)
router.delete('/:courseId/courses', protect, authorize('admin'), deleteCourse);

// ------------------ Lecture APIs ------------------

// Add a Lecture to a Course (only admins)
router.post('/:courseId/lectures', protect, authorize('admin'), addLectureToCourse);

// Update a Lecture inside a Course (only admins)
router.put('/:lectureId/lectures', protect, authorize('admin'), updateLecture);

// Delete a Lecture (only admins)
router.delete('/:lectureId/lectures', protect, authorize('admin'), deleteLecture);

// Mark Lecture as completed by a User (any logged-in user)
router.post('/:lectureId/lectures/complete', protect, completeLecture);

export default router;
