import mongoose from 'mongoose';

const { Schema } = mongoose;

const strategySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
}, {
  timestamps: true
});

const Strategy = mongoose.model('Strategy', strategySchema);

export default Strategy;
