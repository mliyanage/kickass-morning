import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trackConversion } from "../../lib/analytics";
import { getSpecificCountries } from "@/lib/countries";
import { initializeRecaptcha, sendVerificationCode, verifyCode, getFirebaseToken } from "@/lib/firebase";
import type { ConfirmationResult } from "firebase/auth";

export default function PhoneVerificationFirebase() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [returnUrl, setReturnUrl] = useState("/dashboard");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<any>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  // Get country options
  const countryOptions = getSpecificCountries();

  // Handle country change
  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
  };

  // Check where the user was trying to go
  useEffect(() => {
    const storedReturnUrl = localStorage.getItem("phoneVerificationReturnUrl");
    if (storedReturnUrl) {
      setReturnUrl(storedReturnUrl);
    }
  }, []);

  // Initialize reCAPTCHA
  useEffect(() => {
    if (step === "phone" && !recaptchaVerifier) {
      try {
        const verifier = initializeRecaptcha("recaptcha-container");
        setRecaptchaVerifier(verifier);
      } catch (error) {
        console.error("Failed to initialize reCAPTCHA:", error);
      }
    }
  }, [step, recaptchaVerifier]);

  // Send SMS mutation
  const sendSmsMutation = useMutation({
    mutationFn: async ({ phone }: { phone: string }) => {
      if (!recaptchaVerifier) {
        throw new Error("reCAPTCHA not initialized");
      }

      const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;
      console.log("Sending SMS to:", fullPhone);
      
      const confirmation = await sendVerificationCode(fullPhone, recaptchaVerifier);
      return { confirmation, fullPhone };
    },
    onSuccess: ({ confirmation, fullPhone }) => {
      setConfirmationResult(confirmation);
      setStep("otp");
      
      // Store phone number for later use
      localStorage.setItem("verificationPhone", fullPhone);
      localStorage.setItem("otpVerificationReturnUrl", returnUrl);
      
      toast({
        title: "Code sent successfully",
        description: "Check your phone for the verification code. You're almost there!",
      });
    },
    onError: (error: any) => {
      console.error("SMS error:", error);
      toast({
        variant: "destructive",
        title: "Failed to send code",
        description: error.message || "Please check your phone number and try again.",
      });
      
      // Reset reCAPTCHA on error
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        setRecaptchaVerifier(null);
      }
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ otp }: { otp: string }) => {
      if (!confirmationResult) {
        throw new Error("No confirmation result available");
      }

      // Verify OTP with Firebase
      const result = await verifyCode(confirmationResult, otp);
      
      // Get Firebase ID token
      const firebaseToken = await getFirebaseToken();
      if (!firebaseToken) {
        throw new Error("Failed to get Firebase token");
      }

      // Send token to backend for verification
      return await apiRequest("POST", "/api/auth/verify-firebase-phone", {
        firebaseToken,
        phone: localStorage.getItem("verificationPhone"),
      });
    },
    onSuccess: async () => {
      // Track conversion
      await trackConversion("phone_verified");
      
      // Refresh auth state and invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/auth/check'] });
      
      toast({
        title: "Phone verified successfully!",
        description: "Your phone number has been verified. Welcome to KickAss Morning!",
      });

      // Clear stored data
      localStorage.removeItem("verificationPhone");
      localStorage.removeItem("otpVerificationReturnUrl");
      localStorage.removeItem("phoneVerificationReturnUrl");

      // Determine navigation based on return URL and personalization status
      const finalReturnUrl = localStorage.getItem("otpVerificationReturnUrl") || returnUrl;
      
      // If we're going to dashboard, check if personalization is needed first
      if (finalReturnUrl === "/dashboard") {
        try {
          // Check if user has completed personalization
          const personalizationResponse = await apiRequest("GET", "/api/user/personalization");
          if (!personalizationResponse) {
            // No personalization data found, redirect to personalization first
            setLocation("/personalization");
            return;
          }
        } catch (error) {
          // If personalization endpoint returns 404 or error, user hasn't completed it
          console.log("No personalization found, redirecting to personalization");
          setLocation("/personalization");
          return;
        }
      }

      // Navigate to intended destination
      setLocation(finalReturnUrl);
    },
    onError: (error: any) => {
      console.error("Verification error:", error);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Please check your code and try again.",
      });
    },
  });

  const handleSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({
        variant: "destructive",
        title: "Phone number required",
        description: "Please enter your phone number.",
      });
      return;
    }
    sendSmsMutation.mutate({ phone: phone.trim() });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter the 6-digit verification code.",
      });
      return;
    }
    verifyOtpMutation.mutate({ otp: otp.trim() });
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtp("");
    setConfirmationResult(null);
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      setRecaptchaVerifier(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-blue-50 via-primary-50 to-purple-50 py-8 px-4 sm:p-8 rounded-lg shadow-sm">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {step === "phone" ? "Verify Your Phone" : "Enter Verification Code"}
              </h1>
              
              {step === "phone" ? (
                <>
                  <p className="text-lg text-gray-700 mb-2">
                    We'll send you a verification code to confirm your number.
                  </p>
                  <p className="text-base text-gray-600 mb-6">
                    Once verified, you can start receiving wake-up calls that actually work.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800 font-medium">
                      No spam. No cold calls. Just real, motivating wake-up calls.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg text-gray-700 mb-2">
                    We sent a 6-digit code to your phone.
                  </p>
                  <p className="text-base text-gray-600 mb-6">
                    Enter the code below to verify your number.
                  </p>
                </>
              )}
            </div>

            {step === "phone" ? (
              <form onSubmit={handleSendSms} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="country-code" className="text-base font-medium text-gray-900">
                      Country Code
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Select your country to auto-fill your code
                    </p>
                    <Select value={countryCode} onValueChange={handleCountryChange}>
                      <SelectTrigger id="country-code" className="w-full">
                        <SelectValue placeholder="Select country code" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span>{country.flag}</span>
                              <span>{country.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-base font-medium text-gray-900">
                      Phone Number
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">
                      We'll text your verification code here
                    </p>
                    <div className="flex rounded-md shadow-sm">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-gray-700 font-medium sm:text-sm">
                        {countryCode}
                      </span>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="rounded-l-none text-base"
                        required
                      />
                    </div>
                  </div>

                  {/* reCAPTCHA container */}
                  <div>
                    <Label className="text-base font-medium text-gray-900 mb-2 block">
                      Security Verification
                    </Label>
                    <div id="recaptcha-container" ref={recaptchaRef}></div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full py-3 text-lg font-semibold bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                  disabled={sendSmsMutation.isPending}
                >
                  {sendSmsMutation.isPending ? "Sending Code..." : "Send Verification Code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <Label htmlFor="otp" className="text-base font-medium text-gray-900">
                    Verification Code
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Enter the 6-digit code we sent to your phone
                  </p>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full py-3 text-lg font-semibold bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                    disabled={verifyOtpMutation.isPending || otp.length !== 6}
                  >
                    {verifyOtpMutation.isPending ? "Verifying..." : "Verify Code"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleBackToPhone}
                    disabled={verifyOtpMutation.isPending}
                  >
                    Back to Phone Number
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}