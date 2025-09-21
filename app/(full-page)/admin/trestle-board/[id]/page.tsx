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
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { apiClient } from "@/lib/apiClient";

interface TrestleBoard {
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    category: 'REGULAR_MEETING' | 'DISTRICT' | 'EMERGENT' | 'PRACTICE' | 'CGP' | 'SOCIAL';
    isRSVP: boolean;
    maxAttendees?: number;
    createdAt: string;
    updatedAt: string;
    members?: TrestleBoardMember[];
    _count?: {
        members: number;
    };
}

interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    eventType: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        membershipNumber: string;
    };
    createdAt: string;
}

interface TrestleBoardMember {
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

export default function TrestleBoardViewPage() {
    const params = useParams();
    const router = useRouter();
    const [trestleBoard, setTrestleBoard] = useState<TrestleBoard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRSVPDialog, setShowRSVPDialog] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TrestleBoardMember | null>(null);
    const [rsvpForm, setRSVPForm] = useState<RSVPFormData>({
        status: 'CONFIRMED',
        notes: ''
    });
    const [saveLoading, setSaveLoading] = useState(false);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
    const toast = useRef<Toast>(null);

    const trestleBoardId = params.id as string;

    useEffect(() => {
        if (trestleBoardId) {
            loadTrestleBoard();
            loadCalendarEvents();
        }
    }, [trestleBoardId]);

    const loadTrestleBoard = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getTrestleBoard(trestleBoardId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            setTrestleBoard(response.data);
        } catch (error) {
            setError("Failed to load Trestle Board. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load Trestle Board");
        } finally {
            setLoading(false);
        }
    };

    const loadCalendarEvents = async () => {
        setCalendarLoading(true);
        try {
            const response = await apiClient.getCalendarEvents({
                trestleBoardId: trestleBoardId,
                limit: 1000
            });
            
            if (response.error) {
                throw new Error(response.error);
            }

            setCalendarEvents(response.data?.events || []);
        } catch (error) {
            console.error('Error loading calendar events:', error);
            showToast("error", "Error", "Failed to load calendar events");
        } finally {
            setCalendarLoading(false);
        }
    };

    const deleteCalendarEvent = async (eventId: string, userId: string) => {
        setDeleteLoading(eventId);
        try {
            const response = await apiClient.deleteCalendarEvent(eventId, 'TRESTLE_BOARD', userId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", "Trestle board removed from user's calendar");
            await loadCalendarEvents(); // Reload the list
        } catch (error: any) {
            console.error('Error deleting calendar event:', error);
            showToast("error", "Error", error.message || "Failed to remove trestle board from calendar");
        } finally {
            setDeleteLoading(null);
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

    const openRSVPDialog = (member: TrestleBoardMember) => {
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
            await loadTrestleBoard();
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


    const memberBodyTemplate = (rowData: TrestleBoardMember) => {
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

    const statusBodyTemplate = (rowData: TrestleBoardMember) => {
        return (
            <Tag 
                value={getRSVPStatusLabel(rowData.status)} 
                severity={getRSVPStatusSeverity(rowData.status)} 
            />
        );
    };

    const actionBodyTemplate = (rowData: TrestleBoardMember) => {
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

    if (error || !trestleBoard) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="text-center p-4">
                            <i className="pi pi-exclamation-triangle text-6xl text-orange-500 mb-3"></i>
                            <h2 className="text-2xl font-bold mb-2">Trestle Board Not Found</h2>
                            <p className="text-600 mb-4">
                                {error || "The Trestle Board you're looking for doesn't exist or has been removed."}
                            </p>
                            <Button 
                                label="Back to Trestle Board" 
                                icon="pi pi-arrow-left" 
                                onClick={() => router.push('/admin/trestle-board')}
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
                        <h1 className="text-3xl font-bold m-0">{trestleBoard.title}</h1>
                        <div className="flex align-items-center gap-2 mt-2">
                            <Tag value={trestleBoard.category} severity={getCategorySeverity(trestleBoard.category)} />
                            {trestleBoard.isRSVP && (
                                <Tag value="RSVP Required" severity="warning" />
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label="Back to Trestle Board"
                            icon="pi pi-arrow-left"
                            onClick={() => router.push('/admin/trestle-board')}
                            severity="secondary"
                        />
                        {/* <Button
                            label="Edit Trestle Board"
                            icon="pi pi-pencil"
                            onClick={() => router.push(`/admin/trestle-board/edit/${trestleBoard.id}`)}
                            severity="info"
                        /> */}
                    </div>
                </div>

                <div className="grid">
                    {/* Trestle Board Details Card */}
                    <div className="col-12">
                        <Card>
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-2">Trestle Board Information</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-bold text-600">Date</label>
                                                <p className="text-lg">{formatDate(trestleBoard.date)}</p>
                                            </div>
                                            {trestleBoard.time && (
                                                <div>
                                                    <label className="font-bold text-600">Time</label>
                                                    <p className="text-lg">{trestleBoard.time}</p>
                                                </div>
                                            )}
                                            {trestleBoard.location && (
                                                <div>
                                                    <label className="font-bold text-600">Location</label>
                                                    <p className="text-lg">{trestleBoard.location}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-2">Trestle Board Details</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-bold text-600">Category</label>
                                                <p className="text-lg">{trestleBoard.category.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <label className="font-bold text-600">RSVP Required</label>
                                                <p className="text-lg">{trestleBoard.isRSVP ? 'Yes' : 'No'}</p>
                                            </div>
                                            {trestleBoard.maxAttendees && (
                                                <div>
                                                    <label className="font-bold text-600">Max Attendees</label>
                                                    <p className="text-lg">{trestleBoard.maxAttendees}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {trestleBoard.description && (
                                    <div className="col-12">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                                            <p className="text-lg line-height-3">{trestleBoard.description}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Event Stats Card */}
                    {/* <div className="col-12 lg:col-4">
                        <Card>
                            <h3 className="text-lg font-semibold mb-3">Trestle Board Statistics</h3>
                            <div className="space-y-4">
                                <div className="text-center p-3 bg-blue-50 border-round">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {trestleBoard._count?.members || 0}
                                    </div>
                                    <div className="text-600">Total Attendees</div>
                                </div>
                                {trestleBoard.maxAttendees && (
                                    <div className="text-center p-3 bg-green-50 border-round">
                                        <div className="text-2xl font-bold text-green-600">
                                            {trestleBoard.maxAttendees - (trestleBoard._count?.members || 0)}
                                        </div>
                                        <div className="text-600">Available Spots</div>
                                    </div>
                                )}
                                <div className="text-center p-3 bg-orange-50 border-round">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {trestleBoard.members?.filter(m => m.status === 'CONFIRMED').length || 0}
                                    </div>
                                    <div className="text-600">Confirmed</div>
                                </div>
                                <div className="text-center p-3 bg-red-50 border-round">
                                    <div className="text-2xl font-bold text-red-600">
                                        {trestleBoard.members?.filter(m => m.status === 'DECLINED').length || 0}
                                    </div>
                                    <div className="text-600">Declined</div>
                                </div>
                            </div>
                        </Card>
                    </div> */}

                    {/* Attendees List */}
                    {trestleBoard.isRSVP && trestleBoard.members && trestleBoard.members.length > 0 && (
                        <div className="col-12">
                            <Card>
                                <h3 className="text-lg font-semibold mb-3">Attendees</h3>
                                <DataTable
                                    value={trestleBoard.members}
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

                    {/* User Calendar Events */}
                    <div className="col-12">
                        <Card>
                            <div className="flex justify-content-between align-items-center mb-3">
                                <h3 className="text-lg font-semibold m-0">User Calendar Events</h3>
                                <div className="text-sm text-600">
                                    {calendarEvents.length} user{calendarEvents.length !== 1 ? 's' : ''} have this trestle board in their calendar
                                </div>
                            </div>
                            {calendarLoading ? (
                                <div className="p-3">
                                    <Skeleton height="2rem" className="mb-2" />
                                    <Skeleton height="2rem" className="mb-2" />
                                    <Skeleton height="2rem" className="mb-2" />
                                </div>
                            ) : (
                                <DataTable
                                    value={calendarEvents}
                                    paginator
                                    rows={10}
                                    responsiveLayout="scroll"
                                    emptyMessage="No users have this trestle board in their calendar yet."
                                >
                                    <Column 
                                        field="user.name" 
                                        header="User" 
                                        body={(rowData) => (
                                            <div className="flex align-items-center gap-2">
                                                <div>
                                                    <div className="font-semibold">{rowData.user.name}</div>
                                                    <div className="text-sm text-gray-600">{rowData.user.email}</div>
                                                    <div className="text-sm text-gray-500">#{rowData.user.membershipNumber}</div>
                                                </div>
                                            </div>
                                        )}
                                        style={{ minWidth: "200px" }}
                                    />
                                    <Column 
                                        field="title" 
                                        header="Trestle Board Title" 
                                        style={{ minWidth: "150px" }}
                                    />
                                    <Column 
                                        field="date" 
                                        header="Event Date" 
                                        body={(rowData) => new Date(rowData.date).toLocaleDateString()}
                                        style={{ minWidth: "120px" }}
                                    />
                                    <Column 
                                        field="location" 
                                        header="Location" 
                                        style={{ minWidth: "120px" }}
                                    />
                                    <Column 
                                        field="createdAt" 
                                        header="Added to Calendar" 
                                        body={(rowData) => new Date(rowData.createdAt).toLocaleDateString()}
                                        style={{ minWidth: "120px" }}
                                    />
                                    <Column 
                                        header="Actions"
                                        body={(rowData) => (
                                            <Button
                                                icon="pi pi-trash"
                                                size="small"
                                                severity="danger"
                                                text
                                                tooltip="Remove this trestle board from user's calendar"
                                                loading={deleteLoading === rowData.id}
                                                onClick={() => deleteCalendarEvent(rowData.id, rowData.user.id)}
                                            />
                                        )}
                                        style={{ width: "100px" }}
                                    />
                                </DataTable>
                            )}
                        </Card>
                    </div>
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