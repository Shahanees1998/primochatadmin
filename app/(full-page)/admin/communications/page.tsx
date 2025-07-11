"use client";

import { useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { useRouter } from "next/navigation";
import { TabView, TabPanel } from "primereact/tabview";
import { Badge } from "primereact/badge";

export default function CommunicationsPage() {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);

    const communicationFeatures = [
        {
            title: "Chat Messages",
            description: "Real-time messaging and chat rooms",
            icon: "pi pi-comments",
            route: "/admin/communications/chat",
            badge: "Live",
            color: "success"
        },
        {
            title: "Notifications",
            description: "System notifications and alerts",
            icon: "pi pi-bell",
            route: "/admin/communications/notifications",
            badge: "3",
            color: "warning"
        },
        {
            title: "Announcements",
            description: "Broadcast messages to all members",
            icon: "pi pi-megaphone",
            route: "/admin/communications/announcements",
            badge: "New",
            color: "info"
        }
    ];

    const handleNavigation = (route: string) => {
        router.push(route);
    };

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                        <div className="flex flex-column">
                            <h2 className="text-2xl font-bold m-0">Communications</h2>
                            <span className="text-600">Manage all communication channels and messaging</span>
                        </div>
                    </div>

                    <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                        <TabPanel header="Overview">
                            <div className="grid">
                                {communicationFeatures.map((feature, index) => (
                                    <div key={index} className="col-12 md:col-4">
                                        <Card className="h-full cursor-pointer hover:shadow-2 transition-all duration-200" 
                                              onClick={() => handleNavigation(feature.route)}>
                                            <div className="flex flex-column align-items-center text-center">
                                                <div className="mb-3">
                                                    <i className={`${feature.icon} text-4xl text-${feature.color}-500`}></i>
                                                </div>
                                                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                                <p className="text-600 mb-3">{feature.description}</p>
                                                <Badge value={feature.badge} severity={feature.color as any} />
                                            </div>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </TabPanel>
                        
                        <TabPanel header="Quick Actions">
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <Card>
                                        <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
                                        <div className="space-y-3">
                                            <div className="flex align-items-center gap-3 p-3 surface-100 border-round">
                                                <i className="pi pi-comment text-blue-500"></i>
                                                <div>
                                                    <div className="font-semibold">New message from John Doe</div>
                                                    <div className="text-sm text-600">2 minutes ago</div>
                                                </div>
                                            </div>
                                            <div className="flex align-items-center gap-3 p-3 surface-100 border-round">
                                                <i className="pi pi-bell text-orange-500"></i>
                                                <div>
                                                    <div className="font-semibold">System notification</div>
                                                    <div className="text-sm text-600">5 minutes ago</div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                                
                                <div className="col-12 md:col-6">
                                    <Card>
                                        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                                        <div className="flex flex-column gap-2">
                                            <Button 
                                                label="Start New Chat" 
                                                icon="pi pi-plus" 
                                                onClick={() => router.push('/admin/communications/chat')}
                                                className="p-button-outlined"
                                            />
                                            <Button 
                                                label="Send Announcement" 
                                                icon="pi pi-megaphone" 
                                                onClick={() => router.push('/admin/communications/announcements')}
                                                className="p-button-outlined"
                                            />
                                            <Button 
                                                label="View Notifications" 
                                                icon="pi pi-bell" 
                                                onClick={() => router.push('/admin/communications/notifications')}
                                                className="p-button-outlined"
                                            />
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </TabPanel>
                    </TabView>
                </div>
            </div>
        </div>
    );
} 