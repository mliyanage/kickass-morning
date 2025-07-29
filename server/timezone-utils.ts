import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { parse, getDay, addDays, startOfDay } from 'date-fns';

/**
 * Convert local time to UTC at runtime (DST-aware)
 */
export function convertLocalTimeToUTC(
  localTime: string, // "07:00"
  timezone: string,  // "Australia/Sydney"
  targetDate: Date = new Date()
): { utcTime: string; utcDay: string } {
  try {
    // Create a date object for the target date at the local time
    const localDateStr = format(targetDate, 'yyyy-MM-dd');
    const localDateTime = parse(
      `${localDateStr} ${localTime}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );

    // Convert to UTC considering DST
    const utcDateTime = fromZonedTime(localDateTime, timezone);
    
    // Format UTC time and get UTC day
    const utcTime = format(utcDateTime, 'HH:mm');
    const utcDayIndex = getDay(utcDateTime);
    const utcDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][utcDayIndex];

    return { utcTime, utcDay };
  } catch (error) {
    console.error('Error converting local time to UTC:', error);
    // Fallback to original time
    return { utcTime: localTime, utcDay: 'mon' };
  }
}

/**
 * Check if a schedule should run today based on local weekdays and timezone
 */
export function shouldScheduleRunToday(
  localWeekdays: string,    // "mon,tue,wed"
  localTime: string,        // "07:00"
  timezone: string,         // "Australia/Sydney"
  currentUTCTime: Date = new Date()
): boolean {
  try {
    const weekdaysArray = localWeekdays.split(',');
    
    // Check each weekday to see if any would map to today's UTC schedule
    for (const localDay of weekdaysArray) {
      const dayIndex = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(localDay);
      if (dayIndex === -1) continue;

      // Calculate what day this local schedule falls on in UTC
      const localDate = startOfDay(currentUTCTime);
      
      // Adjust to the target weekday
      const daysToAdd = (dayIndex - getDay(localDate) + 7) % 7;
      const targetLocalDate = addDays(localDate, daysToAdd);
      
      const { utcDay } = convertLocalTimeToUTC(localTime, timezone, targetLocalDate);
      
      // Check if this maps to today's UTC day
      const currentUTCDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][getDay(currentUTCTime)];
      
      if (utcDay === currentUTCDay) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if schedule should run today:', error);
    return false;
  }
}

/**
 * Get the current UTC time that corresponds to a local schedule time
 */
export function getScheduleUTCTimeForToday(
  localTime: string,        // "07:00"
  timezone: string,         // "Australia/Sydney"
  currentUTCTime: Date = new Date()
): string {
  const { utcTime } = convertLocalTimeToUTC(localTime, timezone, currentUTCTime);
  return utcTime;
}