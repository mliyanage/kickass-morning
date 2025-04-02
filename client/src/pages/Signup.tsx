import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

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
      console.log("Account created successfully, redirecting to phone verification", response);
      toast({
        title: "Account created successfully",
        description: "Please verify your phone number to continue.",
      });
      setLocation("/phone-verification");
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
    <div className="max-w-md mx-auto mt-10 px-4 sm:px-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="ml-2 text-xl font-bold text-primary-700">KickAss Morning</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-2 text-sm text-gray-600">Get wakeup calls from your favorite personalities</p>
          </div>
          
          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <Label htmlFor="name">Full name</Label>
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
                <Label htmlFor="signup-email">Email address</Label>
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
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Development mode:</strong> Check the server console logs to see the OTP code
                </p>
                {process.env.NODE_ENV !== 'production' && import.meta.env.DEV && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      <strong>Current OTP code from console:</strong><br/> 
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

          <div className="space-y-6 mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" type="button" className="w-full">
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>

              <Button variant="outline" type="button" className="w-full">
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"/>
                </svg>
                Apple
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account? {' '}
                <a 
                  href="#" 
                  className="font-medium text-primary hover:text-primary/80"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation('/login');
                  }}
                >
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
