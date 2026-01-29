import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Webinar Schema
 * 
 * Date Handling Strategy:
 * - MongoDB stores ALL dates in UTC automatically
 * - Fields like 'date', 'registeredAt', 'createdAt', 'updatedAt' are stored in UTC
 * - Frontend must convert to user's local timezone for display using:
 *   new Date(dateString).toLocaleDateString() or .toLocaleString()
 * - NEVER manually convert dates before saving to MongoDB - let MongoDB handle UTC storage
 * - When receiving dates from frontend forms, ensure they're properly converted to UTC before saving
 */

const webinarOnRecordingSchema = new Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
}, { timestamps: true });

const webinarSchema = new Schema({
  // Core webinar fields
  streamType: {
    type: String,
    enum: ['Live Call', 'Webinar'],
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },

  // Line fields (Line1 is required, Line2 and Line3 are optional)
  line1: {
    type: String,
    required: true,
    trim: true,
  },
  line2: {
    type: String,
    trim: true,
  },
  line3: {
    type: String,
    trim: true,
  },

  // Status and display settings
  status: {
    type: String,
    enum: ['Scheduled', 'Waiting', 'In Progress', 'Ended'],
    required: true,
    default: 'Scheduled',
  },
  displayComments: {
    type: String,
    enum: ['Yes', 'No'],
    required: true,
    default: 'Yes',
  },
  portalDisplay: {
    type: String,
    enum: ['Yes', 'No'],
    required: true,
    default: 'Yes',
  },

  // Optional fields
  calInvDesc: {
    type: String,
    trim: true,
  },
  proWorkId: {
    type: String,
    trim: true,
  },
  reminderSms: {
    type: String,
    trim: true,
  },
  proSmsList: {
    type: String,
    // type: Schema.Types.ObjectId,
    // ref: 'PromotionalSmsList',
  },
  proSms: {
    type: String,
    trim: true,
  },
  proSmsTime: {
    type: Number,
    default: 60, // in minutes
  },
  attendOverwrite: {
    type: Number,
    default: 100,
  },

  rawRecordingId: {
    type: String,
    trim: true,
  },

  recording: {
    type: String,
    trim: true,
  },

  // Call to Action buttons
  ctas: [{
    label: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
  }],

  // Active CTA indices (which CTAs are currently active/displayed)
  activeCtaIndices: {
    type: [Number],
    default: [],
  },

  // Registration and attendance tracking
  attendees: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attendanceStatus: {
      type: String,
      enum: ['registered', 'attended', 'watched'],
      default: 'registered',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  }],

  // Creator tracking
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Reminder email tracking
  reminderEmailSent: {
    type: Boolean,
    default: false,
  },
  reminderEmailSentAt: {
    type: Date,
  },

  // HubSpot list ID for webinar participants (create/update list when syncing)
  hubSpotListId: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Pre-update hook: Automatically set portalDisplay to 'No' when status is changed to 'Ended'
webinarSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();

  // Handle both direct updates and $set updates
  const newStatus =
    update.status ||
    (update.$set && update.$set.status);

  if (newStatus === 'Ended') {
    // Apply update
    if (update.$set) {
      update.$set.portalDisplay = 'No';
    } else {
      update.portalDisplay = 'No';
    }
  }

  next();
});



// Create the Webinar model
const Webinar = mongoose.model('Webinar', webinarSchema);
export default Webinar;

export const WebinarOnRecording = mongoose.model('WebinarOnRecording', webinarOnRecordingSchema);