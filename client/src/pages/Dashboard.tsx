import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, 
  Calendar, 
  Clock,
  Play,
  RefreshCw
} from "lucide-react";
import AppLayout from "@/components/layouts/AppLayout";
import { PersonalizationSection } from "@/components/PersonalizationSection";
import ScheduleItem from "@/components/ScheduleItem";
import CallHistoryItem from "@/components/CallHistoryItem";
import GuidedModal from "@/components/GuidedModal";
import PaymentUpsell from "@/components/PaymentUpsell";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// Use proper types from the API responses
interface User {
  id: number;
  name?: string | null;
  email: string;
  phone?: string | null;
  phoneVerified: boolean;
  isPersonalized: boolean;
  timezone?: string;
  callCredits: number;
}

interface UserData {
  user: User;
}

interface PersonalizationData {
  goals: string[];
  struggles: string[];
  otherGoal?: string;
  otherStruggle?: string;
  goalDescription?: string;
  voice: string;
}

interface Schedule {
  id: number;
  userId: number;
  wakeupTime: string;
  timezone: string;
  weekdays: string[];
  isActive: boolean;
  isRecurring: boolean;
  date?: string;
  voiceName?: string;
  callRetry?: number;
  advanceNotice?: number;
  goalType?: string;
  struggleType?: string;
  voiceId?: string;
  createdAt: string;
  updatedAt?: string;
}

interface CallHistory {
  id: number;
  userId: number;
  scheduleId?: number;
  phoneNumber?: string;
  scheduledTime?: string;
  callTime?: string;
  actualCallTime?: string;
  duration?: number | null;
  status: string;
  voice?: string;
  voiceName?: string;
  recordingUrl?: string | null;
  twilioCallSid?: string | null;
  createdAt: string;
  timezone?: string;
}

interface UserCredits {
  callCredits: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modal states
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [showSampleCallModal, setShowSampleCallModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Refs for scrolling
  const personalizationRef = useRef<HTMLDivElement>(null);
  const sampleCallRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);

  // Scroll to section helper
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Get user data for phone verification check (using original working endpoint)
  const { data: userData, error: userError, isLoading: userLoading } = useQuery<UserData>({ 
    queryKey: ["/api/auth/check"],
    retry: 1,
    retryDelay: 1000
  });

  const { data: schedules, isLoading: schedulesLoading, error: schedulesError } = useQuery<Schedule[]>({ 
    queryKey: ["/api/schedule"],
    retry: 1,
    retryDelay: 1000,
    enabled: !!userData?.user
  });

  const { data: callHistory, isLoading: historyLoading, error: historyError } = useQuery<CallHistory[]>({ 
    queryKey: ["/api/call/history"],
    retry: 1,
    retryDelay: 1000,
    enabled: !!userData?.user
  });

  const { data: userCredits, isLoading: creditsLoading, refetch: refetchCredits } = useQuery<UserCredits>({ 
    queryKey: ["/api/user/trial-status"],
    retry: 1,
    retryDelay: 1000,
    enabled: !!userData?.user
  });

  // Sample call mutation
  const sampleCallMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sample-call"),
    onSuccess: () => {
      toast({
        title: "Sample call initiated!",
        description: "Check your phone in a few seconds for your personalized wake-up message.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/call/history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sample call failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Toggle schedule mutation
  const toggleScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => 
      apiRequest("PUT", `/api/schedule/${scheduleId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({
        title: "Schedule updated successfully",
        description: "Your wake-up call schedule has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update schedule",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const handleSampleCall = () => {
    sampleCallMutation.mutate();
  };

  const handleToggleSchedule = (scheduleId: number) => {
    toggleScheduleMutation.mutate(scheduleId);
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      const userTimezone = userData?.user?.timezone || 'UTC';
      const date = parseISO(dateTimeString);
      return formatInTimeZone(date, userTimezone, 'MMM dd, yyyy h:mm a');
    } catch (error) {
      return dateTimeString;
    }
  };

  const getNextCallText = () => {
    if (!schedules || schedules.length === 0) return "No scheduled calls";
    
    const activeSchedules = schedules.filter(s => s.isActive);
    if (activeSchedules.length === 0) return "No active schedules";
    
    return `Next call at ${activeSchedules[0].wakeupTime}`;
  };

  const nextCall = schedules?.find(s => s.isActive);

  // Show loading state
  if (userLoading || schedulesLoading || historyLoading || creditsLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </AppLayout>
    );
  }

  // Show error state with better debugging
  if (userError || schedulesError || historyError) {
    console.error("Dashboard errors:", { userError, schedulesError, historyError });
    return (
      <AppLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {userError?.message ||
                schedulesError?.message ||
                historyError?.message ||
                "Failed to load your data. Please try again."}
            </p>
            <div className="text-xs text-gray-500 mb-4">
              {userError && <div>User Error: {userError.message}</div>}
              {schedulesError && <div>Schedules Error: {schedulesError.message}</div>}
              {historyError && <div>History Error: {historyError.message}</div>}
            </div>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Determine what sections to show based on user journey
  const isFirstTimeUser = callHistory?.length === 0;
  const isPersonalized = userData?.user?.isPersonalized;
  const hasTriedSampleCall = (callHistory?.length ?? 0) > 0;
  
  // Step-by-step visibility logic
  const showPersonalizationSection = true; // Always show so users can update settings
  const showSampleCallSection = isPersonalized && !hasTriedSampleCall; // Hide after first call
  const showScheduleSection = isPersonalized;
  const showCreditsSection = hasTriedSampleCall;
  const showHistorySection = hasTriedSampleCall;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Personalization Section - Step 1 */}
        {showPersonalizationSection && (
          <div 
            ref={personalizationRef}
            className="animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            <PersonalizationSection />
          </div>
        )}

        {/* Credits Display - Show after first call */}
        {showCreditsSection && (
          <div 
            className={`bg-white p-6 rounded-lg shadow mb-6 transition-all duration-300 animate-fade-in-up ${
              (userCredits?.callCredits ?? 0) === 0 
                ? 'border-2 border-red-400 ring-2 ring-red-100 shadow-lg transform' 
                : 'border border-gray-200'
            }`}
            style={{ animationDelay: '0.2s' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full transition-colors duration-300 ${
                  (userCredits?.callCredits ?? 0) === 0 
                    ? 'bg-red-100 animate-pulse' 
                    : 'bg-primary/10'
                }`}>
                  <Phone className={`h-6 w-6 transition-colors duration-300 ${
                    (userCredits?.callCredits ?? 0) === 0 
                      ? 'text-red-500' 
                      : 'text-primary'
                  }`} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                    (userCredits?.callCredits ?? 0) === 0 
                      ? 'text-red-700' 
                      : 'text-gray-900'
                  }`}>
                    {(userCredits?.callCredits ?? 0) === 0 
                      ? '⚠️ No Credits Remaining!' 
                      : 'Call Credits'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {(userCredits?.callCredits ?? 0) === 0 
                      ? 'Purchase credits to continue receiving wake-up calls' 
                      : 'Your available wake-up call credits'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold mb-1 transition-colors duration-300 ${
                  (userCredits?.callCredits ?? 0) === 0 
                    ? 'text-red-500' 
                    : 'text-primary'
                }`}>
                  {userCredits?.callCredits ?? 0}
                </div>
                <div className="text-sm text-gray-500">calls remaining</div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant={(userCredits?.callCredits ?? 0) === 0 ? "default" : "outline"}
                    onClick={() => setShowPaymentModal(true)}
                    className={`transition-all duration-300 ${
                      (userCredits?.callCredits ?? 0) === 0 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : ''
                    }`}
                  >
                    {(userCredits?.callCredits ?? 0) === 0 ? "Buy Credits" : "Buy More"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/user/trial-status"] });
                      refetchCredits();
                    }}
                    title="Refresh credit balance"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sample Call Section - Step 2 */}
        {showSampleCallSection && (
          <div 
            ref={sampleCallRef} 
            className="shadow sm:rounded-md sm:overflow-hidden mb-6 animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="bg-white py-6 px-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Try a Sample Call
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Experience your first AI-powered wake-up
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
                  <div className="flex-shrink-0 flex gap-2">
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
        )}

        {/* Schedule Section - Step 3 */}
        {showScheduleSection && (
          <div 
            ref={scheduleRef} 
            className="shadow sm:rounded-md sm:overflow-hidden animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="bg-white py-6 px-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Your Wake-Up Schedule
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Let's set up your first real wake-up call.
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
                <div className="space-y-4">
                  {schedules
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
                    ))}
                </div>
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
        )}

        {/* Call History Section - Show after first call */}
        {showHistorySection && callHistory && callHistory.length > 0 && (
          <div 
            className="shadow sm:rounded-md sm:overflow-hidden animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
          >
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
        )}
      </div>

      {/* Guided Modals */}
      <GuidedModal
        isOpen={showPersonalizationModal}
        onClose={() => setShowPersonalizationModal(false)}
        title="Let's Personalize Your Wake-Up Experience"
        description="First, tell us about your goals and what motivates you. This helps us create personalized wake-up messages that actually work for you."
        actionText="Get Started"
        onAction={() => scrollToSection(personalizationRef)}
      />
      
      <GuidedModal
        isOpen={showSampleCallModal}
        onClose={() => setShowSampleCallModal(false)}
        title="Try Your First Sample Call"
        description="Perfect! Now let's test the experience with a sample call. You'll receive a personalized motivational message based on your preferences."
        actionText="Try Sample Call"
        onAction={() => {
          scrollToSection(sampleCallRef);
          // Trigger sample call if phone is verified
          if (userData?.user?.phoneVerified) {
            handleSampleCall();
          }
        }}
      />
      
      <GuidedModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Your First Wake-Up Call"
        description="Great job! You've experienced the power of KickAss Morning. Now let's schedule your first real wake-up call to start building your morning routine."
        actionText="Schedule Now"
        onAction={() => {
          const { user } = userData || {};
          if (user && !user.phoneVerified) {
            localStorage.setItem("phoneVerificationReturnUrl", "/schedule-call");
            setLocation("/phone-verification");
          } else {
            setLocation("/schedule-call");
          }
        }}
      />

      {/* Payment Modal */}
      <PaymentUpsell
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSkip={() => setShowPaymentModal(false)}
      />
    </AppLayout>
  );
}