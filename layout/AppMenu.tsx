import type { MenuModel } from "@/types/index";
import AppSubMenu from "./AppSubMenu";

const AppMenu = () => {
    const model: MenuModel[] = [
        {
            label: "Member Management",
            icon: "pi pi-users",
            items: [
                {
                    label: "All Members",
                    icon: "pi pi-fw pi-users",
                    to: "/admin/users",
                },
                {
                    label: "Pending Approvals",
                    icon: "pi pi-fw pi-clock",
                    to: "/admin/users/pending",
                },
                {
                    label: "Membership Cards",
                    icon: "pi pi-fw pi-id-card",
                    to: "/admin/users/cards",
                },
            ],
        },
        {
            label: "Meal Management",
            icon: "pi pi-apple",
            items: [
                {
                    label: "All Meals",
                    icon: "pi pi-fw pi-list",
                    to: "/admin/meal/meals",
                },
                {
                    label: "Meal Categories",
                    icon: "pi pi-fw pi-tags",
                    to: "/admin/meal/categories",
                },
            ],
        },
        {
            label: "Festive Board",
            icon: "pi pi-calendar-plus",
            items: [
                {
                    label: "All Boards",
                    icon: "pi pi-fw pi-list",
                    to: "/admin/festive-board",
                },
                {
                    label: "Create Board",
                    icon: "pi pi-fw pi-plus",
                    to: "/admin/festive-board/create",
                },
            ],
        },
        {
            label: "Trestle Board",
            icon: "pi pi-calendar",
            items: [
                {
                    label: "All Boards",
                    icon: "pi pi-fw pi-calendar",
                    to: "/admin/trestle-board",
                },
                // {
                //     label: "Create Board",
                //     icon: "pi pi-fw pi-plus",
                //     to: "/admin/events/create",
                // },
                {
                    label: "Board Categories",
                    icon: "pi pi-fw pi-tags",
                    to: "/admin/trestle-board/categories",
                },
            ],
        },
        {
            label: "Documents",
            icon: "pi pi-file",
            items: [
                {
                    label: "All Documents",
                    icon: "pi pi-fw pi-file",
                    to: "/admin/documents",
                },
                {
                    label: "Upload Document",
                    icon: "pi pi-fw pi-upload",
                    to: "/admin/documents/upload",
                },
                // {
                //     label: "Categories",
                //     icon: "pi pi-fw pi-folder",
                //     to: "/admin/documents/categories",
                // },
            ],
        },
        {
            label: "Communications",
            icon: "pi pi-comments",
            items: [
                {
                    label: "Announcements",
                    icon: "pi pi-fw pi-megaphone",
                    to: "/admin/communications/announcements",
                },
                {
                    label: "Send Announcement",
                    icon: "pi pi-fw pi-send",
                    to: "/admin/communications/announcement",
                },
                {
                    label: "Messages",
                    icon: "pi pi-fw pi-comment",
                    to: "/admin/communications/messages",
                },
                {
                    label: "Notifications",
                    icon: "pi pi-fw pi-bell",
                    to: "/admin/communications/notifications",
                },
                {
                    label: "Phone Book",
                    icon: "pi pi-fw pi-phone",
                    to: "/admin/phonebook",
                },
            ],
        },
        {
            label: "Support & Moderation",
            icon: "pi pi-shield",
            items: [
                {
                    label: "Support Requests",
                    icon: "pi pi-fw pi-question-circle",
                    to: "/admin/support",
                },
                {
                    label: "Chat Moderation",
                    icon: "pi pi-fw pi-comments",
                    to: "/admin/moderation",
                },
                {
                    label: "Moderators",
                    icon: "pi pi-fw pi-user-plus",
                    to: "/admin/moderators",
                },
            ],
        },

        {
            label: "Settings",
            icon: "pi pi-cog",
            items: [
                {
                    label: "General Settings",
                    icon: "pi pi-fw pi-cog",
                    to: "/admin/settings",
                },
                // {
                //     label: "Permissions",
                //     icon: "pi pi-fw pi-lock",
                //     to: "/admin/settings/permissions",
                // },
            ],
        },
    ];

    return <AppSubMenu model={model} />;
};

export default AppMenu;
