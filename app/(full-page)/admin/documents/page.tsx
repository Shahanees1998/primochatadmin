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
    documentType?: string;
    categoryId?: string;
    category?: {
        id: string;
        title: string;
        description?: string;
    };
    tags: string[];
    permissions: string;
    uploadedBy: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface DocumentFormData {
    title: string;
    description: string;
    categoryId: string;
    permissions: string;
    tags: string;
    url: string;
}

export default function DocumentsPage() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        title: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        category: { value: null, matchMode: FilterMatchMode.EQUALS },
        documentType: { value: null, matchMode: FilterMatchMode.EQUALS },
        permissions: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showDocumentDialog, setShowDocumentDialog] = useState(false);
    const [editingDocument, setEditingDocument] = useState<Document | null>(null);
    const [documentForm, setDocumentForm] = useState<DocumentFormData>({
        title: "",
        description: "",
        categoryId: "",
        permissions: "MEMBER_ONLY",
        tags: "",
        url: "",
    });
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [inputType, setInputType] = useState<'file' | 'url'>('file');
    const [sortField, setSortField] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<SortOrderType>(-1);
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const toast = useRef<Toast>(null);
    const fileUploadRef = useRef<FileUpload>(null);

    const categoryOptions = [
        { label: "All", value: "" },
        ...categories.map(cat => ({ label: cat.title, value: cat.id }))
    ];

    const permissionOptions = [
        { label: "Public", value: "PUBLIC" },
        { label: "Member Only", value: "MEMBER_ONLY" },
        { label: "Admin Only", value: "ADMIN_ONLY" },
    ];

    const documentTypeOptions = [
        { label: "PDF", value: "PDF" },
        { label: "Image", value: "IMAGE" },
        { label: "Document", value: "DOCUMENT" },
        { label: "Spreadsheet", value: "SPREADSHEET" },
        { label: "Presentation", value: "PRESENTATION" },
        { label: "Text", value: "TEXT" },
        { label: "Link", value: "LINK" },
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

    useEffect(() => {
        loadDocuments();
    }, [currentPage, rowsPerPage, globalFilterValue, sortField, sortOrder, filters.category.value, filters.documentType.value]);

    const loadDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getDocuments({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                category: filters.category.value || '',
                documentType: filters.documentType.value || '',
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
            categoryId: "",
            permissions: "MEMBER_ONLY",
            tags: "",
            url: "",
        });
        setUploadedFile(null);
        setInputType('file');
        setShowDocumentDialog(true);
    };

    const openEditDocumentDialog = (document: Document) => {
        setEditingDocument(document);
        setDocumentForm({
            title: document.title,
            description: document.description || "",
            categoryId: document.categoryId || "",
            permissions: document.permissions,
            tags: document.tags.join(", "),
            url: document.fileUrl, // Assuming fileUrl is the URL for editing
        });
        setInputType('url');
        setShowDocumentDialog(true);
    };

    const onFileSelect = (event: any) => {
        const file = event.files[0];
        setUploadedFile(file);
    };



    const saveDocument = async () => {
        if (!documentForm.title) {
            showToast("error", "Validation Error", "Please provide a title for the document");
            return;
        }

        if (!documentForm.categoryId) {
            showToast("error", "Validation Error", "Please select a category for the document");
            return;
        }

        if (!editingDocument) {
            if (inputType === 'file' && !uploadedFile) {
                showToast("error", "Validation Error", "Please select a file to upload");
                return;
            }
            if (inputType === 'url' && !documentForm.url) {
                showToast("error", "Validation Error", "Please provide a URL");
                return;
            }
        }

        setSaveLoading(true);
        try {
            if (editingDocument) {
                // Update existing document
                const response = await apiClient.updateDocument(editingDocument.id, {
                    title: documentForm.title,
                    description: documentForm.description,
                    categoryId: documentForm.categoryId,
                    tags: documentForm.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
                    permissions: documentForm.permissions as 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY',
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                showToast("success", "Success", "Document updated successfully");
            } else {
                // Create new document with file upload or URL
                const formData = new FormData();
                if (inputType === 'file' && uploadedFile) {
                    formData.append('file', uploadedFile);
                }
                if (inputType === 'url' && documentForm.url) {
                    formData.append('url', documentForm.url);
                }
                formData.append('title', documentForm.title);
                formData.append('description', documentForm.description);
                formData.append('categoryId', documentForm.categoryId);
                formData.append('tags', documentForm.tags);
                formData.append('permissions', documentForm.permissions);

                const response = await apiClient.uploadDocument(formData);

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

    const confirmBulkDeleteDocuments = () => {
        if (selectedDocuments.length === 0) return;
        
        confirmDialog({
            message: `Are you sure you want to delete ${selectedDocuments.length} selected document(s)?`,
            header: 'Bulk Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => bulkDeleteDocuments(),
        });
    };

    const bulkDeleteDocuments = async () => {
        if (selectedDocuments.length === 0) return;
        
        try {
            const deletePromises = selectedDocuments.map(document => apiClient.deleteDocument(document.id));
            await Promise.all(deletePromises);
            
            setSelectedDocuments([]);
            showToast("success", "Success", `${selectedDocuments.length} document(s) deleted successfully`);
            await loadDocuments(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to delete some documents");
        }
    };

    const downloadDocument = async (document: Document) => {
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

    const getCategorySeverity = (category: string) => {
        switch (category) {
            case "PDF": return "danger";
            case "IMAGE": return "success";
            case "LINK": return "info";
            case "DOCUMENT": return "warning";
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
        <div>
            <div className="w-full flex justify-content-end">
                {selectedDocuments.length > 0 && (
                    <Button
                        label={`Delete Selected (${selectedDocuments.length})`}
                        icon="pi pi-trash"
                        onClick={confirmBulkDeleteDocuments}
                        severity="danger"
                        className="p-button-raised mb-4"
                    />
                )}
            </div>
            <div className="flex flex-column mb-4">
                <h2 className="text-2xl font-bold m-0">Document Management</h2>
                <span className="text-600">Upload, organize, and manage documents</span>
            </div>
            <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">

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
                    <Dropdown
                        value={filters.category.value}
                        options={categoryOptions}
                        onChange={(e) => {
                            let _filters = { ...filters };
                            (_filters["category"] as any).value = e.value;
                            setFilters(_filters);
                            setCurrentPage(1);
                        }}
                        placeholder="Filter by Category"
                        className="w-full md:w-10rem"
                        showClear
                    />
                    <Dropdown
                        value={filters.documentType?.value || ''}
                        options={[
                            { label: "All Types", value: "" },
                            ...documentTypeOptions
                        ]}
                        onChange={(e) => {
                            let _filters = { ...filters };
                            (_filters["documentType"] as any).value = e.value;
                            setFilters(_filters);
                            setCurrentPage(1);
                        }}
                        placeholder="Filter by Type"
                        className="w-full md:w-10rem"
                        showClear
                    />
                    <Button
                        label="Manage Categories"
                        icon="pi pi-tags"
                        onClick={() => router.push('/admin/documents/categories')}
                        outlined
                    />
                    <Button
                        label="Upload Document"
                        icon="pi pi-upload"
                        onClick={openNewDocumentDialog}
                        severity="success"
                    />
                </div>
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
                        <DataTable
                            value={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
                            className="p-datatable-sm"
                            header={header}
                        >
                            <Column 
                                selectionMode="multiple" 
                                headerStyle={{ width: '3rem' }}
                                style={{ width: '3rem' }}
                            />
                            <Column
                                field="title"
                                header="Title"
                                body={() => <Skeleton width="200px" height="16px" />}
                                style={{ minWidth: "200px" }}
                            />
                            <Column
                                field="fileName"
                                header="File Name"
                                body={() => <Skeleton width="150px" height="16px" />}
                                style={{ minWidth: "150px" }}
                            />
                            <Column
                                field="fileSize"
                                header="Size"
                                body={() => <Skeleton width="80px" height="16px" />}
                                style={{ minWidth: "100px" }}
                            />
                            <Column
                                field="category"
                                header="Category"
                                body={() => <Skeleton width="80px" height="24px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column
                                field="uploadedBy"
                                header="Uploaded By"
                                body={() => (
                                    <div className="flex align-items-center gap-2">
                                        <Skeleton shape="circle" size="2rem" />
                                        <div className="flex flex-column gap-1">
                                            <Skeleton width="120px" height="16px" />
                                            <Skeleton width="100px" height="14px" />
                                        </div>
                                    </div>
                                )}
                                style={{ minWidth: "200px" }}
                            />
                            <Column
                                field="createdAt"
                                header="Created At"
                                body={() => <Skeleton width="100px" height="16px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column
                                header="Actions"
                                body={() => (
                                    <div className="flex gap-2">
                                        <Skeleton width="32px" height="32px" />
                                        <Skeleton width="32px" height="32px" />
                                        <Skeleton width="32px" height="32px" />
                                        <Skeleton width="32px" height="32px" />
                                    </div>
                                )}
                                style={{ width: "150px" }}
                            />
                        </DataTable>
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
                            selectionMode="multiple"
                            selection={selectedDocuments}
                            onSelectionChange={(e) => setSelectedDocuments(e.value as Document[])}
                        >
                            <Column 
                                selectionMode="multiple" 
                                headerStyle={{ width: '3rem' }}
                                style={{ width: '3rem' }}
                            />
                            <Column field="title" header="Title" style={{ minWidth: "200px" }} />
                            <Column field="fileName" header="File Name" style={{ minWidth: "150px" }} />
                            <Column field="fileSize" header="Size" body={(rowData) => formatFileSize(rowData.fileSize)} style={{ minWidth: "100px" }} />
                            <Column field="documentType" header="Type" body={(rowData) => (
                                <Tag value={rowData.documentType || 'Unknown'} severity="warning" />
                            )} style={{ minWidth: "100px" }} />
                            <Column field="category" header="Category" body={(rowData) => (
                                rowData.category ? (
                                    <Tag value={rowData.category.title} severity="info" />
                                ) : (
                                    <span className="text-500">No Category</span>
                                )
                            )} style={{ minWidth: "120px" }} />
                            <Column field="user" header="Uploaded By" body={(rowData) => (
                                rowData.user ? `${rowData.user.firstName} ${rowData.user.lastName}` : "Unknown"
                            )} style={{ minWidth: "150px" }} />
                            <Column field="createdAt" header="Upload Date" body={(rowData) => (
                                new Date(rowData.createdAt).toLocaleDateString()
                            )} style={{ minWidth: "120px" }} />
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
                        <>
                            <div className="col-12">
                                <div className="flex align-items-center gap-3 mb-3">
                                    <div className="flex align-items-center">
                                        <input
                                            type="radio"
                                            id="file-upload"
                                            name="input-type"
                                            value="file"
                                            checked={inputType === 'file'}
                                            onChange={(e) => {
                                                setInputType('file');
                                                setUploadedFile(null);
                                                setDocumentForm(prev => ({ ...prev, url: '' }));
                                                if (fileUploadRef.current) {
                                                    fileUploadRef.current.clear();
                                                }
                                            }}
                                            className="mr-2"
                                        />
                                        <label htmlFor="file-upload" className="font-medium">Upload Document</label>
                                    </div>
                                    <div className="flex align-items-center">
                                        <input
                                            type="radio"
                                            id="url-input"
                                            name="input-type"
                                            value="url"
                                            checked={inputType === 'url'}
                                            onChange={(e) => {
                                                setInputType('url');
                                                setUploadedFile(null);
                                                setDocumentForm(prev => ({ ...prev, url: '' }));
                                                if (fileUploadRef.current) {
                                                    fileUploadRef.current.clear();
                                                }
                                            }}
                                            className="mr-2"
                                        />
                                        <label htmlFor="url-input" className="font-medium">Paste Link</label>
                                    </div>
                                </div>

                                {inputType === 'file' && (
                                    <div>
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

                                {inputType === 'url' && (
                                    <div>
                                        <label className="font-bold mb-2 block">Provide URL *</label>
                                        <InputText
                                            value={documentForm.url}
                                            onChange={(e) => {
                                                const url = e.target.value;
                                                setDocumentForm({
                                                    ...documentForm,
                                                    url
                                                });
                                            }}
                                            placeholder="https://example.com/document.pdf"
                                            disabled={saveLoading}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
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
                    <div className="col-12">
                        <label htmlFor="category" className="font-bold">Category *</label>
                        <Dropdown
                            id="category"
                            value={documentForm.categoryId}
                            options={categoryOptions.filter(option => option.value !== "")} // Remove "All" option
                            onChange={(e) => setDocumentForm({ ...documentForm, categoryId: e.value })}
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