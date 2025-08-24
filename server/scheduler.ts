import schedule from "node-schedule";
import { fromZonedTime } from "date-fns-tz";
import { storage } from "./storage";
import { CallStatus } from "@shared/schema";
import { makeCall } from "./twilio";
import { generateVoiceMessage } from "./openai";
import { generateAudioFile, cleanupOldAudioFiles } from "./audio-utils";
import path from "path";
import fs from "fs";

let isSchedulerRunning = false;
let callSchedulerJob: schedule.Job | null = null;
let cleanupSchedulerJob: schedule.Job | null = null;

/**
 * Start the call scheduler
 * This will check for pending schedules every minute and make calls as needed
 */
export function startCallScheduler() {
  if (isSchedulerRunning) {
    console.log("Call scheduler is already running");
    return;
  }

  console.log("Starting call scheduler...");
  isSchedulerRunning = true;

  // Run every 5 minutes
  callSchedulerJob = schedule.scheduleJob("*/5 * * * *", async () => {
    try {
      await processScheduledCalls();
    } catch (error) {
      console.error("Error in call scheduler:", error);
    }
  });

  // Also run immediately on startup
  processScheduledCalls().catch((error) => {
    console.error("Error in initial call scheduler run:", error);
  });

  console.log("Call scheduler started successfully");
  return callSchedulerJob;
}

/**
 * Process all scheduled calls that are due
 */
async function processScheduledCalls() {
  console.log("Processing scheduled calls at", new Date().toISOString());

  try {
    // Get all pending schedules
    const pendingSchedules = await storage.getPendingSchedules();
    console.log(`Found ${pendingSchedules.length} pending schedules`);

    // Process each schedule
    for (const schedule of pendingSchedules) {
      try {
        console.log(
          `Processing schedule ${schedule.id} for user ${schedule.userId}`,
        );

        // Get the user
        const user = await storage.getUser(schedule.userId);
        if (!user) {
          console.error(
            `User ${schedule.userId} not found for schedule ${schedule.id}`,
          );
          continue;
        }

        // Check if user has a verified phone
        if (!user.phone || !user.phoneVerified) {
          console.error(`User ${user.id} doesn't have a verified phone number`);
          continue;
        }

        // Get personalization data
        const personalization = await storage.getPersonalization(user.id);
        if (!personalization) {
          console.error(`User ${user.id} doesn't have personalization data`);
          continue;
        }

        // Extract goals and struggles from personalization
        const goalTypes = personalization.goals || [];
        const struggleTypes = personalization.struggles || [];

        const userGoals = goalTypes;
        const userStruggles = struggleTypes;

        // Get custom goal and struggle texts
        const otherGoalText = personalization.otherGoal || "";
        const otherStruggleText = personalization.otherStruggle || "";
        const goalDescription = personalization.goalDescription || "";

        // Check if user has sufficient credits before making the call
        const trialStatus = await storage.getUserTrialStatus(user.id);
        const hasCredits = trialStatus.callCredits > 0;
        
        // Check if this is user's first actual call (based on call history, not schedule creation)
        const userCallHistory = await storage.getUserCallHistory(user.id);
        const isFirstCall = userCallHistory.length === 0;

        // Allow call if this is first call ever OR user has credits
        if (isFirstCall) {
          console.log(`User ${user.id} making their first call - free trial applies`);
        } else if (!hasCredits) {
          console.log(`User ${user.id} has no credits (${trialStatus.callCredits}) and has made ${userCallHistory.length} calls before - skipping call for schedule ${schedule.id}`);
          continue;
        } else {
          console.log(`User ${user.id} has ${trialStatus.callCredits} credits and has made ${userCallHistory.length} calls before - proceeding with call`);
        }

        // Use voice from personalization data with a fallback
        const voiceId = personalization.voice || "jocko"; // Default to "jocko" if no voice is set
        console.log(`Using voice from personalization: ${voiceId}`); // Log the voice being used

        // Generate voice message
        console.log(
          `Generating voice message for user ${user.id} with voice ${voiceId}, goals: ${userGoals.join(",")}, struggles: ${userStruggles.join(",")}`,
        );
        const messageText = await generateVoiceMessage(
          userGoals as any[],
          userStruggles as any[],
          user.name,
          otherGoalText, // Custom goal text for OTHER goals
          otherStruggleText, // Custom struggle text for OTHER struggles
          goalDescription, // General goal description for all goals
        );

        // Generate an audio file from the message text
        console.log(
          `Generating audio for message: ${messageText.substring(0, 100)}...`,
        );

        // Make the call using personalization voice
        const call = await makeCall(user.phone, messageText, voiceId);

        // Update the last called time and status for this schedule immediately after call
        const currentTime = new Date();
        console.log(
          `Updating schedule ${schedule.id} last called time:`,
          currentTime,
          `with status: ${call.status}`,
        );

        try {
          await storage.updateLastCalledTime(
            schedule.id, // Schedule ID
            call.callSid, // Twilio Call SID from the makeCall result
            currentTime, // Current time
            call.status, // Use the actual call status from makeCall result
          );
        } catch (error) {
          console.error(
            `Failed to update last called time for schedule ${schedule.id}:`,
            error,
          );
        }

        // Create a history record after updating the schedule
        
        // Store the call time as a simple timestamp representing the scheduled time
        const [hours, minutes] = schedule.wakeupTime.split(':').map(Number);
        
        // Create a timestamp that represents the scheduled time in a timezone-neutral way
        // We'll store just the date and time components, relying on the timezone field for context
        const { toZonedTime } = await import('date-fns-tz');
        const now = new Date();
        const nowInUserTz = toZonedTime(now, schedule.timezone);
        
        // Create the scheduled time using today's date in the user's timezone
        const scheduledCallTime = new Date(nowInUserTz.getFullYear(), nowInUserTz.getMonth(), nowInUserTz.getDate(), hours, minutes, 0, 0);
        
        const callHistory = await storage.createCallHistory({
          userId: user.id,
          scheduleId: schedule.id,
          callTime: scheduledCallTime, // Store the scheduled time
          timezone: schedule.timezone, // Store the schedule's timezone
          voice: voiceId, // Use the voice from personalization
          status: call.status as CallStatus,
          duration: call.duration,
          recordingUrl: call.recordingUrl,
          callSid: call.callSid, // Add the Twilio Call SID
        });

        // TEST: Are we reaching this point?
        console.log(`🔍 REACHED CREDIT DEDUCTION SECTION - About to check credits for user ${user.id}`);

        // Deduct credit after successful call (only for users who have made calls before)
        console.log(`Credit deduction check: isFirstCall=${isFirstCall}, call.status=${call.status}, callHistory.length=${userCallHistory.length}`);
        if (!isFirstCall && call.status && !['failed', 'busy', 'no-answer'].includes(call.status)) {
          console.log(`Attempting to deduct credit for user ${user.id} - call status: ${call.status}`);
          try {
            const deductResult = await storage.deductUserCredit(user.id);
            if (deductResult.success) {
              console.log(`Successfully deducted 1 credit from user ${user.id}. New balance: ${deductResult.newBalance}`);
            } else {
              console.error(`Failed to deduct credit from user ${user.id}. Current balance: ${deductResult.newBalance}`);
            }
          } catch (error) {
            console.error(`Error deducting credit from user ${user.id}:`, error);
          }
        } else {
          console.log(`Skipping credit deduction: isFirstCall=${isFirstCall}, status=${call.status}, failedStatus=${['failed', 'busy', 'no-answer'].includes(call.status)}`);
        }

        // Log call result with appropriate message based on status
        if (call.status === CallStatus.FAILED) {
          console.log(
            `Call attempt to ${user.phone} failed with status: ${call.status}`,
          );
        } else {
          console.log(
            `Call successfully sent to ${user.phone}, status: ${call.status}`,
          );
        }
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in processScheduledCalls:", error);
  }
}

/**
 * Clean up temporary audio files
 * This should be run periodically to prevent disk space issues
 */
export async function cleanupTempAudioFiles() {
  // Use the utility function from audio-utils.ts
  await cleanupOldAudioFiles(24);
}

// Schedule cleanup to run once a day
export function startCleanupScheduler() {
  // Run at midnight every day
  cleanupSchedulerJob = schedule.scheduleJob("0 0 * * *", async () => {
    try {
      await cleanupTempAudioFiles();
    } catch (error) {
      console.error("Error in cleanup scheduler:", error);
    }
  });

  console.log("Cleanup scheduler started successfully");
  return cleanupSchedulerJob;
}



/**
 * Gracefully stop all schedulers and clean up resources
 * This should be called during application shutdown
 */
export function stopAllSchedulers() {
  console.log("Stopping all schedulers...");
  
  if (callSchedulerJob) {
    callSchedulerJob.cancel();
    callSchedulerJob = null;
    console.log("Call scheduler stopped");
  }
  
  if (cleanupSchedulerJob) {
    cleanupSchedulerJob.cancel();
    cleanupSchedulerJob = null;
    console.log("Cleanup scheduler stopped");
  }
  

  
  isSchedulerRunning = false;
  console.log("All schedulers stopped successfully");
}
