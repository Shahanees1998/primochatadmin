import React, { useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { FileUpload } from 'primereact/fileupload';
import { getProfileImageUrl } from '@/lib/cloudinary-client';

interface ProfileImageUploadProps {
    currentImageUrl?: string;
    currentImagePublicId?: string;
    userId: string;
    onImageUploaded: (imageUrl: string, publicId?: string) => void;
    size?: 'small' | 'medium' | 'large';
}

export default function ProfileImageUpload({ 
    currentImageUrl, 
    currentImagePublicId,
    userId, 
    onImageUploaded,
    size = 'medium' 
}: ProfileImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileUploadRef = useRef<FileUpload>(null);
    const toast = useRef<Toast>(null);

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const onFileSelect = (event: any) => {
        const file = event.files[0];
        if (file) {
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async () => {
        if (!fileUploadRef.current?.getFiles()?.length) {
            showToast("error", "Error", "Please select an image to upload");
            return;
        }

        const file = fileUploadRef.current.getFiles()[0];
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);

            const response = await fetch('/api/users/profile-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload image');
            }

            const data = await response.json();
            onImageUploaded(data.imageUrl, data.publicId);
            setPreviewUrl(null);
            fileUploadRef.current.clear();
            showToast("success", "Success", "Profile image uploaded successfully!");
        } catch (error) {
            showToast("error", "Error", error instanceof Error ? error.message : "Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'w-8rem h-8rem';
            case 'large':
                return 'w-12rem h-12rem';
            default:
                return 'w-10rem h-10rem';
        }
    };

    // Use optimized URL if public_id is available, otherwise fall back to original URL
    const getDisplayImage = () => {
        if (previewUrl) return previewUrl;
        if (currentImagePublicId) {
            return getProfileImageUrl(currentImagePublicId, size);
        }
        return currentImageUrl;
    };

    const displayImage = getDisplayImage();

    return (
        <div className="profile-image-upload">
            <div className="flex flex-column align-items-center gap-3">
                {/* Current/Preview Image */}
                <div className={`${getSizeClasses()} border-round overflow-hidden border-2 border-gray-200`}>
                    {displayImage ? (
                        <img 
                            src={displayImage} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex align-items-center justify-content-center bg-gray-100">
                            <i className="pi pi-user text-4xl text-gray-400"></i>
                        </div>
                    )}
                </div>

                {/* Upload Controls */}
                <div className="flex flex-column gap-2 w-full">
                    <FileUpload
                        ref={fileUploadRef}
                        name="profile-image"
                        accept="image/*"
                        maxFileSize={5242880} // 5MB
                        onSelect={onFileSelect}
                        chooseLabel="Choose Image"
                        uploadLabel="Upload"
                        cancelLabel="Cancel"
                        emptyTemplate={
                            <p className="m-0 text-sm text-600">
                                Drag and drop an image here or click to browse.
                            </p>
                        }
                        className="w-full"
                    />
                    
                    {fileUploadRef.current?.getFiles() && fileUploadRef.current.getFiles().length > 0 && (
                        <Button
                            label={uploading ? "Uploading..." : "Upload Image"}
                            icon={uploading ? "pi pi-spin pi-spinner" : "pi pi-upload"}
                            onClick={uploadImage}
                            disabled={uploading}
                            severity="success"
                            className="w-full"
                        />
                    )}
                </div>

                <small className="text-600 text-center">
                    Supported formats: JPG, PNG, GIF, WebP. Max size: 5MB.
                </small>
            </div>

            <Toast ref={toast} />
        </div>
    );
} 