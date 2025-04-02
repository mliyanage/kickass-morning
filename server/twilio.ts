import { generateSpeechAudio } from "./openai";
import { CallStatus } from "@shared/schema";

// Initialize Twilio client (conditionally)
const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC00000000000000000000000000000000"; // Fake SID that starts with AC
const authToken = process.env.TWILIO_AUTH_TOKEN || "dummy_token_for_development";
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || "+15551234567";

// Only initialize Twilio client if we have real credentials
let client: any = null;
const isDevelopmentMode = !process.env.TWILIO_ACCOUNT_SID || accountSid.startsWith("AC0000");

if (!isDevelopmentMode) {
  try {
    const twilio = require("twilio");
    client = twilio(accountSid, authToken);
  } catch (error) {
    console.warn("Failed to initialize Twilio client:", error);
  }
}

// Function to send SMS via Twilio
export async function sendSMS(to: string, body: string): Promise<any> {
  try {
    // In development mode, just simulate success
    if (isDevelopmentMode || !client) {
      console.log(`[MOCK SMS] To: ${to}, Message: ${body}`);
      return { sid: "mock_sms_sid", status: "delivered" };
    }

    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to,
    });

    return message;
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    // Return mock data in case of error to allow development to continue
    return { sid: "error_mock_sms_sid", status: "failed", error: error.message || "Unknown error" };
  }
}

// Function to make a call via Twilio
export async function makeCall(
  to: string,
  message: string,
  voiceId: string
): Promise<{ status: CallStatus; duration: number | null; recordingUrl: string | null }> {
  try {
    // In development mode, just simulate success
    if (isDevelopmentMode || !client) {
      console.log(`[MOCK CALL] To: ${to}, Voice: ${voiceId}, Message: ${message}`);
      
      return {
        status: CallStatus.ANSWERED,
        duration: 60, // Simulate a 60-second call
        recordingUrl: "https://example.com/mock-recording.mp3",
      };
    }

    // Generate speech audio using OpenAI
    const audioBuffer = await generateSpeechAudio(message, mapVoiceIdToOpenAIVoice(voiceId));

    // TODO: In a real implementation, we would:
    // 1. Store the audio file somewhere accessible via URL
    // 2. Create a TwiML response that plays this audio
    // 3. Make the call with Twilio and point to a webhook that serves this TwiML
    
    // For now, using a simple approach for demonstration
    const call = await client.calls.create({
      twiml: `<Response><Say>${message}</Say></Response>`,
      from: twilioPhoneNumber,
      to,
      record: true,
    });

    // In a real implementation, we would wait for call completion
    // For now, return simulated results
    return {
      status: CallStatus.ANSWERED,
      duration: 60, // Simulated duration
      recordingUrl: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${call.sid}.mp3`,
    };
  } catch (error: any) {
    console.error("Error making call:", error);
    
    return {
      status: CallStatus.FAILED,
      duration: null,
      recordingUrl: null,
    };
  }
}

// Helper function to map voice IDs to OpenAI voice names
function mapVoiceIdToOpenAIVoice(voiceId: string): string {
  // In a real implementation, this would map custom voice IDs to available voices
  // For now, use default OpenAI voices based on some common names
  const voiceMap: Record<string, string> = {
    "elon-musk": "echo",      // Male voice
    "oprah-winfrey": "nova",  // Female voice
    "david-goggins": "onyx",  // Deep male voice
    "steve-jobs": "alloy",    // Neutral voice
  };

  return voiceMap[voiceId] || "alloy"; // Default to alloy if no mapping exists
}
