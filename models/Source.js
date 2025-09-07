import mongoose from 'mongoose';

const { Schema } = mongoose;

const sourceSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
}, {
  timestamps: true
});

const Source = mongoose.model('Source', sourceSchema);

export default Source;
