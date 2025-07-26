import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layouts/AppLayout";

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
          description: "Loading your dashboard...",
        });
        
        // Display loading state
        document.body.classList.add('auth-in-progress');
        
        // Set a flag in session storage to indicate successful authentication
        // This prevents the login screen flash by letting the app know auth is in progress
        sessionStorage.setItem('auth_successful', 'true');
        
        // Force a page reload to ensure clean authentication state
        console.log("Login successful, reloading to dashboard");
        window.location.href = "/dashboard";
      } catch (error) {
        // Fallback: try to refresh auth and redirect
        console.error("Error processing login response:", error);
        toast({
          title: "Login successful",
          description: "Loading dashboard...",
        });
        
        // Fallback: reload to dashboard
        window.location.href = "/dashboard";
      }
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
    <AppLayout>
      <div className="max-w-md mx-auto mt-10 px-4 sm:px-6 login-page">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">💥 Welcome Back, Boss!</h2>
            <p className="mt-2 text-sm text-gray-600">Ready to crush another day? Let's get you signed in.</p>
          </div>
          
          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <p className="text-xs text-gray-500 mb-2">We'll send you a quick verification code — no passwords needed! 🔥</p>
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
                New to the wake-up revolution? {' '}
                <a 
                  href="#" 
                  className="font-medium text-primary hover:text-primary/80"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation('/signup');
                  }}
                >
                  Join the boss squad! 💥
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
