"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { FileUpload } from "primereact/fileupload";
import { Toast } from "primereact/toast";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import TestUpload from "@/components/TestUpload";

interface DocumentFormData {
    title: string;
    description: string;
    categoryId: string;
    permissions: string;
    tags: string;
}

export default function UploadDocumentPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<DocumentFormData>({
        title: "",
        description: "",
        categoryId: "",
        permissions: "MEMBER_ONLY",
        tags: "",
    });
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const toast = useRef<Toast>(null);
    const fileUploadRef = useRef<FileUpload>(null);

    const categoryOptions = categories.map(cat => ({ label: cat.title, value: cat.id }));

    const permissionOptions = [
        { label: "Public", value: "PUBLIC" },
        { label: "Member Only", value: "MEMBER_ONLY" },
        { label: "Admin Only", value: "ADMIN_ONLY" },
    ];

    const loadCategories = async () => {
        setCategoriesLoading(true);
        try {
            const response = await apiClient.getDocumentCategories({ limit: 100 });
            if (response.data) {
                setCategories(response.data.categories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setCategoriesLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const onFileSelect = (event: any) => {
        const file = event.files[0];
        setUploadedFile(file);

        // Auto-fill title if not already set
        if (!formData.title && file) {
            const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            setFormData({ ...formData, title: fileName });
        }
    };

    const uploadDocument = async () => {
        if (!uploadedFile) {
            showToast("error", "Error", "Please select a file to upload");
            return;
        }

        if (!formData.title.trim()) {
            showToast("error", "Error", "Please enter a document title");
            return;
        }

        if (!formData.categoryId) {
            showToast("error", "Error", "Please select a category");
            return;
        }

        setLoading(true);
        try {
            // Create FormData for file upload
            const formDataToSend = new FormData();
            formDataToSend.append('file', uploadedFile);
            formDataToSend.append('title', formData.title);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('categoryId', formData.categoryId);
            formDataToSend.append('tags', formData.tags);
            formDataToSend.append('permissions', formData.permissions);
            const response = await fetch('/api/admin/documents', {
                method: 'POST',
                body: formDataToSend,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload document');
            }

            showToast("success", "Success", "Document uploaded successfully!");

            // Reset form
            setFormData({
                title: "",
                description: "",
                categoryId: "",
                permissions: "MEMBER_ONLY",
                tags: "",
            });
            setUploadedFile(null);
            if (fileUploadRef.current) {
                fileUploadRef.current.clear();
            }

            // Redirect to documents list after a short delay
            setTimeout(() => {
                router.push('/admin/documents');
            }, 1500);
        } catch (error) {
            showToast("error", "Error", error instanceof Error ? error.message : "Failed to upload document");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                        <div className="flex flex-column">
                            <h2 className="text-2xl font-bold m-0">Upload Document</h2>
                            <span className="text-600">Upload and organize documents for your organization</span>
                        </div>
                        <Button
                            label="Back to Documents"
                            icon="pi pi-arrow-left"
                            onClick={() => router.push('/admin/documents')}
                            severity="secondary"
                        />
                    </div>

                    <div className="grid">
                        <div className="col-12">
                            <label className="font-bold mb-2 block">Upload File *</label>
                            <FileUpload
                                ref={fileUploadRef}
                                name="file"
                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls,.ppt,.pptx"
                                maxFileSize={10000000}
                                onSelect={onFileSelect}
                                chooseLabel="Choose File"
                                uploadLabel="Upload"
                                cancelLabel="Cancel"
                                emptyTemplate={<p className="m-0">Drag and drop files here to upload.</p>}
                                customUpload={true}
                                uploadHandler={() => { }}
                            />
                            <small className="text-600">Maximum file size: 10MB. Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, XLSX, PPT</small>
                        </div>

                        <div className="col-12">
                            <label htmlFor="title" className="font-bold">Document Title *</label>
                            <InputText
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter document title"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12">
                            <label htmlFor="description" className="font-bold">Description</label>
                            <InputTextarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                placeholder="Enter document description..."
                                className="w-full"
                            />
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="category" className="font-bold">Category *</label>
                            <Dropdown
                                id="category"
                                value={formData.categoryId}
                                options={categoryOptions}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.value })}
                                placeholder="Select Category"
                                className="w-full"
                                loading={categoriesLoading}
                            />
                            {categories.length === 0 && !categoriesLoading && (
                                <small className="text-orange-600">
                                    No categories available. Please create categories first.
                                </small>
                            )}
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="permissions" className="font-bold">Access Permissions</label>
                            <Dropdown
                                id="permissions"
                                value={formData.permissions}
                                options={permissionOptions}
                                onChange={(e) => setFormData({ ...formData, permissions: e.value })}
                                placeholder="Select Permissions"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12">
                            <label htmlFor="tags" className="font-bold">Tags</label>
                            <InputText
                                id="tags"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                placeholder="Enter tags separated by commas (e.g., meeting, minutes, 2024)"
                                className="w-full"
                            />
                            <small className="text-600">Tags help organize and search documents</small>
                        </div>

                        {uploadedFile && (
                            <div className="col-12">
                                <div className="p-3 surface-100 border-round">
                                    <h4>File Preview</h4>
                                    <div className="flex align-items-center gap-3">
                                        <i className="pi pi-file text-2xl text-blue-500"></i>
                                        <div>
                                            <div className="font-semibold">{uploadedFile.name}</div>
                                            <div className="text-sm text-600">
                                                Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB |
                                                Type: {uploadedFile.type || 'Unknown'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="col-12">
                            <div className="flex gap-2 justify-content-end">
                                <Button
                                    label="Cancel"
                                    icon="pi pi-times"
                                    severity="secondary"
                                    onClick={() => router.push('/admin/documents')}
                                />
                                <Button
                                    label="Upload Document"
                                    icon="pi pi-upload"
                                    onClick={uploadDocument}
                                    loading={loading}
                                    severity="success"
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <Toast ref={toast} />
        </div>
    );
} 