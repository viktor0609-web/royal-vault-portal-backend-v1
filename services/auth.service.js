// Authentication service - business logic layer
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import sendEmail from "../utils/sendEmail.js";
import mongoose from "mongoose";
import {
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
} from "../utils/errors.js";
import { validateEmail, validateRequired } from "../utils/validation.js";

// Generate JWT token
const generateAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "7d",
  });

export const authService = {
  // Register user & create HubSpot contact
  registerUser: async (userData) => {
    const { firstName, lastName, email, phone, role } = userData;

    // Validation
    validateRequired(firstName, "First name");
    validateRequired(lastName, "Last name");
    validateRequired(email, "Email");
    validateRequired(phone, "Phone");
    validateEmail(email);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user exists
      const existing = await User.findOne({ email });
      if (existing) {
        throw new ConflictError("User already exists");
      }

      // Create user
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash("123456", 10);

      const [user] = await User.create(
        [
          {
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword,
            role: role || "user",
            verificationToken,
          },
        ],
        { session }
      );

      // Create HubSpot contact
      if (process.env.HUBSPOT_PRIVATE_API_KEY) {
        try {
          const HUBSPOT_API_URL =
            "https://api.hubapi.com/crm/v3/objects/contacts";
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
              Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_API_KEY}`,
              "Content-Type": "application/json",
            },
          });
        } catch (hubspotError) {
          // Log but don't fail registration if HubSpot fails
          console.error("HubSpot contact creation failed:", hubspotError);
        }
      }

      // Send verification email
      const verificationUrl = `${process.env.CLIENT_URL}/verify/${verificationToken}`;
      const templateId = process.env.ACCOUNT_VERIFICATION_TEMPLATE_ID;
      const emailData = {
        firstName: user.firstName,
        lastName: user.lastName,
        url: verificationUrl,
        subject: "Royal Vault Portal - Account Verification",
      };

      try {
        await sendEmail(user.email, emailData, templateId);
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Continue even if email fails
      }

      // Generate token
      const accessToken = generateAccessToken(user.id, user.role);

      await session.commitTransaction();
      session.endSession();

      return {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        accessToken,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  // Login user
  loginUser: async (email, password) => {
    validateRequired(email, "Email");
    validateRequired(password, "Password");
    validateEmail(email);

    const user = await User.findOne({ email });
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const accessToken = generateAccessToken(user.id, user.role);

    return {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        supaadmin: user.supaadmin,
        isVerified: user.isVerified,
      },
      accessToken,
    };
  },

  // Get user by ID
  getUserById: async (userId) => {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw new NotFoundError("User");
    }
    return user;
  },

  // Verify email
  verifyEmail: async (token) => {
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      throw new NotFoundError("Verification token");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return { message: "Email verified successfully" };
  },

  // Forgot password
  forgotPassword: async (email) => {
    validateRequired(email, "Email");
    validateEmail(email);

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return { message: "If email exists, password reset link has been sent" };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const templateId = process.env.PASSWORD_RESET_TEMPLATE_ID;
    const emailData = {
      firstName: user.firstName,
      lastName: user.lastName,
      url: resetUrl,
      subject: "Royal Vault Portal - Password Reset",
    };

    try {
      await sendEmail(user.email, emailData, templateId);
    } catch (error) {
      console.error("Email sending failed:", error);
    }

    return { message: "If email exists, password reset link has been sent" };
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    validateRequired(token, "Token");
    validateRequired(newPassword, "Password");

    if (newPassword.length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid or expired reset token");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: "Password reset successfully" };
  },
};

