import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { useLocation } from "wouter";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layouts/AppLayout";
import { trackConversion } from "../../lib/analytics";

export default function Signup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Request email OTP for registration
  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/request-email-otp", { email });
    },
    onSuccess: (data: any) => {
      // Check if the response indicates this email is already registered
      if (data?.type === 'login') {
        toast({
          title: "Email already registered",
          description: "This email is already registered. Please login instead.",
        });
        setTimeout(() => setLocation('/login'), 2000);
        return;
      }
      
      setOtpSent(true);
      toast({
        title: "Verification code sent",
        description: "Please check your email for a verification code.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to send code",
        description: error.message || "Could not send verification code. Please try again.",
      });
    }
  });

  // Verify OTP and create account
  const verifyAndCreateAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/verify-email-otp", { email, otp, name });
    },
    onSuccess: (response: any) => {
      console.log("Account created successfully, redirecting to dashboard", response);
      
      // Track signup conversion for marketing analytics
      trackConversion('signup');
      
      toast({
        title: "Account created successfully",
        description: "Welcome to KickAss Morning!",
      });
      
      // Force a short delay to ensure the session is set
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Could not verify your email or create account. Please try again.",
      });
    }
  });

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address.",
      });
      return;
    }
    requestOtpMutation.mutate();
  };

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({
        variant: "destructive",
        title: "Verification code required",
        description: "Please enter the verification code sent to your email.",
      });
      return;
    }
    verifyAndCreateAccountMutation.mutate();
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto mt-10 px-4 sm:px-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Let's Get You Out of Bed Like a Boss</h2>
            <p className="mt-2 text-sm text-gray-600">Set up your wake-up calls from voices that don't hit snooze.</p>
          </div>
          
          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <p className="text-xs text-gray-500 mb-2">What should we call you when we're kicking your butt out of bed? 😈</p>
                <Input 
                  id="name" 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={requestOtpMutation.isPending}
                />
              </div>

              <div>
                <Label htmlFor="signup-email">Email Address</Label>
                <p className="text-xs text-gray-500 mb-2">No passwords here — they suck. We'll send you a one-time code instead. 🔥</p>
                <Input 
                  id="signup-email" 
                  type="email" 
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={requestOtpMutation.isPending}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={requestOtpMutation.isPending}
              >
                {requestOtpMutation.isPending ? "Sending code..." : "Continue with email"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndCreate} className="space-y-6">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  We've sent a verification code to <span className="font-medium">{email}</span>
                </p>
              </div>
              
              <div>
                <Label htmlFor="otp">Verification code</Label>
                <Input 
                  id="otp" 
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="text-center tracking-widest font-medium"
                />
              </div>

              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                  }}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  Use a different email
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={verifyAndCreateAccountMutation.isPending}
              >
                {verifyAndCreateAccountMutation.isPending ? "Creating account..." : "Create account"}
              </Button>
              
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => requestOtpMutation.mutate()}
                  disabled={requestOtpMutation.isPending}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  {requestOtpMutation.isPending ? "Sending..." : "Resend verification code"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already a morning boss? {' '}
                <a 
                  href="#" 
                  className="font-medium text-primary hover:text-primary/80"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation('/login');
                  }}
                >
                  Sign back in! 💥
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}
