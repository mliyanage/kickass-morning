import { CallStatus } from "@shared/schema";
import Twilio from "twilio";
import { textToSpeech } from "./elevenlabs";
import { log } from "./vite";

// Initialize Twilio client (conditionally)
const accountSid =
  process.env.TWILIO_ACCOUNT_SID || "AC00000000000000000000000000000000"; // Fake SID that starts with AC
const authToken =
  process.env.TWILIO_AUTH_TOKEN || "dummy_token_for_development";
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || "+15551234567";

// Only initialize Twilio client if we have real credentials
let client: Twilio.Twilio | null = null;
const isDevelopmentMode =
  !process.env.TWILIO_ACCOUNT_SID || accountSid.startsWith("AC0000");

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
    return {
      sid: "error_mock_sms_sid",
      status: "failed",
      error: error.message || "Unknown error",
    };
  }
}

// Function to make a call via Twilio
export async function makeCall(
  to: string,
  message: string,
  voiceId: string,
): Promise<{
  status: CallStatus;
  duration: number | null;
  recordingUrl: string | null;
}> {
  try {
    // In development mode, just simulate success
    if (isDevelopmentMode || !client) {
      log(
        `[MOCK CALL] To: ${to}, Voice: ${voiceId}, Message: ${message}`,
        "twilio",
      );

      // Even in mock mode, generate the audio file using ElevenLabs for testing purposes
      try {
        const audioResult = await textToSpeech(message, voiceId);
        log(`Generated mock audio file at: ${audioResult.filePath}`, "twilio");

        // Return a mock success with the actual audio URL for development testing
        return {
          status: CallStatus.ANSWERED,
          duration: 60, // Simulate a 60-second call
          recordingUrl: audioResult.url,
        };
      } catch (error: any) {
        log(`Error generating mock audio: ${error.message}`, "twilio");

        // Return standard mock response if audio generation fails
        return {
          status: CallStatus.ANSWERED,
          duration: 60,
          recordingUrl: "https://example.com/mock-recording.mp3",
        };
      }
    }

    log(`Initiating call to ${to} with voice ${voiceId}`, "twilio");

    // Generate audio using ElevenLabs text-to-speech
    const audioResult = await textToSpeech(message, voiceId);

    // Get the complete URL for the audio file
    // The audioResult.url is a relative path, we need to make it a fully qualified URL
    // For Twilio to access the file, it needs to be publicly accessible
    const baseUrl =
      process.env.BASE_URL ||
      `https://6b00a244-0c0a-4270-8cd6-579245215ee2-00-32783he2wcj2l.janeway.replit.dev`;
    const audioUrl = `${baseUrl}${audioResult.url}`;

    log(`Generated audio available at: ${audioUrl}`, "twilio");

    // Create TwiML to instruct Twilio how to handle the call with our custom audio
    const twiml = `
      <Response>
        <Pause length="1"/>
        <Play>${audioUrl}</Play>
        <Pause length="1"/>
      </Response>
    `;

    log("Calling with TwiML:", "twilio");
    log(twiml, "twilio-twiml");

    // Make the call with Twilio
    const call = await client.calls.create({
      twiml,
      from: twilioPhoneNumber,
      to,
      record: true,
    });

    log(`Call initiated with SID: ${call.sid}`, "twilio");

    // Return the call results
    return {
      status: CallStatus.ANSWERED, // Optimistic assumption
      duration: null, // We don't know the duration yet
      recordingUrl: audioResult.url, // Store the relative URL for our own records
    };
  } catch (error: any) {
    console.error("Error making call:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    console.error(error.stack);

    return {
      status: CallStatus.FAILED,
      duration: null,
      recordingUrl: null,
    };
  }
}

// This function has been replaced by the ElevenLabs voice mapping in elevenlabs.ts
