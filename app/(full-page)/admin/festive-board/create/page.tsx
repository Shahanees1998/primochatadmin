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
import { useRouter } from 'next/navigation';
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

export default function CreateFestiveBoardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  const toast = React.useRef<Toast>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const debouncedSearch = useCallback(
    (search: string, category: string) => {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Set new timeout
      searchTimeoutRef.current = setTimeout(() => {
        if (search || category) {
          searchMeals(search, category);
        }
      }, 300); // 300ms delay
    },
    []
  );

  useEffect(() => {
    loadCategories();
    loadAvailableMonths();
    // Load initial meals
    searchMeals('', '');
  }, []);

  useEffect(() => {
    debouncedSearch(searchTerm, selectedCategory);
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, selectedCategory, debouncedSearch]);

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
      console.log('Loading available months for year:', targetYear); // Debug log
      
      // Get existing boards to determine available months
      const response = await apiClient.getFestiveBoards({ year: targetYear });
      console.log('Festive boards response:', response); // Debug log
      
      if (response.data?.data?.boards && Array.isArray(response.data.data.boards)) {
        const existingMonths = response.data.data.boards.map((board: any) => board.month);
        console.log('Existing months:', existingMonths); // Debug log
        
        // Filter out months that already have boards
        const available = monthOptions.filter(month => !existingMonths.includes(month.value));
        console.log('Available months:', available); // Debug log
        
        if (available.length === 0) {
          console.log('No available months - all months are taken for this year'); // Debug log
        }
        
        setAvailableMonths(available);
      } else {
        console.log('No existing boards found or invalid response structure, all months available'); // Debug log
        setAvailableMonths(monthOptions);
      }
    } catch (error) {
      console.error('Error loading available months:', error);
      // On error, show all months as available
      setAvailableMonths(monthOptions);
    }
  };

  const handleYearChange = (newYear: number) => {
    setFormData({ ...formData, year: newYear, month: null }); // Reset month when year changes
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
      console.log('Search response:', response); // Debug log
      if (response.data) {
        // The API returns data.data, not data.meals
        const meals = response.data.data || [];
        console.log('Available meals:', meals); // Debug log
        console.log('First meal structure:', meals[0]); // Debug first meal structure
        
        // Validate meal structure and ensure category exists
        const validatedMeals = meals.map((meal: any) => ({
          id: meal.id,
          title: meal.title,
          description: meal.description,
          category: meal.category || { id: '', name: 'No Category' }
        }));
        
        console.log('Validated meals:', validatedMeals);
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
    // Validate form data
    if (!formData.month || !formData.year || !formData.title) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    // Validate mealIds
    const validMealIds = formData.mealIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
    if (validMealIds.length === 0) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select at least one meal'
      });
      return;
    }

    console.log('Submitting form with mealIds:', validMealIds);

    try {
      setLoading(true);
      const response = await apiClient.createFestiveBoard({
        month: formData.month,
        year: formData.year,
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
        detail: 'Festive board created successfully'
      });

      router.push('/admin/festive-board');
    } catch (error: any) {
      console.error('Error creating Festive board:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to create Festive board'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMealSelection = (selectedItems: string[] | null) => {
    try {
      const selectedMealIds = selectedItems || [];
      console.log('Selected meal IDs:', selectedMealIds); // Debug log
      
      // Filter out any invalid IDs
      const validMealIds = selectedMealIds.filter(id => id && typeof id === 'string');
      console.log('Valid meal IDs:', validMealIds); // Debug log
      
      // Find the full meal objects for the selected IDs
      const validMeals = availableMeals.filter(meal => validMealIds.includes(meal.id));
      console.log('Valid meals:', validMeals); // Debug log
      
      setSelectedMeals(validMeals);
      setFormData({
        ...formData,
        mealIds: validMealIds,
      });
    } catch (error) {
      console.error('Error in handleMealSelection:', error);
      // If MultiSelect fails, switch to fallback
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
      // Validate meal has valid ID
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
      
      // Filter out any meals without valid IDs
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

  return (
    <div className="p-4">
      <Toast ref={toast} />

      <Card>
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div className="flex flex-column">
            <h2 className="text-2xl font-bold m-0">Create Festive Board</h2>
            <span className="text-600">Create a new monthly meal board</span>
          </div>
          <div className="flex gap-2">
            <Button
              label="Back to Boards"
              icon="pi pi-arrow-left"
              className="p-button-outlined"
              onClick={() => router.push('/admin/festive-board')}
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
                
                {/* Debug info */}
                <small className="text-600">
                  Debug: {availableMeals.length} meals loaded, {selectedMeals.length} selected
                  {useFallbackSelection && ' (using fallback selection)'}
                </small>
              </div>
            )}

            {!searchingMeals && availableMeals.length === 0 && (searchTerm || selectedCategory) && (
              <div className="text-center p-4 text-600">
                <i className="pi pi-search text-2xl mb-2"></i>
                <p>No meals found matching your search criteria</p>
                <small>Try adjusting your search terms or category filter</small>
              </div>
            )}

            {!searchingMeals && availableMeals.length === 0 && !searchTerm && !selectedCategory && (
              <div className="text-center p-4 text-600">
                <i className="pi pi-info-circle text-2xl mb-2"></i>
                <p>Start typing to search for meals</p>
                <small>Or select a category to filter meals</small>
              </div>
            )}

            {selectedMeals.length > 0 && (
              <div className="mb-4">
                <label className="block font-bold mb-2">Selected Meals ({selectedMeals.length})</label>
                <div className="flex flex-wrap gap-2">
                  {selectedMeals.map((meal) => {
                    try {
                      return (
                        <div
                          key={meal.id}
                          className="p-2 border-round bg-primary-50 border-1 border-primary-200"
                        >
                          <div className="font-medium">{meal.title || 'Untitled Meal'}</div>
                          <div className="text-sm text-600">{meal.category?.name || 'No Category'}</div>
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering meal:', meal, error);
                      return (
                        <div
                          key={meal.id}
                          className="p-2 border-round bg-red-50 border-1 border-red-200"
                        >
                          <div className="font-medium text-red-600">Error displaying meal</div>
                          <div className="text-sm text-red-500">ID: {meal.id}</div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="col-12 flex gap-2 justify-content-end">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-outlined"
              onClick={() => router.push('/admin/festive-board')}
              disabled={loading}
            />
            <Button
              label={loading ? "Creating..." : "Create Board"}
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-check"}
              onClick={handleSubmit}
              disabled={loading}
            />
          </div>
        </div>
      </Card>
    </div>
  );
} 