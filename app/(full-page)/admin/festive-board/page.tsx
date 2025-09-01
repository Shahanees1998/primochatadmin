'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Skeleton } from 'primereact/skeleton';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';

interface FestiveBoard {
    id: string;
  month: number;
  year: number;
    title: string;
    mainCourse?: string;
    description?: string;
  createdBy: {
    id: string;
        firstName: string;
        lastName: string;
    email: string;
  };
  meals: Array<{
    meal: {
      id: string;
      title: string;
      category: {
        id: string;
        name: string;
      };
    };
  }>;
  _count: {
    userSelections: number;
  };
  createdAt: string;
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

// Removed year filter - showing all boards by default

export default function FestiveBoardPage() {
    const router = useRouter();
  const [boards, setBoards] = useState<FestiveBoard[]>([]);
    const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Removed year filter state
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedBoards, setSelectedBoards] = useState<FestiveBoard[]>([]);
  const toast = React.useRef<Toast>(null);

    useEffect(() => {
    loadBoards();
  }, [searchTerm, currentPage, rowsPerPage]);

  const loadBoards = async () => {
    try {
        setLoading(true);
            const response = await apiClient.getFestiveBoards({
                page: currentPage,
                limit: rowsPerPage,
        search: searchTerm,
            });

            if (response.error) {
        console.error('API Error:', response.error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: response.error
        });
        return;
      }
      console.log('=========================', response)
      if (response.data?.data) {
        setBoards(response.data.data.boards || []);
        setTotalRecords(response.data.data.pagination?.total || 0);
      } else {
        setBoards([]);
        setTotalRecords(0);
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

  const handleDelete = (board: FestiveBoard) => {
    confirmDialog({
      message: `Are you sure you want to delete the Festive board for ${monthOptions.find(m => m.value === board.month)?.label} ${board.year}?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteBoard(board.id)
    });
  };

  const deleteBoard = async (id: string) => {
    try {
      await apiClient.deleteFestiveBoard(id);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Festive board deleted successfully'
      });
      loadBoards();
        } catch (error) {
      console.error('Error deleting Festive board:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete Festive board'
      });
    }
  };

  const confirmBulkDeleteBoards = () => {
    if (selectedBoards.length === 0) return;
    
    confirmDialog({
      message: `Are you sure you want to delete ${selectedBoards.length} selected festive board(s)?`,
      header: 'Bulk Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => bulkDeleteBoards(),
    });
  };

  const bulkDeleteBoards = async () => {
    if (selectedBoards.length === 0) return;
    
    try {
      const deletePromises = selectedBoards.map(board => apiClient.deleteFestiveBoard(board.id));
      await Promise.all(deletePromises);
      
      setSelectedBoards([]);
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: `${selectedBoards.length} festive board(s) deleted successfully`
      });
      loadBoards(); // Reload the list
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete some festive boards'
      });
    }
  };

  const getMonthName = (month: number) => {
    return monthOptions.find(m => m.value === month)?.label || 'Unknown';
  };

  const monthYearBodyTemplate = (rowData: FestiveBoard) => {
    return (
      <div className="flex flex-column">
        <span className="font-bold">{getMonthName(rowData.month)} {rowData.year}</span>
        <span className="text-sm text-600">{rowData.title}</span>
        {rowData.mainCourse && (
          <span className="text-xs text-500">Main: {rowData.mainCourse}</span>
        )}
      </div>
    );
  };

  const mealsBodyTemplate = (rowData: FestiveBoard) => {
    return (
      <div className="flex flex-column gap-1">
        <span className="font-medium">{rowData.meals.length} meals</span>
        <div className="flex flex-wrap gap-1">
          {rowData.meals.slice(0, 3).map((mealItem, index) => (
            <Tag 
              key={index} 
              value={mealItem.meal.title} 
              severity="info" 
              className="text-xs"
            />
          ))}
          {rowData.meals.length > 3 && (
            <Tag 
              value={`+${rowData.meals.length - 3} more`} 
              severity="secondary" 
              className="text-xs"
            />
          )}
        </div>
      </div>
    );
  };

  const createdByBodyTemplate = (rowData: FestiveBoard) => {
    return (
      <div className="flex flex-column">
        <span className="font-medium">
          {rowData.createdBy.firstName} {rowData.createdBy.lastName}
        </span>
        <span className="text-sm text-600">{rowData.createdBy.email}</span>
      </div>
    );
  };

  const actionsBodyTemplate = (rowData: FestiveBoard) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
          className="p-button-sm p-button-outlined"
                    onClick={() => router.push(`/admin/festive-board/${rowData.id}`)}
          tooltip="View Board"
                />
                <Button
                    icon="pi pi-pencil"
          className="p-button-sm p-button-outlined"
          onClick={() => router.push(`/admin/festive-board/${rowData.id}/edit`)}
                    tooltip="Edit Board"
                />
                <Button
                    icon="pi pi-trash"
          className="p-button-sm p-button-outlined p-button-danger"
          onClick={() => handleDelete(rowData)}
                    tooltip="Delete Board"
                />
            </div>
        );
    };

  const header = useMemo(() => (
        <>
            <div className="w-full flex justify-content-end">
                {selectedBoards.length > 0 && (
                    <Button
                        label={`Delete Selected (${selectedBoards.length})`}
                        icon="pi pi-trash"
                        onClick={confirmBulkDeleteBoards}
                        severity="danger"
                        className="p-button-raised mb-4"
                    />
                )}
            </div>
            <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
                <div className="flex flex-column">
                    <h2 className="text-2xl font-bold m-0">Festive Board Management</h2>
        <span className="text-600">Manage monthly meal boards</span>
                </div>
                <div className="flex gap-2">
                    <span className="p-input-icon-left">
                        <i className="pi-search" />
                        <InputText
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search boards..."
                        className="w-full"
                    />
                    </span>

                    <Button
                        label="Create Meal"
                        icon="pi pi-plus"
          onClick={() => router.push('/admin/festive-board/create')}
                        severity="success"
                    />

                </div>
            </div>
        </>
  ), [searchTerm, selectedBoards.length]);

  const skeletonRows = Array.from({ length: 5 }, (_, i) => ({
    id: i.toString(),
    month: 1,
    year: 2025,
    title: 'Loading...',
    createdBy: {
      firstName: '',
      lastName: '',
      email: ''
    },
    meals: [],
    createdAt: new Date().toISOString(),
    _count: { userSelections: 0 }
  }));

  if (loading && boards.length === 0) {
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
              selectionMode="multiple" 
              headerStyle={{ width: '3rem' }}
              style={{ width: '3rem' }}
            />
            <Column 
              field="month" 
              header="Month/Year" 
              body={(rowData) => (
                <div className="flex flex-column">
                  <Skeleton width="120px" height="20px" className="mb-1" />
                  <Skeleton width="80px" height="16px" />
                </div>
              )}
              style={{ minWidth: '200px' }}
            />
            <Column 
              field="meals" 
              header="Meals" 
              body={() => (
                <div className="flex flex-column gap-1">
                  <Skeleton width="60px" height="16px" />
                  <div className="flex gap-1">
                    <Skeleton width="50px" height="20px" />
                    <Skeleton width="60px" height="20px" />
                                            </div>
                                        </div>
              )}
              style={{ minWidth: '250px' }}
            />
            <Column 
              field="createdBy" 
              header="Created By" 
              body={() => (
                <div className="flex flex-column">
                  <Skeleton width="100px" height="16px" className="mb-1" />
                  <Skeleton width="120px" height="14px" />
                                    </div>
              )}
              style={{ minWidth: '200px' }}
            />
            <Column 
              field="createdAt" 
              header="Created At" 
              body={() => <Skeleton width="80px" height="16px" />}
              style={{ minWidth: '120px' }}
            />
            <Column 
              header="Actions" 
              body={() => (
                <div className="flex gap-2">
                  <Skeleton width="32px" height="32px" />
                  <Skeleton width="32px" height="32px" />
                  <Skeleton width="32px" height="32px" />
                            </div>
              )}
              style={{ width: '150px' }}
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
          value={boards}
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
                            header={header}
          emptyMessage="No Festive boards found"
          className="p-datatable-sm"
          selectionMode="multiple"
          selection={selectedBoards}
          onSelectionChange={(e) => setSelectedBoards(e.value as FestiveBoard[])}
        >
          <Column 
            selectionMode="multiple" 
            headerStyle={{ width: '3rem' }}
            style={{ width: '3rem' }}
          />
          <Column 
            field="month" 
            header="Month/Year" 
            body={monthYearBodyTemplate}
            
            style={{ minWidth: '200px' }}
          />
          <Column 
            field="meals" 
            header="Meals" 
            body={mealsBodyTemplate}
            style={{ minWidth: '250px' }}
          />
          <Column 
            field="createdBy" 
            header="Created By" 
            body={createdByBodyTemplate}
            style={{ minWidth: '200px' }}
          />
          <Column 
            field="createdAt" 
            header="Created At" 
            body={(rowData) => new Date(rowData.createdAt).toLocaleDateString()}
            
            style={{ minWidth: '120px' }}
          />
          <Column 
            header="Actions" 
            body={actionsBodyTemplate} 
            style={{ width: '150px' }}
          />
        </DataTable>
      </Card>
        </div>
    );
} 