'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { apiClient } from '@/lib/apiClient';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  membershipNumber?: string;
  profileImage?: string;
  phone?: string;
}

interface TrestleBoardRSVP {
  id: string;
  user: User;
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'MAYBE';
  createdAt: string;
  signedUpBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface TrestleBoard {
  id: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  category: string;
  isRSVP: boolean;
  maxAttendees?: number;
  description?: string;
}

interface RSVPData {
  trestleBoard: TrestleBoard;
  rsvpCounts: {
    CONFIRMED: number;
    PENDING: number;
    DECLINED: number;
    MAYBE: number;
    TOTAL: number;
  };
  isMaxAttendeesReached: boolean;
  participantsByStatus: {
    CONFIRMED: TrestleBoardRSVP[];
    PENDING: TrestleBoardRSVP[];
    DECLINED: TrestleBoardRSVP[];
    MAYBE: TrestleBoardRSVP[];
  };
  allParticipants: TrestleBoardRSVP[];
}

interface TrestleBoardRSVPManagerProps {
  trestleBoardId: string;
  onClose?: () => void;
}

export default function TrestleBoardRSVPManager({ 
  trestleBoardId, 
  onClose 
}: TrestleBoardRSVPManagerProps) {
  const [rsvpData, setRsvpData] = useState<RSVPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedRSVP, setSelectedRSVP] = useState<TrestleBoardRSVP | null>(null);
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'CONFIRMED' | 'PENDING' | 'DECLINED' | 'MAYBE'>('CONFIRMED');
  const [globalFilter, setGlobalFilter] = useState('');
  const toast = useRef<Toast>(null);

  const statusOptions = [
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Maybe', value: 'MAYBE' },
    { label: 'Declined', value: 'DECLINED' },
    { label: 'Pending', value: 'PENDING' },
  ];

  useEffect(() => {
    loadRSVPData();
  }, [trestleBoardId]);

  const loadRSVPData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/admin/trestle-board/${trestleBoardId}/rsvp`);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setRsvpData(response.data as RSVPData);
    } catch (error) {
      console.error('Error loading RSVP data:', error);
      setError('Failed to load RSVP data');
      showToast('error', 'Error', 'Failed to load RSVP data');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setUsers([]);
      return;
    }

    try {
      setSearchingUsers(true);
      const response = await apiClient.getUsers({ search: query, limit: 10 });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setUsers((response.data as any)?.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      showToast('error', 'Error', 'Failed to search users');
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers(userSearch);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearch]);

  const showToast = (severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail });
  };

  const handleAddRSVP = async () => {
    if (!selectedUser) {
      showToast('warn', 'Warning', 'Please select a user');
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post(`/admin/trestle-board/${trestleBoardId}/rsvp`, {
        userId: selectedUser.id,
        status: selectedStatus,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      showToast('success', 'Success', 'RSVP added successfully!');
      setShowAddDialog(false);
      setSelectedUser(null);
      setUserSearch('');
      
      // Reload data
      await loadRSVPData();
    } catch (error: any) {
      console.error('Error adding RSVP:', error);
      showToast('error', 'Error', error.message || 'Failed to add RSVP');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRSVP = async () => {
    if (!selectedRSVP) return;

    setSaving(true);
    try {
      const response = await apiClient.post(`/admin/trestle-board/${trestleBoardId}/rsvp`, {
        userId: selectedRSVP.user.id,
        status: selectedStatus,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      showToast('success', 'Success', 'RSVP updated successfully!');
      setShowEditDialog(false);
      setSelectedRSVP(null);
      
      // Reload data
      await loadRSVPData();
    } catch (error: any) {
      console.error('Error updating RSVP:', error);
      showToast('error', 'Error', error.message || 'Failed to update RSVP');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRSVP = (rsvp: TrestleBoardRSVP) => {
    confirmDialog({
      message: `Are you sure you want to remove ${rsvp.user.firstName} ${rsvp.user.lastName}'s RSVP?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          const response = await apiClient.delete(`/admin/trestle-board/${trestleBoardId}/rsvp?userId=${rsvp.user.id}`);

          if (response.error) {
            throw new Error(response.error);
          }

          showToast('success', 'Success', 'RSVP removed successfully!');
          
          // Reload data
          await loadRSVPData();
        } catch (error: any) {
          console.error('Error deleting RSVP:', error);
          showToast('error', 'Error', error.message || 'Failed to remove RSVP');
        }
      },
    });
  };

  const openEditDialog = (rsvp: TrestleBoardRSVP) => {
    setSelectedRSVP(rsvp);
    setSelectedStatus(rsvp.status);
    setShowEditDialog(true);
  };

  const openAddDialog = () => {
    setSelectedUser(null);
    setUserSearch('');
    setSelectedStatus('CONFIRMED');
    setShowAddDialog(true);
  };

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'success';
      case 'PENDING': return 'warning';
      case 'MAYBE': return 'info';
      case 'DECLINED': return 'danger';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const userBodyTemplate = (rowData: TrestleBoardRSVP) => {
    return (
      <div className="flex align-items-center gap-2">
        <Avatar
          image={rowData.user.profileImage}
          icon={!rowData.user.profileImage ? "pi pi-user" : undefined}
          size="normal"
          shape="circle"
        />
        <div>
          <div className="font-semibold">{`${rowData.user.firstName} ${rowData.user.lastName}`}</div>
          <div className="text-sm text-600">{rowData.user.email}</div>
          {rowData.user.membershipNumber && (
            <div className="text-sm text-500">#{rowData.user.membershipNumber}</div>
          )}
        </div>
      </div>
    );
  };

  const statusBodyTemplate = (rowData: TrestleBoardRSVP) => {
    return (
      <Tag 
        value={rowData.status} 
        severity={getStatusSeverity(rowData.status)} 
      />
    );
  };

  const signedUpByTemplate = (rowData: TrestleBoardRSVP) => {
    if (!rowData.signedUpBy) {
      return <span className="text-600">Self</span>;
    }
    return (
      <span>{rowData.signedUpBy.firstName} {rowData.signedUpBy.lastName}</span>
    );
  };

  const actionBodyTemplate = (rowData: TrestleBoardRSVP) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-pencil"
          size="small"
          text
          severity="info"
          tooltip="Edit RSVP"
          onClick={() => openEditDialog(rowData)}
        />
        <Button
          icon="pi pi-trash"
          size="small"
          text
          severity="danger"
          tooltip="Remove RSVP"
          onClick={() => handleDeleteRSVP(rowData)}
        />
      </div>
    );
  };

  const header = (
    <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
      <h4 className="m-0">RSVP Participants</h4>
      <div className="flex gap-2">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search participants..."
          />
        </span>
        <Button
          label="Add RSVP"
          icon="pi pi-plus"
          onClick={openAddDialog}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <div className="flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <ProgressSpinner />
        </div>
      </Card>
    );
  }

  if (error || !rsvpData) {
    return (
      <Card>
        <div className="text-center p-4">
          <i className="pi pi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
          <p className="text-lg">{error || 'Failed to load RSVP information'}</p>
          <Button 
            label="Retry" 
            icon="pi pi-refresh" 
            onClick={loadRSVPData}
            className="mt-3"
          />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-3">
        <div className="grid">
          {/* Statistics */}
          <div className="col-12 mb-3">
            <h3 className="mb-3">RSVP Statistics</h3>
            <div className="grid">
              <div className="col-6 md:col-3">
                <div className="text-center p-3 border-round" style={{ backgroundColor: 'var(--green-50)' }}>
                  <Badge value={rsvpData.rsvpCounts.CONFIRMED} severity="success" size="xlarge"></Badge>
                  <p className="text-600 text-sm mt-2 mb-0">Confirmed</p>
                </div>
              </div>
              <div className="col-6 md:col-3">
                <div className="text-center p-3 border-round" style={{ backgroundColor: 'var(--blue-50)' }}>
                  <Badge value={rsvpData.rsvpCounts.MAYBE} severity="info" size="xlarge"></Badge>
                  <p className="text-600 text-sm mt-2 mb-0">Maybe</p>
                </div>
              </div>
              <div className="col-6 md:col-3">
                <div className="text-center p-3 border-round" style={{ backgroundColor: 'var(--red-50)' }}>
                  <Badge value={rsvpData.rsvpCounts.DECLINED} severity="danger" size="xlarge"></Badge>
                  <p className="text-600 text-sm mt-2 mb-0">Declined</p>
                </div>
              </div>
              <div className="col-6 md:col-3">
                <div className="text-center p-3 border-round" style={{ backgroundColor: 'var(--yellow-50)' }}>
                  <Badge value={rsvpData.rsvpCounts.PENDING} severity="warning" size="xlarge"></Badge>
                  <p className="text-600 text-sm mt-2 mb-0">Pending</p>
                </div>
              </div>
            </div>
            
            {rsvpData.trestleBoard.maxAttendees && (
              <div className="mt-3 p-3 border-round" style={{ backgroundColor: 'var(--surface-50)' }}>
                <div className="flex align-items-center justify-content-between">
                  <span className="font-semibold">
                    <i className="pi pi-users mr-2"></i>
                    Max Attendees: {rsvpData.trestleBoard.maxAttendees}
                  </span>
                  <span className="font-semibold">
                    Available Spots: {rsvpData.trestleBoard.maxAttendees - rsvpData.rsvpCounts.CONFIRMED}
                  </span>
                  {rsvpData.isMaxAttendeesReached && (
                    <Tag value="Event Full" severity="danger" icon="pi pi-exclamation-circle" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Participants Table */}
          <div className="col-12">
            <DataTable
              value={rsvpData.allParticipants}
              paginator
              rows={10}
              rowsPerPageOptions={[5, 10, 25, 50]}
              dataKey="id"
              globalFilter={globalFilter}
              header={header}
              emptyMessage="No RSVP participants found."
              responsiveLayout="scroll"
            >
              <Column 
                field="user" 
                header="User" 
                body={userBodyTemplate}
                sortable
                style={{ minWidth: '250px' }}
              />
              <Column 
                field="status" 
                header="Status" 
                body={statusBodyTemplate}
                sortable
                style={{ minWidth: '120px' }}
              />
              <Column 
                field="signedUpBy" 
                header="Added By" 
                body={signedUpByTemplate}
                sortable
                style={{ minWidth: '150px' }}
              />
              <Column 
                field="createdAt" 
                header="Response Date" 
                body={(rowData) => formatDate(rowData.createdAt)}
                sortable
                style={{ minWidth: '180px' }}
              />
              <Column 
                body={actionBodyTemplate}
                exportable={false}
                style={{ minWidth: '120px', width: '120px' }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      {/* Add RSVP Dialog */}
      <Dialog
        visible={showAddDialog}
        style={{ width: '500px' }}
        header="Add RSVP"
        modal
        onHide={() => setShowAddDialog(false)}
      >
        <div className="p-fluid">
          <div className="field">
            <label htmlFor="user-search" className="font-bold">Search User</label>
            <InputText
              id="user-search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Type to search users..."
            />
            {searchingUsers && <small>Searching...</small>}
            {users.length > 0 && (
              <div className="mt-2 border-1 surface-border border-round p-2" style={{ maxHeight: '200px', overflow: 'auto' }}>
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-2 cursor-pointer border-round hover:surface-hover ${selectedUser?.id === user.id ? 'surface-100' : ''}`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="font-semibold">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-600">{user.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedUser && (
            <>
              <div className="field">
                <label className="font-bold">Selected User</label>
                <div className="p-3 surface-100 border-round">
                  <div className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</div>
                  <div className="text-sm text-600">{selectedUser.email}</div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="add-status" className="font-bold">RSVP Status</label>
                <Dropdown
                  id="add-status"
                  value={selectedStatus}
                  options={statusOptions}
                  onChange={(e) => setSelectedStatus(e.value)}
                  placeholder="Select status"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-content-end mt-3">
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            text 
            onClick={() => setShowAddDialog(false)}
            disabled={saving}
          />
          <Button
            label={saving ? "Adding..." : "Add RSVP"}
            icon={saving ? "pi pi-spin pi-spinner" : "pi pi-check"}
            onClick={handleAddRSVP}
            disabled={saving || !selectedUser}
          />
        </div>
      </Dialog>

      {/* Edit RSVP Dialog */}
      <Dialog
        visible={showEditDialog}
        style={{ width: '450px' }}
        header="Edit RSVP"
        modal
        onHide={() => setShowEditDialog(false)}
      >
        {selectedRSVP && (
          <div className="p-fluid">
            <div className="field">
              <label className="font-bold">User</label>
              <div className="p-3 surface-100 border-round">
                <div className="font-semibold">
                  {selectedRSVP.user.firstName} {selectedRSVP.user.lastName}
                </div>
                <div className="text-sm text-600">{selectedRSVP.user.email}</div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="edit-status" className="font-bold">RSVP Status</label>
              <Dropdown
                id="edit-status"
                value={selectedStatus}
                options={statusOptions}
                onChange={(e) => setSelectedStatus(e.value)}
                placeholder="Select status"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-content-end mt-3">
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            text 
            onClick={() => setShowEditDialog(false)}
            disabled={saving}
          />
          <Button
            label={saving ? "Saving..." : "Update RSVP"}
            icon={saving ? "pi pi-spin pi-spinner" : "pi pi-check"}
            onClick={handleUpdateRSVP}
            disabled={saving}
          />
        </div>
      </Dialog>

      <ConfirmDialog />
      <Toast ref={toast} />
    </>
  );
}

