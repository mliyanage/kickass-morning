import { 
  User, 
  InsertUser, 
  users,
  schedules,
  personalizations, 
  PersonalizationData, 
  CallStatus, 
  Schedule,
  CallHistoryEntry,
  otpCodes,
  callHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, gt, desc, sql } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // This method is kept for backward compatibility but deprecated
  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }
  
  // Backward compatibility methods for OTP
  async createOtpCode(data: { userId: number, phone: string, code: string, expiresAt: Date }): Promise<any> {
    return this.createPhoneOtp(data);
  }
  
  async verifyOtpCode(userId: number, phone: string, code: string): Promise<boolean> {
    return this.verifyPhoneOtp(userId, phone, code);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPhone(userId: number, phone: string, verified: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        phone, 
        phoneVerified: verified, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async updateUserPersonalizationStatus(userId: number, isPersonalized: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        isPersonalized, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  // OTP related methods
  // Email OTP methods
  async createEmailOtp(data: { email: string, code: string, type: string, expiresAt: Date }): Promise<any> {
    const [otpCode] = await db
      .insert(otpCodes)
      .values({
        email: data.email,
        code: data.code,
        type: data.type,
        expiresAt: data.expiresAt
      })
      .returning();
    
    return otpCode;
  }

  async verifyEmailOtp(email: string, code: string, type: string): Promise<number | null> {
    // First get the user if they exist
    const user = await this.getUserByEmail(email);
    
    // Find a matching OTP
    const [validOtp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code),
          eq(otpCodes.type, type),
          // We need the OTP's expiry to be later than now
          // new Date() > otpCodes.expiresAt
        )
      );
    
    if (validOtp) {
      console.log(`[OTP Debug] Found matching OTP with type ${type}`);
      
      // Remove the verified OTP from database
      await db.delete(otpCodes).where(eq(otpCodes.id, validOtp.id));
      
      // For login type, check if user exists
      if (type === 'login') {
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
    if (type === 'login' && user) {
      const [registrationOtp] = await db
        .select()
        .from(otpCodes)
        .where(
          and(
            eq(otpCodes.email, email),
            eq(otpCodes.code, code),
            eq(otpCodes.type, 'register')
            // We need the OTP's expiry to be later than now
            // lt(otpCodes.expiresAt, new Date())
          )
        );
      
      if (registrationOtp) {
        console.log(`[OTP Debug] Found valid registration OTP, using for login`);
        
        // Remove the verified OTP from database
        await db.delete(otpCodes).where(eq(otpCodes.id, registrationOtp.id));
        
        return user.id;
      }
    }
    
    console.log(`[OTP Debug] No valid OTP found for ${email}`);
    return null;
  }

  async verifyAnyEmailOtp(email: string, code: string): Promise<boolean> {
    // Find any valid OTP for this email
    const [validOtp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code)
          // check if OTP is not expired
          // lt(new Date(), otpCodes.expiresAt)
        )
      );
    
    if (validOtp) {
      console.log(`[OTP Debug] Found valid OTP with code ${code}, type ${validOtp.type}`);
      
      // Remove the verified OTP from database
      await db.delete(otpCodes).where(eq(otpCodes.id, validOtp.id));
      
      return true;
    }
    
    console.log(`[OTP Debug] No valid OTP found for ${email} with code ${code}`);
    return false;
  }

  // Phone OTP methods
  async createPhoneOtp(data: { userId: number, phone: string, code: string, expiresAt: Date }): Promise<any> {
    const [otpCode] = await db
      .insert(otpCodes)
      .values({
        userId: data.userId,
        phone: data.phone,
        code: data.code,
        type: 'phone',
        expiresAt: data.expiresAt
      })
      .returning();
    
    return otpCode;
  }

  async verifyPhoneOtp(userId: number, phone: string, code: string): Promise<boolean> {
    // Find the latest valid OTP using the Drizzle ORM query but with a custom date comparison
    const currentDate = new Date().toISOString();
    
    const [validOtp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code)
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    
    // Check expiration manually
    const isValid = validOtp && new Date(validOtp.expiresAt) > new Date();
    
    if (validOtp && isValid) {
      // Remove the verified OTP from database
      await db.delete(otpCodes).where(eq(otpCodes.id, validOtp.id));
      
      // For debugging
      console.log(`[OTP Debug] Valid OTP found and verified for user ${userId} and phone ${phone}`);
      
      return true;
    } else if (validOtp && !isValid) {
      // For debugging
      console.log(`[OTP Debug] Found expired OTP (expired at ${validOtp.expiresAt}, now is ${new Date()})`);
      
      // Clean up expired OTP
      await db.delete(otpCodes).where(eq(otpCodes.id, validOtp.id));
    }
    
    // For debugging
    console.log(`[OTP Debug] No valid OTP found for user ${userId} and phone ${phone} with code ${code}`);
    
    return false;
  }
  
  async hasActiveOtps(userId: number, phone: string): Promise<boolean> {
    // Find any active OTPs for this user and phone
    const otps = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.phone, phone),
          sql`${otpCodes.expiresAt} > NOW()`
        )
      );
    
    return otps.length > 0;
  }
  
  async getPhoneOtps(userId: number, phone: string): Promise<any[]> {
    // Get all OTPs for this user and phone
    return await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.phone, phone)
        )
      )
      .orderBy(desc(otpCodes.createdAt));
  }

  // Personalization related methods
  async savePersonalization(userId: number, data: PersonalizationData): Promise<any> {
    // Check if personalization already exists for this user
    const [existingPers] = await db
      .select()
      .from(personalizations)
      .where(eq(personalizations.userId, userId));
    
    if (existingPers) {
      // Update existing personalization
      const [personalization] = await db
        .update(personalizations)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(personalizations.userId, userId))
        .returning();
      
      return personalization;
    } else {
      // Create new personalization
      const [personalization] = await db
        .insert(personalizations)
        .values({
          userId,
          goal: data.goal,
          otherGoal: data.otherGoal,
          goalDescription: data.goalDescription,
          struggle: data.struggle,
          otherStruggle: data.otherStruggle,
          voice: data.voice,
          customVoice: data.customVoice
        })
        .returning();
      
      return personalization;
    }
  }

  async getPersonalization(userId: number): Promise<PersonalizationData | undefined> {
    const [personalization] = await db
      .select()
      .from(personalizations)
      .where(eq(personalizations.userId, userId));
    
    if (!personalization) return undefined;
    
    // Convert database null values to undefined for the PersonalizationData interface
    const result: PersonalizationData = {
      goal: personalization.goal as any,
      struggle: personalization.struggle as any,
      voice: personalization.voice
    };
    
    // Handle optional fields
    if (personalization.otherGoal !== null) result.otherGoal = personalization.otherGoal;
    if (personalization.goalDescription !== null) result.goalDescription = personalization.goalDescription;
    if (personalization.otherStruggle !== null) result.otherStruggle = personalization.otherStruggle;
    if (personalization.customVoice !== null) result.customVoice = personalization.customVoice;
    
    return result;
  }

  // Schedule related methods
  async createSchedule(data: any): Promise<Schedule> {
    const [schedule] = await db
      .insert(schedules)
      .values(data)
      .returning();
    
    return schedule;
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id));
    
    return schedule;
  }
  
  async updateSchedule(id: number, data: any): Promise<Schedule | undefined> {
    const [schedule] = await db
      .update(schedules)
      .set({ 
        ...data,
        updatedAt: new Date() 
      })
      .where(eq(schedules.id, id))
      .returning();
    
    return schedule;
  }

  async getUserSchedules(userId: number): Promise<Schedule[]> {
    return db
      .select()
      .from(schedules)
      .where(eq(schedules.userId, userId));
  }

  async updateScheduleStatus(id: number, isActive: boolean): Promise<Schedule | undefined> {
    const [schedule] = await db
      .update(schedules)
      .set({ 
        isActive, 
        updatedAt: new Date() 
      })
      .where(eq(schedules.id, id))
      .returning();
    
    return schedule;
  }

  // Call history related methods
  async createCallHistory(data: any): Promise<CallHistoryEntry> {
    const [callHistoryEntry] = await db
      .insert(callHistory)
      .values(data)
      .returning();
    
    return callHistoryEntry;
  }

  async getCallHistory(id: number): Promise<CallHistoryEntry | undefined> {
    const [callHistoryEntry] = await db
      .select()
      .from(callHistory)
      .where(eq(callHistory.id, id));
    
    return callHistoryEntry;
  }

  async getUserCallHistory(userId: number): Promise<CallHistoryEntry[]> {
    return db
      .select()
      .from(callHistory)
      .where(eq(callHistory.userId, userId))
      .orderBy(desc(callHistory.callTime));
  }
}