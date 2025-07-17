'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Chip } from 'primereact/chip';
import { Badge } from 'primereact/badge';
import { TabView, TabPanel } from 'primereact/tabview';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/store/toast.context';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  eventType: 'PERSONAL' | 'TRESTLE_BOARD';
  location?: string;
  user: {
    id: string;
    name: string;
    email: string;
    membershipNumber: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TrestleBoardSignup {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  user: {
    id: string;
    name: string;
    email: string;
    membershipNumber: string;
    phone?: string;
  };
  admin?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TrestleBoard {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  maxParticipants?: number;
  signups: TrestleBoardSignup[];
}

const eventTypes = [
  { label: 'All Events', value: '' },
  { label: 'Personal Events', value: 'PERSONAL' },
  { label: 'Trestle Boards', value: 'TRESTLE_BOARD' },
];

const signupStatuses = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [trestleBoards, setTrestleBoards] = useState<TrestleBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    eventType: '',
    userId: '',
  });
  const [selectedTrestleBoard, setSelectedTrestleBoard] = useState<TrestleBoard | null>(null);
  const [showSignupDialog, setShowSignupDialog] = useState(false);

  const { showToast } = useToast();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await apiClient.get(`/api/admin/calendar?${params.toString()}`);
      if (response.error) {
        throw new Error(response.error);
      }
      const data = response.data as { events: CalendarEvent[] } | CalendarEvent[];
      setEvents('events' in data ? data.events : data);
    } catch (error) {
      console.error('Error fetching events:', error);
      showToast('error', 'Error', 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrestleBoards = async () => {
    try {
      const response = await apiClient.getTrestleBoards();
      if (response.error) {
        throw new Error(response.error);
      }
      const data = response.data as { trestleBoards: TrestleBoard[] };
      setTrestleBoards(data?.trestleBoards || []);
    } catch (error) {
      console.error('Error fetching trestle boards:', error);
      showToast('error', 'Error', 'Failed to fetch trestle boards');
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchTrestleBoards();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchEvents();
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      eventType: '',
      userId: '',
    });
    fetchEvents();
  };

  const handleViewSignups = (trestleBoard: TrestleBoard) => {
    setSelectedTrestleBoard(trestleBoard);
    setShowSignupDialog(true);
  };

  const handleUpdateSignupStatus = async (signupId: string, status: string) => {
    try {
      const response = await apiClient.put(`/api/admin/trestle-board/${selectedTrestleBoard?.id}/signups`, {
        signupId,
        status,
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      showToast('success', 'Success', 'Signup status updated successfully');
      fetchTrestleBoards();
      if (selectedTrestleBoard) {
        const updatedBoard = trestleBoards.find(b => b.id === selectedTrestleBoard.id);
        if (updatedBoard) {
          setSelectedTrestleBoard(updatedBoard);
        }
      }
    } catch (error) {
      console.error('Error updating signup status:', error);
      showToast('error', 'Error', 'Failed to update signup status');
    }
  };

  const eventTypeTemplate = (rowData: CalendarEvent) => (
    <Chip
      label={rowData.eventType === 'PERSONAL' ? 'Personal' : 'Trestle Board'}
    />
  );

  const dateTemplate = (rowData: CalendarEvent) => (
    <span>{new Date(rowData.date).toLocaleDateString()}</span>
  );

  const userTemplate = (rowData: CalendarEvent) => (
    <div>
      <div className="font-medium">{rowData.user.name}</div>
      <div className="text-sm text-gray-600">{rowData.user.email}</div>
      <div className="text-sm text-gray-500">#{rowData.user.membershipNumber}</div>
    </div>
  );

  const actionTemplate = (rowData: CalendarEvent) => (
    <div className="flex gap-2">
      <Button
        icon="pi pi-eye"
        size="small"
        severity="info"
        tooltip="View Details"
      />
    </div>
  );

  const signupStatusTemplate = (rowData: TrestleBoardSignup) => (
    <Chip
      label={rowData.status}
    />
  );

  const signupUserTemplate = (rowData: TrestleBoardSignup) => (
    <div>
      <div className="font-medium">{rowData.user.name}</div>
      <div className="text-sm text-gray-600">{rowData.user.email}</div>
      <div className="text-sm text-gray-500">#{rowData.user.membershipNumber}</div>
      {rowData.user.phone && (
        <div className="text-sm text-gray-500">📞 {rowData.user.phone}</div>
      )}
    </div>
  );

  const signupActionTemplate = (rowData: TrestleBoardSignup) => (
    <div className="flex gap-2">
      {rowData.status === 'PENDING' && (
        <>
          <Button
            icon="pi pi-check"
            size="small"
            severity="success"
            tooltip="Approve"
            onClick={() => handleUpdateSignupStatus(rowData.id, 'APPROVED')}
          />
          <Button
            icon="pi pi-times"
            size="small"
            severity="danger"
            tooltip="Reject"
            onClick={() => handleUpdateSignupStatus(rowData.id, 'REJECTED')}
          />
        </>
      )}
      {rowData.status === 'APPROVED' && (
        <Button
          icon="pi pi-times"
          size="small"
          severity="danger"
          tooltip="Cancel"
          onClick={() => handleUpdateSignupStatus(rowData.id, 'CANCELLED')}
        />
      )}
    </div>
  );

  const trestleBoardTemplate = (rowData: TrestleBoard) => (
    <div>
      <div className="font-medium">{rowData.title}</div>
      <div className="text-sm text-gray-600">
        {new Date(rowData.date).toLocaleDateString()}
      </div>
      {rowData.location && (
        <div className="text-sm text-gray-500">📍 {rowData.location}</div>
      )}
    </div>
  );

  const participantsTemplate = (rowData: TrestleBoard) => (
    <div className="flex items-center gap-2">
      <Badge value={rowData.signups.length} severity="info" />
      {rowData.maxParticipants && (
        <span className="text-sm text-gray-600">
          / {rowData.maxParticipants}
        </span>
      )}
    </div>
  );

  const trestleBoardActionTemplate = (rowData: TrestleBoard) => (
    <Button
      label="View Signups"
      size="small"
      onClick={() => handleViewSignups(rowData)}
    />
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Calendar Management</h1>
        <p className="text-gray-600">Manage user events and trestle board signups</p>
      </div>

      <TabView>
        <TabPanel header="User Events">
          <Card>
            {/* Filters */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <Calendar
                    value={filters.startDate ? new Date(filters.startDate) : null}
                    onChange={(e) => handleFilterChange('startDate', e.value ? e.value.toISOString().split('T')[0] : '')}
                    dateFormat="yy-mm-dd"
                    placeholder="Start Date"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <Calendar
                    value={filters.endDate ? new Date(filters.endDate) : null}
                    onChange={(e) => handleFilterChange('endDate', e.value ? e.value.toISOString().split('T')[0] : '')}
                    dateFormat="yy-mm-dd"
                    placeholder="End Date"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Event Type</label>
                  <Dropdown
                    value={filters.eventType}
                    onChange={(e) => handleFilterChange('eventType', e.value)}
                    options={eventTypes}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Event Type"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">User ID</label>
                  <InputText
                    value={filters.userId}
                    onChange={(e) => handleFilterChange('userId', e.target.value)}
                    placeholder="User ID"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  label="Apply Filters"
                  onClick={handleApplyFilters}
                />
                <Button
                  label="Clear Filters"
                  severity="secondary"
                  onClick={handleClearFilters}
                />
              </div>
            </div>

            {/* Events Table */}
            <DataTable
              value={events}
              loading={loading}
              paginator
              rows={10}
              rowsPerPageOptions={[10, 20, 50]}
              emptyMessage="No events found"
              className="w-full"
            >
              <Column field="title" header="Title" sortable />
              <Column field="eventType" header="Type" body={eventTypeTemplate} sortable />
              <Column field="date" header="Date" body={dateTemplate} sortable />
              <Column field="location" header="Location" />
              <Column field="user" header="User" body={userTemplate} />
              <Column field="createdAt" header="Created" body={(rowData) => new Date(rowData.createdAt).toLocaleDateString()} sortable />
              <Column header="Actions" body={actionTemplate} />
            </DataTable>
          </Card>
        </TabPanel>

        <TabPanel header="Trestle Board Signups">
          <Card>
            <DataTable
              value={trestleBoards}
              loading={loading}
              paginator
              rows={10}
              rowsPerPageOptions={[10, 20, 50]}
              emptyMessage="No trestle boards found"
              className="w-full"
            >
              <Column field="title" header="Trestle Board" body={trestleBoardTemplate} />
              <Column field="signups" header="Participants" body={participantsTemplate} />
              <Column header="Actions" body={trestleBoardActionTemplate} />
            </DataTable>
          </Card>
        </TabPanel>
      </TabView>

      {/* Signup Management Dialog */}
      <Dialog
        visible={showSignupDialog}
        onHide={() => setShowSignupDialog(false)}
        header={`Signups for ${selectedTrestleBoard?.title}`}
        modal
        className="w-full max-w-4xl"
        style={{ width: '90vw' }}
      >
        {selectedTrestleBoard && (
          <div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold">{selectedTrestleBoard.title}</h3>
              <p className="text-gray-600">{selectedTrestleBoard.description}</p>
              <div className="flex gap-4 mt-2">
                <span className="text-sm">
                  📅 {new Date(selectedTrestleBoard.date).toLocaleDateString()}
                </span>
                {selectedTrestleBoard.location && (
                  <span className="text-sm">📍 {selectedTrestleBoard.location}</span>
                )}
                <span className="text-sm">
                  👥 {selectedTrestleBoard.signups.length}
                  {selectedTrestleBoard.maxParticipants && ` / ${selectedTrestleBoard.maxParticipants}`}
                </span>
              </div>
            </div>

            <DataTable
              value={selectedTrestleBoard.signups}
              paginator
              rows={10}
              rowsPerPageOptions={[10, 20, 50]}
              emptyMessage="No signups found"
              className="w-full"
            >
              <Column field="user" header="User" body={signupUserTemplate} />
              <Column field="status" header="Status" body={signupStatusTemplate} sortable />
              <Column field="createdAt" header="Signed Up" body={(rowData) => new Date(rowData.createdAt).toLocaleDateString()} sortable />
              <Column field="admin" header="Approved By" body={(rowData) => rowData.admin?.name || '-'} />
              <Column header="Actions" body={signupActionTemplate} />
            </DataTable>
          </div>
        )}
      </Dialog>
    </div>
  );
} 