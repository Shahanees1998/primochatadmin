"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Avatar } from "primereact/avatar";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { useRouter } from "next/navigation";
import { Skeleton } from "primereact/skeleton";
import { apiClient } from "@/lib/apiClient";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    profileImage?: string;
    membershipNumber?: string;
    joinDate?: string | null;
    lastLogin?: string;
    createdAt: string;
}

interface UserFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    membershipNumber: string;
    joinDate: Date | null;
}

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        firstName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        lastName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        email: { value: null, matchMode: FilterMatchMode.CONTAINS },
        role: { value: null, matchMode: FilterMatchMode.EQUALS },
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState<UserFormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "MEMBER",
        status: "PENDING",
        membershipNumber: "",
        joinDate: null,
    });
    const toast = useRef<Toast>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<number | undefined>(undefined);

    const roleOptions = [
        { label: "Admin", value: "ADMIN" },
        { label: "Moderator", value: "MODERATOR" },
        { label: "Member", value: "MEMBER" },
    ];

    const statusOptions = [
        { label: "Active", value: "ACTIVE" },
        { label: "Pending", value: "PENDING" },
        { label: "Inactive", value: "INACTIVE" },
    ];

    useEffect(() => {
        loadUsers();
    }, [currentPage, rowsPerPage, globalFilterValue]);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getUsers({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setUsers(response.data?.users || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            setError("Failed to load users. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load users");
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

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNewUserDialog = () => {
        setEditingUser(null);
        setUserForm({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            role: "MEMBER",
            status: "PENDING",
            membershipNumber: "",
            joinDate: null,
        });
        setShowUserDialog(true);
    };

    const openEditUserDialog = (user: User) => {
        setEditingUser(user);
        setUserForm({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || "",
            role: user.role,
            status: user.status,
            membershipNumber: user.membershipNumber || "",
            joinDate: user.joinDate ? new Date(user.joinDate) : null,
        });
        setShowUserDialog(true);
    };

    const saveUser = async () => {
        setSaveLoading(true);
        try {
            const userData = {
                ...userForm,
                joinDate: userForm.joinDate?.toISOString(),
            };

            let response: any;
            if (editingUser) {
                // Update existing user
                response = await apiClient.updateUser(editingUser.id, userData);
            } else {
                // Create new user
                response = await apiClient.createUser(userData);
            }

            if (response.error) {
                throw new Error(response.error);
            }

            if (editingUser) {
                const updatedUsers = users.map(user =>
                    user.id === editingUser.id ? response.data : user
                );
                setUsers(updatedUsers);
                showToast("success", "Success", "User updated successfully");
            } else {
                setUsers([response.data, ...users]);
                showToast("success", "Success", "User created successfully");
            }

            setShowUserDialog(false);
        } catch (error) {
            showToast("error", "Error", error instanceof Error ? error.message : "Failed to save user");
        } finally {
            setSaveLoading(false);
        }
    };

    const confirmDeleteUser = (user: User) => {
        confirmDialog({
            message: `Are you sure you want to delete ${user.firstName} ${user.lastName}?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteUser(user.id),
        });
    };

    const deleteUser = async (userId: string) => {
        try {
            const response = await apiClient.deleteUser(userId);
            
            if (response.error) {
                throw new Error(response.error);
            }

            setUsers(users.filter(user => user.id !== userId));
            showToast("success", "Success", "User deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete user");
        }
    };

    const getStatusSeverity = (status: string) => {
        switch (status) {
            case "ACTIVE": return "success";
            case "PENDING": return "warning";
            case "INACTIVE": return "danger";
            default: return "info";
        }
    };

    const getRoleSeverity = (role: string) => {
        switch (role) {
            case "ADMIN": return "danger";
            case "MODERATOR": return "warning";
            case "MEMBER": return "info";
            default: return "info";
        }
    };

    const nameBodyTemplate = (rowData: User) => {
        return (
            <div className="flex align-items-center gap-2">
                <Avatar
                    image={rowData.profileImage}
                    icon={!rowData.profileImage ? "pi pi-user" : undefined}
                    size="normal"
                    shape="circle"
                />
                <div>
                    <div className="font-semibold">{`${rowData.firstName} ${rowData.lastName}`}</div>
                    <div className="text-sm text-600">{rowData.membershipNumber}</div>
                </div>
            </div>
        );
    };

    const actionBodyTemplate = (rowData: User) => {
        return (
            <div className="flex gap-2">
                {/* <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => router.push(`/admin/users/${rowData.id}`)}
                /> */}
                <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Edit User"
                    onClick={() => openEditUserDialog(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete User"
                    onClick={() => confirmDeleteUser(rowData)}
                />
            </div>
        );
    };

    const header = useMemo(() => (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">User Management</h2>
                <span className="text-600">Manage all registered users</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search users..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Add User"
                    icon="pi pi-plus"
                    onClick={openNewUserDialog}
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
                    <>
                    {loading ? (
                        <div className="p-4">
                            <div className="grid">
                                {[...Array(5)].map((_, i) => (
                                    <div className="col-12" key={i}>
                                        <div className="flex align-items-center gap-3">
                                            <Skeleton shape="circle" size="2.5rem" />
                                            <div className="flex flex-column gap-2" style={{ flex: 1 }}>
                                                <Skeleton width="40%" height="1.5rem" />
                                                <Skeleton width="30%" height="1rem" />
                                            </div>
                                            <Skeleton width="6rem" height="2rem" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <DataTable
                            value={users}
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
                            globalFilterFields={["firstName", "lastName", "email", "membershipNumber"]}
                            header={header}
                            emptyMessage={error ? "Unable to load users. Please check your connection or try again later." : "No users found."}
                            responsiveLayout="scroll"
                            onSort={(e) => {
                                setSortField(e.sortField);
                                setSortOrder((e.sortOrder as 1 | 0 | -1 | undefined));
                            }}
                            sortField={sortField}
                            sortOrder={sortOrder as 1 | 0 | -1 | undefined}
                        >
                            <Column field="firstName" header="Name" body={nameBodyTemplate} sortable style={{ minWidth: "200px" }} />
                            <Column field="email" header="Email" sortable style={{ minWidth: "200px" }} />
                            <Column field="phone" header="Phone" style={{ minWidth: "150px" }} />
                            <Column field="role" header="Role" body={(rowData) => (
                                <Tag value={rowData.role} severity={getRoleSeverity(rowData.role)} />
                            )} sortable style={{ minWidth: "120px" }} />
                            <Column field="status" header="Status" body={(rowData) => (
                                <Tag value={rowData.status} severity={getStatusSeverity(rowData.status)} />
                            )} sortable style={{ minWidth: "120px" }} />
                            {/* <Column field="joinDate" header="Join Date" body={(rowData) => (
                                new Date(rowData.joinDate || "").toLocaleDateString()
                            )} sortable style={{ minWidth: "120px" }} /> */}
                            <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                        </DataTable>
                    )}
                    </>
                </Card>
            </div>

            {/* User Dialog always rendered */}
            <Dialog
                visible={showUserDialog}
                style={{ width: "820px", maxWidth: "95vw", zIndex: 2000, borderRadius: 12 }}
                header={editingUser ? "Edit User" : "Add New User"}
                modal
                className=""
                onHide={() => setShowUserDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowUserDialog(false)} disabled={saveLoading} />
                        <Button
                            label={saveLoading ? "Saving..." : "Save"}
                            icon={saveLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
                            onClick={saveUser}
                            disabled={saveLoading}
                        />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-6">
                        <label htmlFor="firstName" className="block font-bold mb-2">First Name *</label>
                        <InputText
                            id="firstName"
                            value={userForm.firstName}
                            onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="lastName" className="block font-bold mb-2">Last Name *</label>
                        <InputText
                            id="lastName"
                            value={userForm.lastName}
                            onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="email" className="block font-bold mb-2">Email *</label>
                        <InputText
                            id="email"
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            required
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="phone" className="block font-bold mb-2">Phone</label>
                        <InputText
                            id="phone"
                            value={userForm.phone}
                            onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="role" className="block font-bold mb-2">Role *</label>
                        <Dropdown
                            id="role"
                            value={userForm.role}
                            options={roleOptions}
                            onChange={(e) => setUserForm({ ...userForm, role: e.value })}
                            placeholder="Select Role"
                            className="w-full"
                            style={{ minWidth: 0 }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="status" className="block font-bold mb-2">Status *</label>
                        <Dropdown
                            id="status"
                            value={userForm.status}
                            options={statusOptions}
                            onChange={(e) => setUserForm({ ...userForm, status: e.value })}
                            placeholder="Select Status"
                            className="w-full"
                            style={{ minWidth: 0 }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="membershipNumber" className="block font-bold mb-2">Membership Number</label>
                        <InputText
                            id="membershipNumber"
                            value={userForm.membershipNumber}
                            onChange={(e) => setUserForm({ ...userForm, membershipNumber: e.target.value })}
                            className="w-full"
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="joinDate" className="block font-bold mb-2">Join Date</label>
                        <Calendar
                            id="joinDate"
                            value={userForm.joinDate}
                            onChange={(e) => setUserForm({ ...userForm, joinDate: e.value as Date })}
                            showIcon
                            dateFormat="dd/mm/yy"
                            className="w-full"
                            style={{ minWidth: 0 }}
                        />
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 