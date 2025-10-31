import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * ChatMessage Schema
 * Stores chat messages per webinar
 */
const chatMessageSchema = new Schema({
  webinar: {
    type: Schema.Types.ObjectId,
    ref: 'Webinar',
    required: true,
    index: true, // Index for faster queries
  },
  senderUserId: {
    type: String,
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
});

// Index for efficient querying by webinar and timestamp
chatMessageSchema.index({ webinar: 1, createdAt: 1 });

// Create the ChatMessage model
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;

