"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Skeleton } from "primereact/skeleton";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { apiClient } from "@/lib/apiClient";
import FilePreview from "@/components/FilePreview";

interface Document {
    id: string;
    title: string;
    description?: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    category: string;
    tags: string[];
    permissions: 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY';
    uploadedBy: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface DocumentFormData {
    title: string;
    description: string;
    category: string;
    permissions: 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY';
    tags: string;
}

export default function DocumentViewPage() {
    const params = useParams();
    const router = useRouter();
    const [document, setDocument] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [documentForm, setDocumentForm] = useState<DocumentFormData>({
        title: "",
        description: "",
        category: "GENERAL",
        permissions: "MEMBER_ONLY",
        tags: ""
    });
    const [saveLoading, setSaveLoading] = useState(false);
    const toast = useRef<Toast>(null);

    const documentId = params.id as string;

    const categoryOptions = [
        { label: "General", value: "GENERAL" },
        { label: "Meeting Minutes", value: "MEETING_MINUTES" },
        { label: "Policies", value: "POLICIES" },
        { label: "Forms", value: "FORMS" },
        { label: "Reports", value: "REPORTS" },
        { label: "Newsletters", value: "NEWSLETTERS" },
        { label: "Training", value: "TRAINING" },
        { label: "Other", value: "OTHER" },
    ];

    const permissionOptions = [
        { label: "Public", value: "PUBLIC" },
        { label: "Member Only", value: "MEMBER_ONLY" },
        { label: "Admin Only", value: "ADMIN_ONLY" },
    ];

    useEffect(() => {
        if (documentId) {
            loadDocument();
        }
    }, [documentId]);

    const loadDocument = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getDocument(documentId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            if (response.data) {
                const docData = {
                    ...response.data,
                    createdAt: response.data.createdAt instanceof Date ? response.data.createdAt.toISOString() : response.data.createdAt,
                    updatedAt: response.data.updatedAt instanceof Date ? response.data.updatedAt.toISOString() : response.data.updatedAt,
                } as Document;
                setDocument(docData);
            }
        } catch (error) {
            setError("Failed to load document. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load document");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const getCategorySeverity = (category: string) => {
        switch (category) {
            case "GENERAL": return "info";
            case "MEETING_MINUTES": return "success";
            case "POLICIES": return "warning";
            case "FORMS": return "secondary";
            case "REPORTS": return "danger";
            case "NEWSLETTERS": return "info";
            case "TRAINING": return "success";
            case "OTHER": return "secondary";
            default: return "info";
        }
    };

    const getPermissionSeverity = (permissions: string) => {
        switch (permissions) {
            case "PUBLIC": return "success";
            case "MEMBER_ONLY": return "warning";
            case "ADMIN_ONLY": return "danger";
            default: return "info";
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType: string) => {
        if (fileType.includes('pdf')) return 'pi pi-file-pdf';
        if (fileType.includes('doc')) return 'pi pi-file-word';
        if (fileType.includes('xls')) return 'pi pi-file-excel';
        if (fileType.includes('ppt')) return 'pi pi-file-powerpoint';
        if (fileType.includes('image')) return 'pi pi-image';
        if (fileType.includes('text')) return 'pi pi-file-text';
        return 'pi pi-file';
    };

    const openEditDialog = () => {
        if (!document) return;
        
        setDocumentForm({
            title: document.title,
            description: document.description || "",
            category: document.category,
            permissions: document.permissions,
            tags: document.tags.join(", ")
        });
        setShowEditDialog(true);
    };

    const saveDocument = async () => {
        if (!documentForm.title) {
            showToast("error", "Validation Error", "Please fill in all required fields");
            return;
        }

        setSaveLoading(true);
        try {
            const response = await apiClient.updateDocument(documentId, {
                title: documentForm.title,
                description: documentForm.description,
                tags: documentForm.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
                permissions: documentForm.permissions
            });

            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", "Document updated successfully");
            setShowEditDialog(false);
            await loadDocument(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to update document");
        } finally {
            setSaveLoading(false);
        }
    };

    const downloadDocument = async () => {
        if (!document) return;
        
        try {
            const link = window.document.createElement('a');
            link.href = document.fileUrl;
            link.download = document.fileName;
            link.target = '_blank';
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            showToast("success", "Success", "Download started");
        } catch (error) {
            showToast("error", "Error", "Failed to download document");
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="grid">
                            <div className="col-12">
                                <Skeleton height="3rem" className="mb-3" />
                                <Skeleton width="60%" height="1.5rem" className="mb-4" />
                            </div>
                            <div className="col-12 md:col-6">
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                            </div>
                            <div className="col-12 md:col-6">
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                            </div>
                            <div className="col-12">
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="8rem" className="mb-3" />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="text-center p-4">
                            <i className="pi pi-exclamation-triangle text-6xl text-orange-500 mb-3"></i>
                            <h2 className="text-2xl font-bold mb-2">Document Not Found</h2>
                            <p className="text-600 mb-4">
                                {error || "The document you're looking for doesn't exist or has been removed."}
                            </p>
                            <Button 
                                label="Back to Documents" 
                                icon="pi pi-arrow-left" 
                                onClick={() => router.push('/admin/documents')}
                                severity="secondary"
                            />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                {/* Header */}
                <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                    <div className="flex flex-column">
                        <h1 className="text-3xl font-bold m-0">{document.title}</h1>
                        <div className="flex align-items-center gap-2 mt-2">
                            <Tag value={document.category.replace('_', ' ')} severity={getCategorySeverity(document.category)} />
                            <Tag value={document.permissions.replace('_', ' ')} severity={getPermissionSeverity(document.permissions)} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label="Back to Documents"
                            icon="pi pi-arrow-left"
                            onClick={() => router.push('/admin/documents')}
                            severity="secondary"
                        />
                        <Button
                            label="Download"
                            icon="pi pi-download"
                            onClick={downloadDocument}
                            severity="info"
                        />
                        <Button
                            label="Edit Document"
                            icon="pi pi-pencil"
                            onClick={openEditDialog}
                            severity="success"
                        />
                    </div>
                </div>

                <div className="grid">
                    {/* Document Details Card */}
                    <div className="col-12 lg:col-8">
                        <Card>
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-2">File Information</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-bold text-600">File Name</label>
                                                <p className="text-lg">{document.fileName}</p>
                                            </div>
                                            <div>
                                                <label className="font-bold text-600">File Type</label>
                                                <p className="text-lg">{document.fileType}</p>
                                            </div>
                                            <div>
                                                <label className="font-bold text-600">File Size</label>
                                                <p className="text-lg">{formatFileSize(document.fileSize)}</p>
                                            </div>
                                            <div>
                                                <label className="font-bold text-600">Upload Date</label>
                                                <p className="text-lg">{formatDate(document.createdAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-2">Document Details</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-bold text-600">Category</label>
                                                <p className="text-lg">{document.category.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <label className="font-bold text-600">Permissions</label>
                                                <p className="text-lg">{document.permissions.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <label className="font-bold text-600">Uploaded By</label>
                                                <p className="text-lg">
                                                    {document.user ? `${document.user.firstName} ${document.user.lastName}` : 'Unknown User'}
                                                </p>
                                            </div>
                                            {document.tags && document.tags.length > 0 && (
                                                <div>
                                                    <label className="font-bold text-600">Tags</label>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {document.tags.map((tag, index) => (
                                                            <Tag key={index} value={tag} severity="info" />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {document.description && (
                                    <div className="col-12">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                                            <p className="text-lg line-height-3">{document.description}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* File Preview Card */}
                    <div className="col-12 lg:col-4">
                        <Card>
                            <h3 className="text-lg font-semibold mb-3">File Preview</h3>
                                                        <FilePreview
                                fileUrl={document.fileUrl}
                                fileName={document.fileName}
                                fileType={document.fileType}
                                fileSize={document.fileSize}
                                onDownload={downloadDocument}
                                showPreview={true}
                            />
                        </Card>
                    </div>
                </div>
            </div>

            {/* Edit Document Dialog */}
            <Dialog
                visible={showEditDialog}
                style={{ width: "600px" }}
                header="Edit Document"
                modal
                className="p-fluid"
                onHide={() => setShowEditDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowEditDialog(false)}
                            disabled={saveLoading}
                        />
                        <Button 
                            label={saveLoading ? "Saving..." : "Save"} 
                            icon={saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"} 
                            onClick={saveDocument}
                            disabled={saveLoading}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="title" className="font-bold">Title *</label>
                        <InputText
                            id="title"
                            value={documentForm.title}
                            onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                            required
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="description" className="font-bold">Description</label>
                        <InputTextarea
                            id="description"
                            value={documentForm.description}
                            onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                            rows={3}
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="category" className="font-bold">Category *</label>
                        <Dropdown
                            id="category"
                            value={documentForm.category}
                            options={categoryOptions}
                            onChange={(e) => setDocumentForm({ ...documentForm, category: e.value })}
                            placeholder="Select Category"
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="permissions" className="font-bold">Permissions *</label>
                        <Dropdown
                            id="permissions"
                            value={documentForm.permissions}
                            options={permissionOptions}
                            onChange={(e) => setDocumentForm({ ...documentForm, permissions: e.value })}
                            placeholder="Select Permissions"
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="tags" className="font-bold">Tags</label>
                        <InputText
                            id="tags"
                            value={documentForm.tags}
                            onChange={(e) => setDocumentForm({ ...documentForm, tags: e.target.value })}
                            placeholder="Enter tags separated by commas"
                            disabled={saveLoading}
                        />
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
        </div>
    );
} 