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
import { Skeleton } from "primereact/skeleton";
import { useRouter } from "next/navigation";

interface Moderator {
    id: string;
    userId: string;
    permissions: string[];
    isActive: boolean;
    assignedAreas: string[];
    createdAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        status: string;
    };
}

interface ModeratorFormData {
    userId: string;
    permissions: string[];
    assignedAreas: string[];
    isActive: boolean;
}

export default function ModeratorsPage() {
    const router = useRouter();
    const [moderators, setModerators] = useState<Moderator[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<1 | 0 | -1 | undefined>(undefined);
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        isActive: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showModeratorDialog, setShowModeratorDialog] = useState(false);
    const [editingModerator, setEditingModerator] = useState<Moderator | null>(null);
    const [moderatorForm, setModeratorForm] = useState<ModeratorFormData>({
        userId: "",
        permissions: [],
        assignedAreas: [],
        isActive: true,
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const toast = useRef<Toast>(null);

    const permissionOptions = [
        { label: "Chat Moderation", value: "CHAT_MODERATION" },
        { label: "Content Review", value: "CONTENT_REVIEW" },
        { label: "User Management", value: "USER_MANAGEMENT" },
        { label: "Support Requests", value: "SUPPORT_REQUESTS" },
        { label: "Event Moderation", value: "EVENT_MODERATION" },
    ];

    const areaOptions = [
        { label: "General Chat", value: "GENERAL_CHAT" },
        { label: "Event Discussions", value: "EVENT_DISCUSSIONS" },
        { label: "Support Forum", value: "SUPPORT_FORUM" },
        { label: "Document Comments", value: "DOCUMENT_COMMENTS" },
        { label: "Festive Board", value: "FESTIVE_BOARD" },
    ];

    useEffect(() => {
        loadModerators();
    }, [currentPage, rowsPerPage, globalFilterValue, sortField, sortOrder]);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadModerators = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: rowsPerPage.toString(),
                search: globalFilterValue,
            });
            if (sortField) params.append('sortField', sortField);
            if (sortOrder) params.append('sortOrder', sortOrder === 1 ? 'asc' : 'desc');
            const response = await fetch(`/api/admin/moderators?${params}`);
            if (!response.ok) throw new Error('Failed to fetch moderators');
            const data = await response.json();
            setModerators(data.moderators);
            setTotalRecords(data.pagination.total);
        } catch (error) {
            showToast("error", "Error", "Failed to load moderators");
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const response = await fetch('/api/admin/users?page=1&limit=100&status=ACTIVE');
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.users || []);
        } catch (error) {
            showToast("error", "Error", "Failed to load users");
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setGlobalFilterValue(value);
        setCurrentPage(1);
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNewModeratorDialog = () => {
        setEditingModerator(null);
        setModeratorForm({
            userId: "",
            permissions: [],
            assignedAreas: [],
            isActive: true,
        });
        setShowModeratorDialog(true);
    };

    const openEditModeratorDialog = (moderator: Moderator) => {
        setEditingModerator(moderator);
        setModeratorForm({
            userId: moderator.userId,
            permissions: moderator.permissions,
            assignedAreas: moderator.assignedAreas,
            isActive: moderator.isActive,
        });
        setShowModeratorDialog(true);
    };

    const saveModerator = async () => {
        if (!moderatorForm.userId || moderatorForm.permissions.length === 0) {
            showToast("error", "Error", "Please select a user and at least one permission");
            return;
        }
        
        setSaving(true);
        try {
            if (editingModerator) {
                // Update
                const response = await fetch(`/api/admin/moderators`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editingModerator.id,
                        ...moderatorForm,
                    }),
                });
                if (!response.ok) throw new Error('Failed to update moderator');
                showToast("success", "Success", "Moderator updated successfully");
            } else {
                // Create
                const response = await fetch(`/api/admin/moderators`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(moderatorForm),
                });
                if (!response.ok) throw new Error('Failed to add moderator');
                showToast("success", "Success", "Moderator added successfully");
            }
            setShowModeratorDialog(false);
            await loadModerators();
        } catch (error) {
            console.error('Error saving moderator:', error);
            showToast("error", "Error", "Failed to save moderator");
        } finally {
            setSaving(false);
        }
    };

    const confirmDeleteModerator = (moderator: Moderator) => {
        confirmDialog({
            message: `Are you sure you want to remove "${moderator.user?.firstName} ${moderator.user?.lastName}" as a moderator?`,
            header: "Remove Moderator",
            icon: "pi pi-exclamation-triangle",
            accept: () => deleteModerator(moderator.id),
        });
    };

    const deleteModerator = async (moderatorId: string) => {
        setDeleting(moderatorId);
        try {
            const response = await fetch(`/api/admin/moderators/${moderatorId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete moderator');
            showToast("success", "Success", "Moderator deleted successfully");
            await loadModerators();
        } catch (error) {
            console.error('Error deleting moderator:', error);
            showToast("error", "Error", "Failed to delete moderator");
        } finally {
            setDeleting(null);
        }
    };

    const actionBodyTemplate = (rowData: Moderator) => {
        const isDeleting = deleting === rowData.id;
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Edit"
                    onClick={() => openEditModeratorDialog(rowData)}
                    disabled={isDeleting}
                />
                <Button
                    icon={isDeleting ? "pi pi-spinner pi-spin" : "pi pi-trash"}
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete"
                    onClick={() => confirmDeleteModerator(rowData)}
                    loading={isDeleting}
                    disabled={isDeleting}
                />
            </div>
        );
    };

    const userBodyTemplate = (rowData: Moderator) => {
        return rowData.user ? (
            <div>
                <div className="font-semibold">{`${rowData.user.firstName} ${rowData.user.lastName}`}</div>
                <div className="text-sm text-600">{rowData.user.email}</div>
            </div>
        ) : (
            <span className="text-600">Unknown User</span>
        );
    };

    const permissionsBodyTemplate = (rowData: Moderator) => {
        return (
            <div className="flex flex-wrap gap-1">
                {rowData.permissions.map((permission, index) => (
                    <Tag 
                        key={index}
                        value={permission.replace("_", " ")} 
                        severity="info" 
                        className="text-xs"
                    />
                ))}
            </div>
        );
    };

    const areasBodyTemplate = (rowData: Moderator) => {
        return (
            <div className="flex flex-wrap gap-1">
                {rowData.assignedAreas.map((area, index) => (
                    <Tag 
                        key={index}
                        value={area.replace("_", " ")} 
                        severity="success" 
                        className="text-xs"
                    />
                ))}
            </div>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Moderators</h2>
                <span className="text-600">Manage chat and content moderators</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search moderators..."
                        className="w-full"
                        disabled={loading}
                    />
                </span>
                <Button
                    label="Add Moderator"
                    icon="pi pi-user-plus"
                    onClick={openNewModeratorDialog}
                    severity="success"
                    disabled={saving}
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
                                field="firstName" 
                                header="Name" 
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
                                field="email" 
                                header="Email" 
                                body={() => <Skeleton width="200px" height="16px" />}
                                style={{ minWidth: "200px" }}
                            />
                            <Column 
                                field="role" 
                                header="Role" 
                                body={() => <Skeleton width="100px" height="24px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                field="permissions" 
                                header="Permissions" 
                                body={() => (
                                    <div className="flex gap-1">
                                        <Skeleton width="60px" height="20px" />
                                        <Skeleton width="60px" height="20px" />
                                        <Skeleton width="60px" height="20px" />
                                    </div>
                                )}
                                style={{ minWidth: "200px" }}
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
                                        <Skeleton width="32px" height="32px" />
                                    </div>
                                )}
                                style={{ width: "120px" }}
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
                        value={moderators}
                        paginator
                        rows={rowsPerPage}
                        totalRecords={totalRecords}
                        lazy
                        first={(currentPage - 1) * rowsPerPage}
                        onPage={(e) => {
                            setCurrentPage((e.page || 0) + 1);
                            setRowsPerPage(e.rows || 10);
                        }}
                        onSort={(e) => {
                            setSortField(e.sortField);
                            setSortOrder((e.sortOrder ?? 0) as 1 | 0 | -1);
                        }}
                        sortField={sortField}
                        sortOrder={sortOrder}
                        filters={filters}
                        filterDisplay="menu"
                        globalFilterFields={["user.firstName", "user.lastName", "user.email"]}
                        header={header}
                        emptyMessage="No moderators found."
                        responsiveLayout="scroll"
                    >
                        <Column field="user" header="Moderator" body={userBodyTemplate} style={{ minWidth: "200px" }} />
                        <Column field="permissions" header="Permissions" body={permissionsBodyTemplate} style={{ minWidth: "200px" }} />
                        <Column field="assignedAreas" header="Assigned Areas" body={areasBodyTemplate} style={{ minWidth: "200px" }} />
                        <Column field="isActive" header="Status" body={(rowData) => (
                            <Tag value={rowData.isActive ? "Active" : "Inactive"} severity={rowData.isActive ? "success" : "secondary"} />
                        )} style={{ minWidth: "100px" }} />
                        <Column field="createdAt" header="Added" body={(rowData) => (
                            new Date(rowData.createdAt).toLocaleDateString()
                        )} sortable style={{ minWidth: "120px" }} />
                        <Column body={actionBodyTemplate} style={{ width: "120px" }} />
                    </DataTable>
                </Card>
            </div>

            {/* Moderator Dialog */}
            <Dialog
                visible={showModeratorDialog}
                style={{ width: "700px" }}
                header={editingModerator ? "Edit Moderator" : "Add New Moderator"}
                modal
                className="p-fluid"
                onHide={() => setShowModeratorDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button 
                            label="Cancel" 
                            icon="pi pi-times" 
                            text 
                            onClick={() => setShowModeratorDialog(false)}
                            disabled={saving}
                        />
                        <Button 
                            label="Save" 
                            icon="pi pi-check" 
                            onClick={saveModerator}
                            loading={saving}
                            disabled={saving}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="userId" className="font-bold">Select User *</label>
                        <Dropdown
                            id="userId"
                            value={moderatorForm.userId}
                            options={users.map(user => ({
                                label: `${user.firstName} ${user.lastName} (${user.email})`,
                                value: user.id
                            }))}
                            onChange={(e) => setModeratorForm({ ...moderatorForm, userId: e.value })}
                            placeholder="Select User"
                            filter
                            showClear
                        />
                    </div>
                    <div className="col-12">
                        <label className="font-bold">Permissions *</label>
                        <div className="grid">
                            {permissionOptions.map((permission) => (
                                <div key={permission.value} className="col-12 md:col-6">
                                    <div className="flex align-items-center">
                                        <input
                                            type="checkbox"
                                            id={permission.value}
                                            checked={moderatorForm.permissions.includes(permission.value)}
                                            onChange={(e) => {
                                                const updatedPermissions = e.target.checked
                                                    ? [...moderatorForm.permissions, permission.value]
                                                    : moderatorForm.permissions.filter(p => p !== permission.value);
                                                setModeratorForm({ ...moderatorForm, permissions: updatedPermissions });
                                            }}
                                            className="mr-2"
                                        />
                                        <label htmlFor={permission.value}>{permission.label}</label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="col-12">
                        <label className="font-bold">Assigned Areas</label>
                        <div className="grid">
                            {areaOptions.map((area) => (
                                <div key={area.value} className="col-12 md:col-6">
                                    <div className="flex align-items-center">
                                        <input
                                            type="checkbox"
                                            id={area.value}
                                            checked={moderatorForm.assignedAreas.includes(area.value)}
                                            onChange={(e) => {
                                                const updatedAreas = e.target.checked
                                                    ? [...moderatorForm.assignedAreas, area.value]
                                                    : moderatorForm.assignedAreas.filter(a => a !== area.value);
                                                setModeratorForm({ ...moderatorForm, assignedAreas: updatedAreas });
                                            }}
                                            className="mr-2"
                                        />
                                        <label htmlFor={area.value}>{area.label}</label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="col-12">
                        <label className="font-bold">Status</label>
                        <div className="flex align-items-center mt-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={moderatorForm.isActive}
                                onChange={(e) => setModeratorForm({ ...moderatorForm, isActive: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="isActive">Active Moderator</label>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 