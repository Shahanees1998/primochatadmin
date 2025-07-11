"use client";

import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    isArchived: boolean;
    createdAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface NotificationFormData {
    title: string;
    message: string;
    type: string;
    targetUsers: string[];
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        title: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        type: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showNotificationDialog, setShowNotificationDialog] = useState(false);
    const [notificationForm, setNotificationForm] = useState<NotificationFormData>({
        title: "",
        message: "",
        type: "BROADCAST",
        targetUsers: ["ALL"],
    });
    const toast = useRef<Toast>(null);

    const notificationTypeOptions = [
        { label: "Broadcast", value: "BROADCAST" },
        { label: "Event Update", value: "EVENT_UPDATE" },
        { label: "Document Upload", value: "DOCUMENT_UPLOAD" },
        { label: "Support Response", value: "SUPPORT_RESPONSE" },
        { label: "Festive Board Update", value: "FESTIVE_BOARD_UPDATE" },
    ];

    const targetUserOptions = [
        { label: "All Users", value: "ALL" },
        { label: "Active Members", value: "ACTIVE" },
        { label: "Admins Only", value: "ADMINS" },
        { label: "New Members", value: "NEW" },
    ];

    useEffect(() => {
        loadNotifications();
    }, [currentPage, rowsPerPage]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            // Simulate API call
            const mockNotifications: Notification[] = Array.from({ length: 30 }, (_, i) => ({
                id: `notif-${i + 1}`,
                userId: `user-${(i % 15) + 1}`,
                title: `Notification ${i + 1}`,
                message: `This is notification message ${i + 1}. It contains important information for the user.`,
                type: i % 5 === 0 ? "BROADCAST" : i % 5 === 1 ? "EVENT_UPDATE" : i % 5 === 2 ? "DOCUMENT_UPLOAD" : i % 5 === 3 ? "SUPPORT_RESPONSE" : "FESTIVE_BOARD_UPDATE",
                isRead: i % 3 === 0,
                isArchived: i > 20,
                createdAt: new Date(2024, 0, i + 1).toISOString(),
                user: {
                    firstName: `User${(i % 15) + 1}`,
                    lastName: `Last${(i % 15) + 1}`,
                    email: `user${(i % 15) + 1}@example.com`,
                },
            }));

            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = startIndex + rowsPerPage;
            const paginatedNotifications = mockNotifications.slice(startIndex, endIndex);

            setNotifications(paginatedNotifications);
            setTotalRecords(mockNotifications.length);
        } catch (error) {
            showToast("error", "Error", "Failed to load notifications");
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
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNewNotificationDialog = () => {
        setNotificationForm({
            title: "",
            message: "",
            type: "BROADCAST",
            targetUsers: ["ALL"],
        });
        setShowNotificationDialog(true);
    };

    const sendNotification = async () => {
        if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
            showToast("error", "Error", "Please fill in all required fields");
            return;
        }

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newNotification: Notification = {
                id: `notif-${Date.now()}`,
                userId: "system",
                title: notificationForm.title,
                message: notificationForm.message,
                type: notificationForm.type,
                isRead: false,
                isArchived: false,
                createdAt: new Date().toISOString(),
            };

            setNotifications([newNotification, ...notifications]);
            setTotalRecords(prev => prev + 1);
            setShowNotificationDialog(false);
            showToast("success", "Success", "Notification sent successfully!");
        } catch (error) {
            showToast("error", "Error", "Failed to send notification");
        }
    };

    const confirmDeleteNotification = (notification: Notification) => {
        confirmDialog({
            message: `Are you sure you want to delete "${notification.title}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteNotification(notification.id),
        });
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            const updatedNotifications = notifications.filter(notif => notif.id !== notificationId);
            setNotifications(updatedNotifications);
            setTotalRecords(prev => prev - 1);
            showToast("success", "Success", "Notification deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete notification");
        }
    };

    const getTypeSeverity = (type: string) => {
        switch (type) {
            case "BROADCAST": return "info";
            case "EVENT_UPDATE": return "success";
            case "DOCUMENT_UPLOAD": return "warning";
            case "SUPPORT_RESPONSE": return "danger";
            case "FESTIVE_BOARD_UPDATE": return "secondary";
            default: return "info";
        }
    };

    const actionBodyTemplate = (rowData: Notification) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => {
                        showToast("info", "Info", "View functionality would be implemented here");
                    }}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete Notification"
                    onClick={() => confirmDeleteNotification(rowData)}
                />
            </div>
        );
    };

    const userBodyTemplate = (rowData: Notification) => {
        return rowData.user ? (
            <div>
                <div className="font-semibold">{`${rowData.user.firstName} ${rowData.user.lastName}`}</div>
                <div className="text-sm text-600">{rowData.user.email}</div>
            </div>
        ) : (
            <span className="text-600">System</span>
        );
    };

    const messageBodyTemplate = (rowData: Notification) => {
        return (
            <div className="max-w-xs">
                <div className="text-sm">
                    {rowData.message.length > 100 
                        ? `${rowData.message.substring(0, 100)}...` 
                        : rowData.message
                    }
                </div>
            </div>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Notifications</h2>
                <span className="text-600">Manage push notifications and system alerts</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search notifications..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Send Notification"
                    icon="pi pi-bell"
                    onClick={openNewNotificationDialog}
                    severity="success"
                />
            </div>
        </div>
    );

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <DataTable
                        value={notifications}
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
                        globalFilterFields={["title", "message"]}
                        header={header}
                        emptyMessage="No notifications found."
                        responsiveLayout="scroll"
                    >
                        <Column field="title" header="Title" sortable style={{ minWidth: "200px" }} />
                        <Column field="message" header="Message" body={messageBodyTemplate} style={{ minWidth: "300px" }} />
                        <Column field="type" header="Type" body={(rowData) => (
                            <Tag value={rowData.type.replace("_", " ")} severity={getTypeSeverity(rowData.type)} />
                        )} sortable style={{ minWidth: "150px" }} />
                        <Column field="user" header="User" body={userBodyTemplate} style={{ minWidth: "150px" }} />
                        <Column field="isRead" header="Status" body={(rowData) => (
                            <Tag value={rowData.isRead ? "Read" : "Unread"} severity={rowData.isRead ? "success" : "warning"} />
                        )} style={{ minWidth: "100px" }} />
                        <Column field="createdAt" header="Date" body={(rowData) => (
                            new Date(rowData.createdAt).toLocaleDateString()
                        )} sortable style={{ minWidth: "120px" }} />
                        <Column body={actionBodyTemplate} style={{ width: "120px" }} />
                    </DataTable>
                </Card>
            </div>

            {/* Notification Dialog */}
            <Dialog
                visible={showNotificationDialog}
                style={{ width: "600px" }}
                header="Send New Notification"
                modal
                className="p-fluid"
                onHide={() => setShowNotificationDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowNotificationDialog(false)} />
                        <Button label="Send" icon="pi pi-send" onClick={sendNotification} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="title" className="font-bold">Title *</label>
                        <InputText
                            id="title"
                            value={notificationForm.title}
                            onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="message" className="font-bold">Message *</label>
                        <InputTextarea
                            id="message"
                            value={notificationForm.message}
                            onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                            rows={4}
                            required
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="type" className="font-bold">Type</label>
                        <Dropdown
                            id="type"
                            value={notificationForm.type}
                            options={notificationTypeOptions}
                            onChange={(e) => setNotificationForm({ ...notificationForm, type: e.value })}
                            placeholder="Select Type"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="targetUsers" className="font-bold">Target Users</label>
                        <Dropdown
                            id="targetUsers"
                            value={notificationForm.targetUsers[0]}
                            options={targetUserOptions}
                            onChange={(e) => setNotificationForm({ ...notificationForm, targetUsers: [e.value] })}
                            placeholder="Select Target"
                        />
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 