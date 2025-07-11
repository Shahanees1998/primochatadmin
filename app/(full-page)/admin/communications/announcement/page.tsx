"use client";

import { useState, useRef } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";
import { useRouter } from "next/navigation";
import { Tag } from "primereact/tag";

interface AnnouncementFormData {
    title: string;
    message: string;
    priority: string;
    targetAudience: string[];
    scheduledDate: Date | null;
    sendImmediately: boolean;
    includeEmail: boolean;
    includePushNotification: boolean;
}

export default function AnnouncementPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<AnnouncementFormData>({
        title: "",
        message: "",
        priority: "NORMAL",
        targetAudience: ["ALL_MEMBERS"],
        scheduledDate: null,
        sendImmediately: true,
        includeEmail: true,
        includePushNotification: true,
    });
    const [loading, setLoading] = useState(false);
    const toast = useRef<Toast>(null);

    const priorityOptions = [
        { label: "Low", value: "LOW" },
        { label: "Normal", value: "NORMAL" },
        { label: "High", value: "HIGH" },
        { label: "Urgent", value: "URGENT" },
    ];

    const audienceOptions = [
        { label: "All Members", value: "ALL_MEMBERS" },
        { label: "Active Members Only", value: "ACTIVE_MEMBERS" },
        { label: "Admins Only", value: "ADMINS_ONLY" },
        { label: "Moderators Only", value: "MODERATORS_ONLY" },
        { label: "New Members (Last 30 days)", value: "NEW_MEMBERS" },
    ];

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handleAudienceChange = (value: string) => {
        const currentAudience = formData.targetAudience;
        if (currentAudience.includes(value)) {
            setFormData({
                ...formData,
                targetAudience: currentAudience.filter(audience => audience !== value)
            });
        } else {
            setFormData({
                ...formData,
                targetAudience: [...currentAudience, value]
            });
        }
    };

    const sendAnnouncement = async () => {
        if (!formData.title.trim() || !formData.message.trim()) {
            showToast("error", "Error", "Please fill in all required fields");
            return;
        }

        if (formData.targetAudience.length === 0) {
            showToast("error", "Error", "Please select at least one target audience");
            return;
        }

        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            const announcementData = {
                ...formData,
                scheduledDate: formData.scheduledDate?.toISOString(),
                targetAudience: formData.targetAudience,
            };

            console.log("Sending announcement:", announcementData);

            showToast("success", "Success", "Announcement sent successfully!");
            
            // Reset form
            setFormData({
                title: "",
                message: "",
                priority: "NORMAL",
                targetAudience: ["ALL_MEMBERS"],
                scheduledDate: null,
                sendImmediately: true,
                includeEmail: true,
                includePushNotification: true,
            });
        } catch (error) {
            showToast("error", "Error", "Failed to send announcement");
        } finally {
            setLoading(false);
        }
    };

    const getPrioritySeverity = (priority: string) => {
        switch (priority) {
            case "LOW": return "info";
            case "NORMAL": return "success";
            case "HIGH": return "warning";
            case "URGENT": return "danger";
            default: return "info";
        }
    };

    const getAudienceLabel = (value: string) => {
        const option = audienceOptions.find(opt => opt.value === value);
        return option ? option.label : value;
    };

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                        <div className="flex flex-column">
                            <h2 className="text-2xl font-bold m-0">Send Announcement</h2>
                            <span className="text-600">Broadcast messages to all members</span>
                        </div>
                        <Button
                            label="View Sent Announcements"
                            icon="pi pi-list"
                            onClick={() => router.push('/admin/communications/messages')}
                            severity="secondary"
                        />
                    </div>

                    <div className="grid">
                        <div className="col-12">
                            <label htmlFor="title" className="font-bold">Announcement Title *</label>
                            <InputText
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter announcement title"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12">
                            <label htmlFor="message" className="font-bold">Message *</label>
                            <InputTextarea
                                id="message"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                rows={6}
                                placeholder="Enter your announcement message..."
                                className="w-full"
                            />
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="priority" className="font-bold">Priority</label>
                            <Dropdown
                                id="priority"
                                value={formData.priority}
                                options={priorityOptions}
                                onChange={(e) => setFormData({ ...formData, priority: e.value })}
                                placeholder="Select Priority"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="scheduledDate" className="font-bold">Schedule Date (Optional)</label>
                            <Calendar
                                id="scheduledDate"
                                value={formData.scheduledDate}
                                onChange={(e) => setFormData({ ...formData, scheduledDate: e.value as Date })}
                                showIcon
                                showTime
                                dateFormat="dd/mm/yy"
                                placeholder="Select date and time"
                                disabled={formData.sendImmediately}
                                className="w-full"
                            />
                        </div>

                        <div className="col-12">
                            <label className="font-bold mb-3 block">Target Audience *</label>
                            <div className="grid">
                                {audienceOptions.map((option) => (
                                    <div key={option.value} className="col-12 md:col-6 lg:col-4">
                                        <div className="flex align-items-center">
                                            <Checkbox
                                                inputId={option.value}
                                                checked={formData.targetAudience.includes(option.value)}
                                                onChange={() => handleAudienceChange(option.value)}
                                            />
                                            <label htmlFor={option.value} className="ml-2">
                                                {option.label}
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-12">
                            <label className="font-bold mb-3 block">Delivery Options</label>
                            <div className="grid">
                                <div className="col-12 md:col-4">
                                    <div className="flex align-items-center">
                                        <Checkbox
                                            inputId="sendImmediately"
                                            checked={formData.sendImmediately}
                                            onChange={(e) => setFormData({ ...formData, sendImmediately: e.checked || false })}
                                        />
                                        <label htmlFor="sendImmediately" className="ml-2">
                                            Send Immediately
                                        </label>
                                    </div>
                                </div>
                                <div className="col-12 md:col-4">
                                    <div className="flex align-items-center">
                                        <Checkbox
                                            inputId="includeEmail"
                                            checked={formData.includeEmail}
                                            onChange={(e) => setFormData({ ...formData, includeEmail: e.checked || false })}
                                        />
                                        <label htmlFor="includeEmail" className="ml-2">
                                            Send Email
                                        </label>
                                    </div>
                                </div>
                                <div className="col-12 md:col-4">
                                    <div className="flex align-items-center">
                                        <Checkbox
                                            inputId="includePushNotification"
                                            checked={formData.includePushNotification}
                                            onChange={(e) => setFormData({ ...formData, includePushNotification: e.checked || false })}
                                        />
                                        <label htmlFor="includePushNotification" className="ml-2">
                                            Push Notification
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-12">
                            <div className="flex gap-2 justify-content-end">
                                <Button
                                    label="Preview"
                                    icon="pi pi-eye"
                                    severity="secondary"
                                    onClick={() => {
                                        // Preview functionality
                                        showToast("info", "Preview", "Preview functionality would show here");
                                    }}
                                />
                                <Button
                                    label="Send Announcement"
                                    icon="pi pi-send"
                                    onClick={sendAnnouncement}
                                    loading={loading}
                                    severity="success"
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Preview Card */}
            {formData.title && formData.message && (
                <div className="col-12">
                    <Card title="Preview" className="mt-3">
                        <div className="flex flex-column gap-3">
                            <div>
                                <h3 className="text-xl font-bold m-0">{formData.title}</h3>
                                <Tag 
                                    value={formData.priority} 
                                    severity={getPrioritySeverity(formData.priority)} 
                                    className="mt-2"
                                />
                            </div>
                            <div className="text-600">
                                {formData.message}
                            </div>
                            <div className="flex flex-column gap-2">
                                <div className="text-sm">
                                    <strong>Target Audience:</strong> {formData.targetAudience.map(getAudienceLabel).join(", ")}
                                </div>
                                <div className="text-sm">
                                    <strong>Delivery:</strong> {formData.sendImmediately ? "Immediate" : `Scheduled for ${formData.scheduledDate?.toLocaleString()}`}
                                </div>
                                <div className="text-sm">
                                    <strong>Channels:</strong> {[
                                        formData.includeEmail && "Email",
                                        formData.includePushNotification && "Push Notification"
                                    ].filter(Boolean).join(", ")}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <Toast ref={toast} />
        </div>
    );
} 