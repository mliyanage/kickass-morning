import { Button } from "@/components/ui/button";
import { Schedule } from "@/types";
import { Badge } from "@/components/ui/badge";

interface ScheduleItemProps {
  schedule: Schedule;
  onToggleSchedule: () => void;
  onEdit: () => void;
}

export default function ScheduleItem({
  schedule,
  onToggleSchedule,
  onEdit,
}: ScheduleItemProps) {


  // Format weekdays to comma-separated string
  const formatWeekdays = (weekdays: string[]): string => {
    const dayMap: Record<string, string> = {
      sun: "Sunday",
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
    };

    return weekdays.map((day) => dayMap[day] || day).join(", ");
  };

  // Get timezone display name
  const getTimezoneDisplay = (timezone: string): string => {
    // Extract the last part of the timezone identifier (the city/region name)
    const parts = timezone.split("/");
    const lastPart = parts[parts.length - 1];

    // Replace underscores with spaces and format the name
    return lastPart.replace(/_/g, " ");
  };

  // Format time with AM/PM indicator
  const formatTimeWithAmPm = (time: string): string => {
    // Input time is in HH:mm format (24-hour)
    const [hours, minutes] = time.split(':').map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="border rounded-md overflow-hidden mb-4">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 sm:px-6">
        <h3 className="text-sm font-medium text-gray-900">
          {schedule.isRecurring
            ? "Recurring Wakeup Call"
            : "One-time Wakeup Call"}
        </h3>
        <div className="flex space-x-1">
          <Badge variant={schedule.isActive ? "success" : "secondary"}>
            {schedule.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-gray-900 font-medium">
                {formatTimeWithAmPm(schedule.wakeupTime)} ({getTimezoneDisplay(schedule.timezone)})
              </span>
            </div>
            <div className="mt-2 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-gray-900">
                {schedule.isRecurring
                  ? formatWeekdays(Array.isArray(schedule.weekdays) ? schedule.weekdays : [schedule.weekdays as string])
                  : new Date(schedule.date as string).toLocaleDateString(
                      "en-US",
                      { weekday: "long", month: "short", day: "numeric" },
                    )}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button 
              variant={schedule.isActive ? "destructive" : "default"} 
              size="sm" 
              onClick={onToggleSchedule}
            >
              {schedule.isActive ? "Pause" : "Resume"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
