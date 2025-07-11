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

interface PhoneBookEntry {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    user?: {
        role: string;
        status: string;
    };
}

interface PhoneBookFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    mobile: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isPublic: boolean;
}

export default function PhoneBookPage() {
    const router = useRouter();
    const [entries, setEntries] = useState<PhoneBookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        firstName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        lastName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        city: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [showEntryDialog, setShowEntryDialog] = useState(false);
    const [editingEntry, setEditingEntry] = useState<PhoneBookEntry | null>(null);
    const [entryForm, setEntryForm] = useState<PhoneBookFormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        mobile: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        isPublic: true,
    });
    const toast = useRef<Toast>(null);

    const countryOptions = [
        { label: "United States", value: "US" },
        { label: "Canada", value: "CA" },
        { label: "United Kingdom", value: "UK" },
        { label: "Australia", value: "AU" },
        { label: "Germany", value: "DE" },
        { label: "France", value: "FR" },
        { label: "Other", value: "OTHER" },
    ];

    useEffect(() => {
        loadPhoneBookEntries();
    }, [currentPage, rowsPerPage, globalFilterValue]);

    const loadPhoneBookEntries = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: rowsPerPage.toString(),
                search: globalFilterValue,
            });

            const response = await fetch(`/api/admin/phonebook?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch phone book entries');
            }

            const data = await response.json();
            setEntries(data.phoneBookEntries);
            setTotalRecords(data.pagination.total);
        } catch (error) {
            showToast("error", "Error", "Failed to load phone book entries");
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

    const openNewEntryDialog = () => {
        setEditingEntry(null);
        setEntryForm({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            mobile: "",
            address: "",
            city: "",
            state: "",
            postalCode: "",
            country: "",
            isPublic: true,
        });
        setShowEntryDialog(true);
    };

    const openEditEntryDialog = (entry: PhoneBookEntry) => {
        setEditingEntry(entry);
        setEntryForm({
            firstName: entry.firstName,
            lastName: entry.lastName,
            email: entry.email,
            phone: entry.phone,
            mobile: entry.mobile || "",
            address: entry.address || "",
            city: entry.city || "",
            state: entry.state || "",
            postalCode: entry.postalCode || "",
            country: entry.country || "",
            isPublic: entry.isPublic,
        });
        setShowEntryDialog(true);
    };

    const saveEntry = async () => {
        try {
            if (editingEntry) {
                // Update existing entry
                const response = await fetch(`/api/admin/phonebook/${editingEntry.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entryForm),
                });

                if (!response.ok) {
                    throw new Error('Failed to update phone book entry');
                }

                const updatedEntry = await response.json();
                const updatedEntries = entries.map(entry =>
                    entry.id === editingEntry.id ? updatedEntry : entry
                );
                setEntries(updatedEntries);
                showToast("success", "Success", "Phone book entry updated successfully");
            } else {
                // Create new entry
                const response = await fetch('/api/admin/phonebook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entryForm),
                });

                if (!response.ok) {
                    throw new Error('Failed to create phone book entry');
                }

                const newEntry = await response.json();
                setEntries([newEntry, ...entries]);
                setTotalRecords(prev => prev + 1);
                showToast("success", "Success", "Phone book entry created successfully");
            }
            setShowEntryDialog(false);
        } catch (error) {
            showToast("error", "Error", "Failed to save phone book entry");
        }
    };

    const confirmDeleteEntry = (entry: PhoneBookEntry) => {
        confirmDialog({
            message: `Are you sure you want to delete "${entry.firstName} ${entry.lastName}"?`,
            header: "Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => deleteEntry(entry.id),
        });
    };

    const deleteEntry = async (entryId: string) => {
        try {
            const response = await fetch(`/api/admin/phonebook/${entryId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete phone book entry');
            }

            const updatedEntries = entries.filter(entry => entry.id !== entryId);
            setEntries(updatedEntries);
            setTotalRecords(prev => prev - 1);
            showToast("success", "Success", "Phone book entry deleted successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to delete phone book entry");
        }
    };

    const exportPhoneBook = () => {
        // Simulate export functionality
        showToast("success", "Success", "Phone book exported successfully");
    };

    const actionBodyTemplate = (rowData: PhoneBookEntry) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Details"
                    onClick={() => router.push(`/admin/phonebook/${rowData.id}`)}
                />
                <Button
                    icon="pi pi-pencil"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Edit Entry"
                    onClick={() => openEditEntryDialog(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    size="small"
                    text
                    severity="danger"
                    tooltip="Delete Entry"
                    onClick={() => confirmDeleteEntry(rowData)}
                />
            </div>
        );
    };

    const nameBodyTemplate = (rowData: PhoneBookEntry) => {
        return (
            <div>
                <div className="font-semibold">{`${rowData.firstName} ${rowData.lastName}`}</div>
                <div className="text-sm text-600">{rowData.email}</div>
            </div>
        );
    };

    const contactBodyTemplate = (rowData: PhoneBookEntry) => {
        return (
            <div>
                <div className="font-semibold">{rowData.phone}</div>
                {rowData.mobile && <div className="text-sm text-600">{rowData.mobile}</div>}
            </div>
        );
    };

    const addressBodyTemplate = (rowData: PhoneBookEntry) => {
        return (
            <div>
                <div className="text-sm">{rowData.address}</div>
                <div className="text-sm text-600">{`${rowData.city}, ${rowData.state} ${rowData.postalCode}`}</div>
            </div>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Phone Book</h2>
                <span className="text-600">Manage member contact information</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search contacts..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="Add Contact"
                    icon="pi pi-plus"
                    onClick={openNewEntryDialog}
                    severity="success"
                />
                <Button
                    label="Export"
                    icon="pi pi-download"
                    onClick={exportPhoneBook}
                    severity="secondary"
                />
            </div>
        </div>
    );

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <DataTable
                        value={entries}
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
                        globalFilterFields={["firstName", "lastName", "email", "phone", "city"]}
                        header={header}
                        emptyMessage="No phone book entries found."
                        responsiveLayout="scroll"
                    >
                        <Column field="firstName" header="Name" body={nameBodyTemplate} sortable style={{ minWidth: "200px" }} />
                        <Column field="phone" header="Contact" body={contactBodyTemplate} style={{ minWidth: "150px" }} />
                        <Column field="address" header="Address" body={addressBodyTemplate} style={{ minWidth: "200px" }} />
                        <Column field="city" header="City" sortable style={{ minWidth: "120px" }} />
                        <Column field="isPublic" header="Public" body={(rowData) => (
                            <Tag value={rowData.isPublic ? "Yes" : "No"} severity={rowData.isPublic ? "success" : "secondary"} />
                        )} style={{ minWidth: "100px" }} />
                        <Column field="createdAt" header="Added" body={(rowData) => (
                            new Date(rowData.createdAt).toLocaleDateString()
                        )} sortable style={{ minWidth: "120px" }} />
                        <Column body={actionBodyTemplate} style={{ width: "150px" }} />
                    </DataTable>
                </Card>
            </div>

            {/* Phone Book Entry Dialog */}
            <Dialog
                visible={showEntryDialog}
                style={{ width: "700px" }}
                header={editingEntry ? "Edit Contact" : "Add New Contact"}
                modal
                className="p-fluid"
                onHide={() => setShowEntryDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowEntryDialog(false)} />
                        <Button label="Save" icon="pi pi-check" onClick={saveEntry} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-6">
                        <label htmlFor="firstName" className="font-bold">First Name *</label>
                        <InputText
                            id="firstName"
                            value={entryForm.firstName}
                            onChange={(e) => setEntryForm({ ...entryForm, firstName: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="lastName" className="font-bold">Last Name *</label>
                        <InputText
                            id="lastName"
                            value={entryForm.lastName}
                            onChange={(e) => setEntryForm({ ...entryForm, lastName: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="email" className="font-bold">Email *</label>
                        <InputText
                            id="email"
                            type="email"
                            value={entryForm.email}
                            onChange={(e) => setEntryForm({ ...entryForm, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="phone" className="font-bold">Phone *</label>
                        <InputText
                            id="phone"
                            value={entryForm.phone}
                            onChange={(e) => setEntryForm({ ...entryForm, phone: e.target.value })}
                            required
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="mobile" className="font-bold">Mobile</label>
                        <InputText
                            id="mobile"
                            value={entryForm.mobile}
                            onChange={(e) => setEntryForm({ ...entryForm, mobile: e.target.value })}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label htmlFor="country" className="font-bold">Country</label>
                        <Dropdown
                            id="country"
                            value={entryForm.country}
                            options={countryOptions}
                            onChange={(e) => setEntryForm({ ...entryForm, country: e.value })}
                            placeholder="Select Country"
                        />
                    </div>
                    <div className="col-12">
                        <label htmlFor="address" className="font-bold">Address</label>
                        <InputText
                            id="address"
                            value={entryForm.address}
                            onChange={(e) => setEntryForm({ ...entryForm, address: e.target.value })}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label htmlFor="city" className="font-bold">City</label>
                        <InputText
                            id="city"
                            value={entryForm.city}
                            onChange={(e) => setEntryForm({ ...entryForm, city: e.target.value })}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label htmlFor="state" className="font-bold">State</label>
                        <InputText
                            id="state"
                            value={entryForm.state}
                            onChange={(e) => setEntryForm({ ...entryForm, state: e.target.value })}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label htmlFor="postalCode" className="font-bold">Postal Code</label>
                        <InputText
                            id="postalCode"
                            value={entryForm.postalCode}
                            onChange={(e) => setEntryForm({ ...entryForm, postalCode: e.target.value })}
                        />
                    </div>
                    <div className="col-12">
                        <label className="font-bold">Public Contact</label>
                        <div className="flex align-items-center mt-2">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={entryForm.isPublic}
                                onChange={(e) => setEntryForm({ ...entryForm, isPublic: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="isPublic">Make this contact public to other members</label>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Toast ref={toast} />
            <ConfirmDialog />
        </div>
    );
} 