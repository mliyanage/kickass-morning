// User-related types
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  isPersonalized: boolean;
}

// Phone verification types
export interface PhoneVerificationRequest {
  phone: string;
}

export interface OtpVerificationRequest {
  phone: string;
  otp: string;
}

// Personalization types
export enum GoalType {
  EXERCISE = "exercise",
  PRODUCTIVITY = "productivity",
  STUDY = "study",
  MEDITATION = "meditation",
  CREATIVE = "creative",
  OTHER = "other"
}

export enum StruggleType {
  TIRED = "tired",
  LACK_OF_MOTIVATION = "lack_of_motivation",
  SNOOZE = "snooze",
  STAY_UP_LATE = "stay_up_late",
  OTHER = "other"
}

export interface PersonalizationData {
  // Support both legacy single selection and new multi-select arrays
  goal?: GoalType;
  goals?: GoalType[];
  otherGoal?: string;
  goalDescription?: string;
  struggle?: StruggleType;
  struggles?: StruggleType[];
  otherStruggle?: string;
  voice: string;
  customVoice?: string;
}

// Schedule types
export interface ScheduleData {
  wakeupTime: string;
  timezone: string;
  weekdays: string[];
  isRecurring: boolean;
  date?: string;
  callRetry: boolean;
  advanceNotice: boolean;
}

export interface Schedule {
  id: number;
  userId: number;
  wakeupTime: string;
  timezone: string;
  weekdays: string[] | string; // Can be array or string (from database it might come as string)
  isRecurring: boolean;
  date: string | null;
  callRetry: boolean;
  advanceNotice: boolean;
  goalType: GoalType;
  struggleType: StruggleType;
  voiceId: string;
  isActive: boolean;
  createdAt: string;
}

// Call history types
export interface CallHistory {
  id: number;
  scheduleId: number;
  userId: number;
  callTime: string;
  timezone?: string; // IANA timezone of the scheduled call
  voice: string;
  status: "answered" | "missed" | "failed";
  duration: number | null;
  recordingUrl?: string;
}

// Voice types
export interface Voice {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
}
