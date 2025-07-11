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
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { useRouter } from "next/navigation";

interface ChatMessage {
    id: string;
    senderId: string;
    content: string;
    type: string;
    isFlagged: boolean;
    flagReason?: string;
    isModerated: boolean;
    moderationAction?: string;
    createdAt: string;
    sender?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface ModerationAction {
    messageId: string;
    action: string;
    reason: string;
}

export default function ModerationPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        content: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        isFlagged: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showModerationDialog, setShowModerationDialog] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
    const [moderationForm, setModerationForm] = useState<ModerationAction>({
        messageId: "",
        action: "WARN",
        reason: "",
    });
    const toast = useRef<Toast>(null);

    const actionOptions = [
        { label: "Warning", value: "WARN" },
        { label: "Hide Message", value: "HIDE" },
        { label: "Delete Message", value: "DELETE" },
        { label: "Suspend User", value: "SUSPEND" },
        { label: "Ban User", value: "BAN" },
    ];

    const flagReasonOptions = [
        { label: "Inappropriate Content", value: "INAPPROPRIATE" },
        { label: "Spam", value: "SPAM" },
        { label: "Harassment", value: "HARASSMENT" },
        { label: "Offensive Language", value: "OFFENSIVE" },
        { label: "Other", value: "OTHER" },
    ];

    useEffect(() => {
        loadMessages();
    }, [currentPage, rowsPerPage]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            // Simulate API call
            const mockMessages: ChatMessage[] = Array.from({ length: 25 }, (_, i) => ({
                id: `msg-${i + 1}`,
                senderId: `user-${(i % 10) + 1}`,
                content: `This is message content ${i + 1}. ${i % 5 === 0 ? 'This message contains potentially inappropriate content that needs moderation.' : 'This is a normal message.'}`,
                type: "TEXT",
                isFlagged: i % 3 === 0,
                flagReason: i % 3 === 0 ? (i % 4 === 0 ? "INAPPROPRIATE" : i % 4 === 1 ? "SPAM" : "HARASSMENT") : undefined,
                isModerated: i > 15,
                moderationAction: i > 15 ? (i % 3 === 0 ? "WARN" : "HIDE") : undefined,
                createdAt: new Date(2024, 0, i + 1).toISOString(),
                sender: {
                    firstName: `User${(i % 10) + 1}`,
                    lastName: `Last${(i % 10) + 1}`,
                    email: `user${(i % 10) + 1}@example.com`,
                },
            }));

            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = startIndex + rowsPerPage;
            const paginatedMessages = mockMessages.slice(startIndex, endIndex);

            setMessages(paginatedMessages);
            setTotalRecords(mockMessages.length);
        } catch (error) {
            showToast("error", "Error", "Failed to load messages");
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

    const openModerationDialog = (message: ChatMessage) => {
        setSelectedMessage(message);
        setModerationForm({
            messageId: message.id,
            action: "WARN",
            reason: "",
        });
        setShowModerationDialog(true);
    };

    const applyModeration = async () => {
        if (!moderationForm.reason.trim()) {
            showToast("error", "Error", "Please provide a reason for the moderation action");
            return;
        }

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const updatedMessages = messages.map(msg =>
                msg.id === moderationForm.messageId
                    ? { ...msg, isModerated: true, moderationAction: moderationForm.action }
                    : msg
            );
            setMessages(updatedMessages);
            setShowModerationDialog(false);
            showToast("success", "Success", `Moderation action applied: ${moderationForm.action}`);
        } catch (error) {
            showToast("error", "Error", "Failed to apply moderation action");
        }
    };

    const confirmDeleteMessage = (message: ChatMessage) => {
        confirmDialog({
            message: `Are you sure you want to delete this message?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteMessage(message.id),
        });
    };

    const deleteMessage = async (messageId: string) => {
        try {
            const updatedMessages = messages.filter(msg => msg.id !== messageId);
            setMessages(updatedMessages);
            setTotalRecords(prev => prev - 1);
            showToast("success", "Success", "Message deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete message");
        }
    };

    const getFlagReasonSeverity = (reason: string) => {
        switch (reason) {
            case "INAPPROPRIATE": return "warning";
            case "SPAM": return "info";
            case "HARASSMENT": return "danger";
            case "OFFENSIVE": return "danger";
            case "OTHER": return "secondary";
            default: return "info";
        }
    };

    const getModerationActionSeverity = (action: string) => {
        switch (action) {
            case "WARN": return "warning";
            case "HIDE": return "info";
            case "DELETE": return "danger";
            case "SUSPEND": return "danger";
            case "BAN": return "danger";
            default: return "info";
        }
    };

    const actionBodyTemplate = (rowData: ChatMessage) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-shield"
                    size="small"
                    text
                    severity="warning"
                    tooltip="Moderate"
                    onClick={() => openModerationDialog(rowData)}
                />
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
                    tooltip="Delete Message"
                    onClick={() => confirmDeleteMessage(rowData)}
                />
            </div>
        );
    };

    const senderBodyTemplate = (rowData: ChatMessage) => {
        return rowData.sender ? (
            <div>
                <div className="font-semibold">{`${rowData.sender.firstName} ${rowData.sender.lastName}`}</div>
                <div className="text-sm text-600">{rowData.sender.email}</div>
            </div>
        ) : (
            <span className="text-600">Unknown Sender</span>
        );
    };

    const contentBodyTemplate = (rowData: ChatMessage) => {
        return (
            <div className="max-w-xs">
                <div className="text-sm">
                    {rowData.content.length > 100 
                        ? `${rowData.content.substring(0, 100)}...` 
                        : rowData.content
                    }
                </div>
            </div>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Chat Moderation</h2>
                <span className="text-600">Monitor and moderate chat messages</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search messages..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Flagged Only"
                    icon="pi pi-flag"
                    severity="warning"
                    onClick={() => {
                        showToast("info", "Info", "Filter functionality would be implemented here");
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
                        value={messages}
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
                        globalFilterFields={["content"]}
                        header={header}
                        emptyMessage="No messages found."
                        responsiveLayout="scroll"
                    >
                        <Column field="sender" header="Sender" body={senderBodyTemplate} style={{ minWidth: "200px" }} />
                        <Column field="content" header="Content" body={contentBodyTemplate} style={{ minWidth: "300px" }} />
                        <Column field="isFlagged" header="Flagged" body={(rowData) => (
                            rowData.isFlagged ? (
                                <div>
                                    <Tag value="Flagged" severity="danger" />
                                    {rowData.flagReason && (
                                        <Tag value={rowData.flagReason.replace("_", " ")} severity={getFlagReasonSeverity(rowData.flagReason)} className="ml-1" />
                                    )}
                                </div>
                            ) : (
                                <Tag value="Clean" severity="success" />
                            )
                        )} style={{ minWidth: "150px" }} />
                        <Column field="isModerated" header="Moderated" body={(rowData) => (
                            rowData.isModerated ? (
                                <div>
                                    <Tag value="Moderated" severity="info" />
                                    {rowData.moderationAction && (
                                        <Tag value={rowData.moderationAction} severity={getModerationActionSeverity(rowData.moderationAction)} className="ml-1" />
                                    )}
                                </div>
                            ) : (
                                <Tag value="Pending" severity="warning" />
                            )
                        )} style={{ minWidth: "150px" }} />
                        <Column field="createdAt" header="Date" body={(rowData) => (
                            new Date(rowData.createdAt).toLocaleDateString()
                        )} sortable style={{ minWidth: "120px" }} />
                        <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                    </DataTable>
                </Card>
            </div>

            {/* Moderation Dialog */}
            <Dialog
                visible={showModerationDialog}
                style={{ width: "600px" }}
                header="Apply Moderation Action"
                modal
                className="p-fluid"
                onHide={() => setShowModerationDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowModerationDialog(false)} />
                        <Button label="Apply Action" icon="pi pi-shield" onClick={applyModeration} severity="warning" />
                    </div>
                }
            >
                {selectedMessage && (
                    <div className="grid">
                        <div className="col-12">
                            <h4>Message Content</h4>
                            <div className="p-3 surface-100 border-round">
                                <p>{selectedMessage.content}</p>
                            </div>
                        </div>
                        <div className="col-12">
                            <h4>Sender</h4>
                            <p>{selectedMessage.sender?.firstName} {selectedMessage.sender?.lastName} ({selectedMessage.sender?.email})</p>
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="action" className="font-bold">Moderation Action *</label>
                            <Dropdown
                                id="action"
                                value={moderationForm.action}
                                options={actionOptions}
                                onChange={(e) => setModerationForm({ ...moderationForm, action: e.value })}
                                placeholder="Select Action"
                            />
                        </div>
                        <div className="col-12">
                            <label htmlFor="reason" className="font-bold">Reason *</label>
                            <InputText
                                id="reason"
                                value={moderationForm.reason}
                                onChange={(e) => setModerationForm({ ...moderationForm, reason: e.target.value })}
                                placeholder="Provide a reason for this action"
                                required
                            />
                        </div>
                    </div>
                )}
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 