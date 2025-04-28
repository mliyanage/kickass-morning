import schedule from "node-schedule";
import { storage } from "./storage";
import { CallStatus } from "@shared/schema";
import { makeCall } from "./twilio";
import { generateVoiceMessage } from "./openai";
import { generateSpeechAudio } from "./openai";
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
        
        const messageText = await generateVoiceMessage(
          user.name || "there",  // Fallback to "there" if name not available
          mainGoal as any,       // Type assertion since we know this is a valid goal type
          mainStruggle as any,   // Type assertion since we know this is a valid struggle type
          goalDescription
        );

        // Generate audio
        const audioFilePath = await generateSpeechAudio(
          messageText,
          schedule.voiceId
        );

        if (!audioFilePath) {
          console.error(`Failed to generate audio for call to ${user.phone}`);
          continue;
        }

        console.log(`Generated audio file at ${audioFilePath}`);

        // Make the call
        console.log(`Making call to ${user.phone}`);
        const callResult = await makeCall({
          to: user.phone,
          userId: user.id,
          scheduleId: schedule.id,
          audioFilePath,
          voice: schedule.voiceId
        });

        // Update the last called time for this schedule
        await storage.updateLastCalledTime(schedule.id);

        // Log success
        console.log(`Call successfully sent to ${user.phone}, Twilio SID: ${callResult.sid}`);

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
  const audioDirectory = path.join(process.cwd(), "audio-cache");
  
  // Ensure directory exists
  if (!fs.existsSync(audioDirectory)) {
    console.log("Audio directory doesn't exist, nothing to clean up");
    return;
  }
  
  try {
    // Get all files in the directory
    const files = fs.readdirSync(audioDirectory);
    
    // Get current time
    const now = new Date().getTime();
    
    // Delete files older than 24 hours
    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(audioDirectory, file);
      const stats = fs.statSync(filePath);
      
      // Check if file is older than 24 hours
      const fileAge = (now - stats.mtime.getTime()) / (1000 * 60 * 60); // Age in hours
      if (fileAge > 24) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    console.log(`Cleaned up ${deletedCount} old audio files`);
  } catch (error) {
    console.error("Error cleaning up audio files:", error);
  }
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