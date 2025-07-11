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
    const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
    const [responseForm, setResponseForm] = useState<SupportFormData>({
        status: "OPEN",
        priority: "MEDIUM",
        adminResponse: "",
    });
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
    }, [currentPage, rowsPerPage]);

    const loadSupportRequests = async () => {
        setLoading(true);
        try {
            // Simulate API call
            const mockRequests: SupportRequest[] = Array.from({ length: 30 }, (_, i) => ({
                id: `request-${i + 1}`,
                userId: `user-${(i % 15) + 1}`,
                subject: `Support Request ${i + 1}`,
                message: `This is the message content for support request ${i + 1}. User is experiencing issues with ${i % 3 === 0 ? 'login' : i % 3 === 1 ? 'event registration' : 'document access'}.`,
                status: i % 4 === 0 ? "OPEN" : i % 4 === 1 ? "IN_PROGRESS" : i % 4 === 2 ? "RESOLVED" : "CLOSED",
                priority: i % 4 === 0 ? "LOW" : i % 4 === 1 ? "MEDIUM" : i % 4 === 2 ? "HIGH" : "URGENT",
                adminResponse: i > 20 ? `Admin response for request ${i + 1}` : undefined,
                createdAt: new Date(2024, 0, i + 1).toISOString(),
                updatedAt: new Date(2024, 0, i + 1).toISOString(),
                user: {
                    firstName: `User${(i % 15) + 1}`,
                    lastName: `Last${(i % 15) + 1}`,
                    email: `user${(i % 15) + 1}@example.com`,
                },
            }));

            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = startIndex + rowsPerPage;
            const paginatedRequests = mockRequests.slice(startIndex, endIndex);

            setRequests(paginatedRequests);
            setTotalRecords(mockRequests.length);
        } catch (error) {
            showToast("error", "Error", "Failed to load support requests");
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

    const openResponseDialog = (request: SupportRequest) => {
        setSelectedRequest(request);
        setResponseForm({
            status: request.status,
            priority: request.priority,
            adminResponse: request.adminResponse || "",
        });
        setShowResponseDialog(true);
    };

    const saveResponse = async () => {
        if (!selectedRequest) return;

        try {
            const updatedRequests = requests.map(req =>
                req.id === selectedRequest.id
                    ? { ...req, ...responseForm, updatedAt: new Date().toISOString() }
                    : req
            );
            setRequests(updatedRequests);
            showToast("success", "Success", "Response saved successfully");
            setShowResponseDialog(false);
        } catch (error) {
            showToast("error", "Error", "Failed to save response");
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
                <span className="text-600">Manage and respond to member support requests</span>
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
                    label="Export"
                    icon="pi pi-download"
                    severity="secondary"
                    onClick={() => {
                        showToast("info", "Info", "Export functionality would be implemented here");
                    }}
                />
            </div>
        </div>
    );

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
                        <Column field="subject" header="Subject" sortable style={{ minWidth: "200px" }} />
                        <Column field="user" header="User" body={userBodyTemplate} style={{ minWidth: "150px" }} />
                        <Column field="message" header="Message" body={messageBodyTemplate} style={{ minWidth: "250px" }} />
                        <Column field="status" header="Status" body={(rowData) => (
                            <Tag value={rowData.status.replace("_", " ")} severity={getStatusSeverity(rowData.status)} />
                        )} sortable style={{ minWidth: "120px" }} />
                        <Column field="priority" header="Priority" body={(rowData) => (
                            <Tag value={rowData.priority} severity={getPrioritySeverity(rowData.priority)} />
                        )} sortable style={{ minWidth: "120px" }} />
                        <Column field="createdAt" header="Created" body={(rowData) => (
                            new Date(rowData.createdAt).toLocaleDateString()
                        )} sortable style={{ minWidth: "120px" }} />
                        <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                    </DataTable>
                </Card>
            </div>

            {/* Response Dialog */}
            <Dialog
                visible={showResponseDialog}
                style={{ width: "700px" }}
                header={`Respond to: ${selectedRequest?.subject}`}
                modal
                className="p-fluid"
                onHide={() => setShowResponseDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowResponseDialog(false)} />
                        <Button label="Save Response" icon="pi pi-check" onClick={saveResponse} />
                    </div>
                }
            >
                {selectedRequest && (
                    <div className="grid">
                        <div className="col-12">
                            <h4>Original Request</h4>
                            <div className="p-3 surface-100 border-round">
                                <p><strong>From:</strong> {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}</p>
                                <p><strong>Subject:</strong> {selectedRequest.subject}</p>
                                <p><strong>Message:</strong></p>
                                <p className="text-600">{selectedRequest.message}</p>
                            </div>
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="status" className="font-bold">Status</label>
                            <Dropdown
                                id="status"
                                value={responseForm.status}
                                options={statusOptions}
                                onChange={(e) => setResponseForm({ ...responseForm, status: e.value })}
                                placeholder="Select Status"
                            />
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="priority" className="font-bold">Priority</label>
                            <Dropdown
                                id="priority"
                                value={responseForm.priority}
                                options={priorityOptions}
                                onChange={(e) => setResponseForm({ ...responseForm, priority: e.value })}
                                placeholder="Select Priority"
                            />
                        </div>

                        <div className="col-12">
                            <label htmlFor="adminResponse" className="font-bold">Admin Response</label>
                            <InputTextarea
                                id="adminResponse"
                                value={responseForm.adminResponse}
                                onChange={(e) => setResponseForm({ ...responseForm, adminResponse: e.target.value })}
                                rows={5}
                                placeholder="Enter your response to the user..."
                            />
                        </div>
                    </div>
                )}
            </Dialog>

            <Toast ref={toast} />
        </div>
    );
} 