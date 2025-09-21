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
    content: { type: String }, // Rich text content
    youtubeUrl: { type: String }, // YouTube video URL
    youtubeVideoId: { type: String }, // Extracted YouTube video ID for embedding
    relatedFiles: [{
      name: { type: String },
      uploadedUrl: { type: String } // Uploaded file URL
    }],
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Helper function to extract YouTube video ID from URL
const extractYouTubeVideoId = (url) => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

// Add pre-save middleware to validate related files and extract YouTube video ID
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
  
  // Extract YouTube video ID from URL (if provided)
  if (this.youtubeUrl) {
    this.youtubeVideoId = extractYouTubeVideoId(this.youtubeUrl);
  }
  
  next();
});

const Lecture = mongoose.model('Lecture', lectureSchema);
const Course = mongoose.model('Course', courseSchema);
const CourseGroup = mongoose.model('CourseGroup', courseGroupSchema);

export { Lecture, Course, CourseGroup };