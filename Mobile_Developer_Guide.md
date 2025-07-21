# PrimoChat Mobile API Developer Guide

## 🚀 Quick Start

### 1. Authentication Flow
```javascript
// 1. Login and get tokens
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password123' })
});

const { accessToken, refreshToken, user } = await loginResponse.json();

// 2. Store tokens securely (use secure storage like Keychain for iOS or Keystore for Android)
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);

// 3. Use token for all subsequent requests
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### 2. API Base Configuration
```javascript
const API_BASE = 'http://your-domain.com/api';

// Helper function for authenticated requests
const apiRequest = async (endpoint, options = {}) => {
  const token = await SecureStore.getItemAsync('accessToken');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (response.status === 401) {
    // Handle token refresh or redirect to login
    await handleTokenRefresh();
  }
  
  return response.json();
};
```

## 📱 API Endpoints & Filtering Guide

### 🔐 Authentication APIs

#### Login
```javascript
POST /api/auth/login
Body: { email: string, password: string }
Response: { 
  success: boolean, 
  accessToken: string, 
  refreshToken: string, 
  user: UserObject 
}
```

#### Get User Details
```javascript
GET /api/auth/me
Headers: Authorization: Bearer {token}
Response: { success: boolean, user: UserObject }
```

#### Change Password
```javascript
POST /api/users/change-password
Body: { currentPassword: string, newPassword: string }
```

### 👥 User Management

#### Update Profile
```javascript
PUT /api/users/{user_id}
Body: { firstName: string, lastName: string, phone: string }
```

#### Get All Users (Admin Only)
```javascript
GET /api/admin/users?page=1&limit=20&search=&status=
// Returns all users with pagination and filtering
```

**Filtering Options:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search in firstName, lastName, email, membershipNumber
- `status`: Filter by user status (ACTIVE, PENDING, DEACTIVATED)

### 🍽️ Festive Boards

#### Get All Festive Boards
```javascript
GET /api/admin/festive-board?page=1&limit=20&search=&year=2024
// Returns festive boards with pagination and filtering
```

**Filtering Options:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search in title/description
- `year`: Filter by year (e.g., 2024)

#### Get Festive Board Details with Meals
```javascript
GET /api/admin/festive-board/{festive_board_id}/meals
// Returns detailed festive board with all meals and user's selections
```

#### Select/Deselect Meal
```javascript
POST /api/admin/festive-board/{festive_board_id}/meals
Body: { mealId: string, action: "select" | "deselect" }
```

#### Mark Meal as Completed
```javascript
POST /api/admin/trestle-board
Body: { festiveBoardMealId: string, isCompleted: boolean }
```

### 📅 Trestle Boards

#### Get All Trestle Boards
```javascript
GET /api/admin/trestle-board?page=1&limit=20&search=&category=
// Returns all trestle boards with pagination and filtering
```

**Filtering Options:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search in title, description, location
- `category`: Filter by category (REGULAR_MEETING, DISTRICT, EMERGENT, etc.)

#### Get Trestle Board Details
```javascript
GET /api/admin/trestle-board/{trestle_board_id}
// Returns specific trestle board details
```

#### Add Trestle Board to Calendar
```javascript
POST /api/admin/calendar
Body: {
  userId: string,
  title: string,
  description: string,
  startDate: string, // YYYY-MM-DD
  startTime: string, // HH:MM
  location: string,
  eventType: "TRESTLE_BOARD",
  trestleBoardId: string
}
```

#### Sign Up for Trestle Board
```javascript
POST /api/admin/trestle-board/{trestle_board_id}/signup
Body: { userId: string, willAttend: boolean, notes: string }
```

### 🗓️ Calendar

#### Get User Calendar
```javascript
GET /api/admin/calendar?startDate=2024-01-01&endDate=2024-12-31&eventType=&userId={user_id}
```

**Filtering Options:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `eventType`: Filter by event type (TRESTLE_BOARD, CUSTOM, etc.)
- `userId`: User ID for filtering user-specific events

#### Create Custom Event
```javascript
POST /api/admin/calendar
Body: {
  userId: string,
  title: string,
  description: string,
  startDate: string, // YYYY-MM-DD
  startTime: string, // HH:MM
  location: string,
  eventType: "CUSTOM"
}
```

#### Update Event
```javascript
PUT /api/admin/calendar/{event_id}
Body: {
  title: string,
  description: string,
  startDate: string,
  startTime: string,
  location: string
}
```

#### Delete Event
```javascript
DELETE /api/admin/calendar/{event_id}?eventType=CUSTOM&userId={user_id}
```

### 🔔 Notifications

#### Get User Notifications
```javascript
GET /api/admin/notifications?page=1&limit=20&status=all&type=&search=
```

**Filtering Options:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: "all" | "unread" | "read" | "archived"
- `type`: Filter by notification type
- `search`: Search in title/message

#### Mark as Read
```javascript
PATCH /api/admin/notifications/{notification_id}?action=read
Body: { isRead: true }
```

#### Mark All as Read
```javascript
PATCH /api/admin/notifications?action=mark-all-read
Body: { action: "mark-all-read" }
```

### 💬 Chat

#### Get Chat Rooms
```javascript
GET /api/admin/chat/rooms
// Returns all chat rooms where user is a participant
```

#### Create Chat Room
```javascript
POST /api/admin/chat/rooms
Body: {
  participantIds: string[],
  name: string, // Required for group chats
  isGroup: boolean
}
```

#### Get Chat Messages
```javascript
GET /api/admin/chat/rooms/{chat_room_id}/messages?page=1&limit=50&sortOrder=desc
```

**Filtering Options:**
- `page`: Page number
- `limit`: Messages per page
- `sortOrder`: "asc" | "desc" (default: desc for newest first)

#### Send Message
```javascript
POST /api/admin/chat/messages
Body: {
  chatRoomId: string,
  content: string,
  type: "TEXT" | "IMAGE" | "FILE"
}
```

#### Mark Messages as Read
```javascript
PATCH /api/admin/chat/messages/mark-read
Body: {
  messageIds: string[],
  chatRoomId: string
}
```

### 🆘 Support

#### Get Support Requests
```javascript
GET /api/admin/support?page=1&limit=10&status=&priority=
// Returns all support requests with pagination and filtering
```

**Filtering Options:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- `priority`: Filter by priority (LOW, MEDIUM, HIGH, URGENT)

#### Get Support Request Details
```javascript
GET /api/admin/support/{support_request_id}
// Returns specific support request details
```

#### Submit Support Request
```javascript
POST /api/admin/support
Body: {
  userId: string,
  subject: string,
  message: string,
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
}
```

#### Update Support Request
```javascript
PUT /api/admin/support/{support_request_id}
Body: {
  status: string,
  priority: string,
  adminResponse: string
}
```

### 📄 Documents

#### Get Documents
```javascript
GET /api/admin/documents?page=1&limit=20&search=&category=&permissions=
```

**Filtering Options:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search in title, description, fileName
- `category`: Filter by document category
- `permissions`: Filter by permissions (PUBLIC, MEMBER_ONLY, ADMIN_ONLY)

#### Get Document Details
```javascript
GET /api/admin/documents/{document_id}
// Returns specific document details
```

#### Upload Document
```javascript
POST /api/admin/documents
Body: FormData with:
- file: File object
- title: string
- description: string
- category: string
- permissions: "PUBLIC" | "MEMBER_ONLY" | "ADMIN_ONLY"
```

### 📞 Phonebook

#### Get Phonebook
```javascript
GET /api/admin/phonebook?page=1&limit=20&search=
```

**Filtering Options:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search in name, email, phone

#### Get Phonebook Entry
```javascript
GET /api/admin/phonebook/{phonebook_entry_id}
// Returns specific phonebook entry details
```

#### Create Phonebook Entry
```javascript
POST /api/admin/phonebook
Body: {
  userId: string,
  email: string,
  phone: string,
  address: string,
  isPublic: boolean
}
```

### 📊 Dashboard

#### Get Dashboard Stats
```javascript
GET /api/admin/dashboard
// Returns dashboard statistics and recent activity
```

### 📢 Announcements

#### Get Announcements
```javascript
GET /api/admin/announcements?page=1&limit=20&search=&type=&status=
```

**Filtering Options:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search in title, content
- `type`: Filter by type (GENERAL, IMPORTANT, URGENT, UPDATE)
- `status`: Filter by status

#### Create Announcement
```javascript
POST /api/admin/announcements
Body: {
  title: string,
  content: string,
  type: "GENERAL" | "IMPORTANT" | "URGENT" | "UPDATE"
}
```

## 🔍 Data Filtering Best Practices

### 1. Pagination
Always implement pagination for large datasets:
```javascript
// Example: Load notifications with pagination
const loadNotifications = async (page = 1) => {
  const response = await apiRequest(`/admin/notifications?page=${page}&limit=20`);
  return response;
};
```

### 2. Search Implementation
```javascript
// Debounced search for better performance
const searchUsers = debounce(async (query) => {
  if (query.length < 2) return [];
  const response = await apiRequest(`/admin/users?search=${encodeURIComponent(query)}`);
  return response;
}, 300);
```

### 3. Date Filtering
```javascript
// Get events for current month
const getCurrentMonthEvents = async () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const response = await apiRequest(`/admin/calendar?startDate=${startDate}&endDate=${endDate}&userId=${userId}`);
  return response;
};
```

### 4. Real-time Updates
```javascript
// WebSocket connection for real-time chat
const connectWebSocket = () => {
  const ws = new WebSocket('ws://your-domain.com');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'new-message':
        updateChatMessages(data.chatRoomId, data.message);
        break;
      case 'new-notification':
        updateNotifications(data.notification);
        break;
    }
  };
};
```

## 🛡️ Security Best Practices

### 1. Token Management
```javascript
// Secure token storage
const storeTokens = async (accessToken, refreshToken) => {
  await SecureStore.setItemAsync('accessToken', accessToken);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
};

// Token refresh logic
const refreshToken = async () => {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const { accessToken } = await response.json();
  await SecureStore.setItemAsync('accessToken', accessToken);
  return accessToken;
};
```

### 2. Error Handling
```javascript
const handleApiError = (error, response) => {
  switch (response.status) {
    case 401:
      // Redirect to login
      navigateToLogin();
      break;
    case 403:
      // Show access denied
      showAccessDenied();
      break;
    case 500:
      // Show server error
      showServerError();
      break;
    default:
      // Show generic error
      showError(error.message);
  }
};
```

## 📊 Response Format Examples

### User Object
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "MEMBER",
  "status": "ACTIVE",
  "membershipNumber": "primo1234",
  "profileImage": "https://example.com/image.jpg"
}
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "error": "Error message",
  "status": 400
}
```

## 🚀 Performance Tips

1. **Implement caching** for frequently accessed data
2. **Use pagination** for large datasets
3. **Debounce search** inputs
4. **Lazy load** images and heavy content
5. **Implement offline support** for critical features
6. **Use WebSocket** for real-time features like chat

## 🔧 Testing

Use the provided Postman collection to test all APIs before implementing in your mobile app. The collection includes all endpoints with proper authentication and example request bodies.

## ✅ **Key Benefits of Using Admin APIs**

1. **Tested & Proven**: All admin APIs are actively used in the webapp
2. **Consistent**: Same filtering, pagination, and response formats
3. **Secure**: All APIs use proper authentication middleware
4. **Complete**: Covers all features needed for mobile app
5. **Maintained**: APIs are regularly updated and maintained 