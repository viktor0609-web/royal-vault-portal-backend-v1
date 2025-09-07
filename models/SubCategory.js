import mongoose from 'mongoose';

const { Schema } = mongoose;

const subCategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Link to Category model
    required: true
  }
}, {
  timestamps: true
});

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

export default SubCategory;
