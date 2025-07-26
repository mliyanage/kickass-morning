import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ScheduleData, Schedule, GoalType, StruggleType } from "@/types";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import AppLayout from "@/components/layouts/AppLayout";

// Timezone options
const timezones = [
  // North America
  { value: "America/New_York", label: "Eastern Time - New York (UTC-5/4)" },
  { value: "America/Chicago", label: "Central Time - Chicago (UTC-6/5)" },
  { value: "America/Denver", label: "Mountain Time - Denver (UTC-7/6)" },
  { value: "America/Los_Angeles", label: "Pacific Time - Los Angeles (UTC-8/7)" },
  { value: "America/Anchorage", label: "Alaska Time (UTC-9/8)" },
  { value: "America/Honolulu", label: "Hawaii Time (UTC-10)" },
  { value: "America/Toronto", label: "Eastern Time - Toronto (UTC-5/4)" },
  { value: "America/Vancouver", label: "Pacific Time - Vancouver (UTC-8/7)" },
  { value: "America/Mexico_City", label: "Mexico City (UTC-6/5)" },
  
  // Europe
  { value: "Europe/London", label: "London (UTC+0/1)" },
  { value: "Europe/Paris", label: "Paris, Berlin, Rome (UTC+1/2)" },
  { value: "Europe/Athens", label: "Athens, Helsinki (UTC+2/3)" },
  { value: "Europe/Moscow", label: "Moscow (UTC+3)" },
  
  // Asia
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Asia/Kolkata", label: "India (UTC+5:30)" },
  { value: "Asia/Bangkok", label: "Bangkok, Jakarta (UTC+7)" },
  { value: "Asia/Singapore", label: "Singapore, Manila (UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo, Seoul (UTC+9)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong, Beijing (UTC+8)" },
  
  // Australia & New Zealand
  { value: "Australia/Perth", label: "Perth (UTC+8)" },
  { value: "Australia/Sydney", label: "Sydney, Melbourne (UTC+10/11)" },
  { value: "Australia/Brisbane", label: "Brisbane (UTC+10)" },
  { value: "Pacific/Auckland", label: "Auckland (UTC+12/13)" },
  
  // South America
  { value: "America/Sao_Paulo", label: "São Paulo (UTC-3/2)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { value: "America/Santiago", label: "Santiago (UTC-4/3)" },
  
  // Africa
  { value: "Africa/Cairo", label: "Cairo (UTC+2)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (UTC+2)" },
  { value: "Africa/Lagos", label: "Lagos (UTC+1)" },
];

// Weekdays
const weekdays = [
  { value: "sun", label: "S", fullName: "Sunday" },
  { value: "mon", label: "M", fullName: "Monday" },
  { value: "tue", label: "T", fullName: "Tuesday" },
  { value: "wed", label: "W", fullName: "Wednesday" },
  { value: "thu", label: "T", fullName: "Thursday" },
  { value: "fri", label: "F", fullName: "Friday" },
  { value: "sat", label: "S", fullName: "Saturday" },
];

export default function ScheduleCall() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  
  // Parse the schedule ID from URL if present
  const getScheduleIdFromUrl = useCallback(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('id');
    console.log("URL parameter 'id':", id);
    const parsedId = id ? parseInt(id, 10) : null;
    return parsedId;
  }, []);
  
  // Schedule state with custom setters that log changes
  const [wakeupTime, _setWakeupTime] = useState("06:30");
  const setWakeupTime = (value: string) => {
    console.log("Setting wakeup time state to:", value);
    _setWakeupTime(value);
  };
  
  const [timezone, _setTimezone] = useState("America/New_York");
  const setTimezone = (value: string) => {
    console.log("Setting timezone state to:", value);
    _setTimezone(value);
  };
  
  // For new schedules, initialize with workdays (Mon-Fri)
  // For edit mode, this will be overwritten when schedule data loads
  const [selectedDays, _setSelectedDays] = useState<string[]>(() => {
    const scheduleId = getScheduleIdFromUrl();
    if (!scheduleId) {
      // Default selection for new schedules only
      console.log("Initializing with default weekdays for new schedule");
      return ["mon", "tue", "wed", "thu", "fri"];  
    }
    console.log("Initializing with empty weekdays for edit mode");
    return []; // Empty for edit mode, will be populated from data
  });
  
  const setSelectedDays = (value: string[]) => {
    console.log("Setting selectedDays state to:", value);
    _setSelectedDays(value);
  };
  const [isRecurring, setIsRecurring] = useState(true);
  const [date, setDate] = useState("");
  const [callRetry, setCallRetry] = useState(true);
  const [advanceNotice, setAdvanceNotice] = useState(false);
  
  // For debugging
  useEffect(() => {
    console.log("selectedDays changed:", selectedDays);
  }, [selectedDays]);

  // Fetch user data to check phone verification status
  const { data: userData, isLoading: isUserDataLoading } = useQuery<{ authenticated: boolean, user: { phoneVerified: boolean } }>({
    queryKey: ['/api/auth/check'],
    retry: false,
    refetchOnWindowFocus: false
  });

  // Fetch schedule data for editing
  const scheduleIdToEdit = getScheduleIdFromUrl();
  
  // Fetch the schedule if we're editing
  const { data: scheduleToEdit, isLoading: isLoadingSchedule } = useQuery<Schedule>({
    queryKey: ['/api/schedule', scheduleIdToEdit],
    queryFn: async () => {
      if (!scheduleIdToEdit) return null;
      
      console.log("Fetching schedule with ID:", scheduleIdToEdit);
      
      try {
        // Use the apiRequest helper which handles errors and json parsing consistently
        const allSchedules = await apiRequest('GET', '/api/schedule');
        console.log("All schedules:", allSchedules);
        
        // Find the specific schedule
        console.log("Looking for schedule with ID:", scheduleIdToEdit, "Type:", typeof scheduleIdToEdit);
        console.log("Schedule IDs in response:", allSchedules.map((s: Schedule) => s.id));
        
        const schedule = allSchedules.find((s: Schedule) => Number(s.id) === Number(scheduleIdToEdit)) || null;
        
        console.log("Found schedule for editing:", schedule);
        if (schedule) {
          console.log("Schedule data:", JSON.stringify(schedule));
          console.log("Wakeup time from API:", schedule.wakeupTime);
          console.log("Timezone from API:", schedule.timezone);
          console.log("Weekdays from API:", schedule.weekdays, "Type:", typeof schedule.weekdays);
          
          // Create a direct object to return to ensure no reference issues
          return {
            ...schedule,
            wakeupTime: schedule.wakeupTime,
            timezone: schedule.timezone,
            weekdays: Array.isArray(schedule.weekdays) ? [...schedule.weekdays] : []
          };
        } else {
          console.error("Schedule not found for ID:", scheduleIdToEdit);
          return null;
        }
      } catch (error) {
        console.error("Error fetching schedule:", error);
        throw error;
      }
    },
    enabled: !!scheduleIdToEdit && !!userData?.authenticated,
    // Prevent stale data by not caching
    gcTime: 0,
    staleTime: 0, // Always fetch fresh data for schedule edits
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false // Don't refetch on window focus
  });

  // Set initial editing state - needed to ensure the form knows it's in edit mode immediately
  useEffect(() => {
    if (scheduleIdToEdit) {
      console.log("Setting initial editing ID state:", scheduleIdToEdit);
      setEditingScheduleId(scheduleIdToEdit);
    }
  }, [scheduleIdToEdit]);

  // Set form data from the schedule we're editing
  useEffect(() => {
    if (scheduleToEdit) {
      console.log("Editing schedule with ID:", scheduleToEdit.id, "Full data:", scheduleToEdit);
      
      // First, update the simple fields
      setEditingScheduleId(scheduleToEdit.id);
      
      // Force-set the time to the correct value from the database
      if (scheduleToEdit.wakeupTime) {
        console.log("Setting wakeup time to:", scheduleToEdit.wakeupTime);
        // Explicitly create a properly formatted time string (HH:MM)
        const [hours, minutes] = scheduleToEdit.wakeupTime.split(':');
        const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        console.log("Formatted time for input:", formattedTime);
        setWakeupTime(formattedTime);
      }
      
      // Force-set the timezone
      if (scheduleToEdit.timezone) {
        console.log("Setting timezone to:", scheduleToEdit.timezone);
        setTimezone(scheduleToEdit.timezone);
      }
      
      // Set the other fields
      setIsRecurring(scheduleToEdit.isRecurring !== undefined ? scheduleToEdit.isRecurring : true);
      if (scheduleToEdit.date) {
        setDate(scheduleToEdit.date);
      }
      setCallRetry(scheduleToEdit.callRetry !== undefined ? scheduleToEdit.callRetry : true);
      setAdvanceNotice(scheduleToEdit.advanceNotice !== undefined ? scheduleToEdit.advanceNotice : false);
      
      // Now handle the weekdays separately
      let weekdaysArray: string[] = [];
      
      console.log("Processing weekdays data:", scheduleToEdit.weekdays);
      
      // Handle different formats of weekdays - could be array or string
      if (Array.isArray(scheduleToEdit.weekdays)) {
        weekdaysArray = [...scheduleToEdit.weekdays];
        console.log("Weekdays is already an array:", weekdaysArray);
      } else if (typeof scheduleToEdit.weekdays === 'string') {
        // Split by comma if it's a comma-separated string
        if (scheduleToEdit.weekdays.includes(',')) {
          weekdaysArray = scheduleToEdit.weekdays.split(','); 
        } else {
          // Otherwise it's a single day
          weekdaysArray = [scheduleToEdit.weekdays];
        }
        console.log("Converted weekdays string to array:", weekdaysArray);
      }
      
      // Make sure we can recognize all the days - trim any whitespace
      weekdaysArray = weekdaysArray.map(day => day.trim());
      
      console.log("Final weekdays array before setting state:", weekdaysArray);
      
      // Set the weekdays all at once instead of clearing first - this avoids the hooks issue
      if (weekdaysArray.length > 0) {
        console.log("Setting weekdays for edited schedule:", weekdaysArray);
        setSelectedDays(weekdaysArray);
      }
    }
  }, [scheduleToEdit]);

  // Handle phone verification check
  useEffect(() => {
    if (!isUserDataLoading) {
      if (userData && userData.authenticated) {
        if (!userData.user.phoneVerified) {
          // Store the intended destination
          localStorage.setItem("phoneVerificationReturnUrl", "/schedule-call");
          
          // Redirect to phone verification
          setLocation("/phone-verification");
        } else {
          // Phone is verified, proceed with rendering
          setIsLoading(false);
        }
      }
    }
  }, [userData, isUserDataLoading, setLocation]);

  const scheduleMutation = useMutation({
    mutationFn: async (data: ScheduleData) => {
      // If we're editing an existing schedule, append the id as a query parameter
      const endpoint = editingScheduleId ? `/api/schedule?id=${editingScheduleId}` : "/api/schedule";
      return await apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Schedule saved",
        description: "Your wakeup call has been scheduled successfully.",
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to save schedule",
        description: error.message || "Please try again later.",
      });
    }
  });



  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSelectAllDays = () => {
    setSelectedDays(weekdays.map(d => d.value));
  };

  const handleClearAllDays = () => {
    setSelectedDays([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wakeupTime) {
      toast({
        variant: "destructive",
        title: "Invalid time",
        description: "Please select a wakeup time.",
      });
      return;
    }
    
    if (selectedDays.length === 0 && isRecurring) {
      toast({
        variant: "destructive",
        title: "No days selected",
        description: "Please select at least one day for your wakeup call.",
      });
      return;
    }
    
    if (!isRecurring && !date) {
      toast({
        variant: "destructive",
        title: "No date selected",
        description: "Please select a date for your one-time wakeup call.",
      });
      return;
    }
    
    const scheduleData: ScheduleData = {
      wakeupTime,
      timezone,
      weekdays: selectedDays,
      isRecurring,
      date: !isRecurring ? date : undefined,
      callRetry,
      advanceNotice
    };
    
    console.log(`${editingScheduleId ? "Updating" : "Creating"} schedule:`, scheduleData);
    scheduleMutation.mutate(scheduleData);
  };



  // Show loading state while checking phone verification or loading schedule data
  if (isLoading || isUserDataLoading || (scheduleIdToEdit && isLoadingSchedule)) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p>{scheduleIdToEdit ? "Loading schedule data..." : "Loading..."}</p>
        </div>
      </AppLayout>
    );
  }

  // We've moved the default weekdays initialization to the useState declaration
  // This ensures it only runs once during component initialization
  // and doesn't conflict with the editing useEffect

  // Only render the schedule form if user is verified
  return (
    <AppLayout>
      <div className="shadow sm:rounded-md sm:overflow-hidden">
        <div className="bg-white py-6 px-4 sm:p-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {editingScheduleId ? "Edit Wakeup Call Schedule" : "Schedule Your Wakeup Call"}
          </h2>
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <Label htmlFor="wakeup-time">Wakeup Time</Label>
                    <Input 
                      id="wakeup-time" 
                      type="time" 
                      value={wakeupTime}
                      onChange={(e) => {
                        console.log("Time input changed from", wakeupTime, "to", e.target.value);
                        setWakeupTime(e.target.value);
                      }}
                      className="mt-1"
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Current value: {wakeupTime} (24h format) 
                      {wakeupTime && ` = ${new Date(`2023-01-01T${wakeupTime}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                    </div>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="timezone" className="mt-1">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {timezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Days of the Week</Label>
                    <div>
                      <Button 
                        variant="ghost" 
                        type="button" 
                        className="h-auto text-xs text-primary hover:text-primary/80"
                        onClick={handleSelectAllDays}
                      >
                        Select All
                      </Button>
                      <span className="text-gray-300 mx-1">|</span>
                      <Button 
                        variant="ghost" 
                        type="button" 
                        className="h-auto text-xs text-primary hover:text-primary/80"
                        onClick={handleClearAllDays}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {weekdays.map((day) => (
                      <div key={day.value}>
                        <input 
                          type="checkbox" 
                          id={`day-${day.value}`} 
                          checked={selectedDays.includes(day.value)}
                          onChange={() => handleDayToggle(day.value)}
                          className="sr-only peer" 
                        />
                        <label 
                          htmlFor={`day-${day.value}`} 
                          className="flex flex-col items-center justify-center rounded-md border border-gray-200 p-2 peer-checked:border-primary peer-checked:bg-primary/10 cursor-pointer hover:bg-gray-50"
                        >
                          <span className="block text-xs font-medium text-gray-700">{day.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Hidden sections - recurrence is default (recurring), call settings come later */}
                {/* Recurrence section hidden - all schedules are recurring by default */}
                {/* Call settings section hidden - automatic retry and reminders will be implemented later */}
                
                <Separator />
                
                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation("/dashboard")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={scheduleMutation.isPending}
                  >
                    {scheduleMutation.isPending ? "Saving..." : (editingScheduleId ? "Update Schedule" : "Save Schedule")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
