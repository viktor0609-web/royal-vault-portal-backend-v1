import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  supaadmin: { type: Boolean, default: false },
  refreshToken: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  lastLoginEmail: { type: String },
  lastLoginPassword: { type: String },
  lastLoginAt: { type: Date },
}, { timestamps: true });


export default mongoose.model("User", userSchema);
