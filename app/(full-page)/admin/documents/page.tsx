"use client";

import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { FileUpload } from "primereact/fileupload";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { useRouter } from "next/navigation";
import { Skeleton } from "primereact/skeleton";
import { SortOrderType } from "@/types";
import { apiClient } from "@/lib/apiClient";

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
    permissions: string;
    uploadedBy: string;
    createdAt: string;
    updatedAt: string;
    uploader?: {
        firstName: string;
        lastName: string;
    };
}

interface DocumentFormData {
    title: string;
    description: string;
    category: string;
    permissions: string;
    tags: string;
}

export default function DocumentsPage() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        title: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        category: { value: null, matchMode: FilterMatchMode.EQUALS },
        permissions: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showDocumentDialog, setShowDocumentDialog] = useState(false);
    const [editingDocument, setEditingDocument] = useState<Document | null>(null);
    const [documentForm, setDocumentForm] = useState<DocumentFormData>({
        title: "",
        description: "",
        category: "GENERAL",
        permissions: "MEMBER_ONLY",
        tags: "",
    });
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [sortField, setSortField] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<SortOrderType>(-1);
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const toast = useRef<Toast>(null);
    const fileUploadRef = useRef<FileUpload>(null);

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
        loadDocuments();
    }, [currentPage, rowsPerPage, globalFilterValue, sortField, sortOrder]);

    const loadDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getDocuments({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setDocuments(response.data?.documents || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            setError("Failed to load documents. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load documents");
        } finally {
            setLoading(false);
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        (_filters["global"] as any).value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
        setCurrentPage(1); // Reset to first page when searching
    };

    const onSort = (event: any) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder);
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNewDocumentDialog = () => {
        setEditingDocument(null);
        setDocumentForm({
            title: "",
            description: "",
            category: "GENERAL",
            permissions: "MEMBER_ONLY",
            tags: "",
        });
        setUploadedFile(null);
        setShowDocumentDialog(true);
    };

    const openEditDocumentDialog = (document: Document) => {
        setEditingDocument(document);
        setDocumentForm({
            title: document.title,
            description: document.description || "",
            category: document.category,
            permissions: document.permissions,
            tags: document.tags.join(", "),
        });
        setShowDocumentDialog(true);
    };

    const onFileSelect = (event: any) => {
        const file = event.files[0];
        setUploadedFile(file);
    };

    const saveDocument = async () => {
        if (!documentForm.title || (!editingDocument && !uploadedFile)) {
            showToast("error", "Validation Error", "Please fill in all required fields and select a file");
            return;
        }

        setSaveLoading(true);
        try {
            if (editingDocument) {
                // Update existing document
                const response = await apiClient.updateDocument(editingDocument.id, {
                    title: documentForm.title,
                    description: documentForm.description,
                    category: documentForm.category,
                    tags: documentForm.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
                    permissions: documentForm.permissions as 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY',
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                showToast("success", "Success", "Document updated successfully");
            } else {
                // Create new document
                const documentData = {
                    title: documentForm.title,
                    description: documentForm.description,
                    fileName: uploadedFile!.name,
                    fileUrl: `/uploads/${uploadedFile!.name}`,
                    fileType: uploadedFile!.type,
                    fileSize: uploadedFile!.size,
                    category: documentForm.category,
                    tags: documentForm.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
                    permissions: documentForm.permissions as 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY',
                    // uploadedBy will be set by the backend to the default admin user
                };

                const response = await apiClient.createDocument(documentData);

                if (response.error) {
                    throw new Error(response.error);
                }

                showToast("success", "Success", "Document uploaded successfully");
            }
            
            setShowDocumentDialog(false);
            setUploadedFile(null);
            if (fileUploadRef.current) {
                fileUploadRef.current.clear();
            }
            await loadDocuments(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to save document");
        } finally {
            setSaveLoading(false);
        }
    };

    const confirmDeleteDocument = (document: Document) => {
        confirmDialog({
            message: `Are you sure you want to delete "${document.title}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteDocument(document.id),
        });
    };

    const deleteDocument = async (documentId: string) => {
        try {
            const response = await apiClient.deleteDocument(documentId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", "Document deleted successfully");
            await loadDocuments(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to delete document");
        }
    };

    const downloadDocument = (document: Document) => {
        // Simulate download
        const link = window.document.createElement('a');
        link.href = document.fileUrl;
        link.download = document.fileName;
        link.click();
        showToast("success", "Success", "Download started");
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

    const actionBodyTemplate = (rowData: Document) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-download"
                    size="small"
                    text
                    severity="info"
                    tooltip="Download"
                    onClick={() => downloadDocument(rowData)}
                />
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => router.push(`/admin/documents/${rowData.id}`)}
                />
                <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Edit Document"
                    onClick={() => openEditDocumentDialog(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete Document"
                    onClick={() => confirmDeleteDocument(rowData)}
                />
            </div>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Document Management</h2>
                <span className="text-600">Upload, organize, and manage documents</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search documents..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Upload Document"
                    icon="pi pi-upload"
                    onClick={openNewDocumentDialog}
                    severity="success"
                />
            </div>
        </div>
    );

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    {error && (
                        <div className="p-error p-3 mb-3">{error}</div>
                    )}
                    {loading ? (
                        <div className="p-4">
                            <div className="grid">
                                {[...Array(5)].map((_, i) => (
                                    <div className="col-12" key={i}>
                                        <div className="flex align-items-center gap-3">
                                            <Skeleton width="20%" height="1.5rem" />
                                            <Skeleton width="15%" height="1.5rem" />
                                            <Skeleton width="8%" height="1.5rem" />
                                            <Skeleton width="10%" height="1.5rem" />
                                            <Skeleton width="10%" height="1.5rem" />
                                            <Skeleton width="15%" height="1.5rem" />
                                            <Skeleton width="10%" height="1.5rem" />
                                            <div className="flex gap-2">
                                                <Skeleton width="2rem" height="2rem" />
                                                <Skeleton width="2rem" height="2rem" />
                                                <Skeleton width="2rem" height="2rem" />
                                                <Skeleton width="2rem" height="2rem" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <DataTable
                            value={documents}
                            paginator
                            rows={rowsPerPage}
                            totalRecords={totalRecords}
                            lazy
                            first={(currentPage - 1) * rowsPerPage}
                            onPage={(e) => {
                                setCurrentPage((e.page || 0) + 1);
                                setRowsPerPage(e.rows || 10);
                            }}
                            loading={loading}
                            filters={filters}
                            filterDisplay="menu"
                            globalFilterFields={["title", "description", "fileName"]}
                            header={header}
                            emptyMessage={error ? "Unable to load documents. Please check your connection or try again later." : "No documents found."}
                            responsiveLayout="scroll"
                            onSort={onSort}
                            sortField={sortField}
                            sortOrder={sortOrder}
                            loadingIcon="pi pi-spinner"
                        >
                        <Column field="title" header="Title" sortable style={{ minWidth: "200px" }} />
                        <Column field="fileName" header="File Name" style={{ minWidth: "150px" }} />
                        <Column field="fileSize" header="Size" body={(rowData) => formatFileSize(rowData.fileSize)} style={{ minWidth: "100px" }} />
                        <Column field="category" header="Category" body={(rowData) => (
                            <Tag value={rowData.category.replace("_", " ")} severity={getCategorySeverity(rowData.category)} />
                        )} sortable style={{ minWidth: "120px" }} />
                        <Column field="permissions" header="Permissions" body={(rowData) => (
                            <Tag value={rowData.permissions.replace("_", " ")} severity={getPermissionSeverity(rowData.permissions)} />
                        )} sortable style={{ minWidth: "120px" }} />
                        <Column field="uploader" header="Uploaded By" body={(rowData) => (
                            rowData.uploader ? `${rowData.uploader.firstName} ${rowData.uploader.lastName}` : "Unknown"
                        )} style={{ minWidth: "150px" }} />
                            <Column field="createdAt" header="Upload Date" body={(rowData) => (
                                new Date(rowData.createdAt).toLocaleDateString()
                            )} sortable style={{ minWidth: "120px" }} />
                            <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                        </DataTable>
                    )}
                </Card>
            </div>

            {/* Document Dialog */}
            <Dialog
                visible={showDocumentDialog}
                style={{ width: "700px" }}
                header={editingDocument ? "Edit Document" : "Upload New Document"}
                modal
                className="p-fluid"
                onHide={() => setShowDocumentDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowDocumentDialog(false)}
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
                    {!editingDocument && (
                        <div className="col-12">
                            <label className="font-bold mb-2 block">Upload File *</label>
                            <FileUpload
                                ref={fileUploadRef}
                                name="document"
                                url="/api/upload"
                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                                maxFileSize={10000000}
                                onSelect={onFileSelect}
                                auto
                                chooseLabel="Choose File"
                                uploadLabel="Upload"
                                cancelLabel="Cancel"
                                emptyTemplate={<p className="m-0">Drag and drop files here to upload.</p>}
                                disabled={saveLoading}
                            />
                        </div>
                    )}
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
            <ConfirmDialog />
        </div>
    );
} 