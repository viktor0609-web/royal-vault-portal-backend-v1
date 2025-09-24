import mongoose from 'mongoose';
const { Schema } = mongoose;

const promotionalSmsListSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

const PromotionalSmsList = mongoose.model('PromotionalSmsList', promotionalSmsListSchema);
export default PromotionalSmsList;
