import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Hubspot from '@hubspot/api-client';
import axios from 'axios';
import sendEmail from '../utils/sendEmail.js';

// Base HubSpot API URL
const HUBSPOT_API_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';
// Generate JWT tokens
const generateAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (id, role) =>
  jwt.sign({ id, role }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

// ======================== CONTROLLERS ========================

// Register user & create HubSpot contact
export const registerUser = async (req, res) => {
  try {
    const {firstName, lastName, email, phone, role } = req.body;
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ $or: [{ email }] });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: 123456,
      role: role || 'user',
      verificationToken,
    });

    // Create HubSpot contact
    const hubSpotContact = {
      properties: {
        email: user.email,
        firstname: user.firstName,
        lastname: user.lastName,
        phone: user.phone,
      },
    };

    // const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY; // Ensure this is in your .env file

    // // Send POST request to HubSpot API
    // await axios.post(HUBSPOT_API_URL, hubSpotContact, {
    //   headers: {
    //     Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    // });

    // Send the verification email
    const verificationUrl = `${process.env.CLIENT_URL}/verify/${verificationToken}`;

    const templateId = process.env.ACCOUNT_VERIFICATION_TEMPLATE_ID;
    await sendEmail(email, firstName + lastName, verificationUrl, templateId);

    // Generate tokens for immediate login
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({ 
      message: 'Registered successfully. You are now logged in.', 
      accessToken, 
      refreshToken 
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
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
    
    // Save refresh token
    user.refreshToken = refreshToken;
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
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified)
      return res.status(403).json({ message: 'Please verify your email before logging in.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    
    // Save login credentials and timestamp
    user.refreshToken = refreshToken;
    user.lastLoginEmail = email;
    user.lastLoginPassword = password; // Note: This stores the plain text password
    user.lastLoginAt = new Date();
    
    await user.save();
    res.json({ accessToken, refreshToken });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Refresh access token
export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }
    const accessToken = generateAccessToken(user.id, user.role);
    res.json({ accessToken });
  } catch (e) {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// Logout
export const logoutUser = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'No refresh token provided' });
  const user = await User.findOne({ refreshToken });
  if (!user) return res.status(400).json({ message: 'User not found' });
  user.refreshToken = null;
  await user.save();
  res.json({ message: 'Logged out successfully' });
};

// Basic user profile (MongoDB only) - for AuthContext and other components
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    res.json(user);
  } catch (e) {
    console.log("Get user error:", e);
    res.status(500).json({ message: e.message });
  }
};

// Detailed profile with HubSpot data - for Profile page only
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    console.log(user);
    
    const HUBSPOT_PRIVATE_API_KEY = process.env.HUBSPOT_PRIVATE_API_KEY;

    // Request additional properties from HubSpot that might be useful for profile display
    const HUBSPOT_API_URL = `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(
      user.email
    )}?idProperty=email&properties=firstname,lastname,email,phone,company,country,state,city,zip,address,lifecyclestage,hs_lead_status,createdate,lastmodifieddate,website,industry,jobtitle,annualrevenue,numberofemployees`;
    
    try {
      const response = await axios.get(HUBSPOT_API_URL, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_PRIVATE_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      
      const contact = response.data;
      console.log("HubSpot Contact:", contact);
      
      // Merge user data with HubSpot properties, prioritizing HubSpot data
      const profileData = {
        ...user.toObject(),
        ...contact.properties,
        // Ensure we have the user ID and other essential fields
        _id: user._id,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
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
    await sendEmail(email, user.firstName + user.lastName, resetUrl, templateId);

    res.json({ message: 'Password reset email sent.' });
  } catch (e) {
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
    user.resetPasswordExpire = null;
    
    // Generate tokens for immediate login
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    
    // Save refresh token
    user.refreshToken = refreshToken;
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
