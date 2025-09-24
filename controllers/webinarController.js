import Webinar from '../models/Webinar.js';

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
      selectFields = 'name slug date status streamType line1 line2 line3 displayComments portalDisplay createdAt';
    } else if (fields === 'detailed') {
      selectFields = 'name slug date status streamType line1 line2 line3 displayComments portalDisplay calInvDesc proWorkId reminderSms proSms proSmsTime attendOverwrite recording createdAt';
      populateFields = [
        { path: 'proSmsList', select: 'name' },
        { path: 'createdBy', select: 'name email' }
      ];
    } else {
      populateFields = [
        { path: 'attendees.user', select: 'name email' },
        { path: 'proSmsList', select: 'name' },
        { path: 'createdBy', select: 'name email' }
      ];
    }
    
    const webinars = await Webinar.find(query)
      .select(selectFields)
      .populate(populateFields)
      .sort({ createdAt: -1 })
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

// Get webinar by ID for admin
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
        { path: 'attendees.user', select: 'name email' },
        { path: 'proSmsList', select: 'name' },
        { path: 'createdBy', select: 'name email' }
      ];
    }
    
    const webinar = await Webinar.findById(webinarId)
      .select(selectFields)
      .populate(populateFields);
    
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
      recording
    } = req.body;

    const createdBy = req.user.id;

    // Check if slug already exists
    const existingWebinar = await Webinar.findOne({ slug });
    if (existingWebinar) {
      return res.status(400).json({ message: 'Slug already exists' });
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
      recording
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
      recording
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

// Admin views all attendees for a webinar
export const viewAttendees = async (req, res) => {
  try {
    const { webinarId } = req.params;

    const webinar = await Webinar.findById(webinarId)
      .populate('attendees.user', 'name email');

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
      selectFields = 'name slug date status streamType line1 line2 line3 displayComments';
    } else {
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

// Get public webinar by ID
export const getPublicWebinarById = async (req, res) => {
  try {
    const { webinarId } = req.params;
    
    const webinar = await Webinar.findOne({ 
      _id: webinarId, 
      portalDisplay: 'Yes' 
    })
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
    const { userId } = req.user;
    const { webinarId } = req.params;

    // Find the webinar
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Check if the user is already registered
    if (webinar.attendees.some((attendee) => attendee.user.toString() === userId)) {
      return res.status(400).json({ message: 'User is already registered for this webinar' });
    }

    // Check if max attendees have been reached
    const maxAttendees = webinar.attendOverwrite || webinar.maxAttendees || 100;
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
    const { userId } = req.user;
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
