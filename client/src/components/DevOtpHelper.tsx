import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface OtpData {
  otp: string;
  type?: string;
  isExpired?: boolean;
  message?: string;
}

/**
 * A development-only component to fetch and display the latest OTP code
 * from the server logs.
 */
export function DevOtpHelper({ email }: { email: string }) {
  const [otpData, setOtpData] = useState<OtpData | null>(null);
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
        setOtpData(data);
        
        // Auto-copy to clipboard for convenience
        navigator.clipboard.writeText(data.otp).catch(() => {
          // Clipboard write failed, but it's not critical
        });
        
        toast({
          title: "OTP retrieved",
          description: data.message || "OTP has been copied to clipboard"
        });
      } else {
        toast({
          variant: "destructive",
          title: "No OTP found",
          description: data.message || "No recent OTP was found for this email"
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
      
      {otpData?.otp && (
        <div className={`${otpData.isExpired ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded p-2 mb-2`}>
          <p className="text-xs text-center font-mono tracking-widest">
            {otpData.otp}
          </p>
          {otpData.type && (
            <p className="text-xs text-center mt-1">
              Type: <span className="font-semibold">{otpData.type}</span>
              {otpData.isExpired && <span className="text-red-500 ml-2">(Expired)</span>}
            </p>
          )}
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
      
      <p className="text-xs text-gray-400 mt-2 text-center">
        If the button doesn't work, check the server console logs for a recently generated OTP
      </p>
    </div>
  );
}