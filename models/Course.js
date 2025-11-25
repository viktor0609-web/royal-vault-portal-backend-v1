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
    ebookName: { type: String, default: '' }, // Ebook display name
    ebookUrl: { type: String, default: '' }, // Ebook file URL
  },
  { timestamps: true }
);

// Lecture Schema (now top level)
const lectureSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    content: { type: String }, // Rich text content
    videoUrl: { type: String }, // Video URL (MP4, WebM, OGG, etc.)
    relatedFiles: [{
      name: { type: String },
      uploadedUrl: { type: String } // Uploaded file URL
    }],
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    displayOnPublicPage: { type: Boolean, default: false }, // Whether to display on public page
  },
  { timestamps: true }
);

// Add indexes for performance optimization
courseGroupSchema.index({ createdBy: 1 });
courseGroupSchema.index({ title: 'text', description: 'text' }); // Text search index

courseSchema.index({ courseGroup: 1 }); // Critical: used in many queries
courseSchema.index({ createdBy: 1 });
courseSchema.index({ title: 'text', description: 'text' }); // Text search index

lectureSchema.index({ displayOnPublicPage: 1 }); // Critical: used for filtering
lectureSchema.index({ createdBy: 1 });
lectureSchema.index({ completedBy: 1 }); // For array queries
lectureSchema.index({ title: 'text', description: 'text' }); // Text search index

// Add pre-save middleware to validate related files
lectureSchema.pre('save', function(next) {
  // Validate related files
  if (this.relatedFiles && this.relatedFiles.length > 0) {
    for (let i = 0; i < this.relatedFiles.length; i++) {
      const file = this.relatedFiles[i];
      const hasUploadedUrl = file.uploadedUrl && file.uploadedUrl.trim() !== '';
      
      if (!hasUploadedUrl) {
        const error = new Error(`Related file ${i + 1} must have an uploaded file`);
        return next(error);
      }
    }
  }
  
  next();
});

const Lecture = mongoose.model('Lecture', lectureSchema);
const Course = mongoose.model('Course', courseSchema);
const CourseGroup = mongoose.model('CourseGroup', courseGroupSchema);

export { Lecture, Course, CourseGroup };