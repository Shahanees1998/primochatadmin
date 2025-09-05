# LCM (Local Cloud Messaging) Mobile Integration Guide

This guide explains how to integrate LCM (Local Cloud Messaging) for mobile push notifications in your PrimoChat application.

## Overview

LCM provides a unified interface for sending push notifications to mobile devices (iOS, Android) and web browsers. The system stores device tokens in the user model and provides APIs for token management and notification sending.

## Database Schema Changes

The User model has been extended with LCM fields:

```prisma
model User {
  // ... existing fields ...
  
  // LCM (Local Cloud Messaging) for mobile push notifications
  lcmDeviceTokens      String[]   @default([]) // Array of device tokens for push notifications
  lcmEnabled           Boolean    @default(true) // Whether user has enabled push notifications
  
  // ... existing relations ...
}
```

## API Endpoints

### User Endpoints

#### 1. Register Device Token
**POST** `/api/lcm/register`

Register a device token for push notifications.

**Request Body:**
```json
{
  "token": "device_token_here",
  "platform": "ios", // ios, android, web
  "appVersion": "1.0.0",
  "deviceModel": "iPhone 14",
  "osVersion": "iOS 16.0"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device token registered successfully"
}
```

#### 2. Unregister Device Token
**POST** `/api/lcm/unregister`

Unregister a device token.

**Request Body:**
```json
{
  "token": "device_token_here"
}
```

#### 3. Get Notification Status
**GET** `/api/lcm/status`

Get user's push notification status and registered devices.

**Response:**
```json
{
  "enabled": true,
  "deviceCount": 2,
  "devices": ["token1", "token2"]
}
```

#### 4. Update Notification Status
**PUT** `/api/lcm/status`

Enable or disable push notifications.

**Request Body:**
```json
{
  "enabled": true
}
```

### Admin Endpoints

#### 5. Send Push Notification (Admin Only)
**POST** `/api/admin/lcm/send`

Send push notification to users.

**Request Body:**
```json
{
  "sendToAll": true, // or "userIds": ["user_id_1", "user_id_2"]
  "title": "Notification Title",
  "body": "Notification message",
  "data": {
    "type": "chat_message",
    "chatRoomId": "room_id"
  },
  "image": "https://example.com/image.jpg",
  "badge": 1,
  "sound": "default",
  "priority": "high",
  "ttl": 3600
}
```

## Mobile App Integration

### Flutter Implementation

#### 1. Add Dependencies

```yaml
# pubspec.yaml
dependencies:
  firebase_messaging: ^14.7.10
  firebase_core: ^2.24.2
  # or for Expo
  expo-notifications: ^0.20.1
```

#### 2. Initialize Push Notifications

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class PushNotificationService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  
  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // Get token
      String? token = await _firebaseMessaging.getToken();
      if (token != null) {
        await _registerDeviceToken(token);
      }
      
      // Listen for token refresh
      _firebaseMessaging.onTokenRefresh.listen((newToken) {
        _registerDeviceToken(newToken);
      });
      
      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        _handleForegroundMessage(message);
      });
      
      // Handle background messages
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
      
      // Handle notification tap
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        _handleNotificationTap(message);
      });
    }
  }
  
  Future<void> _registerDeviceToken(String token) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/lcm/register'),
        headers: {
          'Authorization': 'Bearer ${await getAuthToken()}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
          'appVersion': await getAppVersion(),
          'deviceModel': await getDeviceModel(),
          'osVersion': await getOsVersion(),
        }),
      );
      
      if (response.statusCode == 200) {
        print('Device token registered successfully');
      }
    } catch (e) {
      print('Error registering device token: $e');
    }
  }
  
  void _handleForegroundMessage(RemoteMessage message) {
    // Show local notification or update UI
    print('Foreground message: ${message.notification?.title}');
  }
  
  void _handleNotificationTap(RemoteMessage message) {
    // Navigate to appropriate screen based on data
    final data = message.data;
    if (data['type'] == 'chat_message') {
      // Navigate to chat room
      Navigator.pushNamed(context, '/chat/${data['chatRoomId']}');
    }
  }
}

// Background message handler
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Background message: ${message.notification?.title}');
}
```

#### 3. App Lifecycle Management

```dart
class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  final PushNotificationService _pushService = PushNotificationService();
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _pushService.initialize();
  }
  
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
  
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        // App came to foreground
        break;
      case AppLifecycleState.paused:
        // App went to background
        break;
      case AppLifecycleState.detached:
        // App is about to be terminated
        _unregisterDeviceToken();
        break;
      default:
        break;
    }
  }
  
  Future<void> _unregisterDeviceToken() async {
    // Unregister token when app is terminated
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      // Call unregister API
    }
  }
}
```

### React Native Implementation

#### 1. Install Dependencies

```bash
npm install @react-native-firebase/messaging
# or
yarn add @react-native-firebase/messaging
```

#### 2. Setup Push Notifications

```javascript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

class PushNotificationService {
  async initialize() {
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled = 
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // Get token
      const token = await messaging().getToken();
      if (token) {
        await this.registerDeviceToken(token);
      }

      // Listen for token refresh
      messaging().onTokenRefresh(token => {
        this.registerDeviceToken(token);
      });

      // Handle foreground messages
      messaging().onMessage(async remoteMessage => {
        this.handleForegroundMessage(remoteMessage);
      });

      // Handle background messages
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        this.handleBackgroundMessage(remoteMessage);
      });

      // Handle notification tap
      messaging().onNotificationOpenedApp(remoteMessage => {
        this.handleNotificationTap(remoteMessage);
      });
    }
  }

  async registerDeviceToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/lcm/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          appVersion: await getAppVersion(),
          deviceModel: await getDeviceModel(),
          osVersion: await getOsVersion(),
        }),
      });

      if (response.ok) {
        console.log('Device token registered successfully');
      }
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  }

  handleForegroundMessage(remoteMessage) {
    // Show local notification or update UI
    console.log('Foreground message:', remoteMessage.notification?.title);
  }

  handleBackgroundMessage(remoteMessage) {
    console.log('Background message:', remoteMessage.notification?.title);
  }

  handleNotificationTap(remoteMessage) {
    // Navigate to appropriate screen
    const data = remoteMessage.data;
    if (data?.type === 'chat_message') {
      // Navigate to chat room
      navigation.navigate('ChatRoom', { roomId: data.chatRoomId });
    }
  }
}
```

## Push Notification Service Integration

The LCM service is designed to work with various push notification providers. Here are examples for popular services:

### Firebase Cloud Messaging (FCM)

```typescript
// lib/lcmService.ts - FCM Implementation
import * as admin from 'firebase-admin';

private static async sendViaFCM(tokens: string[], notification: LCMPushNotification): Promise<void> {
  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.image,
    },
    data: notification.data,
    android: {
      notification: {
        sound: notification.sound || 'default',
        priority: notification.priority || 'high',
        badge: notification.badge?.toString(),
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: notification.title,
            body: notification.body,
          },
          sound: notification.sound || 'default',
          badge: notification.badge,
        },
      },
    },
    tokens: tokens,
  };

  const response = await admin.messaging().sendMulticast(message);
  console.log('FCM Response:', response);
}
```

### OneSignal

```typescript
// lib/lcmService.ts - OneSignal Implementation
import axios from 'axios';

private static async sendViaOneSignal(tokens: string[], notification: LCMPushNotification): Promise<void> {
  const response = await axios.post(
    'https://onesignal.com/api/v1/notifications',
    {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: tokens,
      headings: { en: notification.title },
      contents: { en: notification.body },
      data: notification.data,
      big_picture: notification.image,
      ios_badgeType: 'Increase',
      ios_badgeCount: notification.badge,
      priority: notification.priority === 'high' ? 10 : 5,
    },
    {
      headers: {
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('OneSignal Response:', response.data);
}
```

### Expo Push Notifications

```typescript
// lib/lcmService.ts - Expo Implementation
import { Expo } from 'expo-server-sdk';

private static async sendViaExpo(tokens: string[], notification: LCMPushNotification): Promise<void> {
  const expo = new Expo();
  
  const messages = tokens.map(token => ({
    to: token,
    sound: notification.sound || 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data,
    badge: notification.badge,
    priority: notification.priority || 'high',
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending Expo notification:', error);
    }
  }

  console.log('Expo tickets:', tickets);
}
```

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Firebase (if using FCM)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# OneSignal (if using OneSignal)
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key

# Expo (if using Expo)
EXPO_ACCESS_TOKEN=your-access-token
```

## Testing

### Test Device Token Registration

```bash
curl -X POST https://your-api.com/api/lcm/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test_device_token",
    "platform": "ios",
    "appVersion": "1.0.0",
    "deviceModel": "iPhone 14",
    "osVersion": "iOS 16.0"
  }'
```

### Test Push Notification Sending

```bash
curl -X POST https://your-api.com/api/admin/lcm/send \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sendToAll": true,
    "title": "Test Notification",
    "body": "This is a test push notification",
    "data": {
      "type": "test",
      "action": "open_app"
    }
  }'
```

## Best Practices

1. **Token Management**: Always register tokens on app startup and when they refresh
2. **Error Handling**: Handle token registration failures gracefully
3. **User Preferences**: Respect user notification preferences
4. **Rate Limiting**: Implement rate limiting for notification sending
5. **Token Cleanup**: Periodically clean up invalid tokens
6. **Testing**: Test on both iOS and Android devices
7. **Background Handling**: Properly handle background message processing
8. **Deep Linking**: Implement deep linking for notification taps

## Troubleshooting

### Common Issues

1. **Tokens not registering**: Check authentication and network connectivity
2. **Notifications not received**: Verify device token and notification permissions
3. **Background messages not working**: Ensure proper background handler setup
4. **iOS notifications not showing**: Check APNs configuration and certificates

### Debug Tips

1. Enable verbose logging in your push notification service
2. Test with a single device token first
3. Verify API responses and error messages
4. Check device logs for push notification errors
5. Use push notification testing tools (FCM Console, OneSignal Dashboard)

## Security Considerations

1. **Token Storage**: Store tokens securely and encrypt sensitive data
2. **API Security**: Use proper authentication for all LCM endpoints
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: Validate all input data before processing
5. **Error Handling**: Don't expose sensitive information in error messages

## Migration Guide

If you're migrating from an existing push notification system:

1. **Backup existing tokens**: Export current device tokens
2. **Update mobile apps**: Deploy new versions with LCM integration
3. **Test thoroughly**: Test on all supported platforms
4. **Monitor metrics**: Track notification delivery rates
5. **Gradual rollout**: Roll out to a subset of users first

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review API documentation and examples
3. Test with the provided curl commands
4. Check server logs for detailed error messages
5. Verify environment variables and configuration
