import mongoose from 'mongoose';

const { Schema } = mongoose;

const dealSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to Category model
    required: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory', // Reference to SubCategory model
    required: true
  },
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Type', // Reference to Type model
    required: true
  },
  strategy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy', // Reference to Strategy model
    required: true
  },
  requirement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement', // Reference to Requirement model
    required: true
  },
  source: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Source', // Reference to Source model
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model
    required: true
  },
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

const Deal = mongoose.model('Deal', dealSchema);

export default Deal;
