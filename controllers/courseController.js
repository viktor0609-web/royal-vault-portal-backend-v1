import mongoose from 'mongoose';
import { CourseGroup, Course, Lecture } from '../models/Course.js';
import User from '../models/User.js';
import axios from 'axios';

// Helper function to build $project stage from field string
const buildProjectStage = (fieldsString) => {
  const fields = fieldsString.split(' ').filter(f => f.length > 0);
  const project = {};
  fields.forEach(field => {
    project[field] = 1;
  });
  return project;
};

// Helper function to check if a user's email is in any of the specified HubSpot lists
const isUserInHubSpotLists = async (userEmail, listIds) => {
  if (!listIds || listIds.length === 0) {
    return true; // No list restrictions, accessible to all
  }

  if (!userEmail) {
    return false; // No user email, can't check membership
  }

  const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;
  if (!HUBSPOT_PRIVATE_API_KEY) {
    console.warn('HubSpot API key not configured, allowing access by default');
    return true; // If HubSpot is not configured, allow access
  }

  try {
    // Get contact by email first
    let contactId;
    try {
      const contactResponse = await axios.get(
        `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(userEmail)}?idProperty=email`,
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      contactId = contactResponse.data.id;
    } catch (contactError) {
      // Contact not found in HubSpot
      console.log(`Contact not found in HubSpot for email: ${userEmail}`);
      return false;
    }

    // Get all lists this contact belongs to using associations API
    try {
      const contactListsResponse = await axios.get(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/lists`,
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Extract list IDs from the response
      const contactListIds = contactListsResponse.data.results?.map(result => String(result.toObjectId)) || [];

      // Check if contact is in any of the required lists
      for (const requiredListId of listIds) {
        if (contactListIds.includes(String(requiredListId))) {
          return true; // Contact is in at least one of the required lists
        }
      }

      // Contact is not in any of the required lists
      return false;
    } catch (listsError) {
      console.error(`Error fetching contact lists:`, listsError.response?.data || listsError.message);
      // On error, default to allowing access to avoid blocking users
      return true;
    }
  } catch (error) {
    console.error('Error checking HubSpot list membership:', error.response?.data || error.message);
    // On error, default to allowing access to avoid blocking users
    return true;
  }
};

// ------------------ CourseGroup CRUD ------------------

// Create a new CourseGroup
export const createCourseGroup = async (req, res) => {
  try {
    const { title, description, icon, hubSpotListIds } = req.body;

    // Validation
    if (!title || !description || !icon) {
      return res.status(400).json({ message: 'Title, description, and icon are required' });
    }

    const createdBy = req.user._id;
    const courseGroup = await CourseGroup.create({
      title,
      description,
      icon,
      createdBy,
      displayOnPublicPage: req.body.displayOnPublicPage || false,
      hubSpotListIds: Array.isArray(hubSpotListIds) ? hubSpotListIds : []
    });
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
    const { type, search, fields = 'basic', page = 1, limit = 50, publicOnly = 'false' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const isPublicOnly = publicOnly === 'true';

    // Build base query based on type filter
    let matchStage = {};

    if (type === 'courses') {
      const courseGroupIds = await Course.distinct('courseGroup');
      matchStage = { _id: { $in: courseGroupIds } };
    } else if (type === 'bundles') {
      const courseCounts = await Course.aggregate([
        { $group: { _id: '$courseGroup', count: { $sum: 1 } } },
        { $match: { count: { $gte: 2 } } }
      ]);
      matchStage = { _id: { $in: courseCounts.map(c => c._id) } };
    } else if (type === 'content') {
      // Fixed: Get courses that have lectures, then get their courseGroups
      const coursesWithLectures = await Course.distinct('courseGroup', {
        lectures: { $exists: true, $ne: [] }
      });
      matchStage = { _id: { $in: coursesWithLectures } };
    }

    // Add search filter to match stage if provided
    if (search) {
      matchStage.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add public pages filter if needed
    if (isPublicOnly) {
      matchStage.displayOnPublicPage = true;
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          pipeline: [{ $project: { name: 1, email: 1 } }]
        }
      },
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
    ];

    // Add courses lookup based on fields parameter
    if (fields === 'detailed' || fields === 'full') {
      const lectureFields = fields === 'full'
        ? 'title description content videoUrl relatedFiles createdBy createdAt completedBy displayOnPublicPage'
        : 'title description videoUrl displayOnPublicPage';

      const courseLookup = {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: 'courseGroup',
          as: 'courses',
          pipeline: [
            {
              $lookup: {
                from: 'lectures',
                localField: 'lectures',
                foreignField: '_id',
                as: 'lectures',
                pipeline: [
                  ...(isPublicOnly ? [{ $match: { displayOnPublicPage: true } }] : []),
                  {
                    $project: buildProjectStage(lectureFields)
                  },
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'createdBy',
                      foreignField: '_id',
                      as: 'createdBy',
                      pipeline: [{ $project: { name: 1, email: 1 } }]
                    }
                  },
                  { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
                ]
              }
            },
            ...(isPublicOnly ? [{ $match: { displayOnPublicPage: true } }] : []),
            {
              $project: {
                title: 1,
                description: 1,
                courseGroup: 1,
                lectures: 1,
                createdBy: 1,
                createdAt: 1,
                updatedAt: 1,
                resources: 1,
                displayOnPublicPage: 1
              }
            }
          ]
        }
      };

      pipeline.push(courseLookup);

      // If search is provided, filter courses/lectures that match
      if (search) {
        pipeline.push({
          $addFields: {
            courses: {
              $filter: {
                input: '$courses',
                as: 'course',
                cond: {
                  $or: [
                    { $regexMatch: { input: '$$course.title', regex: search, options: 'i' } },
                    { $regexMatch: { input: '$$course.description', regex: search, options: 'i' } },
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: '$$course.lectures',
                              as: 'lecture',
                              cond: {
                                $or: [
                                  { $regexMatch: { input: '$$lecture.title', regex: search, options: 'i' } },
                                  { $regexMatch: { input: '$$lecture.description', regex: search, options: 'i' } }
                                ]
                              }
                            }
                          }
                        },
                        0
                      ]
                    }
                  ]
                }
              }
            }
          }
        });
      }
    } else {
      // For basic view, just get course count
      pipeline.push({
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: 'courseGroup',
          as: 'courseCount',
          pipeline: [{ $count: 'count' }]
        }
      });
      pipeline.push({
        $addFields: {
          courses: [{ count: { $ifNull: [{ $arrayElemAt: ['$courseCount.count', 0] }, 0] } }]
        }
      });
      pipeline.push({ $project: { courseCount: 0 } });
    }

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // Execute aggregation
    let courseGroups = await CourseGroup.aggregate(pipeline);

    // Filter by HubSpot list membership if publicOnly
    if (isPublicOnly) {
      const filteredGroups = [];
      // Check if user is authenticated (route doesn't require auth, so req.user might be undefined)
      const isAuthenticated = req.user && req.user.email;
      const userEmail = isAuthenticated ? req.user.email : null;

      console.log('isAuthenticated', isAuthenticated);
      console.log('userEmail', userEmail);
      console.log('req.user', req.user);

      for (const group of courseGroups) {
        // If no hubSpotListIds or empty array, show to all (including unauthenticated users)
        if (!group.hubSpotListIds || group.hubSpotListIds.length === 0) {
          filteredGroups.push(group);
        } else {
          // Course group has list restrictions
          if (isAuthenticated && userEmail) {
            // User is authenticated - check HubSpot list membership
            const hasAccess = await isUserInHubSpotLists(userEmail, group.hubSpotListIds);
            console.log('hasAccess', hasAccess);
            if (hasAccess) {
              filteredGroups.push(group);
            }
          }
          // If user is not authenticated and course group has list restrictions, don't show it
          // (This means only authenticated users in the specified lists can see it)
        }
      }

      courseGroups = filteredGroups;
    }

    // Get total count for pagination (after filtering)
    const total = courseGroups.length;

    res.json({
      data: courseGroups,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Get single CourseGroup by ID - OPTIMIZED VERSION
export const getCourseGroupById = async (req, res) => {
  try {
    const { fields = 'detailed', publicOnly = 'false' } = req.query;
    const isPublicOnly = publicOnly === 'true';

    // Build match stage - check displayOnPublicPage if publicOnly is true
    const matchStage = { _id: new mongoose.Types.ObjectId(req.params.id) };
    if (isPublicOnly) {
      matchStage.displayOnPublicPage = true;
    }

    // Use aggregation for better performance
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          pipeline: [{ $project: { name: 1, email: 1 } }]
        }
      },
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
    ];

    // Add courses lookup
    const lectureFields = fields === 'full'
      ? 'title description content videoUrl relatedFiles createdBy createdAt completedBy displayOnPublicPage'
      : 'title description videoUrl displayOnPublicPage';

    pipeline.push({
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: 'courseGroup',
        as: 'courses',
        pipeline: [
          {
            $lookup: {
              from: 'lectures',
              localField: 'lectures',
              foreignField: '_id',
              as: 'lectures',
              pipeline: [
                ...(isPublicOnly ? [{ $match: { displayOnPublicPage: true } }] : []),
                {
                  $project: buildProjectStage(lectureFields)
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'createdBy',
                    pipeline: [{ $project: { name: 1, email: 1 } }]
                  }
                },
                { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
              ]
            }
          },
          ...(isPublicOnly ? [{ $match: { displayOnPublicPage: true } }] : []),
          {
            $project: {
              title: 1,
              description: 1,
              courseGroup: 1,
              lectures: 1,
              createdBy: 1,
              createdAt: 1,
              updatedAt: 1,
              resources: 1,
              displayOnPublicPage: 1,
              ebookName: 1,
              ebookUrl: 1
            }
          }
        ]
      }
    });

    const result = await CourseGroup.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'CourseGroup not found' });
    }

    const courseGroup = result[0];

    // Check HubSpot list membership if publicOnly
    if (isPublicOnly) {
      // If course group has hubSpotListIds, check membership
      if (courseGroup.hubSpotListIds && courseGroup.hubSpotListIds.length > 0) {
        // Check if user is authenticated (route doesn't require auth, so req.user might be undefined)
        const isAuthenticated = req.user && req.user.email;

        // If user is not authenticated, deny access (list-restricted content requires authentication)
        if (!isAuthenticated) {
          return res.status(401).json({ message: 'Authentication required to view this course group.' });
        }

        const userEmail = req.user.email;
        const hasAccess = await isUserInHubSpotLists(userEmail, courseGroup.hubSpotListIds);
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied. You do not have permission to view this course group.' });
        }
      }
    }

    res.json(courseGroup);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'CourseGroup not found' });
    }
    res.status(500).json({ message: error.message });
  }
};


// Update CourseGroup
export const updateCourseGroup = async (req, res) => {
  try {
    const { title, description, icon, hubSpotListIds } = req.body;

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

    // Prepare update data
    const updateData = { ...req.body };

    // Handle hubSpotListIds - ensure it's an array
    if (hubSpotListIds !== undefined) {
      updateData.hubSpotListIds = Array.isArray(hubSpotListIds) ? hubSpotListIds : [];
    }

    const updated = await CourseGroup.findByIdAndUpdate(req.params.id, updateData, { new: true })
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
    const { title, description, lectures = [], resources = [], ebookName = '', ebookUrl = '' } = req.body;
    const courseGroup = req.params.groupId;
    const createdBy = req.user._id;

    // Validation
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    // Validate resources if provided
    if (resources && Array.isArray(resources)) {
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        if (!resource.name || !resource.url) {
          return res.status(400).json({ message: `Resource ${i + 1} must have both name and url` });
        }
      }
    }

    // Check if course group exists
    const group = await CourseGroup.findById(courseGroup);
    if (!group) {
      return res.status(404).json({ message: 'Course group not found' });
    }

    // Migrate legacy ebook fields to resources if provided
    let finalResources = resources || [];
    if (ebookName && ebookUrl && (!resources || resources.length === 0)) {
      finalResources = [{
        name: ebookName,
        url: ebookUrl,
        type: 'ebook'
      }];
    }

    const course = await Course.create({
      title,
      description,
      courseGroup,
      lectures,
      createdBy,
      resources: finalResources,
      // Keep legacy fields for backward compatibility
      ebookName,
      ebookUrl,
      displayOnPublicPage: req.body.displayOnPublicPage || false
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
    const { fields = 'basic', page = 1, limit = 50, publicOnly = 'false', courseGroup } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const isPublicOnly = publicOnly === 'true';

    // Build match query
    const matchQuery = {};
    if (courseGroup) {
      matchQuery.courseGroup = courseGroup;
    }
    if (isPublicOnly) {
      matchQuery.displayOnPublicPage = true;
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          pipeline: [{ $project: { name: 1, email: 1 } }]
        }
      },
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'coursegroups',
          localField: 'courseGroup',
          foreignField: '_id',
          as: 'courseGroup',
          pipeline: [{ $project: { title: 1, description: 1, icon: 1 } }]
        }
      },
      { $unwind: { path: '$courseGroup', preserveNullAndEmptyArrays: true } }
    ];

    // Add lectures lookup if needed
    if (fields === 'detailed' || fields === 'full') {
      const lectureFields = fields === 'full'
        ? 'title description content videoUrl relatedFiles createdBy createdAt completedBy displayOnPublicPage'
        : 'title description videoUrl displayOnPublicPage';

      pipeline.push({
        $lookup: {
          from: 'lectures',
          localField: 'lectures',
          foreignField: '_id',
          as: 'lectures',
          pipeline: [
            ...(isPublicOnly ? [{ $match: { displayOnPublicPage: true } }] : []),
            {
              $project: buildProjectStage(lectureFields)
            },
            ...(fields === 'full' ? [{
              $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'createdBy',
                pipeline: [{ $project: { name: 1, email: 1 } }]
              }
            }, { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }] : [])
          ]
        }
      });
    }

    // Get total count
    const countPipeline = [{ $match: matchQuery }, { $count: 'total' }];
    const countResult = await Course.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    const courses = await Course.aggregate(pipeline);

    res.json({
      data: courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Course by ID - OPTIMIZED VERSION
export const getCourseById = async (req, res) => {
  try {
    const { fields = 'full', publicOnly = 'false' } = req.query;
    const isPublicOnly = publicOnly === 'true';

    // Build match stage - check displayOnPublicPage if publicOnly is true
    const matchStage = { _id: new mongoose.Types.ObjectId(req.params.id) };
    if (isPublicOnly) {
      matchStage.displayOnPublicPage = true;
    }

    // Use aggregation for better performance and filtering
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          pipeline: [{ $project: { name: 1, email: 1 } }]
        }
      },
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'coursegroups',
          localField: 'courseGroup',
          foreignField: '_id',
          as: 'courseGroup',
          pipeline: [
            ...(isPublicOnly ? [{ $match: { displayOnPublicPage: true } }] : []),
            { $project: { title: 1, description: 1, icon: 1, displayOnPublicPage: 1 } }
          ]
        }
      },
      { $unwind: { path: '$courseGroup', preserveNullAndEmptyArrays: true } }
    ];

    // If publicOnly and courseGroup is empty (filtered out), return 404
    if (isPublicOnly) {
      pipeline.push({
        $match: { courseGroup: { $exists: true, $ne: null } }
      });
    }

    // Add lectures lookup
    const lectureFields = fields === 'full'
      ? 'title description content videoUrl relatedFiles createdBy createdAt completedBy displayOnPublicPage'
      : fields === 'detailed'
        ? 'title description videoUrl relatedFiles displayOnPublicPage'
        : 'title description displayOnPublicPage';

    pipeline.push({
      $lookup: {
        from: 'lectures',
        localField: 'lectures',
        foreignField: '_id',
        as: 'lectures',
        pipeline: [
          ...(isPublicOnly ? [{ $match: { displayOnPublicPage: true } }] : []),
          {
            $project: buildProjectStage(lectureFields)
          },
          ...(fields === 'full' ? [{
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
              pipeline: [{ $project: { name: 1, email: 1 } }]
            }
          }, { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }] : [])
        ]
      }
    });

    const result = await Course.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(result[0]);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Course not found' });
    }
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
      courseId,
      displayOnPublicPage = false
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
      createdBy,
      displayOnPublicPage
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
    const { page = 1, limit = 50, publicOnly = 'false', courseId } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const isPublicOnly = publicOnly === 'true';

    // Build match query
    const matchQuery = {};
    if (isPublicOnly) {
      matchQuery.displayOnPublicPage = true;
    }
    if (courseId) {
      // Find courses that contain this lecture
      const course = await Course.findById(courseId);
      if (course && course.lectures && course.lectures.length > 0) {
        matchQuery._id = { $in: course.lectures };
      } else {
        matchQuery._id = { $in: [] }; // No lectures found
      }
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
          pipeline: [{ $project: { name: 1, email: 1 } }]
        }
      },
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'completedBy',
          foreignField: '_id',
          as: 'completedBy',
          pipeline: [{ $project: { name: 1, email: 1 } }]
        }
      }
    ];

    // Get total count
    const countPipeline = [{ $match: matchQuery }, { $count: 'total' }];
    const countResult = await Lecture.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    const lectures = await Lecture.aggregate(pipeline);

    res.json({
      data: lectures,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
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
      relatedFiles,
      displayOnPublicPage
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
    if (displayOnPublicPage !== undefined) updateData.displayOnPublicPage = displayOnPublicPage;
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