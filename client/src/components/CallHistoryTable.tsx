import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface CallRecord {
  id: number;
  callTime: string;
  timezone?: string;
  voice: string;
  status: 'answered' | 'missed' | 'failed';
  duration?: number;
}

interface CallHistoryTableProps {
  calls: CallRecord[];
  onPlayRecording?: (id: number) => void;
}

export function CallHistoryTable({ calls, onPlayRecording }: CallHistoryTableProps) {
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '-';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'answered':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Answered</Badge>;
      case 'missed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Missed</Badge>;
      case 'failed':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <Table>
        <TableHeader className="bg-neutral-50">
          <TableRow>
            <TableHead className="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Date & Time</TableHead>
            <TableHead className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Voice</TableHead>
            <TableHead className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Status</TableHead>
            <TableHead className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Duration</TableHead>
            <TableHead className="relative py-3 pl-3 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-neutral-200 bg-white">
          {calls.map((call) => (
            <TableRow key={call.id}>
              <TableCell className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-900">
                {call.timezone 
                  ? (() => {
                      // Convert UTC time back to the original timezone for display
                      const zonedTime = toZonedTime(new Date(call.callTime), call.timezone);
                      return `${format(zonedTime, 'MMM d, yyyy, h:mm a')} (${call.timezone.split('/').pop()?.replace(/_/g, ' ')})`;
                    })()
                  : format(new Date(call.callTime), 'MMM d, yyyy, h:mm a')}
              </TableCell>
              <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">{call.voice}</TableCell>
              <TableCell className="whitespace-nowrap px-3 py-4 text-sm">
                {getStatusBadge(call.status)}
              </TableCell>
              <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                {formatDuration(call.duration)}
              </TableCell>
              <TableCell className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                {call.status === 'answered' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPlayRecording && onPlayRecording(call.id)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <Play className="h-5 w-5" />
                    <span className="sr-only">Play recording</span>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          
          {calls.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-sm text-neutral-500">
                No call history available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default CallHistoryTable;
