import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Deal Schema
 * 
 * Field Requirements:
 * - Most fields are optional to allow flexible deal creation
 * - Empty strings and arrays are allowed
 * - Only createdBy is required for tracking purposes
 * - Image field supports both file paths (from uploads) and direct URLs
 * 
 * Date Handling Strategy:
 * - MongoDB stores ALL dates in UTC automatically (via timestamps: true)
 * - createdAt and updatedAt are automatically managed by Mongoose
 * - Frontend should convert to user's local timezone for display using:
 *   new Date(dateString).toLocaleDateString() or .toLocaleString()
 * - NEVER manually convert dates before saving to MongoDB - let MongoDB handle UTC storage
 */
const dealSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    subCategory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory',
      },
    ],
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Type',
      },
    ],
    strategy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Strategy',
      },
    ],
    requirement: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Requirement',
      },
    ],
    image: {
      type: String,
      trim: true,
      default: '',
    },
    url: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Deal = mongoose.model('Deal', dealSchema);

export default Deal;
