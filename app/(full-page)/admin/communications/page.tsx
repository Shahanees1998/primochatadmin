"use client";

import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Badge } from "primereact/badge";
import { Tag } from "primereact/tag";
import { useRouter } from "next/navigation";

export default function CommunicationsPage() {
    const router = useRouter();

    const communicationModules = [
        {
            title: "Chat Messages",
            description: "Real-time messaging system with chat rooms and user conversations",
            icon: "pi pi-comments",
            color: "blue",
            badge: "Live",
            route: "/admin/communications/chat",
            features: [
                "Real-time messaging",
                "Chat rooms & groups",
                "File sharing",
                "Read receipts",
                "Typing indicators"
            ]
        },
        {
            title: "Notifications",
            description: "System notifications and alerts management",
            icon: "pi pi-bell",
            color: "orange",
            badge: "Active",
            route: "/admin/communications/notifications",
            features: [
                "System notifications",
                "Read/unread status",
                "Type filtering",
                "Bulk actions",
                "Status management"
            ]
        },
        {
            title: "Announcements",
            description: "Create and manage system-wide announcements and broadcasts",
            icon: "pi pi-megaphone",
            color: "green",
            badge: "New",
            route: "/admin/communications/announcements",
            features: [
                "Create announcements",
                "Target audience",
                "Scheduling",
                "Status management",
                "Content editing"
            ]
        }
    ];

    const getColorClass = (color: string) => {
        switch (color) {
            case 'blue': return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
            case 'orange': return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
            case 'green': return 'bg-green-50 border-green-200 hover:bg-green-100';
            case 'purple': return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
            default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
        }
    };

    const getBadgeSeverity = (badge: string) => {
        switch (badge) {
            case 'Live': return 'success';
            case 'Active': return 'info';
            case 'New': return 'warning';
            default: return 'secondary';
        }
    };

    return (
        <div className="grid">
            <div className="col-12">
                <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                    <div className="flex flex-column">
                        <h1 className="text-3xl font-bold m-0">Communications Center</h1>
                        <span className="text-600 text-lg">Manage all communication channels and messaging systems</span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid mb-6">
                    <div className="col-12 md:col-4">
                        <Card className="text-center">
                            <div className="flex align-items-center justify-content-center mb-3">
                                <i className="pi pi-comments text-3xl text-blue-500 mr-3"></i>
                                <div>
                                    <div className="text-2xl font-bold text-blue-500">24</div>
                                    <div className="text-600">Active Chats</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                    <div className="col-12 md:col-4">
                        <Card className="text-center">
                            <div className="flex align-items-center justify-content-center mb-3">
                                <i className="pi pi-bell text-3xl text-orange-500 mr-3"></i>
                                <div>
                                    <div className="text-2xl font-bold text-orange-500">156</div>
                                    <div className="text-600">Unread Notifications</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                    <div className="col-12 md:col-4">
                        <Card className="text-center">
                            <div className="flex align-items-center justify-content-center mb-3">
                                <i className="pi pi-megaphone text-3xl text-green-500 mr-3"></i>
                                <div>
                                    <div className="text-2xl font-bold text-green-500">12</div>
                                    <div className="text-600">Published Announcements</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Communication Modules */}
                <div className="grid">
                    {communicationModules.map((module, index) => (
                        <div key={index} className="col-12 md:col-4">
                            <Card 
                                className={`cursor-pointer transition-all duration-200 border-2 ${getColorClass(module.color)}`}
                                onClick={() => router.push(module.route)}
                            >
                                <div className="flex flex-column h-full">
                                    <div className="flex align-items-center justify-content-between mb-3">
                                        <div className="flex align-items-center">
                                            <i className={`${module.icon} text-2xl text-${module.color}-500 mr-3`}></i>
                                            <h3 className="text-xl font-bold m-0">{module.title}</h3>
                                        </div>
                                        <Badge 
                                            value={module.badge} 
                                            severity={getBadgeSeverity(module.badge) as any}
                                        />
                                    </div>
                                    
                                    <p className="text-600 mb-4 line-height-3 flex-1">
                                        {module.description}
                                    </p>

                                    <div className="mb-4">
                                        <h4 className="font-semibold mb-2">Features:</h4>
                                        <ul className="list-none p-0 m-0">
                                            {module.features.map((feature, featureIndex) => (
                                                <li key={featureIndex} className="flex align-items-center mb-1">
                                                    <i className="pi pi-check text-green-500 mr-2 text-sm"></i>
                                                    <span className="text-sm text-600">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Button 
                                        label="Open Module" 
                                        icon="pi pi-arrow-right" 
                                        iconPos="right"
                                        className={`w-full bg-${module.color}-500 border-${module.color}-500 hover:bg-${module.color}-600`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(module.route);
                                        }}
                                    />
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid mt-6">
                    <div className="col-12">
                        <Card>
                            <h3 className="text-xl font-bold mb-3">Quick Actions</h3>
                            <div className="flex flex-wrap gap-3">
                                <Button 
                                    label="Send Broadcast" 
                                    icon="pi pi-megaphone" 
                                    severity="success"
                                    onClick={() => router.push('/admin/communications/announcements')}
                                />
                                <Button 
                                    label="View All Notifications" 
                                    icon="pi pi-bell" 
                                    severity="info"
                                    onClick={() => router.push('/admin/communications/notifications')}
                                />
                                <Button 
                                    label="Open Chat" 
                                    icon="pi pi-comments" 
                                    severity="info"
                                    onClick={() => router.push('/admin/communications/chat')}
                                />
                                <Button 
                                    label="System Status" 
                                    icon="pi pi-info-circle" 
                                    severity="secondary"
                                    onClick={() => {
                                        // TODO: Implement system status modal
                                    }}
                                />
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="grid mt-4">
                    <div className="col-12 md:col-6">
                        <Card>
                            <h3 className="text-xl font-bold mb-3">Recent Messages</h3>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex align-items-center p-3 border-round bg-gray-50">
                                        <div className="w-3rem h-3rem bg-blue-100 border-round flex align-items-center justify-content-center mr-3">
                                            <i className="pi pi-user text-blue-500"></i>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold">User {i}</div>
                                            <div className="text-sm text-600">Latest message preview...</div>
                                            <div className="text-xs text-500">2 minutes ago</div>
                                        </div>
                                        <Badge value="New" severity="danger" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                    <div className="col-12 md:col-6">
                        <Card>
                            <h3 className="text-xl font-bold mb-3">Latest Announcements</h3>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex align-items-center p-3 border-round bg-gray-50">
                                        <div className="w-3rem h-3rem bg-green-100 border-round flex align-items-center justify-content-center mr-3">
                                            <i className="pi pi-megaphone text-green-500"></i>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold">Announcement {i}</div>
                                            <div className="text-sm text-600">Brief description...</div>
                                            <div className="text-xs text-500">1 hour ago</div>
                                        </div>
                                        <Badge value="Published" severity="success" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
} 