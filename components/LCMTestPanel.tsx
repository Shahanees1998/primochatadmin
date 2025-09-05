'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';

export default function LCMTestPanel() {
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test push notification from LCM');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sendTestNotification = async () => {
    if (!userId || !title || !body) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-lcm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title,
          body,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to send notification');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceCount = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/test-lcm?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to get device count');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="LCM Test Panel" className="w-full">
      <div className="grid">
        <div className="col-12">
          <div className="field">
            <label htmlFor="userId">User ID</label>
            <InputText
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full"
            />
          </div>
        </div>

        <div className="col-12">
          <div className="field">
            <label htmlFor="title">Notification Title</label>
            <InputText
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              className="w-full"
            />
          </div>
        </div>

        <div className="col-12">
          <div className="field">
            <label htmlFor="body">Notification Body</label>
            <InputTextarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter notification message"
              rows={3}
              className="w-full"
            />
          </div>
        </div>

        <div className="col-12">
          <div className="flex gap-2">
            <Button
              label="Send Test Notification"
              icon="pi pi-send"
              onClick={sendTestNotification}
              loading={loading}
              disabled={!userId || !title || !body}
            />
            <Button
              label="Get Device Count"
              icon="pi pi-mobile"
              onClick={getDeviceCount}
              loading={loading}
              disabled={!userId}
              severity="secondary"
            />
          </div>
        </div>

        {error && (
          <div className="col-12">
            <Message severity="error" text={error} />
          </div>
        )}

        {result && (
          <div className="col-12">
            <Message severity="success" text="Operation completed successfully" />
            <Divider />
            <div className="mt-3">
              <h4>Result:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <Divider />

      <div className="mt-4">
        <h4>Instructions:</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Enter a valid user ID from your database</li>
          <li>Customize the notification title and body</li>
          <li>Click "Send Test Notification" to send a push notification</li>
          <li>Click "Get Device Count" to see how many devices the user has registered</li>
          <li>Make sure the user has registered their device token using the LCM register endpoint</li>
        </ol>
      </div>
    </Card>
  );
}
