'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Calendar } from 'primereact/calendar';
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
    date: null as Date | null,
    title: '',
    mainCourse: '',
    description: '',
    mealIds: [] as string[],
    isRSVP: false,
    maxAttendees: null as number | null,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<Meal[]>([]);
  const [searchingMeals, setSearchingMeals] = useState(false);
  const [useFallbackSelection, setUseFallbackSelection] = useState(false);
  const toast = React.useRef<Toast>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const debouncedSearch = useCallback(
    (search: string) => {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Set new timeout
      searchTimeoutRef.current = setTimeout(() => {
        if (search) {
          searchMeals(search);
        }
      }, 300); // 300ms delay
    },
    []
  );

  useEffect(() => {
    loadCategories();
    loadAvailableMonths();
    // Load initial meals
    searchMeals('');
  }, []);

  useEffect(() => {
    debouncedSearch(searchTerm);
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, debouncedSearch]);

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
      const response = await apiClient.getFestiveBoards({ year: targetYear });
      
      if (response.data?.data?.boards && Array.isArray(response.data.data.boards)) {
        const existingMonths = response.data.data.boards.map((board: any) => board.month);
        
        // Filter out months that already have boards
        const available = monthOptions.filter(month => !existingMonths.includes(month.value));
        
        if (available.length === 0) {
          console.log('No available months - all months are taken for this year'); // Debug log
        }
        
        setAvailableMonths(available);
      } else {
        setAvailableMonths(monthOptions);
      }
    } catch (error) {
      console.error('Error loading available months:', error);
      // On error, show all months as available
      setAvailableMonths(monthOptions);
    }
  };

  const handleYearChange = (newYear: number) => {
    setFormData({ ...formData, year: newYear, month: null, date: null }); // Reset month and date when year changes
    loadAvailableMonths(newYear);
  };

  const handleMonthChange = (newMonth: number) => {
    setFormData({ ...formData, month: newMonth, date: null }); // Reset date when month changes
  };

  const searchMeals = async (search: string = searchTerm) => {
    try {
      setSearchingMeals(true);
      const response = await apiClient.searchMeals({
        search: search,
        limit: 50, // Increased limit since we're not filtering by category
      });
      if (response.data) {
        // The API returns data.data, not data.meals
        const meals = response.data.data || [];
        // Validate meal structure and ensure category exists
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

    try {
      setLoading(true);
      const response = await apiClient.createFestiveBoard({
        month: formData.month,
        year: formData.year,
        date: formData.date,
        title: formData.title,
        mainCourse: formData.mainCourse,
        description: formData.description,
        mealIds: validMealIds,
        isRSVP: formData.isRSVP,
        maxAttendees: formData.maxAttendees,
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
      // Filter out any invalid IDs
      const validMealIds = selectedMealIds.filter(id => id && typeof id === 'string');      
      // Find the full meal objects for the selected IDs
      const validMeals = availableMeals.filter(meal => validMealIds.includes(meal.id));      
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
              onChange={(e) => handleMonthChange(e.value)}
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

          <div className="col-12 md:col-6">
            <label htmlFor="date" className="block font-bold mb-2">Specific Date (Optional)</label>
            <Calendar
              id="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.value as Date })}
              placeholder={formData.month && formData.year ? "Select specific date" : "Select month and year first"}
              className="w-full"
              showIcon
              dateFormat="dd/mm/yy"
              showButtonBar
              disabled={!formData.month || !formData.year}
              minDate={formData.month && formData.year ? new Date(formData.year, formData.month - 1, 1) : undefined}
              maxDate={formData.month && formData.year ? new Date(formData.year, formData.month, 0) : undefined}
            />
            <small className="text-600">
              {!formData.month || !formData.year 
                ? "Please select month and year first" 
                : "Leave empty to use the entire month"
              }
            </small>
          </div>

          <div className="col-12">
            <label htmlFor="title" className="block font-bold mb-2">Festive Board Title *</label>
            <InputText
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter board title"
              className="w-full"
            />
          </div>

          <div className="col-12">
            <label htmlFor="mainCourse" className="block font-bold mb-2">Main Course</label>
            <InputText
              id="mainCourse"
              value={formData.mainCourse}
              onChange={(e) => setFormData({ ...formData, mainCourse: e.target.value })}
              placeholder="Enter main course"
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

          {/* RSVP Settings */}
          <div className="col-12">
            <h3 className="text-lg font-bold mb-3">RSVP Settings</h3>
            
            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="flex align-items-center gap-2 mb-3">
                  <Checkbox
                    inputId="isRSVP"
                    checked={formData.isRSVP}
                    onChange={(e) => setFormData({ ...formData, isRSVP: e.checked || false })}
                  />
                  <label htmlFor="isRSVP" className="font-bold">Enable RSVP for this Festive Board</label>
                </div>
              </div>

              {formData.isRSVP && (
                <div className="col-12 md:col-6">
                  <label htmlFor="maxAttendees" className="block font-bold mb-2">Maximum Attendees</label>
                  <InputNumber
                    id="maxAttendees"
                    value={formData.maxAttendees}
                    onValueChange={(e) => setFormData({ ...formData, maxAttendees: e.value || null })}
                    placeholder="Enter maximum number of attendees"
                    className="w-full"
                    min={1}
                    max={1000}
                    showButtons
                    buttonLayout="horizontal"
                    incrementButtonIcon="pi pi-plus"
                    decrementButtonIcon="pi pi-minus"
                  />
                  <small className="text-600">Leave empty for unlimited attendees</small>
                </div>
              )}
            </div>

            {formData.isRSVP && (
              <div className="mt-3 p-3 bg-blue-50 border-round">
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-info-circle text-blue-500"></i>
                  <span className="text-blue-700 font-medium">RSVP Features Enabled</span>
                </div>
                <ul className="mt-2 text-sm text-blue-600 list-none p-0 m-0">
                  <li className="mb-1">• Users can RSVP with status: Confirmed, Maybe, or Declined</li>
                  <li className="mb-1">• Admins can manage all RSVPs and see participant lists</li>
                  <li className="mb-1">• Automatic notifications will be sent for RSVP updates</li>
                  {formData.maxAttendees && (
                    <li className="mb-1">• Maximum attendees limit: {formData.maxAttendees}</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="col-12">
            <h3 className="text-lg font-bold mb-3">Select Meals</h3>
            <div className="mb-4">
              <label className="block font-bold mb-2">Search and Select Meals</label>
              {searchingMeals ? (
                <div className="flex justify-center p-4">
                  <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                  <span className="ml-2">Searching meals...</span>
                </div>
              ) : (
                <MultiSelect
                  value={selectedMeals.map(meal => meal.id)}
                  onChange={(e) => handleMealSelection(e.value)}
                  options={availableMeals.map(meal => ({
                    label: `${meal.title}${meal.category?.name ? ` (${meal.category.name})` : ''}`,
                    value: meal.id
                  }))}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Search and select meals..."
                  className="w-full"
                  showClear
                  filter
                  filterMatchMode="contains"
                  maxSelectedLabels={3}
                  selectedItemsLabel={`${selectedMeals.length} meals selected`}
                  onFilter={(e) => {
                    setSearchTerm(e.filter);
                  }}
                  filterPlaceholder="Search meals by name..."
                  display="chip"
                />
              )}
              <small className="text-600">
                {useFallbackSelection && ' (using fallback selection)'}
              </small>
            </div>
            {!searchingMeals && availableMeals.length === 0 && searchTerm && (
              <div className="text-center p-4 text-600">
                <i className="pi pi-search text-2xl mb-2"></i>
                <p>No meals found matching your search criteria</p>
                <small>Try adjusting your search terms</small>
              </div>
            )}
            {!searchingMeals && availableMeals.length === 0 && !searchTerm && (
              <div className="text-center p-4 text-600">
                <i className="pi pi-info-circle text-2xl mb-2"></i>
                <p>Start typing to search for meals</p>
                <small>Search by meal name to find and select meals</small>
              </div>
            )}
            {selectedMeals.length > 0 && (
              <div className="mb-4">
                <label className="block font-bold mb-2">Selected Meals ({selectedMeals.length})</label>
                <div className="flex flex-wrap gap-2">
                  {selectedMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="p-2 border-round bg-primary-50 border-1 border-primary-200 align-items-center gap-2 flex"
                    >
                      <div className="flex flex-column">
                        <div className="font-medium">{meal.title || 'Untitled Meal'}</div>
                        <div className="text-sm text-600">{meal.category?.name || 'No Category'}</div>
                      </div>
                      <Button
                        icon="pi pi-times"
                        className="p-button-rounded p-button-text p-button-sm"
                        onClick={() => {
                          const newSelectedMeals = selectedMeals.filter(m => m.id !== meal.id);
                          setSelectedMeals(newSelectedMeals);
                          setFormData({
                            ...formData,
                            mealIds: newSelectedMeals.map(m => m.id),
                          });
                        }}
                        tooltip="Remove meal"
                      />
                    </div>
                  ))}
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