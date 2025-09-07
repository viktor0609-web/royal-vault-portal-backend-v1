import mongoose from 'mongoose';

const { Schema } = mongoose;

const typeSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
}, {
  timestamps: true
});

const Type = mongoose.model('Type', typeSchema);

export default Type;
