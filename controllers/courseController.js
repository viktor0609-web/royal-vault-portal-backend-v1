import { Course, CourseGroup } from "../models/Course.js"; // Assuming model path is correct
import mongoose from 'mongoose';

// Create a new Course Group
export const createCourseGroup = async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    const createdBy = req.user._id; // assuming user is available in the request (middleware)

    const newCourseGroup = new CourseGroup({
      title,
      description,
      icon,
      createdBy,
    });

    await newCourseGroup.save();
    res.status(201).json({ message: 'Course Group created successfully', data: newCourseGroup });
  } catch (error) {
    res.status(500).json({ message: 'Error creating Course Group', error: error.message });
  }
};

// Get all Course Groups
export const getAllCourseGroups = async (req, res) => {
  try {
    const courseGroups = await CourseGroup.find().populate('createdBy', 'name email');
    res.status(200).json({ message: 'Course Groups fetched successfully', data: courseGroups });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Course Groups', error: error.message });
  }
};

// Create a new Course
export const createCourse = async (req, res) => {
  try {
    const { groupId, title, description, url, pdfUrl } = req.body;
    const createdBy = req.user._id; // assuming user is available in the request (middleware)

    // Check if the group exists
    const courseGroup = await CourseGroup.findById(groupId);
    if (!courseGroup) {
      return res.status(400).json({ message: 'Course Group not found' });
    }

    const newCourse = new Course({
      group: groupId,
      title,
      description,
      url,
      pdfUrl,
      createdBy,
    });

    await newCourse.save();
    res.status(201).json({ message: 'Course created successfully', data: newCourse });
  } catch (error) {
    res.status(500).json({ message: 'Error creating Course', error: error.message });
  }
};

// Get all Courses by Group
export const getCoursesByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const courses = await Course.find({ group: groupId }).populate('createdBy', 'name email').populate('group', 'title');
    res.status(200).json({ message: 'Courses fetched successfully', data: courses });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Courses', error: error.message });
  }
};

// Get a specific Course
export const getCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate('createdBy', 'name email').populate('group', 'title');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ message: 'Course fetched successfully', data: course });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Course', error: error.message });
  }
};

// Update Course details
export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, url, pdfUrl } = req.body;
    
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { title, description, url, pdfUrl },
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ message: 'Course updated successfully', data: updatedCourse });
  } catch (error) {
    res.status(500).json({ message: 'Error updating Course', error: error.message });
  }
};

// Delete Course
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const deletedCourse = await Course.findByIdAndDelete(courseId);

    if (!deletedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting Course', error: error.message });
  }
};

// Mark course as completed by a user
export const markCourseAsCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id; // assuming user is available in the request (middleware)

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.completedBy.includes(userId)) {
      return res.status(400).json({ message: 'You have already completed this course' });
    }

    course.completedBy.push(userId);
    await course.save();

    res.status(200).json({ message: 'Course marked as completed', data: course });
  } catch (error) {
    res.status(500).json({ message: 'Error marking course as completed', error: error.message });
  }
};

// Get all users who completed the course
export const getUsersCompletedCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate('completedBy', 'name email');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ message: 'Users who completed the course', data: course.completedBy });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching completed users', error: error.message });
  }
};
