"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Tag } from "primereact/tag";
import { Badge } from "primereact/badge";
import { Skeleton } from "primereact/skeleton";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'GENERAL' | 'IMPORTANT' | 'URGENT' | 'EVENT' | 'UPDATE';
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    targetAudience: 'ALL' | 'MEMBERS' | 'ADMINS' | 'NEW_MEMBERS' | 'CUSTOM';
    publishedAt?: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
}

interface AnnouncementFormData {
    title: string;
    content: string;
    type: 'GENERAL' | 'IMPORTANT' | 'URGENT' | 'EVENT' | 'UPDATE';
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    targetAudience: 'ALL' | 'MEMBERS' | 'ADMINS' | 'NEW_MEMBERS' | 'CUSTOM';
    expiresAt?: string;
    selectedUsers: User[];
    createChatRoom: boolean;
}

export default function AnnouncementsPage() {
    const router = useRouter();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [selectedType, setSelectedType] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<number | undefined>(undefined);
    const toast = useRef<Toast>(null);

    const typeOptions = [
        { label: "All Types", value: "" },
        { label: "General", value: "GENERAL" },
        { label: "Important", value: "IMPORTANT" },
        { label: "Urgent", value: "URGENT" },
        { label: "Event", value: "EVENT" },
        { label: "Update", value: "UPDATE" },
    ];

    const statusOptions = [
        { label: "All Status", value: "" },
        { label: "Draft", value: "DRAFT" },
        { label: "Published", value: "PUBLISHED" },
        { label: "Archived", value: "ARCHIVED" },
    ];

    const audienceOptions = [
        { label: "All Users", value: "ALL" },
        { label: "Members Only", value: "MEMBERS" },
        { label: "Admins Only", value: "ADMINS" },
        { label: "New Members", value: "NEW_MEMBERS" },
        { label: "Custom Selection", value: "CUSTOM" },
    ];

    useEffect(() => {
        loadAnnouncements();
    }, [currentPage, rowsPerPage, globalFilterValue, selectedType, selectedStatus, sortField, sortOrder]);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                type: selectedType,
                status: selectedStatus,
                sortField,
                sortOrder,
            };

            // Debug: Log the parameters being sent
            const response = await apiClient.getAnnouncements(params);

            if (response.error) {
                throw new Error(response.error);
            }

            setAnnouncements(response.data?.announcements || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            console.error('Error loading announcements:', error);
            showToast("error", "Error", "Failed to load announcements");
        } finally {
            setLoading(false);
        }
    };



    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setGlobalFilterValue(value);
        setCurrentPage(1);
    };

    const onTypeFilterChange = (e: any) => {
        setSelectedType(e.value.value ?? e.value);
        setCurrentPage(1);
    };

    const onStatusFilterChange = (e: any) => {
        setSelectedStatus(e.value.value ?? e.value);
        setCurrentPage(1);
    };

    const openNewAnnouncementDialog = () => {
        router.push('/admin/communications/announcement');
    };

    const openEditAnnouncementDialog = (announcement: Announcement) => {
        // Store the announcement data in sessionStorage for the edit page
        sessionStorage.setItem('editAnnouncement', JSON.stringify(announcement));
        router.push('/admin/communications/announcement');
    };



    const deleteAnnouncement = async (announcementId: string) => {
        try {
            const response = await apiClient.deleteAnnouncement(announcementId);
            if (response.error) {
                throw new Error(response.error);
            }

            setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
            setTotalRecords(prev => prev - 1);
            showToast("success", "Success", "Announcement deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete announcement");
        }
    };

    const confirmDelete = (announcementId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this announcement?',
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => deleteAnnouncement(announcementId),
        });
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const getTypeSeverity = (type: string) => {
        switch (type) {
            case 'GENERAL': return 'info';
            case 'IMPORTANT': return 'warning';
            case 'URGENT': return 'danger';
            case 'EVENT': return 'success';
            case 'UPDATE': return 'primary';
            default: return 'info';
        }
    };

    const getStatusSeverity = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'secondary';
            case 'PUBLISHED': return 'success';
            case 'ARCHIVED': return 'warning';
            default: return 'info';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const actionBodyTemplate = (rowData: Announcement) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    severity="info"
                    onClick={() => openEditAnnouncementDialog(rowData)}
                    tooltip="View Details"
                />
                <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="warning"
                    onClick={() => openEditAnnouncementDialog(rowData)}
                    tooltip="Edit Announcement"
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    onClick={() => confirmDelete(rowData.id)}
                    tooltip="Delete"
                />
            </div>
        );
    };

    const statusBodyTemplate = (rowData: Announcement) => {
        return (
            <Tag 
                value={rowData.status} 
                severity={getStatusSeverity(rowData.status) as any} 
            />
        );
    };

    const typeBodyTemplate = (rowData: Announcement) => {
        return (
            <Tag 
                value={rowData.type} 
                severity={getTypeSeverity(rowData.type) as any} 
            />
        );
    };

    const dateBodyTemplate = (rowData: Announcement) => {
        return (
            <span className="text-sm text-600">
                {formatDate(rowData.createdAt)}
            </span>
        );
    };

    const contentBodyTemplate = (rowData: Announcement) => {
        return (
            <div className="max-w-20rem">
                <div className="font-semibold mb-1">{rowData.title}</div>
                <div className="text-sm text-600 line-height-2">
                    {rowData.content.length > 100 
                        ? `${rowData.content.substring(0, 100)}...` 
                        : rowData.content
                    }
                </div>
            </div>
        );
    };

    const audienceBodyTemplate = (rowData: Announcement) => {
        return (
            <Badge 
                value={rowData.targetAudience ? rowData.targetAudience.replace('_', ' ') : 'Unknown'} 
                severity="info"
            />
        );
    };

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                        <div className="flex flex-column">
                            <h2 className="text-2xl font-bold m-0">Announcements</h2>
                            <span className="text-600">Manage system announcements and broadcasts</span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                label="Create Announcement"
                                icon="pi pi-plus"
                                onClick={openNewAnnouncementDialog}
                                severity="success"
                            />
                            <Button
                                label="Refresh"
                                icon="pi pi-refresh"
                                onClick={loadAnnouncements}
                                severity="secondary"
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-column md:flex-row gap-3 mb-4">
                        <div className="flex-1">
                            <span className="p-input-icon-left w-full">
                                <i className="pi pi-search" />
                                <InputText
                                    value={globalFilterValue}
                                    onChange={onGlobalFilterChange}
                                    placeholder="Search announcements..."
                                    className="w-full"
                                />
                            </span>
                        </div>
                        <div className="w-full md:w-10rem">
                            <Dropdown
                                value={selectedType}
                                options={typeOptions}
                                onChange={onTypeFilterChange}
                                placeholder="Filter by Type"
                                className="w-full"
                            />
                        </div>
                        <div className="w-full md:w-10rem">
                            <Dropdown
                                value={selectedStatus}
                                options={statusOptions}
                                onChange={onStatusFilterChange}
                                placeholder="Filter by Status"
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Announcements Table Skeleton */}
                    {loading ? (
                        <DataTable
                            value={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
                            className="p-datatable-sm"
                        >
                            <Column
                                field="content"
                                header="Announcement"
                                body={() => (
                                    <div className="flex flex-column gap-1">
                                        <Skeleton width="200px" height="16px" />
                                        <Skeleton width="150px" height="14px" />
                            </div>
                                )}
                                sortable={false}
                            />
                            <Column
                                field="type"
                                header="Type"
                                body={() => <Skeleton width="80px" height="24px" />}
                                sortable
                                style={{ width: '120px' }}
                            />
                            <Column
                                field="targetAudience"
                                header="Audience"
                                body={() => <Skeleton width="80px" height="24px" />}
                                sortable
                                style={{ width: '120px' }}
                            />
                            <Column
                                field="status"
                                header="Status"
                                body={() => <Skeleton width="80px" height="24px" />}
                                sortable
                                style={{ width: '100px' }}
                            />
                            <Column
                                field="createdAt"
                                header="Created"
                                body={() => <Skeleton width="100px" height="16px" />}
                                sortable
                                style={{ width: '150px' }}
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
                                style={{ width: '120px' }}
                            />
                        </DataTable>
                    ) : (
                        <DataTable
                            value={announcements}
                            loading={loading}
                            paginator
                            rows={rowsPerPage}
                            totalRecords={totalRecords}
                            lazy
                            first={(currentPage - 1) * rowsPerPage}
                            onPage={(e) => setCurrentPage((e.page || 0) + 1)}
                            sortField={sortField}
                            sortOrder={sortOrder as any}
                            onSort={(e) => {
                                setSortField(e.sortField);
                                setSortOrder(e.sortOrder || undefined);
                            }}
                            emptyMessage={loading ? "Loading..." : "No announcements found"}
                            className="p-datatable-sm"
                        >
                            <Column
                                field="content"
                                header="Announcement"
                                body={contentBodyTemplate}
                                sortable={false}
                            />
                            <Column
                                field="type"
                                header="Type"
                                body={typeBodyTemplate}
                                sortable
                                style={{ width: '120px' }}
                            />
                            <Column
                                field="targetAudience"
                                header="Audience"
                                body={audienceBodyTemplate}
                                sortable
                                style={{ width: '120px' }}
                            />
                            <Column
                                field="status"
                                header="Status"
                                body={statusBodyTemplate}
                                sortable
                                style={{ width: '100px' }}
                            />
                            <Column
                                field="createdAt"
                                header="Created"
                                body={dateBodyTemplate}
                                sortable
                                style={{ width: '150px' }}
                            />
                            <Column
                                header="Actions"
                                body={actionBodyTemplate}
                                style={{ width: '120px' }}
                            />
                        </DataTable>
                    )}

                    {/* Statistics Skeleton */}
                    <div className="grid mt-4">
                        {loading ? (
                            [1, 2, 3, 4].map((i) => (
                                <div key={i} className="col-12 md:col-3">
                                    <Card className="text-center">
                                        <Skeleton width="60%" height="2.5rem" className="mx-auto mb-2" />
                                        <Skeleton width="40%" height="1.5rem" className="mx-auto" />
                                    </Card>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="col-12 md:col-3">
                                    <Card className="text-center">
                                        <div className="text-2xl font-bold text-blue-500">
                                            {announcements.filter(a => a.status === 'PUBLISHED').length}
                                        </div>
                                        <div className="text-600">Published</div>
                                    </Card>
                                </div>
                                <div className="col-12 md:col-3">
                                    <Card className="text-center">
                                        <div className="text-2xl font-bold text-orange-500">
                                            {announcements.filter(a => a.status === 'DRAFT').length}
                                        </div>
                                        <div className="text-600">Drafts</div>
                                    </Card>
                                </div>
                                <div className="col-12 md:col-3">
                                    <Card className="text-center">
                                        <div className="text-2xl font-bold text-red-500">
                                            {announcements.filter(a => a.type === 'URGENT').length}
                                        </div>
                                        <div className="text-600">Urgent</div>
                                    </Card>
                                </div>
                                <div className="col-12 md:col-3">
                                    <Card className="text-center">
                                        <div className="text-2xl font-bold text-green-500">
                                            {announcements.filter(a => a.type === 'EVENT').length}
                                        </div>
                                        <div className="text-600">Events</div>
                                    </Card>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 