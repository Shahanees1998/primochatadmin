'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Chip } from 'primereact/chip';
import { Badge } from 'primereact/badge';
import { Checkbox } from 'primereact/checkbox';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/store/toast.context';

interface Meal {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: {
    id: string;
    name: string;
  };
}

interface MealSelection {
  id: string;
  mealId: string;
  festiveBoardId: string;
  meal: Meal;
  isSelected: boolean;
  selectedAt: string | null;
}

interface FestiveBoard {
  id: string;
  title: string;
  description?: string;
  month: string;
  year: number;
}

interface FestiveBoardMealSelectionProps {
  festiveBoardId: string;
  onClose?: () => void;
}

export default function FestiveBoardMealSelection({ 
  festiveBoardId, 
  onClose 
}: FestiveBoardMealSelectionProps) {
  const [festiveBoard, setFestiveBoard] = useState<FestiveBoard | null>(null);
  const [meals, setMeals] = useState<MealSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchMeals();
  }, [festiveBoardId]);

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/festive-board/${festiveBoardId}/meals`);
      if (response.error) {
        throw new Error(response.error);
      }
      const data = response.data as { festiveBoard: FestiveBoard; meals: MealSelection[] };
      setFestiveBoard(data.festiveBoard);
      setMeals(data.meals);
    } catch (error) {
      console.error('Error fetching meals:', error);
      showToast('error', 'Error', 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const handleMealToggle = async (mealId: string, isSelected: boolean) => {
    try {
      setSaving(true);
      const action = isSelected ? 'deselect' : 'select';
      
      const response = await apiClient.post(`/festive-board/${festiveBoardId}/meals`, {
        mealId,
        action,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Update local state
      setMeals(prevMeals => 
        prevMeals.map(meal => 
          meal.mealId === mealId 
            ? { 
                ...meal, 
                isSelected: !isSelected,
                selectedAt: !isSelected ? new Date().toISOString() : null
              }
            : meal
        )
      );

      showToast('success', 'Success', isSelected ? 'Meal deselected' : 'Meal selected');
    } catch (error) {
      console.error('Error toggling meal selection:', error);
      showToast('error', 'Error', 'Failed to update meal selection');
    } finally {
      setSaving(false);
    }
  };

  const selectedMealsCount = meals.filter(meal => meal.isSelected).length;

  if (loading) {
    return (
      <Card className="w-full">
        <div className="flex items-center justify-center p-8">
          <i className="pi pi-spinner pi-spin text-2xl"></i>
          <span className="ml-2">Loading meals...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      {festiveBoard && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">{festiveBoard.title}</h2>
          {festiveBoard.description && (
            <p className="text-gray-600 mb-2">{festiveBoard.description}</p>
          )}
          <p className="text-sm text-gray-500">
            {festiveBoard.month} {festiveBoard.year}
          </p>
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Available Meals</h3>
        <div className="flex items-center gap-2">
          <Badge value={selectedMealsCount} severity="info" />
          <span className="text-sm text-gray-600">
            {selectedMealsCount === 1 ? 'meal selected' : 'meals selected'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {meals.map((mealSelection) => (
          <div
            key={mealSelection.id}
            className={`p-4 border rounded-lg transition-colors ${
              mealSelection.isSelected
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Checkbox
                    checked={mealSelection.isSelected}
                    onChange={() => handleMealToggle(mealSelection.mealId, mealSelection.isSelected)}
                    disabled={saving}
                  />
                  <div>
                    <h4 className="font-medium">{mealSelection.meal.name}</h4>
                    <Chip label={mealSelection.meal.category.name} />
                  </div>
                </div>
                
                {mealSelection.meal.description && (
                  <p className="text-sm text-gray-600 ml-8 mb-2">
                    {mealSelection.meal.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 ml-8">
                  <span className="text-sm font-medium text-green-600">
                    ${mealSelection.meal.price.toFixed(2)}
                  </span>
                  {mealSelection.isSelected && mealSelection.selectedAt && (
                    <span className="text-xs text-gray-500">
                      Selected on {new Date(mealSelection.selectedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="ml-4">
                <Button
                  label={mealSelection.isSelected ? 'Deselect' : 'Select'}
                  icon={mealSelection.isSelected ? 'pi pi-times' : 'pi pi-check'}
                  size="small"
                  severity={mealSelection.isSelected ? 'danger' : 'success'}
                  onClick={() => handleMealToggle(mealSelection.mealId, mealSelection.isSelected)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {meals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <i className="pi pi-info-circle text-2xl mb-2"></i>
          <p>No meals available for this festive board.</p>
        </div>
      )}

      {onClose && (
        <div className="mt-6 flex justify-end">
          <Button
            label="Close"
            icon="pi pi-times"
            onClick={onClose}
            severity="secondary"
          />
        </div>
      )}
    </Card>
  );
} 