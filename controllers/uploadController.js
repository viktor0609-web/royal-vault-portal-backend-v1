import multer from 'multer';
import path from 'path';
import supabase from '../config/supabase.js';

// Configure multer to use memory storage (files will be uploaded to Supabase)
const memoryStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const fileFilter = (req, file, cb) => {
  // Allow all file types for general uploads
  cb(null, true);
};

export const upload = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export const uploadFile = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for general files
  }
});

/**
 * Generate a unique filename with timestamp and random suffix
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const randomSuffix = Math.round(Math.random() * 1E9);
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  return `${nameWithoutExt}-${timestamp}-${randomSuffix}${ext}`;
};

/**
 * Upload file to Supabase Storage
 */
const uploadToSupabase = async (file, bucketName, folder = '') => {
  try {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    const filePath = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      path: data.path,
      publicUrl: publicUrl,
      filename: uniqueFilename
    };
  } catch (error) {
    console.error('Error in uploadToSupabase:', error);
    throw error;
  }
};

// Upload image controller
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Upload to Supabase Storage - 'images' bucket
    const result = await uploadToSupabase(req.file, 'royal-vault-images', 'images');

    res.status(200).json({
      message: 'Image uploaded successfully',
      url: result.publicUrl,
      filename: result.filename,
      path: result.path
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      message: 'Server Error',
      error: error.message
    });
  }
};

// Upload file controller (for all file types)
export const uploadFileController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Upload to Supabase Storage - 'files' bucket
    const result = await uploadToSupabase(req.file, 'royal-vault-files', 'files');

    res.status(200).json({
      message: 'File uploaded successfully',
      url: result.publicUrl,
      filename: result.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: result.path
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Generate signed upload URL for direct client upload
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path where the file will be stored
 */
const generateSignedUploadUrl = async (bucketName, filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error('Error generating signed upload URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in generateSignedUploadUrl:', error);
    throw error;
  }
};

/**
 * Get signed URL for reading a file (if needed)
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path to the file in the bucket
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 */
export const getSignedUrl = async (bucketName, filePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedUrl:', error);
    throw error;
  }
};

/**
 * Generate signed upload URL for image
 * POST /api/upload/image/signed-url
 * Body: { filename: string, contentType: string }
 */
export const generateImageUploadUrl = async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({
        message: 'Filename and contentType are required'
      });
    }

    // Validate it's an image
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({
        message: 'Only image files are allowed'
      });
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(filename);
    const filePath = `images/${uniqueFilename}`;

    // Generate signed upload URL
    const signedUrlData = await generateSignedUploadUrl('royal-vault-images', filePath);

    // Get public URL for after upload
    const { data: { publicUrl } } = supabase.storage
      .from('royal-vault-images')
      .getPublicUrl(filePath);

    res.status(200).json({
      signedUrl: signedUrlData.signedUrl,
      token: signedUrlData.token,
      path: filePath,
      publicUrl: publicUrl,
      filename: uniqueFilename
    });
  } catch (error) {
    console.error('Error generating image upload URL:', error);
    res.status(500).json({
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Generate signed upload URL for file
 * POST /api/upload/file/signed-url
 * Body: { filename: string, contentType: string }
 */
export const generateFileUploadUrl = async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({
        message: 'Filename and contentType are required'
      });
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(filename);
    const filePath = `files/${uniqueFilename}`;

    // Generate signed upload URL
    const signedUrlData = await generateSignedUploadUrl('royal-vault-files', filePath);

    // Get public URL for after upload
    const { data: { publicUrl } } = supabase.storage
      .from('royal-vault-files')
      .getPublicUrl(filePath);

    console.log({
      signedUrl: signedUrlData.signedUrl,
      token: signedUrlData.token,
      path: filePath,
      publicUrl: publicUrl,
      filename: uniqueFilename
    })

    res.status(200).json({
      signedUrl: signedUrlData.signedUrl,
      token: signedUrlData.token,
      path: filePath,
      publicUrl: publicUrl,
      filename: uniqueFilename
    });
  } catch (error) {
    console.error('Error generating file upload URL:', error);
    res.status(500).json({
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * Delete file from Supabase Storage
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path to the file in the bucket
 */
export const deleteFileFromSupabase = async (bucketName, filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file from Supabase:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in deleteFileFromSupabase:', error);
    throw error;
  }
};
