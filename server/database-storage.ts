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
    try {
      // Convert weekdays array to comma-separated string for storage
      const weekdaysStr = Array.isArray(data.weekdays) ? data.weekdays.join(',') : data.weekdays;
      
      // Convert local time to UTC time for scheduling
      const { zonedTimeToUtc, format } = await import('date-fns-tz');
      
      // Create a date object with the wake-up time in the user's timezone
      const timeComponents = data.wakeupTime.split(':').map(n => parseInt(n, 10));
      const today = new Date();
      today.setHours(timeComponents[0], timeComponents[1], 0, 0);
      
      // Convert to UTC
      const utcTime = zonedTimeToUtc(today, data.timezone);
      const wakeupTimeUTC = format(utcTime, 'HH:mm');
      
      // For one-time schedules, also convert the date
      let dateUTC = null;
      if (!data.isRecurring && data.date) {
        // Create a date object in local timezone
        const [year, month, day] = data.date.split('-').map(n => parseInt(n, 10));
        const localDate = new Date(year, month - 1, day); // Month is 0-indexed
        localDate.setHours(timeComponents[0], timeComponents[1], 0, 0);
        
        // Convert to UTC date
        const utcDate = zonedTimeToUtc(localDate, data.timezone);
        dateUTC = format(utcDate, 'yyyy-MM-dd');
      }
      
      console.log(`Creating schedule: Local time ${data.wakeupTime} (${data.timezone}) -> UTC time ${wakeupTimeUTC}`);
      if (dateUTC) {
        console.log(`One-time schedule: Local date ${data.date} -> UTC date ${dateUTC}`);
      }
      
      // Insert schedule with both local and UTC times
      const [schedule] = await db
        .insert(schedules)
        .values({
          userId: data.userId,
          wakeupTime: data.wakeupTime,       // Local time (for display)
          wakeupTimeUTC: wakeupTimeUTC,      // UTC time (for scheduling)
          timezone: data.timezone,
          weekdays: weekdaysStr,
          isRecurring: data.isRecurring,
          date: data.date || null,           // Local date (for display)
          dateUTC: dateUTC,                  // UTC date (for scheduling)
          callRetry: data.callRetry,
          advanceNotice: data.advanceNotice,
          goalType: data.goalType,
          struggleType: data.struggleType,
          voiceId: data.voiceId,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return schedule;
    } catch (error) {
      console.error("Error creating schedule:", error);
      throw error;
    }
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id));
    
    return schedule;
  }
  
  async updateSchedule(id: number, data: any): Promise<Schedule | undefined> {
    try {
      // Check if we're updating time or timezone related fields
      const needsUTCUpdate = data.wakeupTime || data.timezone || data.date || 
                            (data.isRecurring !== undefined && !data.isRecurring);

      let updateData = { ...data, updatedAt: new Date() };
      
      if (needsUTCUpdate) {
        // Get current schedule data
        const currentSchedule = await this.getSchedule(id);
        if (!currentSchedule) {
          throw new Error(`Schedule with id ${id} not found`);
        }

        // Prepare data for UTC conversion
        const { zonedTimeToUtc, format } = await import('date-fns-tz');
        const timezone = data.timezone || currentSchedule.timezone;
        const wakeupTime = data.wakeupTime || currentSchedule.wakeupTime;

        // Convert time to UTC
        const timeComponents = wakeupTime.split(':').map(n => parseInt(n, 10));
        const today = new Date();
        today.setHours(timeComponents[0], timeComponents[1], 0, 0);
        
        const utcTime = zonedTimeToUtc(today, timezone);
        const wakeupTimeUTC = format(utcTime, 'HH:mm');
        
        // Handle date for one-time schedules
        let dateUTC = null;
        const isRecurring = data.isRecurring !== undefined ? data.isRecurring : currentSchedule.isRecurring;
        const date = data.date || currentSchedule.date;
        
        if (!isRecurring && date) {
          const [year, month, day] = date.split('-').map(n => parseInt(n, 10));
          const localDate = new Date(year, month - 1, day);
          localDate.setHours(timeComponents[0], timeComponents[1], 0, 0);
          
          const utcDate = zonedTimeToUtc(localDate, timezone);
          dateUTC = format(utcDate, 'yyyy-MM-dd');
        }
        
        console.log(`Updating schedule ${id}: Local time ${wakeupTime} (${timezone}) -> UTC time ${wakeupTimeUTC}`);
        if (dateUTC) {
          console.log(`One-time schedule: Local date ${date} -> UTC date ${dateUTC}`);
        }
        
        // Add UTC fields to update data
        updateData = {
          ...updateData,
          wakeupTimeUTC,
          dateUTC
        };
      }
      
      // If weekdays is an array, convert to string
      if (Array.isArray(updateData.weekdays)) {
        updateData.weekdays = updateData.weekdays.join(',');
      }
      
      // Update the schedule
      const [schedule] = await db
        .update(schedules)
        .set(updateData)
        .where(eq(schedules.id, id))
        .returning();
      
      return schedule;
    } catch (error) {
      console.error(`Error updating schedule ${id}:`, error);
      throw error;
    }
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

  /**
   * Update all existing schedules to include UTC times based on their local times
   * This is a one-time migration function that should be run after adding the UTC columns
   */
  async migrateSchedulesToUTC(): Promise<void> {
    try {
      const { zonedTimeToUtc, format } = await import('date-fns-tz');
      
      // Get all schedules that don't have UTC times set
      const schedulesToUpdate = await db
        .select()
        .from(schedules)
        .where(sql`${schedules.wakeupTimeUTC} IS NULL`);
      
      console.log(`Found ${schedulesToUpdate.length} schedules to migrate to UTC`);
      
      // Update each schedule
      for (const schedule of schedulesToUpdate) {
        try {
          // Create reference date using today's date with the schedule's time
          // For example: '2025-04-29T05:30:00' for a 5:30 AM wakeup time
          const timeComponents = schedule.wakeupTime.split(':').map(n => parseInt(n, 10));
          const today = new Date();
          today.setHours(timeComponents[0], timeComponents[1], 0, 0);
          
          // Convert local time to UTC
          const utcTime = zonedTimeToUtc(today, schedule.timezone);
          const utcTimeStr = format(utcTime, 'HH:mm');
          
          // For one-time schedules, also convert the date
          let dateUTC = null;
          if (!schedule.isRecurring && schedule.date) {
            // Create a date object in local timezone
            const [year, month, day] = schedule.date.split('-').map(n => parseInt(n, 10));
            const localDate = new Date(year, month - 1, day); // Month is 0-indexed
            localDate.setHours(timeComponents[0], timeComponents[1], 0, 0);
            
            // Convert to UTC date
            const utcDate = zonedTimeToUtc(localDate, schedule.timezone);
            dateUTC = format(utcDate, 'yyyy-MM-dd');
          }
          
          // Update the schedule with UTC time
          await db
            .update(schedules)
            .set({
              wakeupTimeUTC: utcTimeStr,
              dateUTC: dateUTC,
              updatedAt: new Date()
            })
            .where(eq(schedules.id, schedule.id));
          
          console.log(`Migrated schedule ${schedule.id}: Local time ${schedule.wakeupTime} (${schedule.timezone}) -> UTC time ${utcTimeStr}`);
        } catch (error) {
          console.error(`Error migrating schedule ${schedule.id} to UTC:`, error);
        }
      }
      
      console.log('UTC migration complete');
    } catch (error) {
      console.error('Error migrating schedules to UTC:', error);
    }
  }

  // New methods for scheduler using UTC times
  async getPendingSchedules(currentTime: Date = new Date()): Promise<Schedule[]> {
    try {
      console.log("Checking for pending schedules at", currentTime.toISOString());
      
      // First, ensure all schedules have UTC times
      const schedulesWithoutUTC = await db
        .select()
        .from(schedules)
        .where(sql`${schedules.wakeupTimeUTC} IS NULL`)
        .limit(1);
      
      if (schedulesWithoutUTC.length > 0) {
        console.log("Found schedules without UTC times. Running one-time migration...");
        await this.migrateSchedulesToUTC();
      }
      
      // Get current UTC time formatted as HH:MM
      const currentUTCTimeStr = currentTime.toISOString().substring(11, 16);
      
      // Calculate time 10 minutes ago for the window
      const tenMinutesAgo = new Date(currentTime.getTime() - 10 * 60 * 1000);
      const tenMinutesAgoUTCStr = tenMinutesAgo.toISOString().substring(11, 16);
      
      // Current day of week in UTC (0-6, starting with Sunday)
      const currentUTCDayOfWeek = currentTime.getUTCDay();
      const currentUTCDayStr = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][currentUTCDayOfWeek];
      
      // Current date in UTC (YYYY-MM-DD)
      const currentUTCDateStr = currentTime.toISOString().split('T')[0];
      
      console.log(`Current UTC time: ${currentUTCTimeStr}, day: ${currentUTCDayStr}, date: ${currentUTCDateStr}`);
      console.log(`Time window: ${tenMinutesAgoUTCStr} to ${currentUTCTimeStr}`);
      
      // Query for pending schedules using UTC fields
      const pendingRecurringSchedules = await db
        .select()
        .from(schedules)
        .innerJoin(users, eq(schedules.userId, users.id))
        .where(
          and(
            eq(schedules.isActive, true),
            eq(schedules.isRecurring, true),
            // Check if today is one of the scheduled days
            sql`${schedules.weekdays} LIKE ${'%' + currentUTCDayStr + '%'}`,
            // Check if current time is within the window
            sql`${schedules.wakeupTimeUTC} >= ${tenMinutesAgoUTCStr} AND ${schedules.wakeupTimeUTC} <= ${currentUTCTimeStr}`,
            // Only consider schedules that:
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
      
      // For one-time schedules, check the UTC date and time
      const pendingOneTimeSchedules = await db
        .select()
        .from(schedules)
        .innerJoin(users, eq(schedules.userId, users.id))
        .where(
          and(
            eq(schedules.isActive, true),
            eq(schedules.isRecurring, false),
            // Check if today is the scheduled date in UTC
            eq(schedules.dateUTC, currentUTCDateStr),
            // Check if current time is within the window
            sql`${schedules.wakeupTimeUTC} >= ${tenMinutesAgoUTCStr} AND ${schedules.wakeupTimeUTC} <= ${currentUTCTimeStr}`,
            // Only consider schedules that:
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
      
      // Extract just the schedule objects and combine results
      const results = [
        ...pendingRecurringSchedules.map(r => r.schedules),
        ...pendingOneTimeSchedules.map(r => r.schedules)
      ];
      
      console.log(`Found ${results.length} pending schedules in UTC (${pendingRecurringSchedules.length} recurring, ${pendingOneTimeSchedules.length} one-time)`);
      
      return results;
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