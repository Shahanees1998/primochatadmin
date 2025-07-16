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
    startTime: string;
    endTime: string;
    location: string;
    category: string;
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
        startTime: "",
        endTime: "",
        location: "",
        category: "",
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

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const createEvent = async () => {
        if (!formData.title.trim() || !formData.startDate || !formData.category) {
            showToast("error", "Error", "Please fill in all required fields");
            return;
        }

        if (formData.endDate && formData.startDate && formData.endDate <= formData.startDate) {
            showToast("error", "Error", "End date must be after start date");
            return;
        }

        setLoading(true);
        try {
            const trestleBoardData = {
                ...formData,
                startDate: formData.startDate?.toISOString(),
                endDate: formData.endDate?.toISOString(),
            };

            const response = await fetch('/api/admin/trestle-board', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(trestleBoardData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create Trestle Board');
            }

            const result = await response.json();
            showToast("success", "Success", "Trestle Board created successfully!");
            
            // Reset form
            setFormData({
                title: "",
                description: "",
                startDate: null,
                endDate: null,
                startTime: "",
                endTime: "",
                location: "",
                category: "",
                isRSVP: false,
                maxAttendees: null,
            });

            // Redirect to events list after a short delay
            setTimeout(() => {
                router.push('/admin/trestle-board');
            }, 1500);
        } catch (error) {
            showToast("error", "Error", error instanceof Error ? error.message : "Failed to create Trestle Board");
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
                            <h2 className="text-2xl font-bold m-0">Create New Trestle Board</h2>
                            <span className="text-600">Schedule a new Trestle Board for your organization</span>
                        </div>
                        <Button
                            label="Back to Trestle Board"
                            icon="pi pi-arrow-left"
                            onClick={() => router.push('/admin/trestle-board')}
                            severity="secondary"
                        />
                    </div>

                    <div className="grid">
                        <div className="col-12">
                            <label htmlFor="title" className="font-bold">Trestle Board Title *</label>
                            <InputText
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter Trestle Board title"
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
                                placeholder="Enter Trestle Board description..."
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

                        <div className="col-12 md:col-6">
                            <label htmlFor="startTime" className="font-bold">Start Time</label>
                            <InputText
                                id="startTime"
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="endTime" className="font-bold">End Time</label>
                            <InputText
                                id="endTime"
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full"
                            />
                        </div>

                        <div className="col-12">
                            <label htmlFor="location" className="font-bold">Location</label>
                            <InputText
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Enter Trestle Board location"
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

                        <div className="col-12">
                            <label className="font-bold">RSVP Settings</label>
                            <div className="flex align-items-center mt-2">
                                <InputSwitch
                                    checked={formData.isRSVP}
                                    onChange={(e) => setFormData({ ...formData, isRSVP: e.value })}
                                    className="mr-2"
                                />
                                <label htmlFor="isRSVP">Require RSVP for this Trestle Board</label>
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
                                    onClick={() => router.push('/admin/trestle-board')}
                                />
                                <Button
                                    label="Create Trestle Board"
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