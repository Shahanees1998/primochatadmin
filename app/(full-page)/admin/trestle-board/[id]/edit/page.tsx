'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';

interface Meal {
  id: string;
  title: string;
  description?: string;
  category?: {
    id: string;
    name: string;
  };
}

interface MealCategory {
  id: string;
  name: string;
  description?: string;
}

const monthOptions = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => ({
  label: (currentYear - 2 + i).toString(),
  value: currentYear - 2 + i,
}));

export default function EditTrestleBoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params?.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [availableMonths, setAvailableMonths] = useState<typeof monthOptions>([]);
  const [formData, setFormData] = useState({
    month: null as number | null,
    year: currentYear,
    title: '',
    description: '',
    mealIds: [] as string[],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<Meal[]>([]);
  const [searchingMeals, setSearchingMeals] = useState(false);
  const [useFallbackSelection, setUseFallbackSelection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = React.useRef<Toast>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const debouncedSearch = useCallback(
    (search: string, category: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        if (search || category) {
          searchMeals(search, category);
        }
      }, 300);
    },
    []
  );

  useEffect(() => {
    if (boardId) {
      loadBoard();
      loadCategories();
      loadAvailableMonths();
      searchMeals('', '');
    }
  }, [boardId]);

  useEffect(() => {
    debouncedSearch(searchTerm, selectedCategory);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, selectedCategory, debouncedSearch]);

  const loadBoard = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      
      const response = await apiClient.getTrestleBoard(boardId);
      
      if (response.error) {
        setError(response.error);
        return;
      }
      
      // Handle double nesting: response.data.data
      const boardData = (response.data as any)?.data || response.data;
      
      if (boardData) {
        // Extract meal IDs from the board's meals
        const mealIds = boardData.meals?.map((mealItem: any) => mealItem.mealId) || [];
        
        setFormData({
          month: boardData.month,
          year: boardData.year,
          title: boardData.title || '',
          description: boardData.description || '',
          mealIds: mealIds,
        });

        // Set selected meals for display
        const selectedMealObjects = boardData.meals?.map((mealItem: any) => ({
          id: mealItem.mealId,
          title: mealItem.meal?.title || 'Untitled Meal',
          description: mealItem.meal?.description,
          category: mealItem.meal?.category,
        })) || [];
        
        setSelectedMeals(selectedMealObjects);
      } else {
        setError('Board not found');
      }
    } catch (error) {
      console.error('Error loading board:', error);
      setError('Failed to load trestle board');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await apiClient.getMealCategories();
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

  const loadAvailableMonths = async (year?: number) => {
    try {
      const targetYear = year || currentYear;
      
      // Get existing boards to determine available months
      const response = await apiClient.getTrestleBoards({ year: targetYear });
      
      if (response.data?.data?.boards && Array.isArray(response.data.data.boards)) {
        const existingMonths = response.data.data.boards
          .filter((board: any) => board.id !== boardId) // Exclude current board
          .map((board: any) => board.month);
        
        // Filter out months that already have boards (except current board)
        const available = monthOptions.filter(month => !existingMonths.includes(month.value));
        
        setAvailableMonths(available);
      } else {
        setAvailableMonths(monthOptions);
      }
    } catch (error) {
      console.error('Error loading available months:', error);
      setAvailableMonths(monthOptions);
    }
  };

  const handleYearChange = (newYear: number) => {
    setFormData({ ...formData, year: newYear, month: null });
    loadAvailableMonths(newYear);
  };

  const searchMeals = async (search: string = searchTerm, category: string = selectedCategory) => {
    try {
      setSearchingMeals(true);
      const response = await apiClient.searchMeals({
        search: search,
        categoryId: category,
        limit: 20,
      });
      
      if (response.data) {
        const meals = response.data.data || [];
        
        const validatedMeals = meals.map((meal: any) => ({
          id: meal.id,
          title: meal.title,
          description: meal.description,
          category: meal.category || { id: '', name: 'No Category' }
        }));
        
        setAvailableMeals(validatedMeals);
      } else {
        setAvailableMeals([]);
      }
    } catch (error) {
      console.error('Error searching meals:', error);
      setAvailableMeals([]);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to search meals'
      });
    } finally {
      setSearchingMeals(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.month || !formData.year || !formData.title) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    const validMealIds = formData.mealIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
    if (validMealIds.length === 0) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select at least one meal'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.updateTrestleBoard(boardId, {
        title: formData.title,
        description: formData.description,
        mealIds: validMealIds,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Trestle board updated successfully'
      });

      router.push('/admin/trestle-board');
    } catch (error: any) {
      console.error('Error updating trestle board:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to update trestle board'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMealSelection = (selectedItems: string[] | null) => {
    try {
      const selectedMealIds = selectedItems || [];
      const validMealIds = selectedMealIds.filter(id => id && typeof id === 'string');
      const validMeals = availableMeals.filter(meal => validMealIds.includes(meal.id));
      
      setSelectedMeals(validMeals);
      setFormData({
        ...formData,
        mealIds: validMealIds,
      });
    } catch (error) {
      console.error('Error in handleMealSelection:', error);
      setUseFallbackSelection(true);
      toast.current?.show({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Switched to alternative selection method'
      });
    }
  };

  const handleCheckboxSelection = (meal: Meal, checked: boolean) => {
    try {
      if (!meal || !meal.id || typeof meal.id !== 'string') {
        console.error('Invalid meal data:', meal);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Invalid meal data'
        });
        return;
      }

      let newSelectedMeals: Meal[];
      if (checked) {
        newSelectedMeals = [...selectedMeals, meal];
      } else {
        newSelectedMeals = selectedMeals.filter(m => m.id !== meal.id);
      }
      
      const validMeals = newSelectedMeals.filter(m => m && m.id && typeof m.id === 'string');
      
      setSelectedMeals(validMeals);
      setFormData({
        ...formData,
        mealIds: validMeals.map(m => m.id),
      });
    } catch (error) {
      console.error('Error in handleCheckboxSelection:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update meal selection'
      });
    }
  };

  const categoryOptions = [
    { label: 'All Categories', value: '' },
    ...categories.map(category => ({
      label: category.name,
      value: category.id,
    })),
  ];

  if (initialLoading) {
    return (
      <div className="p-4">
        <Toast ref={toast} />
        <Card>
          <div className="flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="text-center">
              <ProgressSpinner style={{ width: '50px', height: '50px' }} />
              <p className="mt-3">Loading trestle board...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Toast ref={toast} />
        <Card>
          <div className="text-center p-4">
            <i className="pi pi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
            <h2 className="text-xl font-semibold mb-2">Error Loading Board</h2>
            <p className="text-600 mb-4">{error}</p>
            <Button
              label="Back to Boards"
              icon="pi pi-arrow-left"
              onClick={() => router.push('/admin/trestle-board')}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Toast ref={toast} />

      <Card>
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div className="flex flex-column">
            <h2 className="text-2xl font-bold m-0">Edit Trestle Board</h2>
            <span className="text-600">Update the trestle board details</span>
          </div>
          <div className="flex gap-2">
            <Button
              label="Back to Boards"
              icon="pi pi-arrow-left"
              className="p-button-outlined"
              onClick={() => router.push('/admin/trestle-board')}
            />
          </div>
        </div>

        <div className="grid">
          <div className="col-12 md:col-6">
            <label htmlFor="month" className="block font-bold mb-2">Month *</label>
            <Dropdown
              id="month"
              value={formData.month}
              options={availableMonths}
              onChange={(e) => setFormData({ ...formData, month: e.value })}
              placeholder="Select Month"
              className="w-full"
              disabled={availableMonths.length === 0}
            />
            {availableMonths.length === 0 && (
              <small className="text-red-500">All months for this year have been used</small>
            )}
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="year" className="block font-bold mb-2">Year *</label>
            <Dropdown
              id="year"
              value={formData.year}
              options={yearOptions}
              onChange={(e) => handleYearChange(e.value)}
              placeholder="Select Year"
              className="w-full"
            />
          </div>

          <div className="col-12">
            <label htmlFor="title" className="block font-bold mb-2">Board Title *</label>
            <InputText
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter board title"
              className="w-full"
            />
          </div>

          <div className="col-12">
            <label htmlFor="description" className="block font-bold mb-2">Description</label>
            <InputTextarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Enter board description (optional)"
              className="w-full"
            />
          </div>

          <div className="col-12">
            <h3 className="text-lg font-bold mb-3">Select Meals</h3>
            
            <div className="grid mb-4">
              <div className="col-12 md:col-6">
                <label className="block font-bold mb-2">Search Meals</label>
                <span className="p-input-icon-left w-full">
                  <i className="pi pi-search" />
                  <InputText
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search meals by title or description..."
                    className="w-full"
                  />
                </span>
                {searchTerm && (
                  <small className="text-600">Searching for: "{searchTerm}"</small>
                )}
              </div>
              
              <div className="col-12 md:col-6">
                <label className="block font-bold mb-2">Filter by Category</label>
                <Dropdown
                  value={selectedCategory}
                  options={categoryOptions}
                  onChange={(e) => setSelectedCategory(e.value)}
                  placeholder="All Categories"
                  className="w-full"
                  disabled={categoriesLoading}
                />
              </div>
            </div>

            {searchingMeals && (
              <div className="flex justify-center p-4">
                <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                <span className="ml-2">Searching meals...</span>
              </div>
            )}

            {!searchingMeals && availableMeals.length > 0 && (
              <div className="mb-4">
                <label className="block font-bold mb-2">
                  Available Meals ({availableMeals.length} found)
                </label>
                
                {!useFallbackSelection ? (
                  <MultiSelect
                    value={selectedMeals.map(meal => meal.id)}
                    onChange={(e) => handleMealSelection(e.value)}
                    options={availableMeals.map(meal => ({ label: meal.title, value: meal.id }))}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select meals"
                    className="w-full"
                    showClear
                    filter
                    filterMatchMode="contains"
                    maxSelectedLabels={3}
                    selectedItemsLabel={`${selectedMeals.length} meals selected`}
                  />
                ) : (
                  <div className="border-1 surface-border border-round p-3 max-h-20rem overflow-y-auto">
                    {availableMeals.map((meal) => (
                      <div key={meal.id} className="flex align-items-center mb-2">
                        <Checkbox
                          checked={selectedMeals.some(m => m.id === meal.id)}
                          onChange={(e) => handleCheckboxSelection(meal, e.checked || false)}
                          className="mr-2"
                        />
                        <div className="flex flex-column">
                          <span className="font-medium">{meal.title || 'Untitled Meal'}</span>
                          <span className="text-sm text-600">{meal.category?.name || 'No Category'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <small className="text-600">
                  {availableMeals.length} meals loaded, {selectedMeals.length} selected
                  {useFallbackSelection && ' (using fallback selection)'}
                </small>
              </div>
            )}

            {!searchingMeals && availableMeals.length === 0 && (
              <div className="text-center p-4 text-600">
                <i className="pi pi-info-circle text-2xl mb-2"></i>
                <p>No meals found. Try adjusting your search criteria.</p>
              </div>
            )}
          </div>

          <div className="col-12">
            <div className="flex gap-2 justify-content-end">
              <Button
                label="Cancel"
                className="p-button-outlined"
                onClick={() => router.push('/admin/trestle-board')}
              />
              <Button
                label="Update Board"
                icon="pi pi-check"
                onClick={handleSubmit}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 