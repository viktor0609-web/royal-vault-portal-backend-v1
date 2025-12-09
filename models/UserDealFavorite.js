import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * UserDealFavorite Schema
 * 
 * Tracks which deals users have starred/favorited
 * Each user can star multiple deals, and each deal can be starred by multiple users
 */
const userDealFavoriteSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index to ensure one user can only star a deal once
userDealFavoriteSchema.index({ user: 1, deal: 1 }, { unique: true });

// Index for faster queries
userDealFavoriteSchema.index({ user: 1 });
userDealFavoriteSchema.index({ deal: 1 });

const UserDealFavorite = mongoose.model('UserDealFavorite', userDealFavoriteSchema);

export default UserDealFavorite;

