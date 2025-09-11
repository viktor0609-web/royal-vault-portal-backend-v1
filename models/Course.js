import mongoose from 'mongoose';
const { Schema } = mongoose;

// Lecture Schema
const lectureSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    videoUrl: { type: String, required: true },
    pdfUrl: { type: String },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Course Schema
const courseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    url: { type: String, required: true },
    courseGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseGroup', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// CourseGroup Schema
const courseGroupSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const CourseGroup = mongoose.model('CourseGroup', courseGroupSchema);
const Course = mongoose.model('Course', courseSchema);
const Lecture = mongoose.model('Lecture', lectureSchema);

export { CourseGroup, Course, Lecture };