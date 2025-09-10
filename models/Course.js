import mongoose from 'mongoose';
const { Schema } = mongoose;

// Lecture Schema
const lectureSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    videoUrl: { type: String, required: true },
    pdfUrl: { type: String },
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Course Schema (nested in CourseGroup)
const courseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    url: { type: String, required: true }, // main course URL
    lectures: [lectureSchema], // embed multiple lectures
  },
  { timestamps: true }
);

// CourseGroup Schema (main)
const courseGroupSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true }, // Iconify icon string
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courses: [courseSchema], // embed multiple courses
  },
  { timestamps: true }
);

const CourseGroup = mongoose.model('CourseGroup', courseGroupSchema);

export { CourseGroup };
