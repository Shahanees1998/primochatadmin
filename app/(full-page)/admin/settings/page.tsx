"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { useRequireAdmin } from "@/hooks/useAuth";
import { Skeleton } from "primereact/skeleton";
import { canAccessSection } from "@/lib/rolePermissions";

interface SettingsForm {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    maxFileSize: number;
    allowedFileTypes: string;
    defaultUserRole: string;
    enableNotifications: boolean;
    enableChat: boolean;
    enableEvents: boolean;
    enableDocuments: boolean;
}

const defaultSettings: SettingsForm = {
    siteName: "FRATERNA Admin",
    siteDescription: "Administrative dashboard for FRATERNA community management",
    contactEmail: "app.thebuilders@gmail.com",
    maxFileSize: 10,
    allowedFileTypes: "pdf,doc,docx,jpg,jpeg,png",
    defaultUserRole: "MEMBER",
    enableNotifications: true,
    enableChat: true,
    enableEvents: true,
    enableDocuments: true,
};

const SettingsSkeleton = () => (
    <div className="grid">
        <div className="col-12">
            <div className="card">
                <Skeleton height="2rem" className="mb-4" />
                <div className="grid">
                    <div className="col-12 lg:col-6">
                        <Card title="General Settings" className="mb-4">
                            <div className="field mb-4">
                                <Skeleton height="1.5rem" className="mb-2" />
                                <Skeleton height="3rem" />
                            </div>
                            <div className="field mb-4">
                                <Skeleton height="1.5rem" className="mb-2" />
                                <Skeleton height="6rem" />
                            </div>
                            <div className="field mb-4">
                                <Skeleton height="1.5rem" className="mb-2" />
                                <Skeleton height="3rem" />
                            </div>
                            <div className="field mb-4">
                                <Skeleton height="1.5rem" className="mb-2" />
                                <Skeleton height="3rem" />
                            </div>
                        </Card>
                    </div>

                    <div className="col-12 lg:col-6">
                        <Card title="File Upload Settings" className="mb-4">
                            <div className="field mb-4">
                                <Skeleton height="1.5rem" className="mb-2" />
                                <Skeleton height="3rem" />
                            </div>
                            <div className="field mb-4">
                                <Skeleton height="1.5rem" className="mb-2" />
                                <Skeleton height="3rem" />
                                <Skeleton height="1rem" className="mt-2" />
                            </div>
                        </Card>

                        <Card title="Feature Toggles" className="mb-4">
                            <div className="field-checkbox mb-3">
                                <Skeleton shape="circle" size="1.5rem" className="mr-2" />
                                <Skeleton height="1.5rem" width="60%" />
                            </div>
                            <div className="field-checkbox mb-3">
                                <Skeleton shape="circle" size="1.5rem" className="mr-2" />
                                <Skeleton height="1.5rem" width="70%" />
                            </div>
                            <div className="field-checkbox mb-3">
                                <Skeleton shape="circle" size="1.5rem" className="mr-2" />
                                <Skeleton height="1.5rem" width="80%" />
                            </div>
                            <div className="field-checkbox mb-3">
                                <Skeleton shape="circle" size="1.5rem" className="mr-2" />
                                <Skeleton height="1.5rem" width="75%" />
                            </div>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-content-end">
                    <Skeleton height="3rem" width="10rem" />
                </div>
            </div>
        </div>
    </div>
);

export default function SettingsPage() {
    const { user, loading: authLoading } = useRequireAdmin();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [settings, setSettings] = useState<SettingsForm>(defaultSettings);
    const [error, setError] = useState<string | null>(null);
    const toast = useRef<Toast>(null);

    const roleOptions = [
        { label: "Member", value: "MEMBER" },
        { label: "Admin", value: "ADMIN" },
        { label: "Admin Level Two", value: "ADMINLEVELTWO" },
        { label: "Admin Level Three", value: "ADMINLEVELTHREE" },
    ];

    useEffect(() => {
        const fetchSettings = async () => {
            setFetching(true);
            setError(null);
            try {
                const res = await fetch("/api/admin/settings");
                if (!res.ok) {
                    throw new Error((await res.json()).error || "Failed to fetch settings");
                }
                const data = await res.json();
                setSettings({
                    ...defaultSettings,
                    ...data,
                });
            } catch (err: any) {
                setError(err.message || "Failed to fetch settings");
                showToast("error", "Error", err.message || "Failed to fetch settings");
            } finally {
                setFetching(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to save settings");
            }
            showToast("success", "Success", "Settings saved successfully");
        } catch (err: any) {
            setError(err.message || "Failed to save settings");
            showToast("error", "Error", err.message || "Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    if (authLoading || fetching) {
        return <SettingsSkeleton />;
    }
    if (!user || !canAccessSection(user.role, 'canAccessSettings')) {
        return <div className="flex justify-content-center align-items-center min-h-screen text-red-600">Access denied. Admins only.</div>;
    }

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card">
                    <Toast ref={toast} />
                    <h5 className="mb-4">System Settings</h5>
                    {error && <div className="p-error mb-3">{error}</div>}
                    <div className="grid">
                        <div className="col-12 lg:col-6">
                            <Card title="General Settings" className="mb-4">
                                <div className="field mb-4">
                                    <label htmlFor="siteName" className="block text-900 font-medium mb-2">
                                        Site Name
                                    </label>
                                    <InputText
                                        id="siteName"
                                        value={settings.siteName}
                                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                                        className="w-full"
                                    />
                                </div>

                                <div className="field mb-4">
                                    <label htmlFor="siteDescription" className="block text-900 font-medium mb-2">
                                        Site Description
                                    </label>
                                    <InputTextarea
                                        id="siteDescription"
                                        value={settings.siteDescription}
                                        onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                                        rows={3}
                                        className="w-full"
                                    />
                                </div>

                                <div className="field mb-4">
                                    <label htmlFor="contactEmail" className="block text-900 font-medium mb-2">
                                        Contact Email
                                    </label>
                                    <InputText
                                        id="contactEmail"
                                        type="email"
                                        value={settings.contactEmail}
                                        onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                                        className="w-full"
                                    />
                                </div>

                                <div className="field mb-4">
                                    <label htmlFor="defaultRole" className="block text-900 font-medium mb-2">
                                        Default User Role
                                    </label>
                                    <Dropdown
                                        id="defaultRole"
                                        value={settings.defaultUserRole}
                                        options={roleOptions}
                                        onChange={(e) => setSettings({ ...settings, defaultUserRole: e.value })}
                                        placeholder="Select Role"
                                        className="w-full"
                                    />
                                </div>
                            </Card>
                        </div>

                        <div className="col-12 lg:col-6">
                            <Card title="File Upload Settings" className="mb-4">
                                <div className="field mb-4">
                                    <label htmlFor="maxFileSize" className="block text-900 font-medium mb-2">
                                        Maximum File Size (MB)
                                    </label>
                                    <InputText
                                        id="maxFileSize"
                                        type="number"
                                        value={settings.maxFileSize.toString()}
                                        onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) || 10 })}
                                        className="w-full"
                                    />
                                </div>
{/* 
                                <div className="field mb-4">
                                    <label htmlFor="allowedFileTypes" className="block text-900 font-medium mb-2">
                                        Allowed File Types
                                    </label>
                                    <InputText
                                        id="allowedFileTypes"
                                        value={settings.allowedFileTypes}
                                        onChange={(e) => setSettings({ ...settings, allowedFileTypes: e.target.value })}
                                        placeholder="pdf,doc,docx,jpg,jpeg,png"
                                        className="w-full"
                                    />
                                    <small className="text-600">Comma-separated list of file extensions</small>
                                </div> */}
                            </Card>

                            <Card title="Feature Toggles" className="mb-4">
                                <div className="field-checkbox mb-3">
                                    <input
                                        type="checkbox"
                                        id="enableNotifications"
                                        checked={settings.enableNotifications}
                                        onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <label htmlFor="enableNotifications" className="text-900">
                                        Enable Notifications
                                    </label>
                                </div>

                                <div className="field-checkbox mb-3">
                                    <input
                                        type="checkbox"
                                        id="enableChat"
                                        checked={settings.enableChat}
                                        onChange={(e) => setSettings({ ...settings, enableChat: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <label htmlFor="enableChat" className="text-900">
                                        Enable Chat System
                                    </label>
                                </div>

                                <div className="field-checkbox mb-3">
                                    <input
                                        type="checkbox"
                                        id="enableEvents"
                                        checked={settings.enableEvents}
                                        onChange={(e) => setSettings({ ...settings, enableEvents: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <label htmlFor="enableEvents" className="text-900">
                                        Enable Events Management
                                    </label>
                                </div>

                                <div className="field-checkbox mb-3">
                                    <input
                                        type="checkbox"
                                        id="enableDocuments"
                                        checked={settings.enableDocuments}
                                        onChange={(e) => setSettings({ ...settings, enableDocuments: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <label htmlFor="enableDocuments" className="text-900">
                                        Enable Document Management
                                    </label>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <div className="flex justify-content-end">
                        <Button
                            label={loading ? "Saving..." : "Save Settings"}
                            icon="pi pi-check"
                            onClick={handleSave}
                            loading={loading}
                            className="p-button-success"
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 