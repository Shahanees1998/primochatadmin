import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents, ChatMessage } from '@/types/socket';

interface UseSocketOptions {
    userId?: string;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const socketRef = useRef<Socket<SocketEvents> | null>(null);

    useEffect(() => {
        if (!socketRef.current) {
            setIsConnecting(true);
            
            // Initialize socket connection
            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                (process.env.NODE_ENV === 'production' 
                    ? window.location.origin // Use the same origin in production
                    : 'http://localhost:3000');
            console.log('Connecting to socket server:', socketUrl);
            
            socketRef.current = io(socketUrl, {
                autoConnect: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                transports: ['polling', 'websocket'],
                timeout: 20000,
                forceNew: true,
            });

            const socket = socketRef.current;

            // Connection events
            socket.on('connect', () => {
                console.log('Socket connected successfully');
                setIsConnected(true);
                setIsConnecting(false);
                options.onConnect?.();

                // Join user room if userId is provided
                if (options.userId) {
                    console.log('Joining user room:', options.userId);
                    socket.emit('join-user', options.userId);
                }
            });

            socket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsConnected(false);
                options.onDisconnect?.();
            });

            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                setIsConnecting(false);
                options.onError?.(error);
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [options.userId]);

    const joinChat = (chatRoomId: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('join-chat', chatRoomId);
        }
    };

    const leaveChat = (chatRoomId: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('leave-chat', chatRoomId);
        }
    };

    const sendMessage = (chatRoomId: string, message: ChatMessage) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('send-message', { chatRoomId, message });
        }
    };

    const startTyping = (chatRoomId: string, userId: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('typing-start', { chatRoomId, userId });
        }
    };

    const stopTyping = (chatRoomId: string, userId: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('typing-stop', { chatRoomId, userId });
        }
    };

    const markMessageAsRead = (chatRoomId: string, messageId: string, userId: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit('mark-read', { chatRoomId, messageId, userId });
        }
    };

    const onNewMessage = (callback: (data: { chatRoomId: string; message: ChatMessage }) => void) => {
        if (socketRef.current) {
            socketRef.current.on('new-message', callback);
        }
    };

    const onMessageSent = (callback: (data: { chatRoomId: string; message: ChatMessage }) => void) => {
        if (socketRef.current) {
            socketRef.current.on('message-sent', callback);
        }
    };

    const onUserTyping = (callback: (data: { chatRoomId: string; userId: string; isTyping: boolean }) => void) => {
        if (socketRef.current) {
            socketRef.current.on('user-typing', callback);
        }
    };

    const onMessageRead = (callback: (data: { chatRoomId: string; messageId: string; userId: string }) => void) => {
        if (socketRef.current) {
            socketRef.current.on('message-read', callback);
        }
    };

    const offNewMessage = () => {
        if (socketRef.current) {
            socketRef.current.off('new-message');
        }
    };

    const offMessageSent = () => {
        if (socketRef.current) {
            socketRef.current.off('message-sent');
        }
    };

    const offUserTyping = () => {
        if (socketRef.current) {
            socketRef.current.off('user-typing');
        }
    };

    const offMessageRead = () => {
        if (socketRef.current) {
            socketRef.current.off('message-read');
        }
    };

    return {
        socket: socketRef.current,
        isConnected,
        isConnecting,
        joinChat,
        leaveChat,
        sendMessage,
        startTyping,
        stopTyping,
        markMessageAsRead,
        onNewMessage,
        onMessageSent,
        onUserTyping,
        onMessageRead,
        offNewMessage,
        offMessageSent,
        offUserTyping,
        offMessageRead,
    };
}; 