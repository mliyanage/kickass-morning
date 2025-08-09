# KickAss Morning - AI-Powered Wake-up Call Service

## Overview
KickAss Morning is an AI-powered motivational wake-up service designed to help users start their day with energy and purpose. It delivers personalized, inspirational morning calls using AI-generated voices of influential figures, tailored to individual goals and struggles. The project aims to provide a unique, highly personalized experience to boost daily motivation.

## User Preferences
Preferred communication style: Simple, everyday language.

**PRODUCTION SAFETY PROTOCOL:**
- Application is currently deployed in production on AWS EC2
- NO changes to code, database, or configuration without explicit user approval
- Always plan changes first, show user what will be done, and wait for approval
- Production stability is critical - avoid any risky modifications

## System Architecture

### End-to-End Architecture Overview
KickAss Morning uses a **unified server architecture** where both frontend and backend run on the same Express server, making deployment simple and secure.

#### Request Flow & Routing
```
├── Express Server (Port 5000)
    ├── API Routes (/api/*)     → Backend logic
    ├── Static Assets (/audio-cache) → Audio files
    └── Everything Else (*)    → React App (Vite)
```

**Key Files:**
- `server/index.ts` - Main server entry point
- `server/vite.ts` - Integrates Vite dev server as middleware
- `vite.config.ts` - Configures build process and aliases

#### Client ↔ Backend Communication
All client requests go through unified query client (`client/src/lib/queryClient.ts`):
- **Automatic Cookie Management**: `credentials: "include"` sends session cookies
- **Error Handling**: Unified error responses with status-specific messages
- **TanStack Query Integration**: Efficient data fetching with automatic cache invalidation

#### Security Architecture
**Session-Based Authentication:**
- Sessions stored in PostgreSQL database (not localStorage/memory)
- HTTP-only cookies prevent XSS attacks
- HTTPS-only cookies in production
- SameSite protection against CSRF

**Multi-Layer Verification:**
1. **Email OTP** → Basic account access
2. **Phone SMS** → Core app features (scheduling calls)
3. **Personalization** → Full feature access

**Authentication Middleware:**
- `isAuthenticated` - Verifies session exists
- `isPhoneVerified` - Ensures phone verification completed
- Zod validation on all API endpoints

#### Navigation & State Management
- **Adaptive Layout System**: Smart authentication state detection
- **Route Protection**: Automatic redirects based on auth status
- **Persistent State**: SessionStorage for reliable user experience

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with Shadcn/UI
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Build Tool**: Vite
- **UI/UX**: Adaptive AppLayout for seamless navigation across authenticated/unauthenticated states, glassmorphism styling, bottom toolbar for mobile navigation.

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
- **Personalization**: Customizable goals (e.g., Exercise, Productivity) and struggles (e.g., Tiredness, Lack of motivation), AI voice selection from motivational figures, GPT-4o for personalized message generation.
- **Scheduling**: Flexible one-time and recurring calls, comprehensive timezone support, weekday-specific schedules, automated processing with status tracking.
- **AI Integration**: OpenAI Text-to-Speech for voice, GPT-4o for message generation, file-based voice caching, ElevenLabs as fallback.
- **Call Delivery**: Twilio integration for voice calls and webhook status updates, comprehensive call history, temporary audio file handling.
- **Analytics & Marketing**: Google Analytics 4 integration for tracking user visits, engagement metrics, conversion funnel (signup → phone verification → schedule creation), Meta ads campaign tracking via UTM parameters, affiliate marketing performance monitoring.
- **System Design**: DST-proof scheduling, robust duplicate call prevention, graceful shutdown mechanisms, and environmental configuration for development/production.

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

## Recent Changes

**August 9, 2025**: Fixed critical timezone handling bug in call history display:
- **Database Enhancement**: Added timezone column to call_history table to store schedule timezone context
- **Accurate Time Recording**: Call times now recorded using scheduled time in user's timezone, not server execution time
- **Proper Timezone Display**: Call history shows correct scheduled times with timezone context (e.g., "11:15 PM (Los Angeles)")
- **Type System Updates**: Added timezone field to CallHistory and CallRecord TypeScript interfaces
- **Production Database Migration**: Used direct SQL to safely add timezone column without data loss
- **Date-fns-tz Integration**: Implemented proper timezone conversion using fromZonedTime and toZonedTime functions
- **Bug Resolution**: Fixed issue where 22:50 Los Angeles time was incorrectly displaying as next day's morning time

**August 8, 2025**: Cleaned up dashboard UX for more professional appearance:
- **Removed Icons**: Removed excessive emoji icons from section titles and preference tiles
- **Cleaner Logo**: Removed energy/blast lines from logo SVG for professional look
- **Simplified Headers**: Cleaned up login/signup page headers by removing blast emojis
- **Better Typography**: Maintained single professional icons per section while removing visual clutter
- **Professional Design**: Dashboard now has cleaner, business-ready appearance without losing functionality

**August 8, 2025**: Replaced hardcoded timezone and country lists with professional libraries:
- **Country Selection**: Replaced hardcoded list with `world-countries` package providing 240+ countries with flag icons
- **Timezone Selection**: Replaced hardcoded timezones with comprehensive system using `date-fns-tz` and browser APIs
- **Auto-detection**: Added automatic user timezone detection as default selection
- **Grouped Interface**: Organized timezones by regions (America, Europe, Asia, etc.) for better UX
- **Real-time Offsets**: Shows current UTC offsets including DST adjustments
- **Backward Compatibility**: Maintains full compatibility with existing schedules and server-side timezone processing
- **Comprehensive Coverage**: Now supports 400+ IANA timezones vs previous ~25 hardcoded options

**August 8, 2025**: Enhanced mobile toast UX for better user experience:
- Fixed toast positioning to appear at bottom on mobile devices (instead of top)
- Made close button always visible with proper 44px touch target size
- Reduced auto-dismiss time from 5 seconds to 3 seconds for faster flow
- Added swipe-to-dismiss functionality for natural mobile interaction
- Implemented mobile-first CSS overrides to ensure consistent positioning
- Improved mobile styling with appropriate padding and button sizing

**August 5, 2025**: Updated EC2 deployment guide for Amazon Linux production deployment:
- Revised complete EC2 deployment guide for Amazon Linux 2023 (not Ubuntu)
- Fixed PostgreSQL RDS SSL certificate authentication issues with NODE_TLS_REJECT_UNAUTHORIZED workaround
- Updated npm PATH configuration for dedicated kickass user on Amazon Linux
- Added proper database migration commands with SSL certificate handling
- Included comprehensive troubleshooting section for Amazon Linux specific issues
- Verified build structure: dist/public/ (frontend) and dist/index.js (server bundle)

**August 3, 2025**: Production deployment setup for AWS Elastic Beanstalk:
- Created comprehensive AWS deployment configuration with separate RDS database
- Implemented parameterized email system (personal Gangoda email for welcome, generic for OTP)
- Added complete welcome email system triggered on first schedule creation
- Created production-ready build scripts and EB configuration files
- Documented step-by-step deployment process with security considerations
- Cost-optimized architecture: ~$30-40/month with t3.small EB + db.t3.micro RDS
- Established monitoring, scaling, and backup strategies for production environment

**August 2, 2025**: Implemented Google Analytics 4 for marketing campaign tracking:
- Added comprehensive conversion tracking: signup → phone verification → first schedule → first call
- Implemented Meta ads campaign detection via UTM parameters and Facebook Click ID (fbclid)
- Added engagement tracking for app visits, personalization completion, and schedule creation
- Created analytics utilities with proper TypeScript types and error handling
- Integrated automatic page view tracking for single-page application navigation
- Supports affiliate marketing performance monitoring through UTM source tracking
- Production-ready setup with environment variable validation and graceful fallbacks

## Production Deployment Options

### Option A: AWS Elastic Beanstalk (Managed)
**Platform**: AWS Elastic Beanstalk with separate RDS PostgreSQL database
**Cost**: ~$30-40/month | **Maintenance**: Low | **Scaling**: Automatic
**Features**: Managed platform, auto-scaling, load balancing, health checks

### Option B: AWS EC2 (Manual Setup)
**Platform**: EC2 Ubuntu + Nginx + PM2 with separate RDS PostgreSQL database
**Cost**: ~$20-25/month | **Maintenance**: Moderate | **Scaling**: Manual
**Features**: Full control, custom configuration, cost-effective

**Common Architecture:**
- Unified server approach (Express serves both API and React frontend)
- Build process: Vite builds client, esbuild bundles server for Node.js production
- Separate RDS instance (not managed) for better control and persistence
- Security: VPC security groups, database encryption, HTTPS with SSL certificates
- Monitoring: CloudWatch logs and custom health monitoring