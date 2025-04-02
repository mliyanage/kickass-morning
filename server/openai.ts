import OpenAI from "openai";
import { GoalType, StruggleType } from "@shared/schema";

// Initialize OpenAI API client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_development" 
});

// Function to generate personalized wakeup message
export async function generateVoiceMessage(
  goalType: GoalType,
  struggleType: StruggleType,
  userName: string
): Promise<string> {
  // Format goal and struggle for prompt
  const goalTypeMap: Record<GoalType, string> = {
    [GoalType.EXERCISE]: "morning exercise",
    [GoalType.PRODUCTIVITY]: "work productivity",
    [GoalType.STUDY]: "studying or learning",
    [GoalType.MEDITATION]: "meditation and mindfulness",
    [GoalType.CREATIVE]: "creative projects",
    [GoalType.OTHER]: "their personal goal"
  };

  const struggleTypeMap: Record<StruggleType, string> = {
    [StruggleType.TIRED]: "feeling tired and groggy",
    [StruggleType.LACK_OF_MOTIVATION]: "lacking motivation",
    [StruggleType.SNOOZE]: "hitting the snooze button multiple times",
    [StruggleType.STAY_UP_LATE]: "staying up too late",
    [StruggleType.OTHER]: "their personal struggle"
  };

  const goal = goalTypeMap[goalType] || "their goal";
  const struggle = struggleTypeMap[struggleType] || "their struggle";

  try {
    // The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are creating a short, motivational wake-up call message that sounds natural when spoken. 
          The message should be personal, inspiring, and focused on helping the person start their day with motivation.
          Keep the message between 30-60 seconds when spoken (around 80-160 words).
          Do not include any salutations like "Dear [Name]" or signatures.
          Start with a direct greeting using their first name.`
        },
        {
          role: "user",
          content: `Create a motivational wakeup call message for ${userName}. 
          Their goal is focused on ${goal} and they struggle with ${struggle}. 
          Make it sound conversational and natural, as if a motivational figure is personally calling them.`
        }
      ],
      max_tokens: 250,
      temperature: 0.7,
    });

    return response.choices[0].message.content || fallbackMessage(userName, goal);
  } catch (error) {
    console.error("Error generating voice message:", error);
    return fallbackMessage(userName, goal);
  }
}

// Fallback message in case OpenAI API fails
function fallbackMessage(userName: string, goal: string): string {
  return `
    Good morning, ${userName}! It's time to wake up and start your day.
    Remember why you set this alarm - your commitment to ${goal} is important.
    Take a deep breath, get up, and take that first step toward your goal.
    Today is a new opportunity to make progress. You've got this!
  `;
}

// Function to generate TTS audio from text
export async function generateSpeechAudio(
  text: string,
  voice: string = "alloy"
): Promise<Buffer> {
  try {
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error("Error generating speech audio:", error);
    throw error;
  }
}
