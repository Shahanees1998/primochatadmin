'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LCMTestPanel from '@/components/LCMTestPanel';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';

export default function LCMTestPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      setIsAdmin(user.role === 'ADMIN');
    }
  }, [user]);

  if (!user) {
    return (
      <div className="p-4">
        <Message severity="warn" text="Please log in to access this page" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Message severity="error" text="Admin access required" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">LCM Test Panel</h1>
        <p className="text-gray-600">
          Test Local Cloud Messaging (LCM) push notifications for mobile devices.
        </p>
      </div>

      <LCMTestPanel />

      <Divider />

      <Card title="LCM Integration Status" className="mt-4">
        <div className="grid">
          <div className="col-12 md:col-6">
            <h4>Environment Variables</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>PUSH_NOTIFICATION_SERVICE: {process.env.NEXT_PUBLIC_PUSH_SERVICE || 'Not set'}</li>
              <li>FIREBASE_PROJECT_ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set'}</li>
              <li>FIREBASE_CLIENT_EMAIL: {process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL || 'Not set'}</li>
            </ul>
          </div>
          <div className="col-12 md:col-6">
            <h4>API Endpoints</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>POST /api/lcm/register</li>
              <li>POST /api/lcm/unregister</li>
              <li>GET /api/lcm/status</li>
              <li>PUT /api/lcm/status</li>
              <li>POST /api/admin/lcm/send</li>
              <li>POST /api/test-lcm</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Testing Instructions" className="mt-4">
        <div className="space-y-3">
          <div>
            <h4>1. Mobile App Setup</h4>
            <p className="text-sm text-gray-600">
              Ensure your mobile app is configured to register device tokens using the LCM register endpoint.
            </p>
          </div>
          <div>
            <h4>2. Test Device Registration</h4>
            <p className="text-sm text-gray-600">
              Use the mobile app to register a device token, then test sending notifications.
            </p>
          </div>
          <div>
            <h4>3. Monitor Logs</h4>
            <p className="text-sm text-gray-600">
              Check your server logs to see FCM responses and any failed token deliveries.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
