import { Button } from "@/components/ui/button";
import { Schedule, GoalType, StruggleType } from "@/types";
import { Badge } from "@/components/ui/badge";

interface ScheduleItemProps {
  schedule: Schedule;
  onSkipTomorrow: () => void;
  onEdit: () => void;
}

export default function ScheduleItem({ schedule, onSkipTomorrow, onEdit }: ScheduleItemProps) {
  // Format goal type to readable string
  const formatGoalType = (goalType: GoalType): string => {
    switch (goalType) {
      case GoalType.EXERCISE:
        return "Morning Exercise";
      case GoalType.PRODUCTIVITY:
        return "Work Productivity";
      case GoalType.STUDY:
        return "Study or Learning";
      case GoalType.MEDITATION:
        return "Meditation & Mindfulness";
      case GoalType.CREATIVE:
        return "Creative Projects";
      case GoalType.OTHER:
        return "Custom Goal";
      default:
        return "Unknown Goal";
    }
  };

  // Format struggle type to readable string
  const formatStruggleType = (struggleType: StruggleType): string => {
    switch (struggleType) {
      case StruggleType.TIRED:
        return "Feeling tired and groggy";
      case StruggleType.LACK_OF_MOTIVATION:
        return "Lack of motivation";
      case StruggleType.SNOOZE:
        return "Hitting snooze multiple times";
      case StruggleType.STAY_UP_LATE:
        return "Staying up too late";
      case StruggleType.OTHER:
        return "Custom struggle";
      default:
        return "Unknown struggle";
    }
  };

  // Format weekdays to comma-separated string
  const formatWeekdays = (weekdays: string[]): string => {
    const dayMap: Record<string, string> = {
      'sun': 'Sunday',
      'mon': 'Monday',
      'tue': 'Tuesday',
      'wed': 'Wednesday',
      'thu': 'Thursday',
      'fri': 'Friday',
      'sat': 'Saturday'
    };
    
    return weekdays.map(day => dayMap[day] || day).join(', ');
  };

  // Get timezone display name
  const getTimezoneDisplay = (timezone: string): string => {
    return timezone.replace('America/', '');
  };

  return (
    <div className="border rounded-md overflow-hidden mb-4">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 sm:px-6">
        <h3 className="text-sm font-medium text-gray-900">
          {schedule.isRecurring ? "Recurring Wakeup Call" : "One-time Wakeup Call"}
        </h3>
        <div className="flex space-x-1">
          <Badge variant={schedule.isActive ? "success" : "secondary"}>
            {schedule.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-900">
                {schedule.wakeupTime} ({getTimezoneDisplay(schedule.timezone)})
              </span>
            </div>
            <div className="mt-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-900">
                {schedule.isRecurring 
                  ? formatWeekdays(schedule.weekdays) 
                  : new Date(schedule.date as string).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="mt-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-sm text-gray-900">{schedule.voiceId}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm text-gray-900">{formatGoalType(schedule.goalType)}</span>
            </div>
            <div className="mt-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-900">{formatStruggleType(schedule.struggleType)}</span>
            </div>
            <div className="flex mt-4 justify-end space-x-3">
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={onSkipTomorrow}>
                Skip Tomorrow
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
