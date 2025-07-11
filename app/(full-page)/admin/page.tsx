"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { useRouter } from "next/navigation";

interface DashboardStats {
    totalUsers: number;
    pendingApprovals: number;
    activeEvents: number;
    supportRequests: number;
    documents: number;
    festiveBoards: number;
}

interface RecentActivity {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        pendingApprovals: 0,
        activeEvents: 0,
        supportRequests: 0,
        documents: 0,
        festiveBoards: 0,
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Simulate API calls
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setStats({
                totalUsers: 156,
                pendingApprovals: 8,
                activeEvents: 12,
                supportRequests: 5,
                documents: 45,
                festiveBoards: 7,
            });

            setRecentActivity([
                {
                    id: "1",
                    type: "USER_REGISTRATION",
                    description: "New user registration: John Doe",
                    timestamp: new Date().toISOString(),
                    user: "System",
                },
                {
                    id: "2",
                    type: "EVENT_CREATED",
                    description: "New event created: Monthly Meeting",
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    user: "Admin",
                },
                {
                    id: "3",
                    type: "SUPPORT_REQUEST",
                    description: "New support request: Login issue",
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    user: "Jane Smith",
                },
                {
                    id: "4",
                    type: "DOCUMENT_UPLOADED",
                    description: "Document uploaded: Meeting Minutes",
                    timestamp: new Date(Date.now() - 10800000).toISOString(),
                    user: "Admin",
                },
            ]);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const chartData = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June'],
        datasets: [
            {
                label: 'New Members',
                data: [12, 19, 15, 25, 22, 30],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
            },
            {
                label: 'Events',
                data: [8, 12, 10, 15, 18, 20],
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
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
            case "SUPPORT_REQUEST": return "warning";
            case "DOCUMENT_UPLOADED": return "secondary";
            default: return "info";
        }
    };

    const getActivityTypeLabel = (type: string) => {
        switch (type) {
            case "USER_REGISTRATION": return "Registration";
            case "EVENT_CREATED": return "Event";
            case "SUPPORT_REQUEST": return "Support";
            case "DOCUMENT_UPLOADED": return "Document";
            default: return type;
        }
    };

    const quickActions = [
        {
            title: "Manage Users",
            description: "Approve, edit, or manage member accounts",
            icon: "pi pi-users",
            route: "/admin/users",
            color: "blue",
        },
        {
            title: "Send Announcement",
            description: "Broadcast messages to all members",
            icon: "pi pi-bullhorn",
            route: "/admin/communications/announcement",
            color: "orange",
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
            color: "purple",
        },
        {
            title: "Festive Board",
            description: "Manage meal plans and contributions",
            icon: "pi pi-list",
            route: "/admin/festive-board",
            color: "teal",
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
            <div className="col-12 md:col-6 lg:col-2">
                <Card className="text-center">
                    <div className="text-3xl font-bold text-blue-500">{stats.totalUsers}</div>
                    <div className="text-600">Total Users</div>
                </Card>
            </div>
            <div className="col-12 md:col-6 lg:col-2">
                <Card className="text-center">
                    <div className="text-3xl font-bold text-orange-500">{stats.pendingApprovals}</div>
                    <div className="text-600">Pending Approvals</div>
                </Card>
            </div>
            <div className="col-12 md:col-6 lg:col-2">
                <Card className="text-center">
                    <div className="text-3xl font-bold text-green-500">{stats.activeEvents}</div>
                    <div className="text-600">Active Events</div>
                </Card>
            </div>
            <div className="col-12 md:col-6 lg:col-2">
                <Card className="text-center">
                    <div className="text-3xl font-bold text-red-500">{stats.supportRequests}</div>
                    <div className="text-600">Support Requests</div>
                </Card>
            </div>
            <div className="col-12 md:col-6 lg:col-2">
                <Card className="text-center">
                    <div className="text-3xl font-bold text-purple-500">{stats.documents}</div>
                    <div className="text-600">Documents</div>
                </Card>
            </div>
            <div className="col-12 md:col-6 lg:col-2">
                <Card className="text-center">
                    <div className="text-3xl font-bold text-teal-500">{stats.festiveBoards}</div>
                    <div className="text-600">Festive Boards</div>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="col-12">
                <Card title="Quick Actions" className="mt-4">
                    <div className="grid">
                        {quickActions.map((action, index) => (
                            <div key={index} className="col-12 md:col-6 lg:col-4">
                                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push(action.route)}>
                                    <div className="flex align-items-center gap-3">
                                        <i className={`${action.icon} text-2xl text-${action.color}-500`}></i>
                                        <div>
                                            <h3 className="text-lg font-semibold m-0">{action.title}</h3>
                                            <p className="text-600 text-sm m-0">{action.description}</p>
                                        </div>
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
                    <Chart type="line" data={chartData} options={chartOptions} style={{ height: '300px' }} />
                </Card>
            </div>

            <div className="col-12 lg:col-4">
                <Card title="Recent Activity" className="mt-4">
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
                                    {new Date(rowData.timestamp).toLocaleTimeString()}
                                </div>
                            )}
                        />
                    </DataTable>
                </Card>
            </div>
        </div>
    );
} 