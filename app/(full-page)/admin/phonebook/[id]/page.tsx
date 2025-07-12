"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Skeleton } from "primereact/skeleton";
import { Toast } from "primereact/toast";
import { useRef } from "react";

interface PhoneBookEntry {
    id: string;
    userId: string;
    email: string;
    phone?: string;
    address?: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        status: string;
    };
}

export default function PhoneBookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [entry, setEntry] = useState<PhoneBookEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const toast = useRef<Toast>(null);

    useEffect(() => {
        if (params.id) {
            loadPhoneBookEntry(params.id as string);
        }
    }, [params.id]);

    const loadPhoneBookEntry = async (id: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/phonebook/${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch phone book entry');
            }
            const data = await response.json();
            setEntry(data);
        } catch (error) {
            showToast("error", "Error", "Failed to load phone book entry");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handleEdit = () => {
        router.push(`/admin/phonebook?edit=${entry?.id}`);
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${entry?.user?.firstName} ${entry?.user?.lastName}"?`)) {
            deleteEntry();
        }
    };

    const deleteEntry = async () => {
        try {
            const response = await fetch(`/api/admin/phonebook/${entry?.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete phone book entry');
            }

            showToast("success", "Success", "Phone book entry deleted successfully");
            router.push('/admin/phonebook');
        } catch (error) {
            showToast("error", "Error", "Failed to delete phone book entry");
        }
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="flex flex-column gap-3">
                            <Skeleton height="2rem" width="200px" />
                            <Skeleton height="1rem" width="300px" />
                            <Skeleton height="1rem" width="250px" />
                            <Skeleton height="1rem" width="280px" />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (!entry) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="text-center">
                            <h2>Phone Book Entry Not Found</h2>
                            <p>The requested phone book entry could not be found.</p>
                            <Button 
                                label="Back to Phone Book" 
                                icon="pi pi-arrow-left" 
                                onClick={() => router.push('/admin/phonebook')}
                            />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex flex-column gap-4">
                        {/* Header */}
                        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
                            <div className="flex flex-column">
                                <h2 className="text-2xl font-bold m-0">
                                    {entry.user?.firstName} {entry.user?.lastName}
                                </h2>
                                <span className="text-600">Phone Book Entry Details</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    label="Edit"
                                    icon="pi pi-pencil"
                                    severity="secondary"
                                    onClick={handleEdit}
                                />
                                <Button
                                    label="Delete"
                                    icon="pi pi-trash"
                                    severity="danger"
                                    onClick={handleDelete}
                                />
                                <Button
                                    label="Back"
                                    icon="pi pi-arrow-left"
                                    text
                                    onClick={() => router.push('/admin/phonebook')}
                                />
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <div className="flex flex-column gap-3">
                                    <div>
                                        <label className="font-bold text-600">Full Name</label>
                                        <div className="text-lg">
                                            {entry.user?.firstName} {entry.user?.lastName}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-600">Email</label>
                                        <div className="text-lg">{entry.email}</div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-600">Phone</label>
                                        <div className="text-lg">{entry.phone || 'Not provided'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 md:col-6">
                                <div className="flex flex-column gap-3">
                                    <div>
                                        <label className="font-bold text-600">Address</label>
                                        <div className="text-lg">{entry.address || 'Not provided'}</div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-600">Public Contact</label>
                                        <div>
                                            <Tag 
                                                value={entry.isPublic ? "Yes" : "No"} 
                                                severity={entry.isPublic ? "success" : "secondary"} 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-bold text-600">User Role</label>
                                        <div>
                                            <Tag 
                                                value={entry.user?.role || 'Unknown'} 
                                                severity={entry.user?.role === 'ADMIN' ? "danger" : "info"} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <div>
                                    <label className="font-bold text-600">User Status</label>
                                    <div>
                                        <Tag 
                                            value={entry.user?.status || 'Unknown'} 
                                            severity={
                                                entry.user?.status === 'ACTIVE' ? "success" : 
                                                entry.user?.status === 'PENDING' ? "warning" : 
                                                entry.user?.status === 'SUSPENDED' ? "danger" : "secondary"
                                            } 
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 md:col-6">
                                <div>
                                    <label className="font-bold text-600">Created</label>
                                    <div className="text-lg">
                                        {new Date(entry.createdAt).toLocaleDateString()} at {new Date(entry.createdAt).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
            <Toast ref={toast} />
        </div>
    );
} 