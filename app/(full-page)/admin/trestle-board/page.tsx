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
import { useDebounce } from "@/hooks/useDebounce";

interface TrestleBoard {
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    category: 'REGULAR_MEETING' | 'DISTRICT' | 'EMERGENT' | 'PRACTICE' | 'CGP' | 'SOCIAL';
    isRSVP: boolean;
    createdAt: string;
    updatedAt: string;
}

interface TrestleBoardFormData {
    title: string;
    description: string;
    date: Date | null;
    time: string;
    location: string;
    category: 'REGULAR_MEETING' | 'DISTRICT' | 'EMERGENT' | 'PRACTICE' | 'CGP' | 'SOCIAL';
    isRSVP: boolean;
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
    const [showUserCalendarDialog, setShowUserCalendarDialog] = useState(false);
    const [selectedTrestleBoard, setSelectedTrestleBoard] = useState<TrestleBoard | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [trestleBoardForm, setTrestleBoardForm] = useState<TrestleBoardFormData>({
        title: "",
        description: "",
        date: null,
        time: "",
        location: "",
        category: "REGULAR_MEETING",
        isRSVP: false,
    });
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<SortOrderType | undefined>(undefined);
    const toast = useRef<Toast>(null);
    const debouncedSearchTerm = useDebounce(userSearchQuery, 500);

    // Effect to trigger search when debounced term changes
    useEffect(() => {
        if (debouncedSearchTerm) {
            searchUsers(debouncedSearchTerm);
        } else {
            setFilteredUsers([]);
        }
    }, [debouncedSearchTerm]);

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
            date: null,
            time: "",
            location: "",
            category: "REGULAR_MEETING",
            isRSVP: false,
        });
        setShowTrestleBoardDialog(true);
    };

    const openEditTrestleBoardDialog = (trestleBoard: TrestleBoard) => {
        setEditingTrestleBoard(trestleBoard);
        setTrestleBoardForm({
            title: trestleBoard.title,
            description: trestleBoard.description || "",
            date: new Date(trestleBoard.date),
            time: trestleBoard.time || "",
            location: trestleBoard.location || "",
            category: trestleBoard.category,
            isRSVP: trestleBoard.isRSVP,
        });
        setShowTrestleBoardDialog(true);
    };

    const saveTrestleBoard = async () => {
        // Validation
        if (!trestleBoardForm.title.trim()) {
            showToast("error", "Validation Error", "Title is required");
            return;
        }

        if (!trestleBoardForm.date) {
            showToast("error", "Validation Error", "Date is required");
            return;
        }

        setSaveLoading(true);
        try {
            const trestleBoardData = {
                title: trestleBoardForm.title,
                description: trestleBoardForm.description,
                date: trestleBoardForm.date.toISOString(),
                time: trestleBoardForm.time,
                location: trestleBoardForm.location,
                category: trestleBoardForm.category,
                isRSVP: trestleBoardForm.isRSVP,
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
                    icon="pi pi-calendar-plus"
                    size="small"
                    text
                    severity="info"
                    tooltip="Add to User Calendar"
                    onClick={() => openUserCalendarDialog(rowData)}
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

    const openUserCalendarDialog = async (trestleBoard: TrestleBoard) => {
        setSelectedTrestleBoard(trestleBoard);
        setSelectedUser('');
        setUserSearchQuery('');
        setFilteredUsers([]);
        setShowUserCalendarDialog(true);
        // Load initial users
        await searchUsers('');
    };

    const searchUsers = async (query: string) => {
        try {
            setSearchingUsers(true);
            const response = await apiClient.getUsers({ 
                page: 1, 
                limit: 20,
                search: query.trim() || undefined
            });
            
            if (response.data && response.data.users) {
                setFilteredUsers(response.data.users);
            } else {
                setFilteredUsers([]);
            }
        } catch (error) {
            console.error('Error searching users:', error);
            showToast('error', 'Error', 'Failed to search users');
            setFilteredUsers([]);
        } finally {
            setSearchingUsers(false);
        }
    };



    const handleAddToUserCalendar = async () => {
        if (!selectedUser || !selectedTrestleBoard) {
            showToast('error', 'Error', 'Please select a user');
            return;
        }

        setCalendarLoading(true);
        try {
            const response = await apiClient.addCalendarEvent({
                userId: selectedUser,
                title: selectedTrestleBoard.title,
                description: selectedTrestleBoard.description || '',
                startDate: selectedTrestleBoard.date,
                endDate: undefined,
                startTime: selectedTrestleBoard.time || undefined,
                endTime: undefined,
                location: selectedTrestleBoard.location || '',
                eventType: 'TRESTLE_BOARD',
                trestleBoardId: selectedTrestleBoard.id
            });

            if (response.error) {
                throw new Error(response.error);
            }

            showToast('success', 'Success', 'Trestle board added to user\'s calendar successfully');
            setShowUserCalendarDialog(false);
            setSelectedUser('');
            setUserSearchQuery('');
            setFilteredUsers([]);
        } catch (error: any) {
            console.error('Error adding to user calendar:', error);
            showToast('error', 'Error', error.message || 'Failed to add trestle board to user calendar');
        } finally {
            setCalendarLoading(false);
        }
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
                    label="My Calendar"
                    icon="pi pi-calendar"
                    onClick={() => router.push('/admin/calendar')}
                    severity="info"
                />
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
                                field="date" 
                                header="Date" 
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
                            <Column field="date" header="Date" body={(rowData) => (
                                new Date(rowData.date).toLocaleDateString()
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
                        <label htmlFor="date" className="font-bold">Date *</label>
                        <Calendar
                            id="date"
                            value={trestleBoardForm.date}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, date: e.value as Date })}
                            showIcon
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
                        <label htmlFor="time" className="font-bold">Time</label>
                        <InputText
                            id="time"
                            type="time"
                            value={trestleBoardForm.time}
                            onChange={(e) => setTrestleBoardForm({ ...trestleBoardForm, time: e.target.value })}
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

            {/* User Calendar Dialog */}
            <Dialog
                visible={showUserCalendarDialog}
                style={{ width: "700px" }}
                header="Add Trestle Board to User Calendar"
                modal
                className="p-fluid"
                onHide={() => setShowUserCalendarDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowUserCalendarDialog(false)} disabled={calendarLoading} />
                        <Button
                            label={calendarLoading ? "Adding..." : "Add to Calendar"}
                            icon={calendarLoading ? "pi pi-spin pi-spinner" : "pi pi-calendar-plus"}
                            onClick={handleAddToUserCalendar}
                            disabled={calendarLoading || !selectedUser}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="userSearch" className="font-bold">Search Users</label>
                        <InputText
                            id="userSearch"
                            value={userSearchQuery}
                            onChange={(e) => {
                                const query = e.target.value;
                                setUserSearchQuery(query);
                            }}
                            placeholder="Type to search users (e.g., name, email, membership number)..."
                            className="w-full"
                        />
                        {searchingUsers && (
                            <div className="mt-2 text-sm text-gray-500">
                                <i className="pi pi-spin pi-spinner mr-2"></i>
                                Searching...
                            </div>
                        )}
                    </div>
                    <div className="col-12">
                        <label className="font-bold mb-2 block">Select User</label>
                        <div className="border-1 surface-border border-round max-h-40 overflow-y-auto">
                            {searchingUsers ? (
                                <div className="p-3 text-center text-600">
                                    <i className="pi pi-spin pi-spinner mr-2"></i>
                                    Searching users...
                                </div>
                            ) : userSearchQuery ? (
                                filteredUsers.length === 0 ? (
                                    <div className="p-3 text-center text-600">
                                        No users found for "{userSearchQuery}"
                                    </div>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            className={`p-3 cursor-pointer hover:surface-100 border-bottom-1 surface-border last:border-bottom-none ${
                                                selectedUser === user.id ? 'surface-100' : ''
                                            }`}
                                            onClick={() => {
                                                setSelectedUser(user.id);
                                                setUserSearchQuery(`${user.firstName} ${user.lastName} (${user.email})`);
                                            }}
                                        >
                                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                                            <div className="text-sm text-gray-600">{user.email}</div>
                                            <div className="text-sm text-gray-500">#{user.membershipNumber}</div>
                                        </div>
                                    ))
                                )
                            ) : (
                                <div className="p-3 text-center text-600">
                                    Start typing to search users (e.g., name, email, or membership number)
                                </div>
                            )}
                        </div>
                    </div>
                    {selectedUser && (
                        <div className="col-12">
                            <div className="p-3 bg-blue-50 border-round">
                                <div className="font-medium text-blue-900">Selected User:</div>
                                <div className="text-sm text-blue-700">
                                    {filteredUsers.find(u => u.id === selectedUser)?.firstName} {filteredUsers.find(u => u.id === selectedUser)?.lastName} ({filteredUsers.find(u => u.id === selectedUser)?.email})
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 