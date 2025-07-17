"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import { getProfileImageUrl } from "@/lib/cloudinary-client";
import { useDebounce } from "@/hooks/useDebounce";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    profileImage?: string;
    profileImagePublicId?: string;
    membershipNumber?: string;
    joinDate?: string | null;
    paidDate?: string | null;
    lastLogin?: string;
    createdAt: string;
}

interface UserFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    joinDate: Date | null;
    paidDate: Date | null;
    password?: string;
}

export default function MembersPage() {
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
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState<UserFormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        status: "PENDING",
        joinDate: null,
        paidDate: null,
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const toast = useRef<Toast>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<number | undefined>(undefined);

    // Use debounce hook for search
    const debouncedFilterValue = useDebounce(globalFilterValue, 500);

    const statusOptions = [
        { label: "Active", value: "ACTIVE" },
        { label: "Pending", value: "PENDING" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Deactivated", value: "DEACTIVATED" },
    ];

    useEffect(() => {
        loadMembers();
    }, [currentPage, rowsPerPage, debouncedFilterValue]);

    const loadMembers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getUsers({
                page: currentPage,
                limit: rowsPerPage,
                search: debouncedFilterValue,
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setUsers(response.data?.users || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            setError("Failed to load members. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load members");
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

    const openNewMemberDialog = async () => {
        setEditingUser(null);
        
        setUserForm({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            status: "PENDING",
            joinDate: null,
            paidDate: null,
            password: "",
        });
        setShowPassword(false);
        setShowUserDialog(true);
    };

    const openEditUserDialog = (user: User) => {
        setEditingUser(user);
        setUserForm({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || "",
            status: user.status,
            joinDate: user.joinDate ? new Date(user.joinDate) : null,
            paidDate: user.paidDate ? new Date(user.paidDate) : null,
        });
        setShowPassword(false);
        setShowUserDialog(true);
    };

    const saveUser = async () => {
        setSaveLoading(true);
        try {
            const userData = {
                ...userForm,
                joinDate: userForm.joinDate?.toISOString(),
                paidDate: userForm.paidDate?.toISOString(),
            };
            if (!editingUser && !userForm.password) {
                delete userData.password;
            }
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
                showToast("success", "Success", "Member updated successfully");
            } else {
                setUsers([response.data, ...users]);
                showToast("success", "Success", "Member created successfully");
            }

            setShowUserDialog(false);
        } catch (error) {
            showToast("error", "Error", error instanceof Error ? error.message : "Failed to save member");
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
            showToast("success", "Success", "Member deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete member");
        }
    };

    const getStatusSeverity = (status: string) => {
        switch (status) {
            case "ACTIVE": return "success";
            case "PENDING": return "warning";
            case "INACTIVE": return "danger";
            case "DEACTIVATED": return "danger";
            default: return "info";
        }
    };



    const nameBodyTemplate = (rowData: User) => {
        return (
            <div className="flex align-items-center gap-2">
                <Avatar
                    image={rowData.profileImagePublicId ? 
                        getProfileImageUrl(rowData.profileImagePublicId, 'small') : 
                        rowData.profileImage
                    }
                    icon={!rowData.profileImage && !rowData.profileImagePublicId ? "pi pi-user" : undefined}
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
                                            tooltip="Edit Member"
                    onClick={() => openEditUserDialog(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                                            tooltip="Delete Member"
                    onClick={() => confirmDeleteUser(rowData)}
                />
            </div>
        );
    };

    const header = useMemo(() => (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Member Management</h2>
                <span className="text-600">Manage all registered members</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search members..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Add Member"
                    icon="pi pi-plus"
                                            onClick={openNewMemberDialog}
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
                                field="phone" 
                                header="Phone" 
                                body={() => <Skeleton width="120px" height="16px" />}
                                style={{ minWidth: "150px" }}
                            />
                            <Column 
                                field="paidDate" 
                                header="Paid Date" 
                                body={() => <Skeleton width="100px" height="16px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                field="role" 
                                header="Role" 
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
                            emptyMessage={error ? "Unable to load members. Please check your connection or try again later." : "No members found."}
                            responsiveLayout="scroll"
                            onSort={(e) => {
                                setSortField(e.sortField);
                                setSortOrder((e.sortOrder as 1 | 0 | -1 | undefined));
                            }}
                            sortField={sortField}
                            sortOrder={sortOrder as 1 | 0 | -1 | undefined}
                        >
                            <Column field="firstName" header="Name" body={nameBodyTemplate} style={{ minWidth: "200px" }} />
                            <Column field="email" header="Email" style={{ minWidth: "200px" }} />
                            <Column field="phone" header="Phone" style={{ minWidth: "150px" }} />
                            <Column field="paidDate" header="Paid Date" body={(rowData) => (
                                rowData.paidDate ? new Date(rowData.paidDate).toLocaleDateString() : "Not paid"
                            )} style={{ minWidth: "120px" }} />
                            <Column field="status" header="Status" body={(rowData) => (
                                <Tag value={rowData.status} severity={getStatusSeverity(rowData.status)} />
                            )} style={{ minWidth: "120px" }} />
                            {/* <Column field="joinDate" header="Join Date" body={(rowData) => (
                                new Date(rowData.joinDate || "").toLocaleDateString()
                            )} style={{ minWidth: "120px" }} /> */}
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
                header={editingUser ? "Edit Member" : "Add New Member"}
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
                            placeholder="Enter first name"
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
                            placeholder="Enter last name"
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
                            placeholder="Enter email address"
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
                            placeholder="Enter phone number"
                            className="w-full"
                        />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="status" className="block font-bold mb-2">Status *</label>
                        <Dropdown
                            id="status"
                            value={userForm.status}
                            options={statusOptions}
                            onChange={(e) => setUserForm({ ...userForm, status: e.value })}
                            placeholder="Select member status"
                            className="w-full"
                            style={{ minWidth: 0 }}
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
                            placeholder="Select join date"
                            className="w-full"
                            style={{ minWidth: 0 }}
                        />
                    </div>
                    {editingUser && (
                        <div className="col-12 md:col-6">
                            <label htmlFor="paidDate" className="block font-bold mb-2">Paid Date</label>
                            <Calendar
                                id="paidDate"
                                value={userForm.paidDate}
                                onChange={(e) => setUserForm({ ...userForm, paidDate: e.value as Date })}
                                showIcon
                                dateFormat="dd/mm/yy"
                                placeholder="Select paid date"
                                className="w-full"
                                style={{ minWidth: 0 }}
                            />
                        </div>
                    )}
                    {!editingUser && (
                        <div className="col-12">
                            <label htmlFor="password" className="font-bold">Password</label>
                            <div className="p-input-icon-right w-full">
                                <InputText
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={userForm.password}
                                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                    placeholder="Set password (leave blank for default)"
                                    className="w-full"
                                />
                                <i 
                                    className={`pi ${showPassword ? 'pi-eye-slash' : 'pi-eye'} cursor-pointer`}
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ cursor: 'pointer' }}
                                />
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