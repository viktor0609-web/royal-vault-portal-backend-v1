import Webinar from '../models/Webinar.js';

// Get all webinars for user - OPTIMIZED VERSION
export const getAllWebinars = async (req, res) => {
  try {
    const { fields = 'basic' } = req.query;
    
    let selectFields = {};
    let populateFields = {};
    
    if (fields === 'basic') {
      // For basic list view - only essential fields
      selectFields = 'title description schedule maxAttendees attendees createdAt';
      populateFields = {
        'attendees.user': 'name email',
        'participants.hosts': 'name email',
        'participants.guestSpeakers': 'name email'
      };
    } else if (fields === 'detailed') {
      // For detailed view - more fields but not all
      selectFields = 'title description schedule maxAttendees attendees settings createdAt';
      populateFields = {
        'attendees.user': 'name email',
        'participants.hosts': 'name email',
        'participants.guestSpeakers': 'name email'
      };
    } else if (fields === 'full') {
      // For admin view - all fields
      populateFields = {
        'attendees.user': 'name email',
        'participants.hosts': 'name email',
        'participants.guestSpeakers': 'name email'
      };
    }
    
    const webinars = await Webinar.find()
      .select(selectFields)
      .populate(populateFields)
      .lean();
    
    res.status(200).json({ message: 'Webinars fetched successfully', webinars });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching webinars' });
  }
};

// Get webinar by ID - OPTIMIZED VERSION
export const getWebinarById = async (req, res) => {
  try {
    const { webinarId } = req.params;
    const { fields = 'full' } = req.query;
    
    let selectFields = {};
    let populateFields = {};
    
    if (fields === 'basic') {
      selectFields = 'title description schedule maxAttendees attendees';
      populateFields = {
        'attendees.user': 'name email'
      };
    } else {
      populateFields = {
        'attendees.user': 'name email',
        'participants.hosts': 'name email',
        'participants.guestSpeakers': 'name email'
      };
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

// Register user for a webinar
export const registerForWebinar = async (req, res) => {
  const { userId } = req.user; // Assuming the user is authenticated (via JWT token)
  const { webinarId } = req.params;

  try {
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
    if (webinar.attendees.length >= webinar.maxAttendees) {
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
  const { userId } = req.user;
  const { webinarId } = req.params;

  try {
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