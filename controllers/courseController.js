import { CourseGroup } from '../models/Course.js';
import User from '../models/User.js';

// ------------------ CourseGroup CRUD ------------------

// Create a new CourseGroup
export const createCourseGroup = async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    const createdBy = req.user._id;
    const courseGroup = await CourseGroup.create({ title, description, icon, createdBy });
    res.status(201).json(courseGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all CourseGroups (with nested courses & lectures)
export const getAllCourseGroups = async (req, res) => {
  try {
    const courseGroups = await CourseGroup.find()
      .populate('createdBy', 'name email') // populate user who created
      .lean(); // convert to plain object
    res.json(courseGroups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single CourseGroup by ID (with nested courses & lectures)
export const getCourseGroupById = async (req, res) => {
  try {
    const courseGroup = await CourseGroup.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();
    if (!courseGroup) return res.status(404).json({ message: 'CourseGroup not found' });
    res.json(courseGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update CourseGroup
export const updateCourseGroup = async (req, res) => {
  try {
    const updated = await CourseGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'CourseGroup not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete CourseGroup
export const deleteCourseGroup = async (req, res) => {
  try {
    const deleted = await CourseGroup.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'CourseGroup not found' });
    res.json({ message: 'CourseGroup deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------ Course CRUD ------------------

// Add a Course to a CourseGroup
export const addCourseToGroup = async (req, res) => {
  try {
    const { title, description, url } = req.body;
    const courseGroup = await CourseGroup.findById(req.params.id);
    if (!courseGroup) return res.status(404).json({ message: 'CourseGroup not found' });

    courseGroup.courses.push({ title, description, url });
    await courseGroup.save();
    res.status(201).json(courseGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a Course
export const updateCourse = async (req, res) => {
  try {
    const courseGroup = await CourseGroup.findOne({ 'courses._id': req.params.courseId });
    if (!courseGroup) return res.status(404).json({ message: 'Course not found' });

    const course = courseGroup.courses.id(req.params.courseId);
    Object.assign(course, req.body);
    await courseGroup.save();
    res.json(courseGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a Course
export const deleteCourse = async (req, res) => {
  try {
    const courseGroup = await CourseGroup.findOne({ 'courses._id': req.params.courseId });
    if (!courseGroup) return res.status(404).json({ message: 'Course not found' });

    courseGroup.courses.id(req.params.courseId).remove();
    await courseGroup.save();
    res.json({ message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------ Lecture CRUD ------------------

// Add a Lecture to a Course
export const addLectureToCourse = async (req, res) => {
  try {
    const { title, description, videoUrl, pdfUrl } = req.body;
    const courseGroup = await CourseGroup.findOne({ 'courses._id': req.params.courseId });
    if (!courseGroup) return res.status(404).json({ message: 'Course not found' });

    const course = courseGroup.courses.id(req.params.courseId);
    course.lectures.push({ title, description, videoUrl, pdfUrl });
    await courseGroup.save();
    res.status(201).json(courseGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a Lecture
export const updateLecture = async (req, res) => {
  try {
    const courseGroup = await CourseGroup.findOne({ 'courses.lectures._id': req.params.lectureId });
    if (!courseGroup) return res.status(404).json({ message: 'Lecture not found' });

    const lecture = courseGroup.courses
      .flatMap((c) => c.lectures)
      .find((l) => l._id.toString() === req.params.lectureId);

    Object.assign(lecture, req.body);
    await courseGroup.save();
    res.json(courseGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a Lecture
export const deleteLecture = async (req, res) => {
  try {
    const courseGroup = await CourseGroup.findOne({ 'courses.lectures._id': req.params.lectureId });
    if (!courseGroup) return res.status(404).json({ message: 'Lecture not found' });

    for (const course of courseGroup.courses) {
      const lecture = course.lectures.id(req.params.lectureId);
      if (lecture) lecture.remove();
    }

    await courseGroup.save();
    res.json({ message: 'Lecture deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------ Lecture Completion ------------------

// Mark Lecture as completed by a User
export const completeLecture = async (req, res) => {
  try {
    const userId = req.user._id;

    const courseGroup = await CourseGroup.findOne({ 'courses.lectures._id': req.params.lectureId });
    if (!courseGroup) return res.status(404).json({ message: 'Lecture not found' });

    const lecture = courseGroup.courses
      .flatMap((c) => c.lectures)
      .find((l) => l._id.toString() === req.params.lectureId);

    if (!lecture.completedBy.includes(userId)) {
      lecture.completedBy.push(userId);
      await courseGroup.save();
    }

    res.json({ message: 'Lecture marked as completed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
