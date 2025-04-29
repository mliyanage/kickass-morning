import schedule from "node-schedule";
import { storage } from "./storage";
import { CallStatus } from "@shared/schema";
import { makeCall } from "./twilio";
import { generateVoiceMessage } from "./openai";
import { generateAudioFile, cleanupOldAudioFiles } from "./audio-utils";
import path from "path";
import fs from "fs";

let isSchedulerRunning = false;

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

  // Run every minute
  const job = schedule.scheduleJob("*/1 * * * *", async () => {
    try {
      await processScheduledCalls();
    } catch (error) {
      console.error("Error in call scheduler:", error);
    }
  });

  // Also run immediately on startup
  processScheduledCalls().catch(error => {
    console.error("Error in initial call scheduler run:", error);
  });

  console.log("Call scheduler started successfully");
  return job;
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
        console.log(`Processing schedule ${schedule.id} for user ${schedule.userId}`);
        
        // Get the user
        const user = await storage.getUser(schedule.userId);
        if (!user) {
          console.error(`User ${schedule.userId} not found for schedule ${schedule.id}`);
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

        // Extract goals from schedule
        const goalTypes = typeof schedule.goalType === 'string' 
          ? schedule.goalType.split(',') 
          : [schedule.goalType];
        const mainGoal = goalTypes[0]; 
        
        // Extract struggles from schedule
        const struggleTypes = typeof schedule.struggleType === 'string'
          ? schedule.struggleType.split(',')
          : [schedule.struggleType];
        const mainStruggle = struggleTypes[0];

        // Get any custom goal description if available
        let goalDescription = "";
        if (personalization.goalDescription) {
          goalDescription = personalization.goalDescription;
        }

        // Generate voice message
        console.log(`Generating voice message for user ${user.id} with voice ${schedule.voiceId}, goal: ${mainGoal}, struggle: ${mainStruggle}`);
        
        // Convert single strings to arrays for the API
        const goalsArray = [mainGoal as any]; // Type assertion
        const strugglesArray = [mainStruggle as any]; // Type assertion
        
        const messageText = await generateVoiceMessage(
          goalsArray,
          strugglesArray,
          user.name, // Can be null
          goalDescription // Pass as otherGoal
        );

        // Generate an audio file from the message text
        console.log(`Generating audio for message: ${messageText.substring(0, 100)}...`);
        
        let audioUrl: string | null = null;
        try {
          // Use our new utility to generate and save the audio file
          const audioResult = await generateAudioFile(messageText, schedule.voiceId);
          audioUrl = audioResult.url;
          console.log(`Generated audio file at ${audioResult.filePath}, available at ${audioUrl}`);
        } catch (error) {
          console.error('Failed to generate audio for call:', error);
          // Continue with text only if audio generation fails
        }
        
        // Make the call
        console.log(`Making call to ${user.phone} with ${audioUrl ? 'audio' : 'text'} message`);
        
        // Create a history record before making the call
        const callHistory = await storage.createCallHistory({
          userId: user.id,
          scheduleId: schedule.id,
          callTime: new Date(),
          voice: schedule.voiceId,
          status: CallStatus.PENDING
        });
        
        // Make the call with Twilio
        // Use the generated message text if we have audio, otherwise use a fallback message
        let messageToUse = messageText;
        
        // If we couldn't generate the audio, use a simpler message
        if (!audioUrl) {
          messageToUse = `Good morning! This is your scheduled wake-up call for ${schedule.wakeupTime}. Time to start your day and focus on your ${mainGoal} goals.`;
        }
        
        // Make the call
        const callResult = await makeCall(user.phone, messageToUse, schedule.voiceId);

        // Update the last called time for this schedule
        await storage.updateLastCalledTime(schedule.id);

        // Log success
        console.log(`Call successfully sent to ${user.phone}, status: ${callResult.status}`);

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
  const job = schedule.scheduleJob("0 0 * * *", async () => {
    try {
      await cleanupTempAudioFiles();
    } catch (error) {
      console.error("Error in cleanup scheduler:", error);
    }
  });
  
  console.log("Cleanup scheduler started successfully");
  return job;
}