import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CallHistory } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface CallHistoryItemProps {
  call: CallHistory;
}

export default function CallHistoryItem({ call }: CallHistoryItemProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);

  const playRecordingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("GET", `/api/call/${call.id}/recording`, {});
    },
    onSuccess: () => {
      setIsPlaying(true);
      // In a real implementation, you would play the audio here
      setTimeout(() => {
        setIsPlaying(false);
      }, 3000);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to play recording",
        description: error.message || "Could not play the call recording. Please try again.",
      });
    }
  });

  const handlePlayRecording = () => {
    if (isPlaying || call.status !== "answered" || !call.recordingUrl) return;
    playRecordingMutation.mutate();
  };

  // Format date with timezone support
  const formatDate = (dateString: string, timezone?: string) => {
    console.log('Formatting date:', dateString, 'with timezone:', timezone);
    
    if (timezone) {
      // For scheduled calls with timezone, we need to interpret the stored time correctly
      // The stored time represents the scheduled time, but it's stored as if it were UTC
      // We need to convert it to show the actual scheduled time in the user's timezone
      
      // Parse the stored time (which is stored as the local scheduled time)
      const storedTime = new Date(dateString);
      console.log('Stored time parsed as:', storedTime);
      
      // The stored time like "2025-08-08T23:42:00.000Z" should be interpreted as 
      // "23:42 in the user's timezone", not 23:42 UTC
      const scheduledTime = new Date(storedTime);
      
      const formatted = scheduledTime.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC' // Treat stored time as the actual scheduled time
      });
      
      const cityName = timezone.split('/').pop()?.replace(/_/g, ' ') || '';
      console.log('Final formatted result:', `${formatted} (${cityName})`);
      return `${formatted} (${cityName})`;
    } else {
      // For calls without timezone, display in local time
      const date = new Date(dateString);
      const formatted = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return formatted;
    }
  };

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "-";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <tr>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
        {formatDate(call.callTime, call.timezone)}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {call.voice}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          call.status === "answered" 
            ? "bg-green-100 text-green-800" 
            : call.status === "missed" 
              ? "bg-red-100 text-red-800" 
              : "bg-yellow-100 text-yellow-800"
        }`}>
          {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        {formatDuration(call.duration)}
      </td>
      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
        {call.status === "answered" && call.recordingUrl && (
          <button 
            type="button" 
            className="text-primary hover:text-primary/80"
            onClick={handlePlayRecording}
            disabled={isPlaying || playRecordingMutation.isPending}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  );
}
