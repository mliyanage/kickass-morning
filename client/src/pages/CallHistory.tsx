import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Phone, User } from "lucide-react";

interface CallHistory {
  id: number;
  userId: number;
  callTime: string;
  timezone?: string;
  status: "pending" | "completed" | "failed" | "no_answer";
  duration?: number;
  callSid: string;
  voice: string;
  createdAt: string;
}

export default function CallHistory() {
  // Get call history
  const {
    data: callHistory = [],
    isLoading,
    error,
  } = useQuery<CallHistory[]>({
    queryKey: ["/api/call/history"],
    gcTime: 0,
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      completed: { variant: "default" as const, color: "bg-green-100 text-green-800", label: "Completed" },
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      failed: { variant: "destructive" as const, color: "bg-red-100 text-red-800", label: "Failed" },
      no_answer: { variant: "outline" as const, color: "bg-gray-100 text-gray-800", label: "No Answer" },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string, timezone?: string) => {
    const storedTime = new Date(dateString);
    
    if (timezone) {
      // Extract UTC components and treat them as local time for scheduled calls
      const year = storedTime.getUTCFullYear();
      const month = storedTime.getUTCMonth();
      const date = storedTime.getUTCDate();
      const hours = storedTime.getUTCHours();
      const minutes = storedTime.getUTCMinutes();
      
      const scheduledTime = new Date(year, month, date, hours, minutes);
      const cityName = timezone.split('/').pop()?.replace(/_/g, ' ') || '';
      
      return {
        date: scheduledTime.toLocaleDateString(),
        time: `${scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${cityName})`
      };
    } else {
      return {
        date: storedTime.toLocaleDateString(),
        time: storedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p>Loading your call history...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Error Loading Call History
              </h1>
              <p className="text-sm text-gray-600">
                {error.message || "Failed to load your call history. Please try again."}
              </p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="shadow sm:rounded-md sm:overflow-hidden">
        <div className="bg-white py-6 px-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                📞 Call History
              </h2>
              <p className="text-gray-600 mt-1">
                Review your past wake-up calls and their results.
              </p>
            </div>
          </div>

          {callHistory && callHistory.length > 0 ? (
            <div className="space-y-4">
              {callHistory.map((call) => {
                const { date, time } = formatDateTime(call.callTime, call.timezone);
                
                return (
                  <Card key={call.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900">
                              Wake-up Call #{call.id}
                            </span>
                            {getStatusBadge(call.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="capitalize">{call.voice}</span>
                            </div>
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-500">
                            Goal: • Struggle:
                            {call.duration && (
                              <> • Duration: {call.duration}s</>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Call History Yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Once you schedule and receive your first wake-up call, it will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}