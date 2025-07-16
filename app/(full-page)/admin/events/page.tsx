"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { useRouter } from "next/navigation";
import { Skeleton } from "primereact/skeleton";
import { apiClient } from "@/lib/apiClient";
import { SortOrderType } from "@/types";

interface Event {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    location?: string;
    category: 'REGULAR_MEETING' | 'DISTRICT' | 'EMERGENT' | 'PRACTICE' | 'CGP' | 'SOCIAL';
    type: 'REGULAR' | 'SOCIAL' | 'DISTRICT' | 'EMERGENT';
    isRSVP: boolean;
    maxAttendees?: number;
    createdAt: string;
    updatedAt: string;
}

interface EventFormData {
    title: string;
    description: string;
    startDate: Date | null;
    endDate: Date | null;
    location: string;
    category: 'REGULAR_MEETING' | 'DISTRICT' | 'EMERGENT' | 'PRACTICE' | 'CGP' | 'SOCIAL';
    type: 'REGULAR' | 'SOCIAL' | 'DISTRICT' | 'EMERGENT';
    isRSVP: boolean;
    maxAttendees: number;
}

export default function EventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        title: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        category: { value: null, matchMode: FilterMatchMode.EQUALS },
        type: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showEventDialog, setShowEventDialog] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [eventForm, setEventForm] = useState<EventFormData>({
        title: "",
        description: "",
        startDate: null,
        endDate: null,
        location: "",
        category: "REGULAR_MEETING",
        type: "REGULAR",
        isRSVP: false,
        maxAttendees: 0,
    });
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<SortOrderType | undefined>(undefined);
    const toast = useRef<Toast>(null);

    const categoryOptions = [
        { label: "Regular Meeting", value: "REGULAR_MEETING" },
        { label: "District", value: "DISTRICT" },
        { label: "Emergent", value: "EMERGENT" },
        { label: "Practice", value: "PRACTICE" },
        { label: "CGP", value: "CGP" },
        { label: "Social", value: "SOCIAL" },
    ];

    const typeOptions = [
        { label: "Regular", value: "REGULAR" },
        { label: "Social", value: "SOCIAL" },
        { label: "District", value: "DISTRICT" },
        { label: "Emergent", value: "EMERGENT" },
    ];

    useEffect(() => {
        loadEvents();
    }, [currentPage, rowsPerPage, globalFilterValue, sortField, sortOrder]);

    const loadEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getEvents({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setEvents(response.data?.events || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            setError("Failed to load events. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        (_filters["global"] as any).value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
        setCurrentPage(1); // Reset to first page when searching
    };

    const onSort = (event: any) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder);
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNewEventDialog = () => {
        setEditingEvent(null);
        setEventForm({
            title: "",
            description: "",
            startDate: null,
            endDate: null,
            location: "",
            category: "REGULAR_MEETING",
            type: "REGULAR",
            isRSVP: false,
            maxAttendees: 0,
        });
        setShowEventDialog(true);
    };

    const openEditEventDialog = (event: Event) => {
        setEditingEvent(event);
        setEventForm({
            title: event.title,
            description: event.description || "",
            startDate: new Date(event.startDate),
            endDate: event.endDate ? new Date(event.endDate) : null,
            location: event.location || "",
            category: event.category,
            type: event.type,
            isRSVP: event.isRSVP,
            maxAttendees: event.maxAttendees || 0,
        });
        setShowEventDialog(true);
    };

    const saveEvent = async () => {
        // Validation
        if (!eventForm.title.trim()) {
            showToast("error", "Validation Error", "Title is required");
            return;
        }

        if (!eventForm.startDate) {
            showToast("error", "Validation Error", "Start date is required");
            return;
        }

        if (eventForm.endDate && eventForm.endDate < eventForm.startDate) {
            showToast("error", "Validation Error", "End date cannot be before start date");
            return;
        }

        setSaveLoading(true);
        try {
            const eventData = {
                ...eventForm,
                startDate: eventForm.startDate.toISOString(),
                endDate: eventForm.endDate?.toISOString(),
            };

            let response: any;
            if (editingEvent) {
                // Update existing event
                response = await apiClient.updateEvent(editingEvent.id, eventData);
            } else {
                // Create new event
                response = await apiClient.createEvent(eventData);
            }

            if (response.error) {
                throw new Error(response.error);
            }

            if (editingEvent) {
                const updatedEvents = events.map(event =>
                    event.id === editingEvent.id ? response.data : event
                );
                setEvents(updatedEvents);
                showToast("success", "Success", "Event updated successfully");
            } else {
                setEvents([response.data, ...events]);
                showToast("success", "Success", "Event created successfully");
            }

            setShowEventDialog(false);
        } catch (error) {
            showToast("error", "Error", error instanceof Error ? error.message : "Failed to save event");
        } finally {
            setSaveLoading(false);
        }
    };

    const confirmDeleteEvent = (event: Event) => {
        confirmDialog({
            message: `Are you sure you want to delete "${event.title}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteEvent(event.id),
        });
    };

    const deleteEvent = async (eventId: string) => {
        try {
            const response = await apiClient.deleteEvent(eventId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            setEvents(events.filter(event => event.id !== eventId));
            showToast("success", "Success", "Event deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete event");
        }
    };

    const getCategorySeverity = (category: string) => {
        switch (category) {
            case "REGULAR_MEETING": return "info";
            case "DISTRICT": return "warning";
            case "EMERGENT": return "danger";
            case "PRACTICE": return "secondary";
            case "CGP": return "success";
            case "SOCIAL": return "success";
            default: return "info";
        }
    };

    const getTypeSeverity = (type: string) => {
        switch (type) {
            case "REGULAR": return "info";
            case "SOCIAL": return "success";
            case "DISTRICT": return "warning";
            case "EMERGENT": return "danger";
            default: return "info";
        }
    };

    const actionBodyTemplate = (rowData: Event) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => router.push(`/admin/events/${rowData.id}`)}
                />
                <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Edit Event"
                    onClick={() => openEditEventDialog(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete Event"
                    onClick={() => confirmDeleteEvent(rowData)}
                />
            </div>
        );
    };

    const header = useMemo(() => (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Event Management</h2>
                <span className="text-600">Create and manage all events</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search events..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Create Event"
                    icon="pi pi-plus"
                    onClick={openNewEventDialog}
                    severity="success"
                />
            </div>
        </div>
    ), [globalFilterValue]);

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    {error && (
                        <div className="p-error p-3 mb-3">{error}</div>
                    )}
                    {loading ? (
                        <DataTable
                            value={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
                            className="p-datatable-sm"
                            header={header}
                        >
                            <Column 
                                field="title" 
                                header="Title" 
                                body={() => (
                                    <div className="flex flex-column gap-1">
                                        <Skeleton width="200px" height="16px" />
                                        <Skeleton width="150px" height="14px" />
                                    </div>
                                )}
                                style={{ minWidth: "200px" }}
                            />
                            <Column 
                                field="startDate" 
                                header="Start Date" 
                                body={() => <Skeleton width="100px" height="16px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                field="location" 
                                header="Location" 
                                body={() => <Skeleton width="150px" height="16px" />}
                                style={{ minWidth: "150px" }}
                            />
                            <Column 
                                field="category" 
                                header="Category" 
                                body={() => <Skeleton width="80px" height="24px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                field="status" 
                                header="Status" 
                                body={() => <Skeleton width="80px" height="24px" />}
                                style={{ minWidth: "100px" }}
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
                                style={{ width: "120px" }}
                            />
                        </DataTable>
                    ) : (
                        <DataTable
                            value={events}
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
                            filters={filters}
                            filterDisplay="menu"
                            globalFilterFields={["title", "description", "location"]}
                            header={header}
                            emptyMessage={error ? "Unable to load events. Please check your connection or try again later." : "No events found."}
                            responsiveLayout="scroll"
                            onSort={onSort}
                            sortField={sortField}
                            sortOrder={sortOrder}
                            loadingIcon="pi pi-spinner"
                        >
                            <Column field="title" header="Title" sortable style={{ minWidth: "200px" }} />
                            <Column field="startDate" header="Start Date" body={(rowData) => (
                                new Date(rowData.startDate).toLocaleDateString()
                            )} sortable style={{ minWidth: "120px" }} />
                            <Column field="location" header="Location" style={{ minWidth: "150px" }} />
                            <Column field="category" header="Category" body={(rowData) => (
                                <Tag value={rowData.category} severity={getCategorySeverity(rowData.category)} />
                            )} sortable style={{ minWidth: "120px" }} />
                            <Column field="type" header="Type" body={(rowData) => (
                                <Tag value={rowData.type} severity={getTypeSeverity(rowData.type)} />
                            )} sortable style={{ minWidth: "120px" }} />
                            <Column field="isRSVP" header="RSVP" body={(rowData) => (
                                <Tag value={rowData.isRSVP ? "Yes" : "No"} severity={rowData.isRSVP ? "success" : "secondary"} />
                            )} style={{ minWidth: "80px" }} />
                            <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                        </DataTable>
                    )}
                </Card>
            </div>

            {/* Event Dialog */}
            <Dialog
                visible={showEventDialog}
                style={{ width: "700px" }}
                header={editingEvent ? "Edit Event" : "Create New Event"}
                modal
                className="p-fluid"
                onHide={() => setShowEventDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowEventDialog(false)} disabled={saveLoading} />
                        <Button
                            label={saveLoading ? "Saving..." : "Save"}
                            icon={saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
                            onClick={saveEvent}
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
                            value={eventForm.title}
                            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="description" className="font-bold">Description</label>
                        <InputTextarea
                            id="description"
                            value={eventForm.description}
                            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                            rows={3}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="startDate" className="font-bold">Start Date *</label>
                        <Calendar
                            id="startDate"
                            value={eventForm.startDate}
                            onChange={(e) => setEventForm({ ...eventForm, startDate: e.value as Date })}
                            showIcon
                            showTime
                            dateFormat="dd/mm/yy"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="endDate" className="font-bold">End Date</label>
                        <Calendar
                            id="endDate"
                            value={eventForm.endDate}
                            onChange={(e) => setEventForm({ ...eventForm, endDate: e.value as Date })}
                            showIcon
                            showTime
                            dateFormat="dd/mm/yy"
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="location" className="font-bold">Location</label>
                        <InputText
                            id="location"
                            value={eventForm.location}
                            onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="category" className="font-bold">Category *</label>
                        <Dropdown
                            id="category"
                            value={eventForm.category}
                            options={categoryOptions}
                            onChange={(e) => setEventForm({ ...eventForm, category: e.value })}
                            placeholder="Select Category"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="type" className="font-bold">Type *</label>
                        <Dropdown
                            id="type"
                            value={eventForm.type}
                            options={typeOptions}
                            onChange={(e) => setEventForm({ ...eventForm, type: e.value })}
                            placeholder="Select Type"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="maxAttendees" className="font-bold">Max Attendees</label>
                        <InputText
                            id="maxAttendees"
                            type="number"
                            value={eventForm.maxAttendees?.toString() || ''}
                            onChange={(e) => setEventForm({ ...eventForm, maxAttendees: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="font-bold">RSVP Required</label>
                        <div className="flex align-items-center mt-2">
                            <input
                                type="checkbox"
                                id="isRSVP"
                                checked={eventForm.isRSVP}
                                onChange={(e) => setEventForm({ ...eventForm, isRSVP: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="isRSVP">Enable RSVP for this event</label>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 