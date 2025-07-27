import axios from "axios";
import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./vite";

// Create dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a directory for temporary audio files if it doesn't exist
const AUDIO_DIR = path.join(__dirname, "..", "audio-cache");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// Check if we have valid API credentials
const isConfigured =
  !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== "dummy_key_for_development";

// Voice ID mapping
const voiceMap: Record<string, string> = {
  liam: "TX3LPaxmHKxFdv7VOQHJ", // Default male voice - "Adam"
  lily: "pFZP5JQG7iQjIQuC4Bku", // Female voice - "Sarah"
  bill: "pqHfZKP75CvOlQylNhV4", // Deep male voice - "Arnold"
  "todd-thomas": "sflYrWiXii4ezPjNLQkp", // Neutral voice
  jocko: "pQ4UJV5rfb04U3utkvKW", // Jocko voice as requested
  "radio-station": "QTGiyJvep6bcx4WD1qAq",
  default: "pNInz6obpgDQGcFmaJgB", // Default fallback
};

/**
 * Converts text to speech using ElevenLabs API and saves the audio file
 *
 * @param text - The text to convert to speech
 * @param voiceId - The voice ID to use (will be mapped to ElevenLabs voice)
 * @returns The path to the generated audio file
 */
export async function textToSpeech(
  text: string,
  voiceId: string = "default",
): Promise<{ filePath: string; url: string }> {
  try {
    // Map the voice ID to an ElevenLabs voice
    const elevenLabsVoiceId = mapVoiceIdToElevenLabsVoice(voiceId);

    // Handle development mode or missing API key
    if (!isConfigured) {
      log(
        "Using mock ElevenLabs text-to-speech due to missing API key",
        "elevenlabs",
      );
      
      // Use a consistent mock filename to avoid creating many files
      const mockFilename = `mock-voice-${elevenLabsVoiceId}.mp3`;
      const mockFilePath = path.join(AUDIO_DIR, mockFilename);
      
      // Only create the mock file if it doesn't already exist
      if (!fs.existsSync(mockFilePath)) {
        await fsPromises.writeFile(mockFilePath, "");
        log(`Created mock audio file: ${mockFilename}`, "elevenlabs");
      } else {
        log(`Using existing mock audio file: ${mockFilename}`, "elevenlabs");
      }

      // Return mock data
      return {
        filePath: mockFilePath,
        url: `/audio-cache/${mockFilename}`,
      };
    }

    log(
      `Converting text to speech with ElevenLabs voice: ${elevenLabsVoiceId}`,
      "elevenlabs",
    );

    // Prepare request options
    const url = `${ELEVENLABS_API_URL}/text-to-speech/${elevenLabsVoiceId}`;

    // Request parameters according to ElevenLabs API
    const requestData = {
      text: text,
      model_id: "eleven_multilingual_v2", // Use the multilingual model
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0, // Default style
        use_speaker_boost: true,
      },
    };

    // Make the API request
    const response = await axios({
      method: "post",
      url: url,
      data: requestData,
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      responseType: "arraybuffer",
    });

    // Generate a unique filename based on timestamp and voice
    const fileName = `voice-${elevenLabsVoiceId}-${Date.now()}.mp3`;
    const filePath = path.join(AUDIO_DIR, fileName);

    // Save the audio file
    await fsPromises.writeFile(filePath, Buffer.from(response.data));

    log(`Generated audio file saved to: ${filePath}`, "elevenlabs");

    // Return the file path and URL
    return {
      filePath: filePath,
      url: `/audio-cache/${fileName}`, // Relative URL for client access
    };
  } catch (error: any) {
    console.error("Error generating speech with ElevenLabs:", error.message);
    if (error.response) {
      console.error("ElevenLabs API response error:", {
        status: error.response.status,
        data: error.response.data,
      });
    }
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

/**
 * Maps custom voice IDs to ElevenLabs voice IDs
 */
function mapVoiceIdToElevenLabsVoice(voiceId: string): string {
  return voiceMap[voiceId] || voiceMap["default"];
}

/**
 * Lists available voices from ElevenLabs API
 * This can be used to get voice IDs and their details
 */
export async function listVoices(): Promise<any> {
  try {
    if (!isConfigured) {
      log("Using mock voice list due to missing API key", "elevenlabs");
      return {
        voices: Object.entries(voiceMap).map(([key, value]) => ({
          voice_id: value,
          name: key,
        })),
      };
    }

    const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Error fetching voices from ElevenLabs:", error.message);
    throw new Error(`Failed to fetch voices: ${error.message}`);
  }
}

/**
 * Cleanup function to remove old audio files
 * Should be called periodically to prevent disk space issues
 */
export async function cleanupOldAudioFiles(maxAgeHours = 24): Promise<void> {
  try {
    const files = await fsPromises.readdir(AUDIO_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(AUDIO_DIR, file);
      const stats = await fsPromises.stat(filePath);

      // If file is older than maxAgeHours, delete it
      const fileAgeHours = (now - stats.mtimeMs) / (1000 * 60 * 60);
      if (fileAgeHours > maxAgeHours) {
        await fsPromises.unlink(filePath);
        log(`Deleted old audio file: ${file}`, "elevenlabs");
      }
    }
  } catch (error) {
    console.error("Error cleaning up old audio files:", error);
  }
}
