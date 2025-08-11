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
import { useEffect } from "react";
import { initGA } from "../lib/analytics";
import { useAnalytics } from "../hooks/use-analytics";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/phone-verification" component={PhoneVerification} />
      <Route path="/phone-verification-firebase" component={PhoneVerificationFirebase} />
      <Route path="/firebase-test" component={FirebaseTest} />
      <Route path="/otp-verification" component={OtpVerification} />
      <Route path="/personalization" component={Personalization} />
      <Route path="/schedule-call" component={ScheduleCall} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/call-history" component={CallHistory} />
      <Route path="/help" component={Help} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
