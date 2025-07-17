"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { useRouter } from "next/navigation";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { apiClient } from "@/lib/apiClient";

interface DashboardStats {
    totalUsers: number;
    pendingApprovals: number;
    activeTrestleBoards: number;
    activeFestiveBoards: number;
    supportRequests: number;
    documents: number;
}

interface RecentActivity {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
    status?: string;
    startDate?: string;
}

interface GrowthData {
    labels: string[];
    newMembers: number[];
    trestleBoards: number[];
    festiveBoards: number[];
}

export default function AdminDashboard() {
    const router = useRouter();
    const toast = useRef<Toast>(null);
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        pendingApprovals: 0,
        activeTrestleBoards: 0,
        activeFestiveBoards: 0,
        supportRequests: 0,
        documents: 0
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [growthData, setGrowthData] = useState<GrowthData>({
        labels: [],
        newMembers: [],
        trestleBoards: [],
        festiveBoards: []
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const response = await apiClient.getDashboard();
            
            if (response.error) {
                throw new Error(response.error);
            }

            if (response.data) {
                setStats(response.data.stats);
                setRecentActivity(response.data.recentActivity);
                setGrowthData(response.data.growthData);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Error loading dashboard data:", error);
            showToast("error", "Error", "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return `${diffInSeconds}s ago`;
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}d ago`;
        }
    };

    const chartData = {
        labels: growthData.labels,
        datasets: [
            {
                label: 'New Members',
                data: growthData.newMembers,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
            },
            {
                label: 'TrestleBoards',
                data: growthData.trestleBoards,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
            },
            {
                label: 'FestiveBoards',
                data: growthData.festiveBoards,
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                tension: 0.4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    const getActivityTypeSeverity = (type: string) => {
        switch (type) {
            case "USER_REGISTRATION": return "success";
            case "EVENT_CREATED": return "info";
            case "FESTIVE_BOARD_CREATED": return "warning";
            case "SUPPORT_REQUEST": return "warning";
            case "DOCUMENT_UPLOADED": return "secondary";
            default: return "info";
        }
    };

    const getActivityTypeLabel = (type: string) => {
        switch (type) {
            case "USER_REGISTRATION": return "Registration";
            case "EVENT_CREATED": return "TrestleBoard";
            case "FESTIVE_BOARD_CREATED": return "FestiveBoard";
            case "SUPPORT_REQUEST": return "Support";
            case "DOCUMENT_UPLOADED": return "Document";
            default: return type;
        }
    };

    const quickActions = [
        {
            title: "Manage Members",
            description: "Approve, edit, or manage member accounts",
            icon: "pi pi-users",
            route: "/admin/users",
            color: "blue",
        },
        {
            title: "Trestle Boards",
            description: "Manage trestle board events and meetings",
            icon: "pi pi-calendar",
            route: "/admin/trestle-board",
            color: "green",
            refreshAction: () => loadDashboardData(),
        },
        {
            title: "Festive Boards",
            description: "Manage festive board meals and selections",
            icon: "pi pi-apple",
            route: "/admin/festive-board",
            color: "orange",
            refreshAction: () => loadDashboardData(),
        },
        {
            title: "Send Announcement",
            description: "Broadcast messages to all members",
            icon: "pi pi-bullhorn",
            route: "/admin/communications/announcement",
            color: "purple",
        },
        {
            title: "Support Requests",
            description: "Handle member support and inquiries",
            icon: "pi pi-question-circle",
            route: "/admin/support",
            color: "red",
        },
        {
            title: "Upload Documents",
            description: "Manage and organize documents",
            icon: "pi pi-file-plus",
            route: "/admin/documents",
            color: "indigo",
        },
    ];

    const cardData = [
        {
            value: stats.totalUsers,
            label: "Total Members",
            color: "text-blue-500",
            route: "/admin/users",
        },
        {
            value: stats.pendingApprovals,
            label: "Pending Approvals",
            color: "text-orange-500",
            route: "/admin/users/pending",
        },
        {
            value: stats.activeTrestleBoards,
            label: "Active TrestleBoards",
            color: "text-green-500",
            route: "/admin/trestle-board",
        },
        {
            value: stats.activeFestiveBoards,
            label: "Active FestiveBoards",
            color: "text-yellow-500",
            route: "/admin/festive-board",
        },
        {
            value: stats.supportRequests,
            label: "Support Requests",
            color: "text-red-500",
            route: "/admin/support",
        },
        {
            value: stats.documents,
            label: "Documents",
            color: "text-purple-500",
            route: "/admin/documents",
        },
    ];

    return (
        <div className="grid">
            {/* Header */}
            <div className="col-12">
                <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                    <div>
                        <h1 className="text-3xl font-bold m-0">Admin Dashboard</h1>
                        <p className="text-600 mt-2 mb-0">Welcome back! Here's what's happening with your organization.</p>
                        <p className="text-sm text-gray-500 mt-1 mb-0">
                            {new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })} • {new Date().toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                            {lastUpdated && (
                                <span className="ml-3">
                                    • Last updated: {lastUpdated.toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            onClick={loadDashboardData}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {loading ? (
                // Loading skeleton for stats cards
                <>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="col-12 md:col-6 lg:col-2">
                            <Card className="text-center">
                                <div className="text-3xl font-bold text-gray-300 animate-pulse">--</div>
                                <div className="text-600 animate-pulse">Loading...</div>
                            </Card>
                        </div>
                    ))}
                </>
            ) : (
                <>
                    {cardData.map((card) => (
                        <div className="col-12 md:col-6 lg:col-2" key={card.label}>
                            <Card
                                style={{ height: "150px" }}
                                className="text-center cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => router.push(card.route)}
                                role="button"
                                tabIndex={0}
                                onKeyPress={e => { if (e.key === "Enter") router.push(card.route); }}
                            >
                                <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
                                <div className="text-600">{card.label}</div>
                            </Card>
                        </div>
                    ))}
                </>
            )}

            {/* Quick Actions */}
            <div className="col-12">
                <Card title="Quick Actions" className="mt-4">
                    <div className="grid">
                        {quickActions.map((action, index) => (
                            <div key={index} className="col-12 md:col-6 lg:col-4">
                                <Card style={{height : '120px'}} className="cursor-pointer hover:shadow-lg transition-shadow">
                                    <div className="flex align-items-center justify-content-between h-full">
                                        <div 
                                            className="flex align-items-center gap-3 flex-1 cursor-pointer"
                                            onClick={() => router.push(action.route)}
                                        >
                                            <i className={`${action.icon} text-2xl text-${action.color}-500`}></i>
                                            <div>
                                                <h3 className="text-lg font-semibold m-0">{action.title}</h3>
                                                <p className="text-600 text-sm m-0">{action.description}</p>
                                            </div>
                                        </div>
                                        {action.refreshAction && (
                                            <Button
                                                icon="pi pi-refresh"
                                                size="small"
                                                severity="secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    action.refreshAction();
                                                }}
                                                tooltip="Refresh Data"
                                            />
                                        )}
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Charts and Activity */}
            <div className="col-12 lg:col-8">
                <Card title="Growth Overview" className="mt-4">
                    {loading ? (
                        <div className="flex align-items-center justify-content-center" style={{ height: '300px' }}>
                            <div className="text-600">Loading chart data...</div>
                        </div>
                    ) : growthData.newMembers.every(val => val === 0) && growthData.trestleBoards.every(val => val === 0) && growthData.festiveBoards.every(val => val === 0) ? (
                        <div className="flex align-items-center justify-content-center flex-column" style={{ height: '300px' }}>
                            <i className="pi pi-chart-line text-4xl text-gray-400 mb-3"></i>
                            <div className="text-600 text-center">No growth data available</div>
                            <div className="text-sm text-gray-500 text-center">Growth data will appear here as users, trestleBoards, and festiveBoards are created</div>
                        </div>
                    ) : (
                        <Chart type="line" data={chartData} options={chartOptions} style={{ height: '300px' }} />
                    )}
                </Card>
            </div>

            <div className="col-12 lg:col-4">
                <Card title="Recent Activity" className="mt-4">
                    {loading ? (
                        <div className="flex align-items-center justify-content-center" style={{ height: '200px' }}>
                            <div className="text-600">Loading activity...</div>
                        </div>
                    ) : recentActivity.length === 0 ? (
                        <div className="flex align-items-center justify-content-center flex-column" style={{ height: '200px' }}>
                            <i className="pi pi-info-circle text-4xl text-gray-400 mb-3"></i>
                            <div className="text-600 text-center">No recent activity</div>
                            <div className="text-sm text-gray-500 text-center">Activities will appear here as they occur</div>
                        </div>
                    ) : (
                        <DataTable value={recentActivity} showGridlines>
                            <Column 
                                field="type" 
                                header="Type" 
                                body={(rowData) => (
                                    <Tag 
                                        value={getActivityTypeLabel(rowData.type)} 
                                        severity={getActivityTypeSeverity(rowData.type)} 
                                    />
                                )}
                            />
                            <Column 
                                field="description" 
                                header="Description" 
                                body={(rowData) => (
                                    <div className="text-sm">
                                        <div className="font-semibold">{rowData.description}</div>
                                        <div className="text-600">{rowData.user}</div>
                                    </div>
                                )}
                            />
                            <Column 
                                field="timestamp" 
                                header="Time" 
                                body={(rowData) => (
                                    <div className="text-xs text-600">
                                        {formatRelativeTime(rowData.timestamp)}
                                    </div>
                                )}
                            />
                        </DataTable>
                    )}
                </Card>
            </div>

            <Toast ref={toast} />
        </div>
    );
} 