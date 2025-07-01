import {
  User,
  InsertUser,
  schedules,
  personalizations,
  PersonalizationData,
  CallStatus,
  Schedule,
  CallHistoryEntry,
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User related
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPhone(
    userId: number,
    phone: string,
    verified: boolean,
  ): Promise<User | undefined>;
  updateUserPersonalizationStatus(
    userId: number,
    isPersonalized: boolean,
  ): Promise<User | undefined>;

  // OTP related
  createEmailOtp(data: {
    email: string;
    code: string;
    type: string;
    expiresAt: Date;
  }): Promise<any>;
  verifyEmailOtp(
    email: string,
    code: string,
    type: string,
  ): Promise<number | null>; // Returns userId if found
  verifyAnyEmailOtp(email: string, code: string): Promise<boolean>; // Verifies OTP regardless of type
  createPhoneOtp(data: {
    userId: number;
    phone: string;
    code: string;
    expiresAt: Date;
  }): Promise<any>;
  verifyPhoneOtp(userId: number, phone: string, code: string): Promise<boolean>;
  hasActiveOtps(userId: number, phone: string): Promise<boolean>; // Checks if user has any active OTPs
  getPhoneOtps(userId: number, phone: string): Promise<any[]>; // Gets all OTPs for a user+phone

  // Personalization related
  savePersonalization(userId: number, data: PersonalizationData): Promise<any>;
  getPersonalization(userId: number): Promise<PersonalizationData | undefined>;

  // Schedule related
  createSchedule(data: any): Promise<Schedule>;
  getSchedule(id: number): Promise<Schedule | undefined>;
  getUserSchedules(userId: number): Promise<Schedule[]>;
  updateScheduleStatus(
    id: number,
    isActive: boolean,
  ): Promise<Schedule | undefined>;
  updateSchedule(id: number, data: any): Promise<Schedule | undefined>;
  getPendingSchedules(currentTime?: Date): Promise<Schedule[]>; // Get schedules that should be called now
  updateLastCalledTime(
    scheduleId: number,
    callSid: string,
    time?: Date,
    callStatus?: CallStatus,
  ): Promise<void>; // Update last called time for a schedule

  // Call history related
  createCallHistory(data: any): Promise<CallHistoryEntry>;
  getCallHistory(id: number): Promise<CallHistoryEntry | undefined>;
  getUserCallHistory(userId: number): Promise<CallHistoryEntry[]>;
  updateCallStatus(
    callSid: string,
    status: CallStatus,
    recordingUrl?: string,
  ): Promise<void>; // Update status based on webhook
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private otpCodes: Map<number, any[]>;
  private personalizations: Map<number, PersonalizationData>;
  private schedules: Map<number, Schedule>;
  private callHistory: Map<number, CallHistoryEntry>;

  currentId: number;
  currentOtpId: number;
  currentPersonalizationId: number;
  currentScheduleId: number;
  currentCallHistoryId: number;

  constructor() {
    this.users = new Map();
    this.otpCodes = new Map();
    this.personalizations = new Map();
    this.schedules = new Map();
    this.callHistory = new Map();

    this.currentId = 1;
    this.currentOtpId = 1;
    this.currentPersonalizationId = 1;
    this.currentScheduleId = 1;
    this.currentCallHistoryId = 1;
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  // This method is kept for backward compatibility but deprecated
  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }

  // Backward compatibility methods for OTP
  async createOtpCode(data: {
    userId: number;
    phone: string;
    code: string;
    expiresAt: Date;
  }): Promise<any> {
    return this.createPhoneOtp(data);
  }

  async verifyOtpCode(
    userId: number,
    phone: string,
    code: string,
  ): Promise<boolean> {
    return this.verifyPhoneOtp(userId, phone, code);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const now = new Date();
    const user: User = {
      id,
      email: insertUser.email,
      name: insertUser.name || null,
      phone: null,
      phoneVerified: false,
      isPersonalized: false,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPhone(
    userId: number,
    phone: string,
    verified: boolean,
  ): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    user.phone = phone;
    user.phoneVerified = verified;
    user.updatedAt = new Date();

    this.users.set(userId, user);
    return user;
  }

  async updateUserPersonalizationStatus(
    userId: number,
    isPersonalized: boolean,
  ): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    user.isPersonalized = isPersonalized;
    user.updatedAt = new Date();

    this.users.set(userId, user);
    return user;
  }

  // OTP related methods
  // Email OTP methods
  async createEmailOtp(data: {
    email: string;
    code: string;
    type: string;
    expiresAt: Date;
  }): Promise<any> {
    const id = this.currentOtpId++;
    const otpCode = { id, ...data, createdAt: new Date() };

    // Store email OTPs with a special key for users not yet registered
    const emailKey = `email:${data.email}`;
    if (!this.otpCodes.has(this.emailToKey(data.email))) {
      this.otpCodes.set(this.emailToKey(data.email), []);
    }

    const emailOtpCodes = this.otpCodes.get(this.emailToKey(data.email)) || [];
    emailOtpCodes.push(otpCode);
    this.otpCodes.set(this.emailToKey(data.email), emailOtpCodes);

    return otpCode;
  }

  async verifyEmailOtp(
    email: string,
    code: string,
    type: string,
  ): Promise<number | null> {
    const user = await this.getUserByEmail(email);
    const emailOtpCodes = this.otpCodes.get(this.emailToKey(email)) || [];

    console.log(`[OTP Debug] Verifying ${code} for ${email} (type: ${type})`);
    console.log(
      `[OTP Debug] Found ${emailOtpCodes.length} OTP codes for this email`,
    );

    // First try with the exact type requested
    const matchingOtps = emailOtpCodes.filter(
      (otp) =>
        otp.email === email &&
        otp.type === type &&
        otp.code === code &&
        new Date() < new Date(otp.expiresAt),
    );

    if (matchingOtps.length > 0) {
      console.log(`[OTP Debug] Found matching OTP with type ${type}`);

      // Remove the verified OTP from storage
      this.otpCodes.set(
        this.emailToKey(email),
        emailOtpCodes.filter((otp) => otp !== matchingOtps[0]),
      );

      // For login type, check if user exists
      if (type === "login") {
        if (!user) {
          console.log(`[OTP Debug] Login OTP valid but user doesn't exist`);
          return null;
        }
        return user.id;
      }

      // For registration
      return -1;
    }

    // If we're trying to login and have a valid user, also check for registration OTPs
    if (type === "login" && user) {
      const registrationOtps = emailOtpCodes.filter(
        (otp) =>
          otp.email === email &&
          otp.type === "register" &&
          otp.code === code &&
          new Date() < new Date(otp.expiresAt),
      );

      if (registrationOtps.length > 0) {
        console.log(
          `[OTP Debug] Found valid registration OTP, using for login`,
        );

        // Remove the verified OTP from storage
        this.otpCodes.set(
          this.emailToKey(email),
          emailOtpCodes.filter((otp) => otp !== registrationOtps[0]),
        );

        return user.id;
      }
    }

    // Log some debugging info
    console.log(`[OTP Debug] No valid OTP found for ${email}`);
    emailOtpCodes.forEach((otp, i) => {
      console.log(
        `[OTP Debug] OTP #${i + 1}: code=${otp.code}, type=${otp.type}, expired=${new Date() > new Date(otp.expiresAt)}`,
      );
    });

    return null;
  }

  // Helper method to create a consistent key for email OTPs
  private emailToKey(email: string): number {
    // Hash the email to a consistent number for use as a key
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  // Phone OTP methods
  async createPhoneOtp(data: {
    userId: number;
    phone: string;
    code: string;
    expiresAt: Date;
  }): Promise<any> {
    const id = this.currentOtpId++;
    const otpCode = { id, ...data, createdAt: new Date() };

    if (!this.otpCodes.has(data.userId)) {
      this.otpCodes.set(data.userId, []);
    }

    const userOtpCodes = this.otpCodes.get(data.userId) || [];
    userOtpCodes.push(otpCode);
    this.otpCodes.set(data.userId, userOtpCodes);

    return otpCode;
  }

  async verifyAnyEmailOtp(email: string, code: string): Promise<boolean> {
    const emailOtpCodes = this.otpCodes.get(this.emailToKey(email)) || [];

    console.log(`[OTP Debug] Verifying any OTP ${code} for ${email}`);
    console.log(
      `[OTP Debug] Found ${emailOtpCodes.length} OTP codes for this email`,
    );

    // Find any valid OTP for this email, regardless of type
    const validOtp = emailOtpCodes.find(
      (otp) =>
        otp.email === email &&
        otp.code === code &&
        new Date() < new Date(otp.expiresAt),
    );

    if (validOtp) {
      console.log(
        `[OTP Debug] Found valid OTP with code ${code}, type ${validOtp.type}`,
      );

      // Remove the verified OTP from storage
      this.otpCodes.set(
        this.emailToKey(email),
        emailOtpCodes.filter((otp) => otp !== validOtp),
      );

      return true;
    }

    // Log some debugging info
    console.log(
      `[OTP Debug] No valid OTP found for ${email} with code ${code}`,
    );
    emailOtpCodes.forEach((otp, i) => {
      console.log(
        `[OTP Debug] OTP #${i + 1}: code=${otp.code}, type=${otp.type}, expired=${new Date() > new Date(otp.expiresAt)}`,
      );
    });

    return false;
  }

  async verifyPhoneOtp(
    userId: number,
    phone: string,
    code: string,
  ): Promise<boolean> {
    const userOtpCodes = this.otpCodes.get(userId) || [];

    // Find the latest OTP code for the phone number
    const otpCodes = userOtpCodes.filter((otp) => otp.phone === phone);
    if (otpCodes.length === 0) return false;

    // Sort by creation date (descending)
    otpCodes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const latestOtp = otpCodes[0];

    // Check if OTP is valid and not expired
    const now = new Date();
    if (latestOtp.code !== code || now > new Date(latestOtp.expiresAt)) {
      return false;
    }

    return true;
  }

  async hasActiveOtps(userId: number, phone: string): Promise<boolean> {
    const userOtpCodes = this.otpCodes.get(userId) || [];

    // Find any active OTPs for this phone number
    const now = new Date();
    const activeOtps = userOtpCodes.filter(
      (otp) => otp.phone === phone && now < new Date(otp.expiresAt),
    );

    return activeOtps.length > 0;
  }

  async getPhoneOtps(userId: number, phone: string): Promise<any[]> {
    const userOtpCodes = this.otpCodes.get(userId) || [];

    // Return all OTPs for this phone number, sorted by creation date (descending)
    return userOtpCodes
      .filter((otp) => otp.phone === phone)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  // Personalization related methods
  async savePersonalization(
    userId: number,
    data: PersonalizationData,
  ): Promise<any> {
    const id = this.currentPersonalizationId++;
    const now = new Date();

    const personalization = {
      id,
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    this.personalizations.set(userId, data);
    return personalization;
  }

  async getPersonalization(
    userId: number,
  ): Promise<PersonalizationData | undefined> {
    return this.personalizations.get(userId);
  }

  // Schedule related methods
  async createSchedule(data: any): Promise<Schedule> {
    const id = this.currentScheduleId++;
    const now = new Date();

    const schedule: Schedule = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    this.schedules.set(id, schedule);
    return schedule;
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async getUserSchedules(userId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(
      (schedule) => schedule.userId === userId,
    );
  }

  async updateScheduleStatus(
    id: number,
    isActive: boolean,
  ): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;

    schedule.isActive = isActive;
    schedule.updatedAt = new Date();

    this.schedules.set(id, schedule);
    return schedule;
  }

  async updateSchedule(id: number, data: any): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;

    // Update the schedule with the new data
    const updatedSchedule = {
      ...schedule,
      ...data,
      updatedAt: new Date(),
    };

    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  // Call history related methods
  async createCallHistory(data: any): Promise<CallHistoryEntry> {
    const id = this.currentCallHistoryId++;
    const now = new Date();

    const callHistoryEntry: CallHistoryEntry = {
      id,
      ...data,
      createdAt: now,
    };

    this.callHistory.set(id, callHistoryEntry);
    return callHistoryEntry;
  }

  async getCallHistory(id: number): Promise<CallHistoryEntry | undefined> {
    return this.callHistory.get(id);
  }

  async getUserCallHistory(userId: number): Promise<CallHistoryEntry[]> {
    return (
      Array.from(this.callHistory.values())
        .filter((call) => call.userId === userId)
        // Sort by call time (descending)
        .sort(
          (a, b) =>
            new Date(b.callTime).getTime() - new Date(a.callTime).getTime(),
        )
    );
  }

  // New methods for scheduler
  async getPendingSchedules(
    currentTime: Date = new Date(),
  ): Promise<Schedule[]> {
    const now = currentTime;
    const currentDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
      now.getDay()
    ];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Format current time as HH:MM for comparison
    const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

    return Array.from(this.schedules.values()).filter((schedule) => {
      // Only consider active schedules
      if (!schedule.isActive) return false;

      // Check if this schedule has been called recently (within last 5 minutes)
      const lastCalled = schedule.lastCalled
        ? new Date(schedule.lastCalled)
        : null;
      if (lastCalled && now.getTime() - lastCalled.getTime() < 5 * 60 * 1000) {
        return false;
      }

      // For recurring schedules, check if current day is in weekdays and time matches
      if (schedule.isRecurring) {
        const weekdays = Array.isArray(schedule.weekdays)
          ? schedule.weekdays
          : schedule.weekdays?.split(",") || [];

        return (
          weekdays.includes(currentDay) &&
          schedule.wakeupTime === currentTimeStr
        );
      }

      // For one-time schedules, check if date and time match
      if (!schedule.isRecurring && schedule.date) {
        const scheduleDate = new Date(schedule.date);
        return (
          scheduleDate.toDateString() === now.toDateString() &&
          schedule.wakeupTime === currentTimeStr
        );
      }

      return false;
    });
  }

  async updateLastCalledTime(
    scheduleId: number,
    callSid: string,
    time: Date = new Date(),
    callStatus: CallStatus = CallStatus.PENDING,
  ): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      // Use type assertion to match the database schema's timestamp type
      schedule.lastCalled = time as any;
      schedule.lastCallStatus = callStatus;
      schedule.lastCallSid = callSid;
      this.schedules.set(scheduleId, schedule);
    }
  }

  async updateCallStatus(
    callSid: string,
    status: CallStatus,
    recordingUrl?: string,
  ): Promise<void> {
    // Step 1: Update call history entry by callSid using a manual iteration approach
    // that avoids TypeScript Map.entries() compatibility issues
    let scheduleId: number | null = null;

    this.callHistory.forEach((callEntry, id) => {
      if (callEntry.callSid === callSid) {
        callEntry.status = status;
        if (recordingUrl) {
          callEntry.recordingUrl = recordingUrl;
        }
        this.callHistory.set(id, callEntry);

        // Store the schedule ID for the second step
        scheduleId = callEntry.scheduleId;
      }
    });

    // Step 2: If we found a scheduleId, update the schedule's last call status too
    if (scheduleId !== null) {
      const schedule = this.schedules.get(scheduleId);
      if (schedule) {
        schedule.lastCallStatus = status;
        this.schedules.set(scheduleId, schedule);
        console.log(
          `Updated schedule ${scheduleId} last call status to ${status}`,
        );
      }
    }
  }
}

// To use in-memory storage:
// export const storage = new MemStorage();

// To use database storage:
import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();
