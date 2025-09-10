import mongoose from 'mongoose';

const { Schema } = mongoose;

const subCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

export default SubCategory;
