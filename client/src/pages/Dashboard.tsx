import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Schedule, CallHistory } from "@/types";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import ScheduleItem from "@/components/ScheduleItem";
import CallHistoryItem from "@/components/CallHistoryItem";
import { PersonalizationSection } from "@/components/PersonalizationSection";
import { Button } from "@/components/ui/button";
import { AlertCircle, Phone, Play } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Helper function to format timezone display
const formatTimezone = (timezone: string): string => {
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

interface UserData {
  authenticated: boolean;
  user: {
    id: number;
    email: string;
    name: string;
    phone: string | null;
    phoneVerified: boolean;
    isPersonalized: boolean;
  };
}

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get user data for phone verification check
  const { data: userData } = useQuery<UserData>({
    queryKey: ["/api/auth/check"],
  });

  // Get user schedules
  const {
    data: schedules = [],
    isLoading: isLoadingSchedules,
    error: schedulesError,
  } = useQuery<Schedule[]>({
    queryKey: ["/api/schedule"],
    gcTime: 0,
  });

  // Get call history
  const {
    data: callHistory = [],
    isLoading: isLoadingHistory,
    error: historyError,
  } = useQuery<CallHistory[]>({
    queryKey: ["/api/call/history"],
    gcTime: 0,
  });

  // Sample call mutation
  const sampleCallMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/call/sample", {});
    },
    onSuccess: () => {
      toast({
        title: "Sample call initiated",
        description: "A sample wakeup call will be sent to your phone shortly.",
      });
      // Refresh call history after a short delay to show the new call
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/call/history"] });
      }, 2000);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to start sample call",
        description: error.message || "Please try again later.",
      });
    },
  });

  const handleSampleCall = async () => {
    try {
      // Get the latest user data from the server to ensure phone verification status is current
      const authCheckResponse = await apiRequest("GET", "/api/auth/check");
      const latestUserData = authCheckResponse;

      // Check if user has verified phone using the latest data
      if (
        latestUserData &&
        latestUserData.user &&
        !latestUserData.user.phoneVerified
      ) {
        toast({
          title: "Phone verification required",
          description: "Please verify your phone number to receive calls.",
        });
        localStorage.setItem("phoneVerificationReturnUrl", "/dashboard");
        setLocation("/phone-verification");
        return;
      }

      // Proceed with the sample call
      sampleCallMutation.mutate();
    } catch (error) {
      console.error("Error checking auth status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not verify your phone status. Please try again.",
      });
    }
  };

  // Next scheduled call
  const nextCall = schedules.find((schedule: Schedule) => schedule.isActive);

  // Format the next call time and date
  const getNextCallText = () => {
    if (!nextCall) return "No upcoming calls scheduled";

    const weekdayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const today = new Date();
    const todayDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    if (nextCall.isRecurring) {
      // Find the next occurrence
      const weekdaysArray = Array.isArray(nextCall.weekdays)
        ? nextCall.weekdays
        : [nextCall.weekdays];
      const dayIndices = weekdaysArray
        .map((day: string) => {
          switch (day) {
            case "sun":
              return 0;
            case "mon":
              return 1;
            case "tue":
              return 2;
            case "wed":
              return 3;
            case "thu":
              return 4;
            case "fri":
              return 5;
            case "sat":
              return 6;
            default:
              return -1;
          }
        })
        .filter((index: number) => index !== -1);

      // Find the next day index that's >= today
      let nextDayIndex = dayIndices.find((day: number) => day >= todayDay);

      // If not found, wrap around to the first day of next week
      if (nextDayIndex === undefined && dayIndices.length > 0) {
        nextDayIndex = dayIndices[0];
      }

      if (nextDayIndex !== undefined) {
        const dayName = weekdayNames[nextDayIndex];
        // Format the timezone for display
        const formattedTimezone = formatTimezone(nextCall.timezone);
        return `${nextDayIndex === todayDay ? "Today" : dayName} at ${formatTimeWithAmPm(nextCall.wakeupTime)} (${formattedTimezone})`;
      }
    } else if (nextCall.date) {
      const callDate = new Date(nextCall.date);
      const formattedDate = callDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      // Format the timezone for display
      const formattedTimezone = formatTimezone(nextCall.timezone);
      return `${formattedDate} at ${formatTimeWithAmPm(nextCall.wakeupTime)} (${formattedTimezone})`;
    }

    return "Schedule details unavailable";
  };

  // Toggle schedule status mutation
  const toggleScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return await apiRequest("POST", `/api/schedule/${scheduleId}/toggle`, {});
    },
    onSuccess: (data) => {
      toast({
        title:
          data.action === "resumed" ? "Schedule resumed" : "Schedule paused",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update schedule",
        description: error.message || "Please try again later.",
      });
    },
  });

  const handleToggleSchedule = (scheduleId: number) => {
    toggleScheduleMutation.mutate(scheduleId);
  };

  if (isLoadingSchedules || isLoadingHistory) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p>Loading your dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (schedulesError || historyError) {
    return (
      <DashboardLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">
                Error Loading Dashboard
              </h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              {schedulesError?.message ||
                historyError?.message ||
                "Failed to load your data. Please try again."}
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          ⚡ Ready to Take Charge, Boss!
        </h1>
        <p className="text-lg text-gray-600">
          Welcome to your KickAss Morning Dashboard.
        </p>
      </div>

      {/* Personalization Section */}
      <PersonalizationSection />

      {/* Hero/Call-to-Action Section */}
      <div className="shadow sm:rounded-md sm:overflow-hidden mb-6">
        <div className="bg-white py-6 px-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                🔹 Try a Sample Call
              </h2>
              <p className="text-gray-600 mt-1">
                Experience your first AI-powered wake-up 💥
              </p>
            </div>
          </div>
          
          <div>
            <p className="text-gray-600 mb-6">
              Not sure what to expect? Hear a personalized motivational
              message sent to your phone — just like your real wake-up call.
            </p>

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                {userData?.user?.phoneVerified ? (
                  <div className="flex items-center text-sm text-green-700 mb-4">
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="font-medium">
                      Ready to call: {userData.user.phone} ✓
                    </span>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <div className="text-yellow-600 mr-3">🔒</div>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Your phone isn't verified yet.
                        </p>
                        <p className="text-sm text-yellow-700">
                          → Verify now to unlock your first wake-up preview.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                <Button
                  size="lg"
                  className="w-full md:w-auto"
                  onClick={handleSampleCall}
                  disabled={sampleCallMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {sampleCallMutation.isPending
                    ? "Initiating call..."
                    : "Try It Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wakeup Schedule Section */}
      <div className="shadow sm:rounded-md sm:overflow-hidden">
        <div className="bg-white py-6 px-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                🔹 Your Wake-Up Schedule
              </h2>
              <p className="text-gray-600 mt-1">
                ⏰ Let's set up your first real wake-up call.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                No more snoozing. No more excuses. Choose a time, pick your
                voice, and let us kickstart your morning.
              </p>
            </div>
            <Button
              onClick={() => {
                const { user } = userData || {};
                if (user && !user.phoneVerified) {
                  localStorage.setItem(
                    "phoneVerificationReturnUrl",
                    "/schedule-call",
                  );
                  setLocation("/phone-verification");
                } else {
                  setLocation("/schedule-call");
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Call
            </Button>
          </div>

          {nextCall && (
            <div className="bg-primary-50 rounded-lg p-4 flex items-start mb-6">
              <div className="flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-primary-800">
                  Your next wakeup call
                </h3>
                <div className="mt-2 text-sm text-primary-700">
                  <p>{getNextCallText()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Active wakeup schedule */}
          {schedules && schedules.length > 0 ? (
            schedules
              .sort((a: Schedule, b: Schedule) => {
                // Sort by active status first (active = true comes first)
                if (a.isActive !== b.isActive) {
                  return a.isActive ? -1 : 1;
                }
                // Then sort by time for schedules with same active status
                return a.wakeupTime.localeCompare(b.wakeupTime);
              })
              .map((schedule: Schedule) => (
                <ScheduleItem
                  key={schedule.id}
                  schedule={schedule}
                  onToggleSchedule={() => handleToggleSchedule(schedule.id)}
                  onEdit={() => setLocation(`/schedule-call?id=${schedule.id}`)}
                />
              ))
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-md">
              <div className="text-4xl mb-4">⏰</div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Let's get your first wake-up win
              </p>
              <p className="text-gray-500 mb-6">
                Ready to ditch the snooze button and start crushing your
                mornings?
              </p>
              <Button
                size="lg"
                className="mt-4"
                onClick={() => {
                  const { user } = userData || {};
                  if (user && !user.phoneVerified) {
                    localStorage.setItem(
                      "phoneVerificationReturnUrl",
                      "/schedule-call",
                    );
                    setLocation("/phone-verification");
                  } else {
                    setLocation("/schedule-call");
                  }
                }}
              >
                🟡 Schedule a Call
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Call History Section */}
      <div className="shadow sm:rounded-md sm:overflow-hidden">
        <div className="bg-white py-6 px-4 sm:p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              🔹 Recent Call History
            </h2>
            <p className="text-gray-600 mt-1">
              Track your wins and streaks. This is how consistency starts.
            </p>
          </div>

          {callHistory && callHistory.length > 0 ? (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:pl-6"
                    >
                      Date & Time
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Voice
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Duration
                    </th>
                    <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {callHistory.slice(0, 5).map((call: CallHistory) => (
                    <CallHistoryItem key={call.id} call={call} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-md">
              <div className="text-4xl mb-4">📞</div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                No calls yet — but that's about to change
              </p>
              <p className="text-gray-500">
                Your winning streak starts with your first wake-up call
              </p>
            </div>
          )}

          {callHistory && callHistory.length > 5 && (
            <div className="mt-4 text-center">
              <a
                href="#"
                className="text-sm font-medium text-primary hover:text-primary/80"
                onClick={(e) => {
                  e.preventDefault();
                  setLocation("/call-history");
                }}
              >
                View all call history <span aria-hidden="true">→</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
