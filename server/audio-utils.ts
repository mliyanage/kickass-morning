import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateSpeechAudio } from './openai';
import { log } from './vite';

// Ensure audio cache directory exists
const audioCacheDir = path.join(process.cwd(), 'audio-cache');
if (!fs.existsSync(audioCacheDir)) {
  fs.mkdirSync(audioCacheDir, { recursive: true });
  log(`Created audio cache directory at ${audioCacheDir}`);
}

/**
 * Generate and save an audio file using OpenAI TTS
 * 
 * @param text Text to convert to speech
 * @param voice Voice ID to use (will be mapped to the appropriate OpenAI voice)
 * @returns Object with file path and URL of the generated audio
 */
export async function generateAudioFile(text: string, voice: string): Promise<{ filePath: string, url: string }> {
  try {
    // Generate a unique filename based on input parameters to avoid duplicates
    const hash = crypto.createHash('md5').update(`${text}-${voice}`).digest('hex').substring(0, 10);
    const filename = `${voice}-${hash}.mp3`;
    const filePath = path.join(audioCacheDir, filename);
    
    // Check if the file already exists (caching)
    if (fs.existsSync(filePath)) {
      log(`Using cached audio file at ${filePath}`);
      return {
        filePath,
        url: `/audio-cache/${filename}`
      };
    }
    
    // Generate the audio using OpenAI
    log(`Generating new audio file with voice ${voice}`);
    const audioBuffer = await generateSpeechAudio(text, voice);
    
    // Save the buffer to a file
    fs.writeFileSync(filePath, audioBuffer);
    log(`Saved audio file to ${filePath}`);
    
    return {
      filePath,
      url: `/audio-cache/${filename}`
    };
  } catch (error) {
    console.error('Error generating audio file:', error);
    throw error;
  }
}

/**
 * Read an audio file as a Buffer
 * 
 * @param filePath Path to the audio file
 * @returns Buffer containing the audio data
 */
export function readAudioFile(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

/**
 * Clean up old audio files
 * 
 * @param maxAgeHours Maximum age of files to keep in hours (default: 24)
 */
export async function cleanupOldAudioFiles(maxAgeHours = 24): Promise<void> {
  try {
    if (!fs.existsSync(audioCacheDir)) {
      log('Audio cache directory does not exist, nothing to clean up');
      return;
    }
    
    const files = fs.readdirSync(audioCacheDir);
    const now = Date.now();
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(audioCacheDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = (now - stats.mtime.getTime()) / (1000 * 60 * 60); // Age in hours
      
      if (fileAge > maxAgeHours) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    log(`Cleaned up ${deletedCount} old audio files from cache`);
  } catch (error) {
    console.error('Error cleaning up audio files:', error);
  }
}