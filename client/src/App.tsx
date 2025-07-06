import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import PhoneVerification from "@/pages/PhoneVerification";
import OtpVerification from "@/pages/OtpVerification";
import Personalization from "@/pages/Personalization";
import ScheduleCall from "@/pages/ScheduleCall";
import Dashboard from "@/pages/Dashboard";
import Help from "@/pages/Help";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check for auth-in-progress indicator (set during login)
    const authInProgress = sessionStorage.getItem("auth_successful") === "true";

    // If we're in auth transition, add loading state
    if (authInProgress) {
      document.body.classList.add("auth-in-progress");
    }

    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/check", {
          credentials: "include",
        });
        const data = await res.json();

        if (data.authenticated) {
          setIsAuthenticated(true);
          setIsPhoneVerified(data.user.phoneVerified || false);
          setIsPersonalized(data.user.isPersonalized || false);
          setIsLoading(false);

          // Clear the auth-in-progress flag once we're authenticated
          if (authInProgress) {
            sessionStorage.removeItem("auth_successful");
            document.body.classList.remove("auth-in-progress");
          }

          console.log("Auth check successful:", {
            isAuthenticated: true,
            isPhoneVerified: data.user.phoneVerified,
            isPersonalized: data.user.isPersonalized,
          });
        } else {
          console.log("Not authenticated:", data.message);
          setIsAuthenticated(false);
          setIsLoading(false);

          // Clear any pending auth flag
          if (authInProgress) {
            sessionStorage.removeItem("auth_successful");
            document.body.classList.remove("auth-in-progress");
          }

          // If we're trying to access a page that requires auth, redirect to login
          const currentPath = window.location.pathname;
          if (
            currentPath !== "/" &&
            currentPath !== "/login" &&
            currentPath !== "/signup"
          ) {
            setLocation("/login");
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
        setIsLoading(false);

        // Clear any pending auth flag
        if (authInProgress) {
          sessionStorage.removeItem("auth_successful");
          document.body.classList.remove("auth-in-progress");
        }
      }
    };

    // Expose the auth refresh function globally
    (window as any).refreshAuthState = checkAuth;

    checkAuth();

    // Add CSS to handle the auth transition without flashing
    const style = document.createElement("style");
    style.textContent = `
      .auth-in-progress .login-page {
        opacity: 0;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    // Set up interval to periodically check authentication status
    const authCheckInterval = setInterval(checkAuth, 300000); // Check auth every 5 minutes

    return () => {
      clearInterval(authCheckInterval);
      document.head.removeChild(style);
    };
  }, []); // Only run once on mount

  // Authentication guard for protected routes
  const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        setLocation("/login");
      }
    }, [isAuthenticated, isLoading]);

    if (isLoading) {
      return <div>Loading...</div>;
    }

    return isAuthenticated ? <>{children}</> : null;
  };

  // Phone verification guard
  const PhoneVerifiedGuard = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
      if (!isPhoneVerified && isAuthenticated) {
        setLocation("/phone-verification");
      }
    }, [isPhoneVerified, isAuthenticated]);

    return isAuthenticated && isPhoneVerified ? <>{children}</> : null;
  };

  // Personalization guard
  const PersonalizedGuard = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
      if (!isPersonalized && isAuthenticated) {
        setLocation("/personalization");
      }
    }, [isPersonalized, isAuthenticated]);

    return isAuthenticated && isPersonalized ? <>{children}</> : null;
  };

  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/phone-verification">
          <AuthGuard>
            <PhoneVerification />
          </AuthGuard>
        </Route>
        <Route path="/otp-verification">
          <AuthGuard>
            <OtpVerification />
          </AuthGuard>
        </Route>
        <Route path="/personalization">
          <AuthGuard>
            <Personalization />
          </AuthGuard>
        </Route>
        <Route path="/schedule-call">
          <PersonalizedGuard>
            <ScheduleCall />
          </PersonalizedGuard>
        </Route>
        <Route path="/dashboard">
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        </Route>
        <Route path="/help">
          <AuthGuard>
            <Help />
          </AuthGuard>
        </Route>
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
