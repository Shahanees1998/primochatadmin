# Add Meal API Endpoint

## Overview
The `/api/festive-board/add-meal` endpoint allows users to create a new meal, add it to a specified festive board, and automatically select it for themselves in a single API call.

## Endpoint
```
POST /api/festive-board/add-meal
```

## Authentication
Requires a valid Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Request Body
```json
{
  "festiveBoardId": "string (required)",
  "title": "string (required)",
  "description": "string (optional)",
  "categoryId": "string (required)",
  "imageUrl": "string (optional)"
}
```

### Required Fields
- `festiveBoardId`: The ID of the festive board to add the meal to
- `title`: The title/name of the meal
- `categoryId`: The ID of the meal category

### Optional Fields
- `description`: A description of the meal
- `imageUrl`: URL to an image of the meal

## Response

### Success Response (201)
```json
{
  "meal": {
    "id": "string",
    "title": "string",
    "description": "string",
    "imageUrl": "string",
    "categoryId": "string",
    "createdAt": "datetime",
    "updatedAt": "datetime",
    "category": {
      "id": "string",
      "name": "string",
      "description": "string"
    }
  },
  "festiveBoardMeal": {
    "id": "string",
    "festiveBoardId": "string",
    "mealId": "string",
    "createdAt": "datetime"
  },
  "mealSelection": {
    "id": "string",
    "userId": "string",
    "festiveBoardId": "string",
    "festiveBoardMealId": "string",
    "isCompleted": false,
    "completedAt": null,
    "createdAt": "datetime",
    "updatedAt": "datetime",
    "user": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "membershipNumber": "string"
    },
    "festiveBoardMeal": {
      "id": "string",
      "festiveBoardId": "string",
      "mealId": "string",
      "createdAt": "datetime",
      "meal": {
        "id": "string",
        "title": "string",
        "description": "string",
        "imageUrl": "string",
        "categoryId": "string",
        "createdAt": "datetime",
        "updatedAt": "datetime",
        "category": {
          "id": "string",
          "name": "string",
          "description": "string"
        }
      }
    }
  },
  "message": "Meal created, added to festive board, and selected successfully"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Missing required fields: festiveBoardId, title, categoryId"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

#### 404 Not Found
```json
{
  "error": "Festive board not found"
}
```
or
```json
{
  "error": "Meal category not found"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## GET Endpoint
```
GET /api/festive-board/add-meal?festiveBoardId=<festive_board_id>
```

Retrieves all meal selections for the authenticated user in a specific festive board.

### Query Parameters
- `festiveBoardId`: The ID of the festive board (required)

### Response
```json
{
  "mealSelections": [
    {
      "id": "string",
      "userId": "string",
      "festiveBoardId": "string",
      "festiveBoardMealId": "string",
      "isCompleted": false,
      "completedAt": null,
      "createdAt": "datetime",
      "updatedAt": "datetime",
      "festiveBoardMeal": {
        "id": "string",
        "festiveBoardId": "string",
        "mealId": "string",
        "createdAt": "datetime",
        "meal": {
          "id": "string",
          "title": "string",
          "description": "string",
          "imageUrl": "string",
          "categoryId": "string",
          "createdAt": "datetime",
          "updatedAt": "datetime",
          "category": {
            "id": "string",
            "name": "string",
            "description": "string"
          }
        }
      },
      "festiveBoard": {
        "id": "string",
        "title": "string",
        "description": "string",
        "month": 12,
        "year": 2024
      }
    }
  ],
  "count": 1
}
```

## Example Usage

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/festive-board/add-meal', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    festiveBoardId: 'festive_board_id_here',
    title: 'Grilled Chicken Salad',
    description: 'Fresh mixed greens with grilled chicken breast',
    categoryId: 'category_id_here',
    imageUrl: 'https://example.com/chicken-salad.jpg'
  })
});

const result = await response.json();
console.log('Meal created and selected:', result);
```

### cURL
```bash
curl -X POST \
  https://your-domain.com/api/festive-board/add-meal \
  -H 'Authorization: Bearer your_access_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "festiveBoardId": "festive_board_id_here",
    "title": "Grilled Chicken Salad",
    "description": "Fresh mixed greens with grilled chicken breast",
    "categoryId": "category_id_here",
    "imageUrl": "https://example.com/chicken-salad.jpg"
  }'
```

## Notes
- The user ID is automatically extracted from the authentication token
- The meal is automatically selected for the user after creation
- The meal is immediately added to the specified festive board
- All operations (create meal, add to board, select for user) are performed in a single transaction
- The API validates that both the festive board and meal category exist before proceeding
