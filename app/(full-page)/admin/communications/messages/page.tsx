"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Avatar } from "primereact/avatar";
import { ScrollPanel } from "primereact/scrollpanel";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { Skeleton } from "primereact/skeleton";
import { Badge } from "primereact/badge";
import { Tooltip } from "primereact/tooltip";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { ChatMessage } from "@/types/socket";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
    status: string;
}

interface ChatRoom {
    id: string;
    name?: string;
    isGroup: boolean;
    participants: User[];
    lastMessage?: {
        id: string;
        content: string;
        senderId: string;
        type: string;
        isRead: boolean;
        createdAt: string;
        sender?: User;
    };
    unreadCount: number;
    updatedAt: string;
}

interface Message {
    id: string;
    chatRoomId: string;
    senderId: string;
    content: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    sender?: User;
}

export default function MessagesPage() {
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

    const [currentUserId, setCurrentUserId] = useState<string>("");
    const socket = useSocket({ userId: currentUserId });
    const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: string[] }>({});

    useEffect(() => {
        loadUsers();
        loadChatRooms();
        // Get admin user ID
        getAdminUserId();
    }, []);

    const getAdminUserId = async () => {
        try {
            const response = await apiClient.getUsers({
                page: 1,
                limit: 1,
                status: 'ACTIVE'
            });
            if (response.data?.users?.[0]) {
                setCurrentUserId(response.data.users[0].id);
            }
        } catch (error) {
            console.error('Failed to get admin user ID:', error);
        }
    };

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.id);
        }
    }, [selectedChat]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Real-time: join/leave chat room
    useEffect(() => {
        if (selectedChat && socket.isConnected) {
            socket.joinChat(selectedChat.id);
            return () => socket.leaveChat(selectedChat.id);
        }
    }, [selectedChat, socket.isConnected]);

    // Real-time: receive new messages
    useEffect(() => {
        socket.onNewMessage(({ chatRoomId, message }) => {
            if (selectedChat && chatRoomId === selectedChat.id) {
                setMessages((prev) => [...prev, message]);
            }
            // Update chat room's last message
            setChatRooms((prev) => prev.map(room => 
                room.id === chatRoomId 
                    ? { ...room, lastMessage: message, unreadCount: room.unreadCount + 1 }
                    : room
            ));
        });
        return () => socket.offNewMessage();
    }, [selectedChat, socket]);

    // Real-time: typing indicator
    useEffect(() => {
        socket.onUserTyping(({ chatRoomId, userId, isTyping }) => {
            setTypingUsers((prev) => {
                const users = new Set(prev[chatRoomId] || []);
                if (isTyping) users.add(userId); else users.delete(userId);
                return { ...prev, [chatRoomId]: Array.from(users) };
            });
        });
        return () => socket.offUserTyping();
    }, [socket]);

    // Real-time: mark messages as read
    useEffect(() => {
        socket.onMessageRead(({ chatRoomId, messageId, userId }) => {
            if (selectedChat && chatRoomId === selectedChat.id) {
                setMessages((prev) => prev.map(m => m.id === messageId ? { ...m, isRead: true } : m));
            }
        });
        return () => socket.offMessageRead();
    }, [selectedChat, socket]);

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

    // Send message (real-time)
    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        
        const messageContent = newMessage.trim();
        setNewMessage("");

        try {
            // Optimistic update
            const senderUser = users.find(u => u.id === currentUserId);
            const optimisticMessage: Message = {
                id: Math.random().toString(36).substr(2, 9),
                chatRoomId: selectedChat.id,
                senderId: currentUserId,
                content: messageContent,
                type: 'TEXT',
                isRead: false,
                createdAt: new Date().toISOString(),
                sender: senderUser
                    ? {
                        id: senderUser.id,
                        firstName: senderUser.firstName,
                        lastName: senderUser.lastName,
                        email: senderUser.email,
                        profileImage: senderUser.profileImage,
                        status: senderUser.status,
                    }
                    : undefined,
            };

            setMessages((prev) => [...prev, optimisticMessage]);

            // Send via API
            const response = await apiClient.sendMessage({
                chatRoomId: selectedChat.id,
                content: messageContent,
                type: 'TEXT'
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Update with real message data
            const realMessage = response.data;
            setMessages((prev) => prev.map(m => 
                m.id === optimisticMessage.id ? { ...realMessage, createdAt: realMessage.createdAt } : m
            ));

            // Send via socket for real-time
            socket.sendMessage(selectedChat.id, realMessage);

        } catch (error) {
            showToast("error", "Error", "Failed to send message");
            // Revert optimistic update
            setMessages((prev) => prev.filter(m => m.id !== Math.random().toString(36).substr(2, 9)));
        }
    };

    // Typing indicator
    const handleTyping = useCallback(() => {
        if (selectedChat) {
            socket.startTyping(selectedChat.id, currentUserId);
            setTimeout(() => socket.stopTyping(selectedChat.id, currentUserId), 2000);
        }
    }, [selectedChat, currentUserId, socket]);

    // Mark all messages as read when opening chat
    useEffect(() => {
        if (selectedChat) {
            messages.forEach((msg) => {
                if (!msg.isRead && msg.senderId !== currentUserId) {
                    socket.markMessageAsRead(selectedChat.id, msg.id, currentUserId);
                }
            });
        }
    }, [selectedChat, messages, currentUserId, socket]);

    const createNewChat = async () => {
        if (selectedUsers.length === 0) return;

        try {
            const response = await apiClient.createChatRoom({
                participantIds: selectedUsers.map(u => u.id),
                name: selectedUsers.length > 1 ? `Group Chat (${selectedUsers.length} members)` : undefined
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

    const getChatName = (chat: ChatRoom) => {
        if (chat.isGroup) {
            return chat.name || `Group (${chat.participants.length} members)`;
        }
        const otherParticipant = chat.participants.find(p => p.id !== currentUserId);
        return otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Unknown User';
    };

    const getChatAvatar = (chat: ChatRoom) => {
        if (chat.isGroup) {
            return chat.participants[0]?.profileImage || undefined;
        }
        const otherParticipant = chat.participants.find(p => p.id !== currentUserId);
        return otherParticipant?.profileImage || undefined;
    };

    const filteredChatRooms = chatRooms.filter(chat => 
        getChatName(chat).toLowerCase().includes(chatSearchTerm.toLowerCase())
    );

    const filteredUsers = users.filter(user => 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <div className="flex h-screen bg-white border-round shadow-1">
                        {/* Chat Sidebar Skeleton */}
                        <div className="w-4 border-right-1 surface-border flex flex-column">
                            <div className="p-3 border-bottom-1 surface-border">
                                <Skeleton height="2rem" width="150px" className="mb-3" />
                                <Skeleton height="2.5rem" width="100%" />
                            </div>
                            <div className="p-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-3 border-round mb-2">
                                        <div className="flex align-items-center gap-3">
                                            <Skeleton shape="circle" size="3rem" />
                                            <div className="flex-1">
                                                <Skeleton height="1rem" width="60%" className="mb-2" />
                                                <Skeleton height="0.8rem" width="80%" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Chat Area Skeleton */}
                        <div className="flex-1 flex flex-column">
                            <div className="p-3 border-bottom-1 surface-border">
                                <div className="flex align-items-center gap-3">
                                    <Skeleton shape="circle" size="3rem" />
                                    <div className="flex-1">
                                        <Skeleton height="1.2rem" width="200px" className="mb-1" />
                                        <Skeleton height="0.8rem" width="150px" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-3">
                                <div className="flex flex-column gap-3">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-content-end' : 'justify-content-start'}`}>
                                            <Skeleton height="3rem" width="60%" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-3 border-top-1 surface-border">
                                <Skeleton height="2.5rem" width="100%" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <div className="flex h-screen bg-white border-round shadow-1">
                    {/* Chat Sidebar */}
                    <div className="w-4 border-right-1 surface-border flex flex-column">
                        {/* Header */}
                        <div className="p-3 border-bottom-1 surface-border">
                            <div className="flex align-items-center justify-content-between mb-3">
                                <h2 className="text-xl font-bold m-0">Messages</h2>
                                <Button
                                    icon="pi pi-plus"
                                    size="small"
                                    rounded
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

                        {/* Chat List */}
                        <ScrollPanel className="flex-1">
                            <div className="p-2">
                                {filteredChatRooms.map((chat) => (
                                    <div
                                        key={chat.id}
                                        className={`p-3 border-round cursor-pointer transition-colors transition-duration-150 mb-2 ${
                                            selectedChat?.id === chat.id
                                                ? 'bg-primary text-white'
                                                : 'hover:bg-gray-100'
                                        }`}
                                        onClick={() => setSelectedChat(chat)}
                                    >
                                        <div className="flex align-items-center gap-3">
                                            <div className="relative">
                                                <Avatar
                                                    image={getChatAvatar(chat)}
                                                    label={getChatName(chat).charAt(0)}
                                                    size="large"
                                                    shape="circle"
                                                />
                                                {chat.unreadCount > 0 && (
                                                    <Badge
                                                        value={chat.unreadCount}
                                                        severity="danger"
                                                        className="absolute top-0 right-0 transform translate-x-1 -translate-y-1"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex align-items-center justify-content-between">
                                                    <h4 className="m-0 text-sm font-semibold truncate">
                                                        {getChatName(chat)}
                                                    </h4>
                                                    <span className="text-xs opacity-70">
                                                        {chat.lastMessage && formatTime(chat.lastMessage.createdAt)}
                                                    </span>
                                                </div>
                                                {chat.lastMessage && (
                                                    <p className="m-0 text-xs opacity-70 truncate">
                                                        {chat.lastMessage.senderId === currentUserId ? 'You: ' : ''}
                                                        {chat.lastMessage.content}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollPanel>
                    </div>

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-column">
                        {selectedChat ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-3 border-bottom-1 surface-border bg-white">
                                    <div className="flex align-items-center gap-3">
                                        <Avatar
                                            image={getChatAvatar(selectedChat)}
                                            label={getChatName(selectedChat).charAt(0)}
                                            size="large"
                                            shape="circle"
                                        />
                                        <div className="flex-1">
                                            <h3 className="m-0 font-semibold">{getChatName(selectedChat)}</h3>
                                            <p className="m-0 text-sm opacity-70">
                                                {selectedChat.isGroup 
                                                    ? `${selectedChat.participants.length} participants`
                                                    : selectedChat.participants.find(p => p.id !== currentUserId)?.email
                                                }
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                icon="pi pi-search"
                                                size="small"
                                                text
                                                tooltip="Search"
                                            />
                                            <Button
                                                icon="pi pi-ellipsis-v"
                                                size="small"
                                                text
                                                tooltip="More options"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <ScrollPanel className="flex-1 px-3">
                                    {messagesLoading ? (
                                        <div className="flex flex-column gap-3">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-content-end' : 'justify-content-start'}`}>
                                                    <Skeleton height="3rem" width="60%" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-column gap-3 pt-6">
                                            {messages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${message.senderId === currentUserId ? 'justify-content-end' : 'justify-content-start'}`}
                                                >
                                                    <div className={`max-w-xs lg:max-w-md ${message.senderId === currentUserId ? 'order-2' : 'order-1'}`}>
                                                        {message.senderId !== currentUserId && (
                                                            <div className="flex align-items-center gap-2 mb-1">
                                                                                                                <Avatar
                                                    image={message.sender?.profileImage}
                                                    label={message.sender?.firstName?.charAt(0)}
                                                    size="normal"
                                                    shape="circle"
                                                />
                                                                <span className="text-xs opacity-70">
                                                                    {message.sender?.firstName} {message.sender?.lastName}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`p-3 border-round ${
                                                                message.senderId === currentUserId
                                                                    ? 'bg-primary text-white'
                                                                    : 'bg-gray-100'
                                                            }`}
                                                        >
                                                            <p className="m-0 text-sm">{message.content}</p>
                                                            <div className={`flex align-items-center gap-2 mt-2 text-xs ${
                                                                message.senderId === currentUserId ? 'opacity-70' : 'opacity-50'
                                                            }`}>
                                                                <span>{formatTime(message.createdAt)}</span>
                                                                {message.senderId === currentUserId && (
                                                                    <i className={`pi ${message.isRead ? 'pi-check-double' : 'pi-check'}`} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {typingUsers[selectedChat.id]?.length > 0 && (
                                                <div className="flex justify-content-start">
                                                    <div className="bg-gray-100 p-3 border-round">
                                                        <div className="flex gap-1">
                                                            <div className="w-2 h-2 bg-gray-400 border-round animate-pulse"></div>
                                                            <div className="w-2 h-2 bg-gray-400 border-round animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                                            <div className="w-2 h-2 bg-gray-400 border-round animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </ScrollPanel>

                                {/* Message Input */}
                                <div className="p-3 border-top-1 surface-border bg-white">
                                    <div className="flex align-items-center gap-3">
                                        <Button
                                            icon="pi pi-paperclip"
                                            size="small"
                                            text
                                            tooltip="Attach file"
                                        />
                                        <div className="flex-1">
                                            <InputText
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        sendMessage();
                                                    }
                                                }}
                                                onInput={handleTyping}
                                                placeholder="Type a message..."
                                                className="w-full"
                                            />
                                        </div>
                                        <Button
                                            icon="pi pi-send"
                                            size="small"
                                            rounded
                                            onClick={sendMessage}
                                            disabled={!newMessage.trim()}
                                            tooltip="Send message"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Welcome Screen */
                            <div className="flex-1 flex align-items-center justify-content-center">
                                <div className="text-center">
                                    <i className="pi pi-comments text-6xl text-gray-400 mb-4"></i>
                                    <h2 className="text-2xl font-bold text-gray-600 mb-2">Welcome to Messages</h2>
                                    <p className="text-gray-500 mb-4">Select a chat to start messaging</p>
                                                                    <Button
                                    label="Start New Chat"
                                    icon="pi pi-plus"
                                    onClick={() => setShowNewChatDialog(true)}
                                    severity="success"
                                />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New Chat Dialog */}
            <Dialog
                visible={showNewChatDialog}
                style={{ width: '500px' }}
                header="Start New Chat"
                modal
                onHide={() => setShowNewChatDialog(false)}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button
                            label="Cancel"
                            icon="pi pi-times"
                            onClick={() => setShowNewChatDialog(false)}
                            text
                        />
                        <Button
                            label="Create Chat"
                            icon="pi pi-check"
                            onClick={createNewChat}
                            disabled={selectedUsers.length === 0}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-2">Search Users</label>
                        <InputText
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search users..."
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Select Users</label>
                        <ScrollPanel style={{ height: '200px' }}>
                            <div className="flex flex-column gap-2">
                                {filteredUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`p-2 border-round cursor-pointer transition-colors ${
                                            selectedUsers.some(u => u.id === user.id)
                                                ? 'bg-primary text-white'
                                                : 'hover:bg-gray-100'
                                        }`}
                                        onClick={() => {
                                            setSelectedUsers(prev => 
                                                prev.some(u => u.id === user.id)
                                                    ? prev.filter(u => u.id !== user.id)
                                                    : [...prev, user]
                                            );
                                        }}
                                    >
                                        <div className="flex align-items-center gap-3">
                                            <Avatar
                                                image={user.profileImage}
                                                label={user.firstName.charAt(0)}
                                                size="normal"
                                                shape="circle"
                                            />
                                            <div>
                                                <div className="font-semibold">
                                                    {user.firstName} {user.lastName}
                                                </div>
                                                <div className="text-sm opacity-70">{user.email}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollPanel>
                    </div>
                    {selectedUsers.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Selected Users ({selectedUsers.length})</label>
                            <div className="flex flex-wrap gap-2">
                                {selectedUsers.map((user) => (
                                    <div key={user.id} className="flex align-items-center gap-2 bg-blue-100 p-2 border-round">
                                        <span className="text-sm">{user.firstName} {user.lastName}</span>
                                        <Button
                                            icon="pi pi-times"
                                            size="small"
                                            text
                                            onClick={() => {
                                                setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                                            }}
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