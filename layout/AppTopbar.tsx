'use client'

import type { AppTopbarRef } from "@/types/index";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import AppBreadcrumb from "./AppBreadCrumb";
import { LayoutContext } from "./context/layoutcontext";
import { useAuth } from "@/hooks/useAuth";
import { Toast } from "primereact/toast";
import { apiClient } from "@/lib/apiClient";
import { getProfileImageUrl } from "@/lib/cloudinary-client";
import { Avatar } from "primereact/avatar";

const AppTopbar = forwardRef<AppTopbarRef>((props, ref) => {
    const { onMenuToggle, showProfileSidebar, showConfigSidebar } =
        useContext(LayoutContext);
    const menubuttonRef = useRef(null);
    const { user } = useAuth();
    const [profile, setProfile] = useState<any | null>(null);
    const toast = useRef<Toast>(null);

    useEffect(() => {
        if (user?.id) {
            loadProfile();
        }
    }, [user?.id, user?.profileImage]);

    // Listen for custom profile update events
    useEffect(() => {
        const handleProfileUpdate = () => {
            if (user?.id) {
                loadProfile();
            }
        };

        window.addEventListener('profile-updated', handleProfileUpdate);
        
        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate);
        };
    }, [user?.id]);


    const getUserInitials = () => {
        if (profile?.firstName && profile?.lastName) {
            return `${profile.firstName[0]}${profile.lastName[0]}`;
        }
        return 'U';
    };


    const loadProfile = async () => {
        if (!user?.id) return;
        try {
            const response = await apiClient.getUser(user.id);

            if (response.error) {
                throw new Error(response.error);
            }

            const userProfile = response.data as any;
            if (userProfile) {
                setProfile(userProfile);
            }
        }
        catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    const onConfigButtonClick = () => {
        showConfigSidebar();
    };

    useImperativeHandle(ref, () => ({
        menubutton: menubuttonRef.current,
    }));

    return (
        <div className="layout-topbar">
            <div className="topbar-start">
                <button
                    ref={menubuttonRef}
                    type="button"
                    className="topbar-menubutton p-link p-trigger"
                    onClick={onMenuToggle}
                >
                    <i className="pi pi-bars"></i>
                </button>

                <AppBreadcrumb className="topbar-breadcrumb"></AppBreadcrumb>
            </div>

            <div className="topbar-end">
                <ul className="topbar-menu">
                    {/* <li className="topbar-search">
                        <span className="p-input-icon-left">
                            <i className="pi pi-search"></i>
                            <InputText
                                type="text"
                                placeholder="Search"
                                className="w-12rem sm:w-full"
                            />
                        </span>
                    </li>
                    <li className="ml-3">
                        <Button
                            type="button"
                            icon="pi pi-cog"
                            text
                            rounded
                            severity="secondary"
                            className="flex-shrink-0"
                            onClick={onConfigButtonClick}
                        ></Button>
                    </li> */}
                        <button
                            type="button"
                            style={{border : 'none', cursor:'pointer'}}
                            onClick={showProfileSidebar}
                        >
                             <Avatar
                                    image={profile?.profileImagePublicId ? 
                                        getProfileImageUrl(profile.profileImagePublicId, 'large') : 
                                        profile?.profileImage
                                    }
                                    label={getUserInitials()}
                                    size="large"
                                    shape="circle"
                                    className="bg-primary"
                                />
                        </button>
                </ul>
            </div>
        </div>
    );
});

AppTopbar.displayName = "AppTopbar";

export default AppTopbar;
