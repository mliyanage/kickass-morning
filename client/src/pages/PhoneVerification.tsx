import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PhoneVerificationRequest } from "@/types";
import AppLayout from "@/components/layouts/AppLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trackConversion } from "../../lib/analytics";
import { getSpecificCountries } from "@/lib/countries";

export default function PhoneVerification() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [returnUrl, setReturnUrl] = useState("/dashboard");

  // Get country options from the world-countries library
  const countryOptions = getSpecificCountries();

  // Debug logging
  console.log("Country options:", countryOptions);
  console.log("Current country code:", countryCode);

  // Handle country change with logging
  const handleCountryChange = (newCode: string) => {
    console.log("Country changing from", countryCode, "to", newCode);
    setCountryCode(newCode);
  };

  // Check where the user was trying to go
  useEffect(() => {
    // Get return URL from localStorage (if it was set by another component)
    const storedReturnUrl = localStorage.getItem("phoneVerificationReturnUrl");
    if (storedReturnUrl) {
      setReturnUrl(storedReturnUrl);
    }
  }, []);

  const sendOtpMutation = useMutation({
    mutationFn: async (data: PhoneVerificationRequest) => {
      return await apiRequest("POST", "/api/auth/send-otp", data);
    },
    onSuccess: () => {
      toast({
        title: "Code sent successfully",
        description:
          "Check your phone for the verification code. You're almost there!",
      });
      // Store phone number in localStorage for the OTP verification page
      const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;
      localStorage.setItem("verificationPhone", fullPhone);
      localStorage.setItem("otpVerificationReturnUrl", returnUrl);

      // Use router navigation to maintain the history
      setLocation("/otp-verification");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to send OTP",
        description: error.message || "Please try again later.",
      });
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation - ensure phone has some digits
    if (!phone || phone.replace(/\D/g, "").length < 5) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
      });
      return;
    }

    // Format phone number to E.164 format (e.g., +1XXXXXXXXXX)
    // Remove any non-digit characters from the phone input
    const phoneDigits = phone.replace(/\D/g, "");
    const formattedPhone = `${countryCode}${phoneDigits}`;

    sendOtpMutation.mutate({ phone: formattedPhone });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 via-primary-50 to-purple-50 py-8 px-4 sm:p-8 rounded-lg shadow-sm">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-8">
                <div className="mx-auto h-16 w-16 bg-gradient-to-r from-primary to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  One Last Step to Unlock Your Kickass Mornings
                </h1>

                <p className="text-lg text-gray-700 mb-2">
                  We'll send you a verification code to confirm your number.
                </p>

                <p className="text-base text-gray-600 mb-6">
                  Once verified, you can start receiving wake-up calls that
                  actually work.
                </p>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800 font-medium">
                    No spam. No cold calls. Just real, motivating wake-up calls.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="country-code"
                      className="text-base font-medium text-gray-900"
                    >
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
                    <Label
                      htmlFor="phone"
                      className="text-base font-medium text-gray-900"
                    >
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
                </div>

                <Button
                  type="submit"
                  className="w-full py-3 text-lg font-semibold bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                  disabled={sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending
                    ? "Sending Code..."
                    : "Send Verification Code"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
