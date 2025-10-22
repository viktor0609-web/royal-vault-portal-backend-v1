import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Deal Schema
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
      required: true,
      trim: true,
    },
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
      },
    ],
    subCategory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory',
        required: true,
      },
    ],
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Type',
        required: true,
      },
    ],
    strategy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Strategy',
        required: true,
      },
    ],
    requirement: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Requirement',
        required: true,
      },
    ],
    image: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
      required: true,
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
