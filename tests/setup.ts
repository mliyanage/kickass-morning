// Test setup file
import { jest } from '@jest/globals';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.SESSION_SECRET = 'test-secret-key-for-testing-only';
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
process.env.TWILIO_PHONE_NUMBER = '+15551234567';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key';

// Mock external services by default
jest.mock('../server/twilio', () => ({
  makeCall: jest.fn().mockResolvedValue({
    sid: 'test-call-sid',
    status: 'initiated'
  }),
}));

jest.mock('../server/openai', () => ({
  generateVoiceMessage: jest.fn().mockResolvedValue('Test generated message'),
}));

jest.mock('../server/audio-utils', () => ({
  generateAudioFile: jest.fn().mockResolvedValue('/test/path/audio.mp3'),
  cleanupOldAudioFiles: jest.fn().mockResolvedValue(undefined),
}));

// Extend Jest matchers for better assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidScheduleTime(): R;
      toBeValidTimezone(): R;
    }
  }
}

expect.extend({
  toBeValidScheduleTime(received: string) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const pass = timeRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid schedule time`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid schedule time (HH:MM format)`,
        pass: false,
      };
    }
  },
  
  toBeValidTimezone(received: string) {
    try {
      // Check if timezone is valid by attempting to create a date
      new Date().toLocaleString('en-US', { timeZone: received });
      return {
        message: () => `expected ${received} not to be a valid timezone`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid timezone`,
        pass: false,
      };
    }
  }
});