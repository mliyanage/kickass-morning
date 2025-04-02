import { apiRequest } from "./queryClient";

// This is a client-side utility for OpenAI voice generation
// In a real implementation, we'd use the OpenAI API directly from the server

export async function generateSampleVoice(voiceId: string, text: string): Promise<string> {
  try {
    // In a real implementation, this would call OpenAI's API
    // For now, we'll just return a mock audio URL
    
    // Just for demonstration, make a request to the backend sample-call endpoint
    const response = await apiRequest('POST', '/api/sample-call', {});
    
    // Mock audio URL - in a real implementation, this would be a blob URL or audio file
    return 'https://example.com/sample-voice.mp3';
  } catch (error) {
    console.error('Error generating sample voice:', error);
    throw new Error('Failed to generate sample voice');
  }
}

export const voiceOptions = [
  {
    id: 'elon-musk',
    name: 'Elon Musk',
    description: 'Entrepreneur & Innovator',
    imageUrl: 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80'
  },
  {
    id: 'oprah-winfrey',
    name: 'Oprah Winfrey',
    description: 'Media Executive & Philanthropist',
    imageUrl: 'https://images.unsplash.com/photo-1579503841516-e0bd7fca5faa?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80'
  },
  {
    id: 'david-goggins',
    name: 'David Goggins',
    description: 'Ultramarathon Runner & Motivator',
    imageUrl: 'https://images.unsplash.com/photo-1507398941214-572c25f4b1dc?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80'
  },
  {
    id: 'steve-jobs',
    name: 'Steve Jobs',
    description: 'Technology Visionary',
    imageUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80'
  }
];

export const goalOptions = [
  { id: 'exercise', label: 'Morning Exercise' },
  { id: 'productivity', label: 'Work Productivity' },
  { id: 'study', label: 'Study or Learning' },
  { id: 'meditation', label: 'Meditation & Mindfulness' },
  { id: 'creative', label: 'Creative Projects' },
  { id: 'other', label: 'Other' }
];

export const struggleOptions = [
  { id: 'tired', label: 'Feeling tired and groggy' },
  { id: 'motivation', label: 'Lack of motivation' },
  { id: 'snooze', label: 'Hitting snooze multiple times' },
  { id: 'late-night', label: 'Staying up too late' },
  { id: 'other', label: 'Other' }
];
