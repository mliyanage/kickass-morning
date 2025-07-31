# KickAss Morning - AI-Powered Wake-up Call Service

## Overview

KickAss Morning is an AI-powered motivational wake-up service that delivers personalized, inspirational morning calls to help users start their day with energy and purpose. The application uses AI-generated voices of inspirational figures to create customized wake-up messages based on user goals and struggles.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with Shadcn/UI component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite with custom plugins for theme support

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with session-based authentication
- **File Structure**: Modular separation of concerns with dedicated files for routes, utilities, and integrations

### Database Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Type-safe schema definitions with automatic migrations
- **Connection**: Neon serverless PostgreSQL adapter for cloud deployments

## Key Components

### Authentication & Authorization
- **Passwordless System**: Email-based OTP (One-Time Password) authentication
- **Session Management**: Express-session with server-side session storage
- **Phone Verification**: SMS-based OTP verification using Twilio
- **Multi-step Onboarding**: Progressive user verification and setup flow

### Personalization Engine
- **Goal Types**: Exercise, Productivity, Study, Meditation, Creative work, Custom goals
- **Struggle Types**: Tiredness, Lack of motivation, Snooze habits, Late sleeping, Custom struggles
- **Voice Selection**: Multiple AI voice personalities including motivational figures
- **Custom Messages**: AI-generated personalized content based on user profile

### Scheduling System
- **Flexible Scheduling**: One-time and recurring wake-up calls
- **Timezone Support**: Comprehensive timezone handling with proper offset calculations
- **Day Selection**: Weekday-specific recurring schedules
- **Call Management**: Automated processing with status tracking

### AI Integration
- **Voice Generation**: OpenAI Text-to-Speech API for voice synthesis
- **Message Creation**: GPT-4o for generating personalized motivational content
- **Voice Caching**: File-based caching system for generated audio files
- **Fallback Support**: ElevenLabs integration as alternative voice provider

### Call Delivery System
- **Twilio Integration**: Voice call delivery with webhook status updates
- **Call Tracking**: Comprehensive call history and status monitoring
- **Audio Management**: Temporary file handling with automatic cleanup
- **Development Mode**: Mock implementations for local development

## Data Flow

### User Registration Flow
1. User enters email address
2. System generates and sends OTP via email
3. User verifies OTP to create account
4. Optional phone verification for call functionality
5. Personalization setup (goals, struggles, voice selection)
6. Schedule creation and activation

### Call Scheduling Flow
1. User creates schedule with time, days, and preferences
2. Background scheduler checks for pending calls every minute
3. System retrieves user personalization data
4. AI generates custom motivational message
5. Audio file created and cached
6. Twilio API call initiated with audio URL
7. Call status tracked via webhooks
8. Call history updated and stored

### Personalization Flow
1. User selects primary goals and struggles
2. Voice personality selection with preview capability
3. System stores preferences for message generation
4. AI uses profile data to create targeted content
5. Continuous refinement based on user feedback

## External Dependencies

### Core Services
- **OpenAI API**: GPT-4o for text generation, TTS for voice synthesis
- **Twilio**: SMS for verification, Voice for call delivery
- **Mailjet**: Email delivery for OTP codes
- **Neon Database**: Serverless PostgreSQL hosting

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **ESBuild**: Production bundling for server code
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Frontend development server and building

### UI Components
- **Radix UI**: Accessible component primitives
- **Shadcn/UI**: Pre-built component library
- **Lucide React**: Icon library
- **TailwindCSS**: Utility-first styling framework

## Deployment Strategy

### Development Environment
- Local development with file-based audio caching
- Mock implementations for external services
- SQLite fallback for database development
- Hot reload with Vite dev server

### Production Environment
- Containerized deployment with Node.js runtime
- PostgreSQL database with connection pooling
- External file storage for audio cache
- Environment-based configuration management

### Environment Detection
- Automatic environment detection based on URL patterns
- Separate configurations for development, test, and production
- Feature flags for service availability
- Graceful degradation for missing services

## Changelog

```
Changelog:
- July 31, 2025. Fixed critical race condition causing duplicate calls every 5 minutes:
  * Root cause: SQL condition allowed pending calls to be retried, causing 10:10, 10:15, 10:20 PM duplicates
  * Changed retry condition from "!= completed" to "= failed" to exclude pending calls
  * Pending calls now properly blocked to prevent race conditions during Twilio webhook delays
  * Failed calls still get exactly 2 retry attempts within 10 minutes, then stop permanently
  * Completed calls blocked from running again on the same day (timezone-aware)
  * Final logic: (never called) OR (completed AND different day) OR (failed within 10 minutes)
  * Eliminates all duplicate call scenarios while maintaining proper retry functionality
- July 30, 2025. Critical duplicate call prevention bug fix completed:
  * Fixed SQL logic in getPendingSchedules that was preventing completed calls from running again on different days
  * Root cause: Overly restrictive condition "(lastCallStatus != 'completed')" blocked all completed schedules permanently
  * Updated logic to allow different-day calls while preventing same-day duplicates using timezone-aware date comparison
  * Schedule 18 (7:00 AM Sydney) now correctly eligible to run again after July 30th completion
  * Fixed condition: "DATE(lastCalled in timezone) < DATE(NOW in timezone)" allows next-day recurring calls
  * Maintains 10-minute retry delay for failed calls while enabling daily recurring functionality
- July 29, 2025. DST-proof scheduling system completed and fully operational:
  * Implemented complete DST-aware architecture using date-fns-tz library for timezone handling
  * Removed all UTC storage fields (wakeupTimeUTC, weekdaysUTC) from database schema
  * Schedules now store only local time and timezone, with runtime conversion for accuracy
  * Updated createSchedule to store local data without UTC conversion during creation
  * Enhanced getPendingSchedules with runtime timezone filtering using shouldScheduleRunNow helper
  * Fixed NULL handling in duplicate prevention SQL queries (lastCallStatus IS NULL OR != 'completed')
  * Eliminated 10-minute duplicate intervals and fixed string comparison bugs
  * System now maintains user's local time expectations during DST transitions
  * Timezone conversions happen at execution time, ensuring accuracy across seasonal changes
  * Successfully tested: 22:25 Sydney time → 12:25 UTC conversion and call delivery
  * End-to-end flow verified: schedule detection → AI voice generation → Twilio call → status tracking
  * Backward compatibility removed - clean, simple DST-proof architecture
- July 29, 2025. Enhanced duplicate call prevention completed:
  * Completely rewrote getPendingSchedules query logic to eliminate all duplicate call scenarios
  * Removed confusing 5-minute window logic that was causing recurring duplicates 
  * Simplified retry logic - only retry failed calls, not completed ones
  * Added same-day duplicate prevention - completed calls cannot trigger again until next day
  * Fixed SQL string comparison bug using PostgreSQL ::time casting for accurate time comparisons
  * Schedule 14 (21:00 UTC) no longer incorrectly triggers during 07:00-07:10 UTC window
  * Eliminates 10-minute interval duplicates (e.g., 10:00 AM, 10:10 AM, 11:00 AM, 11:10 AM pattern)
  * Time window logic now works correctly for both normal cases and midnight boundary crossings
- July 28, 2025. Critical phantom call bug fix completed:
  * Fixed issue where calls were initiated even when no schedules were found in database
  * Root cause: Dual scheduling system with legacy node-schedule jobs running alongside main scheduler  
  * Removed legacy individual job creation system completely
  * Simplified architecture to use only the centralized database-driven scheduler
  * Eliminates all possibility of phantom calls from deleted or inactive schedules
  * Clean single-system architecture prevents future scheduling conflicts
- July 27, 2025. Session store memory leak fix completed:
  * Fixed MemoryStore warning in test environment deployments  
  * Updated session configuration to use PostgreSQL sessions for both test and production environments
  * Previously only production used PostgreSQL sessions, causing memory leak warnings in test deployments
  * Now development uses Memory sessions, while test and production use PostgreSQL sessions
  * Eliminates "MemoryStore is not designed for production environment" warnings
- July 27, 2025. Multi-environment deployment setup completed:
  * Added environment-aware database connection supporting TEST_DATABASE_URL for test deployments
  * Enhanced environment detection to support test, production, and development configurations
  * Created comprehensive deployment documentation with step-by-step setup instructions
  * Configured automatic database selection based on DEPLOYMENT_ENV and NODE_ENV variables
  * Added environment-specific connection pooling and error handling for better production stability
- July 27, 2025. Memory leak prevention completed:
  * Added graceful scheduler shutdown to prevent hanging node-schedule jobs in production
  * Fixed toast timeout cleanup to prevent frontend timer accumulation  
  * Optimized mock audio file creation to use consistent filenames instead of timestamp-based names
  * Enhanced SIGTERM/SIGINT handlers to properly clean up all scheduled tasks
  * Eliminated all potential development-mode configurations that could cause production memory issues
- July 26, 2025. Critical scheduler bug fix completed:
  * Fixed schedule detection issue where forward-scheduled calls were being missed
  * Corrected scheduler logic from inconsistent forward/backward mix to consistent backward-looking window (past 10 minutes)
  * Fixed recurring schedule logic to allow completed schedules to be called again (removed restrictive date limitation)
  * Schedule 15 (23:15 UTC) will now be properly detected during 23:15 UTC scheduler runs (includes exact time)
  * Fixed midnight boundary crossing issue that prevented Schedule 14 (00:05 UTC) from being detected
  * Eliminated race conditions in schedule timing that caused missed wake-up calls
  * Aligned retry logic for failed calls with backward-looking time window for logical consistency
- July 26, 2025. Production monitoring and stability improvements completed:
  * Fixed production session store warning by implementing PostgreSQL-based session storage using connect-pg-simple
  * Added comprehensive process signal handling for SIGTERM/SIGINT signals to track deployment terminations
  * Implemented automatic memory monitoring with 5-minute interval logging for resource tracking
  * Enhanced /api/health endpoint with detailed system metrics (uptime, memory usage, environment)
  * Added uncaught exception and unhandled rejection logging for better error diagnostics
  * Improved session security with httpOnly cookies and proper environment detection
  * Created deployment monitoring documentation to help diagnose future SIGTERM issues
- July 26, 2025. Navigation system optimization completed:
  * Successfully completed major architectural refactor from multiple layouts (PublicLayout, DashboardLayout) to single adaptive AppLayout
  * Eliminated all layout jumping issues between authenticated and unauthenticated states
  * Implemented smart authentication detection using session storage and referrer tracking
  * Optimized authentication checks to prevent unnecessary API calls during navigation
  * Fixed menu disappearing issues when navigating between dashboard and help pages
  * All navigation flows now work smoothly: public pages, authenticated pages, and cross-navigation
- July 26, 2025. Critical timezone bug fix completed:
  * Fixed convertWeekdaysToUTC function where Saturday 10:05 AM Sydney time incorrectly saved as 'sun' instead of 'sat' in weekdays_utc field
  * Corrected timezone conversion logic to use proper target date components instead of today's date
  * Scheduler now accurately matches UTC weekdays for international users
  * Verified fix works correctly for Australia/Sydney timezone schedules
- July 25, 2025. Email service migration completed:
  * Migrated from SendGrid to Mailjet API for OTP email delivery
  * Updated email-utils.ts to use node-mailjet package instead of @sendgrid/mail
  * Changed environment variables from SENDGRID_API_KEY to MAILJET_API_KEY and MAILJET_SECRET_KEY
  * Maintained same external interface for sendEmail() and sendOtpEmail() functions
- July 11, 2025. Mobile navigation overhaul completed:
  * Redesigned mobile interface with bottom toolbar navigation
  * Removed Account and Help from sidebar, moved Account to top menu
  * Created icon-only bottom toolbar for mobile with Dashboard, Preferences, Schedule, History
  * Fixed content scrolling with proper bottom padding to prevent toolbar overlap
  * Applied glassmorphism styling with gradient backgrounds and consistent card design
  * Enhanced text visibility on home page with white text and drop shadows
- July 06, 2025. Authentication system fully operational:
  * Fixed session persistence issues causing login redirect failures
  * Implemented reliable authentication flow with full page reload after login
  * Eliminated race conditions in frontend state management
  * Confirmed dashboard loading with all user data (schedules, call history, personalization)
  * Authentication works consistently across multiple users and sessions
- July 03, 2025. Critical bug fixes completed:
  * Fixed webhook call status tracking - schedules now properly update from pending to completed
  * Resolved timezone conversion for international users - UTC weekday matching working correctly
  * Confirmed live call delivery system operational with Twilio integration
  * CallSid parameter handling fixed throughout system
- July 01, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```