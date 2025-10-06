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

interface FestiveBoardRSVP {
  id: string;
  user: User;
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'MAYBE';
  createdAt: string;
  updatedAt: string;
  signedUpBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface FestiveBoard {
  id: string;
  title: string;
  date?: string;
  isRSVP: boolean;
  maxAttendees?: number;
  description?: string;
}

interface RSVPData {
  festiveBoard: FestiveBoard;
  rsvpCounts: {
    CONFIRMED: number;
    PENDING: number;
    DECLINED: number;
    MAYBE: number;
    TOTAL: number;
  };
  isMaxAttendeesReached: boolean;
  participantsByStatus: {
    CONFIRMED: FestiveBoardRSVP[];
    PENDING: FestiveBoardRSVP[];
    DECLINED: FestiveBoardRSVP[];
    MAYBE: FestiveBoardRSVP[];
  };
  allParticipants: FestiveBoardRSVP[];
}

interface FestiveBoardRSVPManagerProps {
  festiveBoardId: string;
  onClose?: () => void;
}

export default function FestiveBoardRSVPManager({ 
  festiveBoardId, 
  onClose 
}: FestiveBoardRSVPManagerProps) {
  const [rsvpData, setRsvpData] = useState<RSVPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<FestiveBoardRSVP | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'CONFIRMED' | 'PENDING' | 'DECLINED' | 'MAYBE'>('CONFIRMED');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  const rsvpStatusOptions = [
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Maybe', value: 'MAYBE' },
    { label: 'Declined', value: 'DECLINED' },
  ];

  const statusFilterOptions = [
    { label: 'All Status', value: null },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Maybe', value: 'MAYBE' },
    { label: 'Declined', value: 'DECLINED' },
  ];

  useEffect(() => {
    loadRSVPData();
  }, [festiveBoardId]);

  const loadRSVPData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getFestiveBoardRSVPAdmin(festiveBoardId);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setRsvpData(response.data as any);
    } catch (error) {
      console.error('Error loading RSVP data:', error);
      setError('Failed to load RSVP data');
      showToast('error', 'Error', 'Failed to load RSVP data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail });
  };

  const openRSVPDialog = (participant: FestiveBoardRSVP) => {
    setSelectedParticipant(participant);
    setRsvpStatus(participant.status);
    setShowRSVPDialog(true);
  };

  const saveRSVP = async () => {
    if (!selectedParticipant) return;

    setSaveLoading(true);
    try {
      const response = await apiClient.updateFestiveBoardRSVPAdmin(festiveBoardId, {
        userId: selectedParticipant.user.id,
        status: rsvpStatus,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      showToast('success', 'Success', `RSVP status updated for ${selectedParticipant.user.firstName} ${selectedParticipant.user.lastName}`);
      setShowRSVPDialog(false);
      
      // Reload data to get updated information
      await loadRSVPData();
    } catch (error) {
      showToast('error', 'Error', 'Failed to update RSVP status');
    } finally {
      setSaveLoading(false);
    }
  };

  const deleteRSVP = async (participant: FestiveBoardRSVP) => {
    setDeleteLoading(participant.id);
    try {
      const response = await apiClient.removeFestiveBoardRSVPAdmin(festiveBoardId, participant.user.id);

      if (response.error) {
        throw new Error(response.error);
      }

      showToast('success', 'Success', `RSVP removed for ${participant.user.firstName} ${participant.user.lastName}`);
      
      // Reload data to get updated information
      await loadRSVPData();
    } catch (error) {
      showToast('error', 'Error', 'Failed to remove RSVP');
    } finally {
      setDeleteLoading(null);
    }
  };

  const confirmDeleteRSVP = (participant: FestiveBoardRSVP) => {
    confirmDialog({
      message: `Are you sure you want to remove the RSVP for ${participant.user.firstName} ${participant.user.lastName}?`,
      header: 'Confirm Remove RSVP',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteRSVP(participant),
    });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'pi pi-check-circle';
      case 'PENDING': return 'pi pi-clock';
      case 'MAYBE': return 'pi pi-question-circle';
      case 'DECLINED': return 'pi pi-times-circle';
      default: return 'pi pi-circle';
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

  const userBodyTemplate = (rowData: FestiveBoardRSVP) => {
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
            <div className="text-xs text-500">#{rowData.user.membershipNumber}</div>
          )}
        </div>
      </div>
    );
  };

  const statusBodyTemplate = (rowData: FestiveBoardRSVP) => {
    return (
      <Tag 
        value={rowData.status} 
        severity={getStatusSeverity(rowData.status)}
        icon={getStatusIcon(rowData.status)}
      />
    );
  };

  const dateBodyTemplate = (rowData: FestiveBoardRSVP) => {
    return (
      <div>
        <div className="font-medium">RSVP'd: {formatDate(rowData.createdAt)}</div>
        {rowData.updatedAt !== rowData.createdAt && (
          <div className="text-xs text-600">Updated: {formatDate(rowData.updatedAt)}</div>
        )}
      </div>
    );
  };

  const actionsBodyTemplate = (rowData: FestiveBoardRSVP) => {
    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-pencil"
          className="p-button-rounded p-button-text p-button-sm"
          onClick={() => openRSVPDialog(rowData)}
          tooltip="Edit RSVP Status"
        />
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-text p-button-sm p-button-danger"
          onClick={() => confirmDeleteRSVP(rowData)}
          loading={deleteLoading === rowData.id}
          tooltip="Remove RSVP"
        />
      </div>
    );
  };

  const filteredParticipants = rsvpData?.allParticipants.filter(participant => {
    const matchesGlobal = globalFilter === '' || 
      `${participant.user.firstName} ${participant.user.lastName}`.toLowerCase().includes(globalFilter.toLowerCase()) ||
      participant.user.email.toLowerCase().includes(globalFilter.toLowerCase()) ||
      (participant.user.membershipNumber && participant.user.membershipNumber.includes(globalFilter));

    const matchesStatus = statusFilter === null || participant.status === statusFilter;

    return matchesGlobal && matchesStatus;
  }) || [];

  if (loading) {
    return (
      <div className="flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <ProgressSpinner />
      </div>
    );
  }

  if (error || !rsvpData) {
    return (
      <Card>
        <div className="text-center p-4">
          <i className="pi pi-exclamation-triangle text-4xl text-orange-500 mb-3"></i>
          <h3>Error Loading RSVP Data</h3>
          <p className="text-600">{error || 'No data available'}</p>
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
    <div className="p-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      <Card>
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div className="flex flex-column">
            <h2 className="text-2xl font-bold m-0">RSVP Management</h2>
            <span className="text-600">{rsvpData.festiveBoard.title}</span>
          </div>
          <div className="flex gap-2">
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              className="p-button-outlined"
              onClick={loadRSVPData}
            />
            {onClose && (
              <Button
                label="Close"
                icon="pi pi-times"
                className="p-button-outlined"
                onClick={onClose}
              />
            )}
          </div>
        </div>

        {/* RSVP Summary Cards */}
        <div className="grid mb-4">
          <div className="col-12 md:col-3">
            <Card className="text-center">
              <div className="text-2xl font-bold text-green-500">{rsvpData.rsvpCounts.CONFIRMED}</div>
              <div className="text-600">Confirmed</div>
            </Card>
          </div>
          <div className="col-12 md:col-3">
            <Card className="text-center">
              <div className="text-2xl font-bold text-orange-500">{rsvpData.rsvpCounts.PENDING}</div>
              <div className="text-600">Pending</div>
            </Card>
          </div>
          <div className="col-12 md:col-3">
            <Card className="text-center">
              <div className="text-2xl font-bold text-blue-500">{rsvpData.rsvpCounts.MAYBE}</div>
              <div className="text-600">Maybe</div>
            </Card>
          </div>
          <div className="col-12 md:col-3">
            <Card className="text-center">
              <div className="text-2xl font-bold text-red-500">{rsvpData.rsvpCounts.DECLINED}</div>
              <div className="text-600">Declined</div>
            </Card>
          </div>
        </div>

        {/* Max Attendees Warning */}
        {rsvpData.festiveBoard.maxAttendees && (
          <div className={`mb-4 p-3 border-round ${rsvpData.isMaxAttendeesReached ? 'bg-red-100 border-red-300' : 'bg-blue-100 border-blue-300'}`}>
            <div className="flex align-items-center gap-2">
              <i className={`pi ${rsvpData.isMaxAttendeesReached ? 'pi-exclamation-triangle text-red-500' : 'pi-info-circle text-blue-500'}`}></i>
              <span className={rsvpData.isMaxAttendeesReached ? 'text-red-700 font-medium' : 'text-blue-700'}>
                {rsvpData.isMaxAttendeesReached 
                  ? `Maximum attendees reached (${rsvpData.rsvpCounts.CONFIRMED}/${rsvpData.festiveBoard.maxAttendees})`
                  : `Attendees: ${rsvpData.rsvpCounts.CONFIRMED}/${rsvpData.festiveBoard.maxAttendees}`
                }
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-column md:flex-row gap-3 mb-4">
          <div className="flex-1">
            <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search by name, email, or membership number"
                className="w-full"
              />
            </span>
          </div>
          <div className="md:w-12rem">
            <Dropdown
              value={statusFilter}
              options={statusFilterOptions}
              onChange={(e) => setStatusFilter(e.value)}
              placeholder="Filter by status"
              className="w-full"
            />
          </div>
        </div>

        {/* RSVP Participants Table */}
        <DataTable
          value={filteredParticipants}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 20, 50]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
          emptyMessage="No RSVP participants found"
          className="p-datatable-sm"
        >
          <Column field="user" header="Participant" body={userBodyTemplate} sortable sortField="user.firstName" />
          <Column field="status" header="Status" body={statusBodyTemplate} sortable />
          <Column field="createdAt" header="RSVP Date" body={dateBodyTemplate} sortable />
          <Column header="Actions" body={actionsBodyTemplate} style={{ width: '120px' }} />
        </DataTable>
      </Card>

      {/* Edit RSVP Dialog */}
      <Dialog
        visible={showRSVPDialog}
        style={{ width: '450px' }}
        header="Edit RSVP Status"
        modal
        onHide={() => setShowRSVPDialog(false)}
      >
        {selectedParticipant && (
          <div className="p-fluid">
            <div className="mb-3">
              <label className="block text-600 mb-2">Participant</label>
              <div className="flex align-items-center gap-2">
                <Avatar
                  image={selectedParticipant.user.profileImage}
                  icon={!selectedParticipant.user.profileImage ? "pi pi-user" : undefined}
                  size="normal"
                  shape="circle"
                />
                <div>
                  <div className="font-semibold">{`${selectedParticipant.user.firstName} ${selectedParticipant.user.lastName}`}</div>
                  <div className="text-sm text-600">{selectedParticipant.user.email}</div>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="rsvpStatus" className="block text-600 mb-2">RSVP Status</label>
              <Dropdown
                id="rsvpStatus"
                value={rsvpStatus}
                options={rsvpStatusOptions}
                onChange={(e) => setRsvpStatus(e.value)}
                className="w-full"
              />
            </div>

            <div className="flex gap-2 justify-content-end">
              <Button
                label="Cancel"
                icon="pi pi-times"
                className="p-button-text"
                onClick={() => setShowRSVPDialog(false)}
              />
              <Button
                label="Save"
                icon="pi pi-check"
                onClick={saveRSVP}
                loading={saveLoading}
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
