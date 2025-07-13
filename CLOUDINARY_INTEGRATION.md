# Cloudinary Integration for PrimoChat Admin

This document outlines the complete Cloudinary integration for document uploads, profile images, and file management in the PrimoChat Admin application.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=denwqkach
NEXT_PUBLIC_CLOUDINARY_API_KEY=555776591533351
CLOUDINARY_API_SECRET=sRofrQD3SmHowqDI5Ghp7n1u0aM
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ml_default
```

## Features Implemented

### 1. Document Management
- **Upload**: Documents are uploaded to Cloudinary with automatic file validation
- **View**: Documents can be viewed with optimized URLs
- **Download**: Secure download URLs with attachment flags
- **Delete**: Automatic cleanup from Cloudinary when documents are deleted
- **Thumbnails**: Automatic thumbnail generation for images

### 2. Profile Image Management
- **Upload**: Profile images with automatic optimization and face detection
- **Preview**: Real-time image preview before upload
- **Optimization**: Automatic resizing and format optimization

### 3. File Validation
- **Type Validation**: Restricted file types for security
- **Size Validation**: Configurable file size limits
- **Format Support**: Multiple document and image formats

## API Endpoints

### Document Upload
```
POST /api/admin/documents
Content-Type: multipart/form-data

Form Data:
- file: File object
- title: string
- description: string (optional)
- category: string
- tags: string (comma-separated)
- permissions: 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY'
```

### Document Download
```
GET /api/documents/download/[id]
Response: { downloadUrl: string, document: DocumentInfo }
```

### Document Thumbnail
```
GET /api/documents/thumbnail/[id]
Response: { thumbnailUrl: string, fileType: string, fileName: string }
```

### Profile Image Upload
```
POST /api/users/profile-image
Content-Type: multipart/form-data

Form Data:
- file: Image file
- userId: string
```

## Components

### FilePreview Component
Located at `components/FilePreview.tsx`

Features:
- File type detection and appropriate icons
- File size formatting
- Download functionality
- Image preview for supported formats
- Preview button for PDFs and images

Usage:
```tsx
<FilePreview
    fileUrl={document.fileUrl}
    fileName={document.fileName}
    fileType={document.fileType}
    fileSize={document.fileSize}
    onDownload={downloadDocument}
    showPreview={true}
/>
```

### ProfileImageUpload Component
Located at `components/ProfileImageUpload.tsx`

Features:
- Drag and drop image upload
- Real-time preview
- File validation
- Progress indication
- Multiple size options

Usage:
```tsx
<ProfileImageUpload
    currentImageUrl={user.profileImage}
    userId={user.id}
    onImageUploaded={handleImageUploaded}
    size="medium"
/>
```

## Cloudinary Configuration

### Upload Settings
- **Documents**: Stored in `primochat/documents` folder
- **Profile Images**: Stored in `primochat/profile-images` folder
- **Max File Size**: 50MB for documents, 5MB for images
- **Optimization**: Automatic format conversion and compression

### Image Transformations
- **Profile Images**: 400x400px with face detection cropping
- **Thumbnails**: 150x150px for document previews
- **Quality**: Auto-optimized with WebP format when supported

### Security
- **Upload Preset**: Uses signed uploads for security
- **File Type Validation**: Server-side validation of allowed types
- **Size Limits**: Enforced both client and server-side

## File Types Supported

### Documents
- PDF (`application/pdf`)
- Word Documents (`application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- Excel Spreadsheets (`application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- PowerPoint Presentations (`application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`)
- Text Files (`text/plain`)
- Images (`image/jpeg`, `image/png`, `image/gif`, `image/webp`)

### Profile Images
- JPEG (`image/jpeg`)
- PNG (`image/png`)
- GIF (`image/gif`)
- WebP (`image/webp`)

## Error Handling

The integration includes comprehensive error handling:

1. **File Validation Errors**: Clear messages for invalid file types or sizes
2. **Upload Failures**: Graceful handling of network issues
3. **Cloudinary Errors**: Fallback behavior when Cloudinary is unavailable
4. **User Feedback**: Toast notifications for all operations

## Performance Optimizations

1. **Lazy Loading**: Images load only when needed
2. **Optimized URLs**: Cloudinary transformations for faster loading
3. **Caching**: Browser caching of optimized images
4. **Progressive Loading**: Thumbnails load before full images

## Security Considerations

1. **Upload Preset**: Uses signed uploads to prevent unauthorized uploads
2. **File Validation**: Server-side validation of all uploaded files
3. **Access Control**: Document permissions enforced at API level
4. **Secure URLs**: HTTPS URLs for all Cloudinary resources

## Usage Examples

### Uploading a Document
```tsx
const formData = new FormData();
formData.append('file', file);
formData.append('title', 'Meeting Minutes');
formData.append('category', 'MEETING_MINUTES');
formData.append('permissions', 'MEMBER_ONLY');

const response = await fetch('/api/admin/documents', {
    method: 'POST',
    body: formData
});
```

### Downloading a Document
```tsx
const response = await fetch(`/api/documents/download/${documentId}`);
const data = await response.json();
window.open(data.downloadUrl, '_blank');
```

### Uploading Profile Image
```tsx
const formData = new FormData();
formData.append('file', imageFile);
formData.append('userId', userId);

const response = await fetch('/api/users/profile-image', {
    method: 'POST',
    body: formData
});
```

## Troubleshooting

### Common Issues

1. **Upload Fails**: Check environment variables and upload preset configuration
2. **Images Not Loading**: Verify Cloudinary cloud name and API key
3. **File Size Errors**: Ensure file is within size limits
4. **Type Errors**: Check if file type is in allowed list

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed Cloudinary error messages.

## Future Enhancements

1. **Video Support**: Add video upload and preview capabilities
2. **Batch Upload**: Support for multiple file uploads
3. **Advanced Transformations**: More Cloudinary transformation options
4. **CDN Integration**: Direct CDN delivery for better performance
5. **Backup Strategy**: Local backup of critical documents 