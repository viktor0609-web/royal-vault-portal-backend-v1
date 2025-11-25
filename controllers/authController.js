import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import sendEmail from '../utils/sendEmail.js';
import mongoose from 'mongoose';

// Generate JWT tokens
const generateAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (id, role) =>
  jwt.sign({ id, role }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

// Hash refresh token before storing
const hashRefreshToken = async (token) => {
  return await bcrypt.hash(token, 10);
};

// Compare refresh token (handles both hashed and plain text for backward compatibility)
const compareRefreshToken = async (plainToken, storedToken) => {
  if (!storedToken) return false;
  // If stored token looks like a JWT (contains dots), it's plain text (legacy)
  // Otherwise, it's hashed and we need to use bcrypt.compare
  if (storedToken.includes('.')) {
    return plainToken === storedToken;
  }
  return await bcrypt.compare(plainToken, storedToken);
};

// ======================== CONTROLLERS ========================

// Register user & create HubSpot contact
export const registerUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { firstName, lastName, email, phone, role } = req.body;
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Create user inside transaction
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
        },
      ],
      { session }
    );

    // === Create HubSpot contact ===
    const HUBSPOT_API_URL = "https://api.hubapi.com/crm/v3/objects/contacts";
    const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;

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

    // === Send verification email ===
    const verificationUrl = `${process.env.CLIENT_URL}/verify/${verificationToken}`;
    const templateId = process.env.ACCOUNT_VERIFICATION_TEMPLATE_ID;
    const data = { firstName: user.firstName, lastName: user.lastName, url: verificationUrl, subject: "Royal Vault Portal - Account Verification" };
    await sendEmail(user.email, data, templateId);

    // === Generate JWT tokens ===
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Hash refresh token before storing
    const hashedRefreshToken = await hashRefreshToken(refreshToken);
    user.refreshToken = hashedRefreshToken;
    await user.save({ session });

    // ✅ Commit transaction only after all success
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Registered successfully. You are now logged in.',
      accessToken,
      refreshToken,
    });
  } catch (e) {
    // ❌ Rollback DB changes if any error occurs
    await session.abortTransaction();
    session.endSession();

    console.error('Registration error:', e.message);
    if (e.status == 409) {
      res.status(500).json({ message: "You are already registered in our system" });
    }
    else {
      res.status(500).json({ message: e.message });
    }
  }
};

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.isVerified = true;
    user.verificationToken = null;
    user.password = await bcrypt.hash(password, 10);

    // Generate tokens for immediate login
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    // Hash refresh token before storing
    const hashedRefreshToken = await hashRefreshToken(refreshToken);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    res.json({
      message: 'Email verified successfully. You are now logged in.',
      accessToken,
      refreshToken
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'You are not registered yet. Please register first.' });
    if (!user.isVerified) {
      // return res.status(403).json({ message: 'Please verify your email before logging in.' });
      return res.status(403).json({ message: 'Please reset your email password before log in' });
    }


    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid or incorrect password' });

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    // Hash refresh token before storing
    const hashedRefreshToken = await hashRefreshToken(refreshToken);
    user.refreshToken = hashedRefreshToken;
    user.lastLoginEmail = email;
    user.lastLoginPassword = password; // Note: This stores the plain text password
    user.lastLoginAt = new Date();

    await user.save();
    res.json({ accessToken, refreshToken });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Refresh access token with rotation
export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    // Compare refresh token (handles both hashed and plain text for backward compatibility)
    const isValidToken = await compareRefreshToken(refreshToken, user.refreshToken);
    if (!isValidToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens (token rotation)
    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);

    // Hash and save new refresh token
    const hashedRefreshToken = await hashRefreshToken(newRefreshToken);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    // Return both tokens
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (e) {
    // Handle specific JWT errors
    if (e.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Refresh token has expired' });
    }
    if (e.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid refresh token format' });
    }
    console.error('Refresh token error:', e.message);
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// Logout
export const logoutUser = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'No refresh token provided' });
  }

  try {
    // Verify token to get user ID
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Verify the token matches (handles both hashed and plain text)
    const isValidToken = await compareRefreshToken(refreshToken, user.refreshToken);
    if (!isValidToken) {
      return res.status(400).json({ message: 'Invalid refresh token' });
    }

    // Clear refresh token
    user.refreshToken = null;
    await user.save();

    res.json({ message: 'Logged out successfully' });
  } catch (e) {
    // If token is invalid/expired, still allow logout (idempotent)
    if (e.name === 'TokenExpiredError' || e.name === 'JsonWebTokenError') {
      return res.json({ message: 'Logged out successfully' });
    }
    console.error('Logout error:', e.message);
    return res.status(500).json({ message: 'Error during logout' });
  }
};

// Basic user profile (MongoDB only) - for AuthContext and other components
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken -verificationToken -updatedAt -resetPasswordToken -resetPasswordExpire -lastLoginEmail -lastLoginPassword -lastLoginAt');

    const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;

    // Request additional properties from HubSpot that might be useful for profile display
    const HUBSPOT_API_URL = `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(
      user.email
    )}?idProperty=email&properties=client_type`;

    try {
      const response = await axios.get(HUBSPOT_API_URL, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const contact = response.data;

      // Merge user data with HubSpot properties, prioritizing HubSpot data
      const profileData = {
        ...user.toObject(),
        ...contact.properties,
      };
      res.json(profileData);
    }
    catch (hubspotError) {

      console.error("HubSpot API error:", hubspotError.response?.data || hubspotError.message);
      // If HubSpot fails, return just the user data
      res.json(user);
    }

  } catch (e) {
    console.log("Get user error:", e);
    res.status(500).json({ message: e.message });
  }
};

// Detailed profile with HubSpot data - for Profile page only
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken -createdAt -updatedAt -resetPasswordToken -resetPasswordExpire -lastLoginEmail -lastLoginPassword -lastLoginAt -verificationToken');
    console.log(user);

    const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;

    // Request additional properties from HubSpot that might be useful for profile display
    const HUBSPOT_API_URL = `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(
      user.email
    )}?idProperty=email&properties=firstname,lastname,email,phone,country,state,city,zip,address,lifecyclestage,client_type`;

    try {
      const response = await axios.get(HUBSPOT_API_URL, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const contact = response.data;
      console.log("HubSpot Contact:", contact);

      // Merge user data with HubSpot properties, prioritizing local database data for profile fields
      const profileData = {
        ...user.toObject(),
        ...contact.properties
      };

      res.json(profileData);
    } catch (hubspotError) {
      console.log("HubSpot API error:", hubspotError.response?.data || hubspotError.message);
      // If HubSpot fails, return just the user data
      res.json(user);
    }
  } catch (e) {
    console.log("Profile error:", e);
    res.status(500).json({ message: e.message });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const templateId = process.env.PASSWORD_RESET_TEMPLATE_ID;
    const data = { firstName: user.firstName, lastName: user.lastName, url: resetUrl, subject: "Royal Vault Portal - Password Reset" };
    await sendEmail(email, data, templateId);

    res.json({ message: 'Password reset email sent.' });
  } catch (e) {
    console.log("Forgot password error:", e);
    res.status(500).json({ message: e.message });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.isVerified = true;
    user.verificationToken = null;
    user.resetPasswordExpire = null;

    // Generate tokens for immediate login
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    // Hash refresh token before storing
    const hashedRefreshToken = await hashRefreshToken(refreshToken);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    res.json({
      message: 'Password reset successful. You are now logged in.',
      accessToken,
      refreshToken
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {

  try {
    const { firstName, lastName, email, phone, utms, lifecyclestage, street, city, state, postal } = req.body;
    const userId = req.user.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken by another user' });
      }
    }

    // Update user fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    // // Update HubSpot contact if HubSpot integration is enabled
    const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;
    if (HUBSPOT_PRIVATE_API_KEY) {
      try {
        const hubSpotContact = {
          properties: {
            email: user.email,
            firstname: user.firstName,
            lastname: user.lastName,
            phone: user.phone,
            lifecyclestage: user.lifecyclestage,
          }
        };

        // Add UTM parameters if provided

        hubSpotContact.properties.utms = user.utms;
        // Add address fields if provided
        hubSpotContact.properties.address = street;
        hubSpotContact.properties.city = city;
        hubSpotContact.properties.state = state;
        hubSpotContact.properties.zip = postal;

        console.log("HubSpot Contact:", hubSpotContact);


        // Update HubSpot contact
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
        // Continue even if HubSpot update fails
      }
    }

    // Return updated user data (excluding sensitive fields)
    const HUBSPOT_API_URL = `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(
      user.email
    )}?idProperty=email&properties=firstname,lastname,email,phone,country,state,city,zip,address,lifecyclestage,client_type`;

    try {
      const response = await axios.get(HUBSPOT_API_URL, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const contact = response.data;

      console.log("HubSpot Contact:", contact);

      console.log("updated User", user);


      // Merge user data with HubSpot properties, prioritizing local database data for profile fields
      const profileData = {
        ...user.toObject(),
        ...contact.properties
      };

      res.json({
        message: 'Profile updated successfully',
        user: profileData
      });
    } catch (hubspotError) {
      console.log("HubSpot API error:", hubspotError.response?.data || hubspotError.message);
      // If HubSpot fails, return just the user data
      res.json(user);
    }

  } catch (e) {
    console.log("Update profile error:", e);
    res.status(500).json({ message: e.message });
  }
};