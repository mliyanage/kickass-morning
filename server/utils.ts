/**
 * Utility functions for the wakeup call service
 */

// Generate a random 6-digit OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Calculate the next call time based on schedule settings
export function getNextCallTime(
  wakeupTime: string,
  timezone: string,
  weekdays: string[],
  isRecurring: boolean,
  date?: string
): Date | null {
  try {
    // For one-time calls
    if (!isRecurring && date) {
      const [hours, minutes] = wakeupTime.split(':').map(Number);
      const callDate = new Date(date);
      
      // Set the time
      callDate.setHours(hours);
      callDate.setMinutes(minutes);
      callDate.setSeconds(0);
      callDate.setMilliseconds(0);
      
      // Check if the date is in the past
      if (callDate.getTime() <= Date.now()) {
        return null;
      }
      
      return callDate;
    }
    
    // For recurring calls
    if (isRecurring && weekdays.length > 0) {
      const now = new Date();
      const [hours, minutes] = wakeupTime.split(':').map(Number);
      
      // Map weekday strings to day indices (0 = Sunday, 1 = Monday, etc.)
      const dayIndices = weekdays.map(day => {
        switch(day) {
          case 'sun': return 0;
          case 'mon': return 1;
          case 'tue': return 2;
          case 'wed': return 3;
          case 'thu': return 4;
          case 'fri': return 5;
          case 'sat': return 6;
          default: return -1;
        }
      }).filter(index => index !== -1);
      
      if (dayIndices.length === 0) {
        return null;
      }
      
      // Get current day index
      const currentDayIndex = now.getDay();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Find the next day index
      let nextDayIndex = dayIndices.find(day => 
        (day > currentDayIndex) || 
        (day === currentDayIndex && (hours > currentHour || (hours === currentHour && minutes > currentMinute)))
      );
      
      // If no day found, wrap around to the first day of next week
      if (nextDayIndex === undefined) {
        nextDayIndex = dayIndices[0];
      }
      
      // Calculate days to add
      let daysToAdd = 0;
      if (nextDayIndex > currentDayIndex) {
        daysToAdd = nextDayIndex - currentDayIndex;
      } else if (nextDayIndex < currentDayIndex) {
        daysToAdd = 7 - currentDayIndex + nextDayIndex;
      } else {
        // Same day, but check if time has passed
        if (hours > currentHour || (hours === currentHour && minutes > currentMinute)) {
          daysToAdd = 0; // Later today
        } else {
          daysToAdd = 7; // Next week, same day
        }
      }
      
      // Create the next call date
      const nextCallDate = new Date(now);
      nextCallDate.setDate(now.getDate() + daysToAdd);
      nextCallDate.setHours(hours);
      nextCallDate.setMinutes(minutes);
      nextCallDate.setSeconds(0);
      nextCallDate.setMilliseconds(0);
      
      return nextCallDate;
    }
    
    return null;
  } catch (error) {
    console.error("Error calculating next call time:", error);
    return null;
  }
}

// Format time for display (e.g., "6:30 AM")
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Format date for display (e.g., "May 4, 2023")
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}
