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