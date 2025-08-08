'use client';

import React, { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';

export default function SocketTest() {
    const { user } = useAuth();
    const [socketStatus, setSocketStatus] = useState('Disconnected');
    const [events, setEvents] = useState<string[]>([]);
    const [testLoading, setTestLoading] = useState(false);

    const socket = useSocket({
        userId: user?.id,
        onConnect: () => {
            setSocketStatus('Connected');
            setEvents(prev => [...prev, 'Connected to socket server']);
        },
        onDisconnect: () => {
            setSocketStatus('Disconnected');
            setEvents(prev => [...prev, 'Disconnected from socket server']);
        },
        onError: (error) => {
            setSocketStatus('Error');
            setEvents(prev => [...prev, `Connection error: ${error.message}`]);
        }
    });

    useEffect(() => {
        if (!socket.socket || !user?.id) return;

        const handleNewNotification = (notification: any) => {
            setEvents(prev => [...prev, `New notification: ${notification.title}`]);
        };

        const handleNewMessage = (data: any) => {
            setEvents(prev => [...prev, `New message in chat: ${data.chatRoomId}`]);
        };

        const handleTestEvent = (data: any) => {
            setEvents(prev => [...prev, `Test event response: ${data.message}`]);
        };

        // Listen for notification events
        socket.socket.on('new-notification', handleNewNotification);
        socket.socket.on('new-message', handleNewMessage);
        socket.socket.on('test-event', handleTestEvent);

        return () => {
            socket.socket?.off('new-notification', handleNewNotification);
            socket.socket?.off('new-message', handleNewMessage);
            socket.socket?.off('test-event', handleTestEvent);
        };
    }, [socket.socket, user?.id]);

    const testEmit = () => {
        if (socket.socket) {
            socket.socket.emit('test-event', { message: 'Test from client' });
            setEvents(prev => [...prev, 'Sent test event']);
        }
    };

    const testNotification = async () => {
        if (!user?.id) return;
        
        setTestLoading(true);
        try {
            const response = await fetch('/api/test-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    title: 'Test Notification',
                    message: `This is a test notification sent at ${new Date().toLocaleTimeString()}`
                })
            });

            const result = await response.json();
            if (result.success) {
                setEvents(prev => [...prev, 'Test notification sent successfully']);
            } else {
                setEvents(prev => [...prev, `Test notification failed: ${result.error}`]);
            }
        } catch (error) {
            setEvents(prev => [...prev, `Test notification error: ${error}`]);
        } finally {
            setTestLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm z-50">
            <h3 className="font-semibold mb-2">Socket Test</h3>
            <div className="text-sm mb-2">
                Status: <span className={socketStatus === 'Connected' ? 'text-green-600' : 'text-red-600'}>
                    {socketStatus}
                </span>
            </div>
            <div className="flex gap-2 mb-2">
                <button
                    onClick={testEmit}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                    disabled={!socket.isConnected}
                >
                    Test Emit
                </button>
                <button
                    onClick={testNotification}
                    className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                    disabled={!socket.isConnected || testLoading}
                >
                    {testLoading ? 'Sending...' : 'Test Notification'}
                </button>
            </div>
            <div className="text-xs text-gray-600 max-h-32 overflow-y-auto">
                {events.map((event, index) => (
                    <div key={index} className="mb-1">{event}</div>
                ))}
            </div>
        </div>
    );
} 