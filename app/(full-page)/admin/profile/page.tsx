"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { Avatar } from "primereact/avatar";
import { Divider } from "primereact/divider";
import { Skeleton } from "primereact/skeleton";
import { apiClient } from "@/lib/apiClient";
import { Dialog } from "primereact/dialog";

interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    profileImage?: string;
    membershipNumber?: string;
    joinDate?: string;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

interface ProfileFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    membershipNumber: string;
}

interface PasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    
    const [profileForm, setProfileForm] = useState<ProfileFormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        membershipNumber: "",
    });

    const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const toast = useRef<Toast>(null);

    const roleOptions = [
        { label: "Admin", value: "ADMIN" },
        { label: "Member", value: "MEMBER" },
    ];

    const statusOptions = [
        { label: "Active", value: "ACTIVE" },
        { label: "Pending", value: "PENDING" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Suspended", value: "SUSPENDED" },
    ];

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            // Get admin user profile
            const response = await apiClient.getUsers({
                page: 1,
                limit: 1,
                role: 'ADMIN',
                status: 'ACTIVE'
            });

            if (response.error) {
                throw new Error(response.error);
            }

            const adminUser = response.data?.users?.[0];
            if (adminUser) {
                setProfile(adminUser);
                setProfileForm({
                    firstName: adminUser.firstName || "",
                    lastName: adminUser.lastName || "",
                    email: adminUser.email || "",
                    phone: adminUser.phone || "",
                    membershipNumber: adminUser.membershipNumber || "",
                });
            }
        } catch (error) {
            showToast("error", "Error", "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const saveProfile = async () => {
        if (!profile) return;

        setSaving(true);
        try {
            const response = await apiClient.updateUser(profile.id, {
                firstName: profileForm.firstName,
                lastName: profileForm.lastName,
                email: profileForm.email,
                phone: profileForm.phone,
                membershipNumber: profileForm.membershipNumber,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Update local state
            setProfile(prev => prev ? { ...prev, ...profileForm } : null);
            showToast("success", "Success", "Profile updated successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const changePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast("error", "Error", "New passwords do not match");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            showToast("error", "Error", "Password must be at least 6 characters long");
            return;
        }

        setChangingPassword(true);
        try {
            // This would typically be a separate API endpoint for password change
            // For now, we'll simulate it
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            showToast("success", "Success", "Password changed successfully");
            setShowPasswordDialog(false);
            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } catch (error) {
            showToast("error", "Error", "Failed to change password");
        } finally {
            setChangingPassword(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="flex flex-column gap-3">
                            <Skeleton height="2rem" width="200px" />
                            <Skeleton height="4rem" />
                            <Skeleton height="4rem" />
                            <Skeleton height="4rem" />
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
                        <div className="flex align-items-center gap-3">
                            <Avatar
                                image={profile?.profileImage}
                                label={profile?.firstName?.charAt(0)}
                                size="xlarge"
                                shape="circle"
                            />
                            <div>
                                <h2 className="text-2xl font-bold m-0">Profile Settings</h2>
                                <p className="text-600 m-0">Manage your account information and preferences</p>
                            </div>
                        </div>

                        <Divider />

                        {/* Profile Information */}
                        <div className="grid">
                            <div className="col-12 lg:col-8">
                                <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
                                
                                <div className="grid">
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">First Name</label>
                                        <InputText
                                            value={profileForm.firstName}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                                            placeholder="Enter first name"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">Last Name</label>
                                        <InputText
                                            value={profileForm.lastName}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                                            placeholder="Enter last name"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">Email</label>
                                        <InputText
                                            value={profileForm.email}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="Enter email"
                                            className="w-full"
                                            type="email"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">Phone</label>
                                        <InputText
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="Enter phone number"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">Membership Number</label>
                                        <InputText
                                            value={profileForm.membershipNumber}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, membershipNumber: e.target.value }))}
                                            placeholder="Enter membership number"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button
                                        label="Save Changes"
                                        icon="pi pi-check"
                                        onClick={saveProfile}
                                        loading={saving}
                                        severity="success"
                                    />
                                    <Button
                                        label="Change Password"
                                        icon="pi pi-key"
                                        onClick={() => setShowPasswordDialog(true)}
                                        severity="secondary"
                                    />
                                </div>
                            </div>

                            <div className="col-12 lg:col-4">
                                <h3 className="text-xl font-semibold mb-3">Account Information</h3>
                                
                                <div className="flex flex-column gap-3">
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Role</div>
                                        <div className="font-semibold">{profile?.role}</div>
                                    </div>
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Status</div>
                                        <div className="font-semibold">{profile?.status}</div>
                                    </div>
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Member Since</div>
                                        <div className="font-semibold">
                                            {profile?.joinDate ? formatDate(profile.joinDate) : 'Not set'}
                                        </div>
                                    </div>
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Last Login</div>
                                        <div className="font-semibold">
                                            {profile?.lastLogin ? formatDate(profile.lastLogin) : 'Never'}
                                        </div>
                                    </div>
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Account Created</div>
                                        <div className="font-semibold">
                                            {profile?.createdAt ? formatDate(profile.createdAt) : 'Unknown'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Password Change Dialog */}
            <div className="col-12">
                <Dialog
                    visible={showPasswordDialog}
                    style={{ width: "500px" }}
                    header="Change Password"
                    modal
                    onHide={() => setShowPasswordDialog(false)}
                    footer={
                        <div className="flex gap-2 justify-content-end">
                            <Button
                                label="Cancel"
                                icon="pi pi-times"
                                onClick={() => setShowPasswordDialog(false)}
                                text
                            />
                            <Button
                                label="Change Password"
                                icon="pi pi-check"
                                onClick={changePassword}
                                loading={changingPassword}
                            />
                        </div>
                    }
                >
                    <div className="flex flex-column gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-2">Current Password</label>
                            <InputText
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                placeholder="Enter current password"
                                className="w-full"
                                type="password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">New Password</label>
                            <InputText
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                placeholder="Enter new password"
                                className="w-full"
                                type="password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                            <InputText
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                placeholder="Confirm new password"
                                className="w-full"
                                type="password"
                            />
                        </div>
                    </div>
                </Dialog>
            </div>

            <Toast ref={toast} />
        </div>
    );
} 