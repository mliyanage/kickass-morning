import OpenAI from "openai";
import { GoalType, StruggleType } from "@shared/schema";

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_development",
});

// Function to generate personalized wakeup message
export async function generateVoiceMessage(
  goals: GoalType[],
  struggles: StruggleType[],
  userName: string | null,
  otherGoal?: string,
  otherStruggle?: string,
): Promise<string> {
  // Default to "there" if name is null
  const formattedName = userName || "there";

  // Format goals for prompt
  const goalTypeMap: Record<GoalType, string> = {
    [GoalType.EXERCISE]: "morning exercise",
    [GoalType.PRODUCTIVITY]: "do focused productive work",
    [GoalType.STUDY]: "studying or learning",
    [GoalType.MEDITATION]: "meditation and mindfulness",
    [GoalType.CREATIVE]: "pursue creative projects",
    [GoalType.OTHER]: otherGoal || "their personal goal",
  };

  const struggleTypeMap: Record<StruggleType, string> = {
    [StruggleType.TIRED]: "feeling tired and groggy",
    [StruggleType.LACK_OF_MOTIVATION]: "lacking motivation",
    [StruggleType.SNOOZE]: "hitting the snooze button multiple times",
    [StruggleType.STAY_UP_LATE]: "staying up too late",
    [StruggleType.OTHER]: otherStruggle || "their personal struggle",
  };

  // Map each goal and struggle to its corresponding text
  const formattedGoals = goals.map((g) => goalTypeMap[g] || "their goal");
  const formattedStruggles = struggles.map(
    (s) => struggleTypeMap[s] || "their struggle",
  );

  // Join multiple goals and struggles with commas and 'and'
  const goalsText = formatListForPrompt(formattedGoals);
  const strugglesText = formatListForPrompt(formattedStruggles);
  console.log("Goals:", goalsText);
  console.log("Struggles:", strugglesText);
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
          Start with a direct greeting using their first name.`,
        },
        {
          role: "user",
          content: `Create a motivational wakeup call message for ${formattedName}. 
          Their goals are focused on ${goalsText} and they struggle with ${strugglesText}. 
          Make it sound conversational and natural, as if a motivational figure is personally calling them.
          Address multiple goals and struggles in a coherent way that feels personalized.`,
        },
      ],
      max_tokens: 250,
      temperature: 0.7,
    });

    return (
      response.choices[0].message.content ||
      fallbackMessage(userName, goalsText)
    );
  } catch (error) {
    console.error("Error generating voice message:", error);
    return fallbackMessage(userName, goalsText);
  }
}

// Helper function to format an array of strings into a natural language list
function formatListForPrompt(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1).join(", ");
  return `${otherItems}, and ${lastItem}`;
}

// Fallback message in case OpenAI API fails
function fallbackMessage(userName: string | null, goal: string): string {
  const name = userName || "there";
  return `
    Good morning, ${name}! It's time to wake up and start your day.
    Remember why you set this alarm - your commitment to ${goal} is important.
    Take a deep breath, get up, and take that first step toward your goal.
    Today is a new opportunity to make progress. You've got this!
  `;
}

// Function to generate TTS audio from text
export async function generateSpeechAudio(
  text: string,
  voice: string = "alloy",
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
