"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";

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
        priority: "GENERAL",
        targetAudience: ["ALL"],
        scheduledDate: null,
        sendImmediately: true,
        includeEmail: true,
        includePushNotification: true,
    });
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const toast = useRef<Toast>(null);

    // Check for edit data from sessionStorage
    useEffect(() => {
        const editData = sessionStorage.getItem('editAnnouncement');
        if (editData) {
            try {
                const announcement = JSON.parse(editData);
                // Map old priority values to new announcement types
                const mapPriorityToType = (priority: string) => {
                    switch (priority) {
                        case "LOW": return "GENERAL";
                        case "NORMAL": return "GENERAL";
                        case "HIGH": return "IMPORTANT";
                        case "URGENT": return "URGENT";
                        default: return priority;
                    }
                };

                // Map old audience values to new target audience values
                const mapAudienceToTarget = (audience: string) => {
                    switch (audience) {
                        case "ALL_MEMBERS": return "ALL";
                        case "ACTIVE_MEMBERS": return "MEMBERS";
                        case "ADMINS_ONLY": return "ADMINS";
                        case "MODERATORS_ONLY": return "ADMINS";
                        case "NEW_MEMBERS": return "NEW_MEMBERS";
                        default: return audience;
                    }
                };

                setFormData({
                    title: announcement.title || "",
                    message: announcement.content || "",
                    priority: mapPriorityToType(announcement.type || "GENERAL"),
                    targetAudience: [mapAudienceToTarget(announcement.targetAudience || "ALL")],
                    scheduledDate: announcement.expiresAt ? new Date(announcement.expiresAt) : null,
                    sendImmediately: !announcement.expiresAt,
                    includeEmail: true,
                    includePushNotification: true,
                });
                setIsEditing(true);
                setEditingAnnouncementId(announcement.id);
                sessionStorage.removeItem('editAnnouncement'); // Clean up
            } catch (error) {
                console.error('Error parsing edit announcement data:', error);
                sessionStorage.removeItem('editAnnouncement');
            }
        }
    }, []);

    const priorityOptions = [
        { label: "General", value: "GENERAL" },
        { label: "Important", value: "IMPORTANT" },
        { label: "Urgent", value: "URGENT" },
        { label: "Event", value: "EVENT" },
        { label: "Update", value: "UPDATE" },
    ];

    const audienceOptions = [
        { label: "All Members", value: "ALL" },
        { label: "Members Only", value: "MEMBERS" },
        { label: "Admins Only", value: "ADMINS" },
        { label: "New Members", value: "NEW_MEMBERS" },
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

    const sendAnnouncementToChatRooms = async (announcement: any) => {
        try {
            // Get all active users based on target audience
            let userQuery = '';
            if (formData.targetAudience.includes('ALL')) {
                userQuery = '?status=ACTIVE';
            } else if (formData.targetAudience.includes('ADMINS')) {
                userQuery = '?status=ACTIVE&role=ADMIN';
            } else if (formData.targetAudience.includes('MEMBERS')) {
                userQuery = '?status=ACTIVE&role=MEMBER';
            } else if (formData.targetAudience.includes('NEW_MEMBERS')) {
                // For new members, we'll get all active members and filter by creation date in the frontend
                userQuery = '?status=ACTIVE';
            }
            const usersResponse = await fetch(`/api/admin/users${userQuery}`);
            if (!usersResponse.ok) {
                throw new Error('Failed to fetch users');
            }
            const usersData = await usersResponse.json();
            let filteredUsers = usersData.users;
            
            // Filter for new members if needed
            if (formData.targetAudience.includes('NEW_MEMBERS')) {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filteredUsers = usersData.users.filter((user: any) => {
                    const userCreatedAt = new Date(user.createdAt);
                    return userCreatedAt >= thirtyDaysAgo;
                });
            }
            
            const userIds = filteredUsers.map((user: any) => user.id);
            if (userIds.length === 0) {
                showToast("warn", "Warning", "No users found for target audience");
                return;
            }
            // Create a group chat room with all target users
            const chatRoomResponse = await fetch('/api/admin/chat/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantIds: userIds,
                    isGroup: true,
                    name: `Announcement: ${announcement.title}`
                }),
            });
            if (!chatRoomResponse.ok) {
                throw new Error('Failed to create chat room');
            }
            const chatRoom = await chatRoomResponse.json();
            // Send announcement message to the chat room
            const messageResponse = await fetch('/api/admin/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatRoomId: chatRoom.id,
                    content: `📢 **${announcement.title}**\n\n${announcement.content}\n\n*Sent by Admin*`,
                    type: 'TEXT'
                }),
            });
            if (!messageResponse.ok) {
                throw new Error('Failed to send message');
            }
            showToast("success", "Success", "Announcement also sent to users in chat rooms!");
        } catch (error) {
            console.error('Error sending announcement to chat rooms:', error);
            showToast("warn", "Warning", "Announcement saved but failed to send to chat rooms");
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
            const announcementData = {
                title: formData.title,
                content: formData.message,
                type: formData.priority,
                status: "PUBLISHED",
                targetAudience: formData.targetAudience[0],
                expiresAt: formData.scheduledDate?.toISOString(),
            };

            let newAnnouncement = null;
            if (isEditing && editingAnnouncementId) {
                // Update existing announcement
                const response = await fetch(`/api/admin/announcements/${editingAnnouncementId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(announcementData),
                });

                if (!response.ok) {
                    throw new Error('Failed to update announcement');
                }

                showToast("success", "Success", "Announcement updated successfully!");
            } else {
                // Create new announcement
                const response = await fetch('/api/admin/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(announcementData),
                });

                if (!response.ok) {
                    throw new Error('Failed to create announcement');
                }

                newAnnouncement = await response.json();
                showToast("success", "Success", "Announcement created and saved to database!");
                // Send announcement to chat rooms if at least one delivery option is checked
                if (formData.includeEmail || formData.includePushNotification) {
                    await sendAnnouncementToChatRooms(newAnnouncement);
                }
            }
            
            // Navigate back to the announcements list
            router.push('/admin/communications/announcements');
        } catch (error) {
            showToast("error", "Error", isEditing ? "Failed to update announcement" : "Failed to send announcement");
        } finally {
            setLoading(false);
        }
    };

    const getPrioritySeverity = (priority: string) => {
        switch (priority) {
            case "GENERAL": return "info";
            case "IMPORTANT": return "warning";
            case "URGENT": return "danger";
            case "EVENT": return "success";
            case "UPDATE": return "info";
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
                            <h2 className="text-2xl font-bold m-0">
                                {isEditing ? "Edit Announcement" : "Send Announcement"}
                            </h2>
                            <span className="text-600">
                                {isEditing ? "Update announcement details" : "Broadcast messages to all members"}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                label="Back to List"
                                icon="pi pi-list"
                                onClick={() => router.push('/admin/communications/announcements')}
                                severity="secondary"
                            />
                        </div>
                    </div>

                    <div className="grid">
                    <div className="col-12 md:col-6">
                    <label htmlFor="title" className="font-bold">Announcement Title *</label>
                            <InputText
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter announcement title"
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


                        <div className="col-12">
                            <div className="flex gap-2 justify-content-end">
                                <Button
                                    label={showPreview ? "Hide Preview" : "Preview"}
                                    icon={showPreview ? "pi pi-eye-slash" : "pi pi-eye"}
                                    severity="secondary"
                                    onClick={() => setShowPreview(!showPreview)}
                                    disabled={!formData.title.trim() || !formData.message.trim()}
                                />
                                <Button
                                    label={isEditing ? "Update Announcement" : "Send Announcement"}
                                    icon={isEditing ? "pi pi-check" : "pi pi-send"}
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
            {showPreview && formData.title && formData.message && (
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