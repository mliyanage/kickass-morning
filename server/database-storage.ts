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
  callHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, lt, gt, desc, sql } from "drizzle-orm";
import { IStorage } from "./storage";

// Helper function to convert weekdays from local timezone to UTC
function convertWeekdaysToUTC(
  weekdays: string,
  wakeupTime: string,
  timezone: string,
): string {
  try {
    const weekdayMap: { [key: string]: number } = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    const reverseMap: { [key: number]: string } = {
      0: "sun",
      1: "mon",
      2: "tue",
      3: "wed",
      4: "thu",
      5: "fri",
      6: "sat",
    };

    const localWeekdays = weekdays.split(",").map((d) => d.trim());
    const utcWeekdays: string[] = [];

    localWeekdays.forEach((localDay) => {
      const localDayNum = weekdayMap[localDay.toLowerCase()];
      if (localDayNum === undefined) return;

      // Create a sample date for this weekday in the user's timezone
      const today = new Date();
      const daysUntilTarget = (localDayNum + 7 - today.getDay()) % 7;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);

      // Set the wakeup time on the target date
      const [hours, minutes] = wakeupTime.split(":").map(Number);
      
      // Use the target date components (not today's date)
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const hour = String(hours).padStart(2, '0');
      const minute = String(minutes).padStart(2, '0');
      
      // Get timezone offset and create proper timezone-aware date
      const offsetStr = getTimezoneOffset(timezone);
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:00${offsetStr}`;
      const localTimeWithTz = new Date(isoString);
      
      console.log(`[WEEKDAY DEBUG] Converting ${localDay} ${hour}:${minute} in ${timezone}`);
      console.log(`[WEEKDAY DEBUG] Target date: ${targetDate.toDateString()}`);
      console.log(`[WEEKDAY DEBUG] ISO string: ${isoString}`);
      console.log(`[WEEKDAY DEBUG] Local date with timezone: ${localTimeWithTz.toString()}`);
      console.log(`[WEEKDAY DEBUG] UTC day number: ${localTimeWithTz.getUTCDay()}`);
      
      // Convert to UTC and get the day
      const utcDay = localTimeWithTz.getUTCDay();
      const utcDayName = reverseMap[utcDay];
      
      console.log(`[WEEKDAY DEBUG] UTC day name: ${utcDayName}`);

      if (utcDayName && !utcWeekdays.includes(utcDayName)) {
        utcWeekdays.push(utcDayName);
      }
    });

    return utcWeekdays.join(",");
  } catch (error) {
    console.error("Error converting weekdays to UTC:", error);
    // Fallback to original weekdays if conversion fails
    return weekdays;
  }
}

// Helper function to get timezone offset in format +/-HH:MM
function getTimezoneOffset(timezone: string): string {
  try {
    // This is the current time in UTC
    const now = new Date();

    // Format it once in UTC
    const utcFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // And once in the target timezone
    const tzFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // Get the parts of both
    const utcParts = utcFormatter.formatToParts(now);
    const tzParts = tzFormatter.formatToParts(now);

    // Extract hours and minutes
    const utcHour = parseInt(
      utcParts.find((part) => part.type === "hour")?.value || "0",
      10,
    );
    const utcMinute = parseInt(
      utcParts.find((part) => part.type === "minute")?.value || "0",
      10,
    );
    const tzHour = parseInt(
      tzParts.find((part) => part.type === "hour")?.value || "0",
      10,
    );
    const tzMinute = parseInt(
      tzParts.find((part) => part.type === "minute")?.value || "0",
      10,
    );

    // Compare dates to handle midnight crossing
    const utcDay = parseInt(
      utcParts.find((part) => part.type === "day")?.value || "0",
      10,
    );
    const tzDay = parseInt(
      tzParts.find((part) => part.type === "day")?.value || "0",
      10,
    );

    // Calculate offset in minutes
    let offsetMinutes = tzHour * 60 + tzMinute - (utcHour * 60 + utcMinute);

    // Handle day crossing scenarios
    if (tzDay > utcDay || (tzDay === 1 && utcDay > 27)) {
      // Timezone is ahead by a day
      offsetMinutes += 24 * 60;
    } else if (utcDay > tzDay || (utcDay === 1 && tzDay > 27)) {
      // Timezone is behind by a day
      offsetMinutes -= 24 * 60;
    }

    // Calculate hours and minutes of offset
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetRemainingMinutes = Math.abs(offsetMinutes) % 60;

    // Format the offset as +/-HH:MM
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const result = `${sign}${offsetHours.toString().padStart(2, "0")}:${offsetRemainingMinutes.toString().padStart(2, "0")}`;

    // Log detailed offset calculation for debugging
    console.log(`[TIMEZONE DEBUG] Calculated offset for ${timezone}:`);
    console.log(`  UTC:  Day ${utcDay}, Time ${utcHour}:${utcMinute}`);
    console.log(`  Local: Day ${tzDay}, Time ${tzHour}:${tzMinute}`);
    console.log(`  Offset minutes: ${offsetMinutes}`);
    console.log(`  Formatted offset: ${result}`);

    return result;
  } catch (error) {
    console.error(`Error getting timezone offset for ${timezone}:`, error);
    return "+00:00"; // Default to UTC if there's an error
  }
}

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
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPhone(
    userId: number,
    phone: string,
    verified: boolean,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        phone,
        phoneVerified: verified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async updateUserPersonalizationStatus(
    userId: number,
    isPersonalized: boolean,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        isPersonalized,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

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
    const [otpCode] = await db
      .insert(otpCodes)
      .values({
        email: data.email,
        code: data.code,
        type: data.type,
        expiresAt: data.expiresAt,
      })
      .returning();

    return otpCode;
  }

  async verifyEmailOtp(
    email: string,
    code: string,
    type: string,
  ): Promise<number | null> {
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
        ),
      );

    if (validOtp) {
      console.log(`[OTP Debug] Found matching OTP with type ${type}`);

      // Remove the verified OTP from database
      await db.delete(otpCodes).where(eq(otpCodes.id, validOtp.id));

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
      const [registrationOtp] = await db
        .select()
        .from(otpCodes)
        .where(
          and(
            eq(otpCodes.email, email),
            eq(otpCodes.code, code),
            eq(otpCodes.type, "register"),
            // We need the OTP's expiry to be later than now
            // lt(otpCodes.expiresAt, new Date())
          ),
        );

      if (registrationOtp) {
        console.log(
          `[OTP Debug] Found valid registration OTP, using for login`,
        );

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
          eq(otpCodes.code, code),
          // check if OTP is not expired
          // lt(new Date(), otpCodes.expiresAt)
        ),
      );

    if (validOtp) {
      console.log(
        `[OTP Debug] Found valid OTP with code ${code}, type ${validOtp.type}`,
      );

      // Remove the verified OTP from database
      await db.delete(otpCodes).where(eq(otpCodes.id, validOtp.id));

      return true;
    }

    console.log(
      `[OTP Debug] No valid OTP found for ${email} with code ${code}`,
    );
    return false;
  }

  // Phone OTP methods
  async createPhoneOtp(data: {
    userId: number;
    phone: string;
    code: string;
    expiresAt: Date;
  }): Promise<any> {
    const [otpCode] = await db
      .insert(otpCodes)
      .values({
        userId: data.userId,
        phone: data.phone,
        code: data.code,
        type: "phone",
        expiresAt: data.expiresAt,
      })
      .returning();

    return otpCode;
  }

  async verifyPhoneOtp(
    userId: number,
    phone: string,
    code: string,
  ): Promise<boolean> {
    // Find the latest valid OTP using the Drizzle ORM query but with a custom date comparison
    const currentDate = new Date().toISOString();

    const [validOtp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code),
        ),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    // Check expiration manually
    const isValid = validOtp && new Date(validOtp.expiresAt) > new Date();

    if (validOtp && isValid) {
      // Remove the verified OTP from database
      await db.delete(otpCodes).where(eq(otpCodes.id, validOtp.id));

      // For debugging
      console.log(
        `[OTP Debug] Valid OTP found and verified for user ${userId} and phone ${phone}`,
      );

      return true;
    } else if (validOtp && !isValid) {
      // For debugging
      console.log(
        `[OTP Debug] Found expired OTP (expired at ${validOtp.expiresAt}, now is ${new Date()})`,
      );

      // Clean up expired OTP
      await db.delete(otpCodes).where(eq(otpCodes.id, validOtp.id));
    }

    // For debugging
    console.log(
      `[OTP Debug] No valid OTP found for user ${userId} and phone ${phone} with code ${code}`,
    );

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
          sql`${otpCodes.expiresAt} > NOW()`,
        ),
      );

    return otps.length > 0;
  }

  async getPhoneOtps(userId: number, phone: string): Promise<any[]> {
    // Get all OTPs for this user and phone
    return await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.userId, userId), eq(otpCodes.phone, phone)))
      .orderBy(desc(otpCodes.createdAt));
  }

  // Personalization related methods
  async savePersonalization(
    userId: number,
    data: PersonalizationData,
  ): Promise<any> {
    console.log("Saving personalization data:", JSON.stringify(data, null, 2));

    // Check if personalization already exists for this user
    const [existingPers] = await db
      .select()
      .from(personalizations)
      .where(eq(personalizations.userId, userId));

    // Convert arrays to comma-separated values for storage
    const goalsValue =
      data.goals && data.goals.length > 0
        ? data.goals.join(",")
        : (data as any).goal || GoalType.EXERCISE;

    const strugglesValue =
      data.struggles && data.struggles.length > 0
        ? data.struggles.join(",")
        : (data as any).struggle || StruggleType.TIRED;

    console.log(
      `Converting goals array ${JSON.stringify(data.goals)} to string: ${goalsValue}`,
    );
    console.log(
      `Converting struggles array ${JSON.stringify(data.struggles)} to string: ${strugglesValue}`,
    );

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
          updatedAt: new Date(),
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
          customVoice: data.customVoice,
        } as any) // Type assertion to avoid TypeScript errors
        .returning();

      return personalization;
    }
  }

  async getPersonalization(
    userId: number,
  ): Promise<PersonalizationData | undefined> {
    const [personalization] = await db
      .select()
      .from(personalizations)
      .where(eq(personalizations.userId, userId));

    if (!personalization) return undefined;

    console.log(
      "Raw personalization data from DB:",
      JSON.stringify(personalization, null, 2),
    );

    // Convert comma-separated values to arrays for the expected format
    // For backward compatibility, handle both formats
    const goalValue = personalization.goal || "";
    const struggleValue = personalization.struggle || "";

    console.log(`Converting goal string: ${goalValue} to array`);
    console.log(`Converting struggle string: ${struggleValue} to array`);

    const result: PersonalizationData = {
      goals: goalValue.includes(",")
        ? goalValue.split(",").map((g) => g.trim() as GoalType)
        : [goalValue as GoalType],
      struggles: struggleValue.includes(",")
        ? struggleValue.split(",").map((s) => s.trim() as StruggleType)
        : [struggleValue as StruggleType],
      voice: personalization.voice,
    };

    console.log(
      "Converted personalization data:",
      JSON.stringify(result, null, 2),
    );

    // Handle optional fields
    if (personalization.otherGoal !== null)
      result.otherGoal = personalization.otherGoal;
    if (personalization.goalDescription !== null)
      result.goalDescription = personalization.goalDescription;
    if (personalization.otherStruggle !== null)
      result.otherStruggle = personalization.otherStruggle;
    if (personalization.customVoice !== null)
      result.customVoice = personalization.customVoice;

    return result;
  }

  // Schedule related methods
  async createSchedule(data: any): Promise<Schedule> {
    try {
      // Convert weekdays array to comma-separated string for storage
      const weekdaysStr = Array.isArray(data.weekdays)
        ? data.weekdays.join(",")
        : data.weekdays;

      // Calculate UTC weekdays for scheduling
      const weekdaysUTC = convertWeekdaysToUTC(
        weekdaysStr,
        data.wakeupTime,
        data.timezone,
      );

      // Convert local time to UTC time for scheduling
      const { format } = await import("date-fns-tz");

      // Get timezone offset
      const tzOffset = getTimezoneOffset(data.timezone);

      // Create a date object with the wake-up time in the user's timezone
      const timeComponents = data.wakeupTime
        .split(":")
        .map((n: string) => parseInt(n, 10));
      const today = new Date();
      today.setHours(timeComponents[0], timeComponents[1], 0, 0);

      // Create a date string in the user's timezone
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const timezonedDateStr = `${dateStr}T${data.wakeupTime}:00${tzOffset}`;

      // Parse it as a UTC time
      const utcTime = new Date(timezonedDateStr);
      const wakeupTimeUTC = utcTime.toISOString().substring(11, 16); // HH:MM format

      // For one-time schedules, also convert the date
      let dateUTC = null;
      if (!data.isRecurring && data.date) {
        // Create a date string with the scheduled date and time
        const [year, month, day] = data.date
          .split("-")
          .map((n: string) => parseInt(n, 10));
        const localDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${data.wakeupTime}:00${tzOffset}`;

        // Parse as UTC date
        const utcDate = new Date(localDateStr);
        dateUTC = utcDate.toISOString().substring(0, 10); // YYYY-MM-DD format
      }

      console.log(
        `Creating schedule: Local time ${data.wakeupTime} (${data.timezone}) -> UTC time ${wakeupTimeUTC}`,
      );
      if (dateUTC) {
        console.log(
          `One-time schedule: Local date ${data.date} -> UTC date ${dateUTC}`,
        );
      }

      // Insert schedule with both local and UTC times
      const [schedule] = await db
        .insert(schedules)
        .values({
          userId: data.userId,
          wakeupTime: data.wakeupTime, // Local time (for display)
          wakeupTimeUTC: wakeupTimeUTC, // UTC time (for scheduling)
          timezone: data.timezone,
          weekdays: weekdaysStr,
          weekdaysUTC: weekdaysUTC, // UTC weekdays (for scheduling)
          isRecurring: data.isRecurring,
          date: data.date || null, // Local date (for display)
          callRetry: data.callRetry,
          advanceNotice: data.advanceNotice,
          goalType: data.goalType,
          struggleType: data.struggleType,
          voiceId: data.voiceId,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
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
      const needsUTCUpdate =
        data.wakeupTime ||
        data.timezone ||
        data.date ||
        (data.isRecurring !== undefined && !data.isRecurring);

      let updateData = { ...data, updatedAt: new Date() };

      if (needsUTCUpdate) {
        // Get current schedule data
        const currentSchedule = await this.getSchedule(id);
        if (!currentSchedule) {
          throw new Error(`Schedule with id ${id} not found`);
        }

        // Prepare data for UTC conversion
        const timezone = data.timezone || currentSchedule.timezone;
        const wakeupTime = data.wakeupTime || currentSchedule.wakeupTime;
        const weekdays = data.weekdays || currentSchedule.weekdays;

        // Calculate UTC weekdays for scheduling
        const weekdaysStr = Array.isArray(weekdays) ? weekdays.join(",") : weekdays;
        const weekdaysUTC = convertWeekdaysToUTC(weekdaysStr, wakeupTime, timezone);

        // Get timezone offset string (e.g., "+10:00")
        const tzOffset = getTimezoneOffset(timezone);

        // Display timezone information for debugging
        console.log(`[TIMEZONE DEBUG] Calculated offset for ${timezone}:`);
        console.log(
          `  UTC:  Day ${new Date().getUTCDate()}, Time ${new Date().getUTCHours()}:${new Date().getUTCMinutes()}`,
        );
        console.log(
          `  Local: Day ${new Date().getDate()}, Time ${new Date().getHours()}:${new Date().getMinutes()}`,
        );
        console.log(`  Formatted offset: ${tzOffset}`);

        // Create an ISO date string with the timezone offset
        const today = new Date();
        const dateStr = today.toISOString().substring(0, 10); // YYYY-MM-DD
        const localTimeWithTz = `${dateStr}T${wakeupTime}:00${tzOffset}`;

        // Create a Date object and extract the UTC time
        let wakeupTimeUTC = "";
        try {
          const dateWithTz = new Date(localTimeWithTz);
          const utcHours = String(dateWithTz.getUTCHours()).padStart(2, "0");
          const utcMinutes = String(dateWithTz.getUTCMinutes()).padStart(
            2,
            "0",
          );
          wakeupTimeUTC = `${utcHours}:${utcMinutes}`;

          console.log(
            `[TIMEZONE DEBUG] Local time ${wakeupTime} in ${timezone} converted to UTC: ${wakeupTimeUTC}`,
          );
          console.log(
            `[TIMEZONE DEBUG] (Using ISO string: ${localTimeWithTz})`,
          );
        } catch (error) {
          console.error("Error converting time to UTC:", error);
          wakeupTimeUTC = wakeupTime; // Fallback to original time
        }

        // Handle date for one-time schedules
        let dateUTC = null;
        const isRecurring =
          data.isRecurring !== undefined
            ? data.isRecurring
            : currentSchedule.isRecurring;
        const date = data.date || currentSchedule.date;

        if (!isRecurring && date) {
          try {
            // Parse the date parts
            const [year, month, day] = date
              .split("-")
              .map((n: string) => parseInt(n, 10));

            // Create a date object for the scheduled date
            const scheduleDate = new Date(Date.UTC(year, month - 1, day));

            // Get the time components from wakeupTime
            const [hours, minutes] = wakeupTime.split(":").map(Number);
            
            // Apply the time to the schedule date
            scheduleDate.setUTCHours(hours, minutes, 0, 0);

            // Format the UTC date as YYYY-MM-DD
            dateUTC = `${scheduleDate.getUTCFullYear()}-${String(scheduleDate.getUTCMonth() + 1).padStart(2, "0")}-${String(scheduleDate.getUTCDate()).padStart(2, "0")}`;

            console.log(`Converted date: Local ${date} → UTC ${dateUTC}`);
          } catch (error) {
            console.error(`Error converting date to UTC: ${date}`, error);
            dateUTC = date; // Fallback to original date
          }
        }

        console.log(
          `Updating schedule ${id}: Local time ${wakeupTime} (${timezone}) -> UTC time ${wakeupTimeUTC}`,
        );
        if (dateUTC) {
          console.log(
            `One-time schedule: Local date ${date} -> UTC date ${dateUTC}`,
          );
        }

        // Add UTC fields to update data and reset call tracking fields
        updateData = {
          ...updateData,
          wakeupTimeUTC,
          weekdaysUTC,
          lastCalled: null,
          lastCallStatus: null,
          lastCallSid: null,
        };
      }

      // If weekdays is an array, convert to string
      if (Array.isArray(updateData.weekdays)) {
        updateData.weekdays = updateData.weekdays.join(",");
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
    return db.select().from(schedules).where(eq(schedules.userId, userId));
  }

  async updateScheduleStatus(
    id: number,
    isActive: boolean,
  ): Promise<Schedule | undefined> {
    const [schedule] = await db
      .update(schedules)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(schedules.id, id))
      .returning();

    return schedule;
  }

  // Call history related methods
  async createCallHistory(data: any): Promise<CallHistoryEntry> {
    // Ensure callSid is included in the data if provided
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

  // New methods for scheduler using UTC times
  async getPendingSchedules(
    currentTime: Date = new Date(),
  ): Promise<Schedule[]> {
    try {
      console.log(
        "Checking for pending schedules at",
        currentTime.toISOString(),
      );

      // Get current UTC time formatted as HH:MM
      const currentUTCTimeStr = currentTime.toISOString().substring(11, 16);

      // Use a backward-looking window to catch schedules that should have been called
      // This allows us to catch failed calls and avoid timing issues
      const tenMinutesAgo = new Date(currentTime.getTime() - 10 * 60 * 1000);
      const tenMinutesAgoUTCStr = tenMinutesAgo.toISOString().substring(11, 16);

      // Current day of week in UTC (0-6, starting with Sunday)
      const currentUTCDayOfWeek = currentTime.getUTCDay();
      const currentUTCDayStr = [
        "sun",
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
        "sat",
      ][currentUTCDayOfWeek];

      // Current date in UTC (YYYY-MM-DD)
      const currentUTCDateStr = currentTime.toISOString().split("T")[0];

      console.log(
        `Current UTC time: ${currentUTCTimeStr}, day: ${currentUTCDayStr}, date: ${currentUTCDateStr}`,
      );
      console.log(
        `Time window: ${tenMinutesAgoUTCStr} to ${currentUTCTimeStr}`,
      );

      // Query for pending schedules using UTC fields
      const pendingRecurringSchedules = await db
        .select()
        .from(schedules)
        .innerJoin(users, eq(schedules.userId, users.id))
        .where(
          and(
            eq(schedules.isActive, true),
            eq(schedules.isRecurring, true),
            // Check if today is one of the scheduled days using UTC weekdays
            sql`${schedules.weekdaysUTC} LIKE ${"%" + currentUTCDayStr + "%"}`,
            // Check if schedule time is within the backward-looking window (handle midnight crossing)
            sql`
              CASE 
                WHEN ${tenMinutesAgoUTCStr} > ${currentUTCTimeStr} THEN
                  -- Midnight crossing: schedule time should be >= start OR <= end
                  (${schedules.wakeupTimeUTC} >= ${tenMinutesAgoUTCStr} OR ${schedules.wakeupTimeUTC} <= ${currentUTCTimeStr})
                ELSE
                  -- Normal case: schedule time should be between start and end
                  (${schedules.wakeupTimeUTC} >= ${tenMinutesAgoUTCStr} AND ${schedules.wakeupTimeUTC} <= ${currentUTCTimeStr})
              END
            `,
            // Only consider schedules that have never been called before OR were called more than 5 minutes ago
            sql`(
              ${schedules.lastCalled} IS NULL 
              OR 
              ${schedules.lastCalled} < NOW() - INTERVAL '5 minutes'
            )`,

            // For recurring schedules, allow calls if:
            // 1. Never called before, OR
            // 2. Last call failed and retry is enabled, OR
            // 3. Last call is not in active states (initiated/in-progress/pending)
            // Note: Completed calls are allowed to run again for recurring schedules
            sql`(
              ${schedules.lastCallStatus} IS NULL
              OR 
              (${schedules.callRetry} = true AND ${schedules.lastCallStatus} = 'failed')
              OR
              (${schedules.lastCallStatus} NOT IN ('initiated', 'in-progress', 'pending'))
            )`,
          ),
        );

      // For now, skip one-time schedules (can be implemented later)
      const pendingOneTimeSchedules: any[] = [];

      // Extract just the schedule objects and combine results
      const results = [
        ...pendingRecurringSchedules.map((r) => r.schedules),
        ...pendingOneTimeSchedules.map((r) => r.schedules),
      ];

      console.log(
        `Found ${results.length} pending schedules in UTC (${pendingRecurringSchedules.length} recurring, ${pendingOneTimeSchedules.length} one-time)`,
      );

      return results;
    } catch (error) {
      console.error("Error checking pending schedules:", error);
      return [];
    }
  }

  async updateLastCalledTime(
    scheduleId: number,
    callSid: string,
    time: Date = new Date(),
    callStatus: CallStatus = CallStatus.PENDING,
  ): Promise<void> {
    try {
      // For now use raw SQL to avoid type conversion issues
      const lastCalledDate = time instanceof Date ? time : new Date();
      const isoString = lastCalledDate.toISOString();

      console.log(
        `Updating schedule ${scheduleId} with lastCalled:`,
        isoString,
        "status:",
        callStatus,
        "SID:",
        callSid,
      );

      const updateQuery = sql`
        UPDATE schedules 
        SET last_called = ${isoString}::timestamp,
            last_call_status = ${callStatus}, 
            last_call_sid = ${callSid},
            updated_at = NOW()
        WHERE id = ${scheduleId}
      `;

      await db.execute(updateQuery);

      console.log(
        `Updated last called time for schedule ${scheduleId} to ${isoString} with status ${callStatus}`,
      );

      // Verify the update worked by checking the database
      const verifyQuery = sql`
        SELECT last_call_sid, last_call_status 
        FROM schedules 
        WHERE id = ${scheduleId}
      `;
      const verifyResult = await db.execute(verifyQuery);
      const rows = verifyResult as any;
      if (rows && rows.length > 0) {
        console.log(
          `Verification: Schedule ${scheduleId} now has CallSid: ${rows[0].last_call_sid}, Status: ${rows[0].last_call_status}`,
        );
      }
    } catch (error) {
      console.error(
        `Error updating last called time for schedule ${scheduleId}:`,
        error,
      );
      // Print more details to debug the issue
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
    }
  }

  async updateCallStatus(
    callSid: string,
    status: CallStatus | undefined,
  ): Promise<void> {
    try {
      // Check if status is undefined and provide a fallback
      if (!status) {
        console.error(
          `Call status is undefined for SID ${callSid}, using "pending" as fallback`,
        );
        status = CallStatus.PENDING;
      }

      // Use the string value directly to avoid toString() issues
      const statusString = status;

      console.log(`Updating call status for SID ${callSid} to ${statusString}`);

      // Step 1: Update the call history record
      const updateQuery = sql`UPDATE call_history SET status = ${statusString} WHERE call_sid = ${callSid}`;

      await db.execute(updateQuery);

      // Step 2: Find the related schedule using the callSid
      // Use Drizzle ORM instead of raw SQL for better type safety
      const callHistoryEntry = await db
        .select({ scheduleId: callHistory.scheduleId })
        .from(callHistory)
        .where(eq(callHistory.callSid, callSid))
        .limit(1);



      // Step 3: If we found a related schedule, update its last call status too
      if (callHistoryEntry.length > 0 && callHistoryEntry[0].scheduleId) {
        const scheduleId = callHistoryEntry[0].scheduleId;

        // Use raw SQL to avoid type conversion issues
        const scheduleUpdateQuery = sql`
          UPDATE schedules 
          SET last_call_status = ${statusString}, 
              updated_at = NOW()
          WHERE id = ${scheduleId}
        `;

        await db.execute(scheduleUpdateQuery);

        console.log(
          `Updated schedule ${scheduleId} last call status to ${statusString}`,
        );
      }

      console.log(`Updated call status for SID ${callSid} to ${status}`);
    } catch (error) {
      console.error(`Error updating call status for SID ${callSid}:`, error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
    }
  }
}
