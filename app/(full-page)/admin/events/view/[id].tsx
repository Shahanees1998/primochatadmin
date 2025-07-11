"use client";

import { useState, useRef } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { Toast } from "primereact/toast";
import { useRouter } from "next/navigation";

interface EventFormData {
    title: string;
    description: string;
    startDate: Date | null;
    endDate: Date | null;
    location: string;
    category: string;
    type: string;
    isRSVP: boolean;
    maxAttendees: number | null;
}

export default function CreateEventPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<EventFormData>({
        title: "",
        description: "",
        startDate: null,
        endDate: null,
        location: "",
        category: "",
        type: "",
        isRSVP: false,
        maxAttendees: null,
    });
    const [loading, setLoading] = useState(false);
    const toast = useRef<Toast>(null);

    const categoryOptions = [
        { label: "Regular Meeting", value: "REGULAR_MEETING" },
        { label: "District", value: "DISTRICT" },
        { label: "Emergent", value: "EMERGENT" },
        { label: "Practice", value: "PRACTICE" },
        { label: "CGP", value: "CGP" },
        { label: "Social", value: "SOCIAL" },
    ];

    const typeOptions = [
        { label: "Regular", value: "REGULAR" },
        { label: "Social", value: "SOCIAL" },
        { label: "District", value: "DISTRICT" },
        { label: "Emergent", value: "EMERGENT" },
    ];

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const createEvent = async () => {
        if (!formData.title.trim() || !formData.startDate || !formData.category || !formData.type) {
            showToast("error", "Error", "Please fill in all required fields");
            return;
        }

        if (formData.endDate && formData.startDate && formData.endDate <= formData.startDate) {
            showToast("error", "Error", "End date must be after start date");
            return;
        }

        setLoading(true);
        try {
            const eventData = {
                ...formData,
                startDate: formData.startDate?.toISOString(),
                endDate: formData.endDate?.toISOString(),
            };

            const response = await fetch('/api/admin/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create event');
            }

            const result = await response.json();
            showToast("success", "Success", "Event created successfully!");
            
            // Reset form
            setFormData({
                title: "",
                description: "",
                startDate: null,
                endDate: null,
                location: "",
                category: "",
                type: "",
                isRSVP: false,
                maxAttendees: null,
            });

            // Redirect to events list after a short delay
            setTimeout(() => {
                router.push('/admin/events');
            }, 1500);
        } catch (error) {
            showToast("error", "Error", error instanceof Error ? error.message : "Failed to create event");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                        <div className="flex flex-column">
                            <h2 className="text-2xl font-bold m-0">Create New Event</h2>
                            <span className="text-600">Schedule a new event for your organization</span>
                        </div>
                        <Button
                            label="Back to Events"
                            icon="pi pi-arrow-left"
                            onClick={() => router.push('/admin/events')}
                            severity="secondary"
                        />
                    </div>

                    <div className="grid">
                        <div className="col-12">
                            <label htmlFor="title" className="font-bold">Event Title *</label>
                            <InputText
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter event title"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12">
                            <label htmlFor="description" className="font-bold">Description</label>
                            <InputTextarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                placeholder="Enter event description..."
                                className="w-full"
                            />
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="startDate" className="font-bold">Start Date & Time *</label>
                            <Calendar
                                id="startDate"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.value as Date })}
                                showIcon
                                showTime
                                dateFormat="dd/mm/yy"
                                placeholder="Select start date and time"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="endDate" className="font-bold">End Date & Time</label>
                            <Calendar
                                id="endDate"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.value as Date })}
                                showIcon
                                showTime
                                dateFormat="dd/mm/yy"
                                placeholder="Select end date and time"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12">
                            <label htmlFor="location" className="font-bold">Location</label>
                            <InputText
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Enter event location"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="category" className="font-bold">Category *</label>
                            <Dropdown
                                id="category"
                                value={formData.category}
                                options={categoryOptions}
                                onChange={(e) => setFormData({ ...formData, category: e.value })}
                                placeholder="Select category"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12 md:col-6">
                            <label htmlFor="type" className="font-bold">Type *</label>
                            <Dropdown
                                id="type"
                                value={formData.type}
                                options={typeOptions}
                                onChange={(e) => setFormData({ ...formData, type: e.value })}
                                placeholder="Select type"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12">
                            <label className="font-bold">RSVP Settings</label>
                            <div className="flex align-items-center mt-2">
                                <InputSwitch
                                    checked={formData.isRSVP}
                                    onChange={(e) => setFormData({ ...formData, isRSVP: e.value })}
                                    className="mr-2"
                                />
                                <label htmlFor="isRSVP">Require RSVP for this event</label>
                            </div>
                        </div>

                        {formData.isRSVP && (
                            <div className="col-12 md:col-6">
                                <label htmlFor="maxAttendees" className="font-bold">Maximum Attendees</label>
                                <InputNumber
                                    id="maxAttendees"
                                    value={formData.maxAttendees}
                                    onValueChange={(e) => setFormData({ ...formData, maxAttendees: e.value || null })}
                                    placeholder="Enter maximum number of attendees"
                                    min={1}
                                    className="w-full"
                                />
                            </div>
                        )}

                        <div className="col-12">
                            <div className="flex gap-2 justify-content-end">
                                <Button
                                    label="Cancel"
                                    icon="pi pi-times"
                                    severity="secondary"
                                    onClick={() => router.push('/admin/events')}
                                />
                                <Button
                                    label="Create Event"
                                    icon="pi pi-plus"
                                    onClick={createEvent}
                                    loading={loading}
                                    severity="success"
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <Toast ref={toast} />
        </div>
    );
} 