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
import { FilterMatchMode } from "primereact/api";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { Skeleton } from "primereact/skeleton";

interface SupportRequest {
    id: string;
    userId: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
    adminResponse?: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface SupportFormData {
    status: string;
    priority: string;
    adminResponse: string;
}

export default function SupportPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<SupportRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        subject: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
        priority: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showResponseDialog, setShowResponseDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
    const [responseForm, setResponseForm] = useState<SupportFormData>({
        status: "OPEN",
        priority: "MEDIUM",
        adminResponse: "",
    });
    const [createForm, setCreateForm] = useState({
        userId: "",
        subject: "",
        message: "",
        priority: "MEDIUM",
    });
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const toast = useRef<Toast>(null);

    const statusOptions = [
        { label: "Open", value: "OPEN" },
        { label: "In Progress", value: "IN_PROGRESS" },
        { label: "Resolved", value: "RESOLVED" },
        { label: "Closed", value: "CLOSED" },
    ];

    const priorityOptions = [
        { label: "Low", value: "LOW" },
        { label: "Medium", value: "MEDIUM" },
        { label: "High", value: "HIGH" },
        { label: "Urgent", value: "URGENT" },
    ];

    useEffect(() => {
        loadSupportRequests();
        loadUsers();
    }, [currentPage, rowsPerPage]);

    const loadSupportRequests = async () => {
        setLoading(true);
        try {
            const response = await apiClient.getSupportRequests({
                page: currentPage,
                limit: rowsPerPage,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setRequests(response.data?.supportRequests || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            showToast("error", "Error", "Failed to load support requests");
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setUsersLoading(true);
        try {
            const response = await apiClient.getUsers({
                page: 1,
                limit: 100,
                status: 'ACTIVE'
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setUsers(response.data?.users || []);
        } catch (error) {
            showToast("error", "Error", "Failed to load users");
        } finally {
            setUsersLoading(false);
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

    const openResponseDialog = (request: SupportRequest) => {
        setSelectedRequest(request);
        setResponseForm({
            status: request.status,
            priority: request.priority,
            adminResponse: request.adminResponse || "",
        });
        setShowResponseDialog(true);
    };

    const openCreateDialog = () => {
        setCreateForm({
            userId: "",
            subject: "",
            message: "",
            priority: "MEDIUM",
        });
        setShowCreateDialog(true);
    };

    const saveResponse = async () => {
        if (!selectedRequest) return;

        try {
            const response = await apiClient.updateSupportRequest(selectedRequest.id, {
                status: responseForm.status,
                priority: responseForm.priority,
                adminResponse: responseForm.adminResponse,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Update local state
            setRequests(prev => prev.map(req =>
                req.id === selectedRequest.id
                    ? { ...req, ...responseForm, updatedAt: new Date().toISOString() }
                    : req
            ));

            showToast("success", "Success", "Response saved successfully");
            setShowResponseDialog(false);
        } catch (error) {
            showToast("error", "Error", "Failed to save response");
        }
    };

    const createSupportRequest = async () => {
        if (!createForm.userId || !createForm.subject || !createForm.message) {
            showToast("error", "Error", "Please fill in all required fields");
            return;
        }

        try {
            const response = await apiClient.createSupportRequest({
                userId: createForm.userId,
                subject: createForm.subject,
                message: createForm.message,
                priority: createForm.priority,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", "Support request created successfully");
            setShowCreateDialog(false);
            loadSupportRequests(); // Reload the list
        } catch (error) {
            showToast("error", "Error", "Failed to create support request");
        }
    };

    const deleteSupportRequest = async (requestId: string) => {
        try {
            const response = await apiClient.deleteSupportRequest(requestId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            setRequests(prev => prev.filter(req => req.id !== requestId));
            setTotalRecords(prev => prev - 1);
            showToast("success", "Success", "Support request deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete support request");
        }
    };

    const getStatusSeverity = (status: string) => {
        switch (status) {
            case "OPEN": return "danger";
            case "IN_PROGRESS": return "warning";
            case "RESOLVED": return "success";
            case "CLOSED": return "secondary";
            default: return "info";
        }
    };

    const getPrioritySeverity = (priority: string) => {
        switch (priority) {
            case "LOW": return "info";
            case "MEDIUM": return "warning";
            case "HIGH": return "danger";
            case "URGENT": return "danger";
            default: return "info";
        }
    };

    const actionBodyTemplate = (rowData: SupportRequest) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => router.push(`/admin/support/${rowData.id}`)}
                />
                <Button
                    icon="pi pi-reply"
                    size="small"
                    text
                    severity="info"
                    tooltip="Respond"
                    onClick={() => openResponseDialog(rowData)}
                />
                <Button
                    icon="pi pi-envelope"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Send Email"
                    onClick={() => {
                        showToast("info", "Info", "Email functionality would be implemented here");
                    }}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete"
                    onClick={() => {
                        if (confirm("Are you sure you want to delete this support request?")) {
                            deleteSupportRequest(rowData.id);
                        }
                    }}
                />
            </div>
        );
    };

    const userBodyTemplate = (rowData: SupportRequest) => {
        return rowData.user ? (
            <div>
                <div className="font-semibold">{`${rowData.user.firstName} ${rowData.user.lastName}`}</div>
                <div className="text-sm text-600">{rowData.user.email}</div>
            </div>
        ) : (
            <span className="text-600">Unknown User</span>
        );
    };

    const messageBodyTemplate = (rowData: SupportRequest) => {
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
                <h2 className="text-2xl font-bold m-0">Support Requests</h2>
                <span className="text-600">Manage and respond to user support requests</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search requests..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Create Request"
                    icon="pi pi-plus"
                    onClick={openCreateDialog}
                    severity="success"
                />
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <DataTable
                            value={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
                            className="p-datatable-sm"
                            header={header}
                        >
                            <Column 
                                field="user" 
                                header="User" 
                                body={() => (
                                    <div className="flex align-items-center gap-2">
                                        <Skeleton shape="circle" size="2rem" />
                                        <div className="flex flex-column gap-1">
                                            <Skeleton width="120px" height="16px" />
                                            <Skeleton width="100px" height="14px" />
                                        </div>
                                    </div>
                                )}
                                style={{ minWidth: "200px" }}
                            />
                            <Column 
                                field="subject" 
                                header="Subject" 
                                body={() => <Skeleton width="200px" height="16px" />}
                                style={{ minWidth: "200px" }}
                            />
                            <Column 
                                field="message" 
                                header="Message" 
                                body={() => <Skeleton width="300px" height="16px" />}
                                style={{ minWidth: "300px" }}
                            />
                            <Column 
                                field="status" 
                                header="Status" 
                                body={() => <Skeleton width="80px" height="24px" />}
                                style={{ minWidth: "100px" }}
                            />
                            <Column 
                                field="createdAt" 
                                header="Created At" 
                                body={() => <Skeleton width="100px" height="16px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                header="Actions" 
                                body={() => (
                                    <div className="flex gap-2">
                                        <Skeleton width="32px" height="32px" />
                                        <Skeleton width="32px" height="32px" />
                                    </div>
                                )}
                                style={{ width: "100px" }}
                            />
                        </DataTable>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <DataTable
                        value={requests}
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
                        globalFilterFields={["subject", "message"]}
                        header={header}
                        emptyMessage="No support requests found."
                        responsiveLayout="scroll"
                    >
                        <Column field="user" header="User" body={userBodyTemplate} style={{ minWidth: "200px" }} />
                        <Column field="subject" header="Subject" style={{ minWidth: "200px" }} />
                        <Column field="message" header="Message" body={messageBodyTemplate} style={{ minWidth: "300px" }} />
                        <Column field="status" header="Status" body={(rowData) => (
                            <Tag value={rowData.status.replace('_', ' ')} severity={getStatusSeverity(rowData.status)} />
                        )} style={{ minWidth: "120px" }} />
                        <Column field="priority" header="Priority" body={(rowData) => (
                            <Tag value={rowData.priority} severity={getPrioritySeverity(rowData.priority)} />
                        )} style={{ minWidth: "120px" }} />
                        <Column field="createdAt" header="Created" body={(rowData) => (
                            new Date(rowData.createdAt).toLocaleDateString()
                        )} style={{ minWidth: "120px" }} />
                        <Column body={actionBodyTemplate} style={{ width: "200px" }} />
                    </DataTable>
                </Card>
            </div>

            {/* Response Dialog */}
            <Dialog
                visible={showResponseDialog}
                style={{ width: "600px" }}
                header="Respond to Support Request"
                modal
                onHide={() => setShowResponseDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" onClick={() => setShowResponseDialog(false)} text />
                        <Button label="Save Response" icon="pi pi-check" onClick={saveResponse} />
                    </div>
                }
            >
                {selectedRequest && (
                    <div className="grid">
                        <div className="col-12">
                            <h4>Request Details</h4>
                            <p><strong>Subject:</strong> {selectedRequest.subject}</p>
                            <p><strong>Message:</strong> {selectedRequest.message}</p>
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-medium mb-2">Status</label>
                            <Dropdown
                                value={responseForm.status}
                                options={statusOptions}
                                onChange={(e) => setResponseForm(prev => ({ ...prev, status: e.value }))}
                                placeholder="Select Status"
                                className="w-full"
                            />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-medium mb-2">Priority</label>
                            <Dropdown
                                value={responseForm.priority}
                                options={priorityOptions}
                                onChange={(e) => setResponseForm(prev => ({ ...prev, priority: e.value }))}
                                placeholder="Select Priority"
                                className="w-full"
                            />
                        </div>
                        <div className="col-12">
                            <label className="block text-sm font-medium mb-2">Admin Response</label>
                            <InputTextarea
                                value={responseForm.adminResponse}
                                onChange={(e) => setResponseForm(prev => ({ ...prev, adminResponse: e.target.value }))}
                                rows={5}
                                placeholder="Enter your response..."
                                className="w-full"
                            />
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Create Dialog */}
            <Dialog
                visible={showCreateDialog}
                style={{ width: "600px" }}
                header="Create Support Request"
                modal
                onHide={() => setShowCreateDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" onClick={() => setShowCreateDialog(false)} text />
                        <Button label="Create Request" icon="pi pi-check" onClick={createSupportRequest} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label className="block text-sm font-medium mb-2">User</label>
                        <Dropdown
                            value={createForm.userId}
                            options={users.map(user => ({ label: `${user.firstName} ${user.lastName}`, value: user.id }))}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, userId: e.value }))}
                            placeholder="Select User"
                            className="w-full"
                            loading={usersLoading}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-sm font-medium mb-2">Subject</label>
                        <InputText
                            value={createForm.subject}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Enter subject..."
                            className="w-full"
                        />
                    </div>
                    <div className="col-6">
                        <label className="block text-sm font-medium mb-2">Priority</label>
                        <Dropdown
                            value={createForm.priority}
                            options={priorityOptions}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, priority: e.value }))}
                            placeholder="Select Priority"
                            className="w-full"
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-sm font-medium mb-2">Message</label>
                        <InputTextarea
                            value={createForm.message}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, message: e.target.value }))}
                            rows={5}
                            placeholder="Enter message..."
                            className="w-full"
                        />
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
        </div>
    );
} 