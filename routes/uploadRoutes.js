import express from 'express';
import { upload, uploadImage } from '../controllers/uploadController.js';

const router = express.Router();

// Upload image route
router.post('/image', upload.single('image'), uploadImage);

export default router;
