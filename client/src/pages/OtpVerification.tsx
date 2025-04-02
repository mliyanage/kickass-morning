import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { OtpVerificationRequest } from "@/types";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp";

export default function OtpVerification() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState<string>("");
  
  useEffect(() => {
    const savedPhone = localStorage.getItem("verificationPhone");
    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, []);

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: OtpVerificationRequest) => {
      return await apiRequest("POST", "/api/auth/verify-otp", data);
    },
    onSuccess: () => {
      toast({
        title: "Phone verified",
        description: "Your phone number has been verified successfully.",
      });
      localStorage.removeItem("verificationPhone");
      setLocation("/personalization");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Please check your code and try again.",
      });
    }
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/send-otp", { phone });
    },
    onSuccess: () => {
      toast({
        title: "OTP resent",
        description: "A new verification code has been sent to your phone.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to resend OTP",
        description: error.message || "Please try again later.",
      });
    }
  });

  const handleResendOtp = () => {
    if (!phone) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No phone number found. Please go back to the previous screen.",
      });
      return;
    }
    
    resendOtpMutation.mutate();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter the 6-digit code sent to your phone.",
      });
      return;
    }
    
    if (!phone) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No phone number found. Please go back to the previous screen.",
      });
      return;
    }
    
    verifyOtpMutation.mutate({ phone, otp });
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-4 sm:px-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-2 text-lg font-medium text-gray-900">Enter verification code</h2>
            <p className="mt-1 text-sm text-gray-500">
              We've sent a code to <span className="font-medium">{phone || "your phone"}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex items-center justify-center">
              <InputOTP 
                maxLength={6} 
                value={otp} 
                onChange={setOtp}
                render={({ slots }) => (
                  <InputOTPGroup>
                    {slots.map((slot, index) => (
                      <InputOTPSlot key={index} {...slot} />
                    ))}
                  </InputOTPGroup>
                )}
              />
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Didn't receive the code? {' '}
                <button 
                  type="button" 
                  className="font-medium text-primary hover:text-primary/80"
                  onClick={handleResendOtp}
                  disabled={resendOtpMutation.isPending}
                >
                  {resendOtpMutation.isPending ? "Resending..." : "Resend code"}
                </button>
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={verifyOtpMutation.isPending}
            >
              {verifyOtpMutation.isPending ? "Verifying..." : "Verify code"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
