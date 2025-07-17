'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Chip } from 'primereact/chip';
import { Badge } from 'primereact/badge';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Skeleton } from 'primereact/skeleton';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/store/toast.context';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  membershipNumber: string;
  phone?: string;
}

interface Meal {
  id: string;
  title: string;
  description?: string;
  price?: number;
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
  selections: {
    id: string;
    userId: string;
    user: User;
    createdAt: string;
  }[];
  selectionCount: number;
}

interface FestiveBoard {
  id: string;
  title: string;
  description?: string;
  month: string;
  year: number;
}

interface AdminMealSelectionManagerProps {
  festiveBoardId: string;
  onClose?: () => void;
}

export default function AdminMealSelectionManager({ 
  festiveBoardId, 
  onClose 
}: AdminMealSelectionManagerProps) {
  const [festiveBoard, setFestiveBoard] = useState<FestiveBoard | null>(null);
  const [meals, setMeals] = useState<MealSelection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMeal, setSelectedMeal] = useState<MealSelection | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showUnassignedUsers, setShowUnassignedUsers] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchSelections();
    fetchUsers();
  }, [festiveBoardId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const fetchSelections = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/admin/festive-board/${festiveBoardId}/selections`);
      if (response.error) {
        throw new Error(response.error);
      }
      const data = response.data as { festiveBoard: FestiveBoard; meals: MealSelection[] };
      setFestiveBoard(data.festiveBoard);
      setMeals(data.meals);
    } catch (error) {
      console.error('Error fetching selections:', error);
      showToast('error', 'Error', 'Failed to load meal selections');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.getUsers({ page: 1, limit: 1000 });
      if (response.data && response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const searchUsers = async (query: string) => {
    try {
      setSearchingUsers(true);
      
      // Always search from server when there's a query
      const response = await apiClient.getUsers({ 
        page: 1, 
        limit: 20,
        search: query.trim() || undefined
      });
      
      if (response.data && response.data.users) {
        // Filter out users who already have a meal selection for this board
        const assignedUserIds = new Set();
        meals.forEach(meal => {
          meal.selections.forEach(selection => {
            assignedUserIds.add(selection.userId);
          });
        });

        const availableUsers = response.data.users.filter((user: User) => !assignedUserIds.has(user.id));
        setFilteredUsers(availableUsers);
      } else {
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      showToast('error', 'Error', 'Failed to search users');
      setFilteredUsers([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const debouncedSearch = (query: string) => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // If query is empty, show empty state immediately
    if (!query.trim()) {
      setFilteredUsers([]);
      return;
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      searchUsers(query);
    }, 500); // 500ms debounce for better performance

    setSearchTimeout(timeout);
  };



  const handleAddUser = async (meal: MealSelection) => {
    setSelectedMeal(meal);
    setSelectedUser('');
    setUserSearchQuery('');
    setFilteredUsers([]);
    setShowAddUserDialog(true);
  };

  const handleAddUserSelection = async () => {
    if (!selectedUser || !selectedMeal) return;

    try {
      setSaving(true);
      const response = await apiClient.post(`/admin/festive-board/${festiveBoardId}/selections`, {
        userId: selectedUser,
        mealId: selectedMeal.mealId,
        action: 'select',
      });

      if (response.error) {
        throw new Error(response.error);
      }

      showToast('success', 'Success', 'User meal selection added');
      setSelectedUser('');
      setUserSearchQuery('');
      setFilteredUsers([]);
      setShowAddUserDialog(false); // Close the add user dialog
      fetchSelections(); // Refresh the data
    } catch (error) {
      console.error('Error adding user selection:', error);
      showToast('error', 'Error', 'Failed to add user selection');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUserSelection = async (userId: string, mealId: string) => {
    try {
      const response = await apiClient.post(`/admin/festive-board/${festiveBoardId}/selections`, {
        userId,
        mealId,
        action: 'deselect',
      });

      if (response.error) {
        throw new Error(response.error);
      }

      showToast('success', 'Success', 'User meal selection removed');
      fetchSelections();
    } catch (error) {
      console.error('Error removing user selection:', error);
      showToast('error', 'Error', 'Failed to remove user selection');
    }
  };

  const mealTemplate = (rowData: MealSelection) => (
    <div>
      <h4 className="font-medium">{rowData.meal.title}</h4>
      <Chip label={rowData.meal.category.name} />
      {rowData.meal.description && (
        <p className="text-sm text-gray-600 mt-1">{rowData.meal.description}</p>
      )}
      {rowData.meal.price && (
        <p className="text-sm font-medium text-green-600 mt-1">
          ${rowData.meal.price.toFixed(2)}
        </p>
      )}
    </div>
  );

  const selectionCountTemplate = (rowData: MealSelection) => (
    <div className="flex items-center justify-end">
      {rowData.selectionCount > 0 ? (
        <div className="text-right">
          <div className="text-sm text-gray-600">
            {rowData.selections[0]?.user.firstName} {rowData.selections[0]?.user.lastName}
          </div>
          <div className="text-xs text-gray-500">
            #{rowData.selections[0]?.user.membershipNumber}
          </div>
        </div>
      ) : (
        <span className="text-gray-400 text-sm">-</span>
      )}
    </div>
  );

  const actionsTemplate = (rowData: MealSelection) => (
    <div className="flex items-center gap-2 justify-end">
      {rowData.selectionCount > 0 ? (
        <Button
          label="Remove User"
          size="small"
          severity="danger"
          icon="pi pi-trash"
          onClick={() => {
            const firstSelection = rowData.selections[0];
            if (firstSelection) {
              handleRemoveUserSelection(firstSelection.userId, rowData.mealId);
            }
          }}
        />
      ) : (
        <Button
          label="Add User"
          size="small"
          severity="success"
          icon="pi pi-plus"
          onClick={() => handleAddUser(rowData)}
        />
      )}
    </div>
  );

  const userTemplate = (rowData: any) => (
    <div>
      <div className="font-medium">{rowData.user.firstName} {rowData.user.lastName}</div>
      <div className="text-sm text-gray-600">{rowData.user.email}</div>
      <div className="text-sm text-gray-500">#{rowData.user.membershipNumber}</div>
      {rowData.user.phone && (
        <div className="text-sm text-gray-500">📞 {rowData.user.phone}</div>
      )}
    </div>
  );

  const userActionTemplate = (rowData: any) => (
    <Button
      icon="pi pi-trash"
      size="small"
      severity="danger"
      tooltip="Remove Selection"
      onClick={() => handleRemoveUserSelection(rowData.userId, selectedMeal?.mealId || '')}
    />
  );

  // Get users who haven't selected any meal yet
  const getUnassignedUsers = () => {
    const assignedUserIds = new Set();
    meals.forEach(meal => {
      meal.selections.forEach(selection => {
        assignedUserIds.add(selection.userId);
      });
    });
    
    return users.filter(user => !assignedUserIds.has(user.id));
  };

  const unassignedUsers = getUnassignedUsers();

  // Skeleton loader for the main content
  if (loading) {
    return (
      <Card className="w-full">
        <div className="space-y-6">
          {/* Festive Board Header skeleton */}
          <div className="space-y-2 mb-6">
            <Skeleton height="2rem" width="60%" />
            <Skeleton height="1rem" width="40%" />
            <Skeleton height="1rem" width="30%" />
          </div>
          
          {/* Page Title skeleton */}
          <div className="space-y-2 mb-4">
            <Skeleton height="1.5rem" width="50%" />
            <Skeleton height="1rem" width="70%" />
          </div>
          
          {/* Summary Section skeleton */}
          <div className="p-4 bg-blue-50 border-1 border-blue-200 border-round mb-4">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton height="1.5rem" width="40%" />
                <Skeleton height="1rem" width="80%" />
              </div>
              <Skeleton height="2.5rem" width="220px" />
            </div>
          </div>
          
          {/* DataTable skeleton */}
          <div className="border-1 surface-border border-round">
            {/* Table header skeleton */}
            <div className="p-4 border-bottom-1 surface-border">
              <div className="grid grid-cols-3 gap-4">
                <Skeleton height="1.5rem" width="100%" />
                <Skeleton height="1.5rem" width="100%" />
                <Skeleton height="1.5rem" width="100%" />
              </div>
            </div>
            
            {/* Table rows skeleton */}
            <div>
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="p-4 border-bottom-1 surface-border last:border-bottom-none">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Meal column */}
                    <div className="space-y-2">
                      <Skeleton height="1.2rem" width="80%" />
                      <Skeleton height="1.5rem" width="60px" />
                      <Skeleton height="1rem" width="50%" />
                    </div>
                    
                    {/* Selections column */}
                    <div className="flex justify-center">
                      <div className="text-center space-y-1">
                        <Skeleton height="1rem" width="80px" />
                        <Skeleton height="0.8rem" width="60px" />
                      </div>
                    </div>
                    
                    {/* Actions column */}
                    <div className="flex justify-end">
                      <Skeleton height="2rem" width="100px" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      <div className="mb-4">
        <h3 className="text-lg font-semibold">Meal Selections Overview</h3>
        <p className="text-sm text-gray-600">Manage user meal selections for this festive board</p>
      </div>

      {/* Summary Section */}
      <div className="mb-4 p-4 bg-blue-50 border-1 border-blue-200 border-round">
        <div style={{justifyContent: 'space-between'}} className="flex  items-center">
          <div>
            <h4 className="font-semibold text-blue-800">Selection Summary</h4>
            <p className="text-sm text-blue-600">
              Total Users: {users.length} | Assigned: {users.length - unassignedUsers.length} | Unassigned: {unassignedUsers.length}
            </p>
          </div>
          <Button
            label={`View Unassigned Users (${unassignedUsers.length})`}
            icon="pi pi-users"
            size="small"
            severity="info"
            onClick={() => setShowUnassignedUsers(true)}
            disabled={unassignedUsers.length === 0}
          />
        </div>
      </div>

      <DataTable
        value={meals}
        emptyMessage="No meals found"
        className="w-full"
      >
        <Column field="meal" header="Meal" body={mealTemplate} />
        <Column field="selectionCount" header="Selections" body={selectionCountTemplate} />
        <Column field="" header="Actions" body={actionsTemplate} style={{ textAlign: 'right', width: '120px' }} headerStyle={{ textAlign: 'right' }} />
      </DataTable>



      {/* Unassigned Users Dialog */}
      <Dialog
        visible={showUnassignedUsers}
        onHide={() => setShowUnassignedUsers(false)}
        header="Unassigned Users"
        modal
        className="w-full max-w-4xl"
        style={{ width: '80vw', maxWidth: '1200px' }}
      >
        <div>
          <div className="mb-4 p-4 bg-yellow-50 border-1 border-yellow-200 border-round">
            <h4 className="font-semibold text-yellow-800">Users Without Meal Selections</h4>
            <p className="text-sm text-yellow-600">
              These users haven't selected any meal for this festive board yet.
            </p>
          </div>

          <DataTable
            value={unassignedUsers}
            emptyMessage="All users have been assigned meals"
            className="w-full"
          >
            <Column 
              field="firstName" 
              header="Name" 
              body={(rowData) => (
                <div>
                  <div className="font-medium">{rowData.firstName} {rowData.lastName}</div>
                  <div className="text-sm text-gray-600">{rowData.email}</div>
                  <div className="text-sm text-gray-500">#{rowData.membershipNumber}</div>
                </div>
              )}
            />
            <Column 
              field="phone" 
              header="Phone" 
              body={(rowData) => rowData.phone || 'N/A'}
            />
            <Column 
              header="Actions" 
              body={(rowData) => (
                <Button
                  label="Assign Meal"
                  icon="pi pi-plus"
                  size="small"
                  severity="success"
                  onClick={() => {
                    setShowUnassignedUsers(false);
                    // You can add logic here to quickly assign a meal
                    showToast('info', 'Info', 'Click on a meal and use "Add User Selection" to assign this user');
                  }}
                />
              )}
            />
          </DataTable>
        </div>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog
        visible={showAddUserDialog}
        onHide={() => setShowAddUserDialog(false)}
        header={`Add User to: ${selectedMeal?.meal.title}`}
        modal
        style={{ width: '40vw', maxWidth: '500px' }}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button label="Cancel" severity="secondary" onClick={() => setShowAddUserDialog(false)} />
            <Button
              label="Add User"
              onClick={handleAddUserSelection}
              disabled={!selectedUser || saving}
              loading={saving}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3">
          <div>
            <label className="font-bold mb-2 block">Search Users</label>
            <InputText
              value={userSearchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const query = e.target.value;
                setUserSearchQuery(query);
                debouncedSearch(query);
              }}
              placeholder="Type to search users (e.g., anees)..."
              className="w-full"
            />
            {searchingUsers && (
              <div className="mt-2 text-sm text-gray-500">
                <i className="pi pi-spin pi-spinner mr-2"></i>
                Searching...
              </div>
            )}
          </div>

          <div>
            <label className="font-bold mb-2 block">Select User</label>
            <div className="border-1 surface-border border-round max-h-40 overflow-y-auto">
              {searchingUsers ? (
                <div className="p-3 text-center text-600">
                  <i className="pi pi-spin pi-spinner mr-2"></i>
                  Searching users...
                </div>
              ) : userSearchQuery ? (
                filteredUsers.length === 0 ? (
                  <div className="p-3 text-center text-600">
                    No available users found for "{userSearchQuery}"
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 cursor-pointer hover:surface-100 border-bottom-1 surface-border last:border-bottom-none ${
                        selectedUser === user.id ? 'surface-100' : ''
                      }`}
                      onClick={() => {
                        setSelectedUser(user.id);
                        setUserSearchQuery(`${user.firstName} ${user.lastName} (${user.email})`);
                      }}
                    >
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="text-sm text-gray-500">#{user.membershipNumber}</div>
                    </div>
                  ))
                )
              ) : (
                <div className="p-3 text-center text-600">
                  Start typing to search users (e.g., name, email, or membership number)
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>

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