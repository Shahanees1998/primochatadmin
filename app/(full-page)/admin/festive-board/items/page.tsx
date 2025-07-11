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
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "primereact/skeleton";
import { SortOrderType } from "@/types";
import { apiClient } from "@/lib/apiClient";

interface FestiveBoardItem {
    id: string;
    festiveBoardId: string;
    userId: string;
    category: string;
    name: string;
    description?: string;
    isAssigned: boolean;
    createdAt: string;
    updatedAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    festiveBoard?: {
        title: string;
        date: string;
    };
}

interface ItemFormData {
    festiveBoardId: string;
    userId: string;
    category: string;
    name: string;
    description: string;
    isAssigned: boolean;
}

export default function FestiveBoardItemsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const boardId = searchParams.get('boardId');
    
    const [items, setItems] = useState<FestiveBoardItem[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [festiveBoards, setFestiveBoards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        category: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showItemDialog, setShowItemDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<FestiveBoardItem | null>(null);
    const [itemForm, setItemForm] = useState<ItemFormData>({
        festiveBoardId: boardId || "",
        userId: "",
        category: "DESSERT",
        name: "",
        description: "",
        isAssigned: false,
    });
    const [sortField, setSortField] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<SortOrderType>(-1);
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const toast = useRef<Toast>(null);

    const categoryOptions = [
        { label: "Dessert", value: "DESSERT" },
        { label: "Sides", value: "SIDES" },
        { label: "Drinks", value: "DRINKS" },
        { label: "Main Course", value: "MAIN_COURSE" },
    ];

    useEffect(() => {
        loadItems();
        loadUsers();
        loadFestiveBoards();
    }, [currentPage, rowsPerPage, boardId, globalFilterValue, sortField, sortOrder]);

    const loadItems = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!boardId) {
                setError("No board ID provided");
                return;
            }

            const response = await apiClient.getFestiveBoardItems(boardId, {
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setItems(response.data?.items || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            setError("Failed to load items. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load items");
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await apiClient.getUsers({ limit: 100, status: 'ACTIVE' });
            
            if (response.error) {
                throw new Error(response.error);
            }

            setUsers(response.data?.users || []);
        } catch (error) {
            showToast("error", "Error", "Failed to load users");
        }
    };

    const loadFestiveBoards = async () => {
        try {
            const response = await apiClient.getFestiveBoards({ limit: 100 });
            
            if (response.error) {
                throw new Error(response.error);
            }

            setFestiveBoards(response.data?.festiveBoards || []);
        } catch (error) {
            showToast("error", "Error", "Failed to load festive boards");
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

    const openNewItemDialog = () => {
        setEditingItem(null);
        setItemForm({
            festiveBoardId: boardId || "",
            userId: "",
            category: "DESSERT",
            name: "",
            description: "",
            isAssigned: false,
        });
        setShowItemDialog(true);
    };

    const openEditItemDialog = (item: FestiveBoardItem) => {
        setEditingItem(item);
        setItemForm({
            festiveBoardId: item.festiveBoardId,
            userId: item.userId,
            category: item.category,
            name: item.name,
            description: item.description || "",
            isAssigned: item.isAssigned,
        });
        setShowItemDialog(true);
    };

    const saveItem = async () => {
        if (!itemForm.festiveBoardId || !itemForm.userId || !itemForm.name) {
            showToast("error", "Validation Error", "Please fill in all required fields");
            return;
        }

        setSaveLoading(true);
        try {
            if (editingItem) {
                const response = await apiClient.updateFestiveBoardItem(editingItem.id, {
                    category: itemForm.category as 'DESSERT' | 'SIDES' | 'DRINKS' | 'MAIN_COURSE',
                    name: itemForm.name,
                    description: itemForm.description
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                showToast("success", "Success", "Item updated successfully");
            } else {
                const response = await apiClient.createFestiveBoardItem({
                    festiveBoardId: itemForm.festiveBoardId,
                    userId: itemForm.userId,
                    category: itemForm.category as 'DESSERT' | 'SIDES' | 'DRINKS' | 'MAIN_COURSE',
                    name: itemForm.name,
                    description: itemForm.description
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                showToast("success", "Success", "Item created successfully");
            }
            
            setShowItemDialog(false);
            await loadItems(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to save item");
        } finally {
            setSaveLoading(false);
        }
    };

    const confirmDeleteItem = (item: FestiveBoardItem) => {
        confirmDialog({
            message: `Are you sure you want to delete "${item.name}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteItem(item.id),
        });
    };

    const deleteItem = async (itemId: string) => {
        try {
            const response = await apiClient.deleteFestiveBoardItem(itemId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", "Item deleted successfully");
            await loadItems(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to delete item");
        }
    };

    const toggleAssignment = async (item: FestiveBoardItem) => {
        try {
            const response = await apiClient.updateFestiveBoardItem(item.id, {
                isAssigned: !item.isAssigned
            });

            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", `Item ${item.isAssigned ? 'unassigned' : 'assigned'} successfully`);
            await loadItems(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to update assignment");
        }
    };

    const getCategorySeverity = (category: string) => {
        switch (category) {
            case "DESSERT": return "success";
            case "SIDES": return "warning";
            case "DRINKS": return "info";
            case "MAIN_COURSE": return "danger";
            default: return "info";
        }
    };

    const actionBodyTemplate = (rowData: FestiveBoardItem) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon={rowData.isAssigned ? "pi pi-times" : "pi pi-check"}
                    size="small"
                    severity={rowData.isAssigned ? "danger" : "success"}
                    tooltip={rowData.isAssigned ? "Unassign" : "Assign"}
                    onClick={() => toggleAssignment(rowData)}
                />
                <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Edit Item"
                    onClick={() => openEditItemDialog(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete Item"
                    onClick={() => confirmDeleteItem(rowData)}
                />
            </div>
        );
    };

    const userBodyTemplate = (rowData: FestiveBoardItem) => {
        return rowData.user ? (
            <div>
                <div className="font-semibold">{`${rowData.user.firstName} ${rowData.user.lastName}`}</div>
                <div className="text-sm text-600">{rowData.user.email}</div>
            </div>
        ) : (
            <span className="text-600">Unassigned</span>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Festive Board Items</h2>
                <span className="text-600">Manage items and assignments for festive boards</span>
                {boardId && <span className="text-sm text-600">Filtered by Board ID: {boardId}</span>}
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search items..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Add Item"
                    icon="pi pi-plus"
                    onClick={openNewItemDialog}
                    severity="success"
                />
                <Button
                    label="All Boards"
                    icon="pi pi-list"
                    onClick={() => router.push('/admin/festive-board')}
                    severity="secondary"
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
                                            <Skeleton width="10%" height="1.5rem" />
                                            <Skeleton width="20%" height="1.5rem" />
                                            <Skeleton width="10%" height="1.5rem" />
                                            <Skeleton width="15%" height="1.5rem" />
                                            <div className="flex gap-2">
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
                            value={items}
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
                            globalFilterFields={["name", "description"]}
                            header={header}
                            emptyMessage={error ? "Unable to load items. Please check your connection or try again later." : "No items found."}
                            responsiveLayout="scroll"
                            onSort={onSort}
                            sortField={sortField}
                            sortOrder={sortOrder}
                            loadingIcon="pi pi-spinner"
                        >
                            <Column field="name" header="Item Name" sortable style={{ minWidth: "200px" }} />
                            <Column field="category" header="Category" body={(rowData) => (
                                <Tag value={rowData.category} severity={getCategorySeverity(rowData.category)} />
                            )} sortable style={{ minWidth: "120px" }} />
                            <Column field="user" header="Assigned To" body={userBodyTemplate} style={{ minWidth: "200px" }} />
                            <Column field="isAssigned" header="Status" body={(rowData) => (
                                <Tag value={rowData.isAssigned ? "Assigned" : "Available"} severity={rowData.isAssigned ? "success" : "warning"} />
                            )} style={{ minWidth: "120px" }} />
                            <Column field="festiveBoard.title" header="Board" body={(rowData) => (
                                rowData.festiveBoard?.title || "Unknown Board"
                            )} style={{ minWidth: "150px" }} />
                            <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                        </DataTable>
                    )}
                </Card>
            </div>

            {/* Item Dialog */}
            <Dialog
                visible={showItemDialog}
                style={{ width: "600px" }}
                header={editingItem ? "Edit Item" : "Add New Item"}
                modal
                className="p-fluid"
                onHide={() => setShowItemDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowItemDialog(false)}
                            disabled={saveLoading}
                        />
                        <Button 
                            label={saveLoading ? "Saving..." : "Save"} 
                            icon={saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"} 
                            onClick={saveItem}
                            disabled={saveLoading}
                        />
                    </div>
                }
            >
                <div className="grid">
                    {!boardId && (
                        <div className="col-12">
                            <label htmlFor="festiveBoardId" className="font-bold">Festive Board *</label>
                            <Dropdown
                                id="festiveBoardId"
                                value={itemForm.festiveBoardId}
                                options={festiveBoards}
                                optionLabel="title"
                                optionValue="id"
                                onChange={(e) => setItemForm({ ...itemForm, festiveBoardId: e.value })}
                                placeholder="Select Festive Board"
                                disabled={saveLoading}
                            />
                        </div>
                    )}
                    <div className="col-12">
                        <label htmlFor="name" className="font-bold">Item Name *</label>
                        <InputText
                            id="name"
                            value={itemForm.name}
                            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                            required
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="description" className="font-bold">Description</label>
                        <InputTextarea
                            id="description"
                            value={itemForm.description}
                            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                            rows={3}
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="category" className="font-bold">Category *</label>
                        <Dropdown
                            id="category"
                            value={itemForm.category}
                            options={categoryOptions}
                            onChange={(e) => setItemForm({ ...itemForm, category: e.value })}
                            placeholder="Select Category"
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="userId" className="font-bold">Assign To</label>
                        <Dropdown
                            id="userId"
                            value={itemForm.userId}
                            options={users}
                            optionLabel="firstName"
                            optionValue="id"
                            onChange={(e) => setItemForm({ ...itemForm, userId: e.value })}
                            placeholder="Select User"
                            disabled={saveLoading}
                        />
                    </div>
                    <div className="col-12">
                        <label className="font-bold">Assignment Status</label>
                        <div className="flex align-items-center mt-2">
                            <input
                                type="checkbox"
                                id="isAssigned"
                                checked={itemForm.isAssigned}
                                onChange={(e) => setItemForm({ ...itemForm, isAssigned: e.target.checked })}
                                className="mr-2"
                                disabled={saveLoading}
                            />
                            <label htmlFor="isAssigned">Mark as assigned</label>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 