import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Schedule, CallHistory } from "@/types";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ScheduleItem from "@/components/ScheduleItem";
import CallHistoryItem from "@/components/CallHistoryItem";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get user schedules
  const { 
    data: schedules, 
    isLoading: isLoadingSchedules,
    error: schedulesError
  } = useQuery({
    queryKey: ['/api/schedule'],
  });

  // Get call history
  const { 
    data: callHistory, 
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery({
    queryKey: ['/api/call/history'],
  });

  // Next scheduled call
  const nextCall = schedules?.find((schedule: Schedule) => schedule.isActive);

  // Format the next call time and date
  const getNextCallText = () => {
    if (!nextCall) return "No upcoming calls scheduled";

    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = new Date();
    const todayDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    if (nextCall.isRecurring) {
      // Find the next occurrence
      const dayIndices = nextCall.weekdays.map(day => {
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

      // Find the next day index that's >= today
      let nextDayIndex = dayIndices.find(day => day >= todayDay);
      
      // If not found, wrap around to the first day of next week
      if (nextDayIndex === undefined && dayIndices.length > 0) {
        nextDayIndex = dayIndices[0];
      }
      
      if (nextDayIndex !== undefined) {
        const dayName = weekdayNames[nextDayIndex];
        return `${nextDayIndex === todayDay ? 'Today' : dayName} at ${nextCall.wakeupTime} (${nextCall.timezone.replace('America/', '')})`;
      }
    } else if (nextCall.date) {
      const callDate = new Date(nextCall.date);
      const formattedDate = callDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      return `${formattedDate} at ${nextCall.wakeupTime} (${nextCall.timezone.replace('America/', '')})`;
    }
    
    return "Schedule details unavailable";
  };

  // Skip tomorrow's call mutation
  const skipTomorrowMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return await apiRequest("POST", `/api/schedule/${scheduleId}/skip-tomorrow`, {});
    },
    onSuccess: () => {
      toast({
        title: "Call skipped",
        description: "Tomorrow's wakeup call has been skipped.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to skip call",
        description: error.message || "Please try again later.",
      });
    }
  });

  const handleSkipTomorrow = (scheduleId: number) => {
    skipTomorrowMutation.mutate(scheduleId);
  };

  if (isLoadingSchedules || isLoadingHistory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <p>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (schedulesError || historyError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex mb-4 gap-2">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <h1 className="text-2xl font-bold text-gray-900">Error Loading Dashboard</h1>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                {schedulesError?.message || historyError?.message || "Failed to load your data. Please try again."}
              </p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content */}
          <div className="space-y-6 sm:px-6 lg:col-span-9 lg:px-0">
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="bg-white py-6 px-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg leading-6 font-medium text-gray-900">Your Wakeup Schedule</h2>
                  <Button onClick={() => setLocation("/schedule-call")}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Call
                  </Button>
                </div>
                
                {nextCall && (
                  <div className="bg-primary-50 rounded-lg p-4 flex items-start mb-6">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-primary-800">Your next wakeup call</h3>
                      <div className="mt-2 text-sm text-primary-700">
                        <p>{getNextCallText()}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Active wakeup schedule */}
                {schedules?.length > 0 ? (
                  schedules.map((schedule: Schedule) => (
                    <ScheduleItem 
                      key={schedule.id}
                      schedule={schedule}
                      onSkipTomorrow={() => handleSkipTomorrow(schedule.id)}
                      onEdit={() => setLocation(`/schedule-call?id=${schedule.id}`)}
                    />
                  ))
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-md">
                    <p className="text-gray-500">No schedules found. Create your first wakeup call schedule.</p>
                    <Button className="mt-4" onClick={() => setLocation("/schedule-call")}>
                      Schedule a Call
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Call History Section */}
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="bg-white py-6 px-4 sm:p-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900 mb-6">Recent Call History</h2>
                
                {callHistory?.length > 0 ? (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:pl-6">Date & Time</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Voice</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Duration</th>
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
                  <div className="text-center py-6 bg-gray-50 rounded-md">
                    <p className="text-gray-500">No call history yet. Schedule a call to get started.</p>
                  </div>
                )}
                
                {callHistory?.length > 5 && (
                  <div className="mt-4 text-center">
                    <a href="#" className="text-sm font-medium text-primary hover:text-primary/80">
                      View all call history <span aria-hidden="true">→</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
