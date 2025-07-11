"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";
import { ScrollPanel } from "primereact/scrollpanel";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { Skeleton } from "primereact/skeleton";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
    status: string;
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    type: 'TEXT' | 'IMAGE' | 'FILE';
    isRead: boolean;
    createdAt: string;
    sender?: User;
}

interface ChatRoom {
    id: string;
    participants: User[];
    lastMessage?: Message;
    unreadCount: number;
    isGroup: boolean;
    name?: string;
}

export default function ChatPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [showNewChatDialog, setShowNewChatDialog] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [chatSearchTerm, setChatSearchTerm] = useState("");
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const toast = useRef<Toast>(null);

    useEffect(() => {
        loadUsers();
        loadChatRooms();
    }, []);

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.id);
        }
    }, [selectedChat]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadUsers = async () => {
        setUsersLoading(true);
        try {
            const response = await apiClient.getUsers({
                page: 1,
                limit: 100,
                status: 'ACTIVE'
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setUsers(response.data?.users || []);
        } catch (error) {
            showToast("error", "Error", "Failed to load users");
        } finally {
            setUsersLoading(false);
            setLoading(false);
        }
    };

    const loadChatRooms = async () => {
        try {
            const response = await apiClient.getChatRooms();
            if (response.error) {
                throw new Error(response.error);
            }
            setChatRooms(response.data?.chatRooms || []);
        } catch (error) {
            showToast("error", "Error", "Failed to load chat rooms");
        }
    };

    const loadMessages = async (chatRoomId: string) => {
        setMessagesLoading(true);
        try {
            const response = await apiClient.getChatMessages(chatRoomId);
            if (response.error) {
                throw new Error(response.error);
            }
            setMessages(response.data?.messages || []);
        } catch (error) {
            showToast("error", "Error", "Failed to load messages");
        } finally {
            setMessagesLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat) return;

        try {
            const response = await apiClient.sendMessage({
                chatRoomId: selectedChat.id,
                content: newMessage,
                type: 'TEXT'
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Add new message to the list
            const newMsg = response.data;
            setMessages(prev => [...prev, newMsg]);
            setNewMessage("");

            // Update last message in chat room
            setChatRooms(prev => prev.map(room => 
                room.id === selectedChat.id 
                    ? { ...room, lastMessage: newMsg, unreadCount: 0 }
                    : room
            ));
        } catch (error) {
            showToast("error", "Error", "Failed to send message");
        }
    };

    const createNewChat = async () => {
        if (selectedUsers.length === 0) return;

        try {
            const response = await apiClient.createChatRoom({
                participantIds: selectedUsers.map(u => u.id),
                isGroup: selectedUsers.length > 1
            });

            if (response.error) {
                throw new Error(response.error);
            }

            const newChatRoom = response.data;
            setChatRooms(prev => [newChatRoom, ...prev]);
            setSelectedChat(newChatRoom);
            setShowNewChatDialog(false);
            setSelectedUsers([]);
            showToast("success", "Success", "Chat room created successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to create chat room");
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const filteredChatRooms = chatRooms.filter(room => {
        const searchLower = chatSearchTerm.toLowerCase();
        if (room.isGroup && room.name) {
            return room.name.toLowerCase().includes(searchLower);
        }
        return room.participants.some(user => 
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower)
        );
    });

    const getChatDisplayName = (chat: ChatRoom) => {
        if (chat.isGroup && chat.name) {
            return chat.name;
        }
        return chat.participants.map(p => `${p.firstName} ${p.lastName}`).join(", ");
    };

    const getChatAvatar = (chat: ChatRoom) => {
        if (chat.isGroup) {
            return chat.participants.slice(0, 2).map(p => p.profileImage).filter(Boolean);
        }
        return chat.participants[0]?.profileImage;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <div className="grid h-full">
            <div className="col-12">
                <div className="card h-full">
                    <div className="flex flex-column md:flex-row h-full">
                        {/* Chat Rooms Sidebar */}
                        <div className="w-full md:w-4 border-right-1 surface-border">
                            <div className="p-3 border-bottom-1 surface-border">
                                <div className="flex justify-content-between align-items-center mb-3">
                                    <h3 className="m-0">Chats</h3>
                                    <Button 
                                        icon="pi pi-plus" 
                                        rounded 
                                        text 
                                        onClick={() => setShowNewChatDialog(true)}
                                        tooltip="New Chat"
                                    />
                                </div>
                                <span className="p-input-icon-left w-full">
                                    <i className="pi pi-search" />
                                    <InputText
                                        value={chatSearchTerm}
                                        onChange={(e) => setChatSearchTerm(e.target.value)}
                                        placeholder="Search chats..."
                                        className="w-full"
                                    />
                                </span>
                            </div>

                            <ScrollPanel className="h-20rem">
                                {loading ? (
                                    <div className="p-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex align-items-center gap-3 mb-3">
                                                <Skeleton shape="circle" size="3rem" />
                                                <div className="flex-1">
                                                    <Skeleton height="1rem" className="mb-2" />
                                                    <Skeleton height="0.75rem" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredChatRooms.length === 0 ? (
                                    <div className="p-3 text-center text-600">
                                        <i className="pi pi-comments text-3xl mb-2 block"></i>
                                        <p>No chats yet</p>
                                        <Button 
                                            label="Start a chat" 
                                            size="small"
                                            onClick={() => setShowNewChatDialog(true)}
                                        />
                                    </div>
                                ) : (
                                    <div className="p-0">
                                        {filteredChatRooms.map((chat) => (
                                            <div
                                                key={chat.id}
                                                className={`p-3 cursor-pointer hover:surface-100 transition-colors ${
                                                    selectedChat?.id === chat.id ? 'surface-100' : ''
                                                }`}
                                                onClick={() => setSelectedChat(chat)}
                                            >
                                                <div className="flex align-items-center gap-3">
                                                    <div className="relative">
                                                        {chat.isGroup ? (
                                                            <div className="flex flex-column gap-1">
                                                                {chat.participants.slice(0, 2).map((user, index) => (
                                                                    <Avatar
                                                                        key={user.id}
                                                                        image={user.profileImage}
                                                                        label={`${user.firstName[0]}${user.lastName[0]}`}
                                                                        size="small"
                                                                        className={index === 1 ? 'ml-2' : ''}
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <Avatar
                                                                image={chat.participants[0]?.profileImage}
                                                                label={`${chat.participants[0]?.firstName[0]}${chat.participants[0]?.lastName[0]}`}
                                                                size="large"
                                                            />
                                                        )}
                                                        {chat.unreadCount > 0 && (
                                                            <span className="absolute top-0 right-0 bg-red-500 text-white border-circle w-1.5rem h-1.5rem text-xs flex align-items-center justify-content-center">
                                                                {chat.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-content-between align-items-start">
                                                            <h4 className="m-0 text-sm font-semibold truncate">
                                                                {getChatDisplayName(chat)}
                                                            </h4>
                                                            {chat.lastMessage && (
                                                                <span className="text-xs text-600 ml-2">
                                                                    {formatTime(chat.lastMessage.createdAt)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {chat.lastMessage && (
                                                            <p className="m-0 text-xs text-600 truncate">
                                                                {chat.lastMessage.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollPanel>
                        </div>

                        {/* Chat Messages Area */}
                        <div className="flex-1 flex flex-column">
                            {selectedChat ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="p-3 border-bottom-1 surface-border">
                                        <div className="flex align-items-center gap-3">
                                            {selectedChat.isGroup ? (
                                                <div className="flex flex-column gap-1">
                                                    {selectedChat.participants.slice(0, 2).map((user, index) => (
                                                        <Avatar
                                                            key={user.id}
                                                            image={user.profileImage}
                                                            label={`${user.firstName[0]}${user.lastName[0]}`}
                                                            size="small"
                                                            className={index === 1 ? 'ml-2' : ''}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <Avatar
                                                    image={selectedChat.participants[0]?.profileImage}
                                                    label={`${selectedChat.participants[0]?.firstName[0]}${selectedChat.participants[0]?.lastName[0]}`}
                                                    size="large"
                                                />
                                            )}
                                            <div>
                                                <h4 className="m-0">{getChatDisplayName(selectedChat)}</h4>
                                                <p className="m-0 text-sm text-600">
                                                    {selectedChat.participants.length} participant{selectedChat.participants.length > 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Messages Area */}
                                    <ScrollPanel className="flex-1">
                                        {messagesLoading ? (
                                            <div className="p-3">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="mb-3">
                                                        <Skeleton height="2rem" className="mb-1" />
                                                        <Skeleton height="1rem" width="60%" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3">
                                                {messages.map((message) => (
                                                    <div
                                                        key={message.id}
                                                        className={`mb-3 flex ${message.senderId === 'current-user' ? 'justify-content-end' : 'justify-content-start'}`}
                                                    >
                                                        <div className={`max-w-70 ${message.senderId === 'current-user' ? 'text-right' : 'text-left'}`}>
                                                            <div className={`p-3 border-round-lg ${
                                                                message.senderId === 'current-user' 
                                                                    ? 'bg-blue-500 text-white' 
                                                                    : 'bg-gray-100'
                                                            }`}>
                                                                <p className="m-0">{message.content}</p>
                                                            </div>
                                                            <div className={`text-xs text-600 mt-1 ${
                                                                message.senderId === 'current-user' ? 'text-right' : 'text-left'
                                                            }`}>
                                                                {formatTime(message.createdAt)}
                                                                {message.senderId === 'current-user' && (
                                                                    <i className={`pi ${message.isRead ? 'pi-check-double text-blue-500' : 'pi-check'} ml-1`}></i>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div ref={messagesEndRef} />
                                            </div>
                                        )}
                                    </ScrollPanel>

                                    {/* Message Input */}
                                    <div className="p-3 border-top-1 surface-border">
                                        <div className="flex gap-2">
                                            <InputText
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Type a message..."
                                                className="flex-1"
                                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                            />
                                            <Button 
                                                icon="pi pi-send" 
                                                onClick={sendMessage}
                                                disabled={!newMessage.trim()}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex align-items-center justify-content-center">
                                    <div className="text-center text-600">
                                        <i className="pi pi-comments text-6xl mb-3 block"></i>
                                        <h3>Select a chat to start messaging</h3>
                                        <p>Choose from your existing conversations or start a new one</p>
                                        <Button 
                                            label="Start New Chat" 
                                            icon="pi pi-plus"
                                            onClick={() => setShowNewChatDialog(true)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Chat Dialog */}
            <Dialog 
                visible={showNewChatDialog} 
                onHide={() => setShowNewChatDialog(false)}
                header="Start New Chat"
                style={{ width: '50vw' }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" severity="secondary" onClick={() => setShowNewChatDialog(false)} />
                        <Button 
                            label="Create Chat" 
                            onClick={createNewChat}
                            disabled={selectedUsers.length === 0}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    <div>
                        <label className="font-bold mb-2 block">Search Users</label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-search" />
                            <InputText
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search users..."
                                className="w-full"
                            />
                        </span>
                    </div>

                    <div>
                        <label className="font-bold mb-2 block">Select Users</label>
                        <ScrollPanel className="h-10rem border-1 surface-border border-round">
                            {usersLoading ? (
                                <div className="p-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex align-items-center gap-3 mb-3">
                                            <Skeleton shape="circle" size="2.5rem" />
                                            <div className="flex-1">
                                                <Skeleton height="1rem" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-3">
                                    {users
                                        .filter(user => 
                                            `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            user.email.toLowerCase().includes(searchTerm.toLowerCase())
                                        )
                                        .map((user) => (
                                            <div
                                                key={user.id}
                                                className={`flex align-items-center gap-3 p-2 cursor-pointer border-round hover:surface-100 ${
                                                    selectedUsers.some(u => u.id === user.id) ? 'surface-100' : ''
                                                }`}
                                                onClick={() => {
                                                    setSelectedUsers(prev => 
                                                        prev.some(u => u.id === user.id)
                                                            ? prev.filter(u => u.id !== user.id)
                                                            : [...prev, user]
                                                    );
                                                }}
                                            >
                                                <Avatar
                                                    image={user.profileImage}
                                                    label={`${user.firstName[0]}${user.lastName[0]}`}
                                                    size="large"
                                                />
                                                <div className="flex-1">
                                                    <h4 className="m-0 text-sm">{user.firstName} {user.lastName}</h4>
                                                    <p className="m-0 text-xs text-600">{user.email}</p>
                                                </div>
                                                {selectedUsers.some(u => u.id === user.id) && (
                                                    <i className="pi pi-check text-green-500"></i>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </ScrollPanel>
                    </div>

                    {selectedUsers.length > 0 && (
                        <div>
                            <label className="font-bold mb-2 block">Selected Users ({selectedUsers.length})</label>
                            <div className="flex flex-wrap gap-2">
                                {selectedUsers.map((user) => (
                                    <div key={user.id} className="flex align-items-center gap-2 p-2 surface-100 border-round">
                                        <Avatar
                                            image={user.profileImage}
                                            label={`${user.firstName[0]}${user.lastName[0]}`}
                                            size="small"
                                        />
                                        <span className="text-sm">{user.firstName} {user.lastName}</span>
                                        <Button
                                            icon="pi pi-times"
                                            size="small"
                                            text
                                            onClick={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>

            <Toast ref={toast} />
        </div>
    );
} 