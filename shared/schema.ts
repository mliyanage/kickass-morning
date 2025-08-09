import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enum types for goals and struggles
export enum GoalType {
  EXERCISE = "exercise",
  PRODUCTIVITY = "productivity",
  STUDY = "study",
  MEDITATION = "meditation",
  CREATIVE = "creative",
  OTHER = "other",
}

export enum StruggleType {
  TIRED = "tired",
  LACK_OF_MOTIVATION = "lack_of_motivation",
  SNOOZE = "snooze",
  STAY_UP_LATE = "stay_up_late",
  OTHER = "other",
}

export enum CallStatus {
  PENDING = "pending",
  ANSWERED = "answered",
  FAILED = "failed",
  RINGING = "ringing",
  COMPLETED = "completed",
  IN_PROGRESS = "in-progress",
  QUEUED = "queued",
  INITIATED = "initiated",
}

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").default(false),
  isPersonalized: boolean("is_personalized").default(false),
  welcomeEmailSent: boolean("welcome_email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User personalization preferences
export const personalizations = pgTable(
  "personalizations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    goal: text("goal").notNull(), // Single goal in database
    otherGoal: text("other_goal"),
    goalDescription: text("goal_description"),
    struggle: text("struggle").notNull(), // Single struggle in database
    otherStruggle: text("other_struggle"),
    voice: text("voice").notNull(),
    customVoice: text("custom_voice"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdUnique: unique("personalizations_user_id_unique").on(table.userId),
    };
  },
);

// Voice options
export const voices = pgTable("voices", {
  id: serial("id").primaryKey(),
  voiceId: text("voice_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schedule for wakeup calls - DST-proof with local time storage
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  wakeupTime: text("wakeup_time").notNull(), // HH:MM format in user's local time
  timezone: text("timezone").notNull(), // IANA timezone identifier
  weekdays: text("weekdays").notNull(), // comma-separated days: "mon,tue,wed"  
  isRecurring: boolean("is_recurring").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  lastCalled: timestamp("last_called"),
  lastCallSid: text("last_call_sid"),
  lastCallStatus: text("last_call_status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Call history
export const callHistory = pgTable("call_history", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => schedules.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  callTime: timestamp("call_time").notNull(),
  timezone: text("timezone"), // IANA timezone of the scheduled call
  voice: text("voice").notNull(),
  status: text("status").notNull(),
  callSid: text("call_sid"), // Twilio call SID for tracking
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OTP verification codes
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  email: text("email"),
  phone: text("phone"),
  code: text("code").notNull(),
  type: text("type").notNull(), // 'email', 'phone', or 'login'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for inserting new users
export const insertUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

// Schema for user login (passwordless)
export const loginUserSchema = z.object({
  email: z.string().email(),
  rememberMe: z.boolean().optional(),
});

// Schema for email OTP verification
export const emailOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

// Schema for phone verification
export const phoneVerificationSchema = z.object({
  phone: z
    .string()
    .min(6, "Phone number must include country code and at least 5 digits")
    .regex(
      /^\+[1-9]\d{4,14}$/,
      "Phone number must be in E.164 format (e.g., +1234567890)",
    ),
});

// Schema for OTP verification
export const otpVerificationSchema = z.object({
  phone: z
    .string()
    .min(6, "Phone number must include country code and at least 5 digits")
    .regex(
      /^\+[1-9]\d{4,14}$/,
      "Phone number must be in E.164 format (e.g., +1234567890)",
    ),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

// Schema for personalization
export const personalizationSchema = z.object({
  goals: z
    .array(
      z.enum([
        GoalType.EXERCISE,
        GoalType.PRODUCTIVITY,
        GoalType.STUDY,
        GoalType.MEDITATION,
        GoalType.CREATIVE,
        GoalType.OTHER,
      ]),
    )
    .min(1, "Select at least one goal"),
  otherGoal: z.string().max(100, "Custom goal must be 100 characters or less").optional(),
  goalDescription: z.string().max(500, "Goal description must be 500 characters or less").optional(),
  struggles: z
    .array(
      z.enum([
        StruggleType.TIRED,
        StruggleType.LACK_OF_MOTIVATION,
        StruggleType.SNOOZE,
        StruggleType.STAY_UP_LATE,
        StruggleType.OTHER,
      ]),
    )
    .min(1, "Select at least one struggle"),
  otherStruggle: z.string().max(100, "Custom struggle must be 100 characters or less").optional(),
  voice: z.string(),
  customVoice: z.string().max(50, "Custom voice must be 50 characters or less").optional(),
});

// Schema for schedule
export const scheduleSchema = z.object({
  wakeupTime: z.string(),
  timezone: z.string(),
  weekdays: z.array(z.string()),
  isRecurring: z.boolean(),
  date: z.string().optional(),
  callRetry: z.boolean(),
  advanceNotice: z.boolean(),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type EmailOtpVerification = z.infer<typeof emailOtpSchema>;
export type PhoneVerification = z.infer<typeof phoneVerificationSchema>;
export type OtpVerification = z.infer<typeof otpVerificationSchema>;
export type PersonalizationData = z.infer<typeof personalizationSchema>;
export type ScheduleData = z.infer<typeof scheduleSchema>;

export type User = typeof users.$inferSelect;
export type Personalization = typeof personalizations.$inferSelect;
export type Voice = typeof voices.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type CallHistoryEntry = typeof callHistory.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
