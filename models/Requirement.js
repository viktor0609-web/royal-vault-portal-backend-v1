import mongoose from 'mongoose';

const { Schema } = mongoose;

const requirementSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
}, {
  timestamps: true
});

const Requirement = mongoose.model('Requirement', requirementSchema);

export default Requirement;
