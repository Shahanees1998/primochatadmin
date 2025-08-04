'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Skeleton } from 'primereact/skeleton';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import AdminMealSelectionManager from '@/components/AdminMealSelectionManager';

export default function FestiveBoardViewPage() {
  const router = useRouter();
  const params = useParams();
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMealSelections, setShowMealSelections] = useState(false);
  const toast = React.useRef<Toast>(null);

  const boardId = params?.id as string;

  useEffect(() => {
    if (boardId) {
      loadBoard();
    } else {
      setError('No board ID provided');
      setLoading(false);
    }
  }, [boardId]);

  const loadBoard = async () => {
    try {
      setLoading(true);
      setError(null);
            
      const response = await apiClient.getFestiveBoard(boardId);      
      if (response.error) {
        console.error('API error:', response.error);
        setError(response.error);
        return;
      }
      
      // Handle double nesting: response.data.data
      const boardData = (response.data as any)?.data || response.data;
      console.log(boardData,'>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
      if (boardData) {
        setBoard(boardData);
      } else {
        console.error('No data in response');
        setError('Board not found');
      }
    } catch (error) {
      console.error('Error loading Festive board:', error);
      setError('Failed to load Festive board');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <Toast ref={toast} />
        <Card>
          <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
            <div className="flex flex-column">
              <Skeleton width="250px" height="32px" className="mb-2" />
              <Skeleton width="180px" height="20px" />
            </div>
            <div className="flex gap-2">
              <Skeleton width="120px" height="36px" borderRadius="8px" />
              <Skeleton width="120px" height="36px" borderRadius="8px" />
              <Skeleton width="120px" height="36px" borderRadius="8px" />
            </div>
          </div>

          <div className="grid">
            <div className="col-12">
              <Skeleton width="200px" height="24px" className="mb-3" />
              <div className="grid">
                <div className="col-12 md:col-6">
                  <div className="mb-3">
                    <Skeleton width="80px" height="16px" className="mb-2" />
                    <Skeleton width="100px" height="24px" />
                  </div>
                </div>
                <div className="col-12 md:col-6">
                  <div className="mb-3">
                    <Skeleton width="100px" height="16px" className="mb-2" />
                    <Skeleton width="100px" height="24px" />
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <Skeleton width="120px" height="16px" className="mb-2" />
                    <Skeleton width="100px" height="24px" />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <Skeleton width="150px" height="24px" className="mb-3" />
              <div className="grid">
                {[1,2,3].map((index) => (
                  <div key={index} className="col-12 md:col-6 lg:col-4">
                    <div className="p-3 border-1 surface-border border-round">
                      <Skeleton width="80px" height="20px" className="mb-2" />
                      <Skeleton width="60px" height="16px" className="mb-2" />
                      <Skeleton width="40px" height="16px" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-12">
              <Skeleton width="120px" height="24px" className="mb-3" />
              <div className="p-3 surface-50 border-round">
                <div className="flex align-items-center gap-3">
                  <div className="flex flex-column">
                    <Skeleton width="150px" height="20px" className="mb-2" />
                    <Skeleton width="200px" height="16px" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="p-4">
        <Toast ref={toast} />
        <Card>
          <div className="text-center p-4">
            <i className="pi pi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
            <h2 className="text-xl font-semibold mb-2">Festive Board Not Found</h2>
            <p className="text-600 mb-4">{error || 'The requested Festive board could not be found.'}</p>
            <Button
              label="Back to Boards"
              icon="pi pi-arrow-left"
              onClick={() => router.push('/admin/festive-board')}
            />
          </div>
        </Card>
      </div>
    );
  }

  if (showMealSelections) {
    return (
      <div className="p-4">
        <Toast ref={toast} />
        <AdminMealSelectionManager 
          festiveBoardId={boardId} 
          onClose={() => setShowMealSelections(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Toast ref={toast} />

      <Card>
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div className="flex flex-column">
            <h2 className="text-2xl font-bold m-0">
              Festive Board Details
            </h2>
            <span className="text-600">Board ID: {board.id}</span>
          </div>
          <div className="flex gap-2">
            <Button
              label="Manage Meal Selections"
              icon="pi pi-users"
              className="p-button-success"
              onClick={() => setShowMealSelections(true)}
            />
            <Button
              label="Edit Board"
              icon="pi pi-pencil"
              className="p-button-primary"
              onClick={() => router.push(`/admin/festive-board/${boardId}/edit`)}
            />
            <Button
              label="Back to Boards"
              icon="pi pi-arrow-left"
              className="p-button-outlined"
              onClick={() => router.push('/admin/festive-board')}
            />
          </div>
        </div>

        <div className="grid">
          <div className="col-12">
            <h3 className="text-lg font-semibold mb-3">Board Information</h3>
            <div className="grid">
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <label className="font-bold text-600">Title</label>
                  <div className="text-lg">{board.title || 'No title'}</div>
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="mb-3">
                  <label className="font-bold text-600">Month/Year</label>
                  <div className="text-lg">
                    {board.month} / {board.year}
                  </div>
                </div>
              </div>
              {board.description && (
                <div className="col-12">
                  <div className="mb-3">
                    <label className="font-bold text-600">Description</label>
                    <div className="text-lg">{board.description}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-12">
            <h3 className="text-lg font-semibold mb-3">
              Meals ({board.meals?.length || 0})
            </h3>
            {board.meals && board.meals.length > 0 ? (
              <div className="grid">
                {board.meals.map((mealItem: any, index: number) => (
                  <div key={mealItem.meal?.id || index} className="col-12 md:col-6 lg:col-4">
                    <div className="p-3 border-1 surface-border border-round">
                      <h4 className="font-semibold m-0">{mealItem.meal?.title || 'Untitled Meal'}</h4>
                      {mealItem.meal?.description && (
                        <p className="text-sm text-600 m-0 mt-2">
                          {mealItem.meal.description}
                        </p>
                      )}
                      {mealItem.meal?.category && (
                        <div className="mt-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 border-round">
                            {mealItem.meal.category.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-600">
                <i className="pi pi-info-circle text-2xl mb-2"></i>
                <p>No meals have been added to this board yet.</p>
              </div>
            )}
          </div>

          <div className="col-12">
            <h3 className="text-lg font-semibold mb-3">Created By</h3>
            <div className="p-3 surface-50 border-round">
              <div className="flex align-items-center gap-3">
                <div className="flex flex-column">
                  <span className="font-semibold">
                    {board.createdBy?.firstName} {board.createdBy?.lastName}
                  </span>
                  <span className="text-sm text-600">{board.createdBy?.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 