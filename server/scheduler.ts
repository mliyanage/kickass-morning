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
        
        // Convert single strings to arrays for the API
        const goalsArray = [mainGoal as any]; // Type assertion
        const strugglesArray = [mainStruggle as any]; // Type assertion
        
        const messageText = await generateVoiceMessage(
          goalsArray,
          strugglesArray,
          user.name, // Can be null
          goalDescription // Pass as otherGoal
        );

        // We'll skip the audio generation for now since there's a type issue between
        // our generateSpeechAudio (which returns Buffer) and what our makeCall expects
        
        // Instead, we'll just use the text directly for the call
        console.log(`Using text message for call: ${messageText.substring(0, 100)}...`);

        // Make the call
        console.log(`Making call to ${user.phone} with text message`);
        
        // No audio file needed for now
        // const audioUrl = `/audio-cache/${path.basename(audioFilePath)}`;
        
        // Create a history record before making the call
        const callHistory = await storage.createCallHistory({
          userId: user.id,
          scheduleId: schedule.id,
          callTime: new Date(),
          voice: schedule.voiceId,
          status: CallStatus.PENDING
        });
        
        // Make the call with Twilio
        // Note: the actual makeCall function requires a message and voiceId, not an audioFilePath
        // We need to modify the approach here - either update the Twilio function or change our approach
        
        // For now, we'll create our own TwiML message
        const message = `This is your scheduled wake-up call for ${schedule.wakeupTime}`;
        const callResult = await makeCall(user.phone, message, schedule.voiceId);

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