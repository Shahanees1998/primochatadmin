import { Server as NetServer, Socket } from 'net';
import { NextApiResponse } from 'next';
import { Server as ServerIOSocket } from 'socket.io';

export type NextApiResponseServerIO = NextApiResponse & {
    socket: Socket & {
        server: NetServer & {
            io: ServerIOSocket;
        };
    };
};

export interface ChatMessage {
    id: string;
    chatRoomId: string;
    senderId: string;
    content: string;
    type: 'TEXT' | 'IMAGE' | 'FILE';
    isRead: boolean;
    createdAt: string;
    sender?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        profileImage?: string;
        status: string;
    };
}

export interface SocketEvents {
    // Client to Server
    'join-user': (userId: string) => void;
    'join-chat': (chatRoomId: string) => void;
    'leave-chat': (chatRoomId: string) => void;
    'send-message': (data: { chatRoomId: string; message: ChatMessage }) => void;
    'typing-start': (data: { chatRoomId: string; userId: string }) => void;
    'typing-stop': (data: { chatRoomId: string; userId: string }) => void;
    'mark-read': (data: { chatRoomId: string; messageId: string; userId: string }) => void;

    // Server to Client
    'new-message': (data: { chatRoomId: string; message: ChatMessage }) => void;
    'message-sent': (data: { chatRoomId: string; message: ChatMessage }) => void;
    'user-typing': (data: { chatRoomId: string; userId: string; isTyping: boolean }) => void;
    'message-read': (data: { chatRoomId: string; messageId: string; userId: string }) => void;
} 