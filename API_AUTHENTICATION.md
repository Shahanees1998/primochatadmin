# Authentication API Documentation

## Login Endpoint

**URL:** `POST /api/auth/login`

**Description:** Authenticates a user and returns both tokens and complete user data for seamless mobile app integration.

### Request Body

```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

### Response Format

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "MEMBER",
    "status": "ACTIVE",
    "membershipNumber": "primo1234",
    "profileImage": "https://res.cloudinary.com/...",
    "profileImagePublicId": "profile_images/user123",
    "joinDate": "2024-01-15T00:00:00.000Z",
    "paidDate": "2024-01-15T00:00:00.000Z",
    "lastLogin": "2024-01-20T10:30:00.000Z",
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### User Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique user identifier |
| `email` | string | User's email address |
| `firstName` | string | User's first name |
| `lastName` | string | User's last name |
| `phone` | string? | User's phone number (optional) |
| `role` | string | User role (MEMBER, ADMIN, etc.) |
| `status` | string | Account status (ACTIVE, PENDING, DEACTIVATED) |
| `membershipNumber` | string? | Unique membership number (optional) |
| `profileImage` | string? | URL to profile image (optional) |
| `profileImagePublicId` | string? | Cloudinary public ID for profile image (optional) |
| `joinDate` | string? | Date when user joined (optional) |
| `paidDate` | string? | Date when user paid membership (optional) |
| `lastLogin` | string? | Last login timestamp (optional) |
| `createdAt` | string? | Account creation timestamp (optional) |
| `updatedAt` | string? | Last update timestamp (optional) |

### Token Information

- **accessToken**: JWT token valid for 7 days
- **refreshToken**: JWT token valid for 30 days
- Both tokens are also set as HTTP-only cookies for web clients

### Mobile App Integration

For mobile apps, you can:

1. **Store tokens locally** for API authentication
2. **Use the complete user data** immediately without additional API calls
3. **Implement token refresh** using the refresh token before expiry

### Example Mobile App Usage

```javascript
// Login request
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});

const data = await response.json();

if (data.success) {
  // Store tokens locally
  await AsyncStorage.setItem('accessToken', data.accessToken);
  await AsyncStorage.setItem('refreshToken', data.refreshToken);
  
  // Store user data
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  
  // Navigate to main app
  navigation.navigate('MainApp');
}
```

### Error Responses

```json
{
  "error": "Invalid email or password"
}
```

```json
{
  "error": "Account has been deactivated. Please contact admin."
}
```

```json
{
  "error": "Account is not active. Please contact admin."
}
```

## Token Usage

### Making Authenticated Requests

```javascript
const accessToken = await AsyncStorage.getItem('accessToken');

const response = await fetch('/api/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

### Token Refresh

```javascript
const refreshToken = await AsyncStorage.getItem('refreshToken');

const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${refreshToken}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
if (data.accessToken) {
  await AsyncStorage.setItem('accessToken', data.accessToken);
}
```

## Security Notes

- Tokens are automatically refreshed every 6 hours
- Tokens are refreshed when the user returns to the app
- Invalid or expired tokens will require re-authentication
- All sensitive operations require valid access tokens 