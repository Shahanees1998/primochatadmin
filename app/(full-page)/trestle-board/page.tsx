'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { apiClient } from '@/lib/apiClient';

interface FestiveBoardMeal {
  id: string;
  meal: {
    id: string;
    title: string;
    description?: string;
    category: {
      id: string;
      name: string;
    };
  };
  userSelections: Array<{
    id: string;
    isCompleted: boolean;
    completedAt?: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface FestiveBoard {
  id: string;
  month: number;
  year: number;
  title: string;
  description?: string;
  meals: FestiveBoardMeal[];
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

export default function UserFestiveBoardPage() {
  const [boards, setBoards] = useState<FestiveBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [updatingMeal, setUpdatingMeal] = useState<string | null>(null);
  const toast = React.useRef<Toast>(null);

  useEffect(() => {
    loadBoards();
  }, [selectedYear, selectedMonth]);

  const loadBoards = async () => {
    try {
      setLoading(true);
      const params: any = { year: selectedYear };
      if (selectedMonth) {
        params.month = selectedMonth;
      }

      const response = await apiClient.getUserFestiveBoards(params);
      if (response.data) {
        setBoards(response.data.boards || []);
      }
    } catch (error) {
      console.error('Error loading Festive boards:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load Festive boards'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMealToggle = async (festiveBoardMealId: string, isCompleted: boolean) => {
    try {
      setUpdatingMeal(festiveBoardMealId);
      const response = await apiClient.markMealCompleted({
        festiveBoardMealId,
        isCompleted,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Update the local state
      setBoards(prevBoards => 
        prevBoards.map(board => ({
          ...board,
          meals: board.meals.map(meal => {
            if (meal.id === festiveBoardMealId) {
              return {
                ...meal,
                userSelections: response.data ? [response.data] : [],
              };
            }
            return meal;
          }),
        }))
      );

      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: response.data?.message || 'Meal status updated'
      });
    } catch (error: any) {
      console.error('Error updating meal status:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to update meal status'
      });
    } finally {
      setUpdatingMeal(null);
    }
  };

  const getMonthName = (month: number) => {
    return monthOptions.find(m => m.value === month)?.label || 'Unknown';
  };

  const getCategories = (board: FestiveBoard) => {
    const categories = new Set(board.meals.map(meal => meal.meal.category.name));
    return Array.from(categories);
  };

  const getFilteredMeals = (board: FestiveBoard) => {
    if (!selectedCategory) {
      return board.meals;
    }
    return board.meals.filter(meal => meal.meal.category.name === selectedCategory);
  };

  const isMealCompleted = (meal: FestiveBoardMeal) => {
    return meal.userSelections.some(selection => selection.isCompleted);
  };

  const getCompletedCount = (board: FestiveBoard) => {
    return board.meals.filter(meal => isMealCompleted(meal)).length;
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center p-8">
          <ProgressSpinner style={{ width: '50px', height: '50px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Toast ref={toast} />

      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Festive Board</h1>
        <p className="text-600">Browse and mark your completed meals</p>
      </div>

      <div className="grid mb-4">
        <div className="col-12 md:col-6">
          <label className="block font-bold mb-2">Select Year</label>
          <Dropdown
            value={selectedYear}
            options={yearOptions}
            onChange={(e) => setSelectedYear(e.value)}
            placeholder="Select Year"
            className="w-full"
          />
        </div>
        <div className="col-12 md:col-6">
          <label className="block font-bold mb-2">Select Month (Optional)</label>
          <Dropdown
            value={selectedMonth}
            options={[
              { label: 'All Months', value: null },
              ...monthOptions,
            ]}
            onChange={(e) => setSelectedMonth(e.value)}
            placeholder="All Months"
            className="w-full"
          />
        </div>
      </div>

      {boards.length === 0 ? (
        <Card>
          <div className="text-center p-8">
            <i className="pi pi-calendar-times text-6xl text-400 mb-4"></i>
            <h3 className="text-xl font-bold mb-2">No Festive Boards Found</h3>
            <p className="text-600">
              No Festive boards are available for the selected period.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {boards.map((board) => {
            const categories = getCategories(board);
            const completedCount = getCompletedCount(board);
            const totalMeals = board.meals.length;

            return (
              <Card key={board.id} className="mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {getMonthName(board.month)} {board.year}
                    </h2>
                    <p className="text-600">{board.title}</p>
                    {board.description && (
                      <p className="text-sm text-500 mt-1">{board.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {completedCount}/{totalMeals}
                    </div>
                    <div className="text-sm text-600">Meals Completed</div>
                  </div>
                </div>

                {categories.length > 1 && (
                  <div className="mb-4">
                    <label className="block font-bold mb-2">Filter by Category</label>
                    <Dropdown
                      value={selectedCategory}
                      options={[
                        { label: 'All Categories', value: '' },
                        ...categories.map(cat => ({ label: cat, value: cat })),
                      ]}
                      onChange={(e) => setSelectedCategory(e.value)}
                      placeholder="All Categories"
                      className="w-full"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  {getFilteredMeals(board).map((meal) => {
                    const isCompleted = isMealCompleted(meal);
                    const isUpdating = updatingMeal === meal.id;

                    return (
                      <div
                        key={meal.id}
                        className={`p-3 border-round border-1 ${
                          isCompleted 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                                                     <Checkbox
                             checked={isCompleted}
                             onChange={(e) => handleMealToggle(meal.id, e.checked || false)}
                             disabled={isUpdating}
                           />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium ${isCompleted ? 'line-through text-green-600' : ''}`}>
                                {meal.meal.title}
                              </span>
                              <Tag 
                                value={meal.meal.category.name} 
                                severity="info" 
                                className="text-xs"
                              />
                              {isUpdating && (
                                <ProgressSpinner style={{ width: '16px', height: '16px' }} />
                              )}
                            </div>
                            {meal.meal.description && (
                              <p className={`text-sm ${isCompleted ? 'text-green-600' : 'text-600'}`}>
                                {meal.meal.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {getFilteredMeals(board).length === 0 && selectedCategory && (
                  <div className="text-center p-4 text-600">
                    No meals found in the selected category.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 