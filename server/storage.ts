import { 
  User, 
  InsertUser, 
  schedules,
  personalizations, 
  PersonalizationData, 
  CallStatus, 
  Schedule,
  CallHistoryEntry
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User related
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPhone(userId: number, phone: string, verified: boolean): Promise<User | undefined>;
  updateUserPersonalizationStatus(userId: number, isPersonalized: boolean): Promise<User | undefined>;
  
  // OTP related
  createOtpCode(data: { userId: number, phone: string, code: string, expiresAt: Date }): Promise<any>;
  verifyOtpCode(userId: number, phone: string, code: string): Promise<boolean>;
  
  // Personalization related
  savePersonalization(userId: number, data: PersonalizationData): Promise<any>;
  getPersonalization(userId: number): Promise<PersonalizationData | undefined>;
  
  // Schedule related
  createSchedule(data: any): Promise<Schedule>;
  getSchedule(id: number): Promise<Schedule | undefined>;
  getUserSchedules(userId: number): Promise<Schedule[]>;
  updateScheduleStatus(id: number, isActive: boolean): Promise<Schedule | undefined>;
  
  // Call history related
  createCallHistory(data: any): Promise<CallHistoryEntry>;
  getCallHistory(id: number): Promise<CallHistoryEntry | undefined>;
  getUserCallHistory(userId: number): Promise<CallHistoryEntry[]>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      phone: null,
      phoneVerified: false,
      isPersonalized: false,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPhone(userId: number, phone: string, verified: boolean): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.phone = phone;
    user.phoneVerified = verified;
    user.updatedAt = new Date();
    
    this.users.set(userId, user);
    return user;
  }

  async updateUserPersonalizationStatus(userId: number, isPersonalized: boolean): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.isPersonalized = isPersonalized;
    user.updatedAt = new Date();
    
    this.users.set(userId, user);
    return user;
  }

  // OTP related methods
  async createOtpCode(data: { userId: number, phone: string, code: string, expiresAt: Date }): Promise<any> {
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

  async verifyOtpCode(userId: number, phone: string, code: string): Promise<boolean> {
    const userOtpCodes = this.otpCodes.get(userId) || [];
    
    // Find the latest OTP code for the phone number
    const otpCodes = userOtpCodes.filter(otp => otp.phone === phone);
    if (otpCodes.length === 0) return false;
    
    // Sort by creation date (descending)
    otpCodes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const latestOtp = otpCodes[0];
    
    // Check if OTP is valid and not expired
    const now = new Date();
    if (latestOtp.code !== code || now > new Date(latestOtp.expiresAt)) {
      return false;
    }
    
    return true;
  }

  // Personalization related methods
  async savePersonalization(userId: number, data: PersonalizationData): Promise<any> {
    const id = this.currentPersonalizationId++;
    const now = new Date();
    
    const personalization = {
      id,
      userId,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    
    this.personalizations.set(userId, data);
    return personalization;
  }

  async getPersonalization(userId: number): Promise<PersonalizationData | undefined> {
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
      updatedAt: now
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

  async updateScheduleStatus(id: number, isActive: boolean): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;
    
    schedule.isActive = isActive;
    schedule.updatedAt = new Date();
    
    this.schedules.set(id, schedule);
    return schedule;
  }

  // Call history related methods
  async createCallHistory(data: any): Promise<CallHistoryEntry> {
    const id = this.currentCallHistoryId++;
    const now = new Date();
    
    const callHistoryEntry: CallHistoryEntry = {
      id,
      ...data,
      createdAt: now
    };
    
    this.callHistory.set(id, callHistoryEntry);
    return callHistoryEntry;
  }

  async getCallHistory(id: number): Promise<CallHistoryEntry | undefined> {
    return this.callHistory.get(id);
  }

  async getUserCallHistory(userId: number): Promise<CallHistoryEntry[]> {
    return Array.from(this.callHistory.values())
      .filter((call) => call.userId === userId)
      // Sort by call time (descending)
      .sort((a, b) => new Date(b.callTime).getTime() - new Date(a.callTime).getTime());
  }
}

export const storage = new MemStorage();
