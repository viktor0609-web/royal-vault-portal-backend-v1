import ChatMessage from '../models/ChatMessage.js';
import Webinar from '../models/Webinar.js';
import mongoose from 'mongoose';

/**
 * Save a chat message
 * POST /api/webinars/:webinarId/chat
 */
export const saveMessage = async (req, res) => {
  try {
    const { webinarId } = req.params;
    const { senderUserId, senderName, text } = req.body;

    // Validate required fields
    if (!senderName || !text || !text.trim()) {
      return res.status(400).json({
        message: 'Missing required fields: senderUserId, senderName, and text are required'
      });
    }

    // Verify webinar exists
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Create and save the message
    const message = new ChatMessage({
      webinar: webinarId,
      senderUserId,
      senderName,
      text: text.trim(),
    });

    await message.save();

    // Populate sender info for response
    const populatedMessage = await ChatMessage.findById(message._id)
      .populate('senderUserId', 'name email')
      .lean();

    res.status(201).json({
      message: 'Chat message saved successfully',
      chatMessage: populatedMessage
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ message: 'Error saving chat message' });
  }
};

/**
 * Get all chat messages for a webinar
 * GET /api/webinars/:webinarId/chat
 */
export const getMessages = async (req, res) => {
  try {
    const { webinarId } = req.params;

    // Verify webinar exists
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Get all messages for this webinar, sorted by creation time (oldest first)
    const messages = await ChatMessage.find({ webinar: webinarId })
      .populate('senderUserId', 'name email')
      .sort({ createdAt: 1 }) // Oldest messages first
      .lean();

    res.status(200).json({
      message: 'Chat messages fetched successfully',
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Error fetching chat messages' });
  }
};

/**
 * Clear all chat messages for a webinar (admin only)
 * DELETE /api/webinars/:webinarId/chat
 */
export const clearMessages = async (req, res) => {
  try {
    const { webinarId } = req.params;

    // Verify webinar exists
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Unpin all messages first (set isPinned to false for all messages)
    await ChatMessage.updateMany(
      { webinar: webinarId, isPinned: true },
      { $set: { isPinned: false } }
    );

    // Delete all messages for this webinar
    const result = await ChatMessage.deleteMany({ webinar: webinarId });

    res.status(200).json({
      message: 'Chat messages cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing chat messages:', error);
    res.status(500).json({ message: 'Error clearing chat messages' });
  }
};

/**
 * Pin a chat message
 * POST /api/webinars/:webinarId/chat/:messageId/pin
 */
export const pinMessage = async (req, res) => {
  try {
    const { webinarId, messageId } = req.params;

    // Verify webinar exists
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Check if messageId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID. Message must be saved to database before pinning.' });
    }

    // Find and update the message
    const message = await ChatMessage.findOne({ _id: messageId, webinar: webinarId });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Pin the message
    message.isPinned = true;
    await message.save();

    // Populate sender info for response
    const populatedMessage = await ChatMessage.findById(message._id)
      .populate('senderUserId', 'name email')
      .lean();

    res.status(200).json({
      message: 'Message pinned successfully',
      chatMessage: populatedMessage
    });
  } catch (error) {
    console.error('Error pinning message:', error);
    res.status(500).json({ message: 'Error pinning message' });
  }
};

/**
 * Unpin a chat message
 * POST /api/webinars/:webinarId/chat/:messageId/unpin
 */
export const unpinMessage = async (req, res) => {
  try {
    const { webinarId, messageId } = req.params;

    // Verify webinar exists
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Check if messageId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    // Find and update the message
    const message = await ChatMessage.findOne({ _id: messageId, webinar: webinarId });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Unpin the message
    message.isPinned = false;
    await message.save();

    res.status(200).json({
      message: 'Message unpinned successfully'
    });
  } catch (error) {
    console.error('Error unpinning message:', error);
    res.status(500).json({ message: 'Error unpinning message' });
  }
};

/**
 * Get all pinned messages for a webinar
 * GET /api/webinars/:webinarId/chat/pinned
 */
export const getPinnedMessages = async (req, res) => {
  try {
    const { webinarId } = req.params;

    // Verify webinar exists
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: 'Webinar not found' });
    }

    // Get all pinned messages for this webinar, sorted by creation time (oldest first, newest at bottom)
    const pinnedMessages = await ChatMessage.find({ 
      webinar: webinarId, 
      isPinned: true 
    })
      .populate('senderUserId', 'name email')
      .sort({ createdAt: 1 }) // Oldest messages first, newest at bottom
      .lean();

    res.status(200).json({
      message: 'Pinned messages fetched successfully',
      pinnedMessages,
      count: pinnedMessages.length
    });
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    res.status(500).json({ message: 'Error fetching pinned messages' });
  }
};

