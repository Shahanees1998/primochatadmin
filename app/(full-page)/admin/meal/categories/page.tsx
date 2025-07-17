'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';
import { ProgressSpinner } from 'primereact/progressspinner';
import { apiClient } from '@/lib/apiClient';

interface MealCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormData {
  name: string;
  description: string;
}

export default function MealCategoriesPage() {
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MealCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const toast = React.useRef<Toast>(null);
  console.log(totalRecords)
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    loadCategories();
  }, [debouncedSearchTerm, currentPage, rowsPerPage]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: rowsPerPage
      };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;

      const response = await apiClient.getMealCategories(params);
      if (response.data) {
        setCategories(response.data.categories || []);
        setTotalRecords(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load meal categories'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: ''
    });
    setDialogVisible(true);
  };

  const handleEdit = (category: MealCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setDialogVisible(true);
  };

  const handleDelete = (category: MealCategory) => {
    confirmDialog({
      message: `Are you sure you want to delete "${category.name}"? This will also delete all meals in this category.`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteCategory(category.id)
    });
  };

  const deleteCategory = async (id: string) => {
    try {
      await apiClient.deleteMealCategory(id);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Category deleted successfully'
      });
      // Reset to first page if we're on a page that might be empty after deletion
      if (categories.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        loadCategories();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete category'
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Category name is required'
      });
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingCategory) {
        await apiClient.updateMealCategory(editingCategory.id, formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Category updated successfully'
        });
      } else {
        await apiClient.createMealCategory(formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Category created successfully'
        });
      }

      setDialogVisible(false);
      loadCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to save category'
      });
    } finally {
      setSubmitting(false);
    }
  };



  const actionsBodyTemplate = (rowData: MealCategory) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-pencil"
          className="p-button-sm p-button-outlined"
          onClick={() => handleEdit(rowData)}
          tooltip="Edit Category"
        />
        <Button
          icon="pi pi-trash"
          className="p-button-sm p-button-outlined p-button-danger"
          onClick={() => handleDelete(rowData)}
          tooltip="Delete Category"
        />
      </div>
    );
  };

  const header = useMemo(() => (
    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
      <div className="flex flex-column">
        <h2 className="text-2xl font-bold m-0">Meal Categories</h2>
        <span className="text-600">Manage meal categories</span>
      </div>
      <div className="flex gap-2">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories..."
            className="w-full"
          />
        </span>
        <Button
          label="Add New Category"
          icon="pi pi-plus"
          onClick={handleCreate}
          severity="success"
        />
      </div>
    </div>
  ), [searchTerm]);

  const skeletonRows = Array.from({ length: 5 }, (_, i) => ({
    id: i.toString(),
    name: 'Loading...',
    description: 'Loading...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  if (loading) {
    return (
      <div className="p-4">
        <Toast ref={toast} />
        <ConfirmDialog />

        <Card>
          <DataTable
            value={skeletonRows}
            className="p-datatable-sm"
            header={header}
          >
            <Column 
              field="name" 
              header="Name" 
              body={() => <Skeleton width="200px" height="20px" />}
            />
            <Column 
              field="description" 
              header="Description" 
              body={() => <Skeleton width="300px" height="16px" />}
              style={{ maxWidth: '300px' }}
            />
            <Column 
              field="createdAt" 
              header="Created At" 
              body={() => <Skeleton width="120px" height="16px" />}
            />
            <Column 
              header="Actions" 
              body={() => (
                <div className="flex gap-2">
                  <Skeleton width="32px" height="32px" />
                  <Skeleton width="32px" height="32px" />
                </div>
              )}
              style={{ width: '120px' }}
            />
          </DataTable>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      <Card>
        <DataTable
          value={categories}
          paginator
          rows={rowsPerPage}
          totalRecords={totalRecords}
          lazy
          first={(currentPage - 1) * rowsPerPage}
          onPage={(e) => {
            setCurrentPage((e.page || 0) + 1);
            setRowsPerPage(e.rows || 10);
          }}
          rowsPerPageOptions={[5, 10, 20, 50]}
          className="p-datatable-sm"
          emptyMessage="No categories found"
          loading={loading}
          header={header}
        >
          <Column field="name" header="Name" />
          <Column field="description" header="Description" style={{ maxWidth: '300px' }} />
          <Column 
            field="createdAt" 
            header="Created At" 
            body={(rowData) => new Date(rowData.createdAt).toLocaleDateString()}
            
          />
          <Column header="Actions" body={actionsBodyTemplate} style={{ width: '120px' }} />
        </DataTable>
      </Card>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editingCategory ? 'Edit Category' : 'Add New Category'}
        style={{ width: '500px', maxWidth: '95vw', zIndex: 2000, borderRadius: 12 }}
        modal
        closeOnEscape={!submitting}
        closable={!submitting}
        footer={
          <div className="flex gap-2 justify-content-end">
            <Button 
              label="Cancel" 
              icon="pi pi-times" 
              text 
              onClick={() => setDialogVisible(false)} 
              disabled={submitting} 
            />
            <Button
              label={submitting ? "Saving..." : (editingCategory ? 'Update' : 'Create')}
              icon={submitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
              onClick={handleSubmit}
              disabled={submitting}
            />
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <InputText
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full"
              placeholder="Enter category name"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 mt-4">Description</label>
            <InputTextarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full"
              placeholder="Enter category description (optional)"
              disabled={submitting}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
} 