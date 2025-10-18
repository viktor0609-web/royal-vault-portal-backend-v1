# Supabase Storage Setup Guide

This guide will help you set up Supabase Storage for file uploads in the Royal Vault Portal.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Supabase project

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click on "New Project"
3. Fill in the project details:
   - **Name**: Royal Vault Portal
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to your users
4. Click "Create new project" and wait for it to be set up

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (gear) in the sidebar
2. Go to **API** settings
3. Copy the following values:
   - **Project URL**: This is your `SUPABASE_URL`
   - **service_role key** (under "Project API keys"): This is your `SUPABASE_SERVICE_KEY`
   
   ⚠️ **IMPORTANT**: Never share or commit your `service_role` key. It bypasses Row Level Security (RLS).

## Step 3: Create Storage Buckets

1. In your Supabase project dashboard, click on **Storage** in the sidebar
2. Click **"Create a new bucket"**
3. Create the following buckets:

### Bucket 1: Images
- **Name**: `royal-vault-images`
- **Public bucket**: ✅ Check this box (to allow public access to images)
- Click **"Create bucket"**

### Bucket 2: Files
- **Name**: `royal-vault-files`
- **Public bucket**: ✅ Check this box (to allow public access to files)
- Click **"Create bucket"**

## Step 4: Configure Bucket Policies (Optional)

If you want more control over who can upload/delete files, you can set up Row Level Security policies:

1. Click on the bucket name (e.g., `royal-vault-images`)
2. Go to the **Policies** tab
3. Add policies as needed. Example policies:

### Allow Authenticated Users to Upload
```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'royal-vault-images');
```

### Allow Public Read Access
```sql
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'royal-vault-images');
```

### Allow Authenticated Users to Delete Their Own Files
```sql
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'royal-vault-images' AND auth.uid() = owner);
```

## Step 5: Update Your Environment Variables

1. In your backend project, copy the `.env.example` file to `.env`:
   ```bash
   cp env.example .env
   ```

2. Open the `.env` file and update the Supabase configuration:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your_actual_service_role_key_here
   ```

3. Replace the placeholder values with your actual credentials from Step 2

## Step 6: Test the Upload

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. Test image upload:
   ```bash
   curl -X POST http://localhost:5000/api/upload/image \
     -F "image=@path/to/your/image.jpg"
   ```

3. Test file upload:
   ```bash
   curl -X POST http://localhost:5000/api/upload/file \
     -F "file=@path/to/your/file.pdf"
   ```

4. You should receive a response with the public URL of the uploaded file

## Step 7: Verify in Supabase Dashboard

1. Go to **Storage** in your Supabase dashboard
2. Click on the bucket name (e.g., `royal-vault-images`)
3. You should see your uploaded files
4. Click on a file to view it or get its public URL

## File Upload Limits

The current configuration has the following limits:
- **Images**: 5MB maximum file size
- **Files**: 500MB maximum file size

You can modify these limits in `controllers/uploadController.js`.

## Bucket Structure

Uploaded files are organized as follows:
- Images: `royal-vault-images/images/filename-timestamp-random.ext`
- Files: `royal-vault-files/files/filename-timestamp-random.ext`

## Troubleshooting

### Issue: "Missing Supabase credentials" error
**Solution**: Make sure you have set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in your `.env` file.

### Issue: Upload fails with "Failed to upload file" error
**Solution**: 
- Verify that the storage buckets exist in your Supabase dashboard
- Check that the bucket names match exactly: `royal-vault-images` and `royal-vault-files`
- Make sure the buckets are set to public
- Verify your service role key is correct

### Issue: File uploads but cannot access the URL
**Solution**: 
- Make sure the bucket is set to **public**
- Check your bucket policies if you've set up RLS

### Issue: File size limit exceeded
**Solution**: 
- Check Supabase storage quotas for your plan
- Adjust the `limits.fileSize` in `uploadController.js` if needed

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage Upload Examples](https://supabase.com/docs/reference/javascript/storage-from-upload)

## Migration Notes

### What Changed?
- ✅ File uploads now go to Supabase Storage instead of local disk
- ✅ Files are stored in cloud storage, accessible from anywhere
- ✅ No need to manage local `uploads/` directory
- ✅ Files persist across deployments
- ✅ Better scalability and performance

### What to Do with Old Files?
If you have existing files in the `uploads/` directory:
1. You can manually upload them to Supabase Storage buckets
2. Or keep them temporarily and gradually migrate
3. Update any database references to point to the new Supabase URLs

### API Response Format
The API response now includes:
```json
{
  "message": "File uploaded successfully",
  "url": "https://your-project-id.supabase.co/storage/v1/object/public/bucket-name/path/to/file.ext",
  "filename": "filename-timestamp-random.ext",
  "path": "folder/filename-timestamp-random.ext"
}
```

## Security Best Practices

1. **Never commit** your `.env` file or service role key
2. Use **anon key** for client-side uploads (if implementing later)
3. Set up proper **RLS policies** for sensitive data
4. Regularly **rotate** your service role key
5. Monitor your **storage usage** in the Supabase dashboard
6. Set up **file size limits** to prevent abuse
7. Consider implementing **virus scanning** for uploaded files

## Support

For issues related to:
- **Supabase**: Contact Supabase support or check their documentation
- **Backend Integration**: Check the application logs and verify your configuration

---

✅ You're all set! Your Royal Vault Portal now uses Supabase Storage for file uploads.

