import { CourseGroup, Course, Lecture } from '../models/Course.js';
import User from '../models/User.js';

// ------------------ CourseGroup CRUD ------------------

// Create a new CourseGroup
export const createCourseGroup = async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    
    // Validation
    if (!title || !description || !icon) {
      return res.status(400).json({ message: 'Title, description, and icon are required' });
    }
    
    const createdBy = req.user._id;
    const courseGroup = await CourseGroup.create({ title, description, icon, createdBy });
    await courseGroup.populate('createdBy', 'name email');
    
    res.status(201).json(courseGroup);
  } catch (error) {
    console.log(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to create course group' });
  }
};

// Get all CourseGroups with courses and lectures - OPTIMIZED VERSION
export const getAllCourseGroups = async (req, res) => {
  try {
    const { type, search, fields = 'basic' } = req.query;
    let query = {};
    
    // Build query based on type filter
    if (type === 'courses') {
      query = { _id: { $in: await Course.distinct('courseGroup') } };
    } else if (type === 'bundles') {
      const courseCounts = await Course.aggregate([
        { $group: { _id: '$courseGroup', count: { $sum: 1 } } },
        { $match: { count: { $gte: 2 } } }
      ]);
      query = { _id: { $in: courseCounts.map(c => c._id) } };
    } else if (type === 'content') {
      const courseGroupsWithLectures = await Course.distinct('courseGroup', {
        _id: { $in: await Lecture.distinct('course') }
      });
      query = { _id: { $in: courseGroupsWithLectures } };
    }

    // Define field selection based on query parameter
    let populateFields = 'createdBy';
    if (fields === 'basic') {
      populateFields = { path: 'createdBy', select: 'name email' };
    } else if (fields === 'detailed') {
      populateFields = { path: 'createdBy', select: 'name email' };
    }

    let courseGroups = await CourseGroup.find(query)
      .populate(populateFields)
      .lean();

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchResults = [];
      
      for (const group of courseGroups) {
        let includeGroup = false;
        
        if (searchRegex.test(group.title) || searchRegex.test(group.description)) {
          includeGroup = true;
        }
        
        if (fields === 'detailed' || fields === 'full') {
          const courses = await Course.find({ courseGroup: group._id })
            .populate('lectures', fields === 'full' ? 'title description content videoUrl relatedFiles createdBy createdAt' : 'title description')
            .lean();
          
          for (const course of courses) {
            if (searchRegex.test(course.title) || searchRegex.test(course.description)) {
              includeGroup = true;
            }
            
            if (fields === 'full' && course.lectures) {
              const lecturesWithSearch = course.lectures.filter(lecture =>
                searchRegex.test(lecture.title) || searchRegex.test(lecture.description)
              );
              if (lecturesWithSearch.length > 0) {
                includeGroup = true;
              }
            }
          }
          
          group.courses = courses;
        } else {
          // For basic view, just get course count
          const courseCount = await Course.countDocuments({ courseGroup: group._id });
          group.courses = [{ count: courseCount }];
        }
        
        if (includeGroup) {
          searchResults.push(group);
        }
      }
      
      courseGroups = searchResults;
    } else {
      // If no search, populate based on fields parameter
      if (fields === 'detailed' || fields === 'full') {
        for (const group of courseGroups) {
          const courses = await Course.find({ courseGroup: group._id })
            .populate('lectures', fields === 'full' ? 'title description content videoUrl relatedFiles createdBy createdAt' : 'title description')
            .lean();
          group.courses = courses;
        }
      } else {
        // For basic view, just get course counts
        for (const group of courseGroups) {
          const courseCount = await Course.countDocuments({ courseGroup: group._id });
          group.courses = [{ count: courseCount }];
        }
      }
    }

    res.json(courseGroups);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Get single CourseGroup by ID - OPTIMIZED VERSION
export const getCourseGroupById = async (req, res) => {
  try {
    const { fields = 'full' } = req.query;
    
    const courseGroup = await CourseGroup.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!courseGroup) return res.status(404).json({ message: 'CourseGroup not found' });
    
    // Populate courses and lectures based on fields parameter
    const courses = await Course.find({ courseGroup: courseGroup._id });
    const coursesWithLectures = [];
    
    for (const course of courses) {
      let lectures = [];
      if (fields === 'full' && course.lectures) {
        lectures = await Lecture.find({ _id: { $in: course.lectures } })
          .populate('createdBy', 'name email')
          .populate('completedBy', 'name email')
          .lean();
      } else if (fields === 'detailed' && course.lectures) {
        lectures = await Lecture.find({ _id: { $in: course.lectures } })
          .select('title description videoUrl relatedFiles')
          .lean();
      }
      
      coursesWithLectures.push({
        ...course.toObject(),
        lectures
      });
    }
    
    const result = {
      ...courseGroup.toObject(),
      courses: coursesWithLectures
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update CourseGroup
export const updateCourseGroup = async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    
    // Validation
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ message: 'Title cannot be empty' });
    }
    if (description !== undefined && !description.trim()) {
      return res.status(400).json({ message: 'Description cannot be empty' });
    }
    if (icon !== undefined && !icon.trim()) {
      return res.status(400).json({ message: 'Icon cannot be empty' });
    }
    
    const updated = await CourseGroup.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('createdBy', 'name email');
    if (!updated) return res.status(404).json({ message: 'CourseGroup not found' });
    res.json(updated);
  } catch (error) {
    console.log(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to update course group' });
  }
};

// Delete CourseGroup
export const deleteCourseGroup = async (req, res) => {
  try {
    const courseGroup = await CourseGroup.findById(req.params.id);
    if (!courseGroup) return res.status(404).json({ message: 'CourseGroup not found' });
    
    // Delete all courses in this group
    const courses = await Course.find({ courseGroup: courseGroup._id });
    for (const course of courses) {
      // Delete all lectures referenced by this course
      if (course.lectures && course.lectures.length > 0) {
        await Lecture.deleteMany({ _id: { $in: course.lectures } });
      }
    }
    await Course.deleteMany({ courseGroup: courseGroup._id });
    
    // Delete the course group
    await CourseGroup.findByIdAndDelete(req.params.id);
    res.json({ message: 'CourseGroup and all associated courses and lectures deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------ Course CRUD ------------------

// Create a new Course
export const createCourse = async (req, res) => {
  try {
    const { title, description, lectures = [] } = req.body;
    const courseGroup = req.params.groupId;
    const createdBy = req.user._id;
    
    // Validation
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    // Check if course group exists
    const group = await CourseGroup.findById(courseGroup);
    if (!group) {
      return res.status(404).json({ message: 'Course group not found' });
    }
    
    const course = await Course.create({ 
      title, 
      description, 
      courseGroup,
      lectures,
      createdBy 
    });
    
    await course.populate('createdBy', 'name email');
    await course.populate('courseGroup', 'title description icon');
    
    res.status(201).json(course);
  } catch (error) {
    console.log(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to create course' });
  }
};

// Get all Courses - OPTIMIZED VERSION
export const getAllCourses = async (req, res) => {
  try {
    const { fields = 'basic' } = req.query;
    
    let populateFields = [];
    if (fields === 'basic') {
      populateFields = [
        { path: 'createdBy', select: 'name email' },
        { path: 'courseGroup', select: 'title description icon' }
      ];
    } else if (fields === 'detailed') {
      populateFields = [
        { path: 'createdBy', select: 'name email' },
        { path: 'courseGroup', select: 'title description icon' },
        { path: 'lectures', select: 'title description videoUrl' }
      ];
    } else if (fields === 'full') {
      populateFields = [
        { path: 'createdBy', select: 'name email' },
        { path: 'courseGroup', select: 'title description icon' },
        { path: 'lectures', select: 'title description content videoUrl relatedFiles createdBy createdAt completedBy' }
      ];
    }
    
    const courses = await Course.find()
      .populate(populateFields)
      .lean();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Course by ID - OPTIMIZED VERSION
export const getCourseById = async (req, res) => {
  try {
    const { fields = 'full' } = req.query;
    
    let populateFields = [
      { path: 'createdBy', select: 'name email' },
      { path: 'courseGroup', select: 'title description icon' }
    ];
    
    if (fields === 'full') {
      populateFields.push({ path: 'lectures', select: 'title description content videoUrl relatedFiles createdBy createdAt completedBy' });
    } else if (fields === 'detailed') {
      populateFields.push({ path: 'lectures', select: 'title description videoUrl relatedFiles' });
    } else if (fields === 'basic') {
      populateFields.push({ path: 'lectures', select: 'title description' });
    }
    
    const course = await Course.findById(req.params.id)
      .populate(populateFields);
    
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Course
export const updateCourse = async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('createdBy', 'name email')
      .populate('courseGroup', 'title description icon')
      .populate('lectures', 'title description content videoUrl relatedFiles createdBy createdAt completedBy');
    if (!updated) return res.status(404).json({ message: 'Course not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Course
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    // Delete all lectures referenced by this course
    if (course.lectures && course.lectures.length > 0) {
      await Lecture.deleteMany({ _id: { $in: course.lectures } });
    }
    
    // Delete the course
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course and all associated lectures deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------ Lecture CRUD ------------------

// Create a new Lecture
export const createLecture = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      content,
      videoUrl,
      relatedFiles = [],  
      courseId 
    } = req.body;
    
    console.log('Backend received relatedFiles:', relatedFiles);
    
    
    // Clean relatedFiles to remove any _id fields that might be sent from frontend
    const cleanedRelatedFiles = relatedFiles && relatedFiles.length > 0 ? relatedFiles.map(file => ({
      name: file.name || "",
      url: file.url || "",
      uploadedUrl: file.uploadedUrl || ""
    })) : [];
    
    // Validate related files - each must have either URL or uploadedUrl (not both required)
    for (let i = 0; i < cleanedRelatedFiles.length; i++) {
      const file = cleanedRelatedFiles[i];
      const hasUrl = file.url && file.url.trim() !== '';
      const hasUploadedUrl = file.uploadedUrl && file.uploadedUrl.trim() !== '';
      
      if (!hasUrl && !hasUploadedUrl) {
        return res.status(400).json({ 
          message: `Related file ${i + 1} must have either a URL or uploaded file` 
        });
      }
    }
    
    const createdBy = req.user._id;
    
    // Validation
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    // Video is completely optional - no validation required
    
    console.log('Creating lecture with relatedFiles:', cleanedRelatedFiles);
    
    const lecture = await Lecture.create({ 
      title, 
      description, 
      content,
      videoUrl,
      relatedFiles: cleanedRelatedFiles,
      createdBy
    });
    
    // Add lecture to course's lectures array
    if (courseId) {
      await Course.findByIdAndUpdate(courseId, {
        $push: { lectures: lecture._id }
      });
    }
    
    // Populate the created lecture
    await lecture.populate('createdBy', 'name email');
    
    res.status(201).json(lecture);
  } catch (error) {
    console.log(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to create lecture' });
  }
};

// Get all Lectures
export const getAllLectures = async (req, res) => {
  try {
    const lectures = await Lecture.find()
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email')
      .lean();
    res.json(lectures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Lecture by ID
export const getLectureById = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email');
    
    if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
    res.json(lecture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Lecture
export const updateLecture = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      content,
      videoUrl,
      relatedFiles 
    } = req.body;
    
    // Clean relatedFiles to remove any _id fields that might be sent from frontend
    console.log('Backend received relatedFiles for update:', relatedFiles);
    const cleanedRelatedFiles = relatedFiles && relatedFiles.length > 0 ? relatedFiles.map(file => ({
      name: file.name || "",
      url: file.url || "",
      uploadedUrl: file.uploadedUrl || ""
    })) : (relatedFiles !== undefined ? [] : undefined);
    
    console.log('Cleaned relatedFiles for update:', cleanedRelatedFiles);
    
    // Validate related files - each must have either URL or uploadedUrl (not both required)
    if (cleanedRelatedFiles && cleanedRelatedFiles.length > 0) {
      for (let i = 0; i < cleanedRelatedFiles.length; i++) {
        const file = cleanedRelatedFiles[i];
        const hasUrl = file.url && file.url.trim() !== '';
        const hasUploadedUrl = file.uploadedUrl && file.uploadedUrl.trim() !== '';
        
        if (!hasUrl && !hasUploadedUrl) {
          return res.status(400).json({ 
            message: `Related file ${i + 1} must have either a URL or uploaded file` 
          });
        }
      }
    }
    
    // Validation
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ message: 'Title cannot be empty' });
    }
    
    // Video is completely optional for updates - no validation required
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    // Always update relatedFiles if it's provided (even if empty array)
    if (relatedFiles !== undefined) {
      console.log('Updating relatedFiles with:', cleanedRelatedFiles);
      updateData.relatedFiles = cleanedRelatedFiles || [];
    }
    
    const updated = await Lecture.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email');
    if (!updated) return res.status(404).json({ message: 'Lecture not found' });
    res.json(updated);
  } catch (error) {
    console.log(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to update lecture' });
  }
};

// Delete Lecture
export const deleteLecture = async (req, res) => {
  try {
    const lectureId = req.params.id;
    
    // Remove lecture from all courses that reference it
    await Course.updateMany(
      { lectures: lectureId },
      { $pull: { lectures: lectureId } }
    );
    
    // Delete the lecture
    const deleted = await Lecture.findByIdAndDelete(lectureId);
    if (!deleted) return res.status(404).json({ message: 'Lecture not found' });
    res.json({ message: 'Lecture deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle Lecture completion status for a User
export const completeLecture = async (req, res) => {
  try {
    const userId = req.user._id;
    const lecture = await Lecture.findById(req.params.id);
    
    if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
    
    const isCompleted = lecture.completedBy.includes(userId);
    
    if (isCompleted) {
      // Remove user from completedBy array (uncomplete)
      lecture.completedBy = lecture.completedBy.filter(id => id.toString() !== userId.toString());
      await lecture.save();
      res.json({ message: 'Lecture marked as incomplete', completed: false });
    } else {
      // Add user to completedBy array (complete)
      lecture.completedBy.push(userId);
      await lecture.save();
      res.json({ message: 'Lecture marked as completed', completed: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Save YouTube video URL to a lecture