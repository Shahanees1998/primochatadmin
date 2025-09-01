"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "primereact/card";
import { DataTable, DataTableStateEvent } from "primereact/datatable";
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

interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'EVENT_UPDATE' | 'DOCUMENT_UPLOAD' | 'CHAT_MESSAGE' | 'BROADCAST' | 'SUPPORT_RESPONSE' | 'MEAL_SELECTION' | 'TRESTLE_BOARD_ADDED' | 'FESTIVE_BOARD_UPDATE' | 'USER_JOINED' | 'SYSTEM_ALERT';
    isRead: boolean;
    createdAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [selectedType, setSelectedType] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<string | undefined>(undefined);
    const [selectedNotifications, setSelectedNotifications] = useState<Notification[]>([]);
    const toast = useRef<Toast>(null);

    const typeOptions = [
        { label: "All Types", value: "" },
        { label: "Event Update", value: "EVENT_UPDATE" },
        { label: "Document Upload", value: "DOCUMENT_UPLOAD" },
        { label: "Chat Message", value: "CHAT_MESSAGE" },
        { label: "Broadcast", value: "BROADCAST" },
        { label: "Support Response", value: "SUPPORT_RESPONSE" },
        { label: "Meal Selection", value: "MEAL_SELECTION" },
        { label: "Trestle Board Added", value: "TRESTLE_BOARD_ADDED" },
        { label: "Festive Board Update", value: "FESTIVE_BOARD_UPDATE" },
        { label: "User Joined", value: "USER_JOINED" },
        { label: "System Alert", value: "SYSTEM_ALERT" },
    ];

    const statusOptions = [
        { label: "All Status", value: "" },
        { label: "Unread", value: "unread" },
        { label: "Read", value: "read" },
    ];

    useEffect(() => {
        loadNotifications();
    }, [currentPage, rowsPerPage, globalFilterValue, selectedType, selectedStatus, sortField, sortOrder]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const response = await apiClient.getNotifications({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                type: selectedType,
                status: selectedStatus,
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setNotifications(response.data?.notifications || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            showToast("error", "Error", "Failed to load notifications");
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
        setSelectedType(e.value);
        setCurrentPage(1);
    };

    const onStatusFilterChange = (e: any) => {
        setSelectedStatus(e.value);
        setCurrentPage(1);
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const response = await apiClient.markNotificationAsRead(notificationId);
            if (response.error) {
                throw new Error(response.error);
            }

            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === notificationId 
                        ? { ...notification, isRead: true }
                        : notification
                )
            );
            showToast("success", "Success", "Notification marked as read");
        } catch (error) {
            showToast("error", "Error", "Failed to mark notification as read");
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await apiClient.markAllNotificationsAsRead();
            if (response.error) {
                throw new Error(response.error);
            }

            setNotifications(prev => 
                prev.map(notification => ({ ...notification, isRead: true }))
            );
            showToast("success", "Success", "All notifications marked as read");
        } catch (error) {
            showToast("error", "Error", "Failed to mark all notifications as read");
        }
    };

    const onSortChange = (event: DataTableStateEvent) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : event.sortOrder === -1 ? 'desc' : undefined);
        setCurrentPage(1);
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            const response = await apiClient.deleteNotification(notificationId);
            if (response.error) {
                throw new Error(response.error);
            }

            setNotifications(prev => 
                prev.filter(notification => notification.id !== notificationId)
            );
            setTotalRecords(prev => prev - 1);
            showToast("success", "Success", "Notification deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete notification");
        }
    };

    const confirmBulkDeleteNotifications = () => {
        if (selectedNotifications.length === 0) return;
        
        confirmDialog({
            message: `Are you sure you want to delete ${selectedNotifications.length} selected notification(s)?`,
            header: 'Bulk Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => bulkDeleteNotifications(),
        });
    };

    const bulkDeleteNotifications = async () => {
        if (selectedNotifications.length === 0) return;
        
        try {
            const deletePromises = selectedNotifications.map(notification => apiClient.deleteNotification(notification.id));
            await Promise.all(deletePromises);
            
            // Remove deleted notifications from local state
            setNotifications(prev => 
                prev.filter(notification => 
                    !selectedNotifications.some(selected => selected.id === notification.id)
                )
            );
            
            setTotalRecords(prev => prev - selectedNotifications.length);
            setSelectedNotifications([]);
            showToast("success", "Success", `${selectedNotifications.length} notification(s) deleted successfully`);
        } catch (error) {
            showToast("error", "Error", "Failed to delete some notifications");
        }
    };

    const confirmDelete = (notificationId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this notification?',
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => deleteNotification(notificationId),
        });
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const getTypeSeverity = (type: string) => {
        switch (type) {
            case 'EVENT_UPDATE': return 'info';
            case 'DOCUMENT_UPLOAD': return 'warning';
            case 'CHAT_MESSAGE': return 'primary';
            case 'BROADCAST': return 'danger';
            case 'SUPPORT_RESPONSE': return 'help';
            case 'MEAL_SELECTION': return 'success';
            case 'TRESTLE_BOARD_ADDED': return 'info';
            case 'FESTIVE_BOARD_UPDATE': return 'warning';
            case 'USER_JOINED': return 'success';
            case 'SYSTEM_ALERT': return 'danger';
            default: return 'info';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'EVENT_UPDATE': return 'Event Update';
            case 'DOCUMENT_UPLOAD': return 'Document';
            case 'CHAT_MESSAGE': return 'Chat';
            case 'BROADCAST': return 'Broadcast';
            case 'SUPPORT_RESPONSE': return 'Support';
            case 'MEAL_SELECTION': return 'Meal Selection';
            case 'TRESTLE_BOARD_ADDED': return 'Trestle Board';
            case 'FESTIVE_BOARD_UPDATE': return 'Festive Board';
            case 'USER_JOINED': return 'User Joined';
            case 'SYSTEM_ALERT': return 'System Alert';
            default: return type;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    const actionBodyTemplate = (rowData: Notification) => {
        return (
            <div className="flex gap-2">
                {!rowData.isRead && (
                    <Button
                        icon="pi pi-check"
                        size="small"
                        text
                        severity="success"
                        onClick={() => markAsRead(rowData.id)}
                        tooltip="Mark as Read"
                    />
                )}
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

    const statusBodyTemplate = (rowData: Notification) => {
        return rowData.isRead ? (
            <Tag value="Read" severity="success" />
        ) : (
            <Badge value="New" severity="danger" />
        );
    };

    const typeBodyTemplate = (rowData: Notification) => {
        return (
            <Tag 
                value={getTypeLabel(rowData.type)} 
                severity={getTypeSeverity(rowData.type) as any} 
            />
        );
    };

    const dateBodyTemplate = (rowData: Notification) => {
        return (
            <span className="text-sm text-600">
                {formatDate(rowData.createdAt)}
            </span>
        );
    };

    const messageBodyTemplate = (rowData: Notification) => {
        return (
            <div className="max-w-20rem">
                <div className="font-semibold mb-1">{rowData.title}</div>
                <div className="text-sm text-600 line-height-2">
                    {rowData.message.length > 100 
                        ? `${rowData.message.substring(0, 100)}...` 
                        : rowData.message
                    }
                </div>
            </div>
        );
    };

    const loadingTemplate = () => {
        return (
            <div className="flex align-items-center gap-3">
                <Skeleton shape="circle" size="2rem" />
                <div className="flex-1">
                    <Skeleton height="1rem" className="mb-2" />
                    <Skeleton height="0.75rem" width="60%" />
                </div>
            </div>
        );
    };

    return (
        <div className="grid">
            <div className="col-12">
                <Card className="shadow-2 border-round-xl">
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-4 mb-6">
                        <div className="flex flex-column">
                            <h2 className="text-3xl font-bold m-0 text-primary mb-2">Notifications</h2>
                            <span className="text-600 text-lg">Manage system notifications and alerts</span>
                        </div>
                        <div className="flex gap-3 justify-content-end">
                                                         {selectedNotifications.length > 0 && (
                                 <Button
                                     label={`Delete Selected (${selectedNotifications.length})`}
                                     icon="pi pi-trash"
                                     onClick={confirmBulkDeleteNotifications}
                                     severity="danger"
                                     className="p-button-raised"
                                     size="large"
                                 />
                             )}
                            <Button
                                label="Mark All as Read"
                                icon="pi pi-check-double"
                                onClick={markAllAsRead}
                                severity="success"
                                disabled={notifications.every(n => n.isRead)}
                                className="p-button-raised"
                                size="large"
                            />
                            <Button
                                label="Refresh"
                                icon="pi pi-sync"
                                onClick={loadNotifications}
                                severity="secondary"
                                className="p-button-outlined"
                                size="large"
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="surface-100 p-4 border-round-lg mb-6">
                        <div className="flex flex-column md:flex-row gap-4 align-items-end">
                            <div className="flex-1">
                                <label className="block text-900 font-medium mb-2">Search Notifications</label>
                                <span className="p-input-icon-left w-full">
                                    <i className="pi pi-search" />
                                    <InputText
                                        value={globalFilterValue}
                                        onChange={onGlobalFilterChange}
                                        placeholder="Search by title, message, or user..."
                                        className="w-full p-inputtext-lg"
                                    />
                                </span>
                            </div>
                            <div className="w-full md:w-12rem">
                                <label className="block text-900 font-medium mb-2">Type</label>
                                <Dropdown
                                    value={selectedType}
                                    options={typeOptions}
                                    onChange={onTypeFilterChange}
                                    placeholder="All Types"
                                    className="w-full"
                                    showClear
                                />
                            </div>
                            <div className="w-full md:w-12rem">
                                <label className="block text-900 font-medium mb-2">Status</label>
                                <Dropdown
                                    value={selectedStatus}
                                    options={statusOptions}
                                    onChange={onStatusFilterChange}
                                    placeholder="All Status"
                                    className="w-full"
                                    showClear
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notifications Table */}
                    <DataTable
                        value={notifications}
                        loading={loading}
                        paginator
                        rows={rowsPerPage}
                        totalRecords={totalRecords}
                        lazy
                        first={(currentPage - 1) * rowsPerPage}
                        onPage={(e) => setCurrentPage((e.page || 0) + 1)}
                        sortField={sortField}
                        sortOrder={sortOrder as any}
                        onSort={onSortChange}
                        emptyMessage={loading ? "Loading..." : "No notifications found"}
                        className="p-datatable-sm"
                        selectionMode="multiple"
                        selection={selectedNotifications}
                        onSelectionChange={(e) => setSelectedNotifications(e.value as Notification[])}
                    >
                        <Column 
                            selectionMode="multiple" 
                            headerStyle={{ width: '3rem' }}
                            style={{ width: '3rem' }}
                        />
                        <Column
                            field="type"
                            header="Type"
                            body={typeBodyTemplate}
                            sortable
                            style={{ width: '120px' }}
                        />
                        <Column
                            field="message"
                            header="Message"
                            body={messageBodyTemplate}
                            sortable={false}
                        />
                        <Column
                            field="isRead"
                            header="Status"
                            body={statusBodyTemplate}
                            sortable
                            style={{ width: '100px' }}
                        />
                        <Column
                            field="createdAt"
                            header="Date"
                            body={dateBodyTemplate}
                            sortable
                            style={{ width: '120px' }}
                        />
                        <Column
                            header="Actions"
                            body={actionBodyTemplate}
                            style={{ width: '100px' }}
                        />
                    </DataTable>

                    {/* Statistics */}
                    <div className="grid mt-4">
                        <div className="col-12 md:col-3">
                            <Card className="text-center">
                                <div className="text-2xl font-bold text-blue-500">
                                    {notifications.filter(n => !n.isRead).length}
                                </div>
                                <div className="text-600">Unread</div>
                            </Card>
                        </div>
                        <div className="col-12 md:col-3">
                            <Card className="text-center">
                                <div className="text-2xl font-bold text-green-500">
                                    {notifications.filter(n => n.isRead).length}
                                </div>
                                <div className="text-600">Read</div>
                            </Card>
                        </div>
                        <div className="col-12 md:col-3">
                            <Card className="text-center">
                                <div className="text-2xl font-bold text-orange-500">
                                    {notifications.filter(n => n.type === 'BROADCAST').length}
                                </div>
                                <div className="text-600">Broadcasts</div>
                            </Card>
                        </div>
                        <div className="col-12 md:col-3">
                            <Card className="text-center">
                                <div className="text-2xl font-bold text-purple-500">
                                    {notifications.filter(n => n.type === 'CHAT_MESSAGE').length}
                                </div>
                                <div className="text-600">Chat Messages</div>
                            </Card>
                        </div>
                    </div>
                </Card>
            </div>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 