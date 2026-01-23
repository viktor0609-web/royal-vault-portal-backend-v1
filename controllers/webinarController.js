import User from '../models/User.js';
import Webinar from '../models/Webinar.js';
import mongoose from 'mongoose';
import { WebinarOnRecording } from '../models/Webinar.js';
import sendEmail from '../utils/sendEmail.js';
import { sendWebinarReminder } from '../services/webinarReminderService.js';

// ==================== ADMIN FUNCTIONS ====================

// Get all webinars for admin
export const getAllWebinars = async (req, res) => {
  try {
    const { fields = 'full', status, streamType, orderBy = 'date', order = 'desc' } = req.query;

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
      selectFields = 'name slug date status streamType line1 line2 line3 displayComments portalDisplay ctas activeCtaIndices createdAt';
    } else if (fields === 'detailed') {
      selectFields = 'name slug date status streamType line1 line2 line3 displayComments portalDisplay calInvDesc proWorkId reminderSms proSms proSmsTime attendOverwrite rawRecordingId ctas activeCtaIndices createdAt attendees';
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

    // Build sort object
    const sortDirection = order === 'asc' || order === '1' ? 1 : -1;
    const allowedSortFields = ['date', 'createdAt', 'name', 'status', 'slug'];
    const sortField = allowedSortFields.includes(orderBy) ? orderBy : 'date';
    const sortObject = { [sortField]: sortDirection };

    const webinars = await Webinar.find(query)
      .select(selectFields)
      .populate(populateFields)
      .sort(sortObject)
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
      rawRecordingId,
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
      rawRecordingId,
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

    console.log("updatedWebinar:", updatedWebinar);

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
    webinar.portalDisplay = 'No';
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

    const webinar = await Webinar.findById(webinarId)
      .populate({
        path: 'attendees.user',
        select: 'firstName lastName email phone'
      });

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
      selectFields = 'name slug date status streamType portalDisplay line1 line2 line3 displayComments ctas activeCtaIndices attendees';
    } else {
      selectFields = 'name slug date status streamType portalDisplay line1 line2 line3 displayComments ctas activeCtaIndices attendees recording';
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
    const user = req.user;
    const userId = req.user._id; // Get user ID from the user object
    const { webinarId } = req.params;

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

    // Format date and time in EST timezone
    const datePart = webinar.date.toLocaleDateString('en-US', { timeZone: 'America/New_York' }); // e.g. "11/11/2025"
    const timePart = webinar.date.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }); // e.g. "3:30 PM"

    // Send email to user
    const userUrl = `${process.env.CLIENT_URL}/royal-tv/${webinar.slug}/user?is_user=true`;
    const templateId = process.env.WEBINAR_CONFIRMATION_TEMPLATE_ID;
    const data = {
      firstName: user.firstName,
      lastName: user.lastName,
      link: userUrl,
      subject: "Royal Vault Portal - Webinar Registration",
      date: datePart,
      time: timePart + " EST",
      webinarName: webinar.line1,
      description: webinar.line1,
    };

    await sendEmail(user.email, data, templateId);

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

// Mark user as watched (user side) - only if not already attended
// If user is not registered, they will be automatically registered and marked as watched
export const markAsWatched = async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from the user object
    const { webinarId } = req.params;

    // Find the webinar
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Find the user in the attendees list
    let attendee = webinar.attendees.find((attendee) => attendee.user.toString() === userId);

    // If user is not registered, add them to attendees with 'watched' status
    if (!attendee) {
      webinar.attendees.push({
        user: userId,
        attendanceStatus: 'watched',
        registeredAt: new Date()
      });
      await webinar.save();
      return res.status(200).json({ message: 'You have been marked as watched' });
    }

    // User is already registered - only update to 'watched' if status is not already 'attended'
    // 'attended' takes precedence and should not be overwritten
    if (attendee.attendanceStatus !== 'attended') {
      attendee.attendanceStatus = 'watched';
      await webinar.save();
      res.status(200).json({ message: 'You have been marked as watched' });
    } else {
      res.status(200).json({ message: 'Status remains as attended' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking as watched' });
  }
};

// Unregister user from a webinar
export const unregisterFromWebinar = async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from the user object
    const { webinarId } = req.params;

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

export const setWebinarOnRecording = async (req, res) => {
  try {
    const { slug } = req.params;

    await WebinarOnRecording.deleteMany({});
    const newWebinarOnRecording = new WebinarOnRecording({
      slug: slug
    });
    await newWebinarOnRecording.save();
    res.status(200).json({ message: 'Webinar on recording created successfully' });

  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error setting webinar on recording' });
  }
}

export const getDownloadLink = async (req, res) => {
  try {
    const { rawRecordingId } = req.params;

    // Fetch download link from Daily API
    const response = await fetch(`https://api.daily.co/v1/recordings/${rawRecordingId}/access-link`, {
      headers: {
        "Authorization": `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    console.log("Response:", response);

    const data = await response.json();
    console.log("Download:", data);
    const downloadUrl = data.download_link;
    console.log("Download URL:", downloadUrl);

    res.status(200).json({ message: 'Download link fetched successfully', downloadUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error getting download link' });
  }
}

/**
 * Activate a CTA (make it active/displayed)
 * POST /api/webinars/:webinarId/cta/:ctaIndex/activate
 */
export const activateCta = async (req, res) => {
  try {
    const { webinarId, ctaIndex } = req.params;
    const index = parseInt(ctaIndex, 10);

    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: 'Invalid CTA index' });
    }

    // Validate webinar exists and CTA index is valid (lightweight check)
    const webinarCheck = await Webinar.findById(webinarId).select('ctas');
    if (!webinarCheck) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Validate CTA index exists
    if (!webinarCheck.ctas || index >= webinarCheck.ctas.length) {
      return res.status(400).json({ message: 'CTA index out of range' });
    }

    // Use atomic operation to add index to activeCtaIndices
    // $addToSet prevents duplicates and is atomic
    const updatedWebinar = await Webinar.findByIdAndUpdate(
      webinarId,
      { $addToSet: { activeCtaIndices: index } },
      { new: true, runValidators: true }
    ).select('activeCtaIndices');

    res.status(200).json({
      message: 'CTA activated successfully',
      activeCtaIndices: updatedWebinar.activeCtaIndices || []
    });
  } catch (error) {
    console.error('Error activating CTA:', error);
    res.status(500).json({ message: 'Error activating CTA' });
  }
};

/**
 * Deactivate a CTA (make it inactive/hidden)
 * POST /api/webinars/:webinarId/cta/:ctaIndex/deactivate
 */
export const deactivateCta = async (req, res) => {
  try {
    const { webinarId, ctaIndex } = req.params;
    const index = parseInt(ctaIndex, 10);

    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: 'Invalid CTA index' });
    }

    // Use atomic operation to remove index from activeCtaIndices
    // $pull removes all occurrences and is atomic
    const updatedWebinar = await Webinar.findByIdAndUpdate(
      webinarId,
      { $pull: { activeCtaIndices: index } },
      { new: true, runValidators: true }
    ).select('activeCtaIndices');

    if (!updatedWebinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    res.status(200).json({
      message: 'CTA deactivated successfully',
      activeCtaIndices: updatedWebinar.activeCtaIndices || []
    });
  } catch (error) {
    console.error('Error deactivating CTA:', error);
    res.status(500).json({ message: 'Error deactivating CTA' });
  }
};

/**
 * Get active CTA indices for a webinar
 * GET /api/webinars/:webinarId/cta/active
 */
export const getActiveCtas = async (req, res) => {
  try {
    const { webinarId } = req.params;

    const webinar = await Webinar.findById(webinarId).select('activeCtaIndices');
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    res.status(200).json({
      message: 'Active CTAs fetched successfully',
      activeCtaIndices: webinar.activeCtaIndices || []
    });
  } catch (error) {
    console.error('Error fetching active CTAs:', error);
    res.status(500).json({ message: 'Error fetching active CTAs' });
  }
};

/**
 * Test endpoint to manually trigger reminder emails for a webinar
 * POST /api/webinars/admin/:webinarId/test-reminder
 * Admin only
 * Note: This bypasses the reminderEmailSent check to allow testing
 */
export const testSendReminder = async (req, res) => {
  try {
    const { webinarId } = req.params;
    const webinar = await Webinar.findById(webinarId);

    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Store original status
    const originalReminderStatus = webinar.reminderEmailSent;
    const originalReminderSentAt = webinar.reminderEmailSentAt;

    // Temporarily reset reminder status for testing
    webinar.reminderEmailSent = false;
    webinar.reminderEmailSentAt = undefined;

    // Populate attendees before calling the service
    await webinar.populate({
      path: 'attendees.user',
      select: 'firstName lastName email'
    });

    // Call the reminder service (it will set reminderEmailSent to true after sending and save the webinar)
    await sendWebinarReminder(webinar);

    // Reload webinar to get updated status after save
    const updatedWebinar = await Webinar.findById(webinarId);

    res.status(200).json({
      message: 'Test reminder sent successfully',
      webinar: {
        _id: updatedWebinar._id,
        name: updatedWebinar.name,
        reminderEmailSent: updatedWebinar.reminderEmailSent,
        reminderEmailSentAt: updatedWebinar.reminderEmailSentAt,
        previousStatus: {
          reminderEmailSent: originalReminderStatus,
          reminderEmailSentAt: originalReminderSentAt
        }
      }
    });
  } catch (error) {
    console.error('Error sending test reminder:', error);
    res.status(500).json({ message: 'Error sending test reminder', error: error.message });
  }
};