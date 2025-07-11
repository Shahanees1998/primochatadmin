"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Skeleton } from "primereact/skeleton";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
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
        id: string;
        title: string;
        startDate: string;
    };
    items?: FestiveBoardItem[];
}

interface FestiveBoardItem {
    id: string;
    festiveBoardId: string;
    userId: string;
    category: 'DESSERT' | 'SIDES' | 'DRINKS' | 'MAIN_COURSE';
    name: string;
    description?: string;
    isAssigned: boolean;
    createdAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface ItemFormData {
    userId: string;
    category: 'DESSERT' | 'SIDES' | 'DRINKS' | 'MAIN_COURSE';
    name: string;
    description: string;
}

export default function FestiveBoardViewPage() {
    const params = useParams();
    const router = useRouter();
    const [festiveBoard, setFestiveBoard] = useState<FestiveBoard | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showItemDialog, setShowItemDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<FestiveBoardItem | null>(null);
    const [itemForm, setItemForm] = useState<ItemFormData>({
        userId: "",
        category: 'DESSERT',
        name: "",
        description: ""
    });
    const [saveLoading, setSaveLoading] = useState(false);
    const toast = useRef<Toast>(null);

    const boardId = params.id as string;

    useEffect(() => {
        if (boardId) {
            loadFestiveBoard();
            loadUsers();
        }
    }, [boardId]);

    const loadFestiveBoard = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getFestiveBoard(boardId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            if (response.data) {
                const boardData = {
                    ...response.data,
                    date: response.data.date instanceof Date ? response.data.date.toISOString() : response.data.date,
                    createdAt: response.data.createdAt instanceof Date ? response.data.createdAt.toISOString() : response.data.createdAt,
                    updatedAt: response.data.updatedAt instanceof Date ? response.data.updatedAt.toISOString() : response.data.updatedAt,
                } as FestiveBoard;
                setFestiveBoard(boardData);
            }
        } catch (error) {
            setError("Failed to load festive board. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load festive board");
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

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
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

    const openNewItemDialog = () => {
        setEditingItem(null);
        setItemForm({
            userId: "",
            category: 'DESSERT',
            name: "",
            description: ""
        });
        setShowItemDialog(true);
    };

    const openEditItemDialog = (item: FestiveBoardItem) => {
        setEditingItem(item);
        setItemForm({
            userId: item.userId,
            category: item.category,
            name: item.name,
            description: item.description || ""
        });
        setShowItemDialog(true);
    };

    const saveItem = async () => {
        if (!itemForm.userId || !itemForm.name) {
            showToast("error", "Validation Error", "Please fill in all required fields");
            return;
        }

        setSaveLoading(true);
        try {
            if (editingItem) {
                const response = await apiClient.updateFestiveBoardItem(editingItem.id, {
                    category: itemForm.category,
                    name: itemForm.name,
                    description: itemForm.description
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                showToast("success", "Success", "Item updated successfully");
            } else {
                const response = await apiClient.createFestiveBoardItem({
                    festiveBoardId: boardId,
                    userId: itemForm.userId,
                    category: itemForm.category,
                    name: itemForm.name,
                    description: itemForm.description
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                showToast("success", "Success", "Item added successfully");
            }
            
            setShowItemDialog(false);
            await loadFestiveBoard(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to save item");
        } finally {
            setSaveLoading(false);
        }
    };

    const deleteItem = async (itemId: string) => {
        try {
            const response = await apiClient.deleteFestiveBoardItem(itemId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", "Item deleted successfully");
            await loadFestiveBoard(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to delete item");
        }
    };

    const toggleItemAssignment = async (item: FestiveBoardItem) => {
        try {
            const response = await apiClient.updateFestiveBoardItem(item.id, {
                isAssigned: !item.isAssigned
            });

            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", `Item ${item.isAssigned ? 'unassigned' : 'assigned'} successfully`);
            await loadFestiveBoard(); // Reload to get updated data
        } catch (error) {
            showToast("error", "Error", "Failed to update item assignment");
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const userBodyTemplate = (rowData: FestiveBoardItem) => {
        return (
            <div className="flex align-items-center gap-2">
                <div>
                    <div className="font-semibold">
                        {rowData.user ? `${rowData.user.firstName} ${rowData.user.lastName}` : 'Unknown User'}
                    </div>
                    <div className="text-sm text-600">
                        {rowData.user?.email || 'No email'}
                    </div>
                </div>
            </div>
        );
    };

    const categoryBodyTemplate = (rowData: FestiveBoardItem) => {
        return (
            <Tag 
                value={rowData.category.replace('_', ' ')} 
                severity={getCategorySeverity(rowData.category)} 
            />
        );
    };

    const assignmentBodyTemplate = (rowData: FestiveBoardItem) => {
        return (
            <Button
                icon={rowData.isAssigned ? "pi pi-check" : "pi pi-times"}
                size="small"
                severity={rowData.isAssigned ? "success" : "secondary"}
                text
                tooltip={rowData.isAssigned ? "Unassign" : "Assign"}
                onClick={() => toggleItemAssignment(rowData)}
            />
        );
    };

    const actionBodyTemplate = (rowData: FestiveBoardItem) => {
        return (
            <div className="flex gap-2">
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
                    onClick={() => deleteItem(rowData.id)}
                />
            </div>
        );
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="grid">
                            <div className="col-12">
                                <Skeleton height="3rem" className="mb-3" />
                                <Skeleton width="60%" height="1.5rem" className="mb-4" />
                            </div>
                            <div className="col-12 md:col-6">
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                            </div>
                            <div className="col-12 md:col-6">
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="1.5rem" className="mb-3" />
                            </div>
                            <div className="col-12">
                                <Skeleton height="2rem" className="mb-2" />
                                <Skeleton height="8rem" className="mb-3" />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (error || !festiveBoard) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="text-center p-4">
                            <i className="pi pi-exclamation-triangle text-6xl text-orange-500 mb-3"></i>
                            <h2 className="text-2xl font-bold mb-2">Festive Board Not Found</h2>
                            <p className="text-600 mb-4">
                                {error || "The festive board you're looking for doesn't exist or has been removed."}
                            </p>
                            <Button 
                                label="Back to Festive Boards" 
                                icon="pi pi-arrow-left" 
                                onClick={() => router.push('/admin/festive-board')}
                                severity="secondary"
                            />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    const totalItems = festiveBoard.items?.length || 0;
    const assignedItems = festiveBoard.items?.filter(item => item.isAssigned).length || 0;

    return (
        <div className="grid">
            <div className="col-12">
                {/* Header */}
                <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                    <div className="flex flex-column">
                        <h1 className="text-3xl font-bold m-0">{festiveBoard.title}</h1>
                        <div className="flex align-items-center gap-2 mt-2">
                            <span className="text-600">Linked to: {festiveBoard.event?.title || 'No event'}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label="Back to Festive Boards"
                            icon="pi pi-arrow-left"
                            onClick={() => router.push('/admin/festive-board')}
                            severity="secondary"
                        />
                        {/* <Button
                            label="Add Item"
                            icon="pi pi-plus"
                            onClick={openNewItemDialog}
                            severity="success"
                        /> */}
                    </div>
                </div>

                <div className="grid">
                    {/* Festive Board Details Card */}
                    <div className="col-12 lg:col-8">
                        <Card>
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-2">Board Information</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-bold text-600">Date</label>
                                                <p className="text-lg">{formatDate(festiveBoard.date)}</p>
                                            </div>
                                            {festiveBoard.location && (
                                                <div>
                                                    <label className="font-bold text-600">Location</label>
                                                    <p className="text-lg">{festiveBoard.location}</p>
                                                </div>
                                            )}
                                            {festiveBoard.maxParticipants && (
                                                <div>
                                                    <label className="font-bold text-600">Max Participants</label>
                                                    <p className="text-lg">{festiveBoard.maxParticipants}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-2">Event Details</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="font-bold text-600">Event Title</label>
                                                <p className="text-lg">{festiveBoard.event?.title || 'No event linked'}</p>
                                            </div>
                                            {festiveBoard.event?.startDate && (
                                                <div>
                                                    <label className="font-bold text-600">Event Date</label>
                                                    <p className="text-lg">{formatDate(festiveBoard.event.startDate)}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {festiveBoard.description && (
                                    <div className="col-12">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                                            <p className="text-lg line-height-3">{festiveBoard.description}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Board Stats Card */}
                    <div className="col-12 lg:col-4">
                        <Card>
                            <h3 className="text-lg font-semibold mb-3">Board Statistics</h3>
                            <div className="space-y-4">
                                <div className="text-center p-3 bg-blue-50 border-round">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {totalItems}
                                    </div>
                                    <div className="text-600">Total Items</div>
                                </div>
                                <div className="text-center p-3 bg-green-50 border-round">
                                    <div className="text-2xl font-bold text-green-600">
                                        {assignedItems}
                                    </div>
                                    <div className="text-600">Assigned Items</div>
                                </div>
                                <div className="text-center p-3 bg-orange-50 border-round">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {totalItems - assignedItems}
                                    </div>
                                    <div className="text-600">Unassigned Items</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Items List */}
                    <div className="col-12">
                        <Card>
                            <h3 className="text-lg font-semibold mb-3">Board Items</h3>
                            {festiveBoard.items && festiveBoard.items.length > 0 ? (
                                <DataTable
                                    value={festiveBoard.items}
                                    paginator
                                    rows={10}
                                    responsiveLayout="scroll"
                                    emptyMessage="No items found."
                                >
                                    <Column 
                                        field="user.firstName" 
                                        header="Contributor" 
                                        body={userBodyTemplate}
                                        style={{ minWidth: "200px" }}
                                    />
                                    <Column 
                                        field="name" 
                                        header="Item Name" 
                                        style={{ minWidth: "150px" }}
                                    />
                                    <Column 
                                        field="category" 
                                        header="Category" 
                                        body={categoryBodyTemplate}
                                        style={{ minWidth: "120px" }}
                                    />
                                    <Column 
                                        field="description" 
                                        header="Description" 
                                        style={{ minWidth: "200px" }}
                                    />
                                    <Column 
                                        field="isAssigned" 
                                        header="Assigned" 
                                        body={assignmentBodyTemplate}
                                        style={{ minWidth: "100px" }}
                                    />
                                    <Column 
                                        body={actionBodyTemplate}
                                        style={{ width: "120px" }}
                                    />
                                </DataTable>
                            ) : (
                                <div className="text-center p-4">
                                    <i className="pi pi-list text-4xl text-gray-400 mb-3"></i>
                                    <p className="text-600">No items have been added to this board yet.</p>
                                    <Button
                                        label="Add First Item"
                                        icon="pi pi-plus"
                                        onClick={openNewItemDialog}
                                        severity="success"
                                        className="mt-3"
                                    />
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
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
                    {!editingItem && (
                        <div className="col-12">
                            <label htmlFor="userId" className="font-bold">Contributor *</label>
                            <Dropdown
                                id="userId"
                                value={itemForm.userId}
                                options={users.map(user => ({
                                    label: `${user.firstName} ${user.lastName}`,
                                    value: user.id
                                }))}
                                onChange={(e) => setItemForm({ ...itemForm, userId: e.value })}
                                placeholder="Select Contributor"
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
                        <label htmlFor="category" className="font-bold">Category *</label>
                        <Dropdown
                            id="category"
                            value={itemForm.category}
                            options={[
                                { label: 'Dessert', value: 'DESSERT' },
                                { label: 'Sides', value: 'SIDES' },
                                { label: 'Drinks', value: 'DRINKS' },
                                { label: 'Main Course', value: 'MAIN_COURSE' }
                            ]}
                            onChange={(e) => setItemForm({ ...itemForm, category: e.value })}
                            placeholder="Select Category"
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
                </div>
            </Dialog>

            <Toast ref={toast} />
        </div>
    );
} 