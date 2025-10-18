# Migration to Supabase Storage - Summary

## ✅ Completed Changes

### 1. **Installed Dependencies**
- Added `@supabase/supabase-js` package

### 2. **New Files Created**
- `config/supabase.js` - Supabase client configuration
- `SUPABASE_SETUP_GUIDE.md` - Comprehensive setup instructions

### 3. **Modified Files**

#### `controllers/uploadController.js`
- **Before**: Used multer disk storage, saved files to local `uploads/` directory
- **After**: Uses multer memory storage, uploads files to Supabase Storage
- **New Features**:
  - `uploadToSupabase()` - Handles file upload to Supabase buckets
  - `deleteFileFromSupabase()` - Helper function to delete files from Supabase
  - Generates unique filenames with timestamp and random suffix
  - Returns public URLs from Supabase Storage

#### `index.js`
- **Removed**: Static file serving middleware (`app.use('/uploads', express.static('uploads'))`)
- **Reason**: Files are now served directly from Supabase Storage

#### `env.example`
- **Added**: Supabase configuration section
  - `SUPABASE_URL` - Your Supabase project URL
  - `SUPABASE_SERVICE_KEY` - Service role key for admin operations
  - Documentation about required storage buckets

## 📋 Required Actions

### 1. **Set Up Supabase** (Follow SUPABASE_SETUP_GUIDE.md)
   - [ ] Create a Supabase project
   - [ ] Get your project URL and service role key
   - [ ] Create storage buckets:
     - `royal-vault-images` (public)
     - `royal-vault-files` (public)

### 2. **Update Environment Variables**
   ```bash
   # Add to your .env file
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your_actual_service_role_key_here
   ```

### 3. **Install Dependencies**
   ```bash
   npm install
   ```

### 4. **Restart Your Server**
   ```bash
   npm run dev
   ```

## 🎯 Storage Buckets Required

| Bucket Name | Type | Used For | Public Access |
|------------|------|----------|---------------|
| `royal-vault-images` | Images | Image uploads (deals, courses, webinars, profiles) | ✅ Yes |
| `royal-vault-files` | Files | General file uploads (PDFs, videos, documents) | ✅ Yes |

## 📊 File Upload Flow

### Before (Local Storage)
```
Client → Backend → Multer (disk storage) → uploads/ directory → Static file serving
```

### After (Supabase Storage)
```
Client → Backend → Multer (memory) → Supabase Storage API → Public URL
```

## 🔄 API Response Changes

### Image Upload (`POST /api/upload/image`)
```json
{
  "message": "Image uploaded successfully",
  "url": "https://project-id.supabase.co/storage/v1/object/public/royal-vault-images/images/file-123456789-987654321.jpg",
  "filename": "file-123456789-987654321.jpg",
  "path": "images/file-123456789-987654321.jpg"
}
```

### File Upload (`POST /api/upload/file`)
```json
{
  "message": "File uploaded successfully",
  "url": "https://project-id.supabase.co/storage/v1/object/public/royal-vault-files/files/document-123456789-987654321.pdf",
  "filename": "document-123456789-987654321.pdf",
  "originalName": "document.pdf",
  "mimetype": "application/pdf",
  "size": 1024000,
  "path": "files/document-123456789-987654321.pdf"
}
```

## ✨ Benefits

1. **Cloud Storage**: Files stored in Supabase's reliable cloud infrastructure
2. **Scalability**: No local disk space limitations
3. **Persistence**: Files survive server restarts and redeployments
4. **CDN**: Fast file delivery through Supabase's CDN
5. **Management**: Easy file management through Supabase dashboard
6. **Security**: Built-in access control with Row Level Security (RLS)
7. **Backup**: Automatic backups included with Supabase

## 🗑️ What Happens to Old Files?

The local `uploads/` directory is no longer used. You have several options:

1. **Keep as backup**: Leave the directory in place temporarily
2. **Manual migration**: Upload existing files to Supabase Storage
3. **Gradual migration**: Migrate files as needed when users access them
4. **Delete**: Remove after ensuring all important files are backed up

## ⚠️ Important Notes

1. **Service Role Key**: Keep your `SUPABASE_SERVICE_KEY` secret! Never commit it to version control.
2. **Public Buckets**: The buckets are set to public by default. If you need private storage, set up RLS policies.
3. **File Limits**: 
   - Images: 5MB max
   - Files: 500MB max
   - Can be adjusted in `uploadController.js`
4. **Testing**: Test uploads thoroughly in development before deploying to production

## 🧪 Testing

### Test Image Upload
```bash
curl -X POST http://localhost:5000/api/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-image.jpg"
```

### Test File Upload
```bash
curl -X POST http://localhost:5000/api/upload/file \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test-document.pdf"
```

## 📚 Additional Documentation

- `SUPABASE_SETUP_GUIDE.md` - Detailed setup instructions
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)

## 🆘 Troubleshooting

**Problem**: "Missing Supabase credentials" error  
**Solution**: Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to your `.env` file

**Problem**: Upload fails  
**Solution**: Verify bucket names match exactly: `royal-vault-images` and `royal-vault-files`

**Problem**: Cannot access uploaded files  
**Solution**: Ensure buckets are set to public in Supabase dashboard

---

✅ **Migration Complete!** Follow the setup guide to configure your Supabase project.

