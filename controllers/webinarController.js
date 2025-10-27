import User from '../models/User.js';
import Webinar from '../models/Webinar.js';
import mongoose from 'mongoose';

// ==================== ADMIN FUNCTIONS ====================

// Get all webinars for admin
export const getAllWebinars = async (req, res) => {
  try {
    const { fields = 'full', status, streamType } = req.query;

    let selectFields = '';
    let populateFields = [];
    let query = {};

    // Add filters
    if (status) {
      query.status = status;
    }
    if (streamType) {
      query.streamType = streamType;
    }

    if (fields === 'basic') {
      selectFields = 'name slug date status streamType line1 line2 line3 displayComments portalDisplay ctas createdAt';
    } else if (fields === 'detailed') {
      selectFields = 'name slug date status streamType line1 line2 line3 displayComments portalDisplay calInvDesc proWorkId reminderSms proSms proSmsTime attendOverwrite recording ctas createdAt attendees';
      populateFields = [
        { path: 'proSmsList', select: 'name' },
        { path: 'createdBy', select: 'name email' }
      ];
    } else {
      populateFields = [
        { path: 'proSmsList', select: 'name' },
        { path: 'createdBy', select: 'name email' }
      ];
    }

    const webinars = await Webinar.find(query)
      .select(selectFields)
      .populate(populateFields)
      .sort({ createdAt: -1 })
      .lean();

    console.log("webinars:", webinars);


    res.status(200).json({
      message: 'Webinars fetched successfully',
      webinars,
      count: webinars.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching webinars' });
  }
};

// Get webinar by ID or slug for admin
export const getWebinarById = async (req, res) => {
  try {
    const { webinarId } = req.params;
    const { fields = 'full' } = req.query;

    let selectFields = '';
    let populateFields = [];

    if (fields === 'basic') {
      selectFields = 'name slug date status streamType line1 line2 line3 displayComments portalDisplay';
    } else {
      populateFields = [
        { path: 'proSmsList', select: 'name' },
        { path: 'createdBy', select: 'name email' }
      ];
    }

    // Determine if the parameter is a MongoDB ObjectId or a slug
    const isValidObjectId = mongoose.Types.ObjectId.isValid(webinarId) && /^[0-9a-fA-F]{24}$/.test(webinarId);

    let webinar;
    if (isValidObjectId) {
      // Search by MongoDB _id
      webinar = await Webinar.findById(webinarId)
        .select(selectFields)
        .populate(populateFields);
    } else {
      // Search by slug
      webinar = await Webinar.findOne({ slug: webinarId })
        .select(selectFields)
        .populate(populateFields);
    }

    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    res.status(200).json({ message: 'Webinar fetched successfully', webinar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching webinar' });
  }
};

// Admin creates a new webinar
export const createWebinar = async (req, res) => {
  try {
    const {
      streamType,
      name,
      slug,
      date,
      line1,
      line2,
      line3,
      status,
      displayComments,
      portalDisplay,
      calInvDesc,
      proWorkId,
      reminderSms,
      proSmsList,
      proSms,
      proSmsTime,
      attendOverwrite,
      recording,
      ctas
    } = req.body;

    const createdBy = req.user.id;

    // Check if slug already exists
    const existingWebinar = await Webinar.findOne({ slug });
    if (existingWebinar) {
      return res.status(400).json({ message: 'Slug already exists' });
    }

    // Validate CTAs if provided
    if (ctas && Array.isArray(ctas)) {
      for (const cta of ctas) {
        if (!cta.label || !cta.link) {
          return res.status(400).json({ message: 'Each CTA must have both label and link' });
        }
      }
    }

    const newWebinar = new Webinar({
      streamType,
      name,
      slug,
      date,
      line1,
      line2,
      line3,
      status,
      displayComments,
      portalDisplay,
      calInvDesc,
      proWorkId,
      reminderSms,
      proSmsList,
      proSms,
      proSmsTime,
      attendOverwrite,
      recording,
      ctas: ctas || [],
      createdBy
    });

    await newWebinar.save();

    // Populate the response
    const populatedWebinar = await Webinar.findById(newWebinar._id)
      .populate('proSmsList', 'name')
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Webinar created successfully',
      webinar: populatedWebinar
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating webinar' });
  }
};

// Admin updates an existing webinar
export const updateWebinar = async (req, res) => {
  try {
    const { webinarId } = req.params;
    const {
      streamType,
      name,
      slug,
      date,
      line1,
      line2,
      line3,
      status,
      displayComments,
      portalDisplay,
      calInvDesc,
      proWorkId,
      reminderSms,
      proSmsList,
      proSms,
      proSmsTime,
      attendOverwrite,
      recording,
      ctas
    } = req.body;

    // Check if slug already exists (excluding current webinar)
    if (slug) {
      const existingWebinar = await Webinar.findOne({
        slug,
        _id: { $ne: webinarId }
      });
      if (existingWebinar) {
        return res.status(400).json({ message: 'Slug already exists' });
      }
    }

    // Validate CTAs if provided
    if (ctas && Array.isArray(ctas)) {
      for (const cta of ctas) {
        if (!cta.label || !cta.link) {
          return res.status(400).json({ message: 'Each CTA must have both label and link' });
        }
      }
    }

    const updateData = {
      streamType,
      name,
      slug,
      date,
      line1,
      line2,
      line3,
      status,
      displayComments,
      portalDisplay,
      calInvDesc,
      proWorkId,
      reminderSms,
      proSmsList,
      proSms,
      proSmsTime,
      attendOverwrite,
      recording,
      ctas
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedWebinar = await Webinar.findByIdAndUpdate(
      webinarId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('proSmsList', 'name')
      .populate('createdBy', 'name email');

    if (!updatedWebinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    res.status(200).json({
      message: 'Webinar updated successfully',
      webinar: updatedWebinar
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating webinar' });
  }
};

// Admin deletes a webinar
export const deleteWebinar = async (req, res) => {
  try {
    const { webinarId } = req.params;

    const deletedWebinar = await Webinar.findByIdAndDelete(webinarId);

    if (!deletedWebinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    res.status(200).json({ message: 'Webinar deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting webinar' });
  }
};

// Admin ends/finishes a webinar
export const endWebinar = async (req, res) => {
  try {
    const { webinarId } = req.params;

    const webinar = await Webinar.findById(webinarId);

    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Update webinar status to 'Ended'
    webinar.status = 'Ended';
    await webinar.save();

    res.status(200).json({
      message: 'Webinar ended successfully',
      webinar
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error ending webinar' });
  }
};

// Admin views all attendees for a webinar
export const viewAttendees = async (req, res) => {
  try {
    const { webinarId } = req.params;

    const webinar = await Webinar.findById(webinarId);

    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    res.status(200).json({
      message: 'Attendees fetched successfully',
      attendees: webinar.attendees
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching attendees' });
  }
};

// Admin marks a user as attended for a webinar
export const adminMarkAsAttended = async (req, res) => {
  try {
    const { userId, webinarId } = req.params;

    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Find the user in the attendees list
    const attendee = webinar.attendees.find((attendee) => attendee.user.toString() === userId);
    if (!attendee) {
      return res.status(400).json({ message: 'User is not registered for this webinar' });
    }

    // Mark the user as attended
    attendee.attendanceStatus = 'attended';
    await webinar.save();

    res.status(200).json({ message: 'User marked as attended for the webinar' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking user as attended' });
  }
};

// Admin marks a user as missed for a webinar
export const adminMarkAsMissed = async (req, res) => {
  try {
    const { userId, webinarId } = req.params;

    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Find the user in the attendees list
    const attendee = webinar.attendees.find((attendee) => attendee.user.toString() === userId);
    if (!attendee) {
      return res.status(400).json({ message: 'User is not registered for this webinar' });
    }

    // Mark the user as missed
    attendee.attendanceStatus = 'missed';
    await webinar.save();

    res.status(200).json({ message: 'User marked as missed for the webinar' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking user as missed' });
  }
};

// ==================== USER FUNCTIONS ====================

// Get all webinars for user (public view)
export const getPublicWebinars = async (req, res) => {
  try {
    const { fields = 'basic', status, streamType } = req.query;

    let selectFields = '';
    let populateFields = [];
    let query = { portalDisplay: 'Yes' }; // Only show webinars that are set to display

    // Add filters
    if (status) {
      query.status = status;
    }
    if (streamType) {
      query.streamType = streamType;
    }

    if (fields === 'basic') {
      selectFields = 'name slug date status streamType portalDisplay line1 line2 line3 displayComments ctas attendees';
    } else {
      selectFields = 'name slug date status streamType portalDisplay line1 line2 line3 displayComments ctas attendees';
      populateFields = [
        { path: 'createdBy', select: 'name email' }
      ];
    }

    const webinars = await Webinar.find(query)
      .select(selectFields)
      .populate(populateFields)
      .sort({ date: 1 })
      .lean();

    res.status(200).json({
      message: 'Webinars fetched successfully',
      webinars,
      count: webinars.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching webinars' });
  }
};

// Get public webinar by ID or slug
export const getPublicWebinarById = async (req, res) => {
  try {
    const { webinarId } = req.params;

    // Determine if the parameter is a MongoDB ObjectId or a slug
    const isValidObjectId = mongoose.Types.ObjectId.isValid(webinarId) && /^[0-9a-fA-F]{24}$/.test(webinarId);

    let query = {};

    if (isValidObjectId) {
      // Search by MongoDB _id
      query._id = webinarId;
    } else {
      // Search by slug
      query.slug = webinarId;
    }

    const webinar = await Webinar.findOne(query)
      .populate('createdBy', 'name email');

    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    res.status(200).json({ message: 'Webinar fetched successfully', webinar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching webinar' });
  }
};

// Register user for a webinar
export const registerForWebinar = async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from the user object
    const { webinarId } = req.params;

    console.log('User ID:', userId);
    console.log('Webinar ID:', webinarId);

    // Find the webinar
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Check if the user is already registered
    if (webinar.attendees.some((attendee) => attendee.user.toString() === userId.toString())) {
      return res.status(401).json({ message: 'User is already registered for this webinar' });
    }

    // Check if max attendees have been reached
    const maxAttendees = webinar.attendOverwrite || 100;
    if (webinar.attendees.length >= maxAttendees) {
      return res.status(400).json({ message: 'Webinar is full' });
    }

    // Register user for the webinar
    webinar.attendees.push({ user: userId, attendanceStatus: 'registered' });
    await webinar.save();

    res.status(200).json({ message: 'Successfully registered for the webinar' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering for the webinar' });
  }
};

// Mark user as attended (user side)
export const markAsAttended = async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from the user object
    const { webinarId } = req.params;

    // Find the webinar
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Find the user in the attendees list
    const attendee = webinar.attendees.find((attendee) => attendee.user.toString() === userId);
    if (!attendee) {
      return res.status(400).json({ message: 'User is not registered for this webinar' });
    }

    // Mark the user as attended
    attendee.attendanceStatus = 'attended';
    await webinar.save();

    res.status(200).json({ message: 'You have been marked as attended' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking attendance' });
  }
};

// Unregister user from a webinar
export const unregisterFromWebinar = async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from the user object
    const { webinarId } = req.params;

    console.log('User ID:', userId);
    console.log('Webinar ID:', webinarId);

    // Find the webinar
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Check if the user is registered
    const attendeeIndex = webinar.attendees.findIndex((attendee) => attendee.user.toString() === userId.toString());
    if (attendeeIndex === -1) {
      return res.status(400).json({ message: 'User is not registered for this webinar' });
    }

    // Remove user from attendees list
    webinar.attendees.splice(attendeeIndex, 1);
    await webinar.save();

    res.status(200).json({ message: 'Successfully unregistered from the webinar' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error unregistering from the webinar' });
  }
};

export const isValidEmailAddress = async (req, res) => {
  try {
    const { email } = req.body;
    const exist = await User.findOne({ email });

    res.status(200).json({ message: 'Email address is Exist', exist: exist ? true : false });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error' });
  }
}