# PrimoChat Admin - Project Handover Document

## Project Overview

**Project Name:** PrimoChat Admin  
**Project Type:** Web Admin Dashboard with Mobile App Integration  
**Technology Stack:** Next.js 14, React 18, TypeScript, MongoDB, Flutter (Mobile)  
**Deployment:** Vercel (Web), Cross-platform Mobile Apps  

## Executive Summary

PrimoChat Admin is a comprehensive community management platform designed for organizations to manage members, events, communications, and resources. The system consists of a web-based admin dashboard and companion mobile applications built with Flutter, providing real-time communication and event management capabilities.

---

## Technology Stack

### Frontend (Web Admin Dashboard)
- **Framework:** Next.js 14.0.4 (React-based)
- **Language:** TypeScript 4.8.4
- **UI Library:** PrimeReact 10.4.0 with PrimeFlex 3.2.1
- **Styling:** SCSS, CSS Modules
- **State Management:** React Context API, React Query (TanStack) 4.15.0
- **Form Handling:** React Hook Form 7.39.1
- **Authentication:** JOSE JWT

### Backend & Database
- **Runtime:** Node.js 16+
- **Database:** MongoDB with Prisma ORM 5.10.0
- **Authentication:** JWT with bcryptjs 3.0.2
- **Real-time Communication:** Socket.IO 4.8.1, Pusher 5.2.0
- **File Storage:** Cloudinary integration
- **Email Service:** SendGrid 8.1.5

### Mobile Applications
- **Framework:** Flutter (Cross-platform)
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Real-time Features:** Pusher Channels Flutter SDK
- **API Integration:** RESTful APIs with Bearer token authentication

### Third-Party Services
- **Cloud Storage:** Cloudinary (Image/File management)
- **Real-time Messaging:** Pusher Channels
- **Email Service:** SendGrid
- **Push Notifications:** Firebase Admin SDK
---

## Project Structure

```
primochatadmin/
├── app/                          # Next.js App Router
│   ├── (full-page)/
│   │   ├── admin/               # Admin dashboard pages
│   │   ├── auth/                # Authentication pages
│   │   └── pages/               # Additional pages
│   ├── api/                     # API routes
│   │   ├── admin/               # Admin-specific APIs
│   │   ├── auth/                # Authentication APIs
│   │   ├── chat/                # Chat functionality
│   │   ├── documents/           # Document management
│   │   ├── lcm/                 # Local Cloud Messaging (Push notifications)
│   │   ├── notifications/       # Notification system
│   │   ├── socket/              # Socket.IO endpoints
│   │   └── users/               # User management
│   └── providers.tsx            # Context providers
├── components/                   # Reusable React components
├── configs/                      # Configuration files
├── docs/                         # Documentation
│   ├── LCM_MOBILE_INTEGRATION.md
│   └── PUSHER_FLUTTER_GUIDE.md
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries
├── layout/                       # Layout components
├── middleware.ts                 # Next.js middleware
├── prisma/                       # Database schema
├── public/                       # Static assets
├── scripts/                      # Database scripts
├── server.js                     # Custom server with Socket.IO
└── store/                        # Context stores
```

---

## Key Features

### 1. User Management
- Multi-level admin roles (Member, Admin, AdminLevelTwo, AdminLevelThree)
- User registration and approval workflow
- Profile management with image uploads
- Membership number tracking
- User status management (Pending, Active, Inactive, Suspended)

### 2. Event Management (Trestle Boards)
- Event creation and management
- RSVP functionality
- Category-based organization (Regular Meeting, District, Emergent, Practice, CGP, Social)
- Location and time management
- Attendee tracking

### 3. Festive Board Management
- Monthly meal planning
- Meal category management
- User meal selection system
- Completion tracking

### 4. Real-time Communication
- Group and individual chat rooms
- Message moderation system
- File and image sharing
- Typing indicators and read receipts
- Real-time notifications

### 5. Document Management
- File upload and organization
- Category-based document structure
- Permission-based access control
- Cloudinary integration for file storage

### 6. Notification System
- Push notifications for mobile apps
- In-app notifications
- Email notifications
- Real-time updates via WebSocket/Pusher

### 7. Calendar System
- Personal calendar integration
- Event synchronization
- Custom event creation

---

## Database Schema

### Core Models
- **User:** Member profiles with roles and permissions
- **TrestleBoard:** Event management system
- **ChatRoom/Message:** Real-time messaging
- **Document:** File management system
- **Notification:** Push and in-app notifications
- **FestiveBoard:** Meal planning system
- **SystemSettings:** Application configuration

### Key Relationships
- Users have roles determining access permissions
- TrestleBoards are created by admins and joined by members
- Chat rooms support group and individual conversations
- Documents are organized by categories with permission controls
- Notifications link to various system events

---

## API Architecture

### Authentication
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Middleware protection for admin routes

### API Endpoints Structure
```
/api/auth/*          # Authentication endpoints
/api/admin/*         # Admin-only operations
/api/users/*         # User management
/api/chat/*          # Chat functionality
/api/documents/*     # Document management
/api/lcm/*           # Push notification management
/api/notifications/* # Notification system
/api/socket/*        # Real-time communication
```

### Mobile API Integration
- RESTful API design with JSON responses
- Bearer token authentication
- Comprehensive API collection available in `PrimoChat_Mobile_API_Collection.json`

---

## Mobile App Integration

### Flutter Implementation
- **Push Notifications:** Firebase Cloud Messaging integration
- **Real-time Features:** Pusher Channels Flutter SDK
- **Authentication:** JWT token-based authentication
- **API Communication:** HTTP client with error handling

### Key Mobile Features
- User authentication and profile management
- Real-time chat functionality
- Push notification handling
- Event management and RSVP
- Document viewing and download
- Calendar integration

### Integration Documentation
- Complete Flutter integration guide in `docs/PUSHER_FLUTTER_GUIDE.md`
- LCM (Local Cloud Messaging) setup in `docs/LCM_MOBILE_INTEGRATION.md`
- API collection for testing in `PrimoChat_Mobile_API_Collection.json`

---

## Deployment & Infrastructure

### Web Application (Vercel)
- **Platform:** Vercel
- **Domain:** primoochat.vercel.app
- **Build Command:** `yarn build`
- **Install Command:** `yarn install`
- **Framework:** Next.js

### Environment Variables
```env
DATABASE_URL=mongodb+srv://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://primoochat.vercel.app/
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...
```

### Database
- **Provider:** MongoDB Atlas
- **ORM:** Prisma
- **Schema:** Defined in `prisma/schema.prisma`

---

## Development Setup

### Prerequisites
- Node.js 16+
- Yarn 1.22.17+
- MongoDB Atlas account
- Cloudinary account
- Pusher account
- SendGrid account (for email)

### Installation Steps
1. Clone the repository
2. Install dependencies: `yarn install`
3. Set up environment variables in `.env.local`
4. Generate Prisma client: `yarn prisma generate`
5. Run database migrations: `yarn prisma db push`
6. Start development server: `yarn dev`
7. Start Socket.IO server: `yarn dev:socket`

### Available Scripts
- `yarn dev` - Start Next.js development server
- `yarn dev:socket` - Start development server with Socket.IO
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn prisma:generate` - Generate Prisma client
- `yarn prettier` - Format code

---

## Security Considerations

### Authentication & Authorization
- JWT tokens with secure secret
- Role-based access control
- Protected API routes
- Secure password hashing with bcryptjs

### Data Protection
- Input validation and sanitization
- CORS configuration
- Rate limiting for API endpoints
- Secure file upload handling

### Environment Security
- Environment variables for sensitive data
- Secure database connections
- API key management

---

## Maintenance & Support

### Regular Maintenance Tasks
- Database backup and monitoring
- Dependency updates
- Security patches
- Performance optimization
- Log monitoring

### Monitoring & Logging
- Application logs via console
- Error tracking and reporting
- Database query monitoring
- Real-time connection monitoring

### Backup Strategy
- MongoDB Atlas automated backups
- Environment variable backup
- Code repository backup (Git)

---

## Mobile App Development Notes

### Flutter Dependencies
```yaml
dependencies:
  firebase_messaging: ^14.7.10
  firebase_core: ^2.24.2
  pusher_channels_flutter: ^2.2.1
  http: ^0.13.5
```

### Key Integration Points
1. **Authentication:** JWT token management
2. **Push Notifications:** Firebase FCM setup
3. **Real-time Chat:** Pusher Channels integration
4. **API Communication:** HTTP client with error handling
5. **File Management:** Document download and viewing

### Testing
- API testing collection available
- Mobile app testing on iOS/Android
- Push notification testing
- Real-time feature testing

---

## Contact Information

### Development Team
- **Project Lead:** [To be filled by client]
- **Technical Contact:** [To be filled by client]
- **Support Email:** [To be filled by client]

### Service Providers
- **Hosting:** Vercel (primoochat.vercel.app)
- **Database:** MongoDB Atlas
- **File Storage:** Cloudinary
- **Real-time:** Pusher Channels
- **Email:** SendGrid

---

## Important Files & Resources

### Documentation
- `docs/LCM_MOBILE_INTEGRATION.md` - Mobile push notification setup
- `docs/PUSHER_FLUTTER_GUIDE.md` - Real-time chat integration
- `PrimoChat_Mobile_API_Collection.json` - Complete API testing collection

### Configuration
- `package.json` - Dependencies and scripts
- `prisma/schema.prisma` - Database schema
- `middleware.ts` - Authentication and authorization
- `vercel.json` - Deployment configuration

### Key Scripts
- `scripts/` - Database maintenance and setup scripts
- `server.js` - Custom server with Socket.IO

---

## Next Steps & Recommendations

### Immediate Actions
1. Review and update environment variables
2. Test all API endpoints
3. Verify mobile app integration
4. Set up monitoring and logging
5. Create backup procedures

### Future Enhancements
1. Implement comprehensive testing suite
2. Add performance monitoring
3. Enhance security measures
4. Optimize database queries
5. Add more mobile app features

### Maintenance Schedule
- Weekly: Monitor logs and performance
- Monthly: Update dependencies and security patches
- Quarterly: Review and optimize database performance
- Annually: Security audit and code review

---

*This document serves as a comprehensive handover guide for the PrimoChat Admin project. Please review all sections carefully and contact the development team for any clarifications or additional information needed.*
