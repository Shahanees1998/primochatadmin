"use client";

import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Avatar } from "primereact/avatar";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { FilterMatchMode } from "primereact/api";
import { useRouter } from "next/navigation";
import { InputTextarea } from "primereact/inputtextarea";
import { Calendar } from "primereact/calendar";
import { SortOrderType } from "@/types";
import { Skeleton } from "primereact/skeleton";
import { apiClient } from "@/lib/apiClient";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    profileImage?: string;
    membershipNumber?: string;
    joinDate?: string | null;
    lastLogin?: string;
    createdAt: string;
}

interface MembershipCard {
    id: string;
    userId: string;
    cardNumber: string;
    issueDate: string;
    expiryDate: string;
    status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
    design: 'CLASSIC' | 'MODERN' | 'PREMIUM';
}

interface CardContent {
    organizationName: string;
    memberName: string;
    memberId: string;
    issueDate: string;
    expiryDate: string;
    cardNumber: string;
    additionalInfo: string;
}

export default function MembershipCardsPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        firstName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        lastName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        email: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });
    const [showCardDialog, setShowCardDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [cardDesign, setCardDesign] = useState<'CLASSIC' | 'MODERN' | 'PREMIUM'>('CLASSIC');
    const [cardContent, setCardContent] = useState<CardContent>({
        organizationName: 'Organization Name',
        memberName: '',
        memberId: '',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cardNumber: '',
        additionalInfo: ''
    });
    const [sortField, setSortField] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<SortOrderType>(-1);
    const [error, setError] = useState<string | null>(null);
    const toast = useRef<Toast>(null);

    useEffect(() => {
        loadUsers();
    }, [currentPage, rowsPerPage, globalFilterValue, sortField, sortOrder]);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.getUsers({
                page: currentPage,
                limit: rowsPerPage,
                search: globalFilterValue,
                status: 'ACTIVE',
                sortField,
                sortOrder,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setUsers(response.data?.users || []);
            setTotalRecords(response.data?.pagination?.total || 0);
        } catch (error) {
            setError("Failed to load users. Please check your connection or try again later.");
            showToast("error", "Error", "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        (_filters["global"] as any).value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const onSort = (event: any) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder);
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openCardDialog = (user: User) => {
        setSelectedUser(user);
        setCardContent({
            organizationName: 'Organization Name',
            memberName: `${user.firstName} ${user.lastName}`,
            memberId: user.membershipNumber || '',
            issueDate: new Date().toISOString().split('T')[0],
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            cardNumber: `CARD-${Date.now().toString().slice(-6)}`,
            additionalInfo: ''
        });
        setShowCardDialog(true);
    };

    const generateCard = async () => {
        if (!selectedUser) return;

        try {
            const response = await apiClient.generateMembershipCard({
                userId: selectedUser.id,
                organizationName: cardContent.organizationName,
                cardNumber: cardContent.cardNumber,
                issueDate: cardContent.issueDate,
                expiryDate: cardContent.expiryDate,
                design: cardDesign,
                additionalInfo: cardContent.additionalInfo,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", `Membership card generated for ${selectedUser.firstName} ${selectedUser.lastName}`);
            setShowCardDialog(false);
        } catch (error) {
            showToast("error", "Error", "Failed to generate membership card");
        }
    };

    const downloadCard = async (user: User) => {
        try {
            const response = await apiClient.getMembershipCard(user.id);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            const data = response.data;
            
            // Create a canvas to generate the card image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            canvas.width = 350;
            canvas.height = 200;
            
            // Set background gradient
            const gradient = ctx.createLinearGradient(0, 0, 350, 200);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 350, 200);
            
            // Add text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('MEMBERSHIP CARD', 20, 30);
            
            ctx.font = '12px Arial';
            ctx.fillText('Organization Name', 20, 50);
            
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`${user.firstName} ${user.lastName}`, 20, 80);
            
            ctx.font = '12px Arial';
            ctx.fillText(`Member ID: ${user.membershipNumber || 'N/A'}`, 20, 100);
            ctx.fillText(`Issue Date: ${new Date().toLocaleDateString()}`, 20, 120);
            
            // Add card number
            ctx.fillText('Card #', 250, 30);
            ctx.font = '12px monospace';
            ctx.fillText(`CARD-${Date.now().toString().slice(-6)}`, 250, 45);
            
            // Add expiry date
            ctx.font = '10px Arial';
            ctx.fillText('Valid until', 250, 170);
            ctx.font = '12px Arial';
            ctx.fillText(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(), 250, 185);
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `membership-card-${user.firstName}-${user.lastName}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            });
            
            showToast("success", "Success", "Card downloaded successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to download card");
        }
    };

    const getStatusSeverity = (status: string) => {
        switch (status) {
            case "ACTIVE": return "success";
            case "PENDING": return "warning";
            case "INACTIVE": return "danger";
            default: return "info";
        }
    };

    const nameBodyTemplate = (rowData: User) => {
        return (
            <div className="flex align-items-center gap-2">
                <Avatar
                    image={rowData.profileImage}
                    icon={!rowData.profileImage ? "pi pi-user" : undefined}
                    size="normal"
                    shape="circle"
                />
                <div>
                    <div className="font-semibold">{`${rowData.firstName} ${rowData.lastName}`}</div>
                    <div className="text-sm text-600">{rowData.membershipNumber}</div>
                </div>
            </div>
        );
    };



    const actionBodyTemplate = (rowData: User) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-id-card"
                    size="small"
                    severity="info"
                    tooltip="Generate Card"
                    onClick={() => openCardDialog(rowData)}
                />
                {/* <Button
                    icon="pi pi-eye"
                    size="small"
                    text
                    tooltip="View Card"
                    onClick={() => router.push(`/admin/users/cards/${rowData.id}`)}
                /> */}
                <Button
                    icon="pi pi-download"
                    size="small"
                    text
                    severity="secondary"
                    tooltip="Download Card"
                    onClick={() => downloadCard(rowData)}
                />
            </div>
        );
    };

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
            <div className="flex flex-column">
                <h2 className="text-2xl font-bold m-0">Membership Cards</h2>
                <span className="text-600">Generate and manage membership cards</span>
            </div>
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search users..."
                        className="w-full"
                    />
                </span>
                <Button
                    label="All Users"
                    icon="pi pi-users"
                    onClick={() => router.push('/admin/users')}
                    severity="secondary"
                />
            </div>
        </div>
    );

    const renderCardPreview = () => {
        if (!selectedUser) return null;

        const cardStyles = {
            CLASSIC: {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
            },
            MODERN: {
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
            },
            PREMIUM: {
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
            },
        };

        const style = cardStyles[cardDesign];

        return (
            <div className="flex justify-content-center">
                <div
                    className="p-4 rounded-lg shadow-lg"
                    style={{
                        ...style,
                        width: '350px',
                        height: '200px',
                        position: 'relative',
                    }}
                >
                    <div className="flex justify-content-between align-items-start">
                        <div>
                            <h3 className="text-xl font-bold m-0">MEMBERSHIP CARD</h3>
                            <p className="text-sm opacity-75 m-0">{cardContent.organizationName}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm opacity-75">Card #</div>
                            <div className="font-mono text-sm">{cardContent.cardNumber}</div>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <div className="text-lg font-semibold">
                            {cardContent.memberName}
                        </div>
                        <div className="text-sm opacity-75">
                            Member ID: {cardContent.memberId}
                        </div>
                        <div className="text-sm opacity-75">
                            Issue Date: {new Date(cardContent.issueDate).toLocaleDateString()}
                        </div>
                        {cardContent.additionalInfo && (
                            <div className="text-sm opacity-75">
                                {cardContent.additionalInfo}
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-4 right-4">
                        <div className="text-xs opacity-75">Valid until</div>
                        <div className="text-sm font-semibold">
                            {new Date(cardContent.expiryDate).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    {error && (
                        <div className="p-error p-3 mb-3">{error}</div>
                    )}
                    {loading ? (
                        <DataTable
                            value={Array.from({ length: 5 }, (_, i) => ({ id: i }))}
                            className="p-datatable-sm"
                            header={header}
                        >
                            <Column 
                                field="firstName" 
                                header="Name" 
                                body={() => (
                                    <div className="flex align-items-center gap-2">
                                        <Skeleton shape="circle" size="2rem" />
                                        <div className="flex flex-column gap-1">
                                            <Skeleton width="120px" height="16px" />
                                            <Skeleton width="100px" height="14px" />
                                        </div>
                                    </div>
                                )}
                                style={{ minWidth: "200px" }}
                            />
                            <Column 
                                field="email" 
                                header="Email" 
                                body={() => <Skeleton width="200px" height="16px" />}
                                style={{ minWidth: "200px" }}
                            />
                            <Column 
                                field="membershipNumber" 
                                header="Membership #" 
                                body={() => <Skeleton width="100px" height="16px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                field="cardStatus" 
                                header="Card Status" 
                                body={() => <Skeleton width="80px" height="24px" />}
                                style={{ minWidth: "100px" }}
                            />
                            <Column 
                                field="issuedDate" 
                                header="Issued Date" 
                                body={() => <Skeleton width="100px" height="16px" />}
                                style={{ minWidth: "120px" }}
                            />
                            <Column 
                                header="Actions" 
                                body={() => (
                                    <div className="flex gap-2">
                                        <Skeleton width="32px" height="32px" />
                                        <Skeleton width="32px" height="32px" />
                                        <Skeleton width="32px" height="32px" />
                                    </div>
                                )}
                                style={{ width: "120px" }}
                            />
                        </DataTable>
                    ) : (
                        <DataTable
                            value={users}
                            paginator
                            rows={rowsPerPage}
                            totalRecords={totalRecords}
                            lazy
                            first={(currentPage - 1) * rowsPerPage}
                            onPage={(e) => {
                                setCurrentPage((e.page || 0) + 1);
                                setRowsPerPage(e.rows || 10);
                            }}
                            loading={loading}
                            filters={filters}
                            filterDisplay="menu"
                            globalFilterFields={["firstName", "lastName", "email", "membershipNumber"]}
                            header={header}
                            emptyMessage={error ? "Unable to load users. Please check your connection or try again later." : "No users found."}
                            responsiveLayout="scroll"
                            onSort={onSort}
                            sortField={sortField}
                            sortOrder={sortOrder}
                            loadingIcon="pi pi-spinner"
                        >
                            <Column 
                                field="firstName" 
                                header="Name" 
                                body={nameBodyTemplate} 
                                
                                style={{ minWidth: "200px" }} 
                            />
                            <Column 
                                field="email" 
                                header="Email" 
                                
                                style={{ minWidth: "200px" }} 
                            />
                            <Column 
                                field="membershipNumber" 
                                header="Member ID" 
                                
                                style={{ minWidth: "150px" }} 
                            />
                            <Column 
                                field="role" 
                                header="Role" 
                                body={(rowData) => (
                                    <Tag value={rowData.role} severity="info" />
                                )} 
                                
                                style={{ minWidth: "120px" }} 
                            />
                            <Column 
                                field="status" 
                                header="Status" 
                                body={(rowData) => (
                                    <Tag value={rowData.status} severity={getStatusSeverity(rowData.status)} />
                                )} 
                                
                                style={{ minWidth: "120px" }} 
                            />
                            <Column 
                                body={actionBodyTemplate} 
                                style={{ width: "150px" }} 
                            />
                        </DataTable>
                    )}
                </Card>
            </div>

            {/* Card Generation Dialog */}
            <Dialog
                visible={showCardDialog}
                style={{ width: "800px" }}
                header="Generate Membership Card"
                modal
                onHide={() => setShowCardDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowCardDialog(false)} />
                        <Button label="Generate Card" icon="pi pi-check" onClick={generateCard} />
                    </div>
                }
            >
                {selectedUser ? (
                    <div className="grid">
                        <div className="col-12">
                            <h3>Card for: {selectedUser.firstName} {selectedUser.lastName}</h3>
                            <p className="text-600">Member ID: {selectedUser.membershipNumber}</p>
                        </div>
                        
                        <div className="col-12">
                            <label className="font-bold mb-2 block">Card Design</label>
                            <div className="flex gap-3">
                                {(['CLASSIC', 'MODERN', 'PREMIUM'] as const).map((design) => (
                                    <div
                                        key={design}
                                        className={`p-3 border-2 rounded cursor-pointer ${
                                            cardDesign === design ? 'border-primary' : 'border-gray-300'
                                        }`}
                                        onClick={() => setCardDesign(design)}
                                    >
                                        <div className="text-sm font-semibold">{design}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-6">
                            <label className="font-bold mb-2 block">Organization Name</label>
                            <InputText
                                value={cardContent.organizationName}
                                onChange={(e) => setCardContent({...cardContent, organizationName: e.target.value})}
                                className="w-full"
                            />
                        </div>

                        <div className="col-6">
                            <label className="font-bold mb-2 block">Card Number</label>
                            <InputText
                                value={cardContent.cardNumber}
                                onChange={(e) => setCardContent({...cardContent, cardNumber: e.target.value})}
                                className="w-full"
                            />
                        </div>

                        <div className="col-6">
                            <label className="font-bold mb-2 block">Issue Date</label>
                            <Calendar
                                value={new Date(cardContent.issueDate)}
                                onChange={(e) => setCardContent({...cardContent, issueDate: e.value?.toISOString().split('T')[0] || cardContent.issueDate})}
                                dateFormat="yy-mm-dd"
                                className="w-full"
                            />
                        </div>

                        <div className="col-6">
                            <label className="font-bold mb-2 block">Expiry Date</label>
                            <Calendar
                                value={new Date(cardContent.expiryDate)}
                                onChange={(e) => setCardContent({...cardContent, expiryDate: e.value?.toISOString().split('T')[0] || cardContent.expiryDate})}
                                dateFormat="yy-mm-dd"
                                className="w-full"
                            />
                        </div>

                        <div className="col-12">
                            <label className="font-bold mb-2 block">Additional Information</label>
                            <InputTextarea
                                value={cardContent.additionalInfo}
                                onChange={(e) => setCardContent({...cardContent, additionalInfo: e.target.value})}
                                rows={3}
                                className="w-full"
                                placeholder="Any additional information to display on the card..."
                            />
                        </div>

                        <div className="col-12">
                            <label className="font-bold mb-2 block">Preview</label>
                            {renderCardPreview()}
                        </div>
                    </div>
                ) : (
                    <div className="grid">
                        <div className="col-12">
                            <Skeleton height="2rem" className="mb-2" />
                            <Skeleton width="60%" height="1rem" />
                        </div>
                        <div className="col-12">
                            <Skeleton height="1.5rem" className="mb-2" />
                            <div className="flex gap-3">
                                <Skeleton width="6rem" height="3rem" />
                                <Skeleton width="6rem" height="3rem" />
                                <Skeleton width="6rem" height="3rem" />
                            </div>
                        </div>
                        <div className="col-6">
                            <Skeleton height="1.5rem" className="mb-2" />
                            <Skeleton height="2.5rem" />
                        </div>
                        <div className="col-6">
                            <Skeleton height="1.5rem" className="mb-2" />
                            <Skeleton height="2.5rem" />
                        </div>
                        <div className="col-6">
                            <Skeleton height="1.5rem" className="mb-2" />
                            <Skeleton height="2.5rem" />
                        </div>
                        <div className="col-6">
                            <Skeleton height="1.5rem" className="mb-2" />
                            <Skeleton height="2.5rem" />
                        </div>
                        <div className="col-12">
                            <Skeleton height="1.5rem" className="mb-2" />
                            <Skeleton height="5rem" />
                        </div>
                        <div className="col-12">
                            <Skeleton height="1.5rem" className="mb-2" />
                            <Skeleton width="350px" height="200px" />
                        </div>
                    </div>
                )}
            </Dialog>

            <Toast ref={toast} />
        </div>
    );
} 