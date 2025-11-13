import express from 'express';
import {
    upload,
    uploadFile,
    uploadImage,
    uploadFileController,
    generateImageUploadUrl,
    generateFileUploadUrl
} from '../controllers/uploadController.js';

const router = express.Router();

// Legacy upload routes (still supported for backward compatibility)
// Upload image route
router.post('/image', upload.single('image'), uploadImage);

// Upload file route (for all file types)
router.post('/file', uploadFile.single('file'), uploadFileController);

// New signed URL routes for direct client uploads
// Generate signed upload URL for image
router.post('/image/signed-url', generateImageUploadUrl);

// Generate signed upload URL for file
router.post('/file/signed-url', generateFileUploadUrl);

export default router;
