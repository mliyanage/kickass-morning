# KickAss Morning - AI-Powered Wake-up Call Service

## Overview
KickAss Morning is an AI-powered motivational wake-up service designed to help users start their day with energy and purpose. It delivers personalized, inspirational morning calls using AI-generated voices of influential figures, tailored to individual goals and struggles. The project aims to provide a unique, highly personalized experience to boost daily motivation, with a vision to revolutionize daily motivational routines and capture a significant market share in the personal development and wellness industry.

## User Preferences
Preferred communication style: Simple, everyday language.

**PRODUCTION SAFETY PROTOCOL:**
- Application is currently deployed in production on AWS EC2
- NO changes to code, database, or configuration without explicit user approval
- Always plan changes first, show user what will be done, and wait for approval
- Production stability is critical - avoid any risky modifications

**CRITICAL DEVELOPMENT LESSONS:**
- NEVER change existing working API endpoints without investigation
- UI improvements should NEVER require new API endpoints if system was working before
- ALWAYS check git history to understand what endpoints were originally working
- If new API endpoint seems needed, investigate why - likely indicates wrong approach
- When debugging API issues, verify existing endpoints first before creating new ones
- Follow this sequence: 1) Check what worked before, 2) Verify those endpoints exist, 3) Make minimal changes

## Recent Changes (August 2025)
- **✅ UNIFIED STORAGE ARCHITECTURE** - Switched all environments to use PostgreSQL database storage for consistency. Removed fragile in-memory storage that caused authentication and data persistence issues.
- **✅ FIXED: Schedule Display Issue** - Fixed getUserSchedules query to properly filter for active schedules, resolving dashboard showing empty schedule lists.
- **✅ ENHANCED: Duplicate Schedule Prevention** - Added server-side validation preventing duplicate schedules and enforcing 3-schedule limit per user.
- **✅ RESOLVED: Cache Invalidation** - Fixed dashboard not refreshing after schedule creation by properly invalidating React Query cache.
- **✅ RESOLVED: Personalization Error Handling** - Fixed 403errors when users try to create schedules without completing personalization. Now shows user-friendly "Complete your setup first" message and auto-redirects to /personalization page.
- **✅ RESOLVED: Firebase Production Deployment** - Fixed critical issue where Firebase environment variables (VITE_*) weren't embedded in production builds. Root cause: Client-side variables need build-time embedding, not runtime loading like server variables. Solution: Use `set -a; source ../.env; set +a; npm run build` for EC2 deployments.
- **✅ SECURITY: Removed Debug Logs** - Removed console.log statements that were exposing sensitive user data and Firebase configuration in browser console for production builds.

## System Architecture

### End-to-End Architecture Overview
KickAss Morning uses a **unified server architecture** where both frontend and backend run on the same Express server.

#### Request Flow & Routing
- Express Server (Port 5000) handles API routes, static assets, and serves the React App.

#### Client ↔ Backend Communication
All client requests go through a unified query client, handling automatic cookie management, unified error handling, and TanStack Query integration for efficient data fetching.

#### Security Architecture
- **Session-Based Authentication:** Sessions stored in PostgreSQL, with HTTP-only and HTTPS-only cookies for security, and SameSite protection.
- **Multi-Layer Verification:** Email OTP, Phone SMS, and Personalization for tiered access to features.
- **Authentication Middleware:** `isAuthenticated` and `isPhoneVerified` middleware, with Zod validation on all API endpoints.

#### Navigation & State Management
- Adaptive Layout System for smart authentication state detection.
- Route Protection with automatic redirects based on authentication status.
- Persistent State using SessionStorage.

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with Shadcn/UI
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Build Tool**: Vite
- **UI/UX**: Adaptive AppLayout for seamless navigation, glassmorphism styling, bottom toolbar for mobile.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **API Design**: RESTful API with session-based authentication
- **File Structure**: Modular, separating routes, utilities, and integrations.

### Database
- **Type**: PostgreSQL with Drizzle ORM
- **Schema Management**: Type-safe definitions with automatic migrations.
- **Hosting**: Neon serverless PostgreSQL adapter.

### Core Features
- **Authentication**: Passwordless (email OTP), SMS-based phone verification (Twilio), multi-step onboarding, server-side session management.
- **Personalization**: Customizable goals and struggles, AI voice selection, GPT-4o for personalized message generation.
- **Scheduling**: Flexible one-time and recurring calls, comprehensive timezone support, weekday-specific schedules, automated processing.
- **AI Integration**: OpenAI Text-to-Speech for voice, GPT-4o for message generation, file-based voice caching, ElevenLabs as fallback.
- **Call Delivery**: Twilio integration for voice calls and webhook status updates, call history, temporary audio file handling.
- **Analytics & Marketing**: Google Analytics 4 integration for tracking user visits, engagement, conversion funnel, Meta ads campaign tracking, affiliate marketing performance monitoring.
- **System Design**: DST-proof scheduling, robust duplicate call prevention, graceful shutdown, environmental configuration.

## External Dependencies
- **OpenAI API**: GPT-4o (text generation), TTS (voice synthesis)
- **Twilio**: SMS (verification), Voice (call delivery)
- **Mailjet**: Email delivery (OTP codes)
- **Google Analytics 4**: User analytics and marketing campaign tracking
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle Kit**: Database schema management
- **Radix UI**: Accessible component primitives
- **Shadcn/UI**: Pre-built UI components
- **Lucide React**: Icon library
- **TailwindCSS**: Styling framework
- **world-countries**: Country selection
- **date-fns-tz**: Timezone handling