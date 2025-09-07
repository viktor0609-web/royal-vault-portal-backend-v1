import mongoose from 'mongoose';
const { Schema } = mongoose;

// Updated Webinar Schema to include attendance status
const webinarSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  schedule: {
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 60,
    },
  },
  maxAttendees: {
    type: Number,
    required: true,
    default: 100,
  },
  participants: {
    hosts: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    guestSpeakers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  attendees: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Refers to the User model
    },
    attendanceStatus: {
      type: String,
      enum: ['registered', 'attended', 'missed'],
      default: 'registered',
    },
  }],
  settings: {
    recordWebinar: {
      type: Boolean,
      default: false,
    },
    publicWebinar: {
      type: Boolean,
      default: true,
    },
    requireRegistration: {
      type: Boolean,
      default: true,
    },
    reminders: {
      email24h: {
        type: Boolean,
        default: true,
      },
      email1h: {
        type: Boolean,
        default: true,
      },
      sms30min: {
        type: Boolean,
        default: true,
      },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the Webinar model
const Webinar = mongoose.model('Webinar', webinarSchema);
export default Webinar;
