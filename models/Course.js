import mongoose from 'mongoose';
const { Schema } = mongoose;

// CourseGroup Schema (now bottom level)
const courseGroupSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Course Schema (now middle level)
const courseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    courseGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseGroup', required: true },
    lectures: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Lecture Schema (now top level)
const lectureSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    videoUrl: { type: String, required: true },
    pdfUrl: { type: String },
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Lecture = mongoose.model('Lecture', lectureSchema);
const Course = mongoose.model('Course', courseSchema);
const CourseGroup = mongoose.model('CourseGroup', courseGroupSchema);

export { Lecture, Course, CourseGroup };