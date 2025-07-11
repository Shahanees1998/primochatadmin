"use client";

import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { useRouter } from "next/navigation";

interface Message {
    id: string;
    senderId: string;
    content: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    sender?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

export default function MessagesPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        content: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        type: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showMessageDialog, setShowMessageDialog] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const toast = useRef<Toast>(null);

    useEffect(() => {
        loadMessages();
    }, [currentPage, rowsPerPage]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            // Simulate API call
            const mockMessages: Message[] = Array.from({ length: 25 }, (_, i) => ({
                id: `msg-${i + 1}`,
                senderId: `user-${(i % 10) + 1}`,
                content: `This is message content ${i + 1}. It contains some information that needs to be displayed.`,
                type: i % 3 === 0 ? "TEXT" : i % 3 === 1 ? "IMAGE" : "FILE",
                isRead: i % 2 === 0,
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

    const viewMessage = (message: Message) => {
        setSelectedMessage(message);
        setShowMessageDialog(true);
    };

    const confirmDeleteMessage = (message: Message) => {
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

    const getTypeSeverity = (type: string) => {
        switch (type) {
            case "TEXT": return "info";
            case "IMAGE": return "success";
            case "FILE": return "warning";
            default: return "info";
        }
    };

    const actionBodyTemplate = (rowData: Message) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Message"
                    onClick={() => viewMessage(rowData)}
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

    const senderBodyTemplate = (rowData: Message) => {
        return rowData.sender ? (
            <div>
                <div className="font-semibold">{`${rowData.sender.firstName} ${rowData.sender.lastName}`}</div>
                <div className="text-sm text-600">{rowData.sender.email}</div>
            </div>
        ) : (
            <span className="text-600">Unknown Sender</span>
        );
    };

    const contentBodyTemplate = (rowData: Message) => {
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
                <h2 className="text-2xl font-bold m-0">Messages</h2>
                <span className="text-600">View and manage system messages</span>
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
                    label="Send Announcement"
                    icon="pi pi-send"
                    onClick={() => router.push('/admin/communications/announcement')}
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
                        <Column field="type" header="Type" body={(rowData) => (
                            <Tag value={rowData.type} severity={getTypeSeverity(rowData.type)} />
                        )} style={{ minWidth: "100px" }} />
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

            {/* Message Dialog */}
            <Dialog
                visible={showMessageDialog}
                style={{ width: "600px" }}
                header="Message Details"
                modal
                onHide={() => setShowMessageDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Close" icon="pi pi-times" onClick={() => setShowMessageDialog(false)} />
                    </div>
                }
            >
                {selectedMessage && (
                    <div className="grid">
                        <div className="col-12">
                            <h4>From: {selectedMessage.sender?.firstName} {selectedMessage.sender?.lastName}</h4>
                            <p className="text-600">{selectedMessage.sender?.email}</p>
                        </div>
                        <div className="col-12">
                            <h4>Message Type</h4>
                            <Tag value={selectedMessage.type} severity={getTypeSeverity(selectedMessage.type)} />
                        </div>
                        <div className="col-12">
                            <h4>Content</h4>
                            <div className="p-3 surface-100 border-round">
                                <p>{selectedMessage.content}</p>
                            </div>
                        </div>
                        <div className="col-12">
                            <h4>Date</h4>
                            <p>{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                )}
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 