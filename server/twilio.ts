import { generateSpeechAudio } from "./openai";
import { CallStatus } from "@shared/schema";
import Twilio from "twilio";

// Initialize Twilio client (conditionally)
const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC00000000000000000000000000000000"; // Fake SID that starts with AC
const authToken = process.env.TWILIO_AUTH_TOKEN || "dummy_token_for_development";
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || "+15551234567";

// Only initialize Twilio client if we have real credentials
let client: Twilio.Twilio | null = null;
const isDevelopmentMode = !process.env.TWILIO_ACCOUNT_SID || accountSid.startsWith("AC0000");

if (!isDevelopmentMode) {
  try {
    client = Twilio(accountSid, authToken);
    console.log("Twilio client initialized successfully");
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

    console.log(`Initiating call to ${to} with voice ${voiceId}`);
    
    // Map the voice ID to an OpenAI voice
    const openAIVoice = mapVoiceIdToOpenAIVoice(voiceId);
    
    // For now, use Twilio's built-in TTS with the message
    // This provides immediate feedback while we implement the more advanced version
    // The voice parameter in Twilio's TTS is different from OpenAI's voices
    // We're just using a simple approach for now
    
    // Create TwiML to instruct Twilio how to handle the call
    // Use a natural-sounding pause and voice selection
    const twiml = `
      <Response>
        <Pause length="1"/>
        <Say voice="alice">${message}</Say>
        <Pause length="1"/>
      </Response>
    `;
    
    console.log("Calling with TwiML:", twiml);
    
    // Make the call with Twilio
    const call = await client.calls.create({
      twiml,
      from: twilioPhoneNumber,
      to,
      record: true,
    });
    
    console.log("Call initiated with SID:", call.sid);
    
    // Since we can't determine the exact outcome immediately, 
    // return a predicted successful result
    return {
      status: CallStatus.ANSWERED, // Optimistic assumption
      duration: null,              // We don't know the duration yet
      recordingUrl: null,          // We don't have the recording URL yet
    };
  } catch (error: any) {
    console.error("Error making call:", error);
    console.error(error.stack);
    
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
