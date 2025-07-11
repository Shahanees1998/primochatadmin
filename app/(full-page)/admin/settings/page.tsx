"use client";

import { useState, useRef } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputNumber } from "primereact/inputnumber";
import { Toast } from "primereact/toast";
import { TabView, TabPanel } from "primereact/tabview";
import { useRouter } from "next/navigation";

interface GeneralSettings {
    organizationName: string;
    organizationEmail: string;
    organizationPhone: string;
    organizationAddress: string;
    websiteUrl: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
}

interface NotificationSettings {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    autoApproveMembers: boolean;
    notifyOnNewMembers: boolean;
    notifyOnSupportRequests: boolean;
    notifyOnEventRegistrations: boolean;
}

interface SecuritySettings {
    requireEmailVerification: boolean;
    requireAdminApproval: boolean;
    maxLoginAttempts: number;
    sessionTimeout: number;
    passwordMinLength: number;
    requireStrongPassword: boolean;
    enableTwoFactorAuth: boolean;
}

interface EmailSettings {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
    emailTemplate: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const toast = useRef<Toast>(null);

    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
        organizationName: "My Organization",
        organizationEmail: "admin@organization.com",
        organizationPhone: "+1-555-123-4567",
        organizationAddress: "123 Main Street, City, State 12345",
        websiteUrl: "https://www.organization.com",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
    });

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        autoApproveMembers: false,
        notifyOnNewMembers: true,
        notifyOnSupportRequests: true,
        notifyOnEventRegistrations: false,
    });

    const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
        requireEmailVerification: true,
        requireAdminApproval: true,
        maxLoginAttempts: 5,
        sessionTimeout: 30,
        passwordMinLength: 8,
        requireStrongPassword: true,
        enableTwoFactorAuth: false,
    });

    const [emailSettings, setEmailSettings] = useState<EmailSettings>({
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        smtpUsername: "noreply@organization.com",
        smtpPassword: "",
        fromEmail: "noreply@organization.com",
        fromName: "Organization Admin",
        emailTemplate: "default",
    });

    const timezoneOptions = [
        { label: "America/New_York", value: "America/New_York" },
        { label: "America/Chicago", value: "America/Chicago" },
        { label: "America/Denver", value: "America/Denver" },
        { label: "America/Los_Angeles", value: "America/Los_Angeles" },
        { label: "Europe/London", value: "Europe/London" },
        { label: "Europe/Paris", value: "Europe/Paris" },
        { label: "Asia/Tokyo", value: "Asia/Tokyo" },
        { label: "Australia/Sydney", value: "Australia/Sydney" },
    ];

    const dateFormatOptions = [
        { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
        { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
        { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
    ];

    const timeFormatOptions = [
        { label: "12-hour", value: "12-hour" },
        { label: "24-hour", value: "24-hour" },
    ];

    const emailTemplateOptions = [
        { label: "Default", value: "default" },
        { label: "Professional", value: "professional" },
        { label: "Casual", value: "casual" },
        { label: "Custom", value: "custom" },
    ];

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const saveSettings = async (settingsType: string) => {
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log(`Saving ${settingsType} settings:`, {
                general: generalSettings,
                notification: notificationSettings,
                security: securitySettings,
                email: emailSettings,
            });

            showToast("success", "Success", `${settingsType} settings saved successfully!`);
        } catch (error) {
            showToast("error", "Error", `Failed to save ${settingsType} settings`);
        } finally {
            setLoading(false);
        }
    };

    const testEmailSettings = async () => {
        try {
            // Simulate email test
            await new Promise(resolve => setTimeout(resolve, 2000));
            showToast("success", "Success", "Test email sent successfully!");
        } catch (error) {
            showToast("error", "Error", "Failed to send test email");
        }
    };

    const resetToDefaults = (settingsType: string) => {
        // Reset logic would go here
        showToast("info", "Info", `${settingsType} settings reset to defaults`);
    };

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                        <div className="flex flex-column">
                            <h2 className="text-2xl font-bold m-0">Admin Settings</h2>
                            <span className="text-600">Configure system settings and preferences</span>
                        </div>
                        <Button
                            label="Save All Settings"
                            icon="pi pi-save"
                            onClick={() => saveSettings("all")}
                            loading={loading}
                            severity="success"
                        />
                    </div>

                    <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                        {/* General Settings Tab */}
                        <TabPanel header="General">
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <label htmlFor="orgName" className="font-bold">Organization Name *</label>
                                    <InputText
                                        id="orgName"
                                        value={generalSettings.organizationName}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, organizationName: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="orgEmail" className="font-bold">Organization Email *</label>
                                    <InputText
                                        id="orgEmail"
                                        type="email"
                                        value={generalSettings.organizationEmail}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, organizationEmail: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="orgPhone" className="font-bold">Organization Phone</label>
                                    <InputText
                                        id="orgPhone"
                                        value={generalSettings.organizationPhone}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, organizationPhone: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="websiteUrl" className="font-bold">Website URL</label>
                                    <InputText
                                        id="websiteUrl"
                                        value={generalSettings.websiteUrl}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, websiteUrl: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12">
                                    <label htmlFor="orgAddress" className="font-bold">Organization Address</label>
                                    <InputTextarea
                                        id="orgAddress"
                                        value={generalSettings.organizationAddress}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, organizationAddress: e.target.value })}
                                        rows={3}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-4">
                                    <label htmlFor="timezone" className="font-bold">Timezone</label>
                                    <Dropdown
                                        id="timezone"
                                        value={generalSettings.timezone}
                                        options={timezoneOptions}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.value })}
                                        placeholder="Select Timezone"
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-4">
                                    <label htmlFor="dateFormat" className="font-bold">Date Format</label>
                                    <Dropdown
                                        id="dateFormat"
                                        value={generalSettings.dateFormat}
                                        options={dateFormatOptions}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.value })}
                                        placeholder="Select Date Format"
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-4">
                                    <label htmlFor="timeFormat" className="font-bold">Time Format</label>
                                    <Dropdown
                                        id="timeFormat"
                                        value={generalSettings.timeFormat}
                                        options={timeFormatOptions}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, timeFormat: e.value })}
                                        placeholder="Select Time Format"
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12">
                                    <div className="flex gap-2 justify-content-end">
                                        <Button
                                            label="Reset to Defaults"
                                            icon="pi pi-refresh"
                                            severity="secondary"
                                            onClick={() => resetToDefaults("general")}
                                        />
                                        <Button
                                            label="Save General Settings"
                                            icon="pi pi-save"
                                            onClick={() => saveSettings("general")}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabPanel>

                        {/* Notification Settings Tab */}
                        <TabPanel header="Notifications">
                            <div className="grid">
                                <div className="col-12">
                                    <h3 className="text-lg font-semibold mb-3">Notification Channels</h3>
                                </div>
                                <div className="col-12 md:col-4">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Email Notifications</div>
                                            <div className="text-sm text-600">Send notifications via email</div>
                                        </div>
                                        <InputSwitch
                                            checked={notificationSettings.emailNotifications}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 md:col-4">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Push Notifications</div>
                                            <div className="text-sm text-600">Send push notifications</div>
                                        </div>
                                        <InputSwitch
                                            checked={notificationSettings.pushNotifications}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNotifications: e.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 md:col-4">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">SMS Notifications</div>
                                            <div className="text-sm text-600">Send SMS notifications</div>
                                        </div>
                                        <InputSwitch
                                            checked={notificationSettings.smsNotifications}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, smsNotifications: e.value })}
                                        />
                                    </div>
                                </div>

                                <div className="col-12">
                                    <h3 className="text-lg font-semibold mb-3 mt-4">Auto-Approval Settings</h3>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Auto-Approve New Members</div>
                                            <div className="text-sm text-600">Automatically approve new member registrations</div>
                                        </div>
                                        <InputSwitch
                                            checked={notificationSettings.autoApproveMembers}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, autoApproveMembers: e.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Notify on New Members</div>
                                            <div className="text-sm text-600">Send notification when new members register</div>
                                        </div>
                                        <InputSwitch
                                            checked={notificationSettings.notifyOnNewMembers}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, notifyOnNewMembers: e.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Notify on Support Requests</div>
                                            <div className="text-sm text-600">Send notification for new support requests</div>
                                        </div>
                                        <InputSwitch
                                            checked={notificationSettings.notifyOnSupportRequests}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, notifyOnSupportRequests: e.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Notify on Event Registrations</div>
                                            <div className="text-sm text-600">Send notification for event registrations</div>
                                        </div>
                                        <InputSwitch
                                            checked={notificationSettings.notifyOnEventRegistrations}
                                            onChange={(e) => setNotificationSettings({ ...notificationSettings, notifyOnEventRegistrations: e.value })}
                                        />
                                    </div>
                                </div>

                                <div className="col-12">
                                    <div className="flex gap-2 justify-content-end mt-4">
                                        <Button
                                            label="Reset to Defaults"
                                            icon="pi pi-refresh"
                                            severity="secondary"
                                            onClick={() => resetToDefaults("notifications")}
                                        />
                                        <Button
                                            label="Save Notification Settings"
                                            icon="pi pi-save"
                                            onClick={() => saveSettings("notifications")}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabPanel>

                        {/* Security Settings Tab */}
                        <TabPanel header="Security">
                            <div className="grid">
                                <div className="col-12">
                                    <h3 className="text-lg font-semibold mb-3">Authentication Settings</h3>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Require Email Verification</div>
                                            <div className="text-sm text-600">Users must verify their email address</div>
                                        </div>
                                        <InputSwitch
                                            checked={securitySettings.requireEmailVerification}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, requireEmailVerification: e.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Require Admin Approval</div>
                                            <div className="text-sm text-600">New members require admin approval</div>
                                        </div>
                                        <InputSwitch
                                            checked={securitySettings.requireAdminApproval}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, requireAdminApproval: e.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Require Strong Password</div>
                                            <div className="text-sm text-600">Enforce strong password requirements</div>
                                        </div>
                                        <InputSwitch
                                            checked={securitySettings.requireStrongPassword}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, requireStrongPassword: e.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="flex align-items-center justify-content-between p-3 border-round surface-100">
                                        <div>
                                            <div className="font-semibold">Enable Two-Factor Auth</div>
                                            <div className="text-sm text-600">Allow users to enable 2FA</div>
                                        </div>
                                        <InputSwitch
                                            checked={securitySettings.enableTwoFactorAuth}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, enableTwoFactorAuth: e.value })}
                                        />
                                    </div>
                                </div>

                                <div className="col-12">
                                    <h3 className="text-lg font-semibold mb-3 mt-4">Security Limits</h3>
                                </div>
                                <div className="col-12 md:col-4">
                                    <label htmlFor="maxLoginAttempts" className="font-bold">Max Login Attempts</label>
                                    <InputNumber
                                        id="maxLoginAttempts"
                                        value={securitySettings.maxLoginAttempts}
                                        onValueChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: e.value || 5 })}
                                        min={1}
                                        max={10}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-4">
                                    <label htmlFor="sessionTimeout" className="font-bold">Session Timeout (minutes)</label>
                                    <InputNumber
                                        id="sessionTimeout"
                                        value={securitySettings.sessionTimeout}
                                        onValueChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.value || 30 })}
                                        min={5}
                                        max={480}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-4">
                                    <label htmlFor="passwordMinLength" className="font-bold">Password Min Length</label>
                                    <InputNumber
                                        id="passwordMinLength"
                                        value={securitySettings.passwordMinLength}
                                        onValueChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: e.value || 8 })}
                                        min={6}
                                        max={20}
                                        className="w-full"
                                    />
                                </div>

                                <div className="col-12">
                                    <div className="flex gap-2 justify-content-end mt-4">
                                        <Button
                                            label="Reset to Defaults"
                                            icon="pi pi-refresh"
                                            severity="secondary"
                                            onClick={() => resetToDefaults("security")}
                                        />
                                        <Button
                                            label="Save Security Settings"
                                            icon="pi pi-save"
                                            onClick={() => saveSettings("security")}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabPanel>

                        {/* Email Settings Tab */}
                        <TabPanel header="Email">
                            <div className="grid">
                                <div className="col-12">
                                    <h3 className="text-lg font-semibold mb-3">SMTP Configuration</h3>
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="smtpHost" className="font-bold">SMTP Host *</label>
                                    <InputText
                                        id="smtpHost"
                                        value={emailSettings.smtpHost}
                                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="smtpPort" className="font-bold">SMTP Port *</label>
                                    <InputNumber
                                        id="smtpPort"
                                        value={emailSettings.smtpPort}
                                        onValueChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.value || 587 })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="smtpUsername" className="font-bold">SMTP Username *</label>
                                    <InputText
                                        id="smtpUsername"
                                        value={emailSettings.smtpUsername}
                                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpUsername: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="smtpPassword" className="font-bold">SMTP Password *</label>
                                    <InputText
                                        id="smtpPassword"
                                        type="password"
                                        value={emailSettings.smtpPassword}
                                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="fromEmail" className="font-bold">From Email *</label>
                                    <InputText
                                        id="fromEmail"
                                        type="email"
                                        value={emailSettings.fromEmail}
                                        onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="fromName" className="font-bold">From Name *</label>
                                    <InputText
                                        id="fromName"
                                        value={emailSettings.fromName}
                                        onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-6">
                                    <label htmlFor="emailTemplate" className="font-bold">Email Template</label>
                                    <Dropdown
                                        id="emailTemplate"
                                        value={emailSettings.emailTemplate}
                                        options={emailTemplateOptions}
                                        onChange={(e) => setEmailSettings({ ...emailSettings, emailTemplate: e.value })}
                                        placeholder="Select Template"
                                        className="w-full"
                                    />
                                </div>

                                <div className="col-12">
                                    <div className="flex gap-2 justify-content-end mt-4">
                                        <Button
                                            label="Test Email Settings"
                                            icon="pi pi-send"
                                            severity="info"
                                            onClick={testEmailSettings}
                                        />
                                        <Button
                                            label="Reset to Defaults"
                                            icon="pi pi-refresh"
                                            severity="secondary"
                                            onClick={() => resetToDefaults("email")}
                                        />
                                        <Button
                                            label="Save Email Settings"
                                            icon="pi pi-save"
                                            onClick={() => saveSettings("email")}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabPanel>
                    </TabView>
                </Card>
            </div>

            <Toast ref={toast} />
        </div>
    );
} 