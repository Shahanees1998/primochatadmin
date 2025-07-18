'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';
import { apiClient } from '@/lib/apiClient';

interface Meal {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface MealCategory {
  id: string;
  name: string;
  description?: string;
}

interface MealFormData {
  title: string;
  description: string;
  categoryId: string;
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [formData, setFormData] = useState<MealFormData>({
    title: '',
    description: '',
    categoryId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>('');
  const [submitting, setSubmitting] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const toast = React.useRef<Toast>(null);

  useEffect(() => {
    loadCategories();
    loadMeals();
  }, []);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await apiClient.getMealCategories({
        limit: 1000, // Fetch all categories since there are typically limited categories
        page: 1
      });
      if (response.data) {
        setCategories(response.data.categories || response.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load meal categories'
      });
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadMeals = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: rowsPerPage
      };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (selectedCategory && selectedCategory !== '') params.categoryId = selectedCategory?.value ?? selectedCategory;
      const response = await apiClient.getMeals(params);
      if (response.data) {
        setMeals(response.data.meals || []);
        setTotalRecords(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load meals'
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategory]);

  useEffect(() => {
    loadMeals();
  }, [debouncedSearchTerm, selectedCategory, currentPage, rowsPerPage]);

  const handleCreate = () => {
    setEditingMeal(null);
    setFormData({
      title: '',
      description: '',
      categoryId: ''
    });
    setDialogVisible(true);
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setFormData({
      title: meal.title,
      description: meal.description || '',
      categoryId: meal.categoryId
    });
    setDialogVisible(true);
  };

  const handleDelete = (meal: Meal) => {
    confirmDialog({
      message: `Are you sure you want to delete "${meal.title}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteMeal(meal.id)
    });
  };

  const deleteMeal = async (id: string) => {
    try {
      await apiClient.deleteMeal(id);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Meal deleted successfully'
      });
      // Reset to first page if we're on a page that might be empty after deletion
      if (meals.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        loadMeals();
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete meal'
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Meal title is required'
      });
      return;
    }

    if (!formData.categoryId) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select a category'
      });
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingMeal) {
        await apiClient.updateMeal(editingMeal.id, formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Meal updated successfully'
        });
      } else {
        await apiClient.createMeal(formData);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Meal created successfully'
        });
      }

      setDialogVisible(false);
      loadMeals();
    } catch (error: any) {
      console.error('Error saving meal:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to save meal'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = categories.map(category => ({
    label: category.name,
    value: category.id
  }));

  const actionsBodyTemplate = (rowData: Meal) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-pencil"
          className="p-button-sm p-button-outlined"
          onClick={() => handleEdit(rowData)}
          tooltip="Edit Meal"
        />
        <Button
          icon="pi pi-trash"
          className="p-button-sm p-button-outlined p-button-danger"
          onClick={() => handleDelete(rowData)}
          tooltip="Delete Meal"
        />
      </div>
    );
  };

  const categoryBodyTemplate = (rowData: Meal) => {
    return rowData.category?.name || 'Unknown Category';
  };

  const header = useMemo(() => (
    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
      <div className="flex flex-column">
        <h2 className="text-2xl font-bold m-0">Meal Management</h2>
        <span className="text-600">Manage all meals and their categories</span>
      </div>
      <div className="flex gap-2">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search meals..."
            className="w-full"
          />
        </span>
        {/* <Dropdown
          placeholder="Filter by category"
          value={selectedCategory}
          options={[
            { label: 'All Categories', value: '' },
            ...categoryOptions
          ]}
          onChange={(e) => setSelectedCategory(e.value)}
          className="min-w-[200px]"
          disabled={categoriesLoading}
        /> */}
        <Button
          label="Add New Meal"
          icon="pi pi-plus"
          onClick={handleCreate}
          severity="success"
        />
      </div>
    </div>
  ), [searchTerm, selectedCategory, categoryOptions, categoriesLoading]);

  const skeletonRows = Array.from({ length: 5 }, (_, i) => ({
    id: i.toString(),
    title: 'Loading...',
    description: 'Loading...',
    categoryId: '',
    category: { id: '', name: 'Loading...' },
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
              field="title" 
              header="Title" 
              body={() => <Skeleton width="200px" height="20px" />}
            />
            <Column 
              field="description" 
              header="Description" 
              body={() => <Skeleton width="300px" height="16px" />}
              style={{ maxWidth: '300px' }}
            />
            <Column 
              field="category.name" 
              header="Category" 
              body={() => <Skeleton width="150px" height="16px" />}
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
          value={meals}
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
          emptyMessage="No meals found"
          loading={loading}
          header={header}
        >
          <Column field="title" header="Title" />
          <Column field="description" header="Description" style={{ maxWidth: '300px' }} />
          <Column field="category.name" header="Category" body={categoryBodyTemplate} />
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
        header={editingMeal ? 'Edit Meal' : 'Add New Meal'}
        style={{ width: '600px', maxWidth: '95vw', zIndex: 2000, borderRadius: 12 }}
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
              label={submitting ? "Saving..." : (editingMeal ? 'Update' : 'Create')}
              icon={submitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
              onClick={handleSubmit}
              disabled={submitting}
            />
          </div>
        }
      >
        <div className="grid">
          <div className="col-12">
            <label htmlFor="title" className="block font-bold mb-2">Meal Title *</label>
            <InputText
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full"
              placeholder="Enter meal title"
              disabled={submitting}
              autoFocus
            />
          </div>
          
          <div className="col-12">
            <label htmlFor="categoryId" className="block font-bold mb-2">Category *</label>
            <Dropdown
              id="categoryId"
              value={formData.categoryId}
              options={categoryOptions}
              onChange={(e) => setFormData({ ...formData, categoryId: e.value })}
              placeholder="Select a category"
              className="w-full"
              disabled={submitting || categoriesLoading}
              filter
              filterMatchMode="contains"
              showClear
            />
          </div>

          <div className="col-12">
            <label htmlFor="description" className="block font-bold mb-2">Description</label>
            <InputTextarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full"
              placeholder="Enter meal description (optional)"
              disabled={submitting}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
} 