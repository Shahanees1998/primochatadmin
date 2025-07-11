"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Avatar } from "primereact/avatar";
import { Toast } from "primereact/toast";
import { Skeleton } from "primereact/skeleton";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { Calendar } from "primereact/calendar";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { apiClient } from "@/lib/apiClient";

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
    members?: EventMember[];
    _count?: {
        members: number;
    };
}

interface EventMember {
    id: string;
    status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'MAYBE';
    createdAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        profileImage?: string;
    };
}

interface RSVPFormData {
    status: 'CONFIRMED' | 'DECLINED' | 'MAYBE';
    notes?: string;
}

export default function EventViewPage() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRSVPDialog, setShowRSVPDialog] = useState(false);
    const [selectedMember, setSelectedMember] = useState<EventMember | null>(null);
    const [rsvpForm, setRSVPForm] = useState<RSVPFormData>({
        status: 'CONFIRMED',
        notes: ''
    });
    const [saveLoading, setSaveLoading] = useState(false);
    const toast = useRef<Toast>(null);

    const eventId = params.id as string;

    useEffect(() => {
        if (eventId) {
            loadEvent();
        }
    }, [eventId]);

    const loadEvent = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getEvent(eventId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            setEvent(response.data);
        } catch (error) {
            setError("Failed to load event. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load event");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
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

    const getRSVPStatusSeverity = (status: string) => {
        switch (status) {
            case "CONFIRMED": return "success";
            case "DECLINED": return "danger";
            case "MAYBE": return "warning";
            case "PENDING": return "secondary";
            default: return "info";
        }
    };

    const getRSVPStatusLabel = (status: string) => {
        switch (status) {
            case "CONFIRMED": return "Confirmed";
            case "DECLINED": return "Declined";
            case "MAYBE": return "Maybe";
            case "PENDING": return "Pending";
            default: return status;
        }
    };

    const openRSVPDialog = (member: EventMember) => {
        setSelectedMember(member);
        setRSVPForm({
            status: member.status === 'PENDING' ? 'CONFIRMED' : member.status,
            notes: ''
        });
        setShowRSVPDialog(true);
    };

    const saveRSVP = async () => {
        if (!selectedMember) return;

        setSaveLoading(true);
        try {
            // Here you would typically update the RSVP status via API
            // For now, we'll just show a success message
            showToast("success", "Success", `RSVP status updated for ${selectedMember.user.firstName} ${selectedMember.user.lastName}`);
            setShowRSVPDialog(false);
            
            // Reload event to get updated data
            await loadEvent();
        } catch (error) {
            showToast("error", "Error", "Failed to update RSVP status");
        } finally {
            setSaveLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDuration = (startDate: string, endDate?: string) => {
        if (!endDate) return "No end time specified";
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end.getTime() - start.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m`;
        }
        return `${diffMinutes}m`;
    };

    const memberBodyTemplate = (rowData: EventMember) => {
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
                </div>
            </div>
        );
    };

    const statusBodyTemplate = (rowData: EventMember) => {
        return (
            <Tag 
                value={getRSVPStatusLabel(rowData.status)} 
                severity={getRSVPStatusSeverity(rowData.status)} 
            />
        );
    };

    const actionBodyTemplate = (rowData: EventMember) => {
        return (
            <Button
                icon="pi pi-pencil"
                size="small"
                text
                severity="secondary"
                tooltip="Update RSVP"
                onClick={() => openRSVPDialog(rowData)}
            />
        );
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="grid">
                            <div className="col-12">
                                <Skeleton height="3rem" className="mb-3" />
                                <Skeleton width="60%" height="1.5rem" className="mb-4" />
                            </div>
                            <div className="col-12 md:col-6">
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                            </div>
                            <div className="col-12 md:col-6">
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                            </div>
                            <div className="col-12">
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="8rem" className="mb-3" />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="text-center p-4">
                            <i className="pi pi-exclamation-triangle text-6xl text-orange-500 mb-3"></i>
                            <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
                            <p className="text-600 mb-4">
                                {error || "The event you're looking for doesn't exist or has been removed."}
                            </p>
                            <Button 
                                label="Back to Events" 
                                icon="pi pi-arrow-left" 
                                onClick={() => router.push('/admin/events')}
                                severity="secondary"
                            />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                {/* Header */}
                <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                    <div className="flex flex-column">
                        <h1 className="text-3xl font-bold m-0">{event.title}</h1>
                        <div className="flex align-items-center gap-2 mt-2">
                            <Tag value={event.category} severity={getCategorySeverity(event.category)} />
                            <Tag value={event.type} severity={getTypeSeverity(event.type)} />
                            {event.isRSVP && (
                                <Tag value="RSVP Required" severity="warning" />
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label="Back to Events"
                            icon="pi pi-arrow-left"
                            onClick={() => router.push('/admin/events')}
                            severity="secondary"
                        />
                        {/* <Button
                            label="Edit Event"
                            icon="pi pi-pencil"
                            onClick={() => router.push(`/admin/events/edit/${event.id}`)}
                            severity="info"
                        /> */}
                    </div>
                </div>

                <div className="grid">
                    {/* Event Details Card */}
                    <div className="col-12 lg:col-8">
                        <Card>
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-2">Event Information</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-bold text-600">Start Date & Time</label>
                                                <p className="text-lg">{formatDate(event.startDate)}</p>
                                            </div>
                                            {event.endDate && (
                                                <div>
                                                    <label className="font-bold text-600">End Date & Time</label>
                                                    <p className="text-lg">{formatDate(event.endDate)}</p>
                                                </div>
                                            )}
                                            <div>
                                                <label className="font-bold text-600">Duration</label>
                                                <p className="text-lg">{getDuration(event.startDate, event.endDate)}</p>
                                            </div>
                                            {event.location && (
                                                <div>
                                                    <label className="font-bold text-600">Location</label>
                                                    <p className="text-lg">{event.location}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-2">Event Details</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-bold text-600">Category</label>
                                                <p className="text-lg">{event.category.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <label className="font-bold text-600">Type</label>
                                                <p className="text-lg">{event.type}</p>
                                            </div>
                                            <div>
                                                <label className="font-bold text-600">RSVP Required</label>
                                                <p className="text-lg">{event.isRSVP ? 'Yes' : 'No'}</p>
                                            </div>
                                            {event.maxAttendees && (
                                                <div>
                                                    <label className="font-bold text-600">Max Attendees</label>
                                                    <p className="text-lg">{event.maxAttendees}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {event.description && (
                                    <div className="col-12">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                                            <p className="text-lg line-height-3">{event.description}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Event Stats Card */}
                    <div className="col-12 lg:col-4">
                        <Card>
                            <h3 className="text-lg font-semibold mb-3">Event Statistics</h3>
                            <div className="space-y-4">
                                <div className="text-center p-3 bg-blue-50 border-round">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {event._count?.members || 0}
                                    </div>
                                    <div className="text-600">Total Attendees</div>
                                </div>
                                {event.maxAttendees && (
                                    <div className="text-center p-3 bg-green-50 border-round">
                                        <div className="text-2xl font-bold text-green-600">
                                            {event.maxAttendees - (event._count?.members || 0)}
                                        </div>
                                        <div className="text-600">Available Spots</div>
                                    </div>
                                )}
                                <div className="text-center p-3 bg-orange-50 border-round">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {event.members?.filter(m => m.status === 'CONFIRMED').length || 0}
                                    </div>
                                    <div className="text-600">Confirmed</div>
                                </div>
                                <div className="text-center p-3 bg-red-50 border-round">
                                    <div className="text-2xl font-bold text-red-600">
                                        {event.members?.filter(m => m.status === 'DECLINED').length || 0}
                                    </div>
                                    <div className="text-600">Declined</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Attendees List */}
                    {event.isRSVP && event.members && event.members.length > 0 && (
                        <div className="col-12">
                            <Card>
                                <h3 className="text-lg font-semibold mb-3">Attendees</h3>
                                <DataTable
                                    value={event.members}
                                    paginator
                                    rows={10}
                                    responsiveLayout="scroll"
                                    emptyMessage="No attendees found."
                                >
                                    <Column 
                                        field="user.firstName" 
                                        header="Attendee" 
                                        body={memberBodyTemplate}
                                        style={{ minWidth: "200px" }}
                                    />
                                    <Column 
                                        field="status" 
                                        header="RSVP Status" 
                                        body={statusBodyTemplate}
                                        style={{ minWidth: "120px" }}
                                    />
                                    <Column 
                                        field="createdAt" 
                                        header="Response Date" 
                                        body={(rowData) => new Date(rowData.createdAt).toLocaleDateString()}
                                        style={{ minWidth: "120px" }}
                                    />
                                    <Column 
                                        body={actionBodyTemplate}
                                        style={{ width: "100px" }}
                                    />
                                </DataTable>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {/* RSVP Update Dialog */}
            <Dialog
                visible={showRSVPDialog}
                style={{ width: "500px" }}
                header="Update RSVP Status"
                modal
                onHide={() => setShowRSVPDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowRSVPDialog(false)}
                            disabled={saveLoading}
                        />
                        <Button
                            label={saveLoading ? "Saving..." : "Save"}
                            icon={saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
                            onClick={saveRSVP}
                            disabled={saveLoading}
                        />
                    </div>
                }
            >
                {selectedMember && (
                    <div className="grid">
                        <div className="col-12">
                            <h4 className="mb-3">
                                Update RSVP for {selectedMember.user.firstName} {selectedMember.user.lastName}
                            </h4>
                        </div>
                        <div className="col-12">
                            <label className="font-bold mb-2 block">RSVP Status</label>
                            <Dropdown
                                value={rsvpForm.status}
                                options={[
                                    { label: 'Confirmed', value: 'CONFIRMED' },
                                    { label: 'Declined', value: 'DECLINED' },
                                    { label: 'Maybe', value: 'MAYBE' }
                                ]}
                                onChange={(e) => setRSVPForm({...rsvpForm, status: e.value})}
                                placeholder="Select Status"
                                className="w-full"
                            />
                        </div>
                        <div className="col-12">
                            <label className="font-bold mb-2 block">Notes (Optional)</label>
                            <InputTextarea
                                value={rsvpForm.notes}
                                onChange={(e) => setRSVPForm({...rsvpForm, notes: e.target.value})}
                                rows={3}
                                className="w-full"
                                placeholder="Add any notes about this RSVP..."
                            />
                        </div>
                    </div>
                )}
            </Dialog>

            <Toast ref={toast} />
        </div>
    );
} 