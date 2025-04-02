import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { PhoneVerificationRequest } from "@/types";

export default function PhoneVerification() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");

  const sendOtpMutation = useMutation({
    mutationFn: async (data: PhoneVerificationRequest) => {
      return await apiRequest("POST", "/api/auth/send-otp", data);
    },
    onSuccess: () => {
      toast({
        title: "OTP sent",
        description: "A verification code has been sent to your phone.",
      });
      // Store phone number in localStorage for the OTP verification page
      localStorage.setItem("verificationPhone", phone);
      
      // Force a short delay to ensure better transition
      setTimeout(() => {
        window.location.href = "/otp-verification";
      }, 500);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to send OTP",
        description: error.message || "Please try again later.",
      });
    }
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
      });
      return;
    }
    
    // Format phone number to E.164 format (+1XXXXXXXXXX)
    let formattedPhone = phone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
    }
    
    sendOtpMutation.mutate({ phone: formattedPhone });
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-4 sm:px-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h2 className="mt-2 text-lg font-medium text-gray-900">Verify your phone number</h2>
            <p className="mt-1 text-sm text-gray-500">We'll send you a verification code to confirm your phone number</p>
          </div>

          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-gray-500 sm:text-sm">
                  +1
                </span>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="(555) 987-6543"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-l-none"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={sendOtpMutation.isPending}
            >
              {sendOtpMutation.isPending ? "Sending code..." : "Send verification code"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
