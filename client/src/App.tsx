import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import PhoneVerification from "@/pages/PhoneVerification";
import PhoneVerificationFirebase from "@/pages/PhoneVerificationFirebase";
import FirebaseTest from "@/pages/FirebaseTest";
import OtpVerification from "@/pages/OtpVerification";
import Personalization from "@/pages/Personalization";
import ScheduleCall from "@/pages/ScheduleCall";
import Dashboard from "@/pages/Dashboard";
import CallHistory from "@/pages/CallHistory";
import Help from "@/pages/Help";
import TermsConditions from "@/pages/TermsConditions";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import PaymentSuccess from "@/pages/PaymentSuccess";
import { useEffect } from "react";
import { initPostHog } from "./lib/analytics";
import { useAnalytics } from "../hooks/use-analytics";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/phone-verification-twilio" component={PhoneVerification} />
      <Route path="/phone-verification" component={PhoneVerificationFirebase} />
      <Route path="/firebase-test" component={FirebaseTest} />
      <Route path="/otp-verification" component={OtpVerification} />
      <Route path="/personalization" component={Personalization} />
      <Route path="/schedule-call" component={ScheduleCall} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/call-history" component={CallHistory} />
      <Route path="/help" component={Help} />
      <Route path="/terms" component={TermsConditions} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize PostHog when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_POSTHOG_API_KEY || !import.meta.env.VITE_POSTHOG_HOST) {
      console.warn('Missing required PostHog keys: VITE_POSTHOG_API_KEY and VITE_POSTHOG_HOST');
    } else {
      initPostHog();
    }
  }, []);

  // Handle Firebase reCAPTCHA timeout errors and other transient errors
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonString = reason?.toString?.() || '';
      const reasonMessage = reason?.message || '';
      
      // Check for various timeout and transient errors
      const isTransientError = 
        reasonMessage.toLowerCase().includes('timeout') ||
        reasonString.toLowerCase().includes('timeout') ||
        reasonString.toLowerCase().includes('recaptcha') ||
        reasonString.toLowerCase().includes('network error') ||
        reasonString.toLowerCase().includes('fetch') ||
        reasonMessage.includes('Failed to fetch') ||
        // Firebase specific timeout errors
        reasonMessage.includes('auth/timeout') ||
        reasonMessage.includes('auth/network-request-failed');
      
      if (isTransientError) {

        event.preventDefault(); // Prevent runtime error overlay
        return;
      }
      
      // Also suppress AbortController cancellation errors which are normal
      if (reasonMessage.includes('AbortError') || reasonMessage.includes('cancelled')) {

        event.preventDefault();
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
