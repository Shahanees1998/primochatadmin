"use client";

import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { Skeleton } from "primereact/skeleton";
import { SortOrderType } from "@/types";
import { apiClient } from "@/lib/apiClient";

interface DocumentCategory {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    _count?: {
        documents: number;
    };
}

interface CategoryFormData {
    title: string;
    description: string;
}

export default function DocumentCategoriesPage() {
    const [categories, setCategories] = useState<DocumentCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        title: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    });
    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
    const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
        title: "",
        description: "",
    });
    const [sortField, setSortField] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<SortOrderType>(-1);
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const toast = useRef<Toast>(null);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const response = await apiClient.getDocumentCategories({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
            });

            if (response.data) {
                setCategories(response.data.categories);
                setTotalRecords(response.data.pagination.total);
            } else {
                setError(response.error || 'Failed to load categories');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            setError('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, [currentPage, rowsPerPage, globalFilterValue]);

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNewCategory = () => {
        setEditingCategory(null);
        setCategoryForm({
            title: "",
            description: "",
        });
        setShowCategoryDialog(true);
    };

    const openEditCategory = (category: DocumentCategory) => {
        setEditingCategory(category);
        setCategoryForm({
            title: category.title,
            description: category.description || "",
        });
        setShowCategoryDialog(true);
    };

    const saveCategory = async () => {
        if (!categoryForm.title.trim()) {
            showToast("error", "Error", "Title is required");
            return;
        }

        setSaveLoading(true);
        try {
            if (editingCategory) {
                const response = await apiClient.updateDocumentCategory(editingCategory.id, categoryForm);
                if (response.data) {
                    showToast("success", "Success", "Category updated successfully!");
                    setShowCategoryDialog(false);
                    loadCategories();
                } else {
                    showToast("error", "Error", response.error || "Failed to update category");
                }
            } else {
                const response = await apiClient.createDocumentCategory(categoryForm);
                if (response.data) {
                    showToast("success", "Success", "Category created successfully!");
                    setShowCategoryDialog(false);
                    loadCategories();
                } else {
                    showToast("error", "Error", response.error || "Failed to create category");
                }
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showToast("error", "Error", "Failed to save category");
        } finally {
            setSaveLoading(false);
        }
    };

    const deleteCategory = (category: DocumentCategory) => {
        confirmDialog({
            message: `Are you sure you want to delete the category "${category.title}"?`,
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    const response = await apiClient.deleteDocumentCategory(category.id);
                    if (response.data) {
                        showToast("success", "Success", "Category deleted successfully!");
                        loadCategories();
                    } else {
                        showToast("error", "Error", response.error || "Failed to delete category");
                    }
                } catch (error) {
                    console.error('Error deleting category:', error);
                    showToast("error", "Error", "Failed to delete category");
                }
            },
        });
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setGlobalFilterValue(value);
        setCurrentPage(1);
    };

    const onPageChange = (event: any) => {
        setCurrentPage(event.page + 1);
        setRowsPerPage(event.rows);
    };

    const actionBodyTemplate = (rowData: DocumentCategory) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-pencil"
                    rounded
                    outlined
                    className="p-button-sm"
                    onClick={() => openEditCategory(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    rounded
                    outlined
                    severity="danger"
                    className="p-button-sm"
                    onClick={() => deleteCategory(rowData)}
                />
            </div>
        );
    };

    const documentsCountBodyTemplate = (rowData: DocumentCategory) => {
        return (
            <span className="font-semibold">
                {rowData._count?.documents || 0}
            </span>
        );
    };

    const createdByBodyTemplate = (rowData: DocumentCategory) => {
        if (!rowData.user) return <span>-</span>;
        return (
            <span>
                {rowData.user.firstName} {rowData.user.lastName}
            </span>
        );
    };

    const dateBodyTemplate = (rowData: DocumentCategory) => {
        return new Date(rowData.createdAt).toLocaleDateString();
    };

    if (loading && categories.length === 0) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="flex justify-content-between align-items-center mb-4">
                            <Skeleton width="200px" height="2rem" />
                            <Skeleton width="150px" height="2.5rem" />
                        </div>
                        <Skeleton width="100%" height="400px" />
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex justify-content-between align-items-center mb-4">
                        <h1 className="text-2xl font-bold">Document Categories</h1>
                        <Button
                            label="New Category"
                            icon="pi pi-plus"
                            onClick={openNewCategory}
                            className="p-button-success"
                        />
                    </div>

                    <div className="flex justify-content-between align-items-center mb-4">
                        <span className="p-input-icon-left">
                            <i className="pi pi-search" />
                            <InputText
                                value={globalFilterValue}
                                onChange={onGlobalFilterChange}
                                placeholder="Search categories..."
                                className="w-20rem"
                            />
                        </span>
                    </div>

                    <DataTable
                        value={categories}
                        paginator
                        rows={rowsPerPage}
                        totalRecords={totalRecords}
                        lazy
                        onPage={onPageChange}
                        loading={loading}
                        filters={filters}
                        filterDisplay="menu"
                        globalFilterFields={['title', 'description']}
                        emptyMessage="No categories found."
                        className="p-datatable-sm"
                    >
                        <Column field="title" header="Title" sortable style={{ minWidth: '200px' }} />
                        <Column field="description" header="Description" style={{ minWidth: '300px' }} />
                        <Column 
                            field="_count.documents" 
                            header="Documents" 
                            body={documentsCountBodyTemplate}
                            style={{ minWidth: '100px' }}
                        />
                        <Column 
                            field="user.firstName" 
                            header="Created By" 
                            body={createdByBodyTemplate}
                            style={{ minWidth: '150px' }}
                        />
                        <Column 
                            field="createdAt" 
                            header="Created Date" 
                            body={dateBodyTemplate}
                            style={{ minWidth: '120px' }}
                        />
                        <Column 
                            body={actionBodyTemplate} 
                            exportable={false} 
                            style={{ minWidth: '100px' }}
                        />
                    </DataTable>
                </Card>
            </div>

            <Dialog
                visible={showCategoryDialog}
                style={{ width: '450px' }}
                header={editingCategory ? 'Edit Category' : 'New Category'}
                modal
                className="p-fluid"
                onHide={() => setShowCategoryDialog(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            icon="pi pi-times"
                            outlined
                            onClick={() => setShowCategoryDialog(false)}
                        />
                        <Button
                            label={editingCategory ? 'Update' : 'Save'}
                            icon="pi pi-check"
                            onClick={saveCategory}
                            loading={saveLoading}
                        />
                    </div>
                }
            >
                <div className="field">
                    <label htmlFor="title" className="font-bold">Title *</label>
                    <InputText
                        id="title"
                        value={categoryForm.title}
                        onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                        required
                        autoFocus
                    />
                </div>
                <div className="field">
                    <label htmlFor="description" className="font-bold">Description</label>
                    <InputTextarea
                        id="description"
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        rows={3}
                        autoResize
                    />
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
}
