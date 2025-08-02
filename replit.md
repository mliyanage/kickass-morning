# KickAss Morning - AI-Powered Wake-up Call Service

## Overview
KickAss Morning is an AI-powered motivational wake-up service designed to help users start their day with energy and purpose. It delivers personalized, inspirational morning calls using AI-generated voices of influential figures, tailored to individual goals and struggles. The project aims to provide a unique, highly personalized experience to boost daily motivation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
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

**August 2, 2025**: Implemented Google Analytics 4 for marketing campaign tracking:
- Added comprehensive conversion tracking: signup → phone verification → first schedule → first call
- Implemented Meta ads campaign detection via UTM parameters and Facebook Click ID (fbclid)
- Added engagement tracking for app visits, personalization completion, and schedule creation
- Created analytics utilities with proper TypeScript types and error handling
- Integrated automatic page view tracking for single-page application navigation
- Supports affiliate marketing performance monitoring through UTM source tracking
- Production-ready setup with environment variable validation and graceful fallbacks