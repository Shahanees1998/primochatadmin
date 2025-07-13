# Profile Image Upload Integration with Cloudinary

This document outlines the complete integration of profile image upload functionality using Cloudinary for the PrimoChat Admin application.

## Overview

The profile image upload system has been fully integrated with Cloudinary to provide:
- Optimized image uploads with automatic resizing and compression
- Face-detection cropping for profile images
- Secure URL generation with public_id storage
- Responsive image delivery with multiple size options
- Consistent user experience across the application

## Components

### 1. ProfileImageUpload Component
**Location:** `components/ProfileImageUpload.tsx`

A reusable component that provides:
- Drag-and-drop file upload interface
- Image preview before upload
- File type validation (images only)
- File size validation (max 5MB)
- Progress indication during upload
- Optimized image display using Cloudinary URLs

**Props:**
```typescript
interface ProfileImageUploadProps {
    currentImageUrl?: string;
    currentImagePublicId?: string;
    userId: string;
    onImageUploaded: (imageUrl: string, publicId?: string) => void;
    size?: 'small' | 'medium' | 'large';
}
```

**Usage:**
```tsx
<ProfileImageUpload
    currentImageUrl={user.profileImage}
    currentImagePublicId={user.profileImagePublicId}
    userId={user.id}
    onImageUploaded={(imageUrl, publicId) => {
        // Handle successful upload
        updateUserProfile(imageUrl, publicId);
    }}
    size="medium"
/>
```

### 2. Cloudinary Utility Functions

#### Server-Side Functions
**Location:** `lib/cloudinary.ts`

These functions are for server-side use only (API routes, server components):
- `uploadToCloudinary()` - Upload files to Cloudinary
- `deleteFromCloudinary()` - Delete files from Cloudinary
- `validateFile()` - Validate file types and sizes

#### Client-Safe Functions
**Location:** `lib/cloudinary-client.ts`

These functions can be used in client-side components:

```typescript
export function getProfileImageUrl(
    publicId: string, 
    size: 'small' | 'medium' | 'large' = 'medium'
): string
```

**Size Options:**
- `small`: 100x100px
- `medium`: 200x200px  
- `large`: 400x400px

**Features:**
- Automatic format optimization (WebP when supported)
- Quality optimization (85%)
- Face-detection cropping
- Responsive delivery
- Client-safe (no server-side dependencies)

## API Endpoints

### Profile Image Upload
**Endpoint:** `POST /api/users/profile-image`

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` and `userId`

**Response:**
```json
{
    "imageUrl": "https://res.cloudinary.com/...",
    "publicId": "primochat/profile-images/..."
}
```

**Features:**
- Image-only validation
- 5MB size limit
- Automatic face-detection cropping (400x400)
- Quality optimization
- Secure URL generation

## Database Schema

### User Model Updates
```prisma
model User {
    // ... existing fields
    profileImage      String?
    profileImagePublicId String? // Cloudinary public_id for profile image
    // ... other fields
}
```

**Migration Required:**
```bash
npx prisma db push
# or
npx prisma migrate dev --name add-profile-image-public-id
```

## Frontend Integration

### 0. Client-Safe Cloudinary Functions
**Location:** `lib/cloudinary-client.ts`

To avoid server-side module issues in client components, we use client-safe URL generation functions:

```typescript
// ✅ Client-safe (use in components)
import { getProfileImageUrl } from '@/lib/cloudinary-client';

// ❌ Server-only (use in API routes)
import { uploadToCloudinary } from '@/lib/cloudinary';
```

**Key Benefits:**
- No Node.js dependencies in client components
- Works with Next.js client-side rendering
- Generates optimized URLs without server calls
- Maintains all Cloudinary optimization features

### 1. Profile Page
**Location:** `app/(full-page)/admin/profile/page.tsx`

Updated to use the ProfileImageUpload component with:
- Optimized image display using Cloudinary URLs
- Public ID storage and retrieval
- Session updates after successful upload

### 2. Users List Page
**Location:** `app/(full-page)/admin/users/page.tsx`

Updated to display optimized profile images in the user list with:
- Small-sized optimized images for avatars
- Fallback to original URLs when public_id not available
- Consistent display across all user entries

### 3. API Client
**Location:** `lib/apiClient.ts`

Updated `uploadProfileImage` method to properly handle FormData:
```typescript
async uploadProfileImage(formData: FormData) {
    // Proper FormData handling without Content-Type header
    const url = `${this.baseURL}/users/profile-image`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - let browser set it for FormData
        });
        // ... error handling and response parsing
    } catch (error) {
        // ... error handling
    }
}
```

## Environment Variables

Required Cloudinary environment variables:
```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

## File Validation

### Allowed File Types
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`

### Size Limits
- Maximum file size: 5MB
- Automatic compression and optimization

## Error Handling

### Common Error Scenarios
1. **Invalid file type**: Only image files are accepted
2. **File too large**: Maximum 5MB limit
3. **Upload failure**: Network or Cloudinary service issues
4. **Missing user ID**: Required for database updates

### Error Messages
- User-friendly error messages displayed via toast notifications
- Console logging for debugging
- Graceful fallbacks for missing images

## Performance Optimizations

### Image Optimization
- Automatic format conversion (WebP when supported)
- Quality optimization (85% for profile images)
- Responsive sizing based on display context
- Lazy loading support

### Caching
- Cloudinary CDN caching for fast delivery
- Browser caching for frequently accessed images
- Optimized URLs for different display sizes

## Testing

### Test Component
**Location:** `components/TestProfileUpload.tsx`

A dedicated test component for verifying:
- Upload functionality
- URL generation
- Public ID storage
- Image display optimization

### Manual Testing Checklist
- [ ] Upload different image formats (JPEG, PNG, GIF, WebP)
- [ ] Test file size limits (under and over 5MB)
- [ ] Verify face-detection cropping
- [ ] Check optimized URL generation
- [ ] Test responsive image sizes
- [ ] Verify database storage of public_id
- [ ] Test error handling for invalid files

## Security Considerations

### File Validation
- Server-side file type validation
- File size limits enforced
- Malicious file detection

### Access Control
- User authentication required for uploads
- User can only upload to their own profile
- Secure URL generation with expiration

### Data Privacy
- Images stored in secure Cloudinary environment
- No sensitive data in image URLs
- Proper cleanup of old images

## Future Enhancements

### Planned Features
1. **Image editing**: Basic cropping and rotation
2. **Multiple sizes**: Automatic generation of different sizes
3. **Background removal**: AI-powered background removal
4. **Bulk operations**: Batch upload for admin users
5. **Image analytics**: Usage tracking and optimization

### Performance Improvements
1. **Progressive loading**: Low-quality placeholders
2. **WebP conversion**: Automatic format optimization
3. **CDN optimization**: Regional delivery optimization
4. **Caching strategies**: Advanced caching policies

## Troubleshooting

### Common Issues

1. **Upload fails with 400 error**
   - Check file type and size
   - Verify environment variables
   - Check network connectivity

2. **Images not displaying**
   - Verify public_id is stored correctly
   - Check Cloudinary URL generation
   - Verify image exists in Cloudinary

3. **Poor image quality**
   - Check quality settings in transformation
   - Verify original image quality
   - Consider adjusting optimization parameters

### Debug Information
- Console logging for upload process
- Network tab for API requests
- Cloudinary dashboard for file status
- Database queries for public_id verification

## Support

For issues related to:
- **Cloudinary integration**: Check Cloudinary documentation
- **Upload functionality**: Review API logs and error messages
- **Image display**: Verify URL generation and CDN status
- **Database issues**: Check Prisma schema and migrations 