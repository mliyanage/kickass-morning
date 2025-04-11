import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { DevOtpHelper } from "@/components/DevOtpHelper";

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Request email OTP
  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/request-email-otp", { email });
    },
    onSuccess: (data) => {
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

  // Verify OTP and login
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/login", { email, otp, rememberMe });
    },
    onSuccess: async (response: any) => {
      // Our apiRequest function now parses JSON and throws errors for non-200 status codes
      // so if we're here, the login was successful
      console.log("Login successful, redirecting based on user status", response);
      
      try {
        const userData = response.user;
        
        toast({
          title: "Login successful",
          description: "Redirecting you to the dashboard...",
        });
        
        // To fix the flash issue, we use a simple technique:
        // 1. Create an overlay div that covers the screen during transition
        // 2. Redirect after a slight delay to ensure the overlay is visible
        // 3. The overlay will be removed when dashboard loads
        
        const overlay = document.createElement('div');
        overlay.id = 'redirect-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'white';
        overlay.style.zIndex = '9999';
        document.body.appendChild(overlay);
        
        // Short delay to ensure overlay is visible before redirecting
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      } catch (error) {
        console.error("Error processing login response:", error);
        // Fallback to auth check if response processing fails
        toast({
          title: "Login successful",
          description: "Checking your profile status...",
        });
        
        // If authentication succeeds but we fail to process the response properly,
        // try to verify authentication status and redirect
        setTimeout(async () => {
          try {
            const authCheck = await apiRequest("GET", "/api/auth/check");
            
            if (authCheck.authenticated) {
              window.location.href = "/dashboard";
            } else {
              // Should not reach here if login was successful
              toast({
                variant: "destructive",
                title: "Authentication failed",
                description: "Please log in again",
              });
            }
          } catch (secondError) {
            console.error("Error checking auth status:", secondError);
            toast({
              variant: "destructive",
              title: "Authentication error",
              description: "Please try logging in again",
            });
          }
        }, 1000);
      }
    },
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid verification code. Please try again.",
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({
        variant: "destructive",
        title: "Verification code required",
        description: "Please enter the verification code sent to your email.",
      });
      return;
    }
    verifyOtpMutation.mutate();
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-4 sm:px-6 login-page">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="ml-2 text-xl font-bold text-primary-700">KickAss Morning</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="mt-2 text-sm text-gray-600">Get wakeup calls from your favorite personalities</p>
          </div>
          
          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={requestOtpMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember-me" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember-me" className="text-sm">Remember me</Label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={requestOtpMutation.isPending}
              >
                {requestOtpMutation.isPending ? "Sending code..." : "Send verification code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  We've sent a verification code to <span className="font-medium">{email}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Development mode:</strong> Check the server console logs to see the OTP code
                </p>
                {process.env.NODE_ENV !== 'production' && import.meta.env.DEV && (
                  <div className="mt-2">
                    <DevOtpHelper email={email} />
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Current entered code:</strong><br/> 
                      <span className="font-mono bg-gray-100 rounded px-2 py-1 mt-1 block">
                        {otp || "Not entered yet"}
                      </span>
                    </p>
                  </div>
                )}
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
                disabled={verifyOtpMutation.isPending}
              >
                {verifyOtpMutation.isPending ? "Verifying..." : "Sign in"}
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

          <div className="space-y-6 mt-6">
            <div className="relative">
              <div className="border-t border-gray-200 my-4"></div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account? {' '}
                <a 
                  href="#" 
                  className="font-medium text-primary hover:text-primary/80"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation('/signup');
                  }}
                >
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
