import React, { useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';

export default function TestUpload() {
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const toast = useRef<Toast>(null);

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            console.log('File selected:', file.name, file.size, file.type);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            showToast("error", "Error", "Please select a file first");
            return;
        }

        setUploading(true);
        try {
            console.log('Starting upload test...');
            console.log('Test file details:', {
                name: selectedFile.name,
                size: selectedFile.size,
                type: selectedFile.type
            });
            
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('title', 'Test Document');
            formData.append('description', 'Test upload');
            formData.append('category', 'GENERAL');
            formData.append('tags', 'test');
            formData.append('permissions', 'PUBLIC');

            console.log('FormData created, sending request...');
            console.log('FormData keys:', Array.from(formData.keys()));
            
            const response = await fetch('/api/admin/documents', {
                method: 'POST',
                body: formData,
            });

            console.log('Response received:', response.status, response.statusText);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }

            const result = await response.json();
            console.log('Upload successful:', result);
            showToast("success", "Success", "Test upload successful!");
            setSelectedFile(null);
        } catch (error) {
            console.error('Upload error:', error);
            showToast("error", "Error", error instanceof Error ? error.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4">
            <h3>Test Upload</h3>
            <div className="flex flex-column gap-3">
                <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    className="p-2 border-1 border-round"
                />
                
                {selectedFile && (
                    <div className="p-3 surface-100 border-round">
                        <p><strong>Selected File:</strong> {selectedFile.name}</p>
                        <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p><strong>Type:</strong> {selectedFile.type}</p>
                    </div>
                )}
                
                <Button
                    label={uploading ? "Uploading..." : "Test Upload"}
                    icon={uploading ? "pi pi-spin pi-spinner" : "pi pi-upload"}
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    severity="success"
                />
            </div>
            
            <Toast ref={toast} />
        </div>
    );
} 