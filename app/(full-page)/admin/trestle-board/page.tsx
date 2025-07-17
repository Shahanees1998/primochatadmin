"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { apiClient } from "@/lib/apiClient";
import { SortOrderType } from "@/types";

interface TrestleBoard {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    category: 'REGULAR_MEETING' | 'DISTRICT' | 'EMERGENT' | 'PRACTICE' | 'CGP' | 'SOCIAL';
    isRSVP: boolean;
    maxAttendees?: number;
    createdAt: string;
    updatedAt: string;
}

interface TrestleBoardFormData {
    title: string;
    description: string;
    startDate: Date | null;
    endDate: Date | null;
    startTime: string;
    endTime: string;
    location: string;
    category: 'REGULAR_MEETING' | 'DISTRICT' | 'EMERGENT' | 'PRACTICE' | 'CGP' | 'SOCIAL';
    isRSVP: boolean;
    maxAttendees: number;
}

export default function TrestleBoardPage() {
    const router = useRouter();
    const [trestleBoards, setTrestleBoards] = useState<TrestleBoard[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        title: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        category: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showTrestleBoardDialog, setShowTrestleBoardDialog] = useState(false);
    const [editingTrestleBoard, setEditingTrestleBoard] = useState<TrestleBoard | null>(null);
    const [trestleBoardForm, setTrestleBoardForm] = useState<TrestleBoardFormData>({
        title: "",
        description: "",
        startDate: null,
        endDate: null,
        startTime: "",
        endTime: "",
        location: "",
        category: "REGULAR_MEETING",
        isRSVP: false,
        maxAttendees: 0,
    });
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<SortOrderType | undefined>(undefined);
    const toast = useRef<Toast>(null);

    const categoryOptions = [
        { label: "Regular Meeting", value: "REGULAR_MEETING" },
        { label: "District", value: "DISTRICT" },
        { label: "Emergent", value: "EMERGENT" },
        { label: "Practice", value: "PRACTICE" },
        { label: "CGP", value: "CGP" },
        { label: "Social", value: "SOCIAL" },
    ];

    useEffect(() => {
        loadTrestleBoards();
    }, [currentPage, rowsPerPage, globalFilterValue, sortField, sortOrder]);

    const loadTrestleBoards = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getTrestleBoards({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setTrestleBoards(response.data?.trestleBoards || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            setError("Failed to load trestle boards. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load trestle boards");
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
        setCurrentPage(1); // Reset to first page when searching
    };

    const onSort = (trestleBoard: any) => {
        setSortField(trestleBoard.sortField);
        setSortOrder(trestleBoard.sortOrder);
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNewTrestleBoardDialog = () => {
        setEditingTrestleBoard(null);
        setTrestleBoardForm({
            title: "",
            description: "",
            startDate: null,
            endDate: null,
            startTime: "",
            endTime: "",
            location: "",
            category: "REGULAR_MEETING",
            isRSVP: false,
            maxAttendees: 0,
        });
        setShowTrestleBoardDialog(true);
    };

    const openEditTrestleBoardDialog = (trestleBoard: TrestleBoard) => {
        setEditingTrestleBoard(trestleBoard);
        setTrestleBoardForm({
            title: trestleBoard.title,
            description: trestleBoard.description || "",
            startDate: new Date(trestleBoard.startDate),
            endDate: trestleBoard.endDate ? new Date(trestleBoard.endDate) : null,
            startTime: trestleBoard.startTime || "",
            endTime: trestleBoard.endTime || "",
            location: trestleBoard.location || "",
            category: trestleBoard.category,
            isRSVP: trestleBoard.isRSVP,
            maxAttendees: trestleBoard.maxAttendees || 0,
        });
        setShowTrestleBoardDialog(true);
    };

    const saveTrestleBoard = async () => {
        // Validation
        if (!trestleBoardForm.title.trim()) {
            showToast("error", "Validation Error", "Title is required");
            return;
        }

        if (!trestleBoardForm.startDate) {
            showToast("error", "Validation Error", "Start date is required");
            return;
        }

        if (trestleBoardForm.endDate && trestleBoardForm.endDate < trestleBoardForm.startDate) {
            showToast("error", "Validation Error", "End date cannot be before start date");
            return;
        }

        setSaveLoading(true);
        try {
            const trestleBoardData = {
                ...trestleBoardForm,
                startDate: trestleBoardForm.startDate.toISOString(),
                endDate: trestleBoardForm.endDate?.toISOString(),
            };

            let response: any;
            if (editingTrestleBoard) {
                // Update existing trestleBoard
                response = await apiClient.updateTrestleBoard(editingTrestleBoard.id, trestleBoardData);
            } else {
                // Create new trestleBoard
                response = await apiClient.createTrestleBoard(trestleBoardData);
            }

            if (response.error) {
                throw new Error(response.error);
            }

            if (editingTrestleBoard) {
                const updatedTrestleBoards = trestleBoards.map(trestleBoard =>
                    trestleBoard.id === editingTrestleBoard.id ? response.data : trestleBoard
                );
                setTrestleBoards(updatedTrestleBoards);
                showToast("success", "Success", "TrestleBoard updated successfully");
            } else {
                setTrestleBoards([response.data, ...trestleBoards]);
                showToast("success", "Success", "TrestleBoard created successfully");
            }

            setShowTrestleBoardDialog(false);
        } catch (error) {
            showToast("error", "Error", error instanceof Error ? error.message : "Failed to save trestleBoard");
        } finally {
            setSaveLoading(false);
        }
    };

    const confirmDeleteTrestleBoard = (trestleBoard: TrestleBoard) => {
        confirmDialog({
            message: `Are you sure you want to delete "${trestleBoard.title}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteTrestleBoard(trestleBoard.id),
        });
    };

    const deleteTrestleBoard = async (trestleBoardId: string) => {
        try {
            const response = await apiClient.deleteTrestleBoard(trestleBoardId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            setTrestleBoards(trestleBoards.filter(trestleBoard => trestleBoard.id !== trestleBoardId));
            showToast("success", "Success", "TrestleBoard deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete trestleBoard");
        }
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

    const actionBodyTemplate = (rowData: TrestleBoard) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => router.push(`/admin/trestle-board/${rowData.id}`)}
                />
                <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Edit TrestleBoard"
                    onClick={() => openEditTrestleBoardDialog(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete TrestleBoard"
                    onClick={() => confirmDeleteTrestleBoard(rowData)}
                />
            </div>
        );
    };

    const header = useMemo(() => (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Trestle Board Management</h2>
                <span className="text-600">Create and manage all trestleBoards</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search trestleBoards..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Create TrestleBoard"
                    icon="pi pi-plus"
                    onClick={openNewTrestleBoardDialog}
                    severity="success"
                />
            </div>
        </div>
    ), [globalFilterValue]);

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    {error && (
                        <div className="p-error p-3 mb-3">{error}</div>
                    )}
                    {loading ? (
                        <DataTable
                            value={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
                            className="p-datatable-sm"
                            header={header}
                        >
                            <Column 
                                field="title" 
                                header="Title" 
                                body={() => (
                                    <div className="flex flex-column gap-1">
                                        <Skeleton width="200px" height="16px" />
                                        <Skeleton width="150px" height="14px" />
                                    </div>
                                )}
                                style={{ minWidth: "200px" }}
                            />
                            <Column 
                                field="startDate" 
                                header="Start Date" 
                                body={() => <Skeleton width="100px" height="16px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                field="location" 
                                header="Location" 
                                body={() => <Skeleton width="150px" height="16px" />}
                                style={{ minWidth: "150px" }}
                            />
                            <Column 
                                field="category" 
                                header="Category" 
                                body={() => <Skeleton width="80px" height="24px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                field="status" 
                                header="Status" 
                                body={() => <Skeleton width="80px" height="24px" />}
                                style={{ minWidth: "100px" }}
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
                                style={{ width: "120px" }}
                            />
                        </DataTable>
                    ) : (
                        <DataTable
                            value={trestleBoards}
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
                            emptyMessage={error ? "Unable to load trestleBoards. Please check your connection or try again later." : "No trestleBoards found."}
                            responsiveLayout="scroll"
                            onSort={onSort}
                            sortField={sortField}
                            sortOrder={sortOrder}
                            loadingIcon="pi pi-spinner"
                        >
                            <Column field="title" header="Title" style={{ minWidth: "200px" }} />
                            <Column field="startDate" header="Start Date" body={(rowData) => (
                                new Date(rowData.startDate).toLocaleDateString()
                            )} style={{ minWidth: "120px" }} />
                            <Column field="location" header="Location" style={{ minWidth: "150px" }} />
                            <Column field="category" header="Category" body={(rowData) => (
                                <Tag value={rowData.category} severity={getCategorySeverity(rowData.category)} />
                            )} style={{ minWidth: "120px" }} />
                            <Column field="isRSVP" header="RSVP" body={(rowData) => (
                                <Tag value={rowData.isRSVP ? "Yes" : "No"} severity={rowData.isRSVP ? "success" : "secondary"} />
                            )} style={{ minWidth: "80px" }} />
                            <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                        </DataTable>
                    )}
                </Card>
            </div>

            {/* TrestleBoard Dialog */}
            <Dialog
                visible={showTrestleBoardDialog}
                style={{ width: "700px" }}
                header={editingTrestleBoard ? "Edit TrestleBoard" : "Create New TrestleBoard"}
                modal
                className="p-fluid"
                onHide={() => setShowTrestleBoardDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowTrestleBoardDialog(false)} disabled={saveLoading} />
                        <Button
                            label={saveLoading ? "Saving..." : "Save"}
                            icon={saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
                            onClick={saveTrestleBoard}
                            disabled={saveLoading}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="title" className="font-bold">Title *</label>
                        <InputText
                            id="title"
                            value={trestleBoardForm.title}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="description" className="font-bold">Description</label>
                        <InputTextarea
                            id="description"
                            value={trestleBoardForm.description}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, description: e.target.value })}
                            rows={3}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="startDate" className="font-bold">Start Date *</label>
                        <Calendar
                            id="startDate"
                            value={trestleBoardForm.startDate}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, startDate: e.value as Date })}
                            showIcon
                            showTime
                            dateFormat="dd/mm/yy"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="endDate" className="font-bold">End Date</label>
                        <Calendar
                            id="endDate"
                            value={trestleBoardForm.endDate}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, endDate: e.value as Date })}
                            showIcon
                            showTime
                            dateFormat="dd/mm/yy"
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="location" className="font-bold">Location</label>
                        <InputText
                            id="location"
                            value={trestleBoardForm.location}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, location: e.target.value })}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="category" className="font-bold">Category *</label>
                        <Dropdown
                            id="category"
                            value={trestleBoardForm.category}
                            options={categoryOptions}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, category: e.value })}
                            placeholder="Select Category"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="maxAttendees" className="font-bold">Max Attendees</label>
                        <InputText
                            id="maxAttendees"
                            type="number"
                            value={trestleBoardForm.maxAttendees?.toString() || ''}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, maxAttendees: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="startTime" className="font-bold">Start Time</label>
                        <InputText
                            id="startTime"
                            type="time"
                            value={trestleBoardForm.startTime}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, startTime: e.target.value })}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="endTime" className="font-bold">End Time</label>
                        <InputText
                            id="endTime"
                            type="time"
                            value={trestleBoardForm.endTime}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, endTime: e.target.value })}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="font-bold">RSVP Required</label>
                        <div className="flex align-items-center mt-2">
                            <input
                                type="checkbox"
                                id="isRSVP"
                                checked={trestleBoardForm.isRSVP}
                                onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, isRSVP: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="isRSVP">Enable RSVP for this trestleBoard</label>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 