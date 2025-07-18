'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useToast } from '@/store/toast.context';
import { apiClient } from '@/lib/apiClient';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    membershipNumber: string;
}

interface UserCalendar {
    id: string;
    userId: string;
    user: User;
    trestleBoardIds: string[];
    customEventIds: string[];
    createdAt: string;
    updatedAt: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    eventType: 'TRESTLE_BOARD' | 'CUSTOM';
    trestleBoardId?: string;
    customEventId?: string;
    user: {
        id: string;
        name: string;
        email: string;
        membershipNumber: string;
    };
    createdAt: string;
    updatedAt: string;
}

interface CustomEventFormData {
    title: string;
    description: string;
    date: Date | null;
    time: string;
    location: string;
}

export default function UserCalendarsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    
    // State for user calendars
    const [userCalendars, setUserCalendars] = useState<UserCalendar[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State for selected user calendar and events
    const [selectedUserCalendar, setSelectedUserCalendar] = useState<UserCalendar | null>(null);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    
    // State for dialogs
    const [showUserCalendarDialog, setShowUserCalendarDialog] = useState(false);
    const [showCustomEventDialog, setShowCustomEventDialog] = useState(false);
    const [showAddUserDialog, setShowAddUserDialog] = useState(false);
    
    // State for user search
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    
    // State for custom event form
    const [customEventForm, setCustomEventForm] = useState<CustomEventFormData>({
        title: '',
        description: '',
        date: null,
        time: '',
        location: '',
    });
    
    // State for loading states
    const [saveLoading, setSaveLoading] = useState(false);
    const [addUserLoading, setAddUserLoading] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    
    // Filters
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({});
    
    // Load user calendars
    const loadUserCalendars = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await apiClient.getUserCalendars({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue || undefined
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            setUserCalendars(response.data.userCalendars || []);
            setTotalRecords(response.data.pagination?.total || 0);
        } catch (error) {
            console.error('Error loading user calendars:', error);
            setError(error instanceof Error ? error.message : 'Failed to load user calendars');
            showToast('error', 'Error', 'Failed to load user calendars');
        } finally {
            setLoading(false);
        }
    };
    
    // Load calendar events for a specific user
    const loadCalendarEvents = async (userId: string) => {
        try {
            setEventsLoading(true);
            
            const response = await apiClient.getUserCalendarEvents(userId);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            setCalendarEvents(response.data.events || []);
        } catch (error) {
            console.error('Error loading calendar events:', error);
            showToast('error', 'Error', 'Failed to load calendar events');
            setCalendarEvents([]);
        } finally {
            setEventsLoading(false);
        }
    };
    
    // Search users
    const searchUsers = async (query: string) => {
        try {
            setSearchingUsers(true);
            const response = await apiClient.getUsers({ 
                page: 1, 
                limit: 20,
                search: query.trim() || undefined
            });
            
            if (response.data && response.data.users) {
                setFilteredUsers(response.data.users);
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
    
    // Add user calendar
    const handleAddUserCalendar = async () => {
        if (!selectedUser) {
            showToast('error', 'Error', 'Please select a user');
            return;
        }
        
        setAddUserLoading(true);
        try {
            const response = await apiClient.createUserCalendar({
                userId: selectedUser
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            showToast('success', 'Success', 'User calendar created successfully');
            setShowAddUserDialog(false);
            setSelectedUser('');
            setUserSearchQuery('');
            setFilteredUsers([]);
            loadUserCalendars(); // Refresh the list
        } catch (error: any) {
            console.error('Error creating user calendar:', error);
            showToast('error', 'Error', error.message || 'Failed to create user calendar');
        } finally {
            setAddUserLoading(false);
        }
    };
    
    // Add custom event to user calendar
    const handleAddCustomEvent = async () => {
        if (!selectedUserCalendar) {
            showToast('error', 'Error', 'No user calendar selected');
            return;
        }
        
        if (!customEventForm.title.trim() || !customEventForm.date) {
            showToast('error', 'Validation Error', 'Title and date are required');
            return;
        }
        
        setSaveLoading(true);
        try {
            const response = await apiClient.addCalendarEvent({
                userId: selectedUserCalendar.userId,
                title: customEventForm.title,
                description: customEventForm.description,
                startDate: customEventForm.date.toISOString(),
                endDate: undefined,
                startTime: customEventForm.time || undefined,
                endTime: undefined,
                location: customEventForm.location,
                eventType: 'CUSTOM'
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            showToast('success', 'Success', 'Custom event added successfully');
            setShowCustomEventDialog(false);
            setCustomEventForm({
                title: '',
                description: '',
                date: null,
                time: '',
                location: '',
            });
            
            // Refresh events
            await loadCalendarEvents(selectedUserCalendar.userId);
        } catch (error: any) {
            console.error('Error adding custom event:', error);
            showToast('error', 'Error', error.message || 'Failed to add custom event');
        } finally {
            setSaveLoading(false);
        }
    };
    
    // Remove event from user calendar
    const handleRemoveEvent = async (event: CalendarEvent) => {
        if (!selectedUserCalendar) return;
        
        try {
            let response;
            if (event.eventType === 'TRESTLE_BOARD') {
                response = await apiClient.removeTrestleBoardFromCalendar(
                    selectedUserCalendar.userId,
                    event.trestleBoardId!
                );
            } else {
                response = await apiClient.removeCustomEventFromCalendar(
                    selectedUserCalendar.userId,
                    event.customEventId!
                );
            }
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            showToast('success', 'Success', 'Event removed from calendar successfully');
            
            // Refresh events
            await loadCalendarEvents(selectedUserCalendar.userId);
        } catch (error: any) {
            console.error('Error removing event:', error);
            showToast('error', 'Error', error.message || 'Failed to remove event');
        }
    };
    
    // Open user calendar dialog
    const openUserCalendarDialog = async (userCalendar: UserCalendar) => {
        setSelectedUserCalendar(userCalendar);
        setShowUserCalendarDialog(true);
        await loadCalendarEvents(userCalendar.userId);
    };
    
    // Open custom event dialog
    const openCustomEventDialog = () => {
        if (!selectedUserCalendar) {
            showToast('error', 'Error', 'Please select a user calendar first');
            return;
        }
        setShowCustomEventDialog(true);
    };
    
    // Event handlers
    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setGlobalFilterValue(value);
        setCurrentPage(1);
    };
    
    const onPage = (e: any) => {
        setCurrentPage((e.page || 0) + 1);
        setRowsPerPage(e.rows || 10);
    };
    
    // Load data on mount and when pagination changes
    useEffect(() => {
        loadUserCalendars();
    }, [currentPage, rowsPerPage, globalFilterValue]);
    
    // Search users when query changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (userSearchQuery) {
                searchUsers(userSearchQuery);
            } else {
                setFilteredUsers([]);
            }
        }, 300);
        
        return () => clearTimeout(timeoutId);
    }, [userSearchQuery]);
    
    // Action body template for user calendars table
    const actionBodyTemplate = (rowData: UserCalendar) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-calendar"
                    size="small"
                    text
                    severity="info"
                    tooltip="View Calendar"
                    onClick={() => openUserCalendarDialog(rowData)}
                />
            </div>
        );
    };
    
    // Action body template for events table
    const eventActionBodyTemplate = (rowData: CalendarEvent) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Remove from Calendar"
                    onClick={() => handleRemoveEvent(rowData)}
                />
            </div>
        );
    };
    
    // Header for user calendars table
    const header = useMemo(() => (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">User Calendars</h2>
                <span className="text-600">Manage user calendars and events</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search users..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Add User Calendar"
                    icon="pi pi-plus"
                    onClick={() => setShowAddUserDialog(true)}
                    severity="success"
                />
            </div>
        </div>
    ), [globalFilterValue]);
    
    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    {loading ? (
                        <DataTable
                            value={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
                            className="p-datatable-loading"
                        >
                            <Column 
                                field="id" 
                                header="User" 
                                body={() => <Skeleton width="200px" height="16px" />}
                                style={{ minWidth: "200px" }}
                            />
                            <Column 
                                field="id" 
                                header="Email" 
                                body={() => <Skeleton width="250px" height="16px" />}
                                style={{ minWidth: "250px" }}
                            />
                            <Column 
                                field="id" 
                                header="Membership #" 
                                body={() => <Skeleton width="120px" height="16px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                field="id" 
                                header="Events Count" 
                                body={() => <Skeleton width="100px" height="16px" />}
                                style={{ minWidth: "100px" }}
                            />
                            <Column 
                                header="Actions" 
                                body={() => (
                                    <div className="flex gap-2">
                                        <Skeleton width="32px" height="32px" />
                                    </div>
                                )}
                                style={{ width: "100px" }}
                            />
                        </DataTable>
                    ) : (
                        <DataTable
                            value={userCalendars}
                            paginator
                            rows={rowsPerPage}
                            totalRecords={totalRecords}
                            lazy
                            first={(currentPage - 1) * rowsPerPage}
                            onPage={onPage}
                            loading={loading}
                            filters={filters}
                            filterDisplay="menu"
                            globalFilterFields={["user.firstName", "user.lastName", "user.email", "user.membershipNumber"]}
                            header={header}
                            emptyMessage={error ? "Unable to load user calendars. Please check your connection or try again later." : "No user calendars found."}
                            responsiveLayout="scroll"
                            loadingIcon="pi pi-spinner"
                        >
                            <Column 
                                field="user.firstName" 
                                header="User" 
                                body={(rowData) => `${rowData.user.firstName} ${rowData.user.lastName}`}
                                style={{ minWidth: "200px" }} 
                            />
                            <Column field="user.email" header="Email" style={{ minWidth: "250px" }} />
                            <Column field="user.membershipNumber" header="Membership #" style={{ minWidth: "120px" }} />
                            <Column 
                                header="Events Count" 
                                body={(rowData) => rowData.trestleBoardIds.length + rowData.customEventIds.length}
                                style={{ minWidth: "100px" }} 
                            />
                            <Column body={actionBodyTemplate} style={{ width: "100px" }} />
                        </DataTable>
                    )}
                </Card>
            </div>

            {/* User Calendar Events Dialog */}
            <Dialog
                visible={showUserCalendarDialog}
                style={{ width: "90vw", maxWidth: "1200px" }}
                header={`Calendar Events - ${selectedUserCalendar?.user.firstName} ${selectedUserCalendar?.user.lastName}`}
                modal
                className="p-fluid"
                onHide={() => setShowUserCalendarDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label="Add Custom Event" 
                            icon="pi pi-plus" 
                            onClick={openCustomEventDialog}
                            severity="success"
                        />
                        <Button 
                            label="Close" 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowUserCalendarDialog(false)} 
                        />
                    </div>
                }
            >
                <div className="mb-4">
                    {eventsLoading ? (
                        <div className="calendar-events-skeleton">
                            {/* Table Header Skeleton */}
                            <div className="flex border-bottom-1 surface-border p-3 font-semibold">
                                <div className="flex-1" style={{ minWidth: "200px" }}>
                                    <Skeleton height="1rem" width="60%" />
                                </div>
                                <div className="flex-1" style={{ minWidth: "120px" }}>
                                    <Skeleton height="1rem" width="50%" />
                                </div>
                                <div className="flex-1" style={{ minWidth: "100px" }}>
                                    <Skeleton height="1rem" width="40%" />
                                </div>
                                <div className="flex-1" style={{ minWidth: "150px" }}>
                                    <Skeleton height="1rem" width="70%" />
                                </div>
                                <div className="flex-1" style={{ minWidth: "120px" }}>
                                    <Skeleton height="1rem" width="45%" />
                                </div>
                                <div style={{ width: "100px" }}>
                                    <Skeleton height="1rem" width="60%" />
                                </div>
                            </div>
                            
                            {/* Table Rows Skeleton */}
                            {Array.from({ length: 5 }, (_, index) => (
                                <div key={index} className="flex border-bottom-1 surface-border p-3 align-items-center">
                                    <div className="flex-1" style={{ minWidth: "200px" }}>
                                        <Skeleton height="1rem" width="80%" />
                                    </div>
                                    <div className="flex-1" style={{ minWidth: "120px" }}>
                                        <Skeleton height="1rem" width="60%" />
                                    </div>
                                    <div className="flex-1" style={{ minWidth: "100px" }}>
                                        <Skeleton height="1rem" width="40%" />
                                    </div>
                                    <div className="flex-1" style={{ minWidth: "150px" }}>
                                        <Skeleton height="1rem" width="70%" />
                                    </div>
                                    <div className="flex-1" style={{ minWidth: "120px" }}>
                                        <Skeleton height="1.5rem" width="60%" className="border-round" />
                                    </div>
                                    <div style={{ width: "100px" }}>
                                        <div className="flex gap-1">
                                            <Skeleton shape="circle" size="2rem" />
                                            <Skeleton shape="circle" size="2rem" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <DataTable
                            value={calendarEvents}
                            emptyMessage="No events found in this calendar"
                            responsiveLayout="scroll"
                        >
                            <Column field="title" header="Title" style={{ minWidth: "200px" }} />
                            <Column 
                                field="date" 
                                header="Date" 
                                body={(rowData) => new Date(rowData.date).toLocaleDateString()}
                                style={{ minWidth: "120px" }} 
                            />
                            <Column 
                                field="time" 
                                header="Time" 
                                body={(rowData) => rowData.time || '-'}
                                style={{ minWidth: "100px" }} 
                            />
                            <Column field="location" header="Location" style={{ minWidth: "150px" }} />
                            <Column 
                                field="eventType" 
                                header="Type" 
                                body={(rowData) => (
                                    <Tag 
                                        value={rowData.eventType === 'TRESTLE_BOARD' ? 'Trestle Board' : 'Custom'} 
                                        severity={rowData.eventType === 'TRESTLE_BOARD' ? 'info' : 'warning'} 
                                    />
                                )}
                                style={{ minWidth: "120px" }} 
                            />
                            <Column body={eventActionBodyTemplate} style={{ width: "100px" }} />
                        </DataTable>
                    )}
                </div>
            </Dialog>

            {/* Add User Calendar Dialog */}
            <Dialog
                visible={showAddUserDialog}
                style={{ width: "600px" }}
                header="Add User Calendar"
                modal
                className="p-fluid"
                onHide={() => setShowAddUserDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowAddUserDialog(false)} 
                            disabled={addUserLoading} 
                        />
                        <Button
                            label={addUserLoading ? "Adding..." : "Add Calendar"}
                            icon={addUserLoading ? "pi pi-spin pi-spinner" : "pi pi-plus"}
                            onClick={handleAddUserCalendar}
                            disabled={addUserLoading || !selectedUser}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="userSearch" className="font-bold">Search Users</label>
                        <InputText
                            id="userSearch"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            placeholder="Type to search users (e.g., name, email, membership number)..."
                            className="w-full"
                        />
                        {searchingUsers && (
                            <div className="mt-2 text-sm text-gray-500">
                                <i className="pi pi-spin pi-spinner mr-2"></i>
                                Searching...
                            </div>
                        )}
                    </div>
                    <div className="col-12">
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
                                        No users found for "{userSearchQuery}"
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

            {/* Add Custom Event Dialog */}
            <Dialog
                visible={showCustomEventDialog}
                style={{ width: "600px" }}
                header="Add Custom Event"
                modal
                className="p-fluid"
                onHide={() => setShowCustomEventDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowCustomEventDialog(false)} 
                            disabled={saveLoading} 
                        />
                        <Button
                            label={saveLoading ? "Adding..." : "Add Event"}
                            icon={saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
                            onClick={handleAddCustomEvent}
                            disabled={saveLoading}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="title" className="font-bold">Title *</label>
                        <InputText
                            id="title"
                            value={customEventForm.title}
                            onChange={(e) => setCustomEventForm({ ...customEventForm, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="description" className="font-bold">Description</label>
                        <InputTextarea
                            id="description"
                            value={customEventForm.description}
                            onChange={(e) => setCustomEventForm({ ...customEventForm, description: e.target.value })}
                            rows={3}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="date" className="font-bold">Date *</label>
                        <Calendar
                            id="date"
                            value={customEventForm.date}
                            onChange={(e) => setCustomEventForm({ ...customEventForm, date: e.value as Date })}
                            showIcon
                            dateFormat="dd/mm/yy"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="time" className="font-bold">Time</label>
                        <InputText
                            id="time"
                            type="time"
                            value={customEventForm.time}
                            onChange={(e) => setCustomEventForm({ ...customEventForm, time: e.target.value })}
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="location" className="font-bold">Location</label>
                        <InputText
                            id="location"
                            value={customEventForm.location}
                            onChange={(e) => setCustomEventForm({ ...customEventForm, location: e.target.value })}
                        />
                    </div>
                </div>
            </Dialog>

            <ConfirmDialog />
        </div>
    );
} 