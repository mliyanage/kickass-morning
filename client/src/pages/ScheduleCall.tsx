import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ScheduleData } from "@/types";
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

// Timezone options
const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "America/Honolulu", label: "Hawaii-Aleutian Time (HAT)" },
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
  const [, setLocation] = useLocation();
  
  // Fetch user data to check phone verification status
  const { data: userData } = useQuery<{ authenticated: boolean, user: { phoneVerified: boolean } }>({
    queryKey: ['/api/auth/check'],
    retry: false,
    refetchOnWindowFocus: false
  });

  // Redirect to phone verification if phone is not verified
  useEffect(() => {
    if (userData && userData.authenticated && !userData.user.phoneVerified) {
      toast({
        title: "Phone verification required",
        description: "You need to verify your phone number before scheduling calls.",
      });
      setLocation("/phone-verification");
    }
  }, [userData, toast, setLocation]);
  
  // Schedule state
  const [wakeupTime, setWakeupTime] = useState("06:30");
  const [timezone, setTimezone] = useState("America/New_York");
  const [selectedDays, setSelectedDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [isRecurring, setIsRecurring] = useState(true);
  const [date, setDate] = useState("");
  const [callRetry, setCallRetry] = useState(true);
  const [advanceNotice, setAdvanceNotice] = useState(false);

  const scheduleMutation = useMutation({
    mutationFn: async (data: ScheduleData) => {
      return await apiRequest("POST", "/api/schedule", data);
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

  const sampleCallMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/call/sample", {});
    },
    onSuccess: () => {
      toast({
        title: "Sample call initiated",
        description: "A sample wakeup call will be sent to your phone shortly.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to start sample call",
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
    
    scheduleMutation.mutate(scheduleData);
  };

  const handleSampleCall = () => {
    sampleCallMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4 sm:px-6">
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Schedule Your Wakeup Call</h2>
          <p className="mt-1 text-sm text-gray-500">Set the time and days for your AI-powered wakeup call</p>
        </div>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <Label htmlFor="wakeup-time">Wakeup Time</Label>
                <Input 
                  id="wakeup-time" 
                  type="time" 
                  value={wakeupTime}
                  onChange={(e) => setWakeupTime(e.target.value)}
                  className="mt-1"
                  required
                />
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
            
            <div>
              <Label className="text-sm font-medium">Recurrence</Label>
              <RadioGroup className="mt-2" value={isRecurring ? "daily" : "once"} onValueChange={(val) => setIsRecurring(val === "daily")}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="recurring-daily" />
                    <Label htmlFor="recurring-daily">Daily (on selected days)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="once" id="recurring-once" />
                    <Label htmlFor="recurring-once">One-time only</Label>
                  </div>
                </div>
              </RadioGroup>
              
              {!isRecurring && (
                <div className="ml-7 mt-2">
                  <Label htmlFor="date-picker" className="block text-xs font-medium mb-1">Select Date</Label>
                  <Input 
                    id="date-picker" 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required={!isRecurring}
                  />
                </div>
              )}
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Call Settings</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="call-retry" 
                    checked={callRetry}
                    onCheckedChange={(checked) => setCallRetry(!!checked)}
                  />
                  <Label htmlFor="call-retry" className="text-sm">
                    Automatically retry call if not answered (up to 3 times)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="advance-notice" 
                    checked={advanceNotice}
                    onCheckedChange={(checked) => setAdvanceNotice(!!checked)}
                  />
                  <Label htmlFor="advance-notice" className="text-sm">
                    Send a reminder text 5 minutes before the call
                  </Label>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <Button 
                type="button" 
                variant="secondary" 
                className="mb-4"
                onClick={handleSampleCall}
                disabled={sampleCallMutation.isPending}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {sampleCallMutation.isPending ? "Initiating call..." : "Try a Sample Call Now"}
              </Button>
              <p className="text-xs text-gray-500">A sample wakeup call will be sent to your verified phone number immediately.</p>
            </div>
            
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
                {scheduleMutation.isPending ? "Saving..." : "Save Schedule"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
