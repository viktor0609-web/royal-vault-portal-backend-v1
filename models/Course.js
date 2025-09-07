import mongoose from 'mongoose';
const { Schema } = mongoose;

// Course Group Schema
const courseGroupSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String, // URL for the Icon
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // assuming User model is present
      required: true,
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Course Schema
const courseSchema = new Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseGroup',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true, // URL to access the course content
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // assuming User model is present
      required: true,
    },
    pdfUrl: {
      type: String, // URL to PDF resource
    },
    completedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // users who have completed this course
      },
    ],
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

const CourseGroup = mongoose.model('CourseGroup', courseGroupSchema);
const Course = mongoose.model('Course', courseSchema);

export { CourseGroup, Course };
