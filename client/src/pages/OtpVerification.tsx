import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OtpVerificationRequest } from "@/types";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { trackConversion } from "../../lib/analytics";

export default function OtpVerification() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState<string>("");
  const [returnUrl, setReturnUrl] = useState("/dashboard");
  
  useEffect(() => {
    const savedPhone = localStorage.getItem("verificationPhone");
    if (savedPhone) {
      setPhone(savedPhone);
    }
    
    const savedReturnUrl = localStorage.getItem("otpVerificationReturnUrl");
    if (savedReturnUrl) {
      setReturnUrl(savedReturnUrl);
    }
  }, []);

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: OtpVerificationRequest) => {
      return await apiRequest("POST", "/api/auth/verify-otp", data);
    },
    onSuccess: async () => {
      // Track phone verification conversion for marketing analytics
      trackConversion('phone_verified');
      
      toast({
        title: "Yes! Phone verified 🎉",
        description: "You're all set. Time to schedule your first kickass morning!",
      });
      localStorage.removeItem("verificationPhone");
      localStorage.removeItem("otpVerificationReturnUrl");
      localStorage.removeItem("phoneVerificationReturnUrl");
      
      // Refresh auth state without page reload
      if ((window as any).refreshAuthState) {
        await (window as any).refreshAuthState();
      }
      
      // Also invalidate the query cache to force UI refresh
      queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      
      // Navigate to the return URL
      setTimeout(() => {
        setLocation(returnUrl);
      }, 500);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || '';
      
      // Check if error message indicates expired OTP
      if (errorMessage.includes("expired")) {
        toast({
          variant: "destructive",
          title: "Code expired",
          description: "Your verification code has expired. We'll send you a new one.",
        });
        
        // Automatically trigger a resend of the OTP
        setTimeout(() => {
          handleResendOtp();
        }, 500);
      } 
      // Check if it's an invalid OTP (wrong code)
      else if (errorMessage.includes("invalid") || errorMessage.includes("incorrect")) {
        toast({
          variant: "destructive",
          title: "Incorrect code",
          description: "The verification code you entered doesn't match our records. Please check and try again.",
        });
        
        // Clear the OTP field so they can enter a new one
        setOtp("");
      }
      // Generic error fallback  
      else {
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: errorMessage || "Please check your code and try again.",
        });
      }
    }
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/send-otp", { phone });
    },
    onSuccess: () => {
      toast({
        title: "New code sent! 📱",
        description: "Check your phone for the fresh verification code.",
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
    
    // Validate that OTP only contains numbers
    if (!/^\d+$/.test(otp)) {
      toast({
        variant: "destructive",
        title: "Invalid code format",
        description: "Verification code should only contain numbers.",
      });
      return;
    }
    
    verifyOtpMutation.mutate({ phone, otp });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 via-primary-50 to-purple-50 py-8 px-4 sm:p-8 rounded-lg shadow-sm">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-8">
                <div className="mx-auto h-16 w-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  Boom. We sent you a code.
                </h1>
                
                <p className="text-lg text-gray-700 mb-4">
                  Enter it below to complete verification and schedule your first wake-up call.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    Code sent to <span className="font-bold">{phone || "your phone"}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-8">
                <div className="flex items-center justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={otp} 
                    onChange={setOtp}
                    className="text-2xl"
                  >
                    <InputOTPGroup className="gap-3">
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot 
                          key={i} 
                          index={i} 
                          className="w-12 h-12 text-xl border-2 border-gray-300 focus:border-primary"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button 
                  type="submit" 
                  className="w-full py-3 text-lg font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  disabled={verifyOtpMutation.isPending || otp.length !== 6}
                >
                  {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Continue"}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Didn't receive the code?
                  </p>
                  <button 
                    type="button" 
                    className="font-semibold text-primary hover:text-primary/80 underline"
                    onClick={handleResendOtp}
                    disabled={resendOtpMutation.isPending}
                  >
                    {resendOtpMutation.isPending ? "Resending..." : "Send me a new code"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
