import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/**
 * A development-only component to fetch and display the latest OTP code
 * from the server logs.
 */
export function DevOtpHelper({ email }: { email: string }) {
  const [latestOtp, setLatestOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLatestOtp = async () => {
    if (!email) return;
    
    setLoading(true);
    try {
      // This endpoint would be implemented on the server to return the latest OTP
      // for development purposes only.
      const response = await fetch(`/api/dev/latest-otp?email=${encodeURIComponent(email)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Failed to fetch OTP",
          description: "Couldn't retrieve the latest OTP code"
        });
        return;
      }
      
      const data = await response.json();
      if (data.otp) {
        setLatestOtp(data.otp);
        // Auto-copy to clipboard for convenience
        navigator.clipboard.writeText(data.otp).catch(() => {
          // Clipboard write failed, but it's not critical
        });
        toast({
          title: "OTP retrieved",
          description: "OTP has been copied to clipboard"
        });
      } else {
        toast({
          variant: "destructive",
          title: "No OTP found",
          description: "No recent OTP was found for this email"
        });
      }
    } catch (error) {
      console.error("Error fetching OTP:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to retrieve OTP. View server logs instead."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
      <p className="text-xs text-gray-500 mb-2">
        <strong>Development Helper:</strong> Check server logs or use this helper to find your OTP
      </p>
      
      {latestOtp && (
        <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
          <p className="text-xs text-center font-mono tracking-widest">
            {latestOtp}
          </p>
        </div>
      )}
      
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full text-xs h-8"
        onClick={fetchLatestOtp}
        disabled={loading}
      >
        {loading ? "Finding OTP..." : "Find my OTP"}
      </Button>
    </div>
  );
}