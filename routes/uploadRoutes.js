import express from 'express';
import { upload, uploadFile, uploadImage, uploadFileController } from '../controllers/uploadController.js';

const router = express.Router();

// Upload image route
router.post('/image', upload.single('image'), uploadImage);

// Upload file route (for all file types)
router.post('/file', uploadFile.single('file'), uploadFileController);

export default router;
