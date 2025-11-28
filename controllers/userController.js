import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import axios from 'axios';
import sendEmail from '../utils/sendEmail.js';
import mongoose from 'mongoose';

// ======================== USER MANAGEMENT CONTROLLERS ========================

// Helper function to check if user is supaadmin
const isSupaadmin = (user) => {
  return user && user.supaadmin === true;
};

// Get all users with pagination, filtering, and sorting
export const getAllUsers = async (req, res) => {
  // Only supaadmin can get all users
  if (!isSupaadmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden: Only supaadmin can manage users' });
  }
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      isVerified = '',
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Search filter (firstName, lastName, email, phone)
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Role filter
    if (role) {
      filter.role = role;
    }

    // Verification status filter
    if (isVerified !== '') {
      filter.isVerified = isVerified === 'true';
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Define sort order with validation
    const sortOrder = order === 'desc' ? -1 : 1;
    const allowedSortFields = ['createdAt', 'firstName', 'lastName', 'email', 'phone', 'role', 'isVerified'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortObj = { [sortField]: sortOrder };

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Fetch users
    const users = await User.find(filter)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire -lastLoginEmail -lastLoginPassword')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      message: 'Users fetched successfully',
      users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalUsers: total,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire -lastLoginEmail -lastLoginPassword')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Try to get HubSpot data if available
    const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;
    if (HUBSPOT_PRIVATE_API_KEY) {
      try {
        const HUBSPOT_API_URL = `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(
          user.email
        )}?idProperty=email&properties=firstname,lastname,email,phone,country,state,city,zip,address,lifecyclestage,client_type`;

        const response = await axios.get(HUBSPOT_API_URL, {
          headers: {
            Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
            "Content-Type": "application/json",
          },
        });

        const contact = response.data;
        const userData = {
          ...user,
          ...contact.properties
        };

        return res.status(200).json({
          message: 'User fetched successfully',
          user: userData
        });
      } catch (hubspotError) {
        // If HubSpot fails, return just the user data
        console.log("HubSpot API error:", hubspotError.response?.data || hubspotError.message);
      }
    }

    return res.status(200).json({
      message: 'User fetched successfully',
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Create new user (Supaadmin only)
export const createUser = async (req, res) => {
  // Only supaadmin can create users
  if (!isSupaadmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden: Only supaadmin can manage users' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { firstName, lastName, email, phone, role, sendVerificationEmail, createHubSpotContact } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ message: 'First name, last name, email, and phone are required' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash('123456', 10); // Default password

    // Create user
    const [user] = await User.create(
      [
        {
          firstName,
          lastName,
          email,
          phone,
          password: hashedPassword,
          role: role || 'user',
          verificationToken,
          isVerified: false
        },
      ],
      { session }
    );

    // Create HubSpot contact (only if requested)
    if (createHubSpotContact !== false) {
      const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;
      if (HUBSPOT_PRIVATE_API_KEY) {
        try {
          const HUBSPOT_API_URL = "https://api.hubapi.com/crm/v3/objects/contacts";
          const hubSpotContact = {
            properties: {
              email: user.email,
              firstname: user.firstName,
              lastname: user.lastName,
              phone: user.phone,
            },
          };

          await axios.post(HUBSPOT_API_URL, hubSpotContact, {
            headers: {
              Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (hubspotError) {
          console.log("HubSpot creation error:", hubspotError.response?.data || hubspotError.message);
          // Continue even if HubSpot fails
        }
      }
    }

    // Send verification email if requested
    if (sendVerificationEmail !== false) {
      try {
        const verificationUrl = `${process.env.CLIENT_URL}/verify/${verificationToken}`;
        const templateId = process.env.ACCOUNT_VERIFICATION_TEMPLATE_ID;
        const data = {
          firstName: user.firstName,
          lastName: user.lastName,
          url: verificationUrl,
          subject: "Royal Vault Portal - Account Verification"
        };
        await sendEmail(user.email, data, templateId);
      } catch (emailError) {
        console.log("Email sending error:", emailError);
        // Continue even if email fails
      }
    }

    await session.commitTransaction();
    session.endSession();

    const userResponse = await User.findById(user._id)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire -lastLoginEmail -lastLoginPassword')
      .lean();

    return res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Update user (Supaadmin can update any, user can update own profile)
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, phone, role, isVerified, supaadmin } = req.body;
    const currentUser = req.user;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check permissions: user can only update own profile (except role, isVerified, and supaadmin)
    if (!isSupaadmin(currentUser) && currentUser.id !== userId) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    // Only supaadmin can change role, verification status, and supaadmin field
    if ((role !== undefined || isVerified !== undefined || supaadmin !== undefined) && !isSupaadmin(currentUser)) {
      return res.status(403).json({ message: 'Only supaadmin can change role, verification status, and supaadmin field' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken by another user' });
      }
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined && isSupaadmin(currentUser)) user.role = role;
    if (isVerified !== undefined && isSupaadmin(currentUser)) user.isVerified = isVerified;
    if (supaadmin !== undefined && isSupaadmin(currentUser)) user.supaadmin = supaadmin;

    await user.save();

    // Update HubSpot contact if available
    const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;
    if (HUBSPOT_PRIVATE_API_KEY) {
      try {
        const hubSpotContact = {
          properties: {
            email: user.email,
            firstname: user.firstName,
            lastname: user.lastName,
            phone: user.phone,
          }
        };

        await axios.patch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(user.email)}?idProperty=email`,
          hubSpotContact,
          {
            headers: {
              Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (hubspotError) {
        console.log("HubSpot update error:", hubspotError.response?.data || hubspotError.message);
        // Continue even if HubSpot fails
      }
    }

    const updatedUser = await User.findById(userId)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire -lastLoginEmail -lastLoginPassword')
      .lean();

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Delete user (Supaadmin only)
export const deleteUser = async (req, res) => {
  // Only supaadmin can delete users
  if (!isSupaadmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden: Only supaadmin can manage users' });
  }

  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Prevent deleting own account
    if (req.user.id === userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Reset user password (Supaadmin only)
export const resetUserPassword = async (req, res) => {
  // Only supaadmin can reset user passwords
  if (!isSupaadmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden: Only supaadmin can manage users' });
  }

  try {
    const { userId } = req.params;
    const { newPassword, sendEmail: sendPasswordEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new password or use provided one
    const password = newPassword || crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.isVerified = true; // Mark as verified when admin resets password
    user.verificationToken = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    // Send password reset email if requested
    if (sendPasswordEmail !== false) {
      try {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${user.resetPasswordToken || 'manual-reset'}`;
        const templateId = process.env.PASSWORD_RESET_TEMPLATE_ID;
        const data = {
          firstName: user.firstName,
          lastName: user.lastName,
          url: resetUrl,
          subject: "Royal Vault Portal - Password Reset",
          password: password // Include password in email if needed
        };
        await sendEmail(user.email, data, templateId);
      } catch (emailError) {
        console.log("Email sending error:", emailError);
        // Continue even if email fails
      }
    }

    return res.status(200).json({
      message: 'Password reset successfully',
      password: sendPasswordEmail === false ? password : undefined // Only return password if not sending email
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Activate/Deactivate user (Supaadmin only)
export const toggleUserVerification = async (req, res) => {
  // Only supaadmin can toggle user verification
  if (!isSupaadmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden: Only supaadmin can manage users' });
  }

  try {
    const { userId } = req.params;
    const { isVerified } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isVerified = isVerified !== undefined ? isVerified : !user.isVerified;
    await user.save();

    const updatedUser = await User.findById(userId)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire -lastLoginEmail -lastLoginPassword')
      .lean();

    return res.status(200).json({
      message: `User ${updatedUser.isVerified ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Toggle user verification error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Change user role (Supaadmin only)
export const changeUserRole = async (req, res) => {
  // Only supaadmin can change user roles
  if (!isSupaadmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden: Only supaadmin can manage users' });
  }

  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "user" or "admin"' });
    }

    // Prevent changing own role
    if (req.user.id === userId) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    const updatedUser = await User.findById(userId)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire -lastLoginEmail -lastLoginPassword')
      .lean();

    return res.status(200).json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Change user role error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get user statistics (Supaadmin only)
export const getUserStatistics = async (req, res) => {
  // Only supaadmin can get user statistics
  if (!isSupaadmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden: Only supaadmin can manage users' });
  }

  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const unverifiedUsers = await User.countDocuments({ isVerified: false });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const regularUsers = await User.countDocuments({ role: 'user' });

    // Get users created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get users who logged in recently (last 30 days)
    const recentActiveUsers = await User.countDocuments({
      lastLoginAt: { $gte: thirtyDaysAgo }
    });

    return res.status(200).json({
      message: 'User statistics fetched successfully',
      statistics: {
        total: totalUsers,
        verified: verifiedUsers,
        unverified: unverifiedUsers,
        admins: adminUsers,
        users: regularUsers,
        recentUsers, // Last 30 days
        recentActiveUsers // Last 30 days
      }
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Bulk operations (Supaadmin only)
export const bulkUpdateUsers = async (req, res) => {
  // Only supaadmin can perform bulk operations
  if (!isSupaadmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden: Only supaadmin can manage users' });
  }

  try {
    const { userIds, updates } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ message: 'Updates object is required' });
    }

    // Validate user IDs
    const validUserIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validUserIds.length === 0) {
      return res.status(400).json({ message: 'No valid user IDs provided' });
    }

    // Prevent bulk updating own account
    if (validUserIds.includes(req.user.id)) {
      return res.status(400).json({ message: 'You cannot bulk update your own account' });
    }

    // Build update object (only allow certain fields)
    const allowedFields = ['role', 'isVerified'];
    const updateObj = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateObj[field] = updates[field];
      }
    }

    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // Perform bulk update
    const result = await User.updateMany(
      { _id: { $in: validUserIds } },
      { $set: updateObj }
    );

    return res.status(200).json({
      message: 'Users updated successfully',
      updatedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('Bulk update users error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Bulk delete users (Supaadmin only)
export const bulkDeleteUsers = async (req, res) => {
  // Only supaadmin can perform bulk delete
  if (!isSupaadmin(req.user)) {
    return res.status(403).json({ message: 'Forbidden: Only supaadmin can manage users' });
  }

  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    // Validate user IDs
    const validUserIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validUserIds.length === 0) {
      return res.status(400).json({ message: 'No valid user IDs provided' });
    }

    // Prevent bulk deleting own account
    if (validUserIds.includes(req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Perform bulk delete
    const result = await User.deleteMany({ _id: { $in: validUserIds } });

    return res.status(200).json({
      message: 'Users deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

