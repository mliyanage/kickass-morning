# Wake-up Call Scheduler Implementation

This document describes how the wake-up call scheduler system is implemented in the KickAss Morning application.

## Overview

The wake-up call scheduler is responsible for:
1. Checking for scheduled wake-up calls that are due
2. Generating personalized voice messages
3. Making calls via Twilio
4. Tracking call status
5. Managing audio file cleanup

## Components

### Database Schema Changes

- Added `lastCalled` timestamp field to the `schedules` table to track when calls were last made
- Added database queries to find pending schedules based on day of week and time

### Core Files

1. **server/scheduler.ts**
   - Contains the main scheduler implementation
   - `startCallScheduler()` - Starts the scheduler to run every minute
   - `processScheduledCalls()` - Processes all pending schedules
   - `cleanupTempAudioFiles()` - Cleans up old audio files
   - `startCleanupScheduler()` - Starts the cleanup scheduler to run daily

2. **server/audio-utils.ts**
   - Utility functions for audio file generation and management
   - `generateAudioFile()` - Generates audio files from text using OpenAI
   - `cleanupOldAudioFiles()` - Removes old audio files from the cache

3. **server/routes.ts**
   - Added Twilio webhook endpoint for call status updates
   - `/api/webhooks/twilio/status` - Handles incoming Twilio status webhooks

4. **server/database-storage.ts**
   - Enhanced with methods for the scheduler
   - `getPendingSchedules()` - Gets schedules that should be called now
   - `updateLastCalledTime()` - Updates when a schedule was last called
   - `updateCallStatus()` - Updates call status based on Twilio webhook

## Scheduler Logic

1. The scheduler runs every minute and fetches all pending schedules
2. For each pending schedule:
   - Retrieves user and personalization data
   - Generates a personalized voice message with OpenAI
   - Converts the message to audio
   - Creates a call history record
   - Makes the call via Twilio
   - Updates the schedule's last called time

## Call Status Tracking

1. Calls are initially created with status "PENDING"
2. Twilio webhooks update the status to:
   - "ANSWERED" when completed
   - "MISSED" when no answer or busy
   - "FAILED" when call failed or was canceled

## Audio File Management

1. Audio files are generated using OpenAI's text-to-speech API
2. Files are cached in the `audio-cache` directory
3. Cached files are reused when the same text and voice are requested
4. Files older than 24 hours are automatically cleaned up daily

## Integration

The schedulers are started when the server starts:
```typescript
// Start the schedulers when the server starts
startCallScheduler();
startCleanupScheduler();
```

## Future Enhancements

1. Add support for retrying failed calls
2. Implement timezone-aware scheduling (currently using server time)
3. Add advanced TwiML for interactive voice response
4. Implement call analytics and reporting
5. Add user-configurable call settings (retries, backup SMS, etc.)