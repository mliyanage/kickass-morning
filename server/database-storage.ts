import { 
  User, 
  InsertUser, 
  users,
  schedules,
  personalizations, 
  PersonalizationData,
  GoalType,
  StruggleType, 
  CallStatus, 
  Schedule,
  CallHistoryEntry,
  otpCodes,
  callHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, lt, gt, desc, sql } from "drizzle-orm";
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
    console.log("Saving personalization data:", JSON.stringify(data, null, 2));
    
    // Check if personalization already exists for this user
    const [existingPers] = await db
      .select()
      .from(personalizations)
      .where(eq(personalizations.userId, userId));
    
    // Convert arrays to comma-separated values for storage
    const goalsValue = data.goals && data.goals.length > 0 
      ? data.goals.join(',') 
      : (data as any).goal || GoalType.EXERCISE;
      
    const strugglesValue = data.struggles && data.struggles.length > 0 
      ? data.struggles.join(',') 
      : (data as any).struggle || StruggleType.TIRED;
      
    console.log(`Converting goals array ${JSON.stringify(data.goals)} to string: ${goalsValue}`);
    console.log(`Converting struggles array ${JSON.stringify(data.struggles)} to string: ${strugglesValue}`);
    
    if (existingPers) {
      // Update existing personalization
      const [personalization] = await db
        .update(personalizations)
        .set({
          goal: goalsValue, // Store comma-separated goals
          otherGoal: data.otherGoal,
          goalDescription: data.goalDescription,
          struggle: strugglesValue, // Store comma-separated struggles
          otherStruggle: data.otherStruggle,
          voice: data.voice,
          customVoice: data.customVoice,
          updatedAt: new Date()
        } as any) // Type assertion to avoid TypeScript errors
        .where(eq(personalizations.userId, userId))
        .returning();
      
      return personalization;
    } else {
      // Create new personalization
      const [personalization] = await db
        .insert(personalizations)
        .values({
          userId,
          goal: goalsValue, // Store comma-separated goals
          otherGoal: data.otherGoal,
          goalDescription: data.goalDescription,
          struggle: strugglesValue, // Store comma-separated struggles
          otherStruggle: data.otherStruggle,
          voice: data.voice,
          customVoice: data.customVoice
        } as any) // Type assertion to avoid TypeScript errors
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
    
    console.log("Raw personalization data from DB:", JSON.stringify(personalization, null, 2));
    
    // Convert comma-separated values to arrays for the expected format
    // For backward compatibility, handle both formats
    const goalValue = personalization.goal || '';
    const struggleValue = personalization.struggle || '';
    
    console.log(`Converting goal string: ${goalValue} to array`);
    console.log(`Converting struggle string: ${struggleValue} to array`);
    
    const result: PersonalizationData = {
      goals: goalValue.includes(',') 
        ? goalValue.split(',').map(g => g.trim() as GoalType) 
        : [goalValue as GoalType],
      struggles: struggleValue.includes(',') 
        ? struggleValue.split(',').map(s => s.trim() as StruggleType) 
        : [struggleValue as StruggleType],
      voice: personalization.voice
    };
    
    console.log("Converted personalization data:", JSON.stringify(result, null, 2));
    
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

  // New methods for scheduler
  async getPendingSchedules(currentTime: Date = new Date()): Promise<Schedule[]> {
    // We'll fetch all active schedules first, then filter based on timezone conversion
    try {
      console.log("Checking for pending schedules at", currentTime.toISOString());
      
      // Get all active schedules - we'll filter them in memory with timezone awareness
      const allActiveSchedules = await db
        .select()
        .from(schedules)
        .innerJoin(users, eq(schedules.userId, users.id))
        .where(
          and(
            eq(schedules.isActive, true),
            // Check for call status/retry rules - these apply regardless of timezone
            or(
              // Have never been called before
              sql`${schedules.lastCalled} IS NULL`,
              // Were called more than 5 minutes ago
              sql`${schedules.lastCalled} < NOW() - INTERVAL '5 minutes'`
            ),
            // And if they've been called before, make sure it wasn't successfully answered
            or(
              sql`${schedules.lastCallStatus} IS NULL`,
              sql`${schedules.lastCallStatus} != ${CallStatus.ANSWERED}`,
              and(
                eq(schedules.callRetry, true),
                or(
                  sql`${schedules.lastCallStatus} = ${CallStatus.FAILED}`,
                  sql`${schedules.lastCallStatus} = ${CallStatus.MISSED}`
                )
              )
            )
          )
        );
      
      // Extract schedules from join results
      const allSchedules = allActiveSchedules.map(r => r.schedules);
      console.log(`Found ${allSchedules.length} active schedules to check against timezones`);
      
      // Import the required functions from date-fns-tz
      const { zonedTimeToUtc, utcToZonedTime, format } = await import('date-fns-tz');
      const { getDay } = await import('date-fns');
      
      // Current date in UTC for reference
      const now = currentTime;
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      
      // Filter schedules based on timezone comparison
      const pendingSchedules = allSchedules.filter(schedule => {
        try {
          // Get the current time in the user's timezone
          const userTimeZone = schedule.timezone;
          const userLocalTime = utcToZonedTime(now, userTimeZone);
          const userLocalTimeMinus10 = utcToZonedTime(tenMinutesAgo, userTimeZone);
          
          // Format times for comparison with the schedule's wakeup time
          const userCurrentTimeStr = format(userLocalTime, 'HH:mm');
          const userTenMinutesAgoStr = format(userLocalTimeMinus10, 'HH:mm');
          
          // Get day of week in user's timezone (0-6, where 0 is Sunday)
          const userDayOfWeek = getDay(userLocalTime);
          const userDayStr = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][userDayOfWeek];
          
          // For debugging
          console.log(`Schedule ${schedule.id}: User timezone=${userTimeZone}, ` +
                      `local time=${userCurrentTimeStr}, day=${userDayStr}, ` +
                      `wakeup time=${schedule.wakeupTime}, weekdays=${schedule.weekdays}`);
          
          // For recurring schedules, check if today is one of the scheduled days
          if (schedule.isRecurring) {
            const weekdaysArray = typeof schedule.weekdays === 'string' 
              ? schedule.weekdays.split(',') 
              : schedule.weekdays;
              
            const isDayMatch = weekdaysArray.includes(userDayStr);
            if (!isDayMatch) {
              console.log(`Schedule ${schedule.id}: Day doesn't match (user day: ${userDayStr}, schedule days: ${weekdaysArray})`);
              return false;
            }
          } else {
            // For one-time schedules, check if today is the scheduled date
            const todayStr = format(userLocalTime, 'yyyy-MM-dd');
            if (schedule.date !== todayStr) {
              console.log(`Schedule ${schedule.id}: Date doesn't match (user date: ${todayStr}, schedule date: ${schedule.date})`);
              return false;
            }
          }
          
          // Check if the current time is within the wakeup window
          const isTimeMatch = schedule.wakeupTime >= userTenMinutesAgoStr && 
                             schedule.wakeupTime <= userCurrentTimeStr;
                             
          if (!isTimeMatch) {
            console.log(`Schedule ${schedule.id}: Time doesn't match (user time window: ${userTenMinutesAgoStr}-${userCurrentTimeStr}, wakeup time: ${schedule.wakeupTime})`);
          } else {
            console.log(`Schedule ${schedule.id}: MATCH! Time to wake up!`);
          }
          
          return isTimeMatch;
        } catch (error) {
          console.error(`Error processing timezone for schedule ${schedule.id}:`, error);
          return false; // Skip this schedule if there's an error
        }
      });
      
      console.log(`Found ${pendingSchedules.length} pending schedules after timezone processing`);
      
      return pendingSchedules;
    } catch (error) {
      console.error("Error checking pending schedules:", error);
      return [];
    }
  }
  
  async updateLastCalledTime(
    scheduleId: number, 
    time: Date = new Date(), 
    callStatus: CallStatus = CallStatus.PENDING,
    callSid?: string
  ): Promise<void> {
    try {
      await db
        .update(schedules)
        .set({
          lastCalled: time.toISOString(), // Convert Date to ISO string for storage
          lastCallStatus: callStatus,
          lastCallSid: callSid || null,
          updatedAt: new Date()
        } as any) // Type assertion to avoid TypeScript errors
        .where(eq(schedules.id, scheduleId));
      
      console.log(`Updated last called time for schedule ${scheduleId} to ${time.toISOString()} with status ${callStatus}`);
    } catch (error) {
      console.error(`Error updating last called time for schedule ${scheduleId}:`, error);
    }
  }
  
  async updateCallStatus(callSid: string, status: CallStatus, recordingUrl?: string): Promise<void> {
    try {
      // Step 1: Update the call history record
      const updateQuery = recordingUrl 
        ? sql`UPDATE call_history SET status = ${status}, recording_url = ${recordingUrl} WHERE call_sid = ${callSid}`
        : sql`UPDATE call_history SET status = ${status} WHERE call_sid = ${callSid}`;
      
      await db.execute(updateQuery);
      
      // Step 2: Find the related schedule using the callSid
      // First, get the call history entry to find the schedule ID
      const result = await db.execute(
        sql`SELECT schedule_id FROM call_history WHERE call_sid = ${callSid}`
      );
      
      // Extract the result from the QueryResult
      const rows = result as any;
      
      // Step 3: If we found a related schedule, update its last call status too
      if (rows && rows.length > 0 && rows[0].schedule_id) {
        const scheduleId = rows[0].schedule_id;
        await db
          .update(schedules)
          .set({
            lastCallStatus: status,
            updatedAt: new Date()
          } as any)
          .where(eq(schedules.id, scheduleId));
        
        console.log(`Updated schedule ${scheduleId} last call status to ${status}`);
      }
      
      console.log(`Updated call status for SID ${callSid} to ${status}`);
    } catch (error) {
      console.error(`Error updating call status for SID ${callSid}:`, error);
    }
  }
}