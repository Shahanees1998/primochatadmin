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
import { Calendar } from "primereact/calendar";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode } from "primereact/api";
import { useRouter } from "next/navigation";
import { Skeleton } from "primereact/skeleton";
import { SortOrderType } from "@/types";
import { apiClient } from "@/lib/apiClient";

interface FestiveBoard {
    id: string;
    eventId: string;
    title: string;
    description?: string;
    date: string;
    location?: string;
    maxParticipants?: number;
    createdAt: string;
    updatedAt: string;
    event?: {
        title: string;
        startDate: string;
    };
    items?: FestiveBoardItem[];
}

interface FestiveBoardItem {
    id: string;
    festiveBoardId: string;
    userId: string;
    category: string;
    name: string;
    description?: string;
    isAssigned: boolean;
    user?: {
        firstName: string;
        lastName: string;
    };
}

interface FestiveBoardFormData {
    eventId: string;
    title: string;
    description: string;
    date: Date | null;
    location: string;
    maxParticipants: number;
}

export default function FestiveBoardPage() {
    const router = useRouter();
    const [festiveBoards, setFestiveBoards] = useState<FestiveBoard[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        title: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    });
    const [showBoardDialog, setShowBoardDialog] = useState(false);
    const [editingBoard, setEditingBoard] = useState<FestiveBoard | null>(null);
    const [boardForm, setBoardForm] = useState<FestiveBoardFormData>({
        eventId: "",
        title: "",
        description: "",
        date: null,
        location: "",
        maxParticipants: 0,
    });
    const [sortField, setSortField] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<SortOrderType>(-1);
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const toast = useRef<Toast>(null);

    useEffect(() => {
        loadFestiveBoards();
        loadEvents();
    }, [currentPage, rowsPerPage, globalFilterValue, sortField, sortOrder]);

    const loadFestiveBoards = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getFestiveBoards({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setFestiveBoards(response.data?.festiveBoards || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            setError("Failed to load festive boards. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load festive boards");
        } finally {
            setLoading(false);
        }
    };

    const loadEvents = async () => {
        try {
            const response = await apiClient.getEvents({ limit: 100 });
            
            if (response.error) {
                throw new Error(response.error);
            }

            setEvents(response.data?.events || []);
        } catch (error) {
            showToast("error", "Error", "Failed to load events");
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

    const openNewBoardDialog = () => {
        setEditingBoard(null);
        setBoardForm({
            eventId: "",
            title: "",
            description: "",
            date: null,
            location: "",
            maxParticipants: 0,
        });
        setShowBoardDialog(true);
    };

    const openEditBoardDialog = (board: FestiveBoard) => {
        setEditingBoard(board);
        setBoardForm({
            eventId: board.eventId,
            title: board.title,
            description: board.description || "",
            date: new Date(board.date),
            location: board.location || "",
            maxParticipants: board.maxParticipants || 0,
        });
        setShowBoardDialog(true);
    };

    const saveBoard = async () => {
        if (!boardForm.eventId || !boardForm.title || !boardForm.date) {
            showToast("error", "Validation Error", "Please fill in all required fields");
            return;
        }

        setSaveLoading(true);
        try {
            const boardData = {
                ...boardForm,
                date: boardForm.date?.toISOString(),
            };

            if (editingBoard) {
                // Update existing board
                const response = await apiClient.updateFestiveBoard(editingBoard.id, boardData);

                if (response.error) {
                    throw new Error(response.error);
                }

                const updatedBoards = festiveBoards.map(board =>
                    board.id === editingBoard.id ? response.data : board
                );
                setFestiveBoards(updatedBoards);
                showToast("success", "Success", "Festive board updated successfully");
            } else {
                // Create new board
                const response = await apiClient.createFestiveBoard(boardData);

                if (response.error) {
                    throw new Error(response.error);
                }

                setFestiveBoards([response.data, ...festiveBoards]);
                setTotalRecords(prev => prev + 1);
                showToast("success", "Success", "Festive board created successfully");
            }
            setShowBoardDialog(false);
        } catch (error) {
            showToast("error", "Error", "Failed to save festive board");
        } finally {
            setSaveLoading(false);
        }
    };

    const confirmDeleteBoard = (board: FestiveBoard) => {
        confirmDialog({
            message: `Are you sure you want to delete "${board.title}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteBoard(board.id),
        });
    };

    const deleteBoard = async (boardId: string) => {
        try {
            const response = await apiClient.deleteFestiveBoard(boardId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            const updatedBoards = festiveBoards.filter(board => board.id !== boardId);
            setFestiveBoards(updatedBoards);
            setTotalRecords(prev => prev - 1);
            showToast("success", "Success", "Festive board deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete festive board");
        }
    };

    const actionBodyTemplate = (rowData: FestiveBoard) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => router.push(`/admin/festive-board/${rowData.id}`)}
                />
                <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Edit Board"
                    onClick={() => openEditBoardDialog(rowData)}
                />
                <Button
                    icon="pi pi-list"
                    size="small"
                    text
                    severity="info"
                    tooltip="Manage Items"
                    onClick={() => router.push(`/admin/festive-board/items?boardId=${rowData.id}`)}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete Board"
                    onClick={() => confirmDeleteBoard(rowData)}
                />
            </div>
        );
    };

    const itemsBodyTemplate = (rowData: FestiveBoard) => {
        const itemCount = rowData.items?.length || 0;
        const assignedCount = rowData.items?.filter(item => item.isAssigned).length || 0;
        return (
            <div className="flex flex-column">
                <span className="font-semibold">{itemCount} items</span>
                <span className="text-sm text-600">{assignedCount} assigned</span>
            </div>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Festive Board Management</h2>
                <span className="text-600">Create and manage festive boards for events</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search boards..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Create Board"
                    icon="pi pi-plus"
                    onClick={openNewBoardDialog}
                    severity="success"
                />
            </div>
        </div>
    );

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    {error && (
                        <div className="p-error p-3 mb-3">{error}</div>
                    )}
                    {loading ? (
                        <div className="p-4">
                            <div className="grid">
                                {[...Array(5)].map((_, i) => (
                                    <div className="col-12" key={i}>
                                        <div className="flex align-items-center gap-3">
                                            <Skeleton width="20%" height="1.5rem" />
                                            <Skeleton width="15%" height="1.5rem" />
                                            <Skeleton width="10%" height="1.5rem" />
                                            <Skeleton width="15%" height="1.5rem" />
                                            <Skeleton width="10%" height="1.5rem" />
                                            <Skeleton width="10%" height="1.5rem" />
                                            <div className="flex gap-2">
                                                <Skeleton width="2rem" height="2rem" />
                                                <Skeleton width="2rem" height="2rem" />
                                                <Skeleton width="2rem" height="2rem" />
                                                <Skeleton width="2rem" height="2rem" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <DataTable
                            value={festiveBoards}
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
                            emptyMessage={error ? "Unable to load festive boards. Please check your connection or try again later." : "No festive boards found."}
                            responsiveLayout="scroll"
                            onSort={onSort}
                            sortField={sortField}
                            sortOrder={sortOrder}
                            loadingIcon="pi pi-spinner"
                        >
                            <Column field="title" header="Title" sortable style={{ minWidth: "200px" }} />
                            <Column field="event.title" header="Linked Event" body={(rowData) => (
                                rowData.event?.title || "No event linked"
                            )} style={{ minWidth: "150px" }} />
                            <Column field="date" header="Date" body={(rowData) => (
                                new Date(rowData.date).toLocaleDateString()
                            )} sortable style={{ minWidth: "120px" }} />
                            <Column field="location" header="Location" style={{ minWidth: "150px" }} />
                            <Column field="maxParticipants" header="Max Participants" style={{ minWidth: "150px" }} />
                            <Column header="Items" body={itemsBodyTemplate} style={{ minWidth: "120px" }} />
                            <Column body={actionBodyTemplate} style={{ width: "200px" }} />
                        </DataTable>
                    )}
                </Card>
            </div>

            {/* Festive Board Dialog */}
            <Dialog
                visible={showBoardDialog}
                style={{ width: "600px" }}
                header={editingBoard ? "Edit Festive Board" : "Create New Festive Board"}
                modal
                className="p-fluid"
                onHide={() => setShowBoardDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowBoardDialog(false)}
                            disabled={saveLoading}
                        />
                        <Button 
                            label={saveLoading ? "Saving..." : "Save"} 
                            icon={saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"} 
                            onClick={saveBoard}
                            disabled={saveLoading}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="eventId" className="font-bold">Linked Event *</label>
                        <Dropdown
                            id="eventId"
                            value={boardForm.eventId}
                            options={events}
                            optionLabel="title"
                            optionValue="id"
                            onChange={(e) => setBoardForm({ ...boardForm, eventId: e.value })}
                            placeholder="Select Event"
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="title" className="font-bold">Title *</label>
                        <InputText
                            id="title"
                            value={boardForm.title}
                            onChange={(e) => setBoardForm({ ...boardForm, title: e.target.value })}
                            required
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="description" className="font-bold">Description</label>
                        <InputTextarea
                            id="description"
                            value={boardForm.description}
                            onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
                            rows={3}
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="date" className="font-bold">Date *</label>
                        <Calendar
                            id="date"
                            value={boardForm.date}
                            onChange={(e) => setBoardForm({ ...boardForm, date: e.value as Date })}
                            showIcon
                            dateFormat="dd/mm/yy"
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="maxParticipants" className="font-bold">Max Participants</label>
                        <InputText
                            id="maxParticipants"
                            type="number"
                            value={boardForm.maxParticipants?.toString() || ''}
                            onChange={(e) => setBoardForm({ ...boardForm, maxParticipants: parseInt(e.target.value) || 0 })}
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="location" className="font-bold">Location</label>
                        <InputText
                            id="location"
                            value={boardForm.location}
                            onChange={(e) => setBoardForm({ ...boardForm, location: e.target.value })}
                            disabled={saveLoading}
                        />
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 