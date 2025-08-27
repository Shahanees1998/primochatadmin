Pusher Integration Guide (Flutter)

This guide explains how to receive real‑time chat messages and notifications in a Flutter app using Pusher Channels.

1) Prerequisites
- NEXT_PUBLIC_PUSHER_KEY
- NEXT_PUBLIC_PUSHER_CLUSTER (e.g., mt1)
- Server emits:
  - Chat: channel chat-{chatRoomId} events: new-message, user-typing, message-read
  - Notifications: channel user-{userId} events: new-notification, notification-updated, all-notifications-read

2) Add dependency
In pubspec.yaml:
```
dependencies:
  pusher_channels_flutter: ^2.2.1
```
Run:
```
flutter pub get
```

3) Initialize Pusher
```
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:pusher_channels_flutter/pusher_channels_flutter.dart';

class RealtimeService {
  final String pusherKey;
  final String pusherCluster;
  final String userId;

  late final PusherChannelsFlutter _pusher;

  RealtimeService({
    required this.pusherKey,
    required this.pusherCluster,
    required this.userId,
  });

  Future<void> connect() async {
    _pusher = PusherChannelsFlutter.getInstance();
    await _pusher.init(
      apiKey: pusherKey,
      cluster: pusherCluster,
      onEvent: (PusherEvent event) {
        if (kDebugMode) {
          print('Pusher event: ${event.channelName} ${event.eventName} ${event.data}');
        }
      },
      onConnectionStateChange: (String currentState, String? previousState) {
        if (kDebugMode) print('Pusher state: $previousState -> $currentState');
      },
      onError: (String message, int? code, dynamic exception) {
        if (kDebugMode) print('Pusher error: $message ($code)');
      },
    );

    await _pusher.connect();
    await subscribeUserChannel(userId);
  }

  Future<void> subscribeUserChannel(String userId) async {
    final channelName = 'user-$userId';
    await _pusher.subscribe(channelName: channelName);
    _pusher.bind(
      channelName: channelName,
      eventName: 'new-notification',
      onEvent: (event) {
        final data = _safeJson(event.data);
        if (kDebugMode) print('new-notification: $data');
      },
    );
    _pusher.bind(
      channelName: channelName,
      eventName: 'notification-updated',
      onEvent: (event) {
        final data = _safeJson(event.data);
      },
    );
    _pusher.bind(
      channelName: channelName,
      eventName: 'all-notifications-read',
      onEvent: (event) {
        final data = _safeJson(event.data);
      },
    );
  }

  Future<void> subscribeChat(String chatRoomId, {
    void Function(Map<String, dynamic> payload)? onNewMessage,
    void Function(Map<String, dynamic> payload)? onTyping,
    void Function(Map<String, dynamic> payload)? onMessageRead,
  }) async {
    final channelName = 'chat-$chatRoomId';
    await _pusher.subscribe(channelName: channelName);

    _pusher.bind(
      channelName: channelName,
      eventName: 'new-message',
      onEvent: (event) {
        final data = _safeJson(event.data);
        if (onNewMessage != null) onNewMessage(data);
      },
    );
    _pusher.bind(
      channelName: channelName,
      eventName: 'user-typing',
      onEvent: (event) {
        final data = _safeJson(event.data);
        if (onTyping != null) onTyping(data);
      },
    );
    _pusher.bind(
      channelName: channelName,
      eventName: 'message-read',
      onEvent: (event) {
        final data = _safeJson(event.data);
        if (onMessageRead != null) onMessageRead(data);
      },
    );
  }

  Future<void> unsubscribeChat(String chatRoomId) async {
    await _pusher.unsubscribe(channelName: 'chat-$chatRoomId');
  }

  Future<void> disconnect() async {
    await _pusher.disconnect();
  }

  Map<String, dynamic> _safeJson(String? raw) {
    try {
      if (raw == null || raw.isEmpty) return {};
      return json.decode(raw) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }
}
```

4) Using it in UI
```
final realtime = RealtimeService(
  pusherKey: '<NEXT_PUBLIC_PUSHER_KEY>',
  pusherCluster: '<NEXT_PUBLIC_PUSHER_CLUSTER>',
  userId: currentUserId,
);

await realtime.connect();

await realtime.subscribeChat(
  chatRoomId,
  onNewMessage: (payload) {
    // payload: { chatRoomId, message: { id, content, senderId, createdAt, sender: {...} } }
  },
  onTyping: (payload) {
    // payload: { chatRoomId, userId, isTyping }
  },
  onMessageRead: (payload) {
    // payload: { chatRoomId, messageId, userId }
  },
);

await realtime.unsubscribeChat(chatRoomId);
await realtime.disconnect();
```

5) Sending messages / typing / read
- POST `/api/admin/chat/messages` { chatRoomId, content, type }
- POST `/api/socket/typing-start` { chatRoomId, userId }
- POST `/api/socket/typing-stop` { chatRoomId, userId }
- POST `/api/socket/mark-read` { chatRoomId, messageId, userId }

6) Troubleshooting
- Verify key/cluster
- Device online (wss)
- Configure auth for private/presence
- Log channel/event names


